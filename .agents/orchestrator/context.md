# Context: Campaign Allocation Unification

## Background

In `mos-lab`, custom campaigns under the NYC pool allow Admin to create sub-campaigns, assign customers to campaigns, and distribute campaign customers to Bookers.
Currently, campaign customer management was partially operating using join table IDs (`crm_campaign_customers.id`) instead of the central `legacyUserId` (e.g. `982962666`), or missing complete integration with the global allocation batching (`crm_allocation_batches`, `crm_allocation_batch_items`) and allocation history tracking (`crm_assignment_histories`).

## Key Requirements (from ORIGINAL_REQUEST.md follow-up 2026-07-31T15:48:52Z):

1. **R1. Unified Customer ID Identification (`legacyUserId`)**: Ensure all campaign customer allocation operations use true `legacyUserId` instead of join table IDs (`crm_campaign_customers.id`). Table `rowKey` and selection keys must evaluate to `record.legacyUserId || record.customerId || record.id`.
2. **R2. Complete Batch Allocation & 24h Booker Acceptance Workflow**: Admin batch allocation must call `AllocationService.createBatch` with `bookerId`, `customerIds` (legacyUserIds), `campaignId`, `sourceType: 'MANUAL'`, `sourceFilterSummary: 'Chiến dịch [Tên] ([X] KH)'`. Generates `crm_allocation_batches`, `crm_allocation_batch_items`, `crm_assignment_histories` (`actionType = 'ASSIGN'`), and 24h pending notification.
3. **R3. Full Traceability**: Booker accept updates `crm_customer_assignments` and logs `ACCEPT` in `crm_assignment_histories`. All events must be visible in Customer Detail Drawer -> Lịch sử Phân bổ, Global Allocation History, and Campaign Customer Table ("Đã phân bổ" status).
4. **R4. Campaign Expiration & Clean-up**: Ending or archiving a campaign logs `EXPIRED` in `crm_assignment_histories` for active campaign assignments and returns unbooked customers back to main NYC pool.
5. **Build Verification**: `pnpm build` across all monorepo packages.

## Key Files to Examine/Modify:

- `apps/api/src/modules/allocation/allocation.service.ts`
- `apps/api/src/modules/campaigns/routes.ts`
- `apps/api/src/modules/campaigns/campaign.service.ts` (if any)
- `apps/api/src/modules/customers/routes.ts`
- `apps/api/prisma/crm.prisma` (schema reference)
- `packages/shared/src/types/campaign.ts` / `allocation.ts`
- `apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx`
- `apps/web/components/customers/CustomerDetailDrawer.tsx` (or AllocationHistoryTab component)
- `apps/web/lib/api-client.ts`
