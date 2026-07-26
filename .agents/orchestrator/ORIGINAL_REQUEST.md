# Original User Request

## 2026-07-26T02:48:31Z

Comprehensive performance, compilation time, rendering latency, API bottleneck, and accessibility audit across all 11+ web dashboard pages and nested tabs in mos-lab using Chrome DevTools & browser automation in Development Environment (http://localhost:4000).

Working directory: /Users/dannydo/projects/mos-lab
Integrity mode: development

## Requirements

### R1. Browser Automation & Page/Tab Performance Measurement

Using Chrome DevTools / Browser automation tools, navigate through every page and nested tab in the web dashboard:

- /dashboard/today
- /dashboard/customers (All, My Customers, Referrals)
- /dashboard/nyc
- /dashboard/loca
- /dashboard/appointments
- /dashboard/plans
- /dashboard/calls
- /dashboard/omicall
- /dashboard/kpi
- /dashboard/cc (Xoay, Thưởng, Minigame, Tip, Diamond, Thu nhập)
- /dashboard/cv (Xoay, Tip, Thu nhập)
- /dashboard/bk (Booking, Done, Tip, Revenue, Thu nhập)
- /dashboard/staff

Measure exact end-user metrics for each page & tab:

1. Navigation compilation & initial load duration (ms).
2. Time to interactive & rendering complete (ms).
3. Network request count and API payload sizes.

### R2. Backend Fastify API & Database Bottleneck Diagnosis

Inspect network trace & Fastify API routes (apps/api/src/modules/) corresponding to pages with >1s response times. Analyze SQL query complexity, missing indexes, and unoptimized ORM joins.

### R3. Accessibility & UX Audit

Audit semantic HTML, ARIA attributes, keyboard navigation, and contrast ratio across key dashboard components using web accessibility standards.

### R4. Detailed Performance Report & Optimization Code Plan

Generate a structured report (performance_report.md) detailing the benchmark matrix, identified frontend/backend bottlenecks, and code solutions for optimization.

## Acceptance Criteria

### Objective Audit & Optimization Deliverables

- [ ] Complete benchmark matrix table covering all 11+ routes and sub-tabs.
- [ ] List of all API endpoints taking >1.0s with exact SQL query/route root cause analysis.
- [ ] Detailed performance report (performance_report.md) with code optimization recommendations for both Frontend and Backend.
