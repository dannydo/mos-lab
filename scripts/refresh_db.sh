#!/usr/bin/env bash
#
# refresh_db.sh
# Synchronizes local databases (management & mos_lab) with production databases securely and at ultra-fast speeds.
#

set -eo pipefail

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default settings
SSH_TARGET="live-wings"
LOCAL_ENV_FILE="apps/api/.env"
SYNC_MODE="fast"     # fast | standard | full
SYNC_TARGET="all"    # all | legacy | crm
AUTO_PRISMA=true

show_help() {
  echo -e "${BOLD}Usage:${NC} bash scripts/refresh_db.sh [OPTIONS]"
  echo -e ""
  echo -e "${BOLD}Options:${NC}"
  echo -e "  --fast, --quick       Ultra-fast sync (6 months data filter for heavy tables + parallel stream, ~15-30s) [DEFAULT]"
  echo -e "  --standard            Standard sync (Full tables, excluding non-essential log tables, ~1-2 min)"
  echo -e "  --full                Full 100% sync of all tables including all logs (~3-5 min)"
  echo -e "  --legacy, --legacy-only Refresh ONLY the WingsLashes legacy database ('management')"
  echo -e "  --crm, --crm-only       Refresh ONLY the MOS-LAB CRM database ('mos_lab')"
  echo -e "  --no-prisma           Skip running 'pnpm --filter @mos-lab/api prisma:generate' after sync"
  echo -e "  -h, --help            Show this help message"
  echo -e ""
  exit 0
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --fast|--quick) SYNC_MODE="fast" ;;
    --standard)     SYNC_MODE="standard" ;;
    --full)         SYNC_MODE="full" ;;
    --legacy|--legacy-only) SYNC_TARGET="legacy" ;;
    --crm|--crm-only)       SYNC_TARGET="crm" ;;
    --no-prisma)            AUTO_PRISMA=false ;;
    -h|--help)              show_help ;;
    *) echo -e "${RED}Unknown parameter: $1${NC}"; show_help ;;
  esac
  shift
done

SYNC_MODE_UPPER=$(echo "$SYNC_MODE" | tr '[:lower:]' '[:upper:]')
SYNC_TARGET_UPPER=$(echo "$SYNC_TARGET" | tr '[:lower:]' '[:upper:]')

# Print Banner
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}     MOS-LAB & WINGSLASHES ULTRA-FAST DB REFRESH    ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "Sync Mode:   ${GREEN}${BOLD}${SYNC_MODE_UPPER}${NC}"
echo -e "Target DBs:  ${YELLOW}${BOLD}${SYNC_TARGET_UPPER}${NC}"
echo -e "SSH Target:  ${SSH_TARGET}"
echo -e "----------------------------------------------------"

# 1. Pre-flight Checks
if [ ! -f "$LOCAL_ENV_FILE" ]; then
  echo -e "${RED}Error: Local environment file not found at $LOCAL_ENV_FILE${NC}"
  exit 1
fi

# Parse MySQL URLs from .env
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

# Parse Legacy DB
LOCAL_LEGACY_URL=$(grep -E '^LEGACY_DATABASE_URL=' "$LOCAL_ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$LOCAL_LEGACY_URL" ]; then
  echo -e "${RED}Error: LEGACY_DATABASE_URL not defined in $LOCAL_ENV_FILE${NC}"
  exit 1
fi
parse_mysql_url "$LOCAL_LEGACY_URL"
local_legacy_user="$db_user"
local_legacy_pass="$db_pass"
local_legacy_db="$db_name"
local_legacy_host="$db_host"
local_legacy_port="$db_port"

# Parse CRM DB
LOCAL_CRM_URL=$(grep -E '^CRM_DATABASE_URL=' "$LOCAL_ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$LOCAL_CRM_URL" ]; then
  echo -e "${RED}Error: CRM_DATABASE_URL not defined in $LOCAL_ENV_FILE${NC}"
  exit 1
