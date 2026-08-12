#!/usr/bin/env bash
set -e

# ANSI escape codes for coloring
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 🚀 STARTING AUTOMATED DEPLOYMENT WORKFLOW ===${NC}"

# 1. Commit message checking
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="deploy: auto-update systems \$(date '+%Y-%m-%d %H:%M:%S')"
fi

# 2. Stage and commit changes locally
echo -e "${YELLOW}Staging and committing local changes...${NC}"
git add .
if git diff-index --quiet HEAD --; then
  echo -e "${GREEN}No new changes to commit locally.${NC}"
else
  git commit -m "$COMMIT_MSG"
  echo -e "${GREEN}Committed changes with message: '$COMMIT_MSG'${NC}"
fi

# 3. Push to Github
echo -e "${YELLOW}Pushing code to GitHub (main)...${NC}"
git push origin main
echo -e "${GREEN}Pushed successfully to GitHub. Frontend Vercel deployment triggered!${NC}"

# 4. Connect to VPS, Pull, Sync DB Schema, Build, and Restart PM2
echo -e "${YELLOW}Deploying to Production VPS (live-wings)...${NC}"
ssh -o StrictHostKeyChecking=no live-wings "
  set -e
  echo '[VPS] Navigating to project directory...'
  cd /home/web/mos-lab

  echo '[VPS] Pulling latest code from GitHub...'
  git pull

  echo '[VPS] Installing dependencies...'
  pnpm install

  echo '[VPS] Syncing Database Schema (Prisma db push)...'
  pnpm --filter @mos-lab/api exec prisma db push --schema=prisma/crm.prisma --skip-generate

  echo '[VPS] Building project packages...'
  pnpm --filter @mos-lab/shared build
  pnpm --filter @mos-lab/api build
  pnpm --filter @mos-lab/web build

  echo '[VPS] Restarting Backend API via PM2...'
  DEPLOYED_AT=\$(TZ=Asia/Ho_Chi_Minh date -Iseconds) pm2 restart mos-lab-api --update-env

  echo '[VPS] VPS Deployment completed successfully!'
"

echo -e "${GREEN}=== 🎉 DEPLOYMENT WORKFLOW COMPLETED SUCCESSFULLY! ===${NC}"
echo -e "${GREEN}Frontend is building on Vercel: https://lab.masteros.app${NC}"
echo -e "${GREEN}Backend is updated on VPS: https://api.lab.masteros.app${NC}"
