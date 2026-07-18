#!/usr/bin/env bash
#
# refresh_db.sh
# Synchronizes OrbStack local databases with production databases securely and fast.
#

set -eo pipefail

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
SSH_TARGET="live-wings"
LOCAL_ENV_FILE="apps/api/.env"
FULL_SYNC=false

# Print banner
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}      MOS-LAB DATABASE SYNCHRONIZATION UTILITY      ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --full) FULL_SYNC=true ;;
    *) echo -e "${RED}Unknown parameter: $1${NC}"; exit 1 ;;
  esac
  shift
done

if [ "$FULL_SYNC" = true ]; then
  echo -e "${YELLOW}Sync Mode: FULL (syncing all tables including huge logs)${NC}"
else
  echo -e "${GREEN}Sync Mode: OPTIMIZED (skipping large log table data)${NC}"
fi

# Load local environment configuration
if [ ! -f "$LOCAL_ENV_FILE" ]; then
  echo -e "${RED}Error: Local environment file not found at $LOCAL_ENV_FILE${NC}"
  exit 1
fi

# Helper to parse mysql:// URL
parse_mysql_url() {
  local url="$1"
  local proto_url="${url#mysql://}"
  local userpass="${proto_url%%@*}"
  local hostportdb="${proto_url#*@}"
  
  db_user="${userpass%%:*}"
  db_pass="${userpass#*:}"
  
  local hostport="${hostportdb%%/*}"
  db_name="${hostportdb#*/}"
  
  db_host="${hostport%%:*}"
  db_port="${hostport#*:}"
}

# Parse legacy local DB URL
LOCAL_LEGACY_URL=$(grep -E '^LEGACY_DATABASE_URL=' "$LOCAL_ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$LOCAL_LEGACY_URL" ]; then
  echo -e "${RED}Error: LEGACY_DATABASE_URL not defined in local .env${NC}"
  exit 1
fi
parse_mysql_url "$LOCAL_LEGACY_URL"
local_legacy_user="$db_user"
local_legacy_pass="$db_pass"
local_legacy_db="$db_name"
local_legacy_host="$db_host"
local_legacy_port="$db_port"

# Parse CRM local DB URL
LOCAL_CRM_URL=$(grep -E '^CRM_DATABASE_URL=' "$LOCAL_ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$LOCAL_CRM_URL" ]; then
  echo -e "${RED}Error: CRM_DATABASE_URL not defined in local .env${NC}"
  exit 1
fi
parse_mysql_url "$LOCAL_CRM_URL"
local_crm_user="$db_user"
local_crm_pass="$db_pass"
local_crm_db="$db_name"
local_crm_host="$db_host"
local_crm_port="$db_port"

# Helper functions to run queries on local OrbStack databases
run_local_legacy_sql() {
  orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" -N -e "$1" "$local_legacy_db" 2>/dev/null
}

run_local_crm_sql() {
  orb mysql -h"$local_crm_host" -P"$local_crm_port" -u"$local_crm_user" -p"$local_crm_pass" -N -e "$1" "$local_crm_db" 2>/dev/null
}

get_db_size() {
  local db="$1"
  local query="SELECT COALESCE(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), 0) FROM information_schema.TABLES WHERE table_schema = '$db';"
  if [ "$db" = "$local_legacy_db" ]; then
    run_local_legacy_sql "$query"
  else
    run_local_crm_sql "$query"
  fi
}

get_db_tables() {
  local db="$1"
  local query="SELECT COUNT(*) FROM information_schema.TABLES WHERE table_schema = '$db';"
  if [ "$db" = "$local_legacy_db" ]; then
    run_local_legacy_sql "$query"
  else
    run_local_crm_sql "$query"
  fi
}

# 1. Capture Stats Before Sync
echo -e "\n${BLUE}[1/5] Gathering stats before sync...${NC}"
legacy_tables_before=$(get_db_tables "$local_legacy_db" || echo "0")
legacy_size_before=$(get_db_size "$local_legacy_db" || echo "0")
crm_tables_before=$(get_db_tables "$local_crm_db" || echo "0")
crm_size_before=$(get_db_size "$local_crm_db" || echo "0")

echo -e "  - Legacy Database (${local_legacy_db}): ${legacy_tables_before} tables, ${legacy_size_before} MB"
echo -e "  - CRM Database (${local_crm_db}): ${crm_tables_before} tables, ${crm_size_before} MB"

