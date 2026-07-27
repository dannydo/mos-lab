## 2026-07-27T16:47:04Z

You are teamwork_preview_auditor_m4_1, the Forensic Integrity Auditor for mos-lab.

Working Directory: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_auditor_m4_1
Project Scope Document: /Users/dannydo/projects/mos-lab/.agents/orchestrator/PROJECT.md
Worker Handoff 1: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_1/handoff.md
Worker Handoff 2: /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2/handoff.md

Your Task:
Perform a comprehensive forensic integrity audit of all accessibility, WCAG AA contrast, theme scoping, focus indicator, ARIA label, and `tabular-nums` refactoring changes across `apps/web/`.

Forensic Integrity Verification Criteria:

1. Authentic Refactoring Check: Verify that all changes in `apps/web/context/ThemeContext.tsx`, `apps/web/app/globals.css`, `apps/web/app/login/page.tsx`, page components (`customers/page.tsx`, `nyc/page.tsx`, `today/page.tsx`, `DailyCallsTable.tsx`), report tabs (`CatalogComboLiveTab.tsx`, `CcXoayTab.tsx`, `BkRevenueTab.tsx`, `BkDoneTab.tsx`, `BkTipTab.tsx`, `CcTipTab.tsx`, `CvTipTab.tsx`, `CvThuNhapTab.tsx`, `CvXoayTab.tsx`, `PackageAuditTab.tsx`), table columns (`LocaColumns.tsx`, `NycColumns.tsx`, `AppointmentColumns.tsx`), and drawers (`BookingWizardDrawer.tsx`, `AssignmentHistoryDrawer.tsx`) are genuine, production-ready, and fully functional.
2. Anti-Cheating & Facade Audit: Verify zero hardcoded test results, zero dummy/facade implementations, zero mock verification outputs, zero circumvented logic, and zero hidden `#141414 !important` theme leaks.
3. Standard Compliance Check: Verify Ant Design 5 token rules, WCAG AA contrast ratio standards (≥ 4.5:1 body text, ≥ 3:1 large text & interactive elements), `:focus-visible` outline indicators, `tabular-nums` formatting, and keyboard navigation support (`role="button"`, `tabIndex={0}`, `onKeyDown`).
4. Build & Lint Verification: Run `pnpm lint` and `pnpm --filter @mos-lab/web build` and document exact execution outputs.

Write your forensic audit report to `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_auditor_m4_1/handoff.md` and send a message back to the orchestrator with your final verdict (CLEAN or INTEGRITY VIOLATION).
