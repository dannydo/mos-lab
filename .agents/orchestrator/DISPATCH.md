# Dispatch Assignment

## 2026-08-11T12:03:56+07:00

### Task Summary

You are the Project Orchestrator for the QA Shop Inspection UI Refactoring task in mos-lab.

Working Directory for metadata: /Users/dannydo/projects/mos-lab/.agents/orchestrator
Project Root: /Users/dannydo/projects/mos-lab
Web App Directory: /Users/dannydo/projects/mos-lab/apps/web

Refer to original request under ## Follow-up — 2026-08-11T05:03:24Z in /Users/dannydo/projects/mos-lab/.agents/ORIGINAL_REQUEST.md.

### Requirements:

- R1: Minimalist Vector Icon Toggle System (`[✓ Đạt] [✕ Không đạt] [- N/A]`) using `CheckOutlined`, `CloseOutlined`, `MinusOutlined` with soft color feedback, smooth transitions, and tooltips.
- R2: Refined Dot Indicators (`CRITICAL`, `HIGH`, `MID`, `LOW`) & Minimal Section Cards with 1px borders (`border-slate-200/60` / `dark:border-slate-800/60`), muted typography.
- R3: Flat Minimal Stat Cards with `tabular-nums` typography and thin vector icons, plus a Soft Alert Strip summarizing failed items.
- R4: Accessibility (a11y) & Theme Integration: WCAG AA contrast standards, keyboard focus states (`focus-visible:ring-2`), semantic HTML, dual Light/Dark theme support.
- Verification: `pnpm --filter @mos-lab/web build` must compile with zero errors.