# 2. Reset local databases to ensure clean state
echo -e "\n${BLUE}[2/5] Resetting local databases inside OrbStack...${NC}"
echo -e "  - Recreating legacy database: ${local_legacy_db}"
orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" -e "DROP DATABASE IF EXISTS ${local_legacy_db}; CREATE DATABASE ${local_legacy_db};"
echo -e "  - Recreating CRM database: ${local_crm_db}"
orb mysql -h"$local_crm_host" -P"$local_crm_port" -u"$local_crm_user" -p"$local_crm_pass" -e "DROP DATABASE IF EXISTS ${local_crm_db}; CREATE DATABASE ${local_crm_db};"

# 3. Synchronize Legacy Database (management)
echo -e "\n${BLUE}[3/5] Syncing Legacy database (${local_legacy_db})...${NC}"
t_legacy_start=$(date +%s)

# Create a remote script block to execute on production server
# This script loads remote .env, parses credentials, runs mysqldump, and gzip streams it.
run_remote_dump() {
  local target_db="$1" # "legacy" or "crm"
  local dump_mode="$2" # "schema" or "data" or "full"
  
  ssh "$SSH_TARGET" 'bash -s' << REMOTE_EOF
    # Load environment variables on prod VPS
    if [ ! -f /home/web/mos-lab/apps/api/.env ]; then
      echo "Error: Remote .env file not found" >&2
      exit 1
    fi
    export \$(grep -v '^#' /home/web/mos-lab/apps/api/.env | grep -v '^$' | xargs)
    
    if [ "$target_db" = "legacy" ]; then
      URL="\$LEGACY_DATABASE_URL"
    else
      URL="\$CRM_DATABASE_URL"
    fi
    
    # Parse URL
    proto_url="\${URL#mysql://}"
    userpass="\${proto_url%%@*}"
    hostportdb="\${proto_url#*@}"
    
    db_user="\${userpass%%:*}"
    db_pass="\${userpass#*:}"
    
    hostport="\${hostportdb%%/*}"
    db_name="\${hostportdb#*/}"
    
    db_host="\${hostport%%:*}"
    db_port="\${hostport#*:}"
    
    # Run mysqldump with safety flags for live databases
    export MYSQL_PWD="\$db_pass"
    DUMP_CMD="mysqldump --single-transaction --quick --skip-lock-tables --max-allowed-packet=512M -h \$db_host -P \$db_port -u \$db_user"
    
    if [ "$dump_mode" = "schema" ]; then
      \$DUMP_CMD --no-data "\$db_name" | gzip -c
    elif [ "$dump_mode" = "data" ]; then
      \$DUMP_CMD --no-create-info \
        --ignore-table="\${db_name}.item_insert_tracker" \
        --ignore-table="\${db_name}.user_sms" \
        --ignore-table="\${db_name}.user_url" \
        --ignore-table="\${db_name}.log_action_touch" \
        --ignore-table="\${db_name}.user_notification" \
        "\$db_name" | gzip -c
    else
      \$DUMP_CMD "\$db_name" | gzip -c
    fi
REMOTE_EOF
}

if [ "$FULL_SYNC" = true ]; then
  echo -e "  - Streaming FULL legacy database..."
  run_remote_dump "legacy" "full" | gunzip -c | orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" "$local_legacy_db"
else
  echo -e "  - Step 3.1: Streaming Legacy schema structure..."
  run_remote_dump "legacy" "schema" | gunzip -c | orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" "$local_legacy_db"
  
  echo -e "  - Step 3.2: Streaming Legacy table data (excluding log tables)..."
  run_remote_dump "legacy" "data" | gunzip -c | orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" "$local_legacy_db"
fi

t_legacy_end=$(date +%s)
duration_legacy=$((t_legacy_end - t_legacy_start))
echo -e "  - Legacy sync completed in ${duration_legacy} seconds."

# 4. Synchronize CRM Database (mos_lab)
echo -e "\n${BLUE}[4/5] Syncing CRM database (${local_crm_db})...${NC}"
t_crm_start=$(date +%s)

echo -e "  - Streaming CRM database completely..."
run_remote_dump "crm" "full" | gunzip -c | orb mysql -h"$local_crm_host" -P"$local_crm_port" -u"$local_crm_user" -p"$local_crm_pass" "$local_crm_db"

