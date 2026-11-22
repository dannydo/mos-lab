import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
  type HolidayCandidateMetrics,
  type HolidayCandidateScore,
  type SafeAny,
  type StaffPerformanceSeverity,
} from '@mos-lab/shared';
import {
  type Actor,
  HolidayWorkError,
  MINIMUM_RELEVANT_INTERACTIONS,
  type RawMetric,
  calculateHolidayCandidateScore,
  dateKey,
  normalizeWeights,
  parseJson,
  relativePercentile,
  severityPoints,
  shiftDate,
  toDbDate,
} from './holiday-work-calendar-and-calc.js';
import { mapCandidate, writeHolidayAudit } from './holiday-work-mappers.js';

export async function generateCandidates(fastify: FastifyInstance, holidayId: number, actor: Actor) {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
    where: { id: holidayId },
    include: { coverage: true },
  });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status === 'PAYROLL_LOCKED') throw new HolidayWorkError('Kỳ lương đã khóa.', 409);
  const teamCodes = [...new Set(period.coverage.map((item) => item.teamCode))];
  if (teamCodes.length === 0) throw new HolidayWorkError('Cần cấu hình nhu cầu nhân sự trước khi chấm điểm.');

  const teams = await fastify.prisma.crm.crmTeam.findMany({
    where: { code: { in: teamCodes }, isActive: true },
    include: { members: { where: { isActive: true } } },
  });
  const memberships = teams.flatMap((team) =>
    team.members.map((member) => ({
      teamCode: team.code,
      legacyStaffId: member.legacyStaffId,
      crmStaffId: member.crmStaffId,
      fallbackName: member.displayName,
    }))
  );
  const legacyStaffIds = [...new Set(memberships.map((member) => member.legacyStaffId).filter(Boolean))];
  if (legacyStaffIds.length === 0) throw new HolidayWorkError('Các đội chưa có nhân sự active để xếp hạng.');

  const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
    where: { legacyStaffId: { in: legacyStaffIds }, isActive: true },
    select: { id: true, legacyStaffId: true, displayName: true, avatarUrl: true },
  });
  const crmByLegacyId = new Map(crmStaffs.map((staff) => [Number(staff.legacyStaffId), staff]));
  const profileRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT up.user_id AS legacyStaffId,
            up.full_name AS displayName,
            up.client_store_id AS storeId,
            UPPER(COALESCE(cs.client_store_key, 'UNASSIGNED')) AS storeKey
     FROM user_profile up
     LEFT JOIN client_store cs ON cs.id = up.client_store_id
     WHERE up.user_id IN (${legacyStaffIds.map(() => '?').join(',')})
       AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
    ...legacyStaffIds
  );
  const profileById = new Map(profileRows.map((row) => [Number(row.legacyStaffId), row]));
  const uniqueDates = [...new Set(period.coverage.map((item) => dateKey(item.workDate)))];
  const allSnapshots: HolidayCandidateScore[] = [];

  for (const workDate of uniqueDates) {
    const scoreWindowTo = shiftDate(workDate, -1);
    const scoreWindowFrom = shiftDate(workDate, -period.selectionWindowDays);
    const [cvRows, ccRows, tipRows, eventRows, speedProfiles] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT os.assigned_staff_id AS legacyStaffId,
                COUNT(DISTINCT os.id) AS completedServices,
                SUM(CASE WHEN os.next_fix_order_service_id > 0 THEN 1 ELSE 0 END) AS fixCount
         FROM order_service os
         JOIN \`order\` o ON o.id = os.order_id
         JOIN report_order ro ON ro.order_id = o.id
         WHERE os.assigned_staff_id IN (${legacyStaffIds.map(() => '?').join(',')})
           AND o.order_state = 'Completed'
           AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
           AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
         GROUP BY os.assigned_staff_id`,
        ...legacyStaffIds,
        `${scoreWindowFrom} 00:00:00`,
        `${scoreWindowTo} 23:59:59`
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT os.check_in_staff_id AS legacyStaffId,
                COUNT(DISTINCT o.id) AS completedServices,
                AVG(CASE
                  WHEN o.booking_date_start IS NOT NULL AND ro.actual_booking_date_start IS NOT NULL
                   AND TIMESTAMPDIFF(MINUTE, o.booking_date_start, ro.actual_booking_date_start) BETWEEN 0 AND 240
                  THEN TIMESTAMPDIFF(MINUTE, o.booking_date_start, ro.actual_booking_date_start) / 15
                  ELSE NULL END) AS speedRatio
         FROM order_service os
         JOIN \`order\` o ON o.id = os.order_id
         JOIN report_order ro ON ro.order_id = o.id
         WHERE os.check_in_staff_id IN (${legacyStaffIds.map(() => '?').join(',')})
           AND o.order_state = 'Completed'
           AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
           AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
         GROUP BY os.check_in_staff_id`,
        ...legacyStaffIds,
        `${scoreWindowFrom} 00:00:00`,
        `${scoreWindowTo} 23:59:59`
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT st.user_id AS legacyStaffId, COUNT(DISTINCT st.order_id) AS tippedVisits
         FROM staff_tip st
         JOIN \`order\` o ON o.id = st.order_id
         JOIN report_order ro ON ro.order_id = o.id
         WHERE st.user_id IN (${legacyStaffIds.map(() => '?').join(',')})
           AND o.order_state = 'Completed'
           AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
           AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
         GROUP BY st.user_id`,
        ...legacyStaffIds,
        `${scoreWindowFrom} 00:00:00`,
        `${scoreWindowTo} 23:59:59`
      ),
      fastify.prisma.crm.crmStaffPerformanceEvent.findMany({
        where: {
          legacyStaffId: { in: legacyStaffIds },
          status: 'VERIFIED',
          occurredAt: { gte: toDbDate(scoreWindowFrom), lte: new Date(`${scoreWindowTo}T23:59:59+07:00`) },
        },
      }),
      fastify.prisma.crm.crmCvSpeedProfile.findMany({
        where: { staffId: { in: legacyStaffIds } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const cvById = new Map(cvRows.map((row) => [Number(row.legacyStaffId), row]));
    const ccById = new Map(ccRows.map((row) => [Number(row.legacyStaffId), row]));
    const tipById = new Map(tipRows.map((row) => [Number(row.legacyStaffId), Number(row.tippedVisits || 0)]));
    const speedById = new Map<number, number>();
    speedProfiles.forEach((profile) => {
      if (!speedById.has(profile.staffId) && profile.speedDeltaPercent !== null) {
        speedById.set(profile.staffId, 1 + Number(profile.speedDeltaPercent) / 100);
      }
    });
    const eventsById = new Map<number, { feedback: number; attendance: number }>();
    eventRows.forEach((event) => {
      if (!event.legacyStaffId) return;
      const metrics = eventsById.get(event.legacyStaffId) || { feedback: 0, attendance: 0 };
      if (event.eventType === 'NEGATIVE_FEEDBACK') metrics.feedback += 1;
      else metrics.attendance += severityPoints(event.severity as StaffPerformanceSeverity);
      eventsById.set(event.legacyStaffId, metrics);
    });

    const coverageTargets = period.coverage
      .filter((coverage) => dateKey(coverage.workDate) === workDate)
      .map((coverage) => ({
        teamCode: coverage.teamCode.toUpperCase(),
        storeKey: coverage.storeKey.toUpperCase(),
      }));
    const rawCandidates = memberships
      .filter((membership) => {
        const profile = profileById.get(membership.legacyStaffId);
        const memberStoreKey = String(profile?.storeKey || 'UNASSIGNED').toUpperCase();
        return coverageTargets.some(
          (target) =>
            target.teamCode === membership.teamCode.toUpperCase() &&
            (target.storeKey === 'UNASSIGNED' || target.storeKey === memberStoreKey)
        );
      })
      .map((membership) => {
        const profile = profileById.get(membership.legacyStaffId);
        const isCv = membership.teamCode.toUpperCase().startsWith('CV');
        const isCc = membership.teamCode.toUpperCase().startsWith('CC');
        const roleRow = isCv
          ? cvById.get(membership.legacyStaffId)
          : isCc
            ? ccById.get(membership.legacyStaffId)
            : null;
        const eventStats = eventsById.get(membership.legacyStaffId) || { feedback: 0, attendance: 0 };
        const completedServices = Number(roleRow?.completedServices || 0);
        const raw: RawMetric = {
          legacyStaffId: membership.legacyStaffId,
          completedServices,
          fixCount: isCv ? Number(roleRow?.fixCount || 0) : 0,
          tippedVisits: tipById.get(membership.legacyStaffId) || 0,
          speedRatio: isCv
            ? (speedById.get(membership.legacyStaffId) ?? null)
            : isCc && roleRow?.speedRatio !== null
              ? Number(roleRow.speedRatio)
              : null,
          feedbackCount: eventStats.feedback,
          attendanceIncidentPoints: eventStats.attendance,
        };
        return {
          membership,
          profile,
          crmStaff: crmByLegacyId.get(membership.legacyStaffId),
          raw,
          groupKey: `${membership.teamCode}:${String(profile?.storeKey || 'UNASSIGNED')}`,
        };
      });

    const weights = normalizeWeights(parseJson(period.selectionWeightsJson, DEFAULT_HOLIDAY_SELECTION_WEIGHTS));
    for (const candidate of rawCandidates) {
      const peers = rawCandidates.filter((peer) => peer.groupKey === candidate.groupKey).map((peer) => peer.raw);
      const denominator = candidate.raw.completedServices;
      const feedbackRate = denominator > 0 ? candidate.raw.feedbackCount / denominator : null;
      const fixRate =
        denominator > 0 && candidate.membership.teamCode.startsWith('CV') ? candidate.raw.fixCount / denominator : null;
      const tipRate = denominator > 0 ? candidate.raw.tippedVisits / denominator : null;
      const peerFeedbackRates = peers.map((peer) =>
        peer.completedServices > 0 ? peer.feedbackCount / peer.completedServices : null
      );
      const peerFixRates = peers.map((peer) =>
        peer.completedServices > 0 ? peer.fixCount / peer.completedServices : null
      );
      const peerTipRates = peers.map((peer) =>
        peer.completedServices > 0 ? peer.tippedVisits / peer.completedServices : null
      );
      const metrics: HolidayCandidateMetrics = {
        completedServices: denominator,
        verifiedNegativeFeedbackCount: candidate.raw.feedbackCount,
        feedbackRate,
        fixCount: candidate.raw.fixCount,
        fixRate,
        tippedVisits: candidate.raw.tippedVisits,
        tipRate,
        medianSpeedRatio: candidate.raw.speedRatio,
        attendanceIncidentPoints: candidate.raw.attendanceIncidentPoints,
        feedbackPercentile: relativePercentile(feedbackRate, peerFeedbackRates, false),
        fixPercentile: relativePercentile(fixRate, peerFixRates, false),
        tipPercentile: relativePercentile(tipRate, peerTipRates, true),
        speedPercentile: relativePercentile(
          candidate.raw.speedRatio,
          peers.map((peer) => peer.speedRatio),
          false
        ),
        attendancePercentile: relativePercentile(
          candidate.raw.attendanceIncidentPoints,
          peers.map((peer) => peer.attendanceIncidentPoints),
          false
        ),
      };
      const { totalScore, dataSufficient } = calculateHolidayCandidateScore(metrics, weights);
      const explanation = [
        `Dữ liệu ${period.selectionWindowDays} ngày: ${denominator} lượt hợp lệ.`,
        `Feedback xác thực: ${candidate.raw.feedbackCount}; Fix: ${candidate.raw.fixCount}; Tip: ${candidate.raw.tippedVisits}.`,
        candidate.raw.speedRatio === null
          ? 'Chưa có dữ liệu tốc độ đủ tin cậy.'
          : `Tốc độ so với benchmark: ${Math.round(candidate.raw.speedRatio * 100)}%.`,
        `Điểm sự cố chuyên cần: ${candidate.raw.attendanceIncidentPoints}.`,
      ];
      const saved = await fastify.prisma.crm.crmHolidayCandidateSnapshot.upsert({
        where: {
          holiday_candidate_staff_day: {
            holidayId,
            workDate: toDbDate(workDate),
            legacyStaffId: candidate.membership.legacyStaffId,
          },
        },
        create: {
          holidayId,
          workDate: toDbDate(workDate),
          crmStaffId: candidate.crmStaff?.id || candidate.membership.crmStaffId || null,
          legacyStaffId: candidate.membership.legacyStaffId,
          displayName:
            candidate.profile?.displayName ||
            candidate.crmStaff?.displayName ||
            candidate.membership.fallbackName ||
            '',
          avatarUrl: candidate.crmStaff?.avatarUrl || null,
          teamCode: candidate.membership.teamCode,
          storeId: candidate.profile?.storeId ? Number(candidate.profile.storeId) : null,
          storeKey: String(candidate.profile?.storeKey || 'UNASSIGNED'),
          scoreWindowFrom: toDbDate(scoreWindowFrom),
          scoreWindowTo: toDbDate(scoreWindowTo),
          totalScore,
          dataSufficient,
          dataCoverageReason: dataSufficient
            ? null
            : `Cần tối thiểu ${MINIMUM_RELEVANT_INTERACTIONS} lượt hợp lệ; hiện có ${denominator}.`,
          metricsJson: JSON.stringify(metrics),
          explanationJson: JSON.stringify(explanation),
        },
        update: {
          crmStaffId: candidate.crmStaff?.id || candidate.membership.crmStaffId || null,
          displayName:
            candidate.profile?.displayName ||
            candidate.crmStaff?.displayName ||
            candidate.membership.fallbackName ||
            '',
          avatarUrl: candidate.crmStaff?.avatarUrl || null,
          teamCode: candidate.membership.teamCode,
          storeId: candidate.profile?.storeId ? Number(candidate.profile.storeId) : null,
          storeKey: String(candidate.profile?.storeKey || 'UNASSIGNED'),
          scoreWindowFrom: toDbDate(scoreWindowFrom),
          scoreWindowTo: toDbDate(scoreWindowTo),
          totalScore,
          dataSufficient,
          dataCoverageReason: dataSufficient
            ? null
            : `Cần tối thiểu ${MINIMUM_RELEVANT_INTERACTIONS} lượt hợp lệ; hiện có ${denominator}.`,
          metricsJson: JSON.stringify(metrics),
          explanationJson: JSON.stringify(explanation),
          generatedAt: new Date(),
        },
      });
      allSnapshots.push(mapCandidate(saved));
    }
  }
  await writeHolidayAudit(fastify, {
    holidayId,
    action: 'GENERATE_CANDIDATES',
    entityType: 'CANDIDATE_SNAPSHOT',
    actorStaffId: actor.id,
    after: { count: allSnapshots.length },
  });
  return allSnapshots.sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
}
