## 2026-07-28T02:09:14Z

Audit and inventory all Ant Design `<Select showSearch>` components, table filters, and text search input fields across the following CRM modules, and inspect existing search utility helpers:

1. `/dashboard/nyc` (or `apps/web/app/dashboard/nyc/` and related components)
2. `/dashboard/omicall` (or `apps/web/app/dashboard/omicall/` and related components)
3. `/dashboard/staff` (or `apps/web/app/dashboard/staff/` and related components)
4. Shared search utilities: Inspect `@mos-lab/shared` (`packages/shared/`) and `apps/web/lib/utils/search.ts` (or `apps/web/lib/`) to check if `removeVietnameseTones` or Vietnamese text normalization utilities currently exist or if a new helper must be created/exported.

Tasks:

- Locate every single `<Select showSearch>`, `<Select filterOption=...>`, Table filter (`filterDropdown`, `onFilter`), and custom search Input in `/dashboard/nyc`, `/dashboard/omicall`, `/dashboard/staff` and any shared modal/components.
- Check existing `removeVietnameseTones` implementations across `mos-lab` or `packages/shared`.
- Define the optimal standard `removeVietnameseTones(str: string): string` utility function and helper `vietnameseSearchFilter` that handles accents/diacritics, lowercase conversion, null/undefined safety, and handles string or option object properties (`option?.label`, `option?.children`, etc.).
- Document exact file paths, line numbers, component names, and current `filterOption` logic for each control.
- Formulate the exact refactoring needed for each control using `removeVietnameseTones`.

Output Requirements:

- Write your comprehensive audit report and handoff file to `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3/handoff.md`.
- Send a message back to the orchestrator (conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6) when finished.
