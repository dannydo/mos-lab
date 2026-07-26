# Post-Optimization Re-Audit Plan

## Objective

Conduct a comprehensive post-optimization performance, compilation time, rendering latency, API payload size, tabular-nums formatting, and accessibility re-audit across all 13 web dashboard pages and 13 nested sub-tabs (26 total route combinations) in `mos-lab` (http://localhost:4000). Create `performance_report_comparison.md` comparing pre-optimization baseline metrics vs post-optimization metrics with % improvement calculation.

## Decomposed Subtasks & Milestones

### Milestone 1: Frontend Performance Benchmarking & Route Sweeps

- Benchmark post-optimization navigation compilation/initial load duration (ms), time to interactive & rendering complete (ms), network request counts, and total API payload sizes (kB/MB) across all 26 page & sub-tab combinations.
- Sub-agent role: `teamwork_preview_explorer` (Frontend Benchmarker)

### Milestone 2: Fastify Backend API Payload & Indexing Verification

- Inspect Fastify backend routes and database schemas to verify API payload reductions (e.g. `GET /api/customers/referrals` reduced from 3.93 MB to ~12 kB), verify pagination, indexing, and pre-aggregation optimizations.
- Sub-agent role: `teamwork_preview_explorer` (Backend API & DB Verifier)

### Milestone 3: Tabular-Nums & Accessibility/WCAG AA Compliance Audit

- Verify missing `tabular-nums` formatting count across numeric/timer elements (target: 0 missing).
- Verify WCAG AA color contrast compliance, heading hierarchy (`<h1>` tag), `<nav>` landmark wrappers, and ARIA labels.
- Sub-agent role: `teamwork_preview_explorer` (A11y & UI Verifier)

### Milestone 4: Report Synthesis & Comparative Matrix Generation

- Aggregate all post-optimization metrics across 26 route combinations.
- Calculate % improvement for Cold Load, TTI/Render, API Payload Size, Tabular-Nums, and WCAG AA Compliance.
- Generate `performance_report_comparison.md` at `/Users/dannydo/projects/mos-lab/performance_report_comparison.md`.
- Send completion message to Sentinel.
