# Subagent Task: R5 — Frontend UX & AGENTS.md Compliance Review

## Working Directory

/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r5

## Task Description

Audit Frontend UX design, layout architecture, theme support, SDK usage, and compliance with project AGENTS.md standards.

### Source Files to Examine:

1. `AGENTS.md` and `.agents/AGENTS.md` (Theme rules, Tabular Numbers rule, Ant Design + Tailwind CSS v4 hybrid styling rules, `apiClient` SDK rule, shared types rule, `.js` extension rule)
2. `apps/web/lib/api-client.ts` (examine SDK client structure and pattern for adding catalog methods)
3. `packages/shared/src/types/` (examine existing type definitions and exported models)
4. Existing UI components: `apps/web/app/` (examine layout, ThemeContext, Antd components usage)

### Detailed Instructions:

1. Theme Compliance & Dark/Light mode:
   - Verify how the proposed UI will support both Light and Dark themes (`.dark-theme` / `.light-theme` CSS overrides, `themeMode`, `theme.useToken()`).
   - Check Tabular Numbers rule (`tabular-nums` / `font-variant-numeric: tabular-nums`) for currency amounts, price inputs, durations, position numbers.
2. SDK & Shared Types:
   - Audit requirements for `apiClient` in `apps/web/lib/api-client.ts` (ensuring NO raw `axios` calls).
   - Audit required shared interfaces in `packages/shared/src/types/catalog.ts` (or `service.ts`, `product.ts`) and build requirement (`pnpm --filter @mos-lab/shared build`).
3. Imports & Code Conventions:
   - Enforce NodeNext `.js` extension requirement for relative imports in `apps/api/src/`.
   - Ant Design 5 + Tailwind CSS v4 hybrid workflow verification (Antd for complex state `<Table>`, `<Form>`, `<Modal>`, `<Select>`, Tailwind for spacing/flex/grid).
4. 3-Tab Layout Evaluation:
   - Evaluate proposed 3-tab layout: Tab 1: Dịch vụ lẻ (Single Services), Tab 2: Gói Combo (Combo Packages), Tab 3: Sản phẩm (Products).
   - Determine whether 3 tabs align cleanly with the underlying data models (`service` with `service_group='single'`, `service` with `service_group='combo'`, `product`), or if tab restructure/sub-tabs are needed.
5. Write a comprehensive report `handoff.md` in `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r5/` detailing UX evaluation, compliance checks, risk ratings, and exact proposed UI/code patterns.
