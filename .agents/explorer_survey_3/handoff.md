# Handoff Report: CV Lash Extension Speed Model — Frontend & Shared Types Investigation

**Agent**: `survey_explorer_3`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_3`  
**Date**: 2026-08-08  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **Original Requirements File**:
   - `ORIGINAL_REQUEST.md`: Lines 1–242.
   - Key specifications:
     - Logarithmic formula: $\text{time}_{phase}(n) = a + b \cdot \ln(n)$ per phase (`cleaning`, `extension`, `prep_qc`, `total`).
     - 3-Layer self-correcting fallback (Layer 1 Direct P50 $\ge 5$, Layer 2 Regression $\ge 3$, Layer 3 Global Benchmark Fallback $< 3$).
     - Monotonicity invariant constraint (Classic 60 < Classic 70 < Classic 80 for same CV).
     - Adaptive rolling window: Junior (3 mo), Mid-level (4 mo), Senior (6 mo).
     - DB Table `crm_cv_speed_profile` and 7 API endpoints (`/api/kpi/cv-speed/*`).

2. **Shared Package Structure**:
   - `packages/shared/src/index.ts`: Exports type files using NodeNext `.js` syntax (e.g. `export * from './types/cv.js';`).
   - `packages/shared/src/types/catalog.ts`: Defines `LASH_STYLES` (`['Classic', 'Mink', 'Volume 3D', 'Volume 4D', 'Volume 5D', 'Ultralight', 'Hyperlight', 'Flawless', 'Ivylight', 'Ivylight 3L', 'Ivylight 4L', 'Ivylight 5L', 'Under Mink'] as const`) and `LashStyle`.
   - `packages/shared/src/types/cv.ts`: Defines CV interfaces (`CvStaffOption`, `CvConfigResponse`, `CvLiveStatus`, etc.).

3. **Frontend CV Dashboard Structure**:
   - `apps/web/app/dashboard/cv/page.tsx`: Houses the CV report dashboard with tabs (`xoay`, `tip`, `thunhap`).
   - `apps/web/app/dashboard/cv/components/`: Contains `CvXoayTab.tsx`, `CvTipTab.tsx`, `CvThuNhapTab.tsx`.
   - Dynamic import pattern: Uses `dynamic(() => import('./components/...'), { ssr: false })` for tab components.

4. **SDK API Client Structure**:
   - `apps/web/lib/api-client.ts`: Exports `apiClient` object with modules `auth`, `catalog`, `customers`, `plans`, `calls`, `kpi`.

5. **Theme & Layout Compliance**:
   - Theme context: `useTheme()` hook in `apps/web/context/ThemeContext.tsx` providing `themeMode`.
   - Ant Design Design Tokens: `const { token } = theme.useToken();`.
   - Flex centering rule: `items-center` used for vertical flex alignment.
   - Number jitter prevention: `tabular-nums` class or `fontVariantNumeric: 'tabular-nums'`.

---

## 2. Logic Chain

1. **From Requirement Analysis to Shared Types**:
   - `ORIGINAL_REQUEST.md` specifies 7 backend endpoints returning profiles, matrix, ranking, trend, detail, prediction, and seed results.
   - To maintain strict end-to-end typing between Fastify backend (`apps/api`) and Next.js frontend (`apps/web`), shared types must be defined in `packages/shared/src/types/cv-speed.ts` and re-exported in `packages/shared/src/index.ts`.

2. **From Existing Tab Layout to Dashboard UI**:
   - `apps/web/app/dashboard/cv/page.tsx` currently renders 3 main tabs (`xoay`, `tip`, `thunhap`).
   - Adding a 4th tab key `speed` ("CV Speed / Tốc Độ CV") embedding `<CvSpeedTab />` fits seamlessly into the existing CV KPI dashboard layout.
   - `CvSpeedTab` should compose 4 modular sub-components (`CvSpeedMatrixOverview`, `CvSpeedRankingTable`, `CvSpeedDetailModal`, `CvSpeedBookingPredictor`).

3. **From Frontend Standards to Theme & Component Integration**:
   - The dashboard must support both Light Theme and Dark Theme dynamically via `themeMode` and `theme.useToken()`.
   - To avoid horizontal layout jitter during numerical updates, `tabular-nums` must be applied to all time durations, percentages, and counts.
   - Controlled table pagination with `localStorage` persistence ensures user state is maintained across navigation.

---

## 3. Caveats

1. **Lash Styles Consistency**:
   - `LASH_STYLES` from `catalog.ts` contains 13 styles. Predictions must gracefully handle styles with sparse historical data by defaulting to Layer 3 benchmark fallback.
2. **Read-Only Scope**:
   - As an explorer agent, no code changes were made to `apps/web` or `packages/shared` directly. Implementation must be carried out by the designated implementer subagent.

---

## 4. Conclusion

The existing `apps/web` frontend and `packages/shared` typing infrastructure are well-structured and ready for the CV Lash Extension Speed Model UI implementation. All requirements, shared type interfaces, tab layouts, API client extensions, and theme rules have been fully analyzed and documented in `analysis.md`.

---

## 5. Verification Method

1. **Verify Shared Package Build**:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
2. **Verify Frontend Next.js Build**:
   ```bash
   pnpm --filter @mos-lab/web build
   ```
3. **Inspect Output Files**:
   - `analysis.md`: `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_3/analysis.md`
   - `handoff.md`: `/Users/dannydo/projects/mos-lab/.agents/explorer_survey_3/handoff.md`