t_crm_end=$(date +%s)
duration_crm=$((t_crm_end - t_crm_start))
echo -e "  - CRM sync completed in ${duration_crm} seconds."

# 5. Compile and Generate Report
echo -e "\n${BLUE}[5/5] Compiling final report...${NC}"
legacy_tables_after=$(get_db_tables "$local_legacy_db" || echo "0")
legacy_size_after=$(get_db_size "$local_legacy_db" || echo "0")
crm_tables_after=$(get_db_tables "$local_crm_db" || echo "0")
crm_size_after=$(get_db_size "$local_crm_db" || echo "0")

# Key Table Row Counts
get_row_count() {
  local db="$1"
  local table="$2"
  local query="SELECT COUNT(*) FROM \`$table\`;"
  if [ "$db" = "$local_legacy_db" ]; then
    run_local_legacy_sql "$query" || echo "N/A"
  else
    run_local_crm_sql "$query" || echo "N/A"
  fi
}

rows_order=$(get_row_count "$local_legacy_db" "order")
rows_profile=$(get_row_count "$local_legacy_db" "user_profile")
rows_bonus=$(get_row_count "$local_legacy_db" "staff_bonus")
rows_tracker=$(get_row_count "$local_legacy_db" "item_insert_tracker")
rows_sms=$(get_row_count "$local_legacy_db" "user_sms")
rows_notification=$(get_row_count "$local_legacy_db" "user_notification")
rows_touch=$(get_row_count "$local_legacy_db" "log_action_touch")

# CRM stats
rows_crm_staff=$(get_row_count "$local_crm_db" "crm_staff")
rows_crm_plan=$(get_row_count "$local_crm_db" "crm_daily_plans")
rows_crm_call=$(get_row_count "$local_crm_db" "crm_call_logs")

total_duration=$((duration_legacy + duration_crm))

echo -e "\n${GREEN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}              DATABASE REFRESH REPORT               ${NC}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "Timestamp:      $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "Sync Mode:      $( [ "$FULL_SYNC" = true ] && echo "FULL" || echo "OPTIMIZED" )"
echo -e "SSH Target:     ${SSH_TARGET}"
echo -e "Total Time:     ${total_duration} seconds (Legacy: ${duration_legacy}s, CRM: ${duration_crm}s)"
echo -e "----------------------------------------------------"
echo -e "${BOLD}Database Size Summary:${NC}"
printf "  %-12s | %-12s | %-12s | %-12s\n" "Database" "Before" "After" "Tables (Aft)"
printf "  %-12s | %-12s | %-12s | %-12s\n" "------------" "------------" "------------" "------------"
printf "  %-12s | %-9s MB | %-9s MB | %-12s\n" "legacy" "${legacy_size_before}" "${legacy_size_after}" "${legacy_tables_after}"
printf "  %-12s | %-9s MB | %-9s MB | %-12s\n" "crm" "${crm_size_before}" "${crm_size_after}" "${crm_tables_after}"
echo -e "----------------------------------------------------"
echo -e "${BOLD}Key Table Row Counts:${NC}"
printf "  %-30s | %-15s\n" "Table Name" "Row Count"
printf "  %-30s | %-15s\n" "------------------------------" "---------------"
printf "  %-30s | %-15s\n" "legacy.order" "${rows_order}"
printf "  %-30s | %-15s\n" "legacy.user_profile" "${rows_profile}"
printf "  %-30s | %-15s\n" "legacy.staff_bonus" "${rows_bonus}"
printf "  %-30s | %-15s (Excluded Data)" "legacy.item_insert_tracker" "${rows_tracker}"
printf "  %-30s | %-15s (Excluded Data)" "legacy.user_sms" "${rows_sms}"
printf "  %-30s | %-15s (Excluded Data)" "legacy.user_notification" "${rows_notification}"
printf "  %-30s | %-15s (Excluded Data)" "legacy.log_action_touch" "${rows_touch}"
printf "  %-30s | %-15s\n" "crm.crm_staff" "${rows_crm_staff}"
printf "  %-30s | %-15s\n" "crm.crm_daily_plans" "${rows_crm_plan}"
printf "  %-30s | %-15s\n" "crm.crm_call_logs" "${rows_crm_call}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}              REFRESH COMPLETED SUCCESSFULLY!       ${NC}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
