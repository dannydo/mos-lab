---
request_feedback: true
target: production
---

# Commit & Deploy Review — Post Hub native + verified Sheet history

## Scope and current worktree

- Branch: `main`
- Base commit: `bc7c0198 merge(hotfix): restrict booking reports to telesales team`
- No file has been staged, committed, pushed, or deployed.
- This worktree also contains an independent BK_CS customer-access change. It is deliberately excluded from the recommended Post Hub release.

## Files changed

### Recommended release: Post Hub only

```text
apps/api/package.json
apps/api/prisma/crm.prisma
apps/api/prisma/migrations/20260817000000_add_social_post_hub/migration.sql
apps/api/prisma/migrations/20260817113000_make_post_hub_mos_native/migration.sql
apps/api/src/modules/post-hub/post-hub.service.test.ts
apps/api/src/modules/post-hub/post-hub.service.ts
apps/api/src/modules/post-hub/routes.ts
apps/api/src/scripts/import-post-hub-sheet-history.ts
apps/api/src/server.ts
apps/web/app/dashboard/post-hub/page.tsx
apps/web/app/dashboard/post-hub/components/PostHubApprovalStage.tsx
apps/web/app/dashboard/post-hub/components/PostHubDataStage.tsx
apps/web/app/dashboard/post-hub/components/PostHubLeaderboardStage.tsx
apps/web/app/dashboard/post-hub/components/PostHubPresentation.tsx
apps/web/config/sidebar.config.tsx
apps/web/eslint.config.mjs
apps/web/lib/api-client.ts
packages/shared/src/index.ts
packages/shared/src/types/index.ts
packages/shared/src/types/social-posts.ts
scripts/deploy-post-hub-history.sh
scripts/deploy-production.sh
```

### Existing independent BK_CS access change — exclude

```text
apps/api/src/modules/customers/routes.ts
apps/api/src/modules/teams/team.service.ts
```

## What changes

### Post Hub mOS native

- Launches the native `1.DATA → 2.APPROVE → LEADERBOARD` workspace: mOS-authenticated submission, fast review, reward preview/configuration, source channel context, and poster Daily ledger.
- Uses the original post time in ICT throughout; weekly reporting is Monday–Sunday. Day/week/month navigation, tab, search, status, author filters, and controlled pagination persist through F5.
- Keeps the requested DATA and APPROVE author filters server-side and independent; menu label is **Chiến Thần** with an egg icon.
- Refactors the page into presentation and stage components, uses mOS UI primitives/AppIcon, and keeps the UI contract below the 900-line page limit.
- Adds `.next-qa/**` to ESLint generated-artifact ignores; it is a gitignored browser-QA build cache, not application source.

### Safe production history import

- Adds a private one-shot CLI, `post-hub:import-history`; there is no public import endpoint and no permanent production dependency on Google credentials.
- CLI accepts a signed JSON snapshot, validates exact Sheet ID, continuous DATA IDs, APPROVE backlinks, dates, field lengths, aliases, and SHA-256 before any write.
- Import is idempotent by `(source_spreadsheet_id, source_record_id)` and writes all 721 rows inside one transaction. Invalid authors/backlinks abort before it begins.
- Post-write verification checks every canonical record field (ID, author, channel, URL, ICT timestamps, content type, decision/comment/reviewer source field), plus status/content aggregates and a deterministic ledger digest.
- Dedicated release wrapper transfers a snapshot to a private VPS staging directory (`0700`/`0600`), rechecks its SHA-256, invokes the guarded deploy with the required import variables, then removes the remote copy on success or failure.

## Google Sheet source of truth

- Spreadsheet: `1sEp8FwAE6haY2q35-snCFb50EwAMRyAMIR-27AMkEUY`
- Frozen locally for dry-run only; its content is **not committed**. Current SHA-256: `0ac5baee346b260bf968bd19eaeda7b31b475aa20a91c427818ca290c3fcda90`.
- Verified source counts: `1.DATA = 721`, `2.APPROVE = 362` backlinks, 12 uniquely mapped active mOS posters.
- Expected production history from the current Sheet: `311 APPROVED`, `28 NEEDS_REVIEW`, `23 REJECTED`, `359 PENDING`; `25 VIDEO`, `696 RECRUITMENT_POST`.
- Four historic blank links remain intentionally. `FALSE`/blank optional reviewer cells normalize to `null`.
- Production deliberately follows the Sheet, not current local QA state: local has manual divergences (`#721` approved locally but Pending in Sheet; a later local review on `#370`). Thus `#721` will be Pending on production after the history import.

