import { FastifyInstance } from 'fastify';
import {
  TelesaleCustomerPoolResponse,
  TelesaleCustomerPoolItem,
  TelesalePipelineStageKey,
  SafeAny,
} from '@mos-lab/shared';
import { TelesaleTargetConfigService } from './telesale-target-config.service.js';

export class TelesaleCustomerPoolService {
  static async getCustomerPool(
    fastify: FastifyInstance,
    stageKey: TelesalePipelineStageKey,
    bookerId?: number,
    limit = 50,
    offset = 0
  ): Promise<TelesaleCustomerPoolResponse> {
    let dayMin: number;
    let dayMax: number;
    if (stageKey === '0_30') {
      dayMin = 0;
      dayMax = 30;
    } else if (stageKey === '31_60') {
      dayMin = 31;
      dayMax = 60;
    } else if (stageKey === '61_120') {
      dayMin = 61;
      dayMax = 120;
    } else {
      dayMin = 121;
      dayMax = 99999;
    }

    const whereDays =
      stageKey === 'gt_120'
        ? `(DATEDIFF(CURDATE(), up.last_order_booking) > 120 OR up.last_order_booking IS NULL)`
        : `DATEDIFF(CURDATE(), up.last_order_booking) >= ${dayMin} AND DATEDIFF(CURDATE(), up.last_order_booking) <= ${dayMax}`;

    const currentConfig = await TelesaleTargetConfigService.getConfig(fastify);
    const activeStaffList = currentConfig.staffTargets;
    const activeStaffIds =
      activeStaffList.length > 0 ? activeStaffList.map((s) => s.legacyStaffId) : [50670, 52648, 32268, 52598];
    const staffCount = Math.max(1, activeStaffIds.length);
    const bookerIndex = bookerId && bookerId > 0 ? activeStaffIds.indexOf(bookerId) : -1;

    const bookerFilter =
      bookerIndex >= 0
        ? `AND (u.id % ${staffCount} = ${bookerIndex})`
        : bookerId && bookerId > 0
          ? `AND (u.id % ${staffCount} = ${bookerId % staffCount})`
          : '';

    const listSql = `
      SELECT 
        u.id as customerId,
        COALESCE(up.full_name, CONCAT(u.first_name, ' ', u.last_name), 'Khách hàng') as customerName,
        COALESCE(u.mobile, up.phone, '') as phone,
        COALESCE(cs.client_store_key, 'PXL') as store,
        DATE_FORMAT(up.last_order_booking, '%Y-%m-%d') as lastVisitDate,
        COALESCE(DATEDIFF(CURDATE(), up.last_order_booking), 999) as daysSinceLastVisit,
        COALESCE(oc.totalSpent, 0) as totalSpent
      FROM \`user\` u
      JOIN \`user_profile\` up ON u.id = up.user_id
      LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
      LEFT JOIN (
        SELECT user_id, SUM(total_amount) as totalSpent
        FROM \`order\`
        WHERE order_state = 'Completed'
        GROUP BY user_id
      ) oc ON oc.user_id = u.id
      WHERE u.user_type = 1 
        AND ${whereDays}
        ${bookerFilter}
      ORDER BY up.last_order_booking DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const countSql = `
      SELECT COUNT(DISTINCT u.id) as totalCount
      FROM \`user\` u
      JOIN \`user_profile\` up ON u.id = up.user_id
      WHERE u.user_type = 1 
        AND ${whereDays}
        ${bookerFilter}
    `;

    const [rows, countRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(listSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql).catch(() => [{ totalCount: 0 }]),
    ]);

    const total = Number(countRows[0]?.totalCount || 0);

    const activeStaffNames: Record<number, string> =
      activeStaffList.length > 0
        ? Object.fromEntries(activeStaffList.map((s) => [s.legacyStaffId, s.name]))
        : { 50670: 'Phượng', 52648: 'Kiều', 32268: 'Điệp', 52598: 'Vũ' };

    const items: TelesaleCustomerPoolItem[] = rows.map((r, idx) => {
      const assignedIndex = bookerIndex >= 0 ? bookerIndex : Math.abs(Number(r.customerId)) % staffCount;
      const assignedId = activeStaffIds[assignedIndex] || bookerId || 0;
      return {
        id: idx + 1,
        customerId: Number(r.customerId),
        customerName: String(r.customerName),
        phone: String(r.phone),
        store: String(r.store),
        lastVisitDate: r.lastVisitDate ? String(r.lastVisitDate) : null,
        daysSinceLastVisit: Number(r.daysSinceLastVisit),
        assignedStaffId: assignedId,
        assignedStaffName: activeStaffNames[assignedId] || 'Telesales',
        stageKey,
        callStatus: 'NOT_CALLED',
        totalCallsInMonth: 0,
        totalSpent: Number(r.totalSpent || 0),
      };
    });

    return {
      stageKey,
      total,
      calledTodayCount: 0,
      bookedCount: 0,
      items,
    };
  }
}
