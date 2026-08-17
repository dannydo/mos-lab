#!/usr/bin/env bash
set -euo pipefail

DEPLOYED_AT=''

on_error() {
  local exit_code=$?
  echo "[VPS] Production deployment stopped (exit ${exit_code}) before API restart."
  exit "${exit_code}"
}

trap on_error ERR

cd /home/web/mos-lab

echo '[VPS] Pulling approved main commit...'
git pull --ff-only
DEPLOY_COMMIT="$(git rev-parse HEAD)"
echo "[VPS] Deploying ${DEPLOY_COMMIT}"

echo '[VPS] Installing dependencies...'
pnpm install --frozen-lockfile

echo '[VPS] Validating production data migrations...'
pnpm --filter @mos-lab/api data-migrations:validate

echo '[VPS] Syncing non-destructive CRM schema changes...'
# Do not add --accept-data-loss. A destructive change must be reviewed separately.
pnpm --filter @mos-lab/api schema:apply:crm

echo '[VPS] Applying legacy reporting indexes...'
pnpm --filter @mos-lab/api legacy:indexes:phase1

echo '[VPS] Planning production data migrations...'
pnpm --filter @mos-lab/api data-migrations:plan -- --commit="${DEPLOY_COMMIT}"

echo '[VPS] Running pending production data migrations...'
pnpm --filter @mos-lab/api data-migrations:run -- --commit="${DEPLOY_COMMIT}"

echo '[VPS] Building backend packages...'
pnpm --filter @mos-lab/shared build
pnpm --filter @mos-lab/api build

if [[ "${POST_HUB_HISTORY_IMPORT_REQUIRED:-false}" == 'true' || -n "${POST_HUB_HISTORY_IMPORT_INPUT:-}" || -n "${POST_HUB_HISTORY_IMPORT_SHA256:-}" ]]; then
  if [[ -z "${POST_HUB_HISTORY_IMPORT_INPUT:-}" || -z "${POST_HUB_HISTORY_IMPORT_SHA256:-}" ]]; then
    echo '[VPS] Post Hub Sheet import requires both POST_HUB_HISTORY_IMPORT_INPUT and POST_HUB_HISTORY_IMPORT_SHA256.' >&2
    exit 1
  fi
  POST_HUB_HISTORY_IMPORT_INPUT="$(realpath "${POST_HUB_HISTORY_IMPORT_INPUT}")"
  if [[ ! -f "${POST_HUB_HISTORY_IMPORT_INPUT}" ]]; then
    echo "[VPS] Post Hub Sheet snapshot does not exist: ${POST_HUB_HISTORY_IMPORT_INPUT}" >&2
    exit 1
  fi

  echo '[VPS] Importing the pre-validated Post Hub Sheet history before API restart...'
  pnpm --filter @mos-lab/api post-hub:import-history -- \
    --input "${POST_HUB_HISTORY_IMPORT_INPUT}" \
    --expected-sha256 "${POST_HUB_HISTORY_IMPORT_SHA256}" \
    --apply
fi

echo '[VPS] Restarting Backend API via PM2...'
DEPLOYED_AT="$(TZ=Asia/Ho_Chi_Minh date -Iseconds)"
DEPLOYED_AT="${DEPLOYED_AT}" pm2 restart mos-lab-api --update-env
echo "[VPS] Release marker updated: ${DEPLOYED_AT}"

echo '[VPS] Production backend deployment completed.'