Before the real deploy, capture a **fresh** read-only snapshot, recompute SHA-256, rerun dry-run, and use the one-shot wrapper. This avoids silently importing an older Sheet revision.

## Verification completed

- `pnpm --filter @mos-lab/shared build` — passed.
- `pnpm --filter @mos-lab/api build` — passed.
- `pnpm --filter @mos-lab/web build` — passed.
- `pnpm lint` — passed.
- `pnpm check:ui-contract` — passed (329 source files).
- `pnpm --filter @mos-lab/api exec tsx --test src/modules/post-hub/post-hub.service.test.ts` — passed (14 tests).
- Sheet importer dry-run with the signed snapshot — passed: all 721 DATA / 362 APPROVE links, zero unmapped authors, exact `311/28/23/359` status plan.
- `pnpm --filter @mos-lab/api data-migrations:validate` — passed; 0 production data migrations (correct: history import is a separately guarded one-shot CLI, not a seed migration).
- `git diff --check`, `bash -n scripts/deploy-production.sh`, and `bash -n scripts/deploy-post-hub-history.sh` — passed.
- Browser QA previously verified filter persistence and the poster Daily drawer now reconciles exactly with its selected week.

## Production schema and import plan

### CRM schema changes

1. `20260817000000_add_social_post_hub`
   - Creates `crm_social_post_submissions`, staff/reviewer foreign keys, and indexes.
   - Expected data effect: schema only; no existing CRM rows change.
2. `20260817113000_make_post_hub_mos_native`
   - Makes `source_record_id` nullable for native mOS posts and adds `source_url_fingerprint` for native duplicate prevention.
   - Expected data effect: schema only; Sheet history is imported separately.

Production CRM has no Prisma migration baseline, so the guarded script uses `schema:apply:crm` (`prisma db push`) **without** `--accept-data-loss`. Do not run `prisma migrate deploy` or `prisma migrate resolve`.

### Historical Sheet import

1. Re-extract a new read-only snapshot right before deployment and record its SHA-256.
2. Preflight it locally with `post-hub:import-history` (no `--apply`).
3. After CI and explicit deployment approval, run `scripts/deploy-post-hub-history.sh`; it uploads the snapshot briefly, runs schema/build/import before PM2 restart, verifies the release marker, and clears the VPS copy.
4. Verify production returns 721 Sheet rows and the signed record digest/counts above. If import fails, PM2 restart is not reached; the one transaction rolls back the historical rows.

### Default data migrations

- None. `apps/api/src/scripts/data-migrations/` validates 0 modules.
- `bash scripts/deploy/migration-plan.sh origin/main` reports the CRM schema change; the two currently untracked SQL migration files are included in this review manually and will become visible to the git diff inventory when staged.

## Operational blocker to resolve before VPS deploy

The production checkout currently has a user-owned untracked file:

```text
apps/api/src/scripts/analyze-matches.ts
```

The release wrapper intentionally refuses to deploy a dirty production checkout. It will not delete, stash, or overwrite that file. Please choose how to preserve it before the later deploy (for example: retain it outside the checkout, or explicitly authorize a backup-and-clean step).

## Proposed commit message

```text
feat(post-hub): launch native campaign ledger

- Add mOS-native post intake, review ledger, rewards, and daily leaderboard.
- Preserve verified Google Sheet history through a hash-checked one-shot import.
- Add guarded CRM schema and deployment workflow for the historical ledger.

AI-assisted. Reviewed and verified.
```

## Approval requested

Please approve the **Post Hub only** scope and the proposed commit message. I will then stage only the listed Post Hub files, leave the two BK_CS files untouched, commit, push, and monitor CI. After CI passes, I will ask again before any VPS deployment or Sheet upload.
