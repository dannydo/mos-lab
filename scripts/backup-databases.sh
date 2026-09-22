#!/usr/bin/env bash
# ==============================================================================
# Automated Daily Database Backup for mos-lab & Legacy CRM
# - Single-transaction InnoDB dump (zero locking / non-blocking)
# - Runs with lowest CPU & IO priority (nice 19, ionice idle)
# - Gzip compressed (.sql.gz) with CRC32 integrity verification
# - 7-day automatic retention policy
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/home/backups/mysql"
RETENTION_DAYS=7
DATABASES=("management" "mos_lab")
DATE_TAG=$(date '+%Y%m%d_%H%M%S')
CNF_FILE="/etc/mysql/debian.cnf"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "=== Starting Daily Database Backup ==="

if [[ ! -f "$CNF_FILE" ]]; then
  log "[ERROR] MySQL credentials file not found: $CNF_FILE"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

for DB in "${DATABASES[@]}"; do
  TARGET_FILE="${BACKUP_DIR}/${DB}_${DATE_TAG}.sql.gz"
  TMP_FILE="${TARGET_FILE}.tmp"
  log "Dumping database '${DB}'..."

  START_TIME=$(date +%s)

  # Dump with single-transaction and non-blocking flags, running at lowest process/IO priority
  if nice -n 19 ionice -c 3 mysqldump \
    --defaults-extra-file="$CNF_FILE" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "$DB" | gzip -c > "$TMP_FILE"; then

    # Verify archive integrity
    if gzip -t "$TMP_FILE" 2>/dev/null; then
      mv "$TMP_FILE" "$TARGET_FILE"
      END_TIME=$(date +%s)
      DURATION=$((END_TIME - START_TIME))
      FILE_SIZE=$(du -h "$TARGET_FILE" | cut -f1)
      log "SUCCESS: '${DB}' saved to ${TARGET_FILE} (${FILE_SIZE}, took ${DURATION}s)"
    else
      log "[ERROR] Gzip integrity check failed for ${TMP_FILE}!"
      rm -f "$TMP_FILE"
      exit 1
    fi
  else
    log "[ERROR] mysqldump failed for database '${DB}'!"
    rm -f "$TMP_FILE"
    exit 1
  fi
done

# Enforce 7-day retention policy
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} +

TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
AVAILABLE_DISK=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
log "Total backup directory size: ${TOTAL_BACKUP_SIZE} (Disk available: ${AVAILABLE_DISK})"
log "=== Database Backup Completed Successfully ==="
