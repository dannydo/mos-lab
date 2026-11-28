#!/usr/bin/env bash
set -euo pipefail

# Idempotently clone inventory tables + lookup tables from local `management`
# into isolated `management_inventory_win` on loopback MariaDB (`127.0.0.1:3306`).
# Usage:
#   bash scripts/inventory/clone-management-inventory-win.sh [--full]

FULL_MODE=0
if [[ "${1:-}" == "--full" ]]; then
  FULL_MODE=1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
API_ENV_FILE="${ROOT_DIR}/apps/api/.env"
TARGET_DB="management_inventory_win"

if [[ ! -f "${API_ENV_FILE}" ]]; then
  echo "ERROR: Missing ${API_ENV_FILE}" >&2
  exit 1
fi

eval "$(python3 - "${API_ENV_FILE}" <<'PY'
import sys, urllib.parse, shlex

env_path = sys.argv[1]
legacy_url = ""
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        if k.strip() == "LEGACY_DATABASE_URL":
            legacy_url = v.strip().strip('"').strip("'")
            break

if not legacy_url:
    print('echo "ERROR: LEGACY_DATABASE_URL not found in apps/api/.env" >&2; exit 1')
    sys.exit(0)

u = urllib.parse.urlparse(legacy_url)
host = (u.hostname or "").lower()
if host not in ("127.0.0.1", "localhost", "::1"):
    print(f'echo "ERROR: Refusing non-loopback host: {host}" >&2; exit 1')
    sys.exit(0)

source_db = u.path.lstrip("/")
if not source_db:
    print('echo "ERROR: Empty database name in LEGACY_DATABASE_URL" >&2; exit 1')
    sys.exit(0)

print(f"DB_HOST={shlex.quote(u.hostname or '127.0.0.1')}")
print(f"DB_PORT={shlex.quote(str(u.port or 3306))}")
print(f"DB_USER={shlex.quote(u.username or '')}")
print(f"DB_PASS={shlex.quote(u.password or '')}")
print(f"SOURCE_DB={shlex.quote(source_db)}")
PY
)"

if [[ "${SOURCE_DB}" == "${TARGET_DB}" ]]; then
  echo "ERROR: SOURCE_DB and TARGET_DB are identical (${TARGET_DB})" >&2
  exit 1
fi

MYSQL_ARGS=(--skip-ssl -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "-p${DB_PASS}")
DUMP_ARGS=(--skip-ssl -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "-p${DB_PASS}" --single-transaction --no-tablespaces --quick)

echo "==> Cloning ${SOURCE_DB} -> ${TARGET_DB} on ${DB_HOST}:${DB_PORT} (full_mode=${FULL_MODE})"

mariadb "${MYSQL_ARGS[@]}" -e "DROP DATABASE IF EXISTS \`${TARGET_DB}\`; CREATE DATABASE \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Core inventory tables + reference lookup tables (keep shared `management` untouched)
CORE_TABLES=(
  client_business
  client_store
  client_store_language
  currency
  user_group
  attribute
  attribute_option
  attribute_set
  item_client
  system_label
  system_label_language
  order_product
  staff_profile
  inventory_item_brand
  inventory_item
  inventory_warehouse
  inventory_warehouse_item
  inventory_warehouse_item_state
  inventory_warehouse_item_assign
  inventory_warehouse_item_limit
  inventory_warehouse_check
  inventory_warehouse_check_item
  inventory_warehouse_order
  inventory_warehouse_order_item
  inventory_warehouse_order_state
  inventory_warehouse_order_select
  inventory_warehouse_check_delegation
  inventory_scan_error_evidence
  report_inventory_warehouse
  report_inventory_warehouse_item
  report_inventory_item_forecast
  user
  user_profile
  user_contact
  item_attribute_value
)

