# Project: Campaign Allocation Unification

## Architecture

- Backend: Fastify 5 + TypeScript (`apps/api`), Prisma ORM with DB models (`crm_allocation_batches`, `crm_allocation_batch_items`, `crm_assignment_histories`, `crm_customer_assignments`, `crm_campaign_customers`, `crm_custom_campaigns`).
- Frontend: Next.js 15 + Ant Design 5 (`apps/web`), Custom Campaign Customer Table (`/dashboard/nyc/campaigns/[slug]`), Customer Detail Drawer (`AllocationHistoryTab`), Global Allocation History (`/dashboard/customers/history`).
- Shared: `@mos-lab/shared` types & API SDK (`apps/web/lib/api-client.ts`).

## Milestones

| #   | Name                                     | Scope                                                                                                                                                | Dependencies | Status |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | Exploration & Codebase Audit             | Investigate current campaign allocation flow, allocation service, drawer logs, history table, and ID mappings                                        | None         | DONE   |
| 2   | Backend Unification & API Updates        | Update AllocationService, campaign customer allocation route, campaign expiry worker/route, ensure legacyUserId and crm_assignment_histories logging | M1           | DONE   |
| 3   | Frontend Unification & UI Components     | Update Custom Campaign Table rowKeys, batch allocation invocation, customer detail drawer allocation history tab, status columns                     | M2           | DONE   |
| 4   | Expiration & Monorepo Build Verification | Implement campaign end/archive assignment cleanup + log EXPIRED action, verify pnpm build across all packages                                        | M3           | DONE   |

## Interface Contracts

- `AllocationService.createBatch({ bookerId, customerIds, campaignId, sourceType, sourceFilterSummary })`: Accepts true `legacyUserIds` (number[]). Creates `crm_allocation_batches` (with `campaignId`), `crm_allocation_batch_items`, logs `crm_assignment_histories` with `actionType = 'ASSIGN'`, and triggers 24h Booker notification.
- Customer Detail Drawer Allocation History Tab: Displays `crm_assignment_histories` records filtered by `legacyUserId` / `customerId`, showing campaign name summaries, assigner, target booker, status, and action timestamps.
- Campaign Customer Table `rowKey`: `record.legacyUserId || record.customerId || record.id`. Selection array uses true `legacyUserId`.
