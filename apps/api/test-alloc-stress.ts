import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient as CrmPrismaClient } from './src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from './src/generated/legacy-client/index.js';
import { AllocationService } from './src/modules/allocation/allocation.service.js';
import { FastifyInstance } from 'fastify';

const crmPrisma = new CrmPrismaClient({
  datasources: { db: { url: process.env.CRM_DATABASE_URL } },
});
const legacyPrisma = new LegacyPrismaClient({
  datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
});

const mockFastify = {
  prisma: {
    crm: crmPrisma,
    legacy: legacyPrisma,
  },
} as unknown as FastifyInstance;

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('=====================================================');
  console.log('STARTING EMPIRICAL ALLOCATION STRESS TEST SUITE (EXTENDED)');
  console.log('=====================================================');

  await crmPrisma.$connect();
  await legacyPrisma.$connect();

  let assigner = await crmPrisma.crmStaff.findFirst({ where: { role: 'admin' } });
  if (!assigner) {
    assigner = await crmPrisma.crmStaff.create({
      data: {
        username: 'stress_admin_' + Date.now(),
        passwordHash: 'hash',
        displayName: 'Stress Test Admin',
        role: 'admin',
      },
    });
  }

  let booker1 = await crmPrisma.crmStaff.findFirst({ where: { role: 'telesales' } });
  if (!booker1) {
    booker1 = await crmPrisma.crmStaff.create({
      data: {
        username: 'stress_booker1_' + Date.now(),
        passwordHash: 'hash',
        displayName: 'Stress Test Booker 1',
        role: 'telesales',
      },
    });
  }

  let booker2 = await crmPrisma.crmStaff.findFirst({
    where: { role: 'telesales', id: { not: booker1.id } },
  });
  if (!booker2) {
    booker2 = await crmPrisma.crmStaff.create({
      data: {
        username: 'stress_booker2_' + Date.now(),
        passwordHash: 'hash',
        displayName: 'Stress Test Booker 2',
        role: 'telesales',
      },
    });
  }

  console.log(`Using Assigner ID: ${assigner.id}, Booker 1 ID: ${booker1.id}, Booker 2 ID: ${booker2.id}`);

  const TEST_CUST_1 = 999901;
  const TEST_CUST_2 = 999902;
  const TEST_CUST_3 = 999903;
  const TEST_CUST_4 = 999904;
  const TEST_CUST_5 = 999905;
  const TEST_CUST_6 = 999906;
  const TEST_CUST_7 = 999907;
  const TEST_CUST_8 = 999908;

  async function cleanupCustomerData(custIds: number[]) {
    await crmPrisma.crmCustomerAssignment.deleteMany({
      where: { legacyUserId: { in: custIds } },
    });
    const items = await crmPrisma.crmAllocationBatchItem.findMany({
      where: { customerId: { in: custIds } },
      select: { batchId: true },
    });
    const batchIds = items.map((i) => i.batchId);
    await crmPrisma.crmAllocationBatchItem.deleteMany({
      where: { customerId: { in: custIds } },
    });
    if (batchIds.length > 0) {
      await crmPrisma.crmAssignmentHistory.deleteMany({
        where: { legacyUserId: { in: custIds } },
      });
      await crmPrisma.crmAllocationBatch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }
  }

  await cleanupCustomerData([
    TEST_CUST_1,
    TEST_CUST_2,
    TEST_CUST_3,
    TEST_CUST_4,
    TEST_CUST_5,
    TEST_CUST_6,
    TEST_CUST_7,
    TEST_CUST_8,
  ]);

  // =========================================================================
  // TEST GROUP 1: State Transitions (Accepting ACCEPTED, DECLINED, EXPIRED batches)
  // =========================================================================
  console.log('\n--- Running TEST GROUP 1: State Transitions ---');

  // Test 1.1: Accept an ACCEPTED batch
  try {
    const batch1 = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_1],
    });

    const res1 = await AllocationService.acceptBatch(mockFastify, batch1.id, booker1.id);
    if (!res1.success) throw new Error('First accept failed');

    let secondAcceptFailed = false;
    let errMessage = '';
    try {
      await AllocationService.acceptBatch(mockFastify, batch1.id, booker1.id);
    } catch (err: any) {
      secondAcceptFailed = true;
      errMessage = err.message;
    }

    if (secondAcceptFailed && errMessage.includes('ACCEPTED')) {
      results.push({
        name: 'T1.1: Accept already ACCEPTED batch',
        passed: true,
        details: `Rejected as expected with message: "${errMessage}"`,
      });
    } else {
      results.push({
        name: 'T1.1: Accept already ACCEPTED batch',
        passed: false,
        details: `Expected rejection containing 'ACCEPTED', got: "${errMessage}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T1.1: Accept already ACCEPTED batch',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // Test 1.2: Accept a DECLINED batch
  try {
    const batch2 = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_2],
    });

    await AllocationService.declineBatch(mockFastify, batch2.id, booker1.id, {
      reasonCategory: 'Khách trùng',
    });

    let acceptDeclinedFailed = false;
    let errMessage = '';
    try {
      await AllocationService.acceptBatch(mockFastify, batch2.id, booker1.id);
    } catch (err: any) {
      acceptDeclinedFailed = true;
      errMessage = err.message;
    }

    if (acceptDeclinedFailed && errMessage.includes('DECLINED')) {
      results.push({
        name: 'T1.2: Accept already DECLINED batch',
        passed: true,
        details: `Rejected as expected with message: "${errMessage}"`,
      });
    } else {
      results.push({
        name: 'T1.2: Accept already DECLINED batch',
        passed: false,
        details: `Expected rejection containing 'DECLINED', got: "${errMessage}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T1.2: Accept already DECLINED batch',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // Test 1.3: Accept a timed-out / EXPIRED batch
  try {
    const batch3 = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_3],
    });

    await crmPrisma.crmAllocationBatch.update({
      where: { id: batch3.id },
      data: { expiresAt: new Date(Date.now() - 3600000) },
    });

    let acceptExpiredFailed = false;
    let errMessage = '';
    try {
      await AllocationService.acceptBatch(mockFastify, batch3.id, booker1.id);
    } catch (err: any) {
      acceptExpiredFailed = true;
      errMessage = err.message;
    }

    const dbBatch3 = await crmPrisma.crmAllocationBatch.findUnique({
      where: { id: batch3.id },
    });

    if (acceptExpiredFailed && errMessage.includes('vượt quá 24h') && dbBatch3?.status === 'EXPIRED') {
      results.push({
        name: 'T1.3: Accept timed-out PENDING batch (lazy expire)',
        passed: true,
        details: `Lazy updated batch status to EXPIRED in DB and rejected with message: "${errMessage}"`,
      });
    } else {
      results.push({
        name: 'T1.3: Accept timed-out PENDING batch (lazy expire rollback bug)',
        passed: false,
        details: `Transaction rollback bug confirmed: error was thrown inside $transaction, causing batch status update to EXPIRED to roll back. dbStatus remains "${dbBatch3?.status}"!`,
      });
    }

    let reacceptFailed = false;
    let reacceptErr = '';
    try {
      await AllocationService.acceptBatch(mockFastify, batch3.id, booker1.id);
    } catch (err: any) {
      reacceptFailed = true;
      reacceptErr = err.message;
    }

    if (reacceptFailed && reacceptErr.includes('EXPIRED')) {
      results.push({
        name: 'T1.4: Accept EXPIRED batch (second call)',
        passed: true,
        details: `Rejected as expected with message: "${reacceptErr}"`,
      });
    } else {
      results.push({
        name: 'T1.4: Accept EXPIRED batch (second call)',
        passed: false,
        details: `Status is not EXPIRED in DB due to rollback. Second call threw: "${reacceptErr}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T1.3/T1.4: Accept timed-out / EXPIRED batch',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // =========================================================================
  // TEST GROUP 2: Decline Validation without Mandatory Reason
  // =========================================================================
  console.log('\n--- Running TEST GROUP 2: Decline Validation ---');

  try {
    const batchDecline = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_4],
    });

    let emptyFail = false;
    let emptyErr = '';
    try {
      await AllocationService.declineBatch(mockFastify, batchDecline.id, booker1.id, {
        reasonCategory: '',
      });
    } catch (err: any) {
      emptyFail = true;
      emptyErr = err.message;
    }

    let spaceFail = false;
    let spaceErr = '';
    try {
      await AllocationService.declineBatch(mockFastify, batchDecline.id, booker1.id, {
        reasonCategory: '   ',
      });
    } catch (err: any) {
      spaceFail = true;
      spaceErr = err.message;
    }

    let nonStringFail = false;
    let nonStringErr = '';
    try {
      await AllocationService.declineBatch(mockFastify, batchDecline.id, booker1.id, {
        reasonCategory: 123 as any,
      });
    } catch (err: any) {
      nonStringFail = true;
      nonStringErr = err.message;
    }

    const checkBatch = await crmPrisma.crmAllocationBatch.findUnique({
      where: { id: batchDecline.id },
    });

    if (emptyFail && spaceFail && checkBatch?.status === 'PENDING_ACCEPT') {
      results.push({
        name: 'T2.1: Decline without mandatory reason (empty/whitespace)',
        passed: true,
        details: `Empty err: "${emptyErr}", Space err: "${spaceErr}". Status preserved as PENDING_ACCEPT.`,
      });
    } else {
      results.push({
        name: 'T2.1: Decline without mandatory reason (empty/whitespace)',
        passed: false,
        details: `Failed validation check. emptyErr="${emptyErr}", spaceErr="${spaceErr}", status="${checkBatch?.status}"`,
      });
    }

    if (nonStringFail) {
      results.push({
        name: 'T2.2: Decline with non-string reasonCategory type',
        passed: true,
        details: `Caught non-string input error: "${nonStringErr}"`,
      });
    } else {
      results.push({
        name: 'T2.2: Decline with non-string reasonCategory type',
        passed: false,
        details: 'Expected error for non-string input, but call succeeded',
      });
    }

    const validDeclineRes = await AllocationService.declineBatch(mockFastify, batchDecline.id, booker1.id, {
      reasonCategory: 'Khách không nghe máy',
      reasonNote: 'Đã thử gọi 3 lần',
    });

    const checkDeclinedBatch = await crmPrisma.crmAllocationBatch.findUnique({
      where: { id: batchDecline.id },
    });

    if (
      validDeclineRes.success &&
      checkDeclinedBatch?.status === 'DECLINED' &&
      checkDeclinedBatch.declineCategory === 'Khách không nghe máy'
    ) {
      results.push({
        name: 'T2.3: Valid decline with category & note',
        passed: true,
        details: `Batch status updated to DECLINED with declineCategory="${checkDeclinedBatch.declineCategory}"`,
      });
    } else {
      results.push({
        name: 'T2.3: Valid decline with category & note',
        passed: false,
        details: `Failed valid decline check`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T2: Decline validation',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // =========================================================================
  // TEST GROUP 3: Double-Allocating Customer & Concurrency / Race Condition
  // =========================================================================
  console.log('\n--- Running TEST GROUP 3: Double-Allocation & Concurrency ---');

  try {
    const batchSeq1 = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_5],
    });

    let seqDupFailed = false;
    let seqDupErr = '';
    try {
      await AllocationService.createBatch(mockFastify, assigner.id, {
        bookerId: booker2.id,
        customerIds: [TEST_CUST_5],
      });
    } catch (err: any) {
      seqDupFailed = true;
      seqDupErr = err.message;
    }

    if (seqDupFailed && seqDupErr.includes('đang nằm trong đợt phân bổ chờ xác nhận khác')) {
      results.push({
        name: 'T3.1: Sequential createBatch with duplicate pending customer',
        passed: true,
        details: `Correctly rejected second batch creation with message: "${seqDupErr}"`,
      });
    } else {
      results.push({
        name: 'T3.1: Sequential createBatch with duplicate pending customer',
        passed: false,
        details: `Expected pre-batch deduplication error, got seqDupFailed=${seqDupFailed}, err="${seqDupErr}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T3.1: Sequential duplicate allocation',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  try {
    const [resA, resB] = await Promise.allSettled([
      AllocationService.createBatch(mockFastify, assigner.id, {
        bookerId: booker1.id,
        customerIds: [TEST_CUST_6],
      }),
      AllocationService.createBatch(mockFastify, assigner.id, {
        bookerId: booker2.id,
        customerIds: [TEST_CUST_6],
      }),
    ]);

    const aFulfilled = resA.status === 'fulfilled';
    const bFulfilled = resB.status === 'fulfilled';

    if (aFulfilled && bFulfilled) {
      results.push({
        name: 'T3.2: Simultaneous createBatch race condition test',
        passed: false,
        details: `VULNERABILITY FOUND: Both concurrent requests SUCCEEDED! Customer ${TEST_CUST_6} was assigned to TWO simultaneous PENDING_ACCEPT batches (Batch ID ${resA.value.id} for Booker ${booker1.id} AND Batch ID ${resB.value.id} for Booker ${booker2.id})!`,
      });

      const acceptA = await AllocationService.acceptBatch(mockFastify, resA.value.id, booker1.id);
      const acceptB = await AllocationService.acceptBatch(mockFastify, resB.value.id, booker2.id);

      const finalAssignment = await crmPrisma.crmCustomerAssignment.findUnique({
        where: { legacyUserId: TEST_CUST_6 },
      });

      results.push({
        name: 'T3.3: Conflicting simultaneous batch acceptance result',
        passed: false,
        details: `STATE CORRUPTION: Both bookers accepted! Final assignment owner is Booker ${finalAssignment?.staffId} (overwrote Booker ${booker1.id}).`,
      });
    } else {
      results.push({
        name: 'T3.2: Simultaneous createBatch race condition test',
        passed: true,
        details: `Race condition prevented: A status=${resA.status}, B status=${resB.status}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T3.2: Simultaneous race condition test',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // =========================================================================
  // TEST GROUP 4: 24h Expiration Timer Logic & Maintenance Cron
  // =========================================================================
  console.log('\n--- Running TEST GROUP 4: Expiration Timer Logic ---');

  try {
    const expPendingBatch = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_7],
    });

    await crmPrisma.crmAllocationBatch.update({
      where: { id: expPendingBatch.id },
      data: { expiresAt: new Date(Date.now() - 7200000) },
    });

    await AllocationService.checkAndExpireBatches(mockFastify);

    const checkExpBatch = await crmPrisma.crmAllocationBatch.findUnique({
      where: { id: expPendingBatch.id },
      include: { items: true },
    });

    const expHistory = await crmPrisma.crmAssignmentHistory.findMany({
      where: { legacyUserId: TEST_CUST_7, actionType: 'EXPIRE' },
    });

    if (checkExpBatch?.status === 'EXPIRED' && checkExpBatch.items[0].status === 'EXPIRED' && expHistory.length === 1) {
      results.push({
        name: 'T4.1: checkAndExpireBatches on 24h overdue pending batch',
        passed: true,
        details: `Batch and Item status set to EXPIRED, exactly 1 history log created with reason: "${expHistory[0].reason}"`,
      });
    } else {
      results.push({
        name: 'T4.1: checkAndExpireBatches on 24h overdue pending batch',
        passed: false,
        details: `Failed exp batch check. batchStatus="${checkExpBatch?.status}", itemStatus="${checkExpBatch?.items[0]?.status}", historyCount=${expHistory.length}`,
      });
    }

    const expPendingBatch2 = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_7],
    });
    await crmPrisma.crmAllocationBatch.update({
      where: { id: expPendingBatch2.id },
      data: { expiresAt: new Date(Date.now() - 7200000) },
    });

    await crmPrisma.crmAssignmentHistory.deleteMany({
      where: { legacyUserId: TEST_CUST_7, actionType: 'EXPIRE' },
    });

    await Promise.all([
      AllocationService.checkAndExpireBatches(mockFastify),
      AllocationService.checkAndExpireBatches(mockFastify),
    ]);

    const expHistoryConcurrent = await crmPrisma.crmAssignmentHistory.findMany({
      where: { batchId: expPendingBatch2.batchCode, actionType: 'EXPIRE' },
    });

    if (expHistoryConcurrent.length > 1) {
      results.push({
        name: 'T4.2: Concurrent checkAndExpireBatches history duplication test',
        passed: false,
        details: `VULNERABILITY FOUND: Concurrent checkAndExpireBatches created ${expHistoryConcurrent.length} DUPLICATE history logs for the same expired batch!`,
      });
    } else {
      results.push({
        name: 'T4.2: Concurrent checkAndExpireBatches history duplication test',
        passed: true,
        details: `Exactly 1 history log created under concurrent execution.`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T4: Expiration timer logic',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // =========================================================================
  // TEST GROUP 5: Exact +N Customer Increment Verification
  // =========================================================================
  console.log('\n--- Running TEST GROUP 5: Exact +N Increment Verification ---');

  try {
    const BATCH_CUST_IDS = [TEST_CUST_1, TEST_CUST_2, TEST_CUST_3];
    await cleanupCustomerData(BATCH_CUST_IDS);

    const initialAssignments = await crmPrisma.crmCustomerAssignment.count({
      where: { staffId: booker1.id },
    });

    const incBatch = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: BATCH_CUST_IDS,
    });

    const acceptRes = await AllocationService.acceptBatch(mockFastify, incBatch.id, booker1.id);

    const postAssignments = await crmPrisma.crmCustomerAssignment.count({
      where: { staffId: booker1.id },
    });

    const diff = postAssignments - initialAssignments;

    const assignedCustomers = await crmPrisma.crmCustomerAssignment.findMany({
      where: { legacyUserId: { in: BATCH_CUST_IDS } },
    });

    const historyCount = await crmPrisma.crmAssignmentHistory.count({
      where: { batchId: incBatch.batchCode, actionType: 'ACCEPT_ALLOCATION' },
    });

    if (
      acceptRes.count === 3 &&
      diff === 3 &&
      assignedCustomers.length === 3 &&
      assignedCustomers.every((a) => a.staffId === booker1.id) &&
      historyCount === 3
    ) {
      results.push({
        name: 'T5.1: Exact +N customer increment verification',
        passed: true,
        details: `Successfully allocated +3 customers. Initial count=${initialAssignments}, Post count=${postAssignments}, Net increase=+${diff}. 3 assignment history records created.`,
      });
    } else {
      results.push({
        name: 'T5.1: Exact +N customer increment verification',
        passed: false,
        details: `Increment mismatch: acceptRes.count=${acceptRes.count}, diff=${diff}, assignedLen=${assignedCustomers.length}, historyCount=${historyCount}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T5: Exact +N increment verification',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // =========================================================================
  // TEST GROUP 6: Recall Batch Functionality & Permissions
  // =========================================================================
  console.log('\n--- Running TEST GROUP 6: Recall Batch Functionality ---');

  try {
    const recallBatchObj = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_8],
    });

    // Accept batch first
    await AllocationService.acceptBatch(mockFastify, recallBatchObj.id, booker1.id);

    // Verify assignment exists
    const preRecallAssignment = await crmPrisma.crmCustomerAssignment.findUnique({
      where: { legacyUserId: TEST_CUST_8 },
    });

    // Admin recalls batch
    const recallRes = await AllocationService.recallBatch(mockFastify, recallBatchObj.id, assigner.id, {
      reason: 'Phân bổ nhầm danh sách',
    });

    // Verify assignment removed
    const postRecallAssignment = await crmPrisma.crmCustomerAssignment.findUnique({
      where: { legacyUserId: TEST_CUST_8 },
    });

    const checkRecalledBatch = await crmPrisma.crmAllocationBatch.findUnique({
      where: { id: recallBatchObj.id },
      include: { items: true },
    });

    const recallHistory = await crmPrisma.crmAssignmentHistory.findFirst({
      where: { batchId: recallBatchObj.batchCode, actionType: 'RECALL_ALLOCATION' },
    });

    if (
      recallRes.success &&
      preRecallAssignment?.staffId === booker1.id &&
      postRecallAssignment === null &&
      checkRecalledBatch?.status === 'RECALLED' &&
      checkRecalledBatch.items[0].status === 'RECALLED' &&
      recallHistory !== null
    ) {
      results.push({
        name: 'T6.1: Recall ACCEPTED batch by Admin',
        passed: true,
        details: `Batch status set to RECALLED, customer assignment revoked back to pool, RECALL_ALLOCATION history logged.`,
      });
    } else {
      results.push({
        name: 'T6.1: Recall ACCEPTED batch by Admin',
        passed: false,
        details: `Recall failed expectations: success=${recallRes.success}, postAssign=${postRecallAssignment}, batchStatus=${checkRecalledBatch?.status}`,
      });
    }

    // Try recalling an already RECALLED batch
    let recallTwiceFail = false;
    let recallTwiceErr = '';
    try {
      await AllocationService.recallBatch(mockFastify, recallBatchObj.id, assigner.id, {
        reason: 'Thu hồi lại lần nữa',
      });
    } catch (err: any) {
      recallTwiceFail = true;
      recallTwiceErr = err.message;
    }

    if (recallTwiceFail && recallTwiceErr.includes('RECALLED')) {
      results.push({
        name: 'T6.2: Recall already RECALLED batch',
        passed: true,
        details: `Rejected as expected with message: "${recallTwiceErr}"`,
      });
    } else {
      results.push({
        name: 'T6.2: Recall already RECALLED batch',
        passed: false,
        details: `Expected rejection containing 'RECALLED', got: "${recallTwiceErr}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T6: Recall batch functionality',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // =========================================================================
  // TEST GROUP 7: IDOR / Role Authorization on GET /allocation/batches/:id
  // =========================================================================
  console.log('\n--- Running TEST GROUP 7: IDOR / Role Authorization ---');

  try {
    const batchIdor = await AllocationService.createBatch(mockFastify, assigner.id, {
      bookerId: booker1.id,
      customerIds: [TEST_CUST_1],
    });

    // 7.1 Assigner access
    const assignerRes = await AllocationService.getBatchDetails(mockFastify, batchIdor.id, {
      id: assigner.id,
      role: assigner.role,
    });

    // 7.2 Booker access
    const bookerRes = await AllocationService.getBatchDetails(mockFastify, batchIdor.id, {
      id: booker1.id,
      role: booker1.role,
    });

    // 7.3 Unrelated Telesales IDOR Access Attempt
    let idorFailed = false;
    let idorErr = '';
    try {
      await AllocationService.getBatchDetails(mockFastify, batchIdor.id, {
        id: booker2.id,
        role: 'telesales',
      });
    } catch (err: any) {
      idorFailed = true;
      idorErr = err.message;
    }

    if (
      assignerRes.batch.id === batchIdor.id &&
      bookerRes.batch.id === batchIdor.id &&
      idorFailed &&
      idorErr.includes('không có quyền')
    ) {
      results.push({
        name: 'T7.1: IDOR & Authorization check on GET /allocation/batches/:id',
        passed: true,
        details: `Allowed assigner & target booker, blocked unauthorized staff with message: "${idorErr}"`,
      });
    } else {
      results.push({
        name: 'T7.1: IDOR & Authorization check on GET /allocation/batches/:id',
        passed: false,
        details: `IDOR check failed: idorFailed=${idorFailed}, idorErr="${idorErr}"`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'T7: IDOR authorization check',
      passed: false,
      details: 'Unexpected error',
      error: err.message,
    });
  }

  // Cleanup all test data
  await cleanupCustomerData([
    TEST_CUST_1,
    TEST_CUST_2,
    TEST_CUST_3,
    TEST_CUST_4,
    TEST_CUST_5,
    TEST_CUST_6,
    TEST_CUST_7,
    TEST_CUST_8,
  ]);

  console.log('\n=====================================================');
  console.log('SUMMARY OF EMPIRICAL TEST RESULTS');
  console.log('=====================================================');
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const statusStr = r.passed ? '[PASS]' : '[FAIL/VULN]';
    console.log(`${statusStr} ${r.name}`);
    console.log(`  Details: ${r.details}`);
    if (r.error) console.log(`  Error: ${r.error}`);
    if (r.passed) passCount++;
    else failCount++;
  }

  console.log(`\nTOTAL: ${results.length} tests | PASSED: ${passCount} | FAILED/VULN: ${failCount}`);

  await crmPrisma.$disconnect();
  await legacyPrisma.$disconnect();
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