fi
parse_mysql_url "$LOCAL_CRM_URL"
local_crm_user="$db_user"
local_crm_pass="$db_pass"
local_crm_db="$db_name"
local_crm_host="$db_host"
local_crm_port="$db_port"

# Check SSH Connectivity
echo -n "Checking SSH connection to '$SSH_TARGET'... "
if ! ssh -o ConnectTimeout=5 "$SSH_TARGET" "echo ok" >/dev/null 2>&1; then
  echo -e "${RED}FAILED!${NC}"
  echo -e "${RED}Cannot connect to SSH host '$SSH_TARGET'. Please check VPN or ~/.ssh/config.${NC}"
  exit 1
fi
echo -e "${GREEN}OK${NC}"

# Check Local MySQL Connectivity
echo -n "Checking local MySQL connection (OrbStack)... "
run_local_legacy_sql() {
  orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" -N -e "$1" "$local_legacy_db" 2>/dev/null
}
run_local_crm_sql() {
  orb mysql -h"$local_crm_host" -P"$local_crm_port" -u"$local_crm_user" -p"$local_crm_pass" -N -e "$1" "$local_crm_db" 2>/dev/null
}

if ! orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" -e "SELECT 1;" >/dev/null 2>&1; then
  echo -e "${RED}FAILED!${NC}"
  echo -e "${RED}Cannot connect to local MySQL on port $local_legacy_port. Make sure OrbStack / MySQL is running.${NC}"
  exit 1
fi
echo -e "${GREEN}OK${NC}"

# Helpers for stats
get_db_size() {
  local db="$1"
  local query="SELECT COALESCE(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), 0) FROM information_schema.TABLES WHERE table_schema = '$db';"
  if [ "$db" = "$local_legacy_db" ]; then
    run_local_legacy_sql "$query" || echo "0"
  else
    run_local_crm_sql "$query" || echo "0"
  fi
}

get_db_tables() {
  local db="$1"
  local query="SELECT COUNT(*) FROM information_schema.TABLES WHERE table_schema = '$db';"
  if [ "$db" = "$local_legacy_db" ]; then
    run_local_legacy_sql "$query" || echo "0"
  else
    run_local_crm_sql "$query" || echo "0"
  fi
}

# Capture stats before sync
echo -e "\n${BLUE}[1/4] Gathering pre-sync statistics...${NC}"
legacy_size_before=$(get_db_size "$local_legacy_db")
legacy_tables_before=$(get_db_tables "$local_legacy_db")
crm_size_before=$(get_db_size "$local_crm_db")
crm_tables_before=$(get_db_tables "$local_crm_db")

echo -e "  - Legacy DB ('$local_legacy_db'): ${legacy_tables_before} tables, ${legacy_size_before} MB"
echo -e "  - CRM DB    ('$local_crm_db'): ${crm_tables_before} tables, ${crm_size_before} MB"

# Reset local DBs
echo -e "\n${BLUE}[2/4] Resetting target local databases...${NC}"
if [ "$SYNC_TARGET" = "all" ] || [ "$SYNC_TARGET" = "legacy" ]; then
  echo -e "  - Recreating local database: ${local_legacy_db}"
  orb mysql -h"$local_legacy_host" -P"$local_legacy_port" -u"$local_legacy_user" -p"$local_legacy_pass" -e "DROP DATABASE IF EXISTS ${local_legacy_db}; CREATE DATABASE ${local_legacy_db};"
fi

if [ "$SYNC_TARGET" = "all" ] || [ "$SYNC_TARGET" = "crm" ]; then
  echo -e "  - Recreating local database: ${local_crm_db}"
  orb mysql -h"$local_crm_host" -P"$local_crm_port" -u"$local_crm_user" -p"$local_crm_pass" -e "DROP DATABASE IF EXISTS ${local_crm_db}; CREATE DATABASE ${local_crm_db};"
fi

