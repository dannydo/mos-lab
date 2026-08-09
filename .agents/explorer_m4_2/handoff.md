# Handoff Report: Milestone 4 (M4) — KPI Dashboard UI & Booking Predictor Widget

## 1. Observation

- **Page Routing & Tab Structure**: `apps/web/app/dashboard/kpi/page.tsx` line 63-70 dynamically imports `CvSpeedTab` and registers it in `<Tabs>` items at lines 751-759 under key `'speed'`:
  ```tsx
  const CvSpeedTab = dynamic(() => import('./components/cv-speed/CvSpeedTab').then((m) => m.CvSpeedTab), {
    ssr: false,
    loading: () => <div className="p-8 text-center"><Spin /></div>,
  });
  ...
  {
    key: 'speed',
    label: (<span><ThunderboltOutlined /> ⚡ Tốc Độ CV</span>),
    children: <CvSpeedTab />,
  }
  ```
- **Existing Monolithic Component**: `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedTab.tsx` (849 lines) currently contains inline code for all 4 sections.
- **Shared API Client & Types**:
  - `apps/web/lib/api-client.ts` lines 796-825 contains full `cvSpeed` API client object (`getProfiles`, `getMatrix`, `getRanking`, `getTrend`, `getDetail`, `predict`, `seed`).
  - `packages/shared/src/types/cv-speed.ts` exports all required TypeScript interfaces (`CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedDetail`, `CvSpeedPrediction`, `CvSpeedSeedResult`).

---

## 2. Logic Chain

1. **Modular Architecture**: Splitting the 849-line monolithic `CvSpeedTab.tsx` into 1 container + 4 specialized section sub-components improves code readability, testability, and adherence to standard React project layout:
   - `CvSpeedTab.tsx` (Container)
   - `CvSpeedMatrixSection.tsx` (Section 1: Speed Matrix Overview)
   - `CvSpeedRankingSection.tsx` (Section 2: Speed Ranking Table)
   - `CvSpeedDetailModal.tsx` (Section 3: CV Speed Detail Modal)
   - `CvSpeedPredictorWidget.tsx` (Section 4: Booking Predictor Widget)
2. **Theme & Rule Compliance**:
   - Every duration number, ETA calculation, count, badge, rank, and percentage MUST include class `tabular-nums` per `AGENTS.md` Rule #5 to prevent UI horizontal jitter.
   - Dynamic colors must react to `themeMode` from `useTheme()` or `antTheme.useToken()`. Hardcoded dark mode background styles without light mode conditionals violate `AGENTS.md` Rule #2.
   - Controlled table pagination saving `current` page to `localStorage` ensures user state persistence across tab switches.

---

## 3. Caveats

- **No Backend Modifications Required**: M4 scope is strictly restricted to Next.js frontend UI components and KPI page integration. All backend API endpoints and shared types were implemented in M1-M3.
- **Client-Side Rendering**: `CvSpeedTab` uses `ssr: false` in `page.tsx` dynamic import because it relies on client-side state (`localStorage`, `useTheme`, `window`).

---

## 4. Conclusion

The design and component architecture for Milestone 4 (M4) is complete. The implementer should refactor/create the 5 modular components in `apps/web/app/dashboard/kpi/components/cv-speed/` as detailed in `analysis.md`. All components must enforce `tabular-nums`, Light/Dark theme adaptivity, controlled pagination, and Vietnamese search normalization.

---

## 5. Verification Method

To verify the implementation of M4:

1. **Build Shared Types & Web Frontend**:
   ```bash
   pnpm --filter @mos-lab/shared build
   pnpm --filter @mos-lab/web build
   ```
2. **Inspect Files**:
   - `apps/web/app/dashboard/kpi/page.tsx`
   - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedTab.tsx`
   - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedMatrixSection.tsx`
   - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedRankingSection.tsx`
   - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedDetailModal.tsx`
   - `apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedPredictorWidget.tsx`
3. **Manual Verification**:
   - Run `pnpm dev` and visit `http://localhost:4000/dashboard/kpi`.
   - Click tab **"⚡ Tốc Độ CV"**.
   - Test search, filters, ranking table, CV detail modal, ETA predictor widget, and Light/Dark theme toggle.
