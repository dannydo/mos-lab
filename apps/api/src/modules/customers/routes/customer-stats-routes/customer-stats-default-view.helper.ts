import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { CustomerStatsQuery, CustomerStatsResult } from './customer-stats.types.js';

export interface DefaultViewCheckInput {
  query: CustomerStatsQuery;
  effectiveAssignedStaffId?: string;
  needSpent: boolean;
  needVisits: boolean;
  needServiceUsage: boolean;
  needPromo: boolean;
  needReferrals: boolean;
}

export function isDefaultCustomerStatsView({
  query,
  effectiveAssignedStaffId,
  needSpent,
  needVisits,
  needServiceUsage,
  needPromo,
  needReferrals,
}: DefaultViewCheckInput): boolean {
  const {
    search,
    bucket,
    assignedDaysMin,
    assignedDaysMax,
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
    callStatuses,
    lastCallDaysMin,
    lastCallDaysMax,
    isForeign,
    retainedOnly,
    allocationBatchId,
    ids,
    campaignId,
    campaignFilterMode,
  } = query;

  return (
    (!search || search.trim() === '') &&
    (!bucket || bucket === 'ALL') &&
    (!effectiveAssignedStaffId || effectiveAssignedStaffId === 'all') &&
    (assignedDaysMin === undefined || assignedDaysMin === '') &&
    (assignedDaysMax === undefined || assignedDaysMax === '') &&
    (daysSinceLastVisitMin === undefined || daysSinceLastVisitMin === '') &&
    (daysSinceLastVisitMax === undefined || daysSinceLastVisitMax === '') &&
    !needSpent &&
    !needVisits &&
    !needServiceUsage &&
    !needPromo &&
    !needReferrals &&
    (dobMonth === undefined || dobMonth === '' || dobMonth === 'ALL') &&
    !birthdayPreset &&
    (ageMin === undefined || ageMin === '') &&
    (ageMax === undefined || ageMax === '') &&
    (!callStatuses || callStatuses.trim() === '') &&
    (lastCallDaysMin === undefined || lastCallDaysMin === '') &&
    (lastCallDaysMax === undefined || lastCallDaysMax === '') &&
    (!isForeign || isForeign === 'all') &&
    retainedOnly !== 'true' &&
    (!allocationBatchId || allocationBatchId.trim() === '') &&
    (!ids || ids.trim() === '') &&
    (!campaignId || campaignId.trim() === '' || (campaignFilterMode || '').toUpperCase() === 'ALL')
  );
}

/**
 * Fast-path computation for unfiltered `/customers/stats` views across active or trash users.
 */
export async function computeDefaultViewStats(
  fastify: FastifyInstance,
  trash: string | undefined
): Promise<CustomerStatsResult> {
  const isTrash = trash === 'true';
  const deletedFilter = isTrash ? 'up.is_deleted = 1' : 'COALESCE(up.is_deleted, 0) = 0';

  const [totRows, elsaRows, liveRows, totalComboRows] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT COUNT(*) as total 
      FROM user u 
      LEFT JOIN user_profile up ON u.id = up.user_id 
      WHERE ${deletedFilter}
    `),
    fastify.prisma.crm.$queryRawUnsafe<Array<{ legacy_user_id: number }>>(`
      SELECT DISTINCT legacy_user_id
      FROM crm_customer_elsa_reservations
      WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
    `),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        usb.user_id,
        SUM(usb.normal_count) as normalCount,
        SUM(usb.retain_count) as retainCount,
        MAX(usb.date_expired) as expiryDate,
        DATEDIFF(MAX(usb.date_expired), NOW()) as diffDays
      FROM user_service_balance usb
      JOIN user_profile up ON up.user_id = usb.user_id AND ${deletedFilter}
      WHERE (usb.normal_count > 0 OR usb.retain_count > 0)
        AND (usb.service_group IS NULL OR usb.service_group != 'LashesUnder')
        AND (usb.date_expired IS NULL OR usb.date_expired > NOW())
      GROUP BY usb.user_id
    `),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT COUNT(DISTINCT usb.user_id) as totalComboUsers
      FROM user_service_balance usb
      JOIN user_profile up ON up.user_id = usb.user_id AND ${deletedFilter}
    `),
  ]);

  const total = Number(totRows[0]?.total || 0);
  const elsaUserIds = new Set((elsaRows || []).map((r) => Number(r.legacy_user_id)));
  const comboElsa = elsaUserIds.size;

  const liveUsers = (liveRows as SafeAny[]) || [];
  const activeLiveUsers = liveUsers.filter((r) => !elsaUserIds.has(Number(r.user_id)));
  const comboLive = activeLiveUsers.length;

  const totalComboUsers = Number(totalComboRows[0]?.totalComboUsers || 0);
  const comboDead = Math.max(0, totalComboUsers - liveUsers.length);
  const single = Math.max(0, total - comboLive - comboDead - comboElsa);

  let hsd30 = 0;
  let lsd1 = 0;
  for (const r of activeLiveUsers) {
    const totalCount = Number(r.normalCount || 0) + Number(r.retainCount || 0);
    if (totalCount === 1) lsd1++;
    if (r.diffDays !== null && r.diffDays !== undefined && Number(r.diffDays) >= 0 && Number(r.diffDays) <= 30) {
      hsd30++;
    }
  }

  return {
    total,
    comboLive,
    comboDead,
    single,
    comboElsa,
    notComboLive: total - comboLive - comboElsa,
    hsd30,
    lsd1,
  };
}
