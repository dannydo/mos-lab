---
name: hotfix-deploy
description: >
  Emergency hotfix deployment workflow: Agent creates a short-lived hotfix branch,
  runs local fast-track build verification, merges to main, creates a git tag,
  executes zero-downtime PM2 reload on VPS with DB backup, and performs post-deploy health checks.
  Triggered by saying "deploy hotfix", "hotfix", "sửa gấp", or "hotfix deploy".
---

# 🚑 Emergency Hotfix Deployment Skill (mos-lab 2026)

## Overview
This skill automates emergency hotfix deployments for critical production bugs in `mos-lab`.
It isolates changes in a short-lived `hotfix/<slug>-<timestamp>` branch, runs fast-track local build checks, merges into `main`, tags the release (`hotfix-YYYYMMDD-HHMMSS`), and executes zero-downtime deployment to the VPS with safety DB backups.

## Trigger Phrases
- "deploy hotfix"
- "hotfix"
- "sửa gấp"
- "hotfix deploy"
- "deploy khẩn cấp"

---

## Hotfix Workflow (5 Steps)

### Step 1: Local Fast-Track Verification
1. Run `git -C /Users/dannydo/projects/mos-lab status` and `git diff --stat` to review changed files.
2. Run local fast-track build check:
   ```bash
   pnpm --filter @mos-lab/shared build
   pnpm --filter @mos-lab/api build
   pnpm --filter @mos-lab/web build
   ```
3. If build fails, STOP and fix the issue before proceeding.

### Step 2: Branching & Conventional Commit
1. Generate timestamp `TIMESTAMP=$(date '+%Y%m%d-%H%M%S')`.
2. Create short-lived hotfix branch:
   ```bash
   git checkout -b hotfix/fix-summary-${TIMESTAMP}
   ```
3. Stage and commit with Conventional Commit format:
   ```bash
   git add .
   git commit -m "fix(hotfix): <summary>

   - Emergency hotfix applied at ${TIMESTAMP}
   - Fast-track verified locally and tagged hotfix-${TIMESTAMP}"
   ```

### Step 3: Merge to Main & Git Tagging
1. Push hotfix branch and merge into `main`:
   ```bash
   git push origin hotfix/fix-summary-${TIMESTAMP}
   git checkout main
   git pull origin main
   git merge --no-ff hotfix/fix-summary-${TIMESTAMP} -m "merge(hotfix): <summary> [hotfix-${TIMESTAMP}]"
   ```
2. Tag release:
   ```bash
   git tag -a "hotfix-${TIMESTAMP}" -m "Hotfix Release hotfix-${TIMESTAMP}"
   git push origin main
   git push origin "hotfix-${TIMESTAMP}"
   ```

### Step 4: Zero-Downtime VPS Deployment
1. SSH into VPS `live-wings` and execute:
   ```bash
   ssh -o StrictHostKeyChecking=no live-wings "
     set -e
     echo '[VPS] Creating safety DB snapshot...'
     mkdir -p /home/web/backups
     mysqldump -u root mos_lab > /home/web/backups/mos_lab_hotfix_${TIMESTAMP}.sql 2>/dev/null || true

     echo '[VPS] Pulling main code...'
     cd /home/web/mos-lab
     git pull origin main
     pnpm install

     echo '[VPS] Syncing Database Schema...'
     pnpm --filter @mos-lab/api exec prisma db push --schema=prisma/crm.prisma --skip-generate

     echo '[VPS] Building Shared & API packages...'
     pnpm --filter @mos-lab/shared build
     pnpm --filter @mos-lab/api build

     echo '[VPS] Performing Zero-Downtime PM2 Reload...'
     pm2 reload mos-lab-api --update-env || pm2 restart mos-lab-api
   "
   ```

### Step 5: Post-Deploy Health Check & Verification
1. Wait 5 seconds and check VPS API status code:
   ```bash
   HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://api.lab.masteros.app/api/staff")
   ```
2. If HTTP status is 200, 401, or 403 (valid API response), report success with Tag name, Frontend URL (`https://lab.masteros.app`), and API URL (`https://api.lab.masteros.app`).
3. If API health check fails (status 5xx or connection error), alert user and provide command to check PM2 logs:
   `ssh live-wings 'pm2 logs mos-lab-api --lines 50'`

---

## Quick Command Line Usage
Instead of step-by-step AI execution, developers can also execute the hotfix script directly from terminal:

```bash
pnpm hotfix "Sửa lỗi hiển thị đơn hàng trùng lặp"
```
