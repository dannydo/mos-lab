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

# 4. Connect to VPS and run the guarded production migration/deploy pipeline.
echo -e "${YELLOW}Deploying to Production VPS (live-wings)...${NC}"
ssh -o StrictHostKeyChecking=no live-wings 'bash /home/web/mos-lab/scripts/deploy-production.sh'

echo -e "${YELLOW}Verifying production release marker...${NC}"
curl --fail --silent --show-error --retry 6 --retry-delay 2 https://api.lab.masteros.app/api/release
echo

echo -e "${GREEN}=== 🎉 DEPLOYMENT WORKFLOW COMPLETED SUCCESSFULLY! ===${NC}"
echo -e "${GREEN}Frontend is building on Vercel: https://lab.masteros.app${NC}"
echo -e "${GREEN}Backend is updated on VPS: https://api.lab.masteros.app${NC}"
