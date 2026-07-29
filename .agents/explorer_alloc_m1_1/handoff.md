# Handoff Report: Backend Customer Allocation Audit (M1)

## 1. Observation

### 1.1 Database Models (`apps/api/prisma/crm.prisma`)

The CRM database handles customer allocations using two primary Prisma models in `crm.prisma`:

- **`CrmCustomerAssignment`** (`crm_customer_assignments` table, lines 106–119):
  - `legacyUserId`: `Int` (`@unique`, `@map("legacy_user_id")`) — Links to `user.id` in legacy database (`management`).
  - `staffId`: `Int?` (`@map("staff_id")`) — References assigned Booker (`CrmStaff`).
  - `assignedAt`: `DateTime` (`@default(now())`, `@map("assigned_at")`) — Allocation timestamp.
  - `assignedBy`: `Int?` (`@map("assigned_by")`) — Admin/Manager staff ID who made the assignment.
  - `expiresAt`: `DateTime?` (`@map("expires_at")`) — Expiration date for temporary data allocation (`durationDays`).
  - `assignedDurationDays`: `Int?` (`@map("assigned_duration_days")`) — Duration in days.
  - `isRetained`: `Boolean` (`@default(false)`, `@map("is_retained")`) — Flag protecting data from auto-expiration cron cleanup.
  - `retainedAt`: `DateTime?` (`@map("retained_at")`) — Timestamp when customer was retained by Booker.

- **`CrmAssignmentHistory`** (`crm_assignment_history` table, lines 136–160):
  - `batchId`: `String` (`@map("batch_id")`) — Unique batch identifier (e.g. `alloc_1714500000_a1b2c` or `rev_1714500000_x9y8z`).
  - `legacyUserId`: `Int` (`@map("legacy_user_id")`) — Target customer ID.
  - `prevStaffId`: `Int?` (`@map("prev_staff_id")`) — Staff ID before action.
  - `newStaffId`: `Int?` (`@map("new_staff_id")`) — Staff ID after action (`null` if revoked to pool).
  - `assignedBy`: `Int` (`@map("assigned_by")`) — Staff ID of person executing action.
  - `assignedAt`: `DateTime` — Action timestamp.
  - `expiresAt`: `DateTime?` — Configured expiration date if assigned.
  - `sourceType`: `String` (`@default("MANUAL")`) — Action source (`MANUAL`, `AUTO`, `RANDOM_SELECT`, etc.).
  - `sourceFilterSummary`: `String?` — Human-readable text summary of applied selection filters.
  - `sourceFilterJson`: `String?` — JSON dump of filter parameters.
  - `actionType`: `String` (`@default("ASSIGN")`) — Action type: `ASSIGN`, `REVOKE`, `TRANSFER`, `EXPIRE`, `RANDOM_SELECT`.
  - `reason`: `String?` — Explanation / justification note for audit.
  - `isUndone`: `Boolean` (`@default(false)`) — Rollback status flag.
  - `undoneAt`: `DateTime?` — Timestamp when batch was undone.

- **`CrmConfig`** (`crm_config` table, lines 97–104):
  - `key`: `BOOKER_RETAIN_QUOTA_CONFIG` — Stores JSON mapping of Booker ID to max data retention quota limit (default: 50 data items per booker).

---

### 1.2 Active API Routes (`apps/api/src/modules/customers/routes.ts`)

The active customer allocation routes are registered in `apps/api/src/server.ts` under prefix `/api` via `customerRoutes()` in `routes.ts`:

1. **`GET /api/customers`** (lines 24–575):
   - **Telesales Restriction**: Non-admin users are forced to filter by `effectiveAssignedStaffId = 'me'` (where `staffId = current_user_id`), unless querying special buckets (`NEW_LOCA`, `COMBO_LIVE`) or requesting `assignedStaffId === 'ALL' | 'all' | 'unassigned'`.
   - **Assignment Filter Options**:
     - `assignedStaffId = 'unassigned'`: Fetches legacy user IDs present in `crmCustomerAssignment` and excludes them (`NOT IN`).
     - `assignedStaffId = <staffId>` / `'me'`: Fetches legacy user IDs assigned to `<staffId>` in `crmCustomerAssignment` and includes them (`IN`).
     - `retainedOnly = 'true'`: Filters legacy user IDs where `isRetained = true`.
   - **Enriched Assignment Data Output**: Each returned customer object includes:
     - `assignedStaff`: `{ id, displayName, username, assignedAt }` or `null`.
     - `assignedAt`: Expiration/assignment date.
     - `lastAllocation`: `{ assignedAt, staffName }` from latest `CrmAssignmentHistory`.

