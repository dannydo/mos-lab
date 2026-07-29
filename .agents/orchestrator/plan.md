# Implementation Plan: Booker Customer Allocation System Upgrade

## Objective

Orchestrate and implement the Booker Customer Allocation System upgrade in `mos-lab` based on the requirements in `/Users/dannydo/projects/mos-lab/.agents/ORIGINAL_REQUEST.md`:

1. **R1: Batch Pending Accept Flow**:
   - `PENDING_ACCEPT` status with 24h countdown timer.
   - Customers remain unassigned/pending during 24h period.
   - Booker verification modal showing customer details (name, phone, source, care history).
   - "Chấp nhận toàn bộ" -> status `ACCEPTED`, assigns customers officially to Booker.
   - "Từ chối toàn bộ" -> status `DECLINED` with mandatory decline reason, returns customers to allocation pool.
   - Auto-expiration after 24h without action -> status `EXPIRED`, returns customers to allocation pool.

2. **R2: Strict Deduplication & Database Transaction**:
   - Backend & DB filtering: filter out customers already owned by Booker or currently in another `PENDING_ACCEPT` batch.
   - Prisma `$transaction` and unique constraints: exact $+N$ customer increase for Booker upon acceptance without duplicate IDs or count mismatches.

3. **R3: 30-Day History & Countdown Timer**:
   - Allocation History tab/screen for Booker & Admin/Manager.
   - Records batch ID, assigner (Admin/Manager), recipient (Booker), customer count, status (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`), decline reason, timestamp.
   - 30-day countdown badge on history records showing remaining retention time.

4. **R4: Allocation Audit Dashboard for Admin/Manager**:
   - Overview dashboard for Admin/Manager to monitor acceptance/decline/expired rates per Booker, decline reasons.
   - "Recall Batch" button for Admin/Manager to recall `PENDING_ACCEPT` batches -> `RECALLED` and return customers to allocation pool.

5. **Build Integrity**:
   - Ensure `pnpm build` passes with zero type errors.

## Milestones & Work Items

### Milestone 1: Exploration & Architecture Audit (M1)

- Audit existing customer routes and database schema in `apps/api/src/modules/customers/` and `apps/api/prisma/`.
- Audit existing Booker frontend views in `apps/web/app/dashboard/bk/` and `/dashboard/customers/`.
- Design Prisma schema / DB models for `AllocationBatch` and `AllocationBatchItem`.
- Define shared DTOs & types in `packages/shared/src/types/allocation.ts`.

### Milestone 2: System Implementation & Integration (M2)

- Fastify Backend API (`apps/api/src/modules/allocation/`):
  - Batch creation with deduplication (`POST /api/allocation/batch`).
  - Pending batches query for Booker (`GET /api/allocation/pending`).
  - Batch acceptance in Prisma `$transaction` (`POST /api/allocation/accept`).
  - Batch decline with required reason (`POST /api/allocation/decline`).
  - Admin batch recall (`POST /api/allocation/recall`).
  - Auto-expiration runner (`POST /api/allocation/check-expired`).
  - 30-day history query (`GET /api/allocation/history`).
  - Audit dashboard statistics query (`GET /api/allocation/audit-dashboard`).
- Frontend (`apps/web`):
  - Booker Batch Verification Modal with 24h countdown.
  - Allocation History Tab/Screen with 30-day countdown badge.
  - Admin Allocation Audit Dashboard with per-Booker metrics & Recall button.
  - `apiClient` SDK integration in `apps/web/lib/api-client.ts`.
- Build verification: `pnpm build` passes.

### Milestone 3: Review & Adversarial Stress Testing (M3)

- 2 Reviewers check code quality, REST conventions, transaction safety, and accessibility.
- 2 Challengers test 24h timer expiration, exact $+N$ increment, deduplication edge cases, decline reason requirement, and monorepo build integrity.

### Milestone 4: Forensic Integrity Audit (M4)

- `teamwork_preview_auditor` performs forensic integrity checks on Prisma transactions, DB state transitions, deduplication logic, and zero mock bypasses.

### Milestone 5: Synthesis & Completion Reporting (M5)

- Synthesize findings, verify all pass criteria, confirm clean `pnpm build`, and submit completion report.
