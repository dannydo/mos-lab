# mOS Inbox, IDE Task Bridge & Execution Safety Protocols

> Extracted from root/legacy `AGENTS.md` in Wave 0. Covers the mOS Inbox 3-Gate bridge workflow, Comment-First ticket handling, Night Shift loop, Orb Local-First verification, Intent Clarification, Workspace Isolation, and Credential Hygiene.

---

## 1. mOS Inbox Implementation & IDE Task Bridge (Kinh Thánh mOS `UI-007`)

When executing any ticket from mOS Inbox inside an assigned worktree (`ag-*` or `ide-*`), strictly follow the 3-Gate Control Flow using `scripts/ide-task-bridge.ts` (auto-detects token, `https://api.lab.masteros.app/api`, and `taskId` from `ANTIGRAVITY_CONVERSATION_ID`):

1. **Gate 1 Handshake (Receive Handoff Immediately)**:
   ```bash
   npx tsx scripts/ide-task-bridge.ts receive --out /tmp/handoff-<reportId>.json
   ```
2. **Implement, Test & Verify**:
   - Work 100% inside the assigned worktree.
   - Run `pnpm verify:quick` (and `pnpm check:ui-contract` + Playwright visual QA when modifying `apps/web/`).
3. **Gate 2 Activation (Submit Code/Test Receipt)**:
   - Never stop in chat without submitting the receipt (otherwise mOS Inbox stays stuck on _"Đang chờ Antigravity nhận handoff"_).
   - Stage untracked new files via `git add -N .` before computing `changedFiles` (`git diff --name-only HEAD`), `diffStat` (`git diff --stat HEAD`), `baseCommit` (`git rev-parse HEAD`), `patchHash` (SHA-256 of trimmed patch), and `result: { summary, tests, risksAndRollback }`.
   - Submit `/tmp/receipt-<reportId>.json`:
     ```bash
     npx tsx scripts/ide-task-bridge.ts submit --receipt /tmp/receipt-<reportId>.json
     ```
   - Status transitions to `AWAITING_DANNY_COMMIT_REVIEW` and shows **"Duyệt commit"** on the web.
4. **Gate 2 Listener (Single-Approval Web Workflow)**:
   - Danny approves strictly in one place (on the web). Never ask Danny to approve again in chat.
   - Immediately start the background listener:
     ```bash
     npx tsx scripts/ide-task-bridge.ts wait-and-commit --worktree <worktreePath> --message "<commit-message>" --auto-deploy
     ```
   - Summarize in chat with `walkthrough.md` link and speak once (honoring Anti-Echo so chat doesn't repeat what the bridge already spoke).
5. **Gate 3 Auto-Deploy Pipeline**:
   - When Danny clicks **"Duyệt commit"** on web, `wait-and-commit` captures `IDE_COMMIT_HANDOFF`, commits on the ticket branch, submits the commit receipt, and moves the ticket to `AWAITING_DANNY_DEPLOY_APPROVAL`.
   - When Danny clicks **"Duyệt deploy"** on web (button immediately turns Emerald green), `--auto-deploy` speaks confirmation, merges into `main`, pushes `origin main`, runs `deploy-production.sh`, verifies live release markers on API/Web, submits the release checkpoint, moves ticket to `AWAITING_REPORTER_ACCEPTANCE`, and speaks completion.

---

## 2. Comment-First Discipline & Live Ticket Context

- Before answering or planning any mOS Inbox ticket, query the latest comments directly from `crm_bug_report_comments`.
- Read every technical question and feedback note carefully; never reply with generic templates or dodge questions.
- Always sync accurate technical responses back to the ticket's comment stream so Danny and the team have a unified web trail.

---

## 3. Night Shift Autonomous Optimization Protocol

- **Trigger**: _"Bắt đầu Night Shift"_, _"night shift"_, _"tối ưu xuyên đêm"_, or `/night-shift`.
- **Branch Isolation**: Always check out `night-shift/YYYY-MM-DD`; never run night-shift edits directly on `main`.
- **Verification Loop**: Every batch must pass `bash scripts/night-shift-runner.sh` (`pnpm lint`, `pnpm --filter @mos-lab/shared build`, `pnpm build`), rolling back with `git checkout -- .` on failure.
- **Reporting**: Produce a summary `walkthrough.md` artifact with commit SHAs and merge instructions.

---

## 4. Orb Local-First VPS / Phalcon Verification Rule

- **Default Verification Sandbox**: Operational scripts, PHP/Phalcon edits, order regeneration, and backfills intended for Production VPS MUST first run and be reconciled in Orb local via `ssh root@ubuntu@orb`.
- **Required Sequence**: local backup on Orb → lint/syntax check → read-only dry-run → apply locally when approved → verify clean re-dry-run → reconcile ledger/side-effects directly → propose Production rollout.
- **Production Boundary**: Passing on Orb never grants implicit permission to touch Production. Production changes require explicit user approval with scope, batch IDs, Orb evidence, and rollback plan stated upfront.

---

## 5. Mandatory Intent Clarification & Verification Invariant

- **Core Rule**: _"Nếu không hiểu rõ hoặc có rủi ro, tuyệt đối không gửi lệnh, và kể cả AG, thấy không rõ thì phải clarify trước khi làm!"_
- **VoicePilot Frontline Gate**: Ambiguous or sensitive requests ("check slow queries log on prod", "check server logs", "fix payment bug") MUST be clarified in 1 short spoken question (target system/DB/VPS and scope/time range) before dispatching to AG.
- **AG Execution Guard**: For any Production action, DB mutation, or underspecified instruction, NEVER execute blindly — clarify target server, database, exact command, blast radius, and risks first, and request plan confirmation before running high-risk changes.

---

## 6. Workspace Isolation & External Credential Hygiene

- **Workspace Isolation**: Agents may READ files outside `/Users/dannydo/projects/mos-lab` for reference, but MUST NEVER create, edit, or overwrite external workspace files without explicit written confirmation stating the exact target absolute path.
- **Credential Hygiene**: Never store server passwords, private keys, API tokens, or session cookies in repository documentation. Resolve SSH targets through local `~/.ssh/config` aliases and load secrets from env vars / approved secret managers. If a credential is missing, report the missing variable/alias without printing or reconstructing values.
