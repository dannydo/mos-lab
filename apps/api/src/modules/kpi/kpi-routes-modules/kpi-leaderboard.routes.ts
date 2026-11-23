import { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, type SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { calculateBookerSalaryStats } from '../services/salary-calculator.js';
import { getActiveBkTelesalesIds } from '../services/bk-salary.service.js';
import { compareBookerProductivity } from '../utils/leaderboard.js';
import { calculateConsultantSalaryStats, normalizeStaffAvatarUrl, parseDateRange } from './kpi-route.helpers.js';

export function registerKpiLeaderboardRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/leaderboard
  fastify.get('/kpi/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };

    const qParams = (request.query || {}) as SafeAny;
    const startDate = qParams.startDate || qParams.dateFrom || qParams.date_from;
    const endDate = qParams.endDate || qParams.dateTo || qParams.date_to;
    const role = qParams.role;
    const staffIds = qParams.staffIds;

    const { startStr, endStr, start, end } = parseDateRange(startDate, endDate, 0);

    const cacheKey = `kpi:leaderboard:${user.role}:${role || 'all'}:${staffIds || 'all'}:${startStr}:${endStr}`;
    const cached = fastify.cache.get(cacheKey);
    if (cached) return cached;

    try {
      if (role === 'oc' || role === 'consultant') {
        const salaries = await calculateConsultantSalaryStats(fastify, start, end);
        const uids = Object.keys(salaries).map(Number);

        const profiles =
          uids.length > 0
            ? ((await fastify.prisma.legacy.$queryRawUnsafe(`
          SELECT user_id, full_name, username, avatar 
          FROM \`user_profile\` 
          WHERE user_id IN (${uids.join(',')})
        `)) as SafeAny[])
            : [];

        const profileMap = new Map<number, SafeAny>();
        profiles.forEach((p: SafeAny) => {
          profileMap.set(Number(p.user_id), p);
        });

        const leaderboard = uids.map((uid) => {
          const sal = salaries[uid];
          const prof = profileMap.get(uid) || {};
          const avatarUrl = normalizeStaffAvatarUrl(prof.avatar || null);

          return {
            staffId: uid,
            displayName: prof.full_name || `CC - ${uid}`,
            username: prof.username || `cc_${uid}`,
            avatarUrl,
            totalPlanned: 0,
            totalCalled: 0,
            totalAnswered: 0,
            totalBooked: 0,
            totalCheckin: sal.checkins,
            answerRate: 0,
            bookingRate: 0,
            checkinRate: 0,
            totalEarnings: isAdminOrSuperAdminRole(user.role) ? sal.totalSalary : 0,
            salary: isAdminOrSuperAdminRole(user.role) ? sal : null,
          };
        });

        if (isAdminOrSuperAdminRole(user.role)) {
          leaderboard.sort((a, b) => b.totalEarnings - a.totalEarnings);
        } else {
          leaderboard.sort((a, b) => b.totalCheckin - a.totalCheckin);
        }
        const isPast = end < new Date();
        fastify.cache.set(cacheKey, leaderboard, isPast ? 300_000 : 30_000);
        return leaderboard;
      }

      const isBkTelesalesLeaderboard = !role || role === 'telesales';
      const staffWhere: SafeAny = { isActive: true };

      if (isBkTelesalesLeaderboard) {
        // The Telesales leaderboard is defined by the active BK_TELESALES
        // roster, not a CRM account role or a browser-local selection. This
        // includes operational leaders whose CRM role is `admin` and excludes
        // all active staff outside the team.
        const activeBkTelesalesIds = await getActiveBkTelesalesIds(fastify);
        if (activeBkTelesalesIds.length === 0) return [];
        staffWhere.legacyStaffId = { in: activeBkTelesalesIds };
      } else if (staffIds && staffIds.trim() !== '') {
        staffWhere.id = {
          in: staffIds
            .split(',')
            .map(Number)
            .filter((n: number) => !isNaN(n)),
        };
      } else {
        staffWhere.role = role;
      }

      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: staffWhere,
        select: { id: true, displayName: true, username: true, legacyStaffId: true, avatarUrl: true },
      });

      const salaries = await calculateBookerSalaryStats(fastify, start, end);

      // Match staff names to legacy user IDs
      const staffNames = staffList.map((s) => s.displayName);
      const profiles =
        staffNames.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `
        SELECT up.user_id as userId, up.full_name as fullName, up.avatar
        FROM \`user_profile\` up
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
          AND up.full_name IN (${staffNames.map(() => '?').join(',')})
      `,
              ...staffNames
            )
          : [];

      const staffNameToProfileMap = new Map<string, SafeAny>();
      profiles.forEach((p: SafeAny) => {
        staffNameToProfileMap.set(p.fullName.toLowerCase().trim(), p);
      });

      const legacyUserIds = Array.from(
        new Set(
          staffList
            .map((s) =>
              s.legacyStaffId
                ? Number(s.legacyStaffId)
                : Number(staffNameToProfileMap.get(s.displayName.toLowerCase().trim())?.userId)
            )
            .filter((id): id is number => typeof id === 'number' && !isNaN(id))
        )
      );

      const crmStaffIds = staffList.map((s) => s.id);
      const callStatsMap = new Map<number, { totalCalled: number; totalAnswered: number; totalHappy: number }>();

      if (crmStaffIds.length > 0) {
        const idList = crmStaffIds.join(',');
        const [crmAggRows, omiAggRows] = await Promise.all([
          fastify.prisma.crm.$queryRawUnsafe<
            { staffId: number; totalCalled: number; totalAnswered: number; totalHappy: number }[]
          >(
            `SELECT 
              staff_id as staffId,
              COUNT(id) as totalCalled,
              SUM(CASE WHEN UPPER(COALESCE(call_result, '')) IN ('ANSWERED', 'ANSWER', 'CONNECTED') THEN 1 ELSE 0 END) as totalAnswered,
              SUM(CASE WHEN UPPER(COALESCE(outcome, '')) IN ('HAPPY', 'HAPPY_CALL', 'APPROVED') THEN 1 ELSE 0 END) as totalHappy
            FROM crm_call_logs
            WHERE staff_id IN (${idList}) AND created_at >= ? AND created_at <= ?
            GROUP BY staff_id`,
            start,
            end
          ),
          fastify.prisma.crm.$queryRawUnsafe<
            { staffId: number; totalCalled: number; totalAnswered: number; totalHappy: number }[]
          >(
            `SELECT 
              staff_id as staffId,
              COUNT(id) as totalCalled,
              SUM(CASE WHEN UPPER(COALESCE(status, '')) = 'ANSWER' THEN 1 ELSE 0 END) as totalAnswered,
              SUM(CASE WHEN UPPER(COALESCE(happy_call_status, '')) = 'APPROVED' THEN 1 ELSE 0 END) as totalHappy
            FROM crm_omicall_logs
            WHERE staff_id IN (${idList}) AND created_at >= ? AND created_at <= ? AND direction = 'outbound'
            GROUP BY staff_id`,
            start,
            end
          ),
        ]);

        const crmStatsMap = new Map<number, { totalCalled: number; totalAnswered: number; totalHappy: number }>();
        crmAggRows.forEach((r: SafeAny) => {
          crmStatsMap.set(Number(r.staffId), {
            totalCalled: Number(r.totalCalled || 0),
            totalAnswered: Number(r.totalAnswered || 0),
            totalHappy: Number(r.totalHappy || 0),
          });
        });

        const omiStatsMap = new Map<number, { totalCalled: number; totalAnswered: number; totalHappy: number }>();
        omiAggRows.forEach((r: SafeAny) => {
          omiStatsMap.set(Number(r.staffId), {
            totalCalled: Number(r.totalCalled || 0),
            totalAnswered: Number(r.totalAnswered || 0),
            totalHappy: Number(r.totalHappy || 0),
          });
        });

        // 3. Combine with Math.max per staff ID
        crmStaffIds.forEach((sid) => {
          const crmStat = crmStatsMap.get(sid) || { totalCalled: 0, totalAnswered: 0, totalHappy: 0 };
          const omiStat = omiStatsMap.get(sid) || { totalCalled: 0, totalAnswered: 0, totalHappy: 0 };
          callStatsMap.set(sid, {
            totalCalled: Math.max(crmStat.totalCalled, omiStat.totalCalled),
            totalAnswered: Math.max(crmStat.totalAnswered, omiStat.totalAnswered),
            totalHappy: Math.max(crmStat.totalHappy, omiStat.totalHappy),
          });
        });
      }

      const bookedCountMap = new Map<number, number>();
      if (legacyUserIds.length > 0) {
        // Strict Rule #10: Booked count MUST be calculated strictly by date_created string range without OR booking_date_start
        const sqlBooked = `
          SELECT 
            o.created_staff_id as staffId,
            COUNT(DISTINCT o.id) as totalBooked
          FROM \`order\` o
          WHERE o.created_staff_id IN (${legacyUserIds.join(',')})
            AND o.date_created >= '${startStr} 00:00:00'
            AND o.date_created <= '${endStr} 23:59:59'
            AND o.order_state != 'Cancelled'
          GROUP BY o.created_staff_id
        `;

        const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sqlBooked);
        bookedRows.forEach((r: SafeAny) => {
          bookedCountMap.set(Number(r.staffId), Number(r.totalBooked || 0));
        });
      }

      const leaderboard = [];

      for (const staff of staffList) {
        const profile = staffNameToProfileMap.get(staff.displayName.toLowerCase().trim());
        const legacyUserId = staff.legacyStaffId
          ? Number(staff.legacyStaffId)
          : profile?.userId
            ? Number(profile.userId)
            : undefined;
        const callStats = callStatsMap.get(staff.id) || { totalCalled: 0, totalAnswered: 0, totalHappy: 0 };

        const avatarUrl = normalizeStaffAvatarUrl(staff.avatarUrl || profile?.avatar || null);

        const salary = salaries[staff.id] || {
          baseSalary: 5500000,
          doneCount: 0,
          missedCount: 0,
          missedRate: 0,
          clientBonus: 0,
          doneBonus: 0,
          missedBonus: 0,
          tipBonus: 0,
          revBonus: 0,
          totalTips: 0,
          totalNetRev: 0,
          totalSalary: 5500000,
        };

        const totalBooked = legacyUserId ? bookedCountMap.get(legacyUserId) || 0 : 0;
        const totalPlanned = totalBooked;
        const totalCalled = callStats.totalCalled;
        const totalAnswered = callStats.totalAnswered;

        const answerRate = totalCalled > 0 ? Math.round((totalAnswered / totalCalled) * 100) : 0;
        const bookingRate = totalAnswered > 0 ? Math.round((totalBooked / totalAnswered) * 100) : 0;
        const checkinRate = totalBooked > 0 ? Math.round((salary.doneCount / totalBooked) * 100) : 0;

        const totalHappy = callStats.totalHappy;

        leaderboard.push({
          staffId: staff.id,
          displayName: staff.displayName,
          username: staff.username,
          avatarUrl,
          totalPlanned,
          totalCalled,
          totalAnswered,
          totalHappy,
          totalBooked,
          totalCheckin: salary.doneCount,
          answerRate,
          bookingRate,
          checkinRate,
          totalEarnings: isAdminOrSuperAdminRole(user.role) ? salary.totalSalary : 0,
          salary: isAdminOrSuperAdminRole(user.role) ? salary : null,
        });
      }

      leaderboard.sort(compareBookerProductivity);
      const isPast = end < new Date();
      fastify.cache.set(cacheKey, leaderboard, isPast ? 300_000 : 30_000);
      return leaderboard;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Leaderboard KPI error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve leaderboard statistics',
      });
    }
  });
}
