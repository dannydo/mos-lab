# Project: mos-lab Accessibility, Contrast, and Theme Integrity Refactoring

## Architecture

- Web Application: Next.js 15 + Ant Design 5 + Tailwind CSS v4 (`apps/web`)
- Theme System: Global `.light-theme` & `.dark-theme` classes on `<html>` root, Ant Design 5 token system (`ConfigProvider`), `globals.css` overrides.
- Standards: WCAG AA contrast ratio (≥ 4.5:1 body text, ≥ 3:1 large text & UI components), `:focus-visible` outline indicators, `tabular-nums` for dynamic numbers/currencies/times.
- Scope: All Pages (`/dashboard`, `/login`, `/customers`, etc.), Modal Popups, and Side Drawers (Side Slides) in Light & Dark modes.

## Milestones

| #   | Name                                | Scope                                                                                                                                                                         | Dependencies | Status |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | M1_accessibility_and_contrast_audit | Comprehensive audit of all pages, modal popups, and side drawers for contrast, unscoped dark/light CSS, missing focus indicators, missing tabular-nums, Antd 5 token misuses. | None         | DONE   |
| 2   | M2_theme_refactoring_and_wcag_fixes | Refactor `globals.css`, Ant Design theme config, pages, modals, drawers to meet WCAG AA, properly scoped `.light-theme`/`.dark-theme`, `:focus-visible`, `tabular-nums`.      | M1           | DONE   |
| 3   | M3_review_and_adversarial_challenge | Independent review by 2 Reviewers & adversarial verification by 2 Challengers for correctness, theme toggling, contrast compliance, and build/lint passing.                   | M2           | DONE   |
| 4   | M4_forensic_integrity_audit         | Forensic integrity verification by `teamwork_preview_auditor` to ensure zero hardcoded test hacks, authentic code refactoring, clean audit verdict.                           | M3           | DONE   |
| 5   | M5_synthesis_and_completion_report  | Final synthesis of audit & refactoring results, verification confirmation, and completion report to Sentinel/Parent.                                                          | M4           | DONE   |

## Code Layout

- `apps/web/app/globals.css`: Theme variables, Antd CSS overrides (`.dark-theme` / `.light-theme`), focus styles, tabular-nums utility rules.
- `apps/web/app/layout.tsx`: Root layout, ThemeProvider, Antd `ConfigProvider` token configuration.
- `apps/web/app/`: Next.js pages (`/dashboard`, `/login`, `/customers`, `/kpi`, `/catalog`, etc.).
- `apps/web/components/`: Reusable UI components, Modals, Drawers, Headers, Sidebar.
- `apps/web/lib/`: Theme context (`ThemeContext.tsx`), API client.
