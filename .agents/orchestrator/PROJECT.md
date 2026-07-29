# Project: mos-lab Booker Customer Allocation System Upgrade

## Architecture

- **Frontend**: Next.js 15 + Ant Design 5 + Tailwind v4 (`apps/web`).
  - **Booker Customer Management**: Verification Modal for pending batch accept (`PENDING_ACCEPT`) with 24h countdown timer, customer batch preview (name, phone, source, history summary), "Chấp nhận toàn bộ" and "Từ chối toàn bộ" (with mandatory decline reason).
  - **Allocation History Tab/Screen**: 30-day history view for Booker & Admin/Manager with 30-day countdown badge, status tags (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`), and decline reasons.
  - **Admin/Manager Allocation Audit Dashboard**: Overview dashboard showing allocation stats per Booker (acceptance/decline/expired rates), decline reasons breakdown, and "Thu hồi Batch" (Recall Batch) button for `PENDING_ACCEPT` batches.
  - **SDK**: `apiClient` in `apps/web/lib/api-client.ts`.
- **Backend**: Fastify 5 + TypeScript + Prisma (`apps/api`).
  - **Database Models / Tables**: Allocation batches (`AllocationBatch`, status `PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`), batch items linking customers, 24h expiration timestamps, 30-day retention countdown.
  - **API Routes**:
    - `POST /api/allocation/batch`: Admin/Manager creates pending batch $N$ customers for Booker (deduplicated against existing active or pending customers).
    - `GET /api/allocation/pending`: Fetch `PENDING_ACCEPT` batches for Booker modal/notification.
    - `POST /api/allocation/accept`: Booker accepts batch (Prisma `$transaction` assigns $+N$ customers to Booker, status -> `ACCEPTED`).
    - `POST /api/allocation/decline`: Booker declines batch with required reason (status -> `DECLINED`, customers returned to pool).
    - `POST /api/allocation/recall`: Admin/Manager recalls batch (status -> `RECALLED`, customers returned to pool).
    - `POST /api/allocation/check-expired`: Auto-expire batches > 24h (status -> `EXPIRED`, customers returned to pool).
    - `GET /api/allocation/history`: Fetch 30-day history for Booker / Admin.
    - `GET /api/allocation/audit-dashboard`: Fetch Admin/Manager audit metrics & per-Booker statistics.
- **Shared Package**: `@mos-lab/shared` (`packages/shared/src/types/allocation.ts`).

## Milestones

| #   | Name                                       | Scope                                                                                                                                                                                                                                       | Dependencies | Status  |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------- |
| 1   | M1_allocation_exploration_and_architecture | Audit current customer allocation routes/services, Prisma models, Booker UI views (`/dashboard/bk`, `/dashboard/customers`), map out Prisma `$transaction` deduplication and shared DTO types.                                              | None         | PLANNED |
| 2   | M2_allocation_system_implementation        | Implement shared types `@mos-lab/shared`, Fastify API routes & Prisma models, `apiClient` SDK methods, Booker Batch Acceptance Modal, 30-Day History Screen, Admin Audit Dashboard, and 24h auto-expiry logic. Verify build (`pnpm build`). | M1           | PLANNED |
| 3   | M3_review_and_adversarial_challenge        | Independent review by 2 Reviewers & empirical stress testing by 2 Challengers for transaction safety, deduplication, 24h timer, decline reason validation, and full build verification.                                                     | M2           | PLANNED |
| 4   | M4_forensic_integrity_audit                | Forensic integrity verification by `teamwork_preview_auditor` to ensure genuine DB operations, exact $+N$ increments, and zero mock bypasses.                                                                                               | M3           | PLANNED |
| 5   | M5_synthesis_and_reporting                 | Final synthesis of implementation results, verification confirmation, build confirmation, and completion report.                                                                                                                            | M4           | PLANNED |

## Code Layout

- `packages/shared/src/types/allocation.ts`: Shared DTOs and types for allocation batches, items, history, and audit metrics.
- `apps/api/src/modules/allocation/`: Fastify routes and services for customer allocation.
- `apps/web/lib/api-client.ts`: API Client SDK methods for allocation system.
- `apps/web/components/allocation/`: Allocation components (Verification Modal, History Table, Audit Dashboard).
- `apps/web/app/dashboard/allocation/` or `apps/web/app/dashboard/bk/`: Views for allocation history and audit dashboard.
