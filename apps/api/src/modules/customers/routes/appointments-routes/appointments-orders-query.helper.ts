import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { parseRequestedStoreIds } from './appointments-scope.helper.js';
import {
  ActiveAppointmentsScope,
  AppointmentOrderRow,
  AppointmentPageQueryResult,
  LegacyQueryRows,
} from './appointments.types.js';

interface FetchAppointmentPageParams {
  fastify: FastifyInstance;
  cleanDateFrom: string;
  cleanDateTo: string;
  scope: ActiveAppointmentsScope;
  storeId?: string;
  filterType: string;
  limitNum: number;
  offsetNum: number;
}

function buildAppointmentsFilterClause(
  scope: ActiveAppointmentsScope,
  storeId: string | undefined,
  filterType: string
): { filterSql: string; params: SafeAny[] } {
  let filterSql = '';
  const params: SafeAny[] = [];

  if (scope.filterByStaff) {
    if (scope.staffLegacyId) {
      if (scope.staffRole === 'oc') {
        filterSql += ` AND o.assigned_staff_id = ?`;
      } else {
        filterSql += ` AND o.created_staff_id = ?`;
      }
      params.push(scope.staffLegacyId);
    } else {
      filterSql += ` AND 1=0`;
    }
  }

  if (scope.telesalesCustomerIdSql) {
    filterSql += ` AND o.user_id IN (${scope.telesalesCustomerIdSql})`;
  }

  const storeIds = parseRequestedStoreIds(storeId);
  if (storeIds.length === 1) {
    filterSql += ` AND o.client_store_id = ?`;
    params.push(storeIds[0]);
  } else if (storeIds.length > 1) {
    filterSql += ` AND o.client_store_id IN (${storeIds.join(',')})`;
  }

  if (filterType === 'completed') {
    filterSql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)`;
  } else if (filterType === 'missed') {
    filterSql +=
      ` AND (o.booking_date_start <= NOW() AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))` +
      scope.missedFilterCond;
  } else if (filterType === 'pending') {
    filterSql += ` AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
  }

  return { filterSql, params };
}

export async function fetchAppointmentPageData({
  fastify,
  cleanDateFrom,
  cleanDateTo,
  scope,
  storeId,
  filterType,
  limitNum,
  offsetNum,
}: FetchAppointmentPageParams): Promise<AppointmentPageQueryResult> {
  // 2. Candidate ID lookup using B-tree indexed fields (o.booking_date_start) to avoid full-table scans
  const t0 = performance.now();
  const candidateOrders = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(
    `
    SELECT o.id FROM \`order\` o
    WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
  `,
    cleanDateFrom,
    cleanDateTo
  );
  const t1 = performance.now();

  const candidateIds = candidateOrders.map((o) => Number(o.id)).filter((id) => id > 0);
  // A date without bookings must still return its CV working/OFF plan. The
  // schedule drawer uses dailyCapacities to plan tomorrow, independently of
  // whether a customer has booked yet.
  const candidateIdSql = candidateIds.length > 0 ? candidateIds.join(',') : 'NULL';

  // Batch query report_order using indexed order_id
  await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
    SELECT order_id as orderId, actual_booking_date_start as actualBookingDateStart
    FROM report_order
    WHERE order_id IN (${candidateIdSql})
  `);
  const t2 = performance.now();

  const { filterSql, params: sharedFilterParams } = buildAppointmentsFilterClause(scope, storeId, filterType);

  const countSql = `
    SELECT COUNT(*) as total
    FROM \`order\` o
    WHERE o.id IN (${candidateIdSql})${filterSql}
  `;
  const countResult = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(countSql, ...sharedFilterParams);
  const total = Number(countResult[0]?.total || 0);
  const t3 = performance.now();

  // 3. Query orders/bookings in range with pagination
  const mainSql = `
    SELECT 
      o.id,
      o.order_key as orderKey,
      o.promotion_id as promotionId,
      o.selected_promotion_id as selectedPromotionId,
      o.booking_date_start as bookingDateStart,
      DATE_FORMAT(o.booking_date_start, '%H:%i') as actualBookingTime,
      o.booking_date_end as bookingDateEnd,
      o.booking_note as bookingNote,
      o.booking_channels as bookingChannel,
      o.order_state as orderState,
      o.total_price as totalPrice,
      o.user_id as userId,
      o.date_created as dateCreated,
      o.assigned_staff_id as technicianId,
      up_tech.full_name as technicianName,
      up_tech.avatar as technicianAvatar,
      o.client_store_id as storeId,
      COALESCE(csl.client_store_name, 'Estella Place') as branchName,
      COALESCE(up.full_name, 'No Name') as customerName,
      up.avatar as customerAvatar,
      COALESCE(
        (SELECT phone_number FROM user_contact WHERE user_id = o.user_id AND is_disabled = 0 AND phone_number IS NOT NULL AND phone_number != '' ORDER BY id DESC LIMIT 1),
        ''
      ) as customerPhone,
      up_created.full_name as bookerName,
      o.created_staff_id as createdStaffId
    FROM \`order\` o
    LEFT JOIN user_profile up ON o.user_id = up.user_id
    LEFT JOIN user_profile up_tech ON o.assigned_staff_id = up_tech.user_id
    LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
    LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
    WHERE o.id IN (${candidateIdSql})${filterSql}
    ORDER BY o.booking_date_start ASC LIMIT ? OFFSET ?
  `;
  const result = await fastify.prisma.legacy.$queryRawUnsafe<AppointmentOrderRow[]>(
    mainSql,
    ...sharedFilterParams,
    limitNum,
    offsetNum
  );
  const t4 = performance.now();

  // The CRM branch catalog owns the short display code. Keep it alongside
  // the legacy store name so every schedule consumer receives the same
  // canonical code instead of deriving EP/DT/PXL in the browser.
  const appointmentStoreIds = Array.from(
    new Set(result.map((order) => Number(order.storeId)).filter((id) => Number.isInteger(id) && id > 0))
  );
  const branchCodeByStoreId = new Map<number, string>();
  if (appointmentStoreIds.length > 0) {
    const branchRows = await fastify.prisma.crm.crmStore.findMany({
      where: { legacyClientStoreId: { in: appointmentStoreIds } },
      select: { legacyClientStoreId: true, code: true },
    });
    branchRows.forEach((branch) => {
      if (branch.legacyClientStoreId) {
        branchCodeByStoreId.set(branch.legacyClientStoreId, branch.code);
      }
    });
  }

  fastify.log.info(
    `[APPOINTMENTS TIMING] candidateOrders: ${Math.round(t1 - t0)}ms, reportRows: ${Math.round(t2 - t1)}ms, countResult: ${Math.round(t3 - t2)}ms, mainSql: ${Math.round(t4 - t3)}ms`
  );

  return {
    candidateIds,
    total,
    result,
    branchCodeByStoreId,
  };
}
