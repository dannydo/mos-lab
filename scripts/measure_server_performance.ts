import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import os from 'os';
import v8 from 'v8';

const crm = new CrmPrismaClient();
const legacy = new LegacyPrismaClient();

async function run() {
  console.log('=== SERVER & DATABASE PERFORMANCE BENCHMARK (OPTIMIZED) ===\n');

  // 1. System Info
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const nodeVersion = process.version;
  const memoryUsage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();

  console.log('--- System Resources ---');
  console.log(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`CPU: ${cpus[0]?.model} (${cpus.length} Cores)`);
  console.log(`Node.js Version: ${nodeVersion}`);
  console.log(`Total Memory: ${(totalMem / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`Used Memory: ${(usedMem / (1024 ** 3)).toFixed(2)} GB (${(usedMem / totalMem * 100).toFixed(1)}%)`);
  console.log(`System Load Average (1m, 5m, 15m): ${loadAvg.map(l => l.toFixed(2)).join(', ')}`);
  console.log(`Node Process Memory:`);
  console.log(`  RSS: ${(memoryUsage.rss / (1024 ** 2)).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memoryUsage.heapTotal / (1024 ** 2)).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memoryUsage.heapUsed / (1024 ** 2)).toFixed(2)} MB`);
  console.log(`  External: ${(memoryUsage.external / (1024 ** 2)).toFixed(2)} MB`);
  console.log(`Heap Limit: ${(heapStats.heap_size_limit / (1024 ** 2)).toFixed(2)} MB`);
  console.log('');

  // 2. Database Benchmarks (June 2026 range)
  console.log('--- Database KPI Query Profiling ---');
  const startRange = new Date('2026-06-01T00:00:00.000Z');
  const endRange = new Date('2026-06-30T23:59:59.999Z');

  // Step 2.1: Fetch CRM Staff
  let t0 = performance.now();
  const staffList = await crm.crmStaff.findMany({
    where: { role: 'telesales', isActive: true }
  });
  let t1 = performance.now();
  const crmStaffTime = t1 - t0;
  console.log(`1. Fetch CRM Staff: ${crmStaffTime.toFixed(2)} ms (Returned ${staffList.length} rows)`);

  const staffNames = staffList.map(s => s.displayName);

  // Step 2.2: Profile mapping
  t0 = performance.now();
  const profiles = await legacy.$queryRawUnsafe<any[]>(`
    SELECT up.user_id as userId, up.full_name as fullName
    FROM \`staff_profile\` sp
    JOIN \`user_profile\` up ON sp.user_id = up.user_id
    WHERE up.provider = 'Staff' AND up.is_disabled = 0
      AND up.full_name IN (${staffNames.map(() => '?').join(',')})
  `, ...staffNames);
  t1 = performance.now();
  const legacyProfileTime = t1 - t0;
  console.log(`2. Map Legacy Profiles ($queryRawUnsafe): ${legacyProfileTime.toFixed(2)} ms (Returned ${profiles.length} profiles)`);

  const activeLegacyUserIds = profiles.map(p => Number(p.userId));

  if (activeLegacyUserIds.length > 0) {
    // Step 2.3: Fetch Orders
    t0 = performance.now();
    const allOrders = await legacy.order.findMany({
      where: {
        created_staff_id: { in: activeLegacyUserIds },
        booking_date_start: { gte: startRange, lte: endRange },
        order_state: { not: 'Cancelled' }
      },
      select: {
        id: true,
        created_staff_id: true,
        order_state: true,
        total_price: true,
        user_id: true,
        booking_date_start: true,
        date_created: true
      }
    });
    t1 = performance.now();
    const ordersFetchTime = t1 - t0;
    console.log(`3. Fetch Orders (findMany): ${ordersFetchTime.toFixed(2)} ms (Returned ${allOrders.length} orders)`);

    const completedOrders = allOrders.filter(o => o.order_state === 'Completed');
    const completedOrderIds = completedOrders.map(o => o.id);

    // Step 2.4: Fetch Payments/Tips
    t0 = performance.now();
    let paymentCount = 0;
    if (completedOrderIds.length > 0) {
      const orderPayments = await legacy.$queryRawUnsafe<any[]>(`
        SELECT order_id as orderId, tip_amount as tipAmount
        FROM \`order_payment\`
        WHERE order_id IN (${completedOrderIds.join(',')})
      `);
      paymentCount = orderPayments.length;
    }
    t1 = performance.now();
    const paymentsFetchTime = t1 - t0;
    console.log(`4. Fetch Order Payments ($queryRawUnsafe): ${paymentsFetchTime.toFixed(2)} ms (Returned ${paymentCount} records)`);

    // Step 2.5: Fetch Services
    t0 = performance.now();
    let servicesCount = 0;
    if (completedOrderIds.length > 0) {
      const orderServices = await legacy.order_service.findMany({
        where: { order_id: { in: completedOrderIds } }
      });
      servicesCount = orderServices.length;
    }
    t1 = performance.now();
    const servicesFetchTime = t1 - t0;
    console.log(`5. Fetch Order Services (findMany): ${servicesFetchTime.toFixed(2)} ms (Returned ${servicesCount} records)`);

    // Step 2.6: Fetch User Balances
    t0 = performance.now();
    const userIds = Array.from(new Set(allOrders.map(o => o.user_id).filter(id => id !== null))) as number[];
    const userBalances = userIds.length > 0 ? await legacy.user_service_balance.findMany({
      where: { user_id: { in: userIds } }
    }) : [];
    t1 = performance.now();
    const balanceFetchTime = t1 - t0;
    console.log(`6. Fetch User Balances (findMany): ${balanceFetchTime.toFixed(2)} ms (Returned ${userBalances.length} records)`);

    // Step 2.7: Fetch Balance Transactions
    t0 = performance.now();
    const balanceIds = userBalances.map(b => b.id);
    let txnCount = 0;
    if (balanceIds.length > 0) {
      const userBalanceTransactions = await legacy.$queryRawUnsafe<any[]>(`
        SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
               usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
               usbt.retain_count, usbt.used_staff_id, usbt.order_id,
               o.booking_date_start as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      `);
      txnCount = userBalanceTransactions.length;
    }
    t1 = performance.now();
    const txnsFetchTime = t1 - t0;
    console.log(`7. Fetch Balance Transactions ($queryRawUnsafe - OPT): ${txnsFetchTime.toFixed(2)} ms (Returned ${txnCount} records)`);
  }

  // Measure overall execution of KPI routine
  console.log('\nMeasuring total calculation routine execution time (Optimized)...');
  t0 = performance.now();
  const staffNameToLegacyIdMap = new Map<string, number>();
  const legacyIdToStaffMap = new Map<number, any>();
  profiles.forEach((p: any) => {
    const staff = staffList.find(s => s.displayName.toLowerCase().trim() === p.fullName.toLowerCase().trim());
    if (staff) {
      staffNameToLegacyIdMap.set(p.fullName.toLowerCase().trim(), Number(p.userId));
      legacyIdToStaffMap.set(Number(p.userId), staff);
    }
  });

  const allOrdersEndToEnd = await legacy.order.findMany({
    where: {
      created_staff_id: { in: activeLegacyUserIds },
      booking_date_start: { gte: startRange, lte: endRange },
      order_state: { not: 'Cancelled' }
    }
  });
  const completedIdsEndToEnd = allOrdersEndToEnd.filter(o => o.order_state === 'Completed').map(o => o.id);
  if (completedIdsEndToEnd.length > 0) {
    await legacy.$queryRawUnsafe<any[]>(`
      SELECT order_id as orderId, tip_amount as tipAmount FROM \`order_payment\`
      WHERE order_id IN (${completedIdsEndToEnd.join(',')})
    `);
    await legacy.order_service.findMany({
      where: { order_id: { in: completedIdsEndToEnd } }
    });
  }
  const uidsEndToEnd = Array.from(new Set(allOrdersEndToEnd.map(o => o.user_id).filter(id => id !== null))) as number[];
  if (uidsEndToEnd.length > 0) {
    const userBalsEnd = await legacy.user_service_balance.findMany({
      where: { user_id: { in: uidsEndToEnd } }
    });
    const balIdsEnd = userBalsEnd.map(b => b.id);
    if (balIdsEnd.length > 0) {
      await legacy.$queryRawUnsafe<any[]>(`
        SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
               usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
               usbt.retain_count, usbt.used_staff_id, usbt.order_id,
               o.booking_date_start as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        WHERE usbt.user_service_balance_id IN (${balIdsEnd.join(',')})
      `);
    }
  }

  t1 = performance.now();
  console.log(`Total End-to-End calculation logic: ${(t1 - t0).toFixed(2)} ms`);

  await crm.$disconnect();
  await legacy.$disconnect();
}

run();
