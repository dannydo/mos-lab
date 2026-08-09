## 2026-08-08T08:59:33Z

You are Explorer 2 for Milestone 4 (M4: KPI Dashboard UI & Booking Predictor Widget).
Your working directory is /Users/dannydo/projects/mos-lab/.agents/explorer_m4_2.

Objective:
Investigate and design the Next.js CRM KPI page tab ("CV Speed / Tốc Độ CV") and 4 UI sections in `apps/web/app/dashboard/kpi/`.

Inputs to read:

- /Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md
- /Users/dannydo/projects/mos-lab/.agents/orchestrator/plan.md
- apps/web/app/dashboard/kpi/page.tsx
- Existing KPI tab components in `apps/web/app/dashboard/kpi/components/`
- User rules in AGENTS.md (Light/Dark theme rules, tabular-nums for numbers, controlled pagination, Ant Design + Tailwind v4 rules).

Tasks:

1. Examine `apps/web/app/dashboard/kpi/page.tsx` and determine how to insert the tab `"CV Speed / Tốc Độ CV"` (`key: 'speed'`).
2. Design the component structure for `apps/web/app/dashboard/kpi/components/cv-speed/`:
   - `CvSpeedTab.tsx`
   - `CvSpeedMatrixSection.tsx` (Grid of CVs vs Lash Styles/Counts with Green/Yellow/Red indicators)
   - `CvSpeedRankingSection.tsx` (Sortable ranking table with speed rating, sample size, trend arrows)
   - `CvSpeedDetailModal.tsx` (CV summary, phase breakdown chart, per-case timeline, monthly trend)
   - `CvSpeedPredictorWidget.tsx` (Interactive calculator predicting ETA and phase breakdown)
3. Ensure all UI components adhere strictly to AGENTS.md rules:
   - `tabular-nums` class on all duration numbers / countdowns / metrics
   - Both Light Theme (`.light-theme`) and Dark Theme (`.dark-theme`) support using `themeMode` or Ant Design `theme.useToken()`
   - Controlled table pagination with page size options
4. Write your design and worker plan in `/Users/dannydo/projects/mos-lab/.agents/explorer_m4_2/analysis.md` and `handoff.md`. Send message when done.