# 3. Synchronize Databases
echo -e "\n${BLUE}[3/4] Streaming & restoring databases in parallel...${NC}"
t_start=$(date +%s)

# Function to run remote dump over SSH
run_remote_dump() {
  local target_db="$1" # "legacy" or "crm"
  local mode="$2"      # "fast" or "standard" or "full"
  
  ssh "$SSH_TARGET" "TARGET_DB=$target_db DUMP_MODE=$mode bash -s" << 'REMOTE_EOF'
    if [ ! -f /home/web/mos-lab/apps/api/.env ]; then
      echo "Error: Remote .env file not found" >&2
      exit 1
    fi
    export $(grep -v '^#' /home/web/mos-lab/apps/api/.env | grep -v '^$' | xargs)
    
    if [ "$TARGET_DB" = "legacy" ]; then
      URL="$LEGACY_DATABASE_URL"
    else
      URL="$CRM_DATABASE_URL"
    fi
    
    proto_url="${URL#mysql://}"
    userpass="${proto_url%%@*}"
    hostportdb="${proto_url#*@}"
    
    db_user="${userpass%%:*}"
    db_pass="${userpass#*:}"
    hostport="${hostportdb%%/*}"
    db_name="${hostportdb#*/}"
    
    export MYSQL_PWD="$db_pass"
    DUMP_CMD="mysqldump --single-transaction --quick --skip-lock-tables --max-allowed-packet=512M -h 127.0.0.1 -u $db_user"
    
    if [ "$TARGET_DB" = "crm" ]; then
      # CRM is small, dump full database
      $DUMP_CMD "$db_name" | gzip -c
    elif [ "$DUMP_MODE" = "full" ]; then
      # Legacy full mode
      $DUMP_CMD "$db_name" | gzip -c
    elif [ "$DUMP_MODE" = "standard" ]; then
      # Legacy standard mode: exclude heavy log tables
      $DUMP_CMD \
        --ignore-table="${db_name}.item_insert_tracker" \
        --ignore-table="${db_name}.user_sms" \
        --ignore-table="${db_name}.user_url" \
        --ignore-table="${db_name}.log_action_touch" \
        --ignore-table="${db_name}.user_notification" \
        --ignore-table="${db_name}.log_action_click" \
        "$db_name" | gzip -c
    else
      # Legacy fast mode: schema + 6 months filter for heavy transactional tables
      EXCLUDES="--ignore-table=${db_name}.item_insert_tracker --ignore-table=${db_name}.user_sms --ignore-table=${db_name}.user_url --ignore-table=${db_name}.log_action_touch --ignore-table=${db_name}.user_notification --ignore-table=${db_name}.log_action_click"
      HEAVY_TABLES="staff_bonus staff_task inventory_warehouse_order_item sales_lead_user_service_type item_attribute_value sales_lead_split_item user_call order order_service user_balance_transaction sales_lead_select order_service_progress accountant_revenue_summary user_note user_service_balance_transaction order_state"
      
      IGNORE_HEAVY=""
      for t in $HEAVY_TABLES; do
        IGNORE_HEAVY="$IGNORE_HEAVY --ignore-table=${db_name}.$t"
      done
      
      (
        # Step 1: Dump full schema (no data)
        $DUMP_CMD --no-data $EXCLUDES "$db_name"
        
        # Step 2: Dump heavy transactional tables filtered by recent 6 months
        $DUMP_CMD --no-create-info $EXCLUDES --where="date_created >= DATE_SUB(NOW(), INTERVAL 6 MONTH)" "$db_name" $HEAVY_TABLES 2>/dev/null || true
        
        # Step 3: Dump all other tables in full
        $DUMP_CMD --no-create-info $EXCLUDES $IGNORE_HEAVY "$db_name"
      ) | gzip -c
    fi
REMOTE_EOF
}

