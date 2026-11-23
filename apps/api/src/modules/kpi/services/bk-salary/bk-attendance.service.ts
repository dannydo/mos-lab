import { FastifyInstance } from 'fastify';
import {
  SafeAny,
  TELESALES_ATTENDANCE_EXCEPTION_OPTIONS,
  TELESALES_EXECUTIVE_STANDARDS,
  TelesalesAttendanceExceptionAuditLog,
  TelesalesAttendanceExceptionItem,
  TelesalesAttendanceExceptionType,
} from '@mos-lab/shared';

export async function fetchBkAttendanceMap(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  bkStaffIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (bkStaffIds.length === 0) return map;

  const bkIdsStr = bkStaffIds.join(',');
  const sql = `
    SELECT 
      user_id as staffId,
      COUNT(DISTINCT CASE WHEN (check_in_date IS NOT NULL OR working_minute > 0) THEN \`date\` END) as checkinDays
    FROM \`report_staff\`
    WHERE user_id IN (${bkIdsStr})
      AND \`date\` >= '${startPart}' AND \`date\` <= '${endPart}'
    GROUP BY user_id
  `;

  try {
    const rows =
      await fastify.prisma.legacy.$queryRawUnsafe<Array<{ staffId: number | bigint; checkinDays: number | bigint }>>(
        sql
      );
    for (const r of rows) {
      map.set(Number(r.staffId), Number(r.checkinDays || 0));
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching BK attendance from report_staff');
  }

  return map;
}

export async function isStaffTelesalesExecutive(fastify: FastifyInstance, staffId: number): Promise<boolean> {
  try {
    if (fastify.prisma?.crm?.crmStaff) {
      const staff = await fastify.prisma.crm.crmStaff.findFirst({
        where: {
          isActive: true,
          OR: [{ legacyStaffId: staffId }, { id: staffId }],
        },
        select: { id: true, role: true, legacyStaffId: true },
      });
      if (staff) {
        const r = (staff.role || '').toLowerCase();
        if (
          r === 'telesales' ||
          r === 'telesales executive' ||
          r === TELESALES_EXECUTIVE_STANDARDS.roleKey ||
          r === TELESALES_EXECUTIVE_STANDARDS.roleName.toLowerCase()
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`[isStaffTelesalesExecutive] Error checking crmStaff for staffId ${staffId}: ${err}`);
  }

  try {
    if (fastify.prisma?.crm?.crmTeamMember) {
      const member = await fastify.prisma.crm.crmTeamMember.findFirst({
        where: {
          legacyStaffId: staffId,
          isActive: true,
          team: {
            code: { in: ['BK_TELESALES', 'BK', 'TELESALES'] },
          },
        },
      });
      if (member) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export async function canUserManageTelesalesAttendance(
  fastify: FastifyInstance,
  user: { id: number; role: string; username?: string },
  targetStaffId?: number
): Promise<boolean> {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();

  // 1. Admin or Super Admin
  if (role === 'admin' || role === 'super_admin') {
    return true;
  }

  // 2. Manager
  if (role === 'manager') {
    if (!targetStaffId) return true;
    const isTelesales = await isStaffTelesalesExecutive(fastify, targetStaffId);
    return isTelesales;
  }

  return false;
}

export async function fetchTelesalesAttendanceExceptions(
  fastify: FastifyInstance,
  staffId: number,
  startDateStr: string,
  endDateStr: string
): Promise<Map<string, TelesalesAttendanceExceptionItem>> {
  const map = new Map<string, TelesalesAttendanceExceptionItem>();
  try {
    if (fastify.prisma?.crm?.crmTelesalesAttendanceException) {
      const rows = await fastify.prisma.crm.crmTelesalesAttendanceException.findMany({
        where: {
          staffId,
          workDate: {
            gte: startDateStr,
            lte: endDateStr,
          },
        },
      });
      for (const r of rows) {
        map.set(r.workDate, {
          id: r.id,
          staffId: r.staffId,
          workDate: r.workDate,
          exceptionType: r.exceptionType as TelesalesAttendanceExceptionType,
          workCredit: Number(r.workCredit),
          reason: r.reason,
          manualInTime: r.manualInTime,
          manualOutTime: r.manualOutTime,
          note: r.note,
          approvedByStaffId: r.approvedByStaffId,
          approvedByName: r.approvedByName,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        });
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`[fetchTelesalesAttendanceExceptions] Error: ${err}`);
  }
  return map;
}

export async function fetchTelesalesAttendanceAuditLogs(
  fastify: FastifyInstance,
  staffId?: number,
  startDateStr?: string,
  endDateStr?: string
): Promise<TelesalesAttendanceExceptionAuditLog[]> {
  try {
    if (fastify.prisma?.crm?.crmTelesalesAttendanceExceptionLog) {
      const where: SafeAny = {};
      if (staffId) where.staffId = staffId;
      if (startDateStr || endDateStr) {
        where.workDate = {};
        if (startDateStr) where.workDate.gte = startDateStr;
        if (endDateStr) where.workDate.lte = endDateStr;
      }
      const logs = await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return logs.map((l) => ({
        id: l.id,
        exceptionId: l.exceptionId,
        staffId: l.staffId,
        workDate: l.workDate,
        action: l.action as 'CREATE' | 'UPDATE' | 'DELETE',
        previousType: l.previousType,
        newType: l.newType,
        previousCredit: l.previousCredit !== null ? Number(l.previousCredit) : null,
        newCredit: l.newCredit !== null ? Number(l.newCredit) : null,
        reason: l.reason,
        manualInTime: l.manualInTime,
        manualOutTime: l.manualOutTime,
        note: l.note,
        performedByStaffId: l.performedByStaffId,
        performedByName: l.performedByName,
        createdAt: l.createdAt.toISOString(),
      }));
    }
  } catch (err) {
    fastify.log?.warn?.(`[fetchTelesalesAttendanceAuditLogs] Error: ${err}`);
  }
  return [];
}

export async function upsertTelesalesAttendanceException(
  fastify: FastifyInstance,
  params: {
    staffId: number;
    workDate: string;
    exceptionType: TelesalesAttendanceExceptionType | 'CLEAR';
    reason?: string;
    manualInTime?: string;
    manualOutTime?: string;
    note?: string;
    performedByStaffId?: number;
    performedByName?: string;
  }
): Promise<{ success: boolean; message: string; exception?: TelesalesAttendanceExceptionItem | null }> {
  const {
    staffId,
    workDate,
    exceptionType,
    reason,
    manualInTime,
    manualOutTime,
    note,
    performedByStaffId,
    performedByName,
  } = params;

  // 1. Verify staff is Telesales Executive
  const isTelesales = await isStaffTelesalesExecutive(fastify, staffId);
  if (!isTelesales) {
    throw new Error('Chức năng ngoại lệ chấm công chỉ áp dụng cho nhân viên có vai trò Telesales Executive.');
  }

  // 2. Find existing exception if any
  const existing = await fastify.prisma.crm.crmTelesalesAttendanceException.findUnique({
    where: { staffId_workDate: { staffId, workDate } },
  });

  if (exceptionType === 'CLEAR') {
    if (!existing) {
      return { success: true, message: 'Không có ngoại lệ để xóa.', exception: null };
    }
    await fastify.prisma.crm.crmTelesalesAttendanceException.delete({
      where: { id: existing.id },
    });

    await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.create({
      data: {
        exceptionId: existing.id,
        staffId,
        workDate,
        action: 'DELETE',
        previousType: existing.exceptionType,
        newType: null,
        previousCredit: Number(existing.workCredit),
        newCredit: null,
        reason: reason?.trim() || 'Hủy ngoại lệ chấm công',
        manualInTime: null,
        manualOutTime: null,
        note: null,
        performedByStaffId,
        performedByName: performedByName || 'Quản lý',
      },
    });

    return { success: true, message: 'Đã hủy ngoại lệ chấm công thành công.', exception: null };
  }

  // Validate mandatory reason (Requirement 5)
  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 3) {
    throw new Error('Bắt buộc nhập lý do khi duyệt ngoại lệ chấm công (tối thiểu 3 ký tự).');
  }

  // Validate manual checkin/checkout times for MANUAL_CHECKIN_OUT (MOS-BUG-91)
  const trimmedIn = manualInTime?.trim();
  const trimmedOut = manualOutTime?.trim();
  const trimmedNote = note?.trim();

  if (exceptionType === 'MANUAL_CHECKIN_OUT') {
    if (!trimmedIn) {
      throw new Error('Bắt buộc nhập giờ IN thủ công khi duyệt trường hợp Bổ sung IN/OUT.');
    }
    if (!trimmedOut) {
      throw new Error('Bắt buộc nhập giờ OUT thủ công khi duyệt trường hợp Bổ sung IN/OUT.');
    }
  }

  const opt = TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[exceptionType];
  if (!opt) {
    throw new Error(`Loại ngoại lệ ${exceptionType} không hợp lệ.`);
  }

  const workCredit = opt.workCredit;

  let resultException: TelesalesAttendanceExceptionItem;
  if (existing) {
    const updated = await fastify.prisma.crm.crmTelesalesAttendanceException.update({
      where: { id: existing.id },
      data: {
        exceptionType,
        workCredit,
        reason: trimmedReason,
        manualInTime: trimmedIn || null,
        manualOutTime: trimmedOut || null,
        note: trimmedNote || null,
        approvedByStaffId: performedByStaffId,
        approvedByName: performedByName,
      },
    });
    resultException = {
      id: updated.id,
      staffId: updated.staffId,
      workDate: updated.workDate,
      exceptionType: updated.exceptionType as TelesalesAttendanceExceptionType,
      workCredit: Number(updated.workCredit),
      reason: updated.reason,
      manualInTime: updated.manualInTime,
      manualOutTime: updated.manualOutTime,
      note: updated.note,
      approvedByStaffId: updated.approvedByStaffId,
      approvedByName: updated.approvedByName,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.create({
      data: {
        exceptionId: existing.id,
        staffId,
        workDate,
        action: 'UPDATE',
        previousType: existing.exceptionType,
        newType: exceptionType,
        previousCredit: Number(existing.workCredit),
        newCredit: workCredit,
        reason: trimmedReason,
        manualInTime: trimmedIn || null,
        manualOutTime: trimmedOut || null,
        note: trimmedNote || null,
        performedByStaffId,
        performedByName: performedByName || 'Quản lý',
      },
    });
  } else {
    const created = await fastify.prisma.crm.crmTelesalesAttendanceException.create({
      data: {
        staffId,
        workDate,
        exceptionType,
        workCredit,
        reason: trimmedReason,
        manualInTime: trimmedIn || null,
        manualOutTime: trimmedOut || null,
        note: trimmedNote || null,
        approvedByStaffId: performedByStaffId,
        approvedByName: performedByName,
      },
    });
    resultException = {
      id: created.id,
      staffId: created.staffId,
      workDate: created.workDate,
      exceptionType: created.exceptionType as TelesalesAttendanceExceptionType,
      workCredit: Number(created.workCredit),
      reason: created.reason,
      manualInTime: created.manualInTime,
      manualOutTime: created.manualOutTime,
      note: created.note,
      approvedByStaffId: created.approvedByStaffId,
      approvedByName: created.approvedByName,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.create({
      data: {
        exceptionId: created.id,
        staffId,
        workDate,
        action: 'CREATE',
        previousType: null,
        newType: exceptionType,
        previousCredit: null,
        newCredit: workCredit,
        reason: trimmedReason,
        manualInTime: trimmedIn || null,
        manualOutTime: trimmedOut || null,
        note: trimmedNote || null,
        performedByStaffId,
        performedByName: performedByName || 'Quản lý',
      },
    });
  }

  return {
    success: true,
    message: `Đã duyệt ngoại lệ [${opt.shortLabel}] cho ngày ${workDate}.`,
    exception: resultException,
  };
}

export async function fetchBkExceptionAdjustedAttendanceMap(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  staffIds: number[],
  baseAttendanceMap: Map<number, number>
): Promise<Map<number, number>> {
  const adjustedMap = new Map<number, number>(baseAttendanceMap);
  if (staffIds.length === 0) return adjustedMap;

  try {
    if (fastify.prisma?.crm?.crmTelesalesAttendanceException) {
      const exceptions = await fastify.prisma.crm.crmTelesalesAttendanceException.findMany({
        where: {
          staffId: { in: staffIds },
          workDate: { gte: startPart, lte: endPart },
        },
      });

      if (exceptions.length === 0) return adjustedMap;

      const exceptionsByStaff = new Map<number, Array<{ workDate: string; workCredit: number }>>();
      for (const ex of exceptions) {
        const list = exceptionsByStaff.get(ex.staffId) || [];
        list.push({ workDate: ex.workDate, workCredit: Number(ex.workCredit) });
        exceptionsByStaff.set(ex.staffId, list);
      }

      for (const [sid, exList] of exceptionsByStaff.entries()) {
        const rows = await fastify.prisma.legacy
          .$queryRawUnsafe<Array<{ workDate: string; isCheckIn: number }>>(
            `
          SELECT 
            DATE_FORMAT(\`date\`, '%Y-%m-%d') as workDate,
            MAX(CASE WHEN (check_in_date IS NOT NULL OR working_minute > 0) THEN 1 ELSE 0 END) as isCheckIn
          FROM \`report_staff\`
          WHERE user_id = ${sid}
            AND \`date\` >= '${startPart}' AND \`date\` <= '${endPart}'
          GROUP BY \`date\`
        `
          )
          .catch(() => []);

        const checkinMap = new Map<string, number>();
        for (const r of rows) {
          checkinMap.set(String(r.workDate), Number(r.isCheckIn || 0));
        }

        const exMap = new Map<string, number>();
        for (const ex of exList) {
          exMap.set(ex.workDate, ex.workCredit);
        }

        const allDates = new Set<string>([...checkinMap.keys(), ...exMap.keys()]);
        let totalCredit = 0;
        for (const date of allDates) {
          if (exMap.has(date)) {
            totalCredit += exMap.get(date)!;
          } else {
            totalCredit += (checkinMap.get(date) || 0) > 0 ? 1.0 : 0.0;
          }
        }

        adjustedMap.set(sid, Number(totalCredit.toFixed(1)));
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`[fetchBkExceptionAdjustedAttendanceMap] Error adjusting attendance: ${err}`);
  }

  return adjustedMap;
}
