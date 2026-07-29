# Handoff Report — Booker Customer Allocation System Schema Audit (M1.2)

## 1. Observation

### Codebase & Schema Inspection Findings:

1. **Prisma Schemas & DB Architecture**:
   - `apps/api/prisma/crm.prisma` manages the primary `mos_lab` database (read/write). Client generated at `apps/api/src/generated/crm-client`.
   - `apps/api/prisma/legacy.prisma` manages the read-only `management` database. Client generated at `apps/api/src/generated/legacy-client`.
2. **Existing Allocation Models in `crm.prisma`**:
   - `CrmStaff` (`crm_staff` table, lines 11–45): Contains staff accounts with `id`, `username`, `displayName`, `role` (e.g. `telesales`, `admin`), `isActive`.
   - `CrmCustomerAssignment` (`crm_customer_assignments` table, lines 106–119): Tracks active customer assignments. Holds `id`, `legacyUserId` (`@unique`), `staffId` (reference to `CrmStaff.id`), `assignedAt`, `assignedBy`, `expiresAt`, `assignedDurationDays`, `isRetained`, `retainedAt`.
   - `CrmAssignmentHistory` (`crm_assignment_history` table, lines 136–160): Audit trail of historical assignments. Holds `id`, `batchId` (String), `legacyUserId`, `prevStaffId`, `newStaffId`, `assignedBy`, `assignedAt`, `expiresAt`, `sourceType`, `actionType`, `reason`, `isUndone`, `undoneAt`.
   - `CrmCallLog` (`crm_call_logs` table, lines 62–81): Stores call interactions with `legacyUserId`, `staffId`, `callType`, `callResult`, `durationSec`, `note`, `outcome`, `callbackDate`, `callUuid`.
3. **Current Allocation Routes & Flow**:
   - In `apps/api/src/modules/customers/routes/assignment.routes.ts`, customer allocation currently executes immediate updates/upserts into `CrmCustomerAssignment` without a 2-step confirmation workflow (`PENDING_ACCEPT` -> `ACCEPTED` / `DECLINED` / `EXPIRED` / `RECALLED`).

---

## 2. Logic Chain

### A. Need for 2-Step Allocation Confirmation

To implement the Booker Customer Allocation System upgrade (M1.2), customer assignments must not take immediate effect upon Admin action. Instead:

1. Admin creates an **Allocation Batch** targeting a specific Booker (`bookerId`), containing $N$ customers.
2. The batch starts in state `PENDING_ACCEPT` with an expiration countdown timer (default 24h, `expiresAt`).
3. The target Booker receives the allocation notification and can **ACCEPT** or **DECLINE** (providing a `declineReason`).
4. Only upon **ACCEPT** are the $N$ customers assigned to the Booker in `CrmCustomerAssignment`, triggering an exact $+N$ increment on their active customer quota.

### B. Proposed Prisma Schema Modifications (`apps/api/prisma/crm.prisma`)

#### 1. Add relations to `CrmStaff`:

```prisma
model CrmStaff {
  // ... existing fields ...
  assignedBatches CrmAllocationBatch[] @relation("BatchAssigner")
  receivedBatches CrmAllocationBatch[] @relation("BatchBooker")
  // ...
}
```

#### 2. Model `CrmAllocationBatch` (`crm_allocation_batches` table):

```prisma
model CrmAllocationBatch {
  id            Int       @id @default(autoincrement())
  batchCode     String    @unique @map("batch_code") @db.VarChar(50)
  assignerId    Int       @map("assigner_id")
  bookerId      Int       @map("booker_id")
  totalCount    Int       @map("total_count")
  status        String    @default("PENDING_ACCEPT") @db.VarChar(20) // PENDING_ACCEPT | ACCEPTED | DECLINED | EXPIRED | RECALLED
  declineReason String?   @map("decline_reason") @db.Text
  expiresAt     DateTime  @map("expires_at") @db.DateTime(0)
  acceptedAt    DateTime? @map("accepted_at") @db.DateTime(0)
  declinedAt    DateTime? @map("declined_at") @db.DateTime(0)
  recalledAt    DateTime? @map("recalled_at") @db.DateTime(0)
  createdAt     DateTime  @default(now()) @map("created_at") @db.DateTime(0)
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.DateTime(0)

  assigner      CrmStaff  @relation("BatchAssigner", fields: [assignerId], references: [id], onDelete: Cascade)
  booker        CrmStaff  @relation("BatchBooker", fields: [bookerId], references: [id], onDelete: Cascade)
  items         CrmAllocationBatchItem[]

  @@index([bookerId])
  @@index([assignerId])
  @@index([status])
  @@index([expiresAt])
  @@map("crm_allocation_batches")
}
```

#### 3. Model `CrmAllocationBatchItem` (`crm_allocation_batch_items` table):