# Helper to import SQL stream into local MySQL with FK checks disabled for maximum speed
import_local_sql() {
  local db_host="$1"
  local db_port="$2"
  local db_user="$3"
  local db_pass="$4"
  local db_name="$5"
  
  (
    echo "SET FOREIGN_KEY_CHECKS=0; SET UNIQUE_CHECKS=0; SET AUTOCOMMIT=0;"
    gunzip -c
    echo "COMMIT; SET FOREIGN_KEY_CHECKS=1; SET UNIQUE_CHECKS=1;"
  ) | orb mysql -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_pass" "$db_name"
}

# Run sync tasks
PID_LEGACY=""
PID_CRM=""

if [ "$SYNC_TARGET" = "all" ] || [ "$SYNC_TARGET" = "legacy" ]; then
  echo -e "  - Syncing Legacy database ('$local_legacy_db') in background..."
  (
    t0=$(date +%s)
    run_remote_dump "legacy" "$SYNC_MODE" | import_local_sql "$local_legacy_host" "$local_legacy_port" "$local_legacy_user" "$local_legacy_pass" "$local_legacy_db"
    t1=$(date +%s)
    echo -e "    ${GREEN}✓ Legacy sync completed in $((t1 - t0))s${NC}"
  ) &
  PID_LEGACY=$!
fi

if [ "$SYNC_TARGET" = "all" ] || [ "$SYNC_TARGET" = "crm" ]; then
  echo -e "  - Syncing CRM database ('$local_crm_db') in background..."
  (
    t0=$(date +%s)
    run_remote_dump "crm" "$SYNC_MODE" | import_local_sql "$local_crm_host" "$local_crm_port" "$local_crm_user" "$local_crm_pass" "$local_crm_db"
    t1=$(date +%s)
    echo -e "    ${GREEN}✓ CRM sync completed in $((t1 - t0))s${NC}"
  ) &
  PID_CRM=$!
fi

# Wait for parallel jobs to complete
if [ -n "$PID_LEGACY" ]; then wait "$PID_LEGACY"; fi
if [ -n "$PID_CRM" ]; then wait "$PID_CRM"; fi

t_end=$(date +%s)
total_duration=$((t_end - t_start))

# 4. Post-sync Prisma Client Generation
if [ "$AUTO_PRISMA" = true ]; then
  echo -e "\n${BLUE}[4/4] Regenerating Prisma Clients (@mos-lab/api)...${NC}"
  pnpm --filter @mos-lab/api prisma:generate >/dev/null 2>&1 || {
    echo -e "${YELLOW}Warning: Prisma generate encountered warnings or was run directly. Running verbose generate...${NC}"
    pnpm --filter @mos-lab/api prisma:generate
  }
  echo -e "${GREEN}✓ Prisma clients generated successfully.${NC}"
else
  echo -e "\n${BLUE}[4/4] Skipping Prisma generate (--no-prisma specified).${NC}"
fi

# Final Report
legacy_tables_after=$(get_db_tables "$local_legacy_db")
legacy_size_after=$(get_db_size "$local_legacy_db")
crm_tables_after=$(get_db_tables "$local_crm_db")
crm_size_after=$(get_db_size "$local_crm_db")

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
rows_crm_staff=$(get_row_count "$local_crm_db" "crm_staff")
rows_crm_plan=$(get_row_count "$local_crm_db" "crm_daily_plans")

echo -e "\n${GREEN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}         DATABASE REFRESH COMPLETED SUCCESSFULLY    ${NC}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "Timestamp:      $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "Sync Mode:      ${SYNC_MODE_UPPER}"
echo -e "Total Duration: ${total_duration} seconds"
echo -e "----------------------------------------------------"
echo -e "${BOLD}Database Summary:${NC}"
printf "  %-12s | %-12s | %-12s | %-12s\n" "Database" "Size Before" "Size After" "Tables"
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
printf "  %-30s | %-15s\n" "crm.crm_staff" "${rows_crm_staff}"
printf "  %-30s | %-15s\n" "crm.crm_daily_plans" "${rows_crm_plan}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
