#!/usr/bin/env bash
set -e

# ANSI Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}=== 🚑 STARTING EMERGENCY HOTFIX DEPLOYMENT WORKFLOW ===${NC}"

HOTFIX_DESC="$1"
if [ -z "$HOTFIX_DESC" ]; then
  echo -e "${RED}Error: Hotfix description required!${NC}"
  echo -e "${YELLOW}Usage: pnpm hotfix \"fix description summary\"${NC}"
  exit 1
fi

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
SLUG=$(echo "$HOTFIX_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-30)
HOTFIX_BRANCH="hotfix/${SLUG}-${TIMESTAMP}"
HOTFIX_TAG="hotfix-${TIMESTAMP}"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 1. Fast-track Local Verification Gate
echo -e "${YELLOW}Step 1: Running local fast-track build verification...${NC}"
pnpm build
echo -e "${GREEN}✓ Local build verification passed cleanly!${NC}"

# 2. Branching & Commit
echo -e "${YELLOW}Step 2: Creating hotfix branch: ${HOTFIX_BRANCH}${NC}"
git checkout -b "$HOTFIX_BRANCH"

echo -e "${YELLOW}Staging and committing local changes...${NC}"
git add .
COMMIT_MSG="fix(hotfix): ${HOTFIX_DESC}

- Emergency hotfix applied at ${TIMESTAMP}
- Fast-track verified locally and tagged ${HOTFIX_TAG}"

git commit -m "$COMMIT_MSG" || echo -e "${GREEN}No changes to commit.${NC}"

# 3. Push Hotfix Branch & Merge to Main
echo -e "${YELLOW}Step 3: Merging hotfix into main branch...${NC}"
git push origin "$HOTFIX_BRANCH"

git checkout main
git pull origin main
git merge --no-ff "$HOTFIX_BRANCH" -m "merge(hotfix): ${HOTFIX_DESC} [${HOTFIX_TAG}]"

# Create hotfix tag
git tag -a "$HOTFIX_TAG" -m "Hotfix Release ${HOTFIX_TAG}: ${HOTFIX_DESC}"
git push origin main
git push origin "$HOTFIX_TAG"

echo -e "${GREEN}✓ Merged into main and tagged ${HOTFIX_TAG} on GitHub! Vercel Frontend deploy triggered.${NC}"

# 4. Zero-downtime VPS Deployment & Health Check
echo -e "${YELLOW}Step 4: Deploying to Production VPS (live-wings) with Zero-Downtime...${NC}"
ssh -o StrictHostKeyChecking=no live-wings "
  set -e
  echo '[VPS] Navigating to project directory...'
  cd /home/web/mos-lab

  echo '[VPS] Creating safety DB backup snapshot...'
  mkdir -p /home/web/backups
  mysqldump -u root mos_lab > /home/web/backups/mos_lab_hotfix_${TIMESTAMP}.sql 2>/dev/null || echo '[VPS] DB Backup warning skipped.'

  echo '[VPS] Pulling latest main code...'
  git pull origin main

  echo '[VPS] Installing dependencies...'
  pnpm install

  echo '[VPS] Syncing Database Schema...'
  pnpm --filter @mos-lab/api exec prisma db push --schema=prisma/crm.prisma --skip-generate

  echo '[VPS] Building Shared and API packages...'
  pnpm --filter @mos-lab/shared build
  pnpm --filter @mos-lab/api build

  echo '[VPS] Performing Zero-Downtime PM2 Reload...'
  pm2 reload mos-lab-api --update-env || pm2 restart mos-lab-api

  echo '[VPS] Hotfix VPS process reloaded successfully!'
"

# 5. Post-Deploy Health Check & Verification
echo -e "${YELLOW}Step 5: Performing 15-second Post-Deploy Health Check on VPS API...${NC}"
sleep 5

HEALTH_OK=false
for i in {1..5}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://api.lab.masteros.app/api/staff" || echo "000")
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
    HEALTH_OK=true
    break
  fi
  echo -e "${YELLOW}Waiting for API to respond (status: $HTTP_STATUS, attempt $i/5)...${NC}"
  sleep 3
done

if [ "$HEALTH_OK" = true ]; then
  echo -e "${GREEN}${BOLD}=== 🎉 EMERGENCY HOTFIX DEPLOYED & VERIFIED SUCCESSFULLY! ===${NC}"
  echo -e "${GREEN}Tag: ${HOTFIX_TAG}${NC}"
  echo -e "${GREEN}Frontend: https://lab.masteros.app${NC}"
  echo -e "${GREEN}Backend API: https://api.lab.masteros.app${NC}"
else
  echo -e "${RED}${BOLD}⚠️ WARNING: Hotfix API health check did not respond cleanly!${NC}"
  echo -e "${YELLOW}Please check PM2 logs on VPS: ssh live-wings 'pm2 logs mos-lab-api --lines 50'${NC}"
  exit 1
fi