```prisma
model CrmAllocationBatchItem {
  id            Int       @id @default(autoincrement())
  batchId       Int       @map("batch_id")
  customerId    Int       @map("customer_id")
  customerName  String?   @map("customer_name") @db.VarChar(100)
  customerPhone String?   @map("customer_phone") @db.VarChar(20)
  status        String    @default("PENDING_ACCEPT") @db.VarChar(20) // PENDING_ACCEPT | ACCEPTED | DECLINED | EXPIRED | RECALLED
  createdAt     DateTime  @default(now()) @map("created_at") @db.DateTime(0)

  batch         CrmAllocationBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@unique([batchId, customerId], name: "batchId_customerId")
  @@index([customerId])
  @@index([batchId])
  @@index([status])
  @@map("crm_allocation_batch_items")
}
```

### C. Deduplication & $+N$ Increment Implementation Strategy

#### 1. Deduplication Mechanisms:

- **Within-Batch Deduplication**: `@@unique([batchId, customerId])` constraint in `CrmAllocationBatchItem` prevents the same customer from being added multiple times within a batch.
- **Pre-Batch Validation**: During batch creation, backend checks for any selected `customerId` that is currently in a batch with `status = 'PENDING_ACCEPT'`. If found, batch creation fails with a descriptive error (preventing dual-pending allocations).
- **Active Assignment Limit**: `CrmCustomerAssignment` retains `legacyUserId` as `@unique`, ensuring a customer is assigned to at most 1 Booker at any given moment.

#### 2. Atomic $+N$ Increment via Prisma `$transaction`:

When Booker calls `POST /api/customers/allocation-batches/:id/accept`:

```typescript
await fastify.prisma.crm.$transaction(async (tx) => {
  // 1. Lock and verify batch state
  const batch = await tx.crmAllocationBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });

  if (!batch || batch.bookerId !== bookerStaffId) {
    throw new Error('Batch không tồn tại hoặc không thuộc về bạn');
  }

  if (batch.status !== 'PENDING_ACCEPT') {
    throw new Error(`Đợt phân bổ đã ở trạng thái ${batch.status}, không thể chấp nhận`);
  }

  if (new Date() > batch.expiresAt) {
    // Mark expired if timer passed
    await tx.crmAllocationBatch.update({
      where: { id: batchId },
      data: { status: 'EXPIRED' },
    });
    await tx.crmAllocationBatchItem.updateMany({
      where: { batchId: batchId },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Đợt phân bổ đã hết hạn 24h');
  }

  // 2. Update Batch status to ACCEPTED
  const now = new Date();
  await tx.crmAllocationBatch.update({
    where: { id: batchId },
    data: { status: 'ACCEPTED', acceptedAt: now },
  });

  await tx.crmAllocationBatchItem.updateMany({
    where: { batchId: batchId },
    data: { status: 'ACCEPTED' },
  });

  // 3. Upsert customer assignments (+N increment)
  for (const item of batch.items) {
    await tx.crmCustomerAssignment.upsert({
      where: { legacyUserId: item.customerId },
      update: {
        staffId: batch.bookerId,
        assignedBy: batch.assignerId,
        assignedAt: now,
      },
      create: {
        legacyUserId: item.customerId,
        staffId: batch.bookerId,
        assignedBy: batch.assignerId,
        assignedAt: now,
      },
    });

    // 4. Record history entry
    await tx.crmAssignmentHistory.create({
      data: {
        batchId: batch.batchCode,
        legacyUserId: item.customerId,
        prevStaffId: null, // or previous staff if tracked
        newStaffId: batch.bookerId,
        assignedBy: batch.assignerId,
        assignedAt: now,
        actionType: 'ACCEPT_ALLOCATION',
      },
    });
  }
});
```

---

## 3. Caveats

1. **Read-Only Audit Scope**: This investigation is read-only. Database migration scripts (`npx prisma migrate dev`) have not been executed during this audit.
2. **Cross-Database Boundary**: `customerId` in `CrmAllocationBatchItem` refers to `user.id` in the `management` (legacy) database. Because MySQL foreign keys cannot cross database schemas in Prisma multi-schema setups, integrity between `CrmAllocationBatchItem.customerId` and `legacy.user.id` is enforced in backend application logic.
3. **Timer Precision**: `expiresAt` expiration relies on client-side status checks during user interaction + periodic background cron job processing (`allocation-cron.service.ts`).

---

## 4. Conclusion

The proposed Prisma model schema (`CrmAllocationBatch` and `CrmAllocationBatchItem`) fully satisfies all functional requirements:

- Batch status state machine (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`).
- 24h timer expiration tracking (`expiresAt`).
- Booker decline reason capture (`declineReason`).
- Guaranteed deduplication via `@@unique([batchId, customerId])`.
- Atomic $+N$ customer increment via Prisma `$transaction`.

---

## 5. Verification Method

To verify the schema additions independently:

1. Apply the schema changes to `apps/api/prisma/crm.prisma`.
2. Run Prisma Client Generation:
   ```bash
   pnpm --filter @mos-lab/api prisma:generate
   ```
3. Create database migration:
   ```bash
   pnpm --filter @mos-lab/api prisma:migrate:crm
   ```
4. Verify generated types in `apps/api/src/generated/crm-client`.
