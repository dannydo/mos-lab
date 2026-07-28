# Project: mos-lab Tone-Insensitive & Case-Insensitive Vietnamese Search Refactoring

## Architecture

- Utility Package: `@mos-lab/shared` or `apps/web/lib/utils/search.ts` providing `removeVietnameseTones(str: string): string` and `vietnameseSearchFilter(input: string, option: any): boolean`.
- Scope: All CRM dashboard modules (`apps/web/app/dashboard/*` and relevant components/tables across `/today`, `/customers`, `/bk`, `/cc`, `/cv`, `/catalog`, `/appointments`, `/loca`, `/nyc`, `/omicall`, `/staff`).
- Ant Design Integration: `<Select showSearch>` filterOption, Table `onFilter` / `filterDropdown`, and custom Input search handlers.

## Milestones

| #   | Name                                | Scope                                                                                                                                                                                          | Dependencies | Status |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | M1_search_exploration_and_utility   | Explore existing `<Select showSearch>`, table filters, and search inputs across all 11 dashboard modules; establish clean `removeVietnameseTones` utility & helper functions.                  | None         | DONE   |
| 2   | M2_dashboard_search_refactoring     | Refactor all search controls in all 11 dashboard modules to use `removeVietnameseTones` for tone-insensitive and case-insensitive matching. Verify build (`pnpm --filter @mos-lab/web build`). | M1           | DONE   |
| 3   | M3_review_and_adversarial_challenge | Independent review by 2 Reviewers & adversarial challenge by 2 Challengers for Vietnamese search coverage ("diep" -> "Ngọc Điệp", "hang" -> "Hằng Ni", "thuy" -> "Thuỳ Trang 🌸").             | M2           | DONE   |
| 4   | M4_forensic_integrity_audit         | Forensic integrity verification by `teamwork_preview_auditor` to ensure authentic implementation without hardcoding or test bypasses.                                                          | M3           | DONE   |
| 5   | M5_synthesis_and_reporting          | Final synthesis of refactoring results, verification confirmation, and victory completion report to Sentinel/User.                                                                             | M4           | DONE   |

## Code Layout

- `@mos-lab/shared/src/utils/search.ts` / `apps/web/lib/utils/search.ts`: `removeVietnameseTones` utility and `includesVietnamese` / `vietnameseFilterOption`.
- `apps/web/app/dashboard/`: Dashboard pages & sub-modules (`today`, `customers`, `bk`, `cc`, `cv`, `catalog`, `appointments`, `loca`, `nyc`, `omicall`, `staff`).
- `apps/web/components/`: Dashboard modals, drawers, table filters, and search selectors.
