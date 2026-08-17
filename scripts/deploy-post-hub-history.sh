#!/usr/bin/env bash
set -euo pipefail

# One-shot production release wrapper for the signed Post Hub Sheet snapshot.
# It deliberately keeps real Sheet data out of git, transfers it only to a
# private temporary directory on the VPS, and removes the copy on every exit.

usage() {
  echo "Usage: $0 --snapshot /absolute/path/post-hub-sheet-history.json --sha256 <sha256>" >&2
  exit 2
}

read_option() {
  local name="$1"
  shift
  local next=""
  for arg in "$@"; do
    if [[ "$next" == 'yes' ]]; then
      printf '%s\n' "$arg"
      return 0
    fi
    if [[ "$arg" == "$name" ]]; then
      next='yes'
    fi
  done
  return 1
}

SNAPSHOT_PATH="$(read_option --snapshot "$@" || true)"
EXPECTED_SHA256="$(read_option --sha256 "$@" || true)"
if [[ -z "$SNAPSHOT_PATH" || -z "$EXPECTED_SHA256" || ! "$EXPECTED_SHA256" =~ ^[a-fA-F0-9]{64}$ ]]; then
  usage
fi
EXPECTED_SHA256="$(printf '%s' "$EXPECTED_SHA256" | tr '[:upper:]' '[:lower:]')"

SNAPSHOT_PATH="$(realpath "$SNAPSHOT_PATH")"
if [[ ! -f "$SNAPSHOT_PATH" ]]; then
  echo "Snapshot not found: $SNAPSHOT_PATH" >&2
  exit 1
fi
SNAPSHOT_NAME="$(basename "$SNAPSHOT_PATH")"
if [[ ! "$SNAPSHOT_NAME" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo 'Snapshot filename may only use letters, numbers, dots, underscores, and hyphens.' >&2
  exit 1
fi

LOCAL_SHA256="$(sha256sum "$SNAPSHOT_PATH" | awk '{print $1}')"
if [[ "$LOCAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "Snapshot SHA-256 mismatch before upload." >&2
  exit 1
fi

REMOTE_HOST='live-wings'
REMOTE_STAGE_ROOT='/home/web/.cache/mos-lab-deploy'
REMOTE_STAGE_DIR="${REMOTE_STAGE_ROOT}/post-hub-sheet-history-$(date +%s)-$$"
REMOTE_SNAPSHOT="${REMOTE_STAGE_DIR}/${SNAPSHOT_NAME}"

cleanup_remote_snapshot() {
  ssh -o BatchMode=yes "$REMOTE_HOST" \
    "if [[ '$REMOTE_STAGE_DIR' == '$REMOTE_STAGE_ROOT'/post-hub-sheet-history-* ]]; then rm -rf -- '$REMOTE_STAGE_DIR'; fi" \
    >/dev/null 2>&1 || true
}
trap cleanup_remote_snapshot EXIT

echo '[Post Hub] Checking that production checkout is clean before release...'
ssh -o BatchMode=yes "$REMOTE_HOST" \
  "cd /home/web/mos-lab && test -z \"\$(git status --porcelain)\"" || {
  echo 'Production checkout is dirty. Preserve or resolve those files before deploying.' >&2
  exit 1
}

echo '[Post Hub] Staging signed Sheet snapshot on VPS...'
ssh -o BatchMode=yes "$REMOTE_HOST" "install -m 700 -d '$REMOTE_STAGE_DIR'"
scp -o BatchMode=yes "$SNAPSHOT_PATH" "${REMOTE_HOST}:${REMOTE_SNAPSHOT}"
ssh -o BatchMode=yes "$REMOTE_HOST" "chmod 600 '$REMOTE_SNAPSHOT'"

REMOTE_SHA256="$(ssh -o BatchMode=yes "$REMOTE_HOST" "sha256sum '$REMOTE_SNAPSHOT' | awk '{print \$1}'")"
if [[ "$REMOTE_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo 'Snapshot SHA-256 mismatch after upload; production deploy was not started.' >&2
  exit 1
fi

echo '[Post Hub] Deploying code, schema, and the verified historical import...'
ssh -o BatchMode=yes "$REMOTE_HOST" \
  "cd /home/web/mos-lab && env \
POST_HUB_HISTORY_IMPORT_REQUIRED=true \
POST_HUB_HISTORY_IMPORT_INPUT='$REMOTE_SNAPSHOT' \
POST_HUB_HISTORY_IMPORT_SHA256='$EXPECTED_SHA256' \
bash scripts/deploy-production.sh"

echo '[Post Hub] Verifying production release marker...'
curl --fail --silent --show-error --retry 6 --retry-delay 2 https://api.lab.masteros.app/api/release
echo
echo '[Post Hub] Production deployment and verified history import completed.'
