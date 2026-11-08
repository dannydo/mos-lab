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
      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          up.user_id as userId,
          up.full_name as fullName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
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

      // 3. Parallel queries for attendance, shifts, urgent off leaves, and banana penalty transactions
      const [crmStaffs, reportStaffRows, shiftRows, dayOffRows, penaltyTransactions] = await Promise.all([
        fastify.prisma.crm.crmStaff.findMany({
          where: { legacyStaffId: { in: validStaffIds } },
          select: { id: true, legacyStaffId: true, role: true, avatarUrl: true, displayName: true },
        }),
        // Attendance records with late check-in or early check-out
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            rs.id as reportStaffId,
            rs.user_id as userId,
            DATE_FORMAT(rs.date, '%Y-%m-%d') as date,
            MIN(TIME_FORMAT(rs.check_in_date, '%H:%i:%s')) as checkInTime,
            MAX(TIME_FORMAT(rs.check_out_date, '%H:%i:%s')) as checkOutTime,
            TIME_FORMAT(rs.working_shift_start_time, '%H:%i') as shiftStart,
            TIME_FORMAT(rs.working_shift_end_time, '%H:%i') as shiftEnd,
            MIN(rs.check_in_minute_diff) as checkInDiff,
            MIN(rs.check_out_minute_diff) as checkOutDiff,
            UPPER(COALESCE(MAX(cs.client_store_key), 'PXL')) as store
          FROM \`report_staff\` rs
          LEFT JOIN \`client_store\` cs ON cs.id = rs.client_store_id
          WHERE rs.user_id IN (${validStaffListStr})
            AND rs.date >= '${startPart}'
            AND rs.date <= '${endPart}'
            AND (rs.check_in_minute_diff < 0 OR rs.check_out_minute_diff < 0)
          GROUP BY rs.id, rs.user_id, rs.date, rs.working_shift_start_time, rs.working_shift_end_time
          ORDER BY rs.date DESC, rs.id DESC
        `),
        // Staff working shifts for time mapping and join with penalties
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            sws.id as shiftId,
            sws.user_id as userId,
            DATE_FORMAT(sws.date, '%Y-%m-%d') as date,
            TIME_FORMAT(sws.start_time, '%H:%i') as startTime,
            TIME_FORMAT(sws.end_time, '%H:%i') as endTime
          FROM \`staff_working_shift\` sws
          WHERE sws.user_id IN (${validStaffListStr})
            AND sws.date >= '${startPart}'
            AND sws.date <= '${endPart}'
        `),
        // Day off records with urgent reason or urgent attribute
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            sdo.id as dayOffId,
            sdo.from_user_id as userId,
            DATE_FORMAT(sdo.from_date, '%Y-%m-%d') as date,
            sdo.attribute_option_id as attributeOptionId,
            sdo.note,
            sdo.request_state as requestState,
            UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
          FROM \`staff_day_off\` sdo
          LEFT JOIN \`client_store\` cs ON cs.id = sdo.client_store_id
          WHERE sdo.from_user_id IN (${validStaffListStr})
            AND sdo.from_date >= '${startPart}'
            AND sdo.from_date <= '${endPart}'
            AND sdo.request_state IN ('Approved', 'Submitted', 'Pending')
            AND (
              sdo.attribute_option_id = 113
              OR LOWER(COALESCE(sdo.note, '')) REGEXP 'gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu'
            )
          ORDER BY sdo.from_date DESC
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
      ]);

      // Maps for fast lookups
      const crmStaffMap = new Map<number, SafeAny>();
      crmStaffs.forEach((cs) => {
        if (cs.legacyStaffId) crmStaffMap.set(Number(cs.legacyStaffId), cs);
      });

      // Shift map: userId -> date -> sws
      const shiftMap = new Map<string, SafeAny>();
      const shiftIdToShift = new Map<number, SafeAny>();
      shiftRows.forEach((s) => {
        const key = `${s.userId}-${s.date}`;
        shiftMap.set(key, s);
        shiftIdToShift.set(Number(s.shiftId), s);
      });

      // Penalty mapping
      const shiftPenalties = new Map<number, SafeAny[]>(); // shiftId -> ubt[]
      const dayOffPenalties = new Map<number, SafeAny[]>(); // dayOffId -> ubt[]
      const dateUserPenalties = new Map<string, SafeAny[]>(); // `${userId}-${dateStr}` -> ubt[]
      const userPenalties = new Map<number, SafeAny[]>(); // userId -> ubt[]
      const usedUbtIds = new Set<string>();

      penaltyTransactions.forEach((ubt) => {
        const uId = Number(ubt.userId);
        const itId = Number(ubt.itemId);
        const type = String(ubt.itemType || '');

        if (!userPenalties.has(uId)) userPenalties.set(uId, []);
        userPenalties.get(uId)!.push(ubt);

        const dateKey = `${uId}-${ubt.dateStr}`;
        if (!dateUserPenalties.has(dateKey)) dateUserPenalties.set(dateKey, []);
        dateUserPenalties.get(dateKey)!.push(ubt);

        if (type === 'staff_working_shift' && itId > 0) {
          if (!shiftPenalties.has(itId)) shiftPenalties.set(itId, []);
          shiftPenalties.get(itId)!.push(ubt);
        } else if (type === 'staff_day_off' && itId > 0) {
          if (!dayOffPenalties.has(itId)) dayOffPenalties.set(itId, []);
          dayOffPenalties.get(itId)!.push(ubt);
        }
      });

      // Group incidents by staff
      const staffIncidentMap = new Map<number, CvDisciplineIncident[]>();

      // 4. Process Report Staff rows (Đi trễ & Về sớm)
      reportStaffRows.forEach((rs) => {
        const uId = Number(rs.userId);
        if (!staffIncidentMap.has(uId)) staffIncidentMap.set(uId, []);

        const shiftKey = `${uId}-${rs.date}`;
        const matchedShift = shiftMap.get(shiftKey);
        const shiftId = matchedShift ? Number(matchedShift.shiftId) : null;

        const scheduledStart = rs.shiftStart || matchedShift?.startTime || '08:00';
        const scheduledEnd = rs.shiftEnd || matchedShift?.endTime || '17:00';
        const scheduledTimeStr = `${scheduledStart} - ${scheduledEnd}`;

        // Check LATE
        const checkInDiff = rs.checkInDiff !== null && rs.checkInDiff !== undefined ? Number(rs.checkInDiff) : 0;
        if (checkInDiff < 0) {
          const lateMins = Math.abs(checkInDiff);
          let fineUbt: SafeAny = null;

          if (shiftId && shiftPenalties.has(shiftId)) {
            const list = shiftPenalties.get(shiftId)!;
            fineUbt = list.find((p) => !usedUbtIds.has(String(p.ubtId)));
          }
          if (!fineUbt) {
            const dateList = dateUserPenalties.get(`${uId}-${rs.date}`) || [];
            fineUbt = dateList.find(
              (p) => !usedUbtIds.has(String(p.ubtId)) && (p.itemType === 'staff_working_shift' || !p.itemType)
            );
          }

          if (fineUbt) usedUbtIds.add(String(fineUbt.ubtId));

          const finedBananas = fineUbt ? Math.abs(Number(fineUbt.amount)) : 0;

          staffIncidentMap.get(uId)!.push({
            id: `late-${rs.reportStaffId}`,
            date: rs.date,
            type: 'LATE',
            title: `Đi trễ ${lateMins} phút`,
            description: `Vào ca lúc ${rs.checkInTime || 'chưa ghi nhận'} (lịch vào ca: ${scheduledStart})`,
            scheduledTime: scheduledTimeStr,
            actualTime: rs.checkInTime ? `Check-in: ${rs.checkInTime}` : 'Trễ ca',
            diffMinutes: lateMins,
            store: rs.store,
            isFined: finedBananas > 0,
            finedBananas,
            fineTransactionId: fineUbt?.ubtId || null,
            fineDate: fineUbt?.dateCreated || null,
          });
        }

        // Check EARLY
        const checkOutDiff = rs.checkOutDiff !== null && rs.checkOutDiff !== undefined ? Number(rs.checkOutDiff) : 0;
        if (checkOutDiff < 0) {
          const earlyMins = Math.abs(checkOutDiff);
          let fineUbt: SafeAny = null;

          if (shiftId && shiftPenalties.has(shiftId)) {
            const list = shiftPenalties.get(shiftId)!;
            fineUbt = list.find((p) => !usedUbtIds.has(String(p.ubtId)));
          }
          if (!fineUbt) {
            const dateList = dateUserPenalties.get(`${uId}-${rs.date}`) || [];
            fineUbt = dateList.find(
              (p) => !usedUbtIds.has(String(p.ubtId)) && (p.itemType === 'staff_working_shift' || !p.itemType)
            );
          }

          if (fineUbt) usedUbtIds.add(String(fineUbt.ubtId));

          const finedBananas = fineUbt ? Math.abs(Number(fineUbt.amount)) : 0;

          staffIncidentMap.get(uId)!.push({
            id: `early-${rs.reportStaffId}`,
            date: rs.date,
            type: 'EARLY',
            title: `Về sớm ${earlyMins} phút`,
            description: `Ra ca lúc ${rs.checkOutTime || 'chưa ghi nhận'} (lịch kết thúc: ${scheduledEnd})`,
            scheduledTime: scheduledTimeStr,
            actualTime: rs.checkOutTime ? `Check-out: ${rs.checkOutTime}` : 'Về sớm',
            diffMinutes: earlyMins,
            store: rs.store,
            isFined: finedBananas > 0,
            finedBananas,
            fineTransactionId: fineUbt?.ubtId || null,
            fineDate: fineUbt?.dateCreated || null,
          });
        }
      });

      // 5. Process Day Off rows (Off gấp)
      dayOffRows.forEach((sdo) => {
        const uId = Number(sdo.userId);
        if (!staffIncidentMap.has(uId)) staffIncidentMap.set(uId, []);

        const doId = Number(sdo.dayOffId);
        let fineUbt: SafeAny = null;

        if (dayOffPenalties.has(doId)) {
          const list = dayOffPenalties.get(doId)!;
          fineUbt = list.find((p) => !usedUbtIds.has(String(p.ubtId)));
        }
        if (!fineUbt) {
          const dateList = dateUserPenalties.get(`${uId}-${sdo.date}`) || [];
          fineUbt = dateList.find((p) => !usedUbtIds.has(String(p.ubtId)) && p.itemType === 'staff_day_off');
        }

        if (fineUbt) usedUbtIds.add(String(fineUbt.ubtId));

        const finedBananas = fineUbt ? Math.abs(Number(fineUbt.amount)) : 0;

        staffIncidentMap.get(uId)!.push({
          id: `urgent-off-${sdo.dayOffId}`,
          date: sdo.date,
          type: 'URGENT_OFF',
          title: 'Off gấp / Nghỉ đột xuất',
          description: sdo.note ? `Lý do: ${sdo.note}` : 'Xin nghỉ việc khẩn cấp / đột xuất',
          scheduledTime: null,
          actualTime: null,
          diffMinutes: null,
          store: sdo.store,
          isFined: finedBananas > 0,
          finedBananas,
          fineTransactionId: fineUbt?.ubtId || null,
          fineDate: fineUbt?.dateCreated || null,
        });
      });

      // 6. Process unused banana penalties (Tác phong, 5S, nội quy salon khác)
      penaltyTransactions.forEach((ubt) => {
        const ubtIdStr = String(ubt.ubtId);
        if (usedUbtIds.has(ubtIdStr)) return;

        const uId = Number(ubt.userId);
        if (!staffIncidentMap.has(uId)) staffIncidentMap.set(uId, []);

        const finedBananas = Math.abs(Number(ubt.amount));
        const itemType = String(ubt.itemType || '');
        const title =
          itemType === 'staff_activity'
            ? 'Phạt tác phong làm việc'
            : itemType === 'staff_task'
              ? 'Phạt vi phạm nhiệm vụ / 5S'
              : 'Phạt trừ ví chuối';

        const description = ubt.description || (itemType ? `Vi phạm ${itemType}` : 'Trừ chuối kỷ luật');

        staffIncidentMap.get(uId)!.push({
          id: `fine-${ubt.ubtId}`,
          date: ubt.dateStr,
          type: 'OTHER',
          title,
          description,
          scheduledTime: null,
          actualTime: null,
          diffMinutes: null,
          store: 'PXL', // Default fallback
          isFined: true,
          finedBananas,
          fineTransactionId: ubt.ubtId,
          fineDate: ubt.dateCreated,
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

        const totalViolations = violations.length;
        if (totalViolations > 0) totalStaffWithViolations++;

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
          totalViolations,
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
