## 2026-07-28T02:09:14Z

Audit and inventory all Ant Design `<Select showSearch>` components, table filters, and text search input fields across the following CRM modules:

1. `/dashboard/today` (or `apps/web/app/dashboard/today/` and related components)
2. `/dashboard/customers` (or `apps/web/app/dashboard/customers/` and related components)
3. `/dashboard/bk` (or `apps/web/app/dashboard/bk/` and related components)
4. `/dashboard/cc` (or `apps/web/app/dashboard/cc/` and related components)

Tasks:

- Locate every single `<Select showSearch>`, `<Select filterOption=...>`, Table filter (`filterDropdown`, `onFilter`), and custom search Input in these modules.
- Check their current filtering implementation (e.g. default AntD filter, `option.children`, `option.label`, case-sensitivity, tone sensitivity).
- Document exact file paths, line numbers, component names, and current `filterOption` logic for each control.
- Formulate the exact refactoring needed for each control using `removeVietnameseTones`.

Output Requirements:

- Write your comprehensive audit report and handoff file to `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/handoff.md`.
- Send a message back to the orchestrator (conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6) when finished.
