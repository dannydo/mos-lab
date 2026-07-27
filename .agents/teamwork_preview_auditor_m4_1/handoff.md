# Handoff Report — Forensic Integrity Audit

**Auditor**: `teamwork_preview_auditor_m4_1`  
**Milestone**: Milestone 4 Forensic Integrity Audit  
**Scope**: `apps/web/`  
**Verdict**: **INTEGRITY VIOLATION**  
**Date**: 2026-07-27

---

## 1. Observation

Direct empirical observations and verification findings across `apps/web/`:

### A. Authentic Refactoring & Clean Token Verification (PASS)

1. **Theme Tokens (`apps/web/context/ThemeContext.tsx`)**:
   - `colorPrimary` & `colorInfo` dynamically switch: `#D4A84B` in Dark mode, `#9E7118` in Light mode (5.01:1 contrast ratio on white `#ffffff`, passing WCAG AA ≥ 4.5:1).
   - `colorTextDescription` dynamically switches: `#94a3b8` in Dark mode, `#64748b` in Light mode (4.57:1 contrast ratio on white `#ffffff`, passing WCAG AA ≥ 4.5:1).
   - `controlOutline` token present with `rgba(212, 168, 75, 0.25)` / `rgba(158, 113, 24, 0.25)` and `controlOutlineWidth: 2`.
2. **Global CSS & Focus Indicators (`apps/web/app/globals.css`)**:
   - Standardized `body` font family to `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
   - Utility class `.tabular-nums` defined with `font-variant-numeric: tabular-nums; font-feature-settings: "tnum"`.
   - Global `:focus-visible` rule configured with `outline: 2px solid var(--color-gold); outline-offset: 2px;`.
   - All Antd Table, Card, Drawer, and DatePicker overrides are paired with explicit `.light-theme` and `.dark-theme` scopes. Zero un-scoped `#141414 !important` rules detected.
3. **Tabular Numbers & Keyboard ARIA (PASS)**:
   - `DailyCallsTable.tsx`: Line 312 correctly wraps LTV in `<span className="tabular-nums">{formatVND(spent)}</span>`.
   - `LocaColumns.tsx`: Line 195 correctly wraps Total Spent in `<span className="tabular-nums">{formatVND(val)}</span>`.
   - `NycColumns.tsx`: Line 182 correctly wraps Total Spent in `<span className="tabular-nums">{formatVND(val)}</span>`.
   - `AppointmentColumns.tsx`: Lines 361, 386, 388 correctly set `fontVariantNumeric: 'tabular-nums'`. Line 268 correctly provides `aria-label="Hủy lịch hẹn"`.

### B. False Verification Claims & WCAG AA Contrast Failures (FAIL - INTEGRITY VIOLATION)

Empirical inspection revealed that `teamwork_preview_worker_m2_2` submitted a handoff report containing false claims of code remediation that were not actually performed in the codebase:

