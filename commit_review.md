---
request_feedback: true
target: production
---

# Commit & Deploy Review — Post Hub platform, avatar, and UI polish

## Scope and worktree

- Branch: `main`
- Base commit: `dad709ac` (`merge(hotfix): restore BK_CS customer detail access`)
- No file has been staged, committed, pushed, or deployed in this review.
- The changes below are the current user-requested Post Hub and campaign-header UI batch.

## Files changed

```text
apps/api/src/modules/post-hub/post-hub.service.test.ts
apps/api/src/modules/post-hub/post-hub.service.ts
apps/api/src/modules/post-hub/routes.ts
apps/web/app/dashboard/post-hub/components/PostHubApprovalStage.tsx
apps/web/app/dashboard/post-hub/components/PostHubDataStage.tsx
apps/web/app/dashboard/post-hub/components/PostHubLeaderboardStage.tsx
apps/web/app/dashboard/post-hub/components/PostHubPresentation.tsx
apps/web/app/dashboard/post-hub/page.tsx
apps/web/app/globals.css
packages/shared/src/types/social-posts.ts
commit_review.md
```

## What changes

### Post Hub: real employee avatars

- Reads the existing canonical `crm_staff.avatar_url` and returns it through the typed Post Hub API for native submissions, DATA/APPROVE rows, and the leaderboard.
- Uses one shared avatar renderer for all Post Hub stages. It safely normalizes legacy Wings paths, shows a real profile image when available, and falls back to initials if absent or unavailable.
- No staff profile data, social-post data, or database schema is modified.

### Post Hub: Facebook / TikTok filter

- Adds **Tất cả nền tảng / Facebook / TikTok** beside the 1.DATA poster filter.
- The API infers the platform from the source URL, validates the requested filter, then filters before author options, summary, total, and pagination. This avoids mismatched counts and does not trust a free-text channel declaration.
- The 1.DATA platform selection persists through F5 and resets only the DATA table to page 1 when changed. 2.APPROVE and Leaderboard remain unchanged.

### Header and campaign search polish

- Moves numeric header badges to the top-inline edge with a visible top layer so counts are no longer clipped.
- Makes the NYC mobile search trigger rules explicit so the compact view exposes only one search control.

## Verification completed

- `pnpm --filter @mos-lab/shared build` — passed.
- `pnpm --filter @mos-lab/api build` — passed.
- `pnpm --filter @mos-lab/web build` — passed.
- `pnpm lint` — passed, including the UI-contract check (331 source files).
- `pnpm --filter @mos-lab/api exec tsx --test src/modules/post-hub/post-hub.service.test.ts` — passed (16 tests).
- `git diff --check` — passed.
- Browser QA on Post Hub — real CDN staff photos loaded; Facebook filter returned Facebook-only rows; TikTok filter returned TikTok-only rows; the selected platform persisted after reload. The page was restored to **Tất cả nền tảng** afterward.

## Production migration plan

### CRM schema changes

- None. `bash scripts/deploy/migration-plan.sh origin/main` reports `Schema changes: none`.
- The guarded production deploy will retain its normal non-destructive `schema:apply:crm` check, but this commit changes no Prisma model or SQL schema.

### Production data migrations

- None. `pnpm --filter @mos-lab/api data-migrations:validate` validated 0 production data migrations.
- No Google Sheet import or historical ledger re-import is part of this release.

## Release notes and non-blocking follow-ups

- Platform inference currently runs in the Post Hub service after its existing filtered ledger query. This is appropriate for the present dataset; if the ledger grows substantially, consider persisting an indexed normalized platform column.
- A poster selection is intentionally retained when changing platform. If that person has no records on the selected platform, the table correctly becomes empty; automatic clearing can be evaluated later as a UX refinement.
- The global header safe rail was visually checked at the current desktop layout. Very narrow desktop widths remain a future responsive smoke-test area.

## Proposed commit message

```text
feat(post-hub): add platform filters and staff avatars

- Return canonical mOS profile images across DATA, APPROVE, and Leaderboard.
- Filter 1.DATA by Facebook or TikTok with persisted server-side pagination.
- Keep header badges visible and prevent duplicate mobile campaign search controls.

AI-assisted. Reviewed and verified.
```

## Approval requested

Please approve this commit message and scope. After approval, I will stage the reviewed worktree, commit, and push `main`; then I will monitor CI and ask once more before the VPS deployment.
