# Forensic Integrity Audit Report: Booker Customer Allocation System Upgrade

**Work Product**: Booker Customer Allocation System Upgrade (R1, R2, R3, R4)  
**Profile**: General Project  
**Verdict**: CLEAN

---

## 1. Observation

### Codebase Inspection & Line References

1. **Shared Types (`packages/shared/src/types/allocation.ts`)**:
   - Lines 1: `export type AllocationBatchStatus = 'PENDING_ACCEPT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'RECALLED';`
   - Lines 16-36: `export interface CustomerAllocationBatch` declaring `id`, `batchCode`, `assignerId`, `bookerId`, `totalCount`, `status`, `declineReason`, `declineCategory`, `declineNote`, `expiresAt`, `acceptedAt`, `declinedAt`, `recalledAt`, `retentionExpiresAt`, `createdAt`, `updatedAt`, and `items`.
   - Lines 99-105: `PRESET_DECLINE_REASONS` constant array with 5 preset decline reason options.

2. **Database Schema (`apps/api/prisma/crm.prisma`)**:
   - Lines 343-370: Model `CrmAllocationBatch` mapping to `crm_allocation_batches` table with unique constraint `@unique @map("batch_code")`, indexes on `[bookerId]`, `[assignerId]`, `[status]`, `[expiresAt]`.
   - Lines 372-391: Model `CrmAllocationBatchItem` mapping to `crm_allocation_batch_items` table with unique compound index `@@unique([batchId, customerId], name: "batchId_customerId")`.

3. **Backend Service & Routing (`apps/api/src/modules/allocation/`)**:
   - `allocation.service.ts`:
     - Lines 20-123 (`checkAndExpireBatches`): Automated background maintenance logic using atomic `$transaction` blocks to update overdue 24h pending batches (`expiresAt <= now`) to `EXPIRED` status and log history, and 30-day retention expired batches (`retentionExpiresAt <= now`) to `EXPIRED` status while removing un-retained customer assignments.
     - Lines 129-225 (`createBatch`): Uses `expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)` and atomic `$transaction` with raw `SELECT customer_id FROM crm_allocation_batch_items ... FOR UPDATE` row lock query to filter out existing `PENDING_ACCEPT` customers before creating new batch.
     - Lines 316-433 (`acceptBatch`): Booker verification, expiration check, status transition to `ACCEPTED`, calculation of `retentionExpiresAt` (30-day countdown), exact $+N$ customer assignment creation/upsert in `crmCustomerAssignment`, and logging in `crmAssignmentHistory` (`ACCEPT_ALLOCATION`).
     - Lines 440-520 (`declineBatch`): Mandatory decline reason validation, status transition to `DECLINED`, recording of `declineCategory` & `declineNote`, customer retention prevention (customers remain in pool), and logging in `crmAssignmentHistory` (`DECLINE_ALLOCATION`).
     - Lines 526-601 (`recallBatch`): Admin/Manager batch recall functionality for `PENDING_ACCEPT` or `ACCEPTED` batches. Updates batch status to `RECALLED`, revokes customer assignments back to general pool if previously accepted, and logs `RECALL_ALLOCATION` history.
     - Lines 606-657 (`get30DayHistory`): Role-aware (Telesales vs Admin/Manager) 30-day history query with status filtering and pagination.
     - Lines 662-810 (`getAuditStats`): Aggregates total batches/customers, acceptance/decline/expired/recalled rates, per-booker performance metrics (with average response time in minutes), and decline reason distributions.
   - `routes.ts`: Lines 12-194 defining REST endpoints:
     - `POST /allocation/batch` (`requireRole(['admin', 'manager', 'ls', 'oc'])`)
     - `GET /allocation/pending` (`requireAuth`)
     - `GET /allocation/batches/:id` (`requireAuth` with IDOR check)
     - `POST /allocation/batches/:id/accept` (`requireAuth`)
     - `POST /allocation/batches/:id/decline` (`requireAuth`)
     - `POST /allocation/batches/:id/recall` (`requireRole(['admin', 'manager', 'ls'])`)
     - `POST /allocation/check-expired` (`requireAuth`)
     - `GET /allocation/history` (`requireAuth`)
     - `GET /allocation/audit-stats` (`requireRole(['admin', 'manager', 'ls', 'oc'])`)

