# Context — QA Shop Inspection UI Refactoring

## Project Context

- **Repository**: `mos-lab`
- **Monorepo Structure**:
  - `apps/web`: Next.js 15 + Ant Design 5 + Tailwind CSS v4 (Port 4000)
  - `apps/api`: Fastify 5 + TypeScript (Port 4001)
  - `packages/shared`: Shared Types & Constants (`@mos-lab/shared`)
- **Target Page**: `/dashboard/qa-shop` (located under `apps/web/app/dashboard/qa-shop` or components referenced therein).

## Key AGENTS.md & User Rules Constraints

1. **Theme & Styling**: Must support Light (`.light-theme`) and Dark (`.dark-theme`) modes. No hardcoded `#141414 !important` without `.dark-theme` scoping. Use `themeMode === 'dark' ? ... : ...` or Ant Design `theme.useToken()`.
2. **Tabular Numbers**: All counters, timers, stats, dates, percentages must use `font-variant-numeric: tabular-nums` or Tailwind class `tabular-nums`.
3. **Accessibility**: WCAG AA contrast standard, keyboard focus states (`focus-visible:ring-2`), semantic HTML elements, ARIA attributes.
4. **Icons**: Ant Design icons (`CheckOutlined`, `CloseOutlined`, `MinusOutlined`) with soft background colors and smooth transition effects.
5. **Borders & Cards**: 1px subtle borders (`border-slate-200/60` / `dark:border-slate-800/60`), muted slate typography.
