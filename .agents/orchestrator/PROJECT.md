# Project: QA Shop Inspection UI Refactoring

## Architecture

- Frontend: Next.js 15 App Router (`apps/web/app/dashboard/qa-shop/page.tsx` & `apps/web/app/dashboard/qa-shop/components/`)
- Styling: Ant Design 5 + Tailwind CSS v4 + custom CSS theme variables (`.light-theme` & `.dark-theme`)
- Shared SDK & Types: `@mos-lab/shared` (`packages/shared/src/types/qa-shop.ts`)
- API Endpoints: Fastify 5 (`apps/api/src/modules/qa-shop/routes.ts`)

## Feature Inventory

| #   | Feature                                        | Description                                                                                                                                                                                                                  | Milestone | Source |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| 1   | Minimalist Vector Icon Toggle System           | `[✓ Đạt] [✕ Không đạt] [- N/A]` toggle buttons with `CheckOutlined`, `CloseOutlined`, `MinusOutlined`, soft feedback, tooltips, `aria-pressed`, and `focus-visible:ring-2`.                                                  | M1        | R1     |
| 2   | Refined Dot Indicators & Minimal Section Cards | 1px subtle borders (`border-slate-200/60` / `dark:border-slate-800/60`), vector icon headers (`BuildOutlined`), dot indicators for severity (`CRITICAL`, `HIGH`, `MEDIUM`/`MID`, `LOW`), WCAG AA compliant muted typography. | M1        | R2     |
| 3   | Flat Minimal Stat Cards & Soft Alert Strip     | Top KPI stat cards with `tabular-nums` digits and vector icon container pills. Soft alert strip summarizing failed items with `role="alert"` and `aria-live="polite"`.                                                       | M1        | R3     |
| 4   | Accessibility & Theme Integration (a11y)       | WCAG AA contrast standards, keyboard focus rings (`focus-visible:ring-2`), semantic HTML, dual Light/Dark theme support, `tabular-nums` on dynamic counters, `getPopupContainer` on `<Select>` inside `<Modal>`.             | M1        | R4     |
| 5   | Shared Type Alignment & Code Modularization    | Align `'MID'` vs `'MEDIUM'` severity type definitions between `page.tsx` and `@mos-lab/shared`, and ensure `page.tsx` and subcomponents in `components/` are synchronized and clean.                                         | M1        | Audit  |

## Milestones

| #   | Name                               | Scope                                                                                                                                                                                 | Dependencies | Status |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | M1: Refactor QA Shop Inspection UI | Implement R1 vector toggle, R2 dot indicators & section cards, R3 flat stat cards & soft alert strip, R4 a11y & theme compliance, type alignment in `apps/web/app/dashboard/qa-shop/` | None         | DONE   |

## Code Layout

- Page: `apps/web/app/dashboard/qa-shop/page.tsx`
- Subcomponents: `apps/web/app/dashboard/qa-shop/components/DailyAuditTab.tsx`, `ActionTicketsTab.tsx`, `ComplianceAnalyticsTab.tsx`, `HistoryLogsTab.tsx`, `GoogleSheetImportDrawer.tsx`
- Types: `packages/shared/src/types/qa-shop.ts`