4. **Frontend SDK & Web Components (`apps/web/`)**:
   - `lib/api-client.ts`: Lines 1034-1071 defining `apiClient.allocation` namespace covering all 9 backend endpoints.
   - `components/allocation/PendingAllocationModal.tsx`: Real-time 24h countdown timer ticker formatted with `tabular-nums` (`style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}`). Previews customers in table, triggers `acceptBatch` for exact $+N$ customer addition or opens `DeclineReasonModal`.
   - `components/allocation/DeclineReasonModal.tsx`: Select dropdown populated from `PRESET_DECLINE_REASONS` with mandatory validation preventing empty category submissions.
   - `components/allocation/AllocationHistoryScreen.tsx`: Displays 30-day history table with 30-day retention countdown badges (`⏱️ Còn Xd Yh lưu giữ` with `tabular-nums`), status tags, filter controls, search bar, and batch detail preview modal.
   - `components/allocation/AllocationAuditDashboard.tsx`: Executive dashboard featuring overview KPI cards, acceptance/decline/expired rate progress bars, per-Booker performance breakdown, decline reason distribution chart, date range picker, and Recall Batch modal.

5. **Empirical Stress Test Execution (`npx tsx test-alloc-stress.ts`)**:

   ```
   =====================================================
   SUMMARY OF EMPIRICAL TEST RESULTS
   =====================================================
   [PASS] T1.1: Accept already ACCEPTED batch
   [PASS] T1.2: Accept already DECLINED batch
   [PASS] T1.3: Accept timed-out PENDING batch (lazy expire)
   [PASS] T1.4: Accept EXPIRED batch (second call)
   [PASS] T2.1: Decline without mandatory reason (empty/whitespace)
   [PASS] T2.2: Decline with non-string reasonCategory type
   [PASS] T2.3: Valid decline with category & note
   [PASS] T3.1: Sequential createBatch with duplicate pending customer
   [PASS] T3.2: Simultaneous createBatch race condition test
   [PASS] T4.1: checkAndExpireBatches on 24h overdue pending batch
   [PASS] T4.2: Concurrent checkAndExpireBatches history duplication test
   [PASS] T5.1: Exact +N customer increment verification
   [PASS] T6.1: Recall ACCEPTED batch by Admin
   [PASS] T6.2: Recall already RECALLED batch
   [PASS] T7.1: IDOR & Authorization check on GET /allocation/batches/:id

   TOTAL: 15 tests | PASSED: 15 | FAILED/VULN: 0
   ```

6. **Monorepo Build Execution (`pnpm run build`)**:

   ```
   Tasks: 4 successful, 4 total
   Cached: 3 cached, 4 total
   Time: 20.75s
   Packages built: @mos-lab/shared, @mos-lab/ads-portal, @mos-lab/api, @mos-lab/web
   ```

7. **Prohibited Patterns Check**:
   - No hardcoded test results or mock overrides found in production logic or tests.
   - No facade implementations found; all endpoints perform real database persistence via Prisma `$transaction`.
   - No pre-populated artifacts found.

---

## 2. Logic Chain

1. **Verification of Requirement 1 (R1: Batch Pending Accept Flow)**:
   - Observation 3 shows `createBatch` assigns status `PENDING_ACCEPT` and sets `expiresAt` to 24 hours into the future.
   - Observation 3 shows `acceptBatch` transitions status to `ACCEPTED` and assigns customers, while `declineBatch` requires a valid reason category before transitioning status to `DECLINED` and keeping customers unassigned in the pool.
   - Observation 3 & 5 show `checkAndExpireBatches` and lazy expiration logic automatically setting overdue batches (`expiresAt <= now`) to `EXPIRED` status and creating `EXPIRE` history logs.
   - Empirical tests T1.1, T1.2, T1.3, T1.4, T2.1, T2.2, T2.3, T4.1, T4.2 passed with 100% success rate.
   - _Reasoning_: The 2-step verification, 24h pending accept window, decline reason requirement, and automated expiration mechanisms are fully implemented and verified empirically.