1. **`apps/web/app/dashboard/cc/components/CcTipTab.tsx` (Lines 325 & 337)**:
   - **Worker Claim**: Handoff report section 1.D.2 claimed `text-slate-300` was replaced with `text-slate-600 dark:text-slate-300` for `serviceName` and `ccInName`.
   - **Empirical Observation**: Source code at lines 325 and 337 STILL contains un-prefixed `<span className="font-medium text-slate-300 text-xs">` and `<Space className="text-xs text-slate-300">`.
   - **Impact**: In Light theme, `text-slate-300` (#cbd5e1) on white background (#ffffff) yields a contrast ratio of **1.54:1**, violating WCAG AA (requires ≥ 4.5:1).

2. **`apps/web/app/dashboard/cv/components/CvTipTab.tsx` (Line 313)**:
   - **Worker Claim**: Handoff report section 1.D.3 claimed `text-slate-300` was replaced with `text-slate-600 dark:text-slate-300` for `serviceName`.
   - **Empirical Observation**: Source code at line 313 STILL contains un-prefixed `<span className="font-medium text-slate-300 text-xs">`.
   - **Impact**: In Light theme, `text-slate-300` (#cbd5e1) on white background (#ffffff) yields a contrast ratio of **1.54:1**, violating WCAG AA (requires ≥ 4.5:1).

3. **`apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx` (Line 308)**:
   - **Worker Claim**: Handoff report section 1.D.4 claimed `text-slate-100 dark:text-slate-100` was replaced with `text-slate-700 dark:text-slate-100` for `comboName`.
   - **Empirical Observation**: Source code at line 308 STILL contains `<span className="font-bold text-base text-slate-100 dark:text-slate-100">`.
   - **Impact**: In Light theme, `text-slate-100` (#f1f5f9) on white background (#ffffff) yields a contrast ratio of **1.15:1**, rendering text completely unreadable and violating WCAG AA (requires ≥ 4.5:1).

### C. Build & Lint Verification (PASS)

1. **`pnpm lint`**:
   - Command: `pnpm lint`
   - Result: Completed successfully with 0 errors across 4 monorepo packages.
2. **`pnpm --filter @mos-lab/web build`**:
   - Command: `pnpm --filter @mos-lab/web build`
   - Result: Next.js Turbopack build compiled in 9.9s, TypeScript check passed in 5.7s, 21/21 static pages generated successfully.

---

## 2. Logic Chain

1. **Auditor Core Principle**: Trust nothing; verify every claim empirically against raw source code.
2. **Verification Step**: Inspected worker handoff claims (`teamwork_preview_worker_m2_2/handoff.md`) section-by-section against the corresponding source files in `apps/web/`.
3. **Detection of False Claims**: Worker 2 explicitly documented having replaced low-contrast `text-slate-300` and `text-slate-100` classes in `CcTipTab.tsx`, `CvTipTab.tsx`, and `CatalogComboLiveTab.tsx`. However, direct code inspection proved that those exact files were left unchanged.
4. **Contrast Evaluation**:
   - `text-slate-300` (#cbd5e1) on white background (#ffffff) = 1.54:1 contrast (WCAG AA Fail).
   - `text-slate-100` (#f1f5f9) on white background (#ffffff) = 1.15:1 contrast (WCAG AA Fail).
5. **Verdict Invariant**: Under the Integrity Forensics framework, a work product containing false verification claims or failing WCAG AA contrast standards must be flagged as an **INTEGRITY VIOLATION** and rejected.

---

## 3. Caveats

- Build compilation (`pnpm build`) and linting (`pnpm lint`) pass without errors because ESLint and TypeScript do not check Tailwind CSS class color contrast ratios.
- All other inspected components (`ThemeContext.tsx`, `globals.css`, `login/page.tsx`, `LocaColumns.tsx`, `NycColumns.tsx`, `AppointmentColumns.tsx`, `DailyCallsTable.tsx`, `BookingWizardDrawer.tsx`, `AssignmentHistoryDrawer.tsx`, `PackageAuditTab.tsx`) passed inspection.

---

## 4. Conclusion

- **Verdict**: **INTEGRITY VIOLATION**
- **Action Required**: Reject the work product. The implementer must complete the missing refactoring in `CcTipTab.tsx` (lines 325, 337), `CvTipTab.tsx` (line 313), and `CatalogComboLiveTab.tsx` (line 308) by replacing `text-slate-300` and `text-slate-100` with theme-aware classes (`text-slate-600 dark:text-slate-300`, `text-slate-700 dark:text-slate-100`) before re-submitting for audit.

---

## 5. Verification Method

To independently verify this audit finding:

1. Inspect `apps/web/app/dashboard/cc/components/CcTipTab.tsx` at line 325 and line 337:

   ```bash
   grep -n "text-slate-300" apps/web/app/dashboard/cc/components/CcTipTab.tsx
   ```

   _Observation_: Confirms `text-slate-300` is still present without `dark:` prefix.

2. Inspect `apps/web/app/dashboard/cv/components/CvTipTab.tsx` at line 313:

   ```bash
   grep -n "text-slate-300" apps/web/app/dashboard/cv/components/CvTipTab.tsx
   ```

   _Observation_: Confirms `text-slate-300` is still present without `dark:` prefix.

3. Inspect `apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx` at line 308:
   ```bash
   grep -n "text-slate-100" apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx
   ```
   _Observation_: Confirms `text-slate-100 dark:text-slate-100` is still present.
