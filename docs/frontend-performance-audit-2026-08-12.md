# Frontend Performance Audit — 2026-08-12

## Scope and guardrails

- Branch: `codex/frontend-perf-audit`
- Base: `main` / `origin/main` at `518be4e83ab459d6598fcdaeb5461e818fdb68b4`
- Routes: `/dashboard` (redirects to `/dashboard/customers`), `/dashboard/customers`, `/dashboard/kpi`
- Production build, local Fastify API, authenticated mock session, no production writes
- Runtime profile: Chromium, 1440×900, a new browser context per route, 6-second observation window
- Lighthouse: default mobile simulation, cold cache, one run per route before and after

This audit only implements changes supported by bundle, network, render, or Lighthouse evidence. It does not change business logic, authorization, pagination semantics, API response data, or saved table configuration.

## Baseline bottlenecks and priority

| Priority     | Evidence                                                                                                                                                                                                     | Decision                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| P0           | Customers loaded 2.56 MB raw / 706 KB gzip of route JS. A 793 KB raw chunk contained the complete Lucide dynamic registry and Ant Design icon namespace. Lighthouse reported about 292 KB unused JS.         | Defer the full icon registries. Keep only the common table icons in the initial graph.                              |
| P0           | Dashboard/Customers made 17 initial API calls, including duplicate `release` and `cv-realtime-status` calls. KPI made 15 calls with duplicate trends, leaderboard, summary, release, and CV status requests. | Stabilize auth-dependent effects and prevent an equivalent KPI date range from replacing state on mount.            |
| P1           | KPI leaderboard column dependencies included a newly created appointment callback on every render.                                                                                                           | Memoize the callback against `leaderboard`.                                                                         |
| P1, residual | Mobile Lighthouse LCP remained 7–9 seconds and local API waterfall shows `cv-realtime-status` around 309 ms, allocation batches around 202 ms, and customer stats around 165 ms after the frontend fixes.    | Treat backend latency/data-ready rendering as the next investigation; do not mask it with speculative UI refactors. |

## Implemented changes

### 1. Defer icon registries

- `IconSystem.tsx` statically imports only 20 common Ant Design icons used by the default table configuration.
- `DeferredAntdIcon.tsx` resolves uncommon configured Ant Design icons after a lazy boundary.
- `DeferredLucideIcon.tsx` resolves arbitrary Lucide names after a lazy boundary and caches the generated components.
- Full Ant Design and Lucide pickers remain available. Browser QA opened both libraries, including all 1,995 Lucide options, without saving a configuration change.

### 2. Remove duplicate initial requests at their source

- Dashboard polling effects now depend on the stable authentication fact `hasAuthenticatedUser`, rather than the `user` object whose identity changes when background auth refresh completes.
- KPI date synchronization now preserves the current Day.js tuple when the calculated start/end values are equal. This prevents the mount-time equivalent state update and the second KPI fetch wave.
- No generic cache TTL was added, avoiding stale KPI/customer data and preserving existing refresh behavior.

### 3. Stabilize KPI callback dependencies

- `handleShowAppointments` is memoized with `useCallback`, so memoized leaderboard columns do not invalidate solely because the parent rendered.

## Before/after metrics

### Production route bundle

| Route           |      Raw before → after | Gzip before → after | Result                                                       |
| --------------- | ----------------------: | ------------------: | ------------------------------------------------------------ |
| Dashboard entry |     773,074 → 772,640 B | 246,336 → 248,348 B | Neutral; +2.0 KB gzip from the lazy-boundary bootstrap       |
| Customers       | 2,564,488 → 1,527,400 B | 706,260 → 480,396 B | **−1.04 MB raw (−40.4%), −225.9 KB gzip (−32.0%)**           |
| KPI             | 1,481,582 → 1,481,027 B | 464,748 → 465,349 B | Neutral; request/render fixes were the relevant optimization |

### Browser runtime and network