2. **`POST /api/customers/assign`** (lines 3854–3950):
   - **Access**: `admin` role required (`403 Forbidden` if non-admin).
   - **Body**: `{ customerIds: number[], staffId: number, durationDays?: number, sourceType?: string, sourceFilterSummary?: string, sourceFilterJson?: string, parentBatchId?: string }`.
   - **Transaction Logic**:
     - Generates batch ID `alloc_<timestamp>_<rand>`.
     - Calculates `expiresAt = NOW() + durationDays * 86400s`.
     - Upserts into `crmCustomerAssignment` (updates `staffId`, `assignedBy`, `assignedAt`, `expiresAt`, resets `isRetained = false`).
     - Creates audit records in `crmAssignmentHistory` (`actionType: 'ASSIGN'`).

3. **`POST /api/customers/revoke/preview`** (lines 3954–4008):
   - **Access**: `admin` role required.
   - **Body**: `{ customerIds: number[] }`.
   - **Logic**: Previews breakdown of selected customer list (total count, unassigned count, assigned count, and staff-by-staff breakdown).

4. **`POST /api/customers/revoke`** (lines 4013–4179):
   - **Access**: `admin` role required.
   - **Body**: `{ customerIds: number[], targetStaffId?: number | null, reason: string, batchId?: string, parentBatchId?: string }`.
   - **Validation**: Requires non-empty string `reason`.
   - **Transaction Logic**:
     - Filters to customer IDs currently assigned to a staff member.
     - If `targetStaffId` is provided: Transfers active assignments to new Booker (`actionType: 'TRANSFER'`).
     - If `targetStaffId` is null/omitted: Removes or resets `staffId: null` in `crmCustomerAssignment` and logs `actionType: 'REVOKE'`.

5. **`POST /api/customers/unassign`** (lines 4182–4229):
   - **Access**: `admin` role required.
   - **Body**: `{ customerIds: number[], reason?: string }`.
   - **Logic**: Deletes records from `crmCustomerAssignment` and logs `actionType: 'REVOKE'`.

6. **`POST /api/customers/retain`** (lines 4233–4301):
   - **Access**: Authenticated Booker or Admin.
   - **Body**: `{ customerIds: number[], isRetained?: boolean }`.
   - **Quota Validation**: Reads `BOOKER_RETAIN_QUOTA_CONFIG` from `crmConfig` (default limit: 50). If current retained count + new selections > quota, throws `400 Bad Request`.
   - **Logic**: Updates `isRetained = true/false` and `retainedAt`.

7. **`GET /api/customers/booker-retain-quota`** (lines 4304–4344):
   - **Logic**: Returns `{ retainedCount, quotaLimit, remainingQuota }` for current Booker.

8. **`GET /api/customers/assignment-history`** (lines 4348–4512):
   - **Access**: `admin` role required.
   - **Query Parameters**: `page`, `limit`, `search`, `actionType` (`ASSIGN`, `REVOKE`, `TRANSFER`, `RANDOM`, `UNDONE`).
   - **Logic**: Aggregates distinct batches from `crmAssignmentHistory`, returns paginated batch cards with assigner name, target staff, customer count, undo status, and filter summaries.

9. **`GET /api/customers/assignment-history/:batchId/details`** (lines 4515–4592):
   - **Access**: `admin` role required.
   - **Logic**: Fetches line-by-line customer assignment history for a given `batchId`, joining customer `fullName` and `phone` from legacy database (`user` + `user_profile` + `user_contact`).

10. **`POST /api/customers/assignment-history/undo`** (lines 4596–4698):
    - **Access**: `admin` role required.
    - **Body**: `{ batchId: string, reason: string, force?: boolean }`.
    - **Transaction Logic**: Reverts assignments in batch back to `prevStaffId` (or deletes assignment if `prevStaffId` was `null`), sets `isUndone: true`, `undoneAt: NOW()`, `reason: cleanReason`.

11. **`GET /api/customers/:id/assignment-timeline`** (lines 4702–4750):
    - **Access**: Authenticated user.
    - **Logic**: Retrieves complete chronological audit trail of allocation, revocation, transfer, and undo events for a specific customer.

---

### 1.3 Background Expiration Cron Service (`apps/api/src/modules/customers/services/allocation-cron.service.ts`)

- **`processExpiredAssignments(fastify)`** (lines 8–54):
  - Queries `crmCustomerAssignment` where `expiresAt < NOW()` AND `isRetained == false`.
  - Deletes expired assignment records in a Prisma transaction.
  - Inserts history log rows into `crmAssignmentHistory` with `batchId: auto_expire_<timestamp>`, `actionType: 'EXPIRE'`, `reason: 'Hết hạn phân bổ tự động (Auto Expired)'`.