2. **Verification of Requirement 2 (R2: Strict Deduplication & Database Transaction)**:
   - Observation 2 & 3 show `@unique([batchId, customerId])` constraint in `crm.prisma` and `$transaction` block in `AllocationService.createBatch` utilizing `SELECT customer_id FROM crm_allocation_batch_items ... FOR UPDATE` row locks to prevent duplicate pending allocations.
   - Observation 3 shows `acceptBatch` executing inside a Prisma `$transaction` block to update batch/item statuses and upsert `crmCustomerAssignment` records, ensuring an exact $+N$ customer increase.
   - Empirical tests T3.1, T3.2, and T5.1 confirm sequential/simultaneous deduplication and exact $+3$ customer increment without state corruption or race condition vulnerabilities.
   - _Reasoning_: Customer allocation data operations are strictly atomic, deduplicated, and transactional.

3. **Verification of Requirement 3 (R3: 30-Day History & Countdown Timer)**:
   - Observation 1, 3 & 4 show `retentionExpiresAt` set to 30 days upon batch acceptance, `get30DayHistory` returning historical records with pagination/search/role-filtering, and `AllocationHistoryScreen.tsx` displaying 30-day countdown badges using `tabular-nums` (`style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}`).
   - Empirical test T7.1 confirms proper IDOR and role authorization controls on batch history details.
   - _Reasoning_: 30-day history tracking, role scoping, and tabular-num countdown badges meet all business rules.

4. **Verification of Requirement 4 (R4: Allocation Audit Dashboard for Admin/Manager)**:
   - Observation 3 & 4 show `getAuditStats` aggregating overview stats (total batches/customers, acceptance/decline/expired rates), per-Booker metrics (with response times), and decline reason distributions.
   - Observation 3 & 4 show `recallBatch` allowing Admin/Manager to recall `PENDING_ACCEPT` or `ACCEPTED` batches, revoking customer assignments back to the general pool and recording `RECALL_ALLOCATION` history logs.
   - Empirical tests T6.1 and T6.2 verify batch recall functionality and status immutability once recalled.
   - _Reasoning_: Executive audit oversight and emergency recall capabilities are complete and fully operational.

5. **Verification of Monorepo Build**:
   - Observation 6 shows `pnpm run build` completing cleanly across all 4 monorepo packages (`@mos-lab/shared`, `@mos-lab/api`, `@mos-lab/web`, `@mos-lab/ads-portal`).
   - _Reasoning_: Code changes compile without TypeScript or bundler errors.

---

## 3. Caveats

No caveats. All features, transaction logic, security checks, empirical stress tests, and monorepo build checks were executed and verified independently.

---

## 4. Conclusion

The Booker Customer Allocation System Upgrade in `mos-lab` implements all required features (R1, R2, R3, R4) with full structural, transactional, and empirical integrity. No hardcoded test results, facade implementations, mock overrides, or unvalidated state bypasses exist. Atomic Prisma `$transaction` blocks correctly manage state updates, deduplication locks, and exact customer count increments. Monorepo build passes cleanly.

**Final Verdict: CLEAN**

---

## 5. Verification Method

To independently re-verify the forensic findings and empirical test suite:

1. **Run Empirical Allocation Stress Test Suite**:

   ```bash
   cd /Users/dannydo/projects/mos-lab/apps/api
   npx tsx test-alloc-stress.ts
   ```

   _Expected Output_: `TOTAL: 15 tests | PASSED: 15 | FAILED/VULN: 0`

2. **Run Monorepo Build Verification**:

   ```bash
   cd /Users/dannydo/projects/mos-lab
   pnpm run build
   ```

   _Expected Output_: `Tasks: 4 successful, 4 total`

3. **Inspect Implementation Files**:
   - `packages/shared/src/types/allocation.ts`
   - `apps/api/prisma/crm.prisma`
   - `apps/api/src/modules/allocation/allocation.service.ts`
   - `apps/api/src/modules/allocation/routes.ts`
   - `apps/web/lib/api-client.ts`
   - `apps/web/components/allocation/PendingAllocationModal.tsx`
   - `apps/web/components/allocation/DeclineReasonModal.tsx`
   - `apps/web/components/allocation/AllocationHistoryScreen.tsx`
   - `apps/web/components/allocation/AllocationAuditDashboard.tsx`
