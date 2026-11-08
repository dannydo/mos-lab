import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { TeamService } from '../../teams/team.service.js';
import type {
  CvDisciplineResponse,
  CvDisciplineStaffRecord,
  CvDisciplineIncident,
  CvDisciplineSummary,
  SafeAny,
} from '@mos-lab/shared';

function toMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function normalizeStoreCode(key: string | null | undefined, fallback: string = 'DT'): string {
  if (!key) return fallback;
  const upper = key.toUpperCase();
  if (upper.includes('THAM') || upper.includes('DT') || upper === 'DE-THAM') return 'DT';
  if (upper.includes('ESTELLA') || upper.includes('EP') || upper === 'ESTELLA-PLACE') return 'EP';
  // PXL salon has been closed for 2 months. Active operations and fallbacks map to DT.
  if (upper.includes('PXL') || upper.includes('PHAN')) return 'DT';
  return fallback;
}

export async function registerCvDisciplineRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/kpi/cv-discipline
  fastify.get('/kpi/cv-discipline', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, store } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      store?: string;
    };

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    const defaultEnd = now.toLocaleDateString('en-CA');

    const startStr = dateFrom || defaultStart;
    const endStr = dateTo || defaultEnd;

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      // 1. Get active CV staff IDs (Single Source of Truth)
      const activeCvIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');

      if (activeCvIds.length === 0) {
        const emptyResponse: CvDisciplineResponse = {
          summary: {
            totalLateRecords: 0,
            totalLateMinutes: 0,
            totalEarlyRecords: 0,
            totalEarlyMinutes: 0,
            totalUrgentOffs: 0,
            totalOtherPenalties: 0,
            totalFinedBananas: 0,
            totalStaffWithViolations: 0,
            totalStaffCount: 0,
          },
          data: [],
          dateFrom: startPart,
          dateTo: endPart,
        };
        return reply.send(emptyResponse);
      }

      const staffListStr = activeCvIds.join(',');

      // 2. Fetch staff profiles (Excluding CC / non-CV)
      const staffProfilesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          up.user_id as userId,
          up.full_name as fullName,
          up.avatar as avatar,
          cs.client_store_key as rawStoreKey
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id AND ugl.language_id = 1
        WHERE up.user_id IN (${staffListStr})
          AND NOT (
            ugl.user_group_name LIKE '%Client Consultant%'
            OR ugl.user_group_name LIKE '%Tư Vấn%'
            OR ugl.user_group_name LIKE '%Telesales%'
            OR ugl.user_group_name LIKE '%Online Consultant%'
            OR up.user_id IN (SELECT DISTINCT user_id FROM staff_payroll_client_consultant)
            OR up.full_name LIKE '% CC%'
            OR up.full_name LIKE '%(CC)%'
          )
      `);

      const staffProfiles = staffProfilesRaw.map((s) => ({
        userId: Number(s.userId),
        fullName: s.fullName,
        avatar: s.avatar,
        store: normalizeStoreCode(s.rawStoreKey, 'DT'),
      }));

      let filteredStaffProfiles = staffProfiles;
      if (store && store !== 'ALL') {
        filteredStaffProfiles = staffProfiles.filter((s) => s.store.toUpperCase() === store.toUpperCase());
      }

      if (filteredStaffProfiles.length === 0) {
        const emptyResponse: CvDisciplineResponse = {
          summary: {
            totalLateRecords: 0,
            totalLateMinutes: 0,
            totalEarlyRecords: 0,
            totalEarlyMinutes: 0,
            totalUrgentOffs: 0,
            totalOtherPenalties: 0,
            totalFinedBananas: 0,
            totalStaffWithViolations: 0,
            totalStaffCount: 0,
          },
          data: [],
          dateFrom: startPart,
          dateTo: endPart,
        };
        return reply.send(emptyResponse);
      }

      const validStaffIds = filteredStaffProfiles.map((s) => Number(s.userId));
      const validStaffListStr = validStaffIds.join(',');

      // 3. Parallel queries for CRM staff metadata, real staff_activity penalties, and banana penalty/refund ledger transactions
      const [crmStaffs, activityRows, penaltyTransactions, refundTransactions] = await Promise.all([
        fastify.prisma.crm.crmStaff.findMany({
          where: { legacyStaffId: { in: validStaffIds } },
          select: { id: true, legacyStaffId: true, role: true, avatarUrl: true, displayName: true },
        }),
        // Real disciplinary penalties logged in staff_activity joined with rules, shifts, attendance, and stores
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            sa.id as activityId,
            sa.user_id as userId,
            sa.staff_activity_rule_id as ruleId,
            sarl.staff_activity_rule_title as ruleTitle,
            sa.amount as bananaAmount,
            sa.type as targetType,
            sa.item_id as targetId,
            sa.note as activityNote,
            DATE_FORMAT(sa.date_created, '%Y-%m-%d %H:%i:%s') as dateCreated,
            TIME_FORMAT(sa.date_created, '%H:%i:%s') as activityTime,
            DATE_FORMAT(COALESCE(sws.date, sdo.from_date, sa.date_created), '%Y-%m-%d') as incidentDate,
            TIME_FORMAT(sws.start_time, '%H:%i') as shiftStart,
            TIME_FORMAT(sws.end_time, '%H:%i') as shiftEnd,
            TIME_FORMAT(rs.check_in_date, '%H:%i:%s') as checkInTime,
            TIME_FORMAT(rs.check_out_date, '%H:%i:%s') as checkOutTime,
            rs.check_in_minute_diff as checkInDiff,
            rs.check_out_minute_diff as checkOutDiff,
            COALESCE(cs.client_store_key, cs_up.client_store_key, 'DT') as rawStoreKey,
            sdo.note as dayOffNote,
            sdo.attribute_option_value as dayOffReason
          FROM \`staff_activity\` sa
          JOIN \`user_profile\` up ON up.user_id = sa.user_id
          JOIN \`staff_activity_rule\` sar ON sar.id = sa.staff_activity_rule_id
          JOIN \`staff_activity_rule_language\` sarl ON sarl.staff_activity_rule_id = sar.id AND sarl.language_id = 1
          LEFT JOIN \`client_store\` cs ON cs.id = sa.client_store_id
          LEFT JOIN \`client_store\` cs_up ON cs_up.id = up.client_store_id
          LEFT JOIN \`staff_working_shift\` sws ON sws.id = sa.item_id AND sa.type = 'staff_working_shift'
          LEFT JOIN \`staff_day_off\` sdo ON sdo.id = sa.item_id AND sa.type = 'staff_day_off'
          LEFT JOIN \`report_staff\` rs ON rs.user_id = sa.user_id AND rs.date = COALESCE(sws.date, DATE(sa.date_created))
          WHERE sa.user_id IN (${validStaffListStr})
            AND sa.amount < 0
            AND sa.date_created >= '${startPart} 00:00:00'
            AND sa.date_created <= '${endPart} 23:59:59'
          ORDER BY sa.date_created DESC
        `),
        // Banana penalty transactions (currency_id = 3, amount < 0)
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            ubt.id as ubtId,
            ubt.user_id as userId,
            ubt.item_id as itemId,
            ubt.type as itemType,
            ubt.amount,
            ubt.balance,
            ubt.description,
            ubt.tracking_key as trackingKey,
            DATE_FORMAT(ubt.date_created, '%Y-%m-%d %H:%i:%s') as dateCreated,
            DATE_FORMAT(ubt.date_created, '%Y-%m-%d') as dateStr
          FROM \`user_balance_transaction\` ubt
          WHERE ubt.user_id IN (${validStaffListStr})
            AND ubt.currency_id = 3
            AND ubt.amount < 0
            AND ubt.date_created >= '${startPart} 00:00:00'
            AND ubt.date_created <= '${endPart} 23:59:59'
          ORDER BY ubt.date_created DESC
        `),
        // Banana refund/reversal transactions (currency_id = 3, amount > 0)
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            ubt.id as ubtId,
            ubt.user_id as userId,
            ubt.parent_id as parentId,
            ubt.amount,
            ubt.tracking_key as trackingKey,
            DATE_FORMAT(ubt.date_created, '%Y-%m-%d %H:%i:%s') as dateCreated
          FROM \`user_balance_transaction\` ubt
          WHERE ubt.user_id IN (${validStaffListStr})
            AND ubt.currency_id = 3
            AND ubt.amount > 0
            AND (ubt.parent_id IS NOT NULL OR ubt.template_id = 102 OR ubt.tracking_key LIKE '%user_balance_transaction_id%')
          ORDER BY ubt.date_created ASC
        `),
      ]);

      // Maps for fast lookups
      const crmStaffMap = new Map<number, SafeAny>();
      crmStaffs.forEach((cs) => {
        if (cs.legacyStaffId) crmStaffMap.set(Number(cs.legacyStaffId), cs);
      });

      // Map fine transaction IDs to their refunds (parent_id or tracking_key)
      const refundByFineIdMap = new Map<string, { amount: number; date: string }>();
      refundTransactions.forEach((ref) => {
        let fineId: string | null = null;
        if (ref.parentId) {
          fineId = String(ref.parentId);
        } else if (ref.trackingKey && ref.trackingKey.includes('user_balance_transaction_id')) {
          try {
            const parsed = JSON.parse(ref.trackingKey);
            fineId = String(parsed.user_balance_transaction_id || '');
          } catch {
            const m = String(ref.trackingKey).match(/"user_balance_transaction_id":"?(\d+)"?/);
            if (m) fineId = m[1];
          }
        }
        if (fineId) {
          const current = refundByFineIdMap.get(fineId)?.amount || 0;
          refundByFineIdMap.set(fineId, {
            amount: current + Number(ref.amount),
            date: ref.dateCreated,
          });
        }
      });

      // Group incidents by staff
      const staffIncidentMap = new Map<number, CvDisciplineIncident[]>();
      const usedUbtIds = new Set<string>();

      // 4. Map real disciplinary penalties from staff_activity
      activityRows.forEach((act) => {
        const uId = Number(act.userId);
        if (!staffIncidentMap.has(uId)) staffIncidentMap.set(uId, []);

        const actId = String(act.activityId);
        let fineUbt = penaltyTransactions.find(
          (u) =>
            !usedUbtIds.has(String(u.ubtId)) &&
            u.trackingKey &&
            u.trackingKey.includes(`"staff_activity_id":"${actId}"`)
        );
        if (!fineUbt && act.targetType && act.targetId) {
          fineUbt = penaltyTransactions.find(
            (u) =>
              !usedUbtIds.has(String(u.ubtId)) &&
              String(u.itemType) === String(act.targetType) &&
              String(u.itemId) === String(act.targetId)
          );
        }
        if (!fineUbt) {
          fineUbt = penaltyTransactions.find(
            (u) =>
              !usedUbtIds.has(String(u.ubtId)) &&
              Number(u.userId) === uId &&
              Math.abs(Number(u.amount)) === Math.abs(Number(act.bananaAmount))
          );
        }
        if (fineUbt) usedUbtIds.add(String(fineUbt.ubtId));

        const staffProfile = filteredStaffProfiles.find((p) => Number(p.userId) === uId);
        const incidentStore = normalizeStoreCode(act.rawStoreKey, staffProfile?.store || 'DT');
        const finedBananas = Math.abs(Number(act.bananaAmount));
        const ruleTitleLower = String(act.ruleTitle || '').toLowerCase();

        let type: 'LATE' | 'EARLY' | 'URGENT_OFF' | 'OTHER' = 'OTHER';
        let diffMinutes: number | null = null;
        let title = act.ruleTitle || 'Vi phạm kỷ luật';
        let description = act.activityNote || act.ruleTitle || null;
        let scheduledTime: string | null = null;
        let actualTime: string | null = null;

        if (act.shiftStart && act.shiftEnd) {
          scheduledTime = `${act.shiftStart} - ${act.shiftEnd}`;
        }

        const saTime = act.activityTime || (act.dateCreated ? act.dateCreated.split(' ')[1] : null);

        if (ruleTitleLower.includes('đi trễ')) {
          type = 'LATE';
          diffMinutes = Math.abs(Number(act.checkInDiff || 0));
          if (diffMinutes === 0 && act.checkInTime && act.shiftStart) {
            const inM = toMinutes(act.checkInTime);
            const startM = toMinutes(act.shiftStart);
            if (inM > startM) diffMinutes = inM - startM;
          }

          const saDiff = saTime && act.shiftStart ? Math.max(0, toMinutes(saTime) - toMinutes(act.shiftStart)) : 0;
          if (diffMinutes === 0 && saDiff > 0) {
            diffMinutes = saDiff;
            title = `Đi trễ ${diffMinutes} phút`;
            actualTime = `Check-in app: ${saTime} (Sổ sách: ${act.checkInTime || '09:00:00'})`;
            description = `Vào ca trên app lúc ${saTime} (lịch vào ca: ${act.shiftStart || '09:00'}). Hệ thống tự động trừ -${finedBananas} chuối vì trễ ${diffMinutes} phút; giờ chấm công sau đó được chỉnh về ${act.checkInTime || '09:00:00'}.`;
          } else {
            title = diffMinutes > 0 ? `Đi trễ ${diffMinutes} phút` : act.ruleTitle;
            actualTime = act.checkInTime ? `Check-in: ${act.checkInTime}` : 'Trễ ca';
            description = `Vào ca lúc ${act.checkInTime || 'chưa ghi nhận'} (lịch vào ca: ${act.shiftStart || '09:00'})`;
          }
        } else if (ruleTitleLower.includes('về sớm')) {
          type = 'EARLY';
          diffMinutes = Math.abs(Number(act.checkOutDiff || 0));
          if (diffMinutes === 0 && act.checkOutTime && act.shiftEnd) {
            const outM = toMinutes(act.checkOutTime);
            const endM = toMinutes(act.shiftEnd);
            if (endM > outM) diffMinutes = endM - outM;
          }

          const saEarlyDiff = saTime && act.shiftEnd ? Math.max(0, toMinutes(act.shiftEnd) - toMinutes(saTime)) : 0;
          if (diffMinutes === 0 && saEarlyDiff > 0) {
            diffMinutes = saEarlyDiff;
            title = `Về sớm ${diffMinutes} phút`;
            actualTime = `Check-out app: ${saTime} (Sổ sách: ${act.checkOutTime || act.shiftEnd})`;
            description = `Ra ca trên app lúc ${saTime} (lịch kết thúc: ${act.shiftEnd}). Hệ thống phạt -${finedBananas} chuối vì về sớm ${diffMinutes} phút; giờ chấm công sau đó được chỉnh về ${act.checkOutTime || act.shiftEnd}.`;
          } else {
            title = diffMinutes > 0 ? `Về sớm ${diffMinutes} phút` : act.ruleTitle;
            actualTime = act.checkOutTime ? `Check-out: ${act.checkOutTime}` : 'Về sớm';
            description = `Ra ca lúc ${act.checkOutTime || 'chưa ghi nhận'} (lịch kết thúc: ${act.shiftEnd || '18:00'})`;
          }
        } else if (
          ruleTitleLower.includes('nghỉ') ||
          ruleTitleLower.includes('off') ||
          ruleTitleLower.includes('vắng') ||
          act.targetType === 'staff_day_off'
        ) {
          type = 'URGENT_OFF';
          title = act.ruleTitle;
          description = act.dayOffNote || act.activityNote || act.dayOffReason || act.ruleTitle;
        } else {
          type = 'OTHER';
          title = act.ruleTitle;
          description = act.activityNote || act.ruleTitle;
        }

        const fineIdStr = fineUbt ? String(fineUbt.ubtId) : null;
        const refundInfo = fineIdStr ? refundByFineIdMap.get(fineIdStr) : null;
        const refundBananas = refundInfo ? Math.round(refundInfo.amount) : 0;
        const isForgiven = refundBananas >= finedBananas && finedBananas > 0;
        const effectiveFineBananas = isForgiven ? 0 : Math.max(0, finedBananas - refundBananas);

        if (isForgiven) {
          description = description
            ? `${description} · Đã hoàn trả +${refundBananas} chuối vào ví (Được miễn phạt / Sự cố)`
            : `Đã hoàn trả +${refundBananas} chuối vào ví (Được miễn phạt / Sự cố)`;
        }

        staffIncidentMap.get(uId)!.push({
          id: `sa-${act.activityId}`,
          date: act.incidentDate,
          type,
          title,
          description,
          scheduledTime,
          actualTime,
          diffMinutes,
          store: incidentStore,
          isFined: !isForgiven,
          finedBananas: effectiveFineBananas,
          fineTransactionId: fineUbt?.ubtId || null,
          fineDate: fineUbt?.dateCreated || act.dateCreated,
          isForgiven,
          refundBananas: isForgiven ? refundBananas : undefined,
          refundDate: isForgiven ? refundInfo?.date : undefined,
        });
      });

      // 5. Process remaining banana penalties from user_balance_transaction (excluding non-penalty order/redemption spendings)
      penaltyTransactions.forEach((ubt) => {
        const ubtIdStr = String(ubt.ubtId);
        if (usedUbtIds.has(ubtIdStr)) return;

        const tracking = String(ubt.trackingKey || '');
        if (tracking.includes('order_id') || tracking === '[]') return;

        const uId = Number(ubt.userId);
        if (!staffIncidentMap.has(uId)) staffIncidentMap.set(uId, []);

        const finedBananas = Math.abs(Number(ubt.amount));
        const staffProfile = filteredStaffProfiles.find((p) => Number(p.userId) === uId);

        const refundInfo = refundByFineIdMap.get(ubtIdStr);
        const refundBananas = refundInfo ? Math.round(refundInfo.amount) : 0;
        const isForgiven = refundBananas >= finedBananas && finedBananas > 0;
        const effectiveFineBananas = isForgiven ? 0 : Math.max(0, finedBananas - refundBananas);

        let description = ubt.description || 'Trừ chuối kỷ luật';
        if (isForgiven) {
          description = `${description} · Đã hoàn trả +${refundBananas} chuối vào ví (Được miễn phạt / Sự cố)`;
        }

        staffIncidentMap.get(uId)!.push({
          id: `fine-${ubt.ubtId}`,
          date: ubt.dateStr,
          type: 'OTHER',
          title: ubt.description || 'Phạt trừ ví chuối',
          description,
          scheduledTime: null,
          actualTime: null,
          diffMinutes: null,
          store: staffProfile?.store || 'DT',
          isFined: !isForgiven,
          finedBananas: effectiveFineBananas,
          fineTransactionId: ubt.ubtId,
          fineDate: ubt.dateCreated,
          isForgiven,
          refundBananas: isForgiven ? refundBananas : undefined,
          refundDate: isForgiven ? refundInfo?.date : undefined,
        });
      });

      // 7. Aggregate per staff
      let totalLateRecords = 0;
      let totalLateMinutes = 0;
      let totalEarlyRecords = 0;
      let totalEarlyMinutes = 0;
      let totalUrgentOffs = 0;
      let totalOtherPenalties = 0;
      let totalFinedBananas = 0;
      let totalStaffWithViolations = 0;

      const staffRecords: CvDisciplineStaffRecord[] = filteredStaffProfiles.map((p) => {
        const uId = Number(p.userId);
        const crmStaff = crmStaffMap.get(uId);
        const staffId = crmStaff ? Number(crmStaff.id) : uId;
        const avatar = crmStaff?.avatarUrl || p.avatar || null;
        const isCvPlus = crmStaff?.role === 'CVL' || crmStaff?.role === 'CVLL';

        const violations = (staffIncidentMap.get(uId) || []).sort((a, b) => b.date.localeCompare(a.date));

        let lateCount = 0;
        let lateMinutes = 0;
        let earlyCount = 0;
        let earlyMinutes = 0;
        let urgentOffCount = 0;
        let otherPenaltyCount = 0;
        let staffFinedBananas = 0;

        violations.forEach((v) => {
          // If the infraction is forgiven (ticket approved, penalty refunded), do NOT count towards disciplinary KPI
          if (v.isForgiven) return;

          if (v.type === 'LATE') {
            lateCount++;
            lateMinutes += v.diffMinutes || 0;
          } else if (v.type === 'EARLY') {
            earlyCount++;
            earlyMinutes += v.diffMinutes || 0;
          } else if (v.type === 'URGENT_OFF') {
            urgentOffCount++;
          } else {
            otherPenaltyCount++;
          }

          staffFinedBananas += v.finedBananas || 0;
        });

        const activeViolationsCount = violations.filter((v) => !v.isForgiven).length;
        if (activeViolationsCount > 0) totalStaffWithViolations++;

        totalLateRecords += lateCount;
        totalLateMinutes += lateMinutes;
        totalEarlyRecords += earlyCount;
        totalEarlyMinutes += earlyMinutes;
        totalUrgentOffs += urgentOffCount;
        totalOtherPenalties += otherPenaltyCount;
        totalFinedBananas += staffFinedBananas;

        return {
          staffId,
          legacyUserId: uId,
          staffName: crmStaff?.displayName || p.fullName || `CV #${uId}`,
          avatar,
          store: p.store,
          isCvPlus,
          lateCount,
          lateMinutes,
          earlyCount,
          earlyMinutes,
          urgentOffCount,
          otherPenaltyCount,
          finedBananaAmount: staffFinedBananas,
          totalViolations: activeViolationsCount,
          violations,
        };
      });

      // 8. Sort: CVs with most penalties/violations first
      staffRecords.sort((a, b) => {
        const weightA = a.finedBananaAmount * 10 + a.totalViolations * 5 + a.lateMinutes + a.earlyMinutes;
        const weightB = b.finedBananaAmount * 10 + b.totalViolations * 5 + b.lateMinutes + b.earlyMinutes;
        if (weightB !== weightA) return weightB - weightA;
        return a.staffName.localeCompare(b.staffName);
      });

      const summary: CvDisciplineSummary = {
        totalLateRecords,
        totalLateMinutes,
        totalEarlyRecords,
        totalEarlyMinutes,
        totalUrgentOffs,
        totalOtherPenalties,
        totalFinedBananas,
        totalStaffWithViolations,
        totalStaffCount: staffRecords.length,
      };

      const response: CvDisciplineResponse = {
        summary,
        data: staffRecords,
        dateFrom: startPart,
        dateTo: endPart,
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Failed to fetch CV discipline report');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy dữ liệu báo cáo kỷ luật CV.',
      });
    }
  });
}
