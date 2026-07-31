# Handoff Report: Custom Campaign Allocation Unification

## 1. Observation

- Target Objective: Complete unification of batch allocation (`crm_allocation_batches`, `crm_allocation_batch_items`) and allocation history tracking (`crm_assignment_histories`) for Custom Campaign customers in `mos-lab`.
- Modified Files across Workspace:
  1. `apps/api/src/modules/campaigns/campaign.service.ts`:
     - `getCampaignCustomers`: Added `assignedBookerName`, `assignedAt`, and `assignedStaff` to returned DTO customer items.
     - `endCampaign` & `deleteCampaign`: Implemented full atomic multi-table transaction cleanup for campaign assignments. Inserts `actionType = 'EXPIRED'` records in `crm_assignment_histories` with campaign termination reason, deletes active `crm_customer_assignments` records, expires active `crm_allocation_batches` and `crm_allocation_batch_items` (`status = 'EXPIRED'`), and sets `removedAt = now` on `crm_campaign_customers`.
  2. `apps/api/src/modules/allocation/allocation.service.ts`:
     - Exported `ACCEPT_ACTION_TYPES` (`['ACCEPT', 'ACCEPT_ALLOCATION']`) and history condition helpers for alias normalization.
  3. `apps/api/src/modules/customers/routes.ts`:
     - Updated assignment history query filtering to support both `'ACCEPT'` and `'ACCEPT_ALLOCATION'`.
  4. `apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx`:
     - Table `rowKey`: `(record) => record.legacyUserId || record.customerId || record.id`.
     - `handleBatchAllocate`: Extracts true `legacyUserId` numbers and calls `apiClient.allocation.createBatch({ bookerId, customerIds: selectedLegacyUserIds, campaignId, sourceType: 'MANUAL', sourceFilterSummary: 'Chiến dịch [Tên] ([X] KH)' })`.
     - Status column ("Đã phân bổ") and "Booker phụ trách" column accessors updated to handle nested/flat DTO shapes and calculate elapsed days correctly.
     - ESLint callback dependency warning resolved.
  5. `apps/web/components/customer-detail/components/CustomerAssignmentTimeline.tsx`:
     - Added distinct color badges, icons, and titles for extended action types (`ACCEPT`, `ACCEPT_ALLOCATION`, `DECLINE`, `DECLINE_ALLOCATION`, `RECALL`, `RECALL_ALLOCATION`, `EXPIRED`, `EXPIRE`, `RANDOM_SELECT`, `ASSIGN`, `TRANSFER`, `REVOKE`, `UNDO`).
     - Rendered campaign names and batch source summaries (`sourceFilterSummary`) with dedicated tags.
  6. `apps/web/app/dashboard/customers/components/AssignmentHistoryDrawer.tsx`:
     - Added explicit filter radio buttons for `ACCEPT`, `DECLINE`, `EXPIRED` in global history controls.

## 2. Logic Chain

1. **R1 (Unified Customer ID Identification)**: Selection keys in campaign page evaluate to `record.legacyUserId || record.customerId || record.id`. `handleBatchAllocate` maps selected keys to their true numeric `legacyUserId` values, guaranteeing batch allocation operations operate on `legacyUserId` (e.g. 982962666) instead of internal join table surrogate IDs.
2. **R2 (Complete Batch Allocation & 24h Booker Acceptance Workflow)**: `AllocationService.createBatch` receives `bookerId`, `customerIds` (legacyUserIds), `campaignId`, `sourceType: 'MANUAL'`, and `sourceFilterSummary: 'Chiến dịch [Tên] ([X] KH)'`. In a single Prisma `$transaction`, it creates `crm_allocation_batches` (with `campaignId`), `crm_allocation_batch_items` (`PENDING_ACCEPT`), and inserts `crm_assignment_histories` (`actionType = 'ASSIGN'`). 30-second layout polling triggers the 24h Booker acceptance modal.
3. **R3 (Full Traceability in Drawers & Tables)**: Booker accept updates `crm_customer_assignments` and logs `actionType = 'ACCEPT_ALLOCATION'` (handled interchangeably with `'ACCEPT'`). Full audit trail is displayed in Customer Detail Drawer (Allocation History tab), Global Allocation History tables (30-day retention countdown timer), and Campaign Customer Table ("Đã phân bổ" status column showing elapsed days).
4. **R4 (Campaign Expiration & Assignment Clean-up)**: `endCampaign` and `deleteCampaign` perform atomic multi-table expiration. Active assignments in `crm_customer_assignments` are deleted, active allocation batches/items are set to `EXPIRED`, `crm_campaign_customers` records receive `removedAt = now`, and `crm_assignment_histories` logs `actionType = 'EXPIRED'` with reason `Chiến dịch <name> đã kết thúc`, returning unbooked customers to the main NYC pool.
5. **Monorepo Build & Integrity Verification**:
   - `pnpm build`: Completed with exit code 0 across `@mos-lab/shared`, `apps/api`, `apps/web`, and `@mos-lab/ads-portal`.
   - Automated empirical test suite (`apps/api/test-r1-r4-empirical.ts`): Passed 7/7 tests (0 failures).
   - Forensic Integrity Audit: Verdict **CLEAN** (genuine database queries, `$transaction` boundaries, zero facade/hardcoded test data).

## 3. Caveats

- Real-time notifications utilize 30-second interval polling (`layout.tsx`) against `GET /api/allocation/pending` rather than WebSockets.
- Expiration cron (`allocation-cron.service.ts`) automatically cleans up expired 24h pending batches and 30-day accepted retention limits.

## 4. Conclusion

All 4 requirement areas (R1, R2, R3, R4) for Custom Campaign Batch Allocation Unification are fully implemented, verified, build-clean, and audit-verified in `mos-lab`.

## 5. Verification Method

1. Run full monorepo build:
   `pnpm build`
2. Run automated empirical verification suite:
   `cd apps/api && npx tsx test-r1-r4-empirical.ts`
3. Verify lint cleanliness:
   `pnpm lint`