| Route     |                    JS transfer |                   Total transfer | Initial API calls | Duplicate calls | React commits | Long-task total |
| --------- | -----------------------------: | -------------------------------: | ----------------: | --------------: | ------------: | --------------: |
| Dashboard | 1,222,180 → 948,866 B (−22.4%) | 1,291,736 → 1,010,594 B (−21.8%) |           17 → 15 | 2 endpoints → 0 |       36 → 36 |    187 → 192 ms |
| Customers | 1,222,180 → 948,866 B (−22.4%) | 1,290,869 → 1,010,594 B (−21.7%) |           17 → 15 | 2 endpoints → 0 |       37 → 39 |    188 → 188 ms |
| KPI       | 1,070,105 → 837,998 B (−21.7%) |   1,139,661 → 899,726 B (−21.1%) |           15 → 10 | 5 endpoints → 0 |       28 → 26 |    133 → 130 ms |

The commit counter and long-task data do not support a broad claim that Customers render CPU improved. The measured win there is initial JavaScript/network weight. KPI removes two measured commits and a complete duplicate fetch wave.

After optimization, the Customers cold-context resource breakdown was 941 KB script, 42 KB stylesheet, 0 font transfer, and 867 B image transfer. This is why no image/font rewrite was included.

### Lighthouse cold-cache mobile simulation

| Route     |   Score |           LCP |          TBT |      Total bytes | Unused JS estimate | Main-thread work |
| --------- | ------: | ------------: | -----------: | ---------------: | -----------------: | ---------------: |
| Dashboard | 60 → 63 | 9.65 → 8.35 s | 555 → 496 ms | 1.324 → 1.041 MB |       292 → 170 KB | 2,899 → 2,764 ms |
| Customers | 60 → 63 | 9.22 → 8.20 s | 567 → 463 ms | 1.323 → 1.040 MB |       292 → 170 KB | 2,705 → 2,569 ms |
| KPI       | 62 → 64 | 7.07 → 7.30 s | 528 → 473 ms | 1.166 → 0.921 MB |       195 → 126 KB | 1,887 → 1,662 ms |

KPI LCP regressed by 0.23 seconds in the single Lighthouse run while TBT, bytes, main-thread work, interactive time, and API count improved. This is treated as run-to-run/local-data variability, not claimed as an LCP win. Field RUM or repeated CI medians are required before prioritizing another KPI LCP change.

## Evidence-based non-changes

- **Additional modal/chart dynamic imports:** Customers detail/booking/SMS/history/undo/revoke UI and KPI trends/config/audit tabs were already dynamically imported. No duplicate split was added.
- **Table virtualization:** Customers renders a controlled, server-paginated 20-row page despite a 52k total. The measured DOM and long-task data do not justify virtualization, which would add interaction and accessibility risk.
- **Generic API caching:** Existing request dedupe is already used selectively. The duplicate waves were removed at the unstable dependency/state source to avoid stale live KPI and operational counts.
- **Images/fonts:** The cold resource breakdown showed only one 867 B image transfer and no font transfer. JavaScript was the dominant asset cost.
- **Broad Ant Design refactor:** The evidenced issue was namespace/icon-registry loading, not normal component imports. A system-wide AntD rewrite was not justified.

## Verification

- `pnpm lint`: passed, 4/4 workspace packages
- `pnpm --filter @mos-lab/web exec tsc --noEmit`: passed
- `pnpm --filter @mos-lab/web build`: passed; Next.js production compile, type validation, and 29 route generations succeeded
- Targeted ESLint for all changed frontend files: passed
- Browser QA: Customers light/dark, server pagination, default icons, deferred Ant Design/Lucide picker, and KPI dashboard all rendered; browser console had 0 errors and 0 warnings
- `pnpm --filter @mos-lab/web test:run`: 28/29 tests passed. One existing QA Shop test fails because its mock does not define `apiClient.staff.list`, then cannot find the expected fail-note input. No QA Shop source or test was changed in this audit.

## Residual risks and next measurements

1. Lighthouse is a single local lab run, not field Web Vitals. Add production RUM and/or three-run CI medians before setting a performance budget.
2. The deferred Lucide registry remains a large on-demand chunk when a user opens the full picker or uses an uncommon configured icon. This is intentional to preserve configurability; a generated allowlist would require product/data migration evidence.
3. Customers mobile LCP remains high and appears tied to authenticated data readiness plus API latency. Profile server queries and identify the actual LCP element before changing skeleton or rendering semantics.
4. `/dashboard` is only a redirect to Customers. Measure the canonical Customers URL in monitoring to avoid redirect noise.
5. The unrelated QA Shop unit-test mock should be repaired separately so the full frontend suite is green.

## Suggested commit (not created)

`perf(web): defer icon registries and stabilize dashboard data effects`
