# Original User Request

## 2026-07-31T15:48:52Z

Implement complete unification of batch allocation (crm_allocation_batches, crm_allocation_batch_items) and allocation history tracking (crm_assignment_histories) for Custom Campaign customers in mos-lab.

Working directory: /Users/dannydo/projects/mos-lab/.agents/orchestrator

Refer to the user requirements in `/Users/dannydo/projects/mos-lab/.agents/ORIGINAL_REQUEST.md` (under section '## Follow-up — 2026-07-31T15:48:52Z') for full details:

1. R1. Unified Customer ID Identification (legacyUserId): Ensure all campaign customer allocation operations use true legacyUserId (e.g. 982962666) instead of internal join table record IDs (crm_campaign_customers.id). Table rowKey and selection keys in custom campaign pages must evaluate to record.legacyUserId || record.customerId || record.id.
2. R2. Complete Batch Allocation & 24h Booker Acceptance Workflow: When Admin selects campaign customers and clicks "Phân bổ Booker", system must call AllocationService.createBatch with:
   - bookerId: Target Booker ID
   - customerIds: Array of true legacyUserIds
   - campaignId: Custom Campaign ID
   - sourceType: 'MANUAL'
   - sourceFilterSummary: Chiến dịch [Tên] ([X] KH)
     This generates:
   1. crm_allocation_batches with campaignId set
   2. crm_allocation_batch_items for each customer
   3. crm_assignment_histories entries linked by legacyUserId with actionType = 'ASSIGN'
   4. Pending 24-hour notification for the target Booker to Accept/Decline.
3. R3. Full Traceability in Allocation History & Customer Detail Drawer:
   - On Booker accept, update crm_customer_assignments and log actionType = 'ACCEPT' in crm_assignment_histories.
   - All campaign allocation actions, transfers, accepts, declines, and expirations must be 100% visible in:
     - Customer Detail Drawer -> Lịch sử Phân bổ (Allocation History tab)
     - Global Allocation History log tables (/dashboard/customers/history or drawer logs)
     - Campaign Customer Table ("Đã phân bổ" status column)
4. R4. Campaign Expiration & Assignment Clean-up:
   - When a campaign is ended or archived, active campaign assignments should log an EXPIRED action in crm_assignment_histories and return unbooked customers back to the main NYC pool.
5. Compile and test with pnpm build across all monorepo packages.