HUGE_TABLES_RECENT=(
  "user_scan_code:date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)"
  "report_inventory_warehouse_item_state:date >= DATE_SUB(CURDATE(), INTERVAL 120 DAY)"
  "media:id IN (SELECT DISTINCT 0 UNION ALL SELECT 1 WHERE 1=0)"
)

AVAILABLE_CORE=()
for tbl in "${CORE_TABLES[@]}"; do
  exists="$(mariadb "${MYSQL_ARGS[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${SOURCE_DB}' AND table_name='${tbl}';")"
  if [[ "${exists}" == "1" ]]; then
    AVAILABLE_CORE+=("${tbl}")
  fi
done

echo "==> Dumping and restoring ${#AVAILABLE_CORE[@]} core + reference tables..."
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
  mariadb-dump "${DUMP_ARGS[@]}" "${SOURCE_DB}" "${AVAILABLE_CORE[@]}"
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | mariadb "${MYSQL_ARGS[@]}" "${TARGET_DB}"

for spec in "${HUGE_TABLES_RECENT[@]}"; do
  tbl="${spec%%:*}"
  where_clause="${spec#*:}"
  exists="$(mariadb "${MYSQL_ARGS[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${SOURCE_DB}' AND table_name='${tbl}';")"
  if [[ "${exists}" != "1" ]]; then
    continue
  fi

  if [[ "${FULL_MODE}" == "1" && "${tbl}" != "media" ]]; then
    echo "==> Dumping FULL table ${tbl}..."
    {
      echo "SET FOREIGN_KEY_CHECKS=0;"
      mariadb-dump "${DUMP_ARGS[@]}" "${SOURCE_DB}" "${tbl}"
      echo "SET FOREIGN_KEY_CHECKS=1;"
    } | mariadb "${MYSQL_ARGS[@]}" "${TARGET_DB}"
  elif [[ "${tbl}" == "media" ]]; then
    echo "==> Cloning schema-only for ${tbl} (1.6M historical rows skipped)..."
    {
      echo "SET FOREIGN_KEY_CHECKS=0;"
      mariadb-dump "${DUMP_ARGS[@]}" --no-data "${SOURCE_DB}" "${tbl}"
      echo "SET FOREIGN_KEY_CHECKS=1;"
    } | mariadb "${MYSQL_ARGS[@]}" "${TARGET_DB}"
  else
    echo "==> Dumping recent subset for ${tbl}..."
    {
      echo "SET FOREIGN_KEY_CHECKS=0;"
      mariadb-dump "${DUMP_ARGS[@]}" --where="${where_clause}" "${SOURCE_DB}" "${tbl}"
      echo "SET FOREIGN_KEY_CHECKS=1;"
    } | mariadb "${MYSQL_ARGS[@]}" "${TARGET_DB}"
  fi
done

echo "==> Verifying cloned counts in ${TARGET_DB}:"
mariadb "${MYSQL_ARGS[@]}" "${TARGET_DB}" -e "
  SELECT 'inventory_warehouse' AS tbl, COUNT(*) AS cnt FROM inventory_warehouse
  UNION ALL SELECT 'inventory_item', COUNT(*) FROM inventory_item
  UNION ALL SELECT 'inventory_warehouse_item', COUNT(*) FROM inventory_warehouse_item
  UNION ALL SELECT 'inventory_warehouse_check', COUNT(*) FROM inventory_warehouse_check
  UNION ALL SELECT 'inventory_warehouse_check_item', COUNT(*) FROM inventory_warehouse_check_item
  UNION ALL SELECT 'user_scan_code', COUNT(*) FROM user_scan_code
  UNION ALL SELECT 'report_inventory_warehouse_item_state', COUNT(*) FROM report_inventory_warehouse_item_state;
  SELECT id, inventory_warehouse_id, item_state, check_state, total_quantity, total_quantity_checked
  FROM inventory_warehouse_check WHERE id IN (6062, 6063) ORDER BY id;
"
echo "==> Done: ${TARGET_DB} is ready for isolated Win AG inventory testing."