- **`registerAllocationCron(fastify)`** (lines 56–71):
  - Starts background interval running `processExpiredAssignments` every **30 minutes** (`30 * 60 * 1000` ms), plus an initial run 10 seconds after server startup.

---

### 1.4 Standalone Inactive File Notice (`apps/api/src/modules/customers/routes/assignment.routes.ts`)

- `apps/api/src/modules/customers/routes/assignment.routes.ts` contains an older / initial implementation of assignment routes (`registerAssignmentRoutes`).
- **Inspection Finding**: `registerAssignmentRoutes` is **NOT imported or registered** anywhere in `apps/api/src/server.ts` or `routes.ts`. The actual active route implementation resides inside `apps/api/src/modules/customers/routes.ts`.

---

## 2. Logic Chain

1. **Assignment Data Structure**: Customer assignments exist in the CRM MySQL database in `crm_customer_assignments`, linking `legacy_user_id` (customer) to `staff_id` (Booker). History is recorded immutably in `crm_assignment_history`.
2. **Access Control & Filtering**:
   - When a Booker queries `/api/customers`, line 102 of `routes.ts` enforces `effectiveAssignedStaffId = 'me'`, ensuring Bookers only see customers assigned to them in `crm_customer_assignments` (unless browsing special campaign buckets like `NEW_LOCA`).
   - Admins can filter by any staff member (`assignedStaffId=<id>`), view unassigned pool (`assignedStaffId=unassigned`), or view all data (`assignedStaffId=all`).
3. **Data Retention & Expiration**:
   - Assignments can be temporary (`expiresAt`).
   - Background cron (`allocation-cron.service.ts`) runs every 30 minutes to clean up expired data.
   - If a Booker calls `POST /api/customers/retain`, `isRetained` is set to `true` (subject to quota validation in `crm_config`), preventing the 30-minute cron from revoking the customer.
4. **Admin Management & Batch History**:
   - Admins use `POST /api/customers/assign`, `POST /api/customers/revoke`, `POST /api/customers/unassign`, and `POST /api/customers/assignment-history/undo`.
   - Every operation generates a `batchId` and records detailed audit histories with mandatory user-provided reasons and filter parameters.

---

## 3. Caveats

- **Read-Only Audit**: No code changes were executed during this investigation.
- **Legacy Database Interop**: Customers themselves reside in legacy database `management` (`user`, `user_profile`, `user_contact`), while assignments, retention, quota, and history reside in CRM database `mos_lab` (`crm_customer_assignments`, `crm_assignment_history`, `crm_config`).
- **Inactive File**: `routes/assignment.routes.ts` is an orphan/inactive file. Any future modifications to allocation logic must target `apps/api/src/modules/customers/routes.ts` and `services/allocation-cron.service.ts`.

---

## 4. Conclusion

The customer allocation system in `mos-lab` is fully implemented in Fastify backend:

- **Assignment Data Model**: `CrmCustomerAssignment` (active assignments) + `CrmAssignmentHistory` (audit trail) + `CrmConfig` (retention quotas).
- **Admin Capabilities**: Batch assignment, revocation with preview & mandatory reason, batch transfer, batch undo (rollback), and full batch audit trail.
- **Booker Capabilities**: View assigned customers (`effectiveAssignedStaffId = 'me'`), check retention quota (`/api/customers/booker-retain-quota`), and toggle retention (`POST /api/customers/retain`).
- **Automated Lifecycle**: 30-minute cron job automatically revokes un-retained expired data to the pool.

---

## 5. Verification Method

To verify the Findings and API endpoints independently:

1. **Verify Prisma Schema**:

   ```bash
   grep -n "model CrmCustomerAssignment" apps/api/prisma/crm.prisma
   grep -n "model CrmAssignmentHistory" apps/api/prisma/crm.prisma
   ```

2. **Verify Active Route Handlers in `routes.ts`**:

   ```bash
   grep -n "POST /api/customers/assign" apps/api/src/modules/customers/routes.ts
   grep -n "POST /api/customers/revoke" apps/api/src/modules/customers/routes.ts
   grep -n "POST /api/customers/retain" apps/api/src/modules/customers/routes.ts
   grep -n "POST /api/customers/assignment-history/undo" apps/api/src/modules/customers/routes.ts
   ```

3. **Verify Cron Registration**:
   ```bash
   grep -n "registerAllocationCron" apps/api/src/modules/customers/routes.ts
   ```
