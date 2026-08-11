# QA Shop Inspection UI Refactoring — Orchestration Plan

## Overview

Refactor the QA Shop Inspection UI (`/dashboard/qa-shop`) in `apps/web` into an ultra-minimalist, high-aesthetic interface adhering to strict UI/UX standards, WCAG AA accessibility, dual Light/Dark theme support, and tabular-nums formatting.

## Objectives & Requirements

1. **R1: Minimalist Vector Icon Toggle System**: Replace heavy badges/chunky radio buttons with clean vector icon buttons (`CheckOutlined`, `CloseOutlined`, `MinusOutlined`) with soft color feedback (emerald, red, slate), smooth transitions, tooltips, and keyboard accessibility.
2. **R2: Refined Dot Indicators & Minimal Section Cards**: Section cards with 1px subtle borders (`border-slate-200/60` / `dark:border-slate-800/60`), subtle severity dot indicators (`CRITICAL`, `HIGH`, `MID`, `LOW`), and muted typography (`text-slate-400`).
3. **R3: Flat Minimal Stat Cards & Soft Alert Strip**: Sharp `tabular-nums` typography and thin vector icons on top stat cards. Soft, non-intrusive alert strip summarizing failed items.
4. **R4: Accessibility (a11y) & Theme Integration**: Dual Light & Dark theme support, WCAG AA contrast standards, keyboard focus states (`focus-visible:ring-2`), semantic HTML structure.
5. **Verification**: `pnpm --filter @mos-lab/web build` passes with zero errors.

## Phase Breakdown

- **Phase 0: Codebase Survey**: Dispatch 3 parallel Explorers to inspect existing page/component implementation at `/dashboard/qa-shop`, data structures, current styling, icon imports, theme handling, and accessibility status.
- **Phase 1: Feature Inventory & Decomposition**: Create `PROJECT.md` with detailed feature inventory, code layout, and milestone definitions.
- **Phase 2: Milestone Execution Loop**:
  - Explorer: Plan exact implementation strategy.
  - Worker: Implement UI refactoring according to requirements R1-R4 and AGENTS.md rules.
  - Reviewers: 2 independent reviewers for UI aesthetic quality, WCAG AA contrast, theme compatibility, and code correctness.
  - Challengers: 2 challengers to verify interactive states, keyboard navigation, and edge case rendering.
  - Forensic Auditor: Verify integrity (no hardcoded/fake states or cheating).
- **Phase 3: Verification & Sentinel Completion Report**: Confirm `pnpm --filter @mos-lab/web build` succeeds, aggregate all gate results, and report completion to Sentinel.
