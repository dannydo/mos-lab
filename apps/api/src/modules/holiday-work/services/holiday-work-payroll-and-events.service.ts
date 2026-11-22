import type { FastifyInstance } from 'fastify';
import {
  type CreateHolidayPayrollAdjustmentRequest,
  type CreateStaffPerformanceEventRequest,
  type HolidayPayBasis,
  type HolidayPayBreakdown,
  type HolidayPayrollLedgerEntry,
  type HolidayRosterStatus,
  type SafeAny,
  type StaffPerformanceEventListResponse,
  type StaffPerformanceEventQuery,
} from '@mos-lab/shared';
import { StaffOffDayService } from '../../staff/services/staff-off-day.service.js';
import {
  type Actor,
  EMPTY_BREAKDOWN,
  HOLIDAY_CALCULATION_VERSION,
  HolidayWorkError,
  calculateHolidayPayroll,
  clamp,
  dateKey,
  roundHours,
  roundMoney,
  toDbDate,
} from './holiday-work-calendar-and-calc.js';
import {
  isHolidayAdmin,
  mapAdjustment,
  mapLedger,
  mapPerformanceEvent,
  writeHolidayAudit,
} from './holiday-work-mappers.js';
import { getWorkspace } from './holiday-work-planning.service.js';

export async function detectUnplannedAttendance(fastify: FastifyInstance, period: SafeAny, actor: Actor) {
  const attendanceRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT rs.user_id AS legacyStaffId,
            DATE_FORMAT(rs.date, '%Y-%m-%d') AS workDate,
            SUM(rs.working_minute) AS workingMinute,
            up.full_name AS displayName,
            up.client_store_id AS storeId,
            UPPER(COALESCE(cs.client_store_key, 'UNASSIGNED')) AS storeKey
     FROM report_staff rs
     JOIN user_profile up ON up.user_id = rs.user_id
     LEFT JOIN client_store cs ON cs.id = up.client_store_id
     WHERE rs.date >= ? AND rs.date <= ? AND rs.working_minute > 0
     GROUP BY rs.user_id, rs.date, up.full_name, up.client_store_id, cs.client_store_key`,
    dateKey(period.startDate),
    dateKey(period.endDate)
  );
  if (attendanceRows.length === 0) return;
  const existing = await fastify.prisma.crm.crmHolidayRoster.findMany({ where: { holidayId: period.id } });
  const existingKeys = new Set(existing.map((entry) => `${dateKey(entry.workDate)}:${entry.legacyStaffId}`));
  const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
    where: { legacyStaffId: { in: attendanceRows.map((row) => Number(row.legacyStaffId)) } },
    select: { id: true, legacyStaffId: true },
  });
  const crmByLegacy = new Map(crmStaffs.map((staff) => [Number(staff.legacyStaffId), staff.id]));
  const teamMembers = await fastify.prisma.crm.crmTeamMember.findMany({
    where: { legacyStaffId: { in: attendanceRows.map((row) => Number(row.legacyStaffId)) }, isActive: true },
    include: { team: { select: { code: true } } },
  });
  const teamByLegacy = new Map(teamMembers.map((member) => [member.legacyStaffId, member.team.code]));
  for (const row of attendanceRows) {
    const legacyStaffId = Number(row.legacyStaffId);
    const workDate = String(row.workDate);
    if (existingKeys.has(`${workDate}:${legacyStaffId}`)) continue;
    const created = await fastify.prisma.crm.crmHolidayRoster.create({
      data: {
        holidayId: period.id,
        rosterKey: `${workDate}:staff:${legacyStaffId}`,
        workDate: toDbDate(workDate),
        crmStaffId: crmByLegacy.get(legacyStaffId) || null,
        legacyStaffId,
        displayName: String(row.displayName || `Staff #${legacyStaffId}`),
        teamCode: teamByLegacy.get(legacyStaffId) || 'UNASSIGNED',
        storeId: row.storeId ? Number(row.storeId) : null,
        storeKey: String(row.storeKey || 'UNASSIGNED'),
        shiftStart: '09:00',
        shiftEnd: '18:00',
        status: 'PAYROLL_EXCEPTION',
        decisionReason: 'Có chấm công nhưng không có trong roster đã lập.',
        scheduledByStaffId: actor.id,
      },
    });
    await writeHolidayAudit(fastify, {
      holidayId: period.id,
      action: 'DETECT_UNPLANNED_ATTENDANCE',
      entityType: 'HOLIDAY_ROSTER',
      entityId: created.id,
      actorStaffId: actor.id,
      reason: created.decisionReason,
      after: created,
    });
  }
}

export async function recalculateLedger(fastify: FastifyInstance, holidayId: number, actor: Actor) {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
    where: { id: holidayId },
    include: { roster: true },
  });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status === 'PAYROLL_LOCKED') throw new HolidayWorkError('Kỳ lương đã khóa; không thể tính lại.', 409);
  await detectUnplannedAttendance(fastify, period, actor);
  const roster = await fastify.prisma.crm.crmHolidayRoster.findMany({ where: { holidayId } });
  const legacyStaffIds = [
    ...new Set(roster.map((entry) => entry.legacyStaffId).filter((id): id is number => Boolean(id))),
  ];
  const attendanceRows = legacyStaffIds.length
    ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id AS legacyStaffId,
                DATE_FORMAT(date, '%Y-%m-%d') AS workDate,
                SUM(working_minute) AS workingMinute
         FROM report_staff
         WHERE user_id IN (${legacyStaffIds.map(() => '?').join(',')})
           AND date >= ? AND date <= ? AND working_minute > 0
         GROUP BY user_id, date`,
        ...legacyStaffIds,
        dateKey(period.startDate),
        dateKey(period.endDate)
      )
    : [];
  const rateRows = legacyStaffIds.length
    ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id AS legacyStaffId, working_hour_rate AS hourlyRate, date, id
         FROM staff_payroll
         WHERE user_id IN (${legacyStaffIds.map(() => '?').join(',')})
           AND date <= ? AND working_hour_rate > 0
         ORDER BY user_id ASC, date DESC, id DESC`,
        ...legacyStaffIds,
        dateKey(period.endDate)
      )
    : [];
  const crmStaffIds = roster.map((entry) => entry.crmStaffId).filter((id): id is number => Boolean(id));
  const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
    where: {
      OR: [
        ...(crmStaffIds.length ? [{ id: { in: crmStaffIds } }] : []),
        ...(legacyStaffIds.length ? [{ legacyStaffId: { in: legacyStaffIds } }] : []),
      ],
    },
    select: { id: true, legacyStaffId: true, payBasis: true, baseSalary: true, hourlyWage: true },
  });
  const staffByCrmId = new Map(crmStaffs.map((staff) => [staff.id, staff]));
  const staffByLegacyId = new Map(crmStaffs.map((staff) => [Number(staff.legacyStaffId), staff]));
  const attendanceByStaffDay = new Map(
    attendanceRows.map((row) => [`${Number(row.legacyStaffId)}:${row.workDate}`, Number(row.workingMinute || 0)])
  );
  const ratesByLegacyId = new Map<number, Array<{ effectiveDate: string; hourlyRate: number }>>();
  rateRows.forEach((row) => {
    const id = Number(row.legacyStaffId);
    const rates = ratesByLegacyId.get(id) || [];
    rates.push({ effectiveDate: dateKey(row.date), hourlyRate: Number(row.hourlyRate || 0) });
    ratesByLegacyId.set(id, rates);
  });
  const offDayMap = await StaffOffDayService.getBatchStaffOffDays(fastify, legacyStaffIds, {
    dateFrom: dateKey(period.startDate),
    dateTo: dateKey(period.endDate),
  });
  const savedRows: HolidayPayrollLedgerEntry[] = [];

  for (const entry of roster) {
    const workDate = dateKey(entry.workDate);
    const staff = entry.crmStaffId
      ? staffByCrmId.get(entry.crmStaffId)
      : entry.legacyStaffId
        ? staffByLegacyId.get(entry.legacyStaffId)
        : undefined;
    const payBasis = (staff?.payBasis as HolidayPayBasis | null) || null;
    const hourlyRate =
      payBasis === 'MONTHLY'
        ? staff?.baseSalary && period.monthlyStandardHours > 0
          ? roundMoney(Number(staff.baseSalary) / period.monthlyStandardHours)
          : 0
        : entry.legacyStaffId
          ? ratesByLegacyId.get(entry.legacyStaffId)?.find((rate) => rate.effectiveDate <= workDate)?.hourlyRate ||
            roundMoney(Number(staff?.hourlyWage || 0))
          : roundMoney(Number(staff?.hourlyWage || 0));
    const approvedLeave = Boolean(
      entry.legacyStaffId && offDayMap.get(entry.legacyStaffId)?.approvedOffDates.includes(workDate)
    );
    const actualMinutes = entry.legacyStaffId ? attendanceByStaffDay.get(`${entry.legacyStaffId}:${workDate}`) || 0 : 0;
    const attendanceSource = approvedLeave
      ? 'STAFF_DAY_OFF_APPROVED'
      : entry.status === 'SCHEDULED' || actualMinutes > 0
        ? 'REPORT_STAFF_WORKING_MINUTE'
        : 'HOLIDAY_ROSTER_POLICY';
    const calculation = calculateHolidayPayroll({
      rosterStatus: entry.status as HolidayRosterStatus,
      payBasis,
      hourlyRate,
      actualMinutes,
      standardShiftHours: period.standardShiftHours,
      paidLeaveMultiplier: period.paidLeaveMultiplier,
      workPremiumMultiplier: period.workPremiumMultiplier,
      approvedLeave,
    });
    await fastify.prisma.crm.crmHolidayRoster.update({
      where: { id: entry.id },
      data: { isApprovedLeave: approvedLeave },
    });
    const saved = await fastify.prisma.crm.crmHolidayPayrollLedger.upsert({
      where: { rosterId: entry.id },
      create: {
        holidayId,
        rosterId: entry.id,
        workDate: entry.workDate,
        crmStaffId: entry.crmStaffId,
        legacyStaffId: entry.legacyStaffId,
        displayName: entry.displayName,
        teamCode: entry.teamCode,
        storeKey: entry.storeKey,
        rosterStatus: entry.status,
        payBasis,
        ledgerStatus: calculation.ledgerStatus,
        attendanceSource,
        actualMinutes,
        actualHours: calculation.actualHours,
        standardShiftHours: period.standardShiftHours,
        hourlyRate,
        baseHolidayAmount: calculation.baseHolidayAmount,
        holidayPremiumAmount: calculation.holidayPremiumAmount,
        holidayTotalValue: calculation.holidayTotalValue,
        payrollAdditionAmount: calculation.payrollAdditionAmount,
        baseIncludedInMonthlySalary: calculation.baseIncludedInMonthlySalary,
        exceptionCode: calculation.exceptionCode,
        exceptionMessage: calculation.exceptionMessage,
        calculationVersion: HOLIDAY_CALCULATION_VERSION,
      },
      update: {
        crmStaffId: entry.crmStaffId,
        legacyStaffId: entry.legacyStaffId,
        displayName: entry.displayName,
        teamCode: entry.teamCode,
        storeKey: entry.storeKey,
        rosterStatus: entry.status,
        payBasis,
        ledgerStatus: calculation.ledgerStatus,
        attendanceSource,
        actualMinutes,
        actualHours: calculation.actualHours,
        standardShiftHours: period.standardShiftHours,
        hourlyRate,
        baseHolidayAmount: calculation.baseHolidayAmount,
        holidayPremiumAmount: calculation.holidayPremiumAmount,
        holidayTotalValue: calculation.holidayTotalValue,
        payrollAdditionAmount: calculation.payrollAdditionAmount,
        baseIncludedInMonthlySalary: calculation.baseIncludedInMonthlySalary,
        exceptionCode: calculation.exceptionCode,
        exceptionMessage: calculation.exceptionMessage,
        calculationVersion: HOLIDAY_CALCULATION_VERSION,
      },
    });
    savedRows.push(mapLedger(saved));
  }
  await writeHolidayAudit(fastify, {
    holidayId,
    action: 'RECALCULATE_PAYROLL',
    entityType: 'HOLIDAY_LEDGER',
    actorStaffId: actor.id,
    after: {
      rows: savedRows.length,
      exceptions: savedRows.filter((row) => row.ledgerStatus === 'EXCEPTION').length,
    },
  });
  return savedRows;
}

export async function lockPayroll(fastify: FastifyInstance, holidayId: number, actor: Actor) {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status !== 'PUBLISHED') throw new HolidayWorkError('Chỉ kỳ đã publish mới được khóa lương.', 409);
  const ledger = await recalculateLedger(fastify, holidayId, actor);
  const exceptions = ledger.filter((row) => row.ledgerStatus === 'EXCEPTION');
  if (exceptions.length > 0) {
    throw new HolidayWorkError(`Còn ${exceptions.length} ngoại lệ lương; chưa thể khóa kỳ.`, 409);
  }
  const now = new Date();
  await fastify.prisma.crm.$transaction([
    fastify.prisma.crm.crmHolidayPayrollLedger.updateMany({
      where: { holidayId },
      data: { ledgerStatus: 'LOCKED', lockedAt: now, lockedByStaffId: actor.id },
    }),
    fastify.prisma.crm.crmHolidayPeriod.update({
      where: { id: holidayId },
      data: { status: 'PAYROLL_LOCKED', payrollLockedAt: now, payrollLockedByStaffId: actor.id },
    }),
  ]);
  await writeHolidayAudit(fastify, {
    holidayId,
    action: 'LOCK_PAYROLL',
    entityType: 'HOLIDAY_LEDGER',
    actorStaffId: actor.id,
    after: { rows: ledger.length, lockedAt: now.toISOString() },
  });
  return getWorkspace(fastify, holidayId, actor);
}

export async function listPerformanceEvents(
  fastify: FastifyInstance,
  query: StaffPerformanceEventQuery
): Promise<StaffPerformanceEventListResponse> {
  const page = Math.max(1, Number(query.page || 1));
  const limit = clamp(Number(query.limit || 20), 1, 100);
  const where = {
    ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
    ...(query.eventType && query.eventType !== 'ALL' ? { eventType: query.eventType } : {}),
    ...(query.legacyStaffId ? { legacyStaffId: query.legacyStaffId } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          occurredAt: {
            ...(query.dateFrom ? { gte: toDbDate(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59+07:00`) } : {}),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    fastify.prisma.crm.crmStaffPerformanceEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    fastify.prisma.crm.crmStaffPerformanceEvent.count({ where }),
  ]);
  return { data: rows.map(mapPerformanceEvent), total, page, limit };
}

export async function createPerformanceEvent(
  fastify: FastifyInstance,
  input: CreateStaffPerformanceEventRequest,
  actor: Actor
) {
  if (!input.note.trim()) throw new HolidayWorkError('Nội dung feedback/sự cố là bắt buộc.');
  if (!input.crmStaffId && !input.legacyStaffId) {
    throw new HolidayWorkError('Phải chọn nhân sự liên quan.');
  }
  const created = await fastify.prisma.crm.crmStaffPerformanceEvent.create({
    data: {
      crmStaffId: input.crmStaffId ?? null,
      legacyStaffId: input.legacyStaffId ?? null,
      displayName: input.displayName.trim(),
      eventType: input.eventType,
      source: input.source,
      severity: input.severity,
      occurredAt: new Date(input.occurredAt),
      storeId: input.storeId ?? null,
      storeKey: input.storeKey?.trim().toUpperCase() || null,
      relatedOrderId: input.relatedOrderId ?? null,
      relatedTicketId: input.relatedTicketId ?? null,
      evidenceUrl: input.evidenceUrl?.trim() || null,
      note: input.note.trim(),
      status: 'PENDING',
      createdByStaffId: actor.id,
    },
  });
  return mapPerformanceEvent(created);
}

export async function reviewPerformanceEvent(
  fastify: FastifyInstance,
  eventId: number,
  status: 'VERIFIED' | 'REJECTED',
  actor: Actor,
  rejectionReason?: string
) {
  const event = await fastify.prisma.crm.crmStaffPerformanceEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new HolidayWorkError('Không tìm thấy performance event.', 404);
  if (status === 'REJECTED' && !rejectionReason?.trim()) {
    throw new HolidayWorkError('Cần nhập lý do từ chối.');
  }
  if (event.createdByStaffId === actor.id && !isHolidayAdmin(actor)) {
    throw new HolidayWorkError('Người tạo không được tự xác thực sự kiện của mình.', 403);
  }
  const updated = await fastify.prisma.crm.crmStaffPerformanceEvent.update({
    where: { id: eventId },
    data: {
      status,
      verifiedByStaffId: actor.id,
      verifiedAt: new Date(),
      rejectionReason: status === 'REJECTED' ? rejectionReason?.trim() : null,
    },
  });
  return mapPerformanceEvent(updated);
}

export async function createPayrollAdjustment(
  fastify: FastifyInstance,
  holidayId: number,
  input: CreateHolidayPayrollAdjustmentRequest,
  actor: Actor
) {
  const amount = roundMoney(Number(input.amount));
  if (amount === 0) throw new HolidayWorkError('Số tiền adjustment phải khác 0.');
  if (!input.reason?.trim()) throw new HolidayWorkError('Lý do adjustment là bắt buộc.');
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status !== 'PAYROLL_LOCKED') {
    throw new HolidayWorkError('Adjustment chỉ được tạo sau khi kỳ lương đã khóa.', 409);
  }
  const ledger = await fastify.prisma.crm.crmHolidayPayrollLedger.findUnique({ where: { id: input.ledgerId } });
  if (!ledger || ledger.holidayId !== holidayId || ledger.ledgerStatus !== 'LOCKED') {
    throw new HolidayWorkError('Không tìm thấy ledger đã khóa thuộc kỳ lễ này.', 404);
  }
  const created = await fastify.prisma.crm.crmHolidayPayrollAdjustment.create({
    data: {
      holidayId,
      ledgerId: ledger.id,
      amount,
      reason: input.reason.trim(),
      createdByStaffId: actor.id,
    },
  });
  await writeHolidayAudit(fastify, {
    holidayId,
    action: 'CREATE_PAYROLL_ADJUSTMENT',
    entityType: 'HOLIDAY_PAYROLL_ADJUSTMENT',
    entityId: created.id,
    actorStaffId: actor.id,
    reason: created.reason,
    after: created,
  });
  return mapAdjustment(created);
}

export async function getPayBreakdownByLegacyStaffIds(
  fastify: FastifyInstance,
  legacyStaffIds: number[],
  dateFrom: string,
  dateTo: string
): Promise<Map<number, HolidayPayBreakdown>> {
  const result = new Map<number, HolidayPayBreakdown>();
  legacyStaffIds.forEach((id) => result.set(id, { ...EMPTY_BREAKDOWN }));
  if (legacyStaffIds.length === 0) return result;
  const ledger = await fastify.prisma.crm.crmHolidayPayrollLedger.findMany({
    where: {
      legacyStaffId: { in: legacyStaffIds },
      workDate: { gte: toDbDate(dateFrom), lte: toDbDate(dateTo) },
      ledgerStatus: { in: ['READY', 'LOCKED', 'EXCEPTION'] },
      holiday: { status: { in: ['PUBLISHED', 'PAYROLL_LOCKED'] } },
    },
    include: { adjustments: true },
  });
  ledger.forEach((row) => {
    if (!row.legacyStaffId) return;
    const aggregate = result.get(row.legacyStaffId) || { ...EMPTY_BREAKDOWN };
    if (row.rosterStatus === 'SCHEDULED' && row.ledgerStatus !== 'EXCEPTION') {
      aggregate.holidayWorkedDays += 1;
      aggregate.holidayWorkedHours = roundHours(aggregate.holidayWorkedHours + row.actualHours);
      aggregate.holidayWorkedBasePay += row.baseHolidayAmount;
    }
    if (row.rosterStatus === 'HOLIDAY_OFF' && row.ledgerStatus !== 'EXCEPTION') {
      aggregate.holidayPaidLeaveDays += 1;
      aggregate.holidayPaidLeaveHours = roundHours(aggregate.holidayPaidLeaveHours + Number(row.standardShiftHours));
      aggregate.holidayPaidLeavePay += row.baseHolidayAmount;
    }
    aggregate.holidayBasePay += row.baseHolidayAmount;
    aggregate.holidayPremiumPay += row.holidayPremiumAmount;
    aggregate.holidayTotalValue += row.holidayTotalValue;
    aggregate.holidayPayrollAddition += row.payrollAdditionAmount;
    aggregate.holidayPaystubAdjustment += row.baseIncludedInMonthlySalary
      ? row.payrollAdditionAmount
      : row.holidayPremiumAmount + (row.rosterStatus === 'HOLIDAY_OFF' ? row.baseHolidayAmount : 0);
    const adjustmentAmount = row.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
    aggregate.holidayPayrollAddition += adjustmentAmount;
    aggregate.holidayPaystubAdjustment += adjustmentAmount;
    if (row.ledgerStatus === 'EXCEPTION') aggregate.holidayPayrollExceptionCount += 1;
    result.set(row.legacyStaffId, aggregate);
  });
  return result;
}

export async function getPublishedHolidayWorkedDateKeys(
  fastify: FastifyInstance,
  legacyStaffIds: number[],
  dateFrom: string,
  dateTo: string
): Promise<Map<number, Set<string>>> {
  const result = new Map<number, Set<string>>();
  legacyStaffIds.forEach((id) => result.set(id, new Set()));
  if (legacyStaffIds.length === 0) return result;
  const rows = await fastify.prisma.crm.crmHolidayPayrollLedger.findMany({
    where: {
      legacyStaffId: { in: legacyStaffIds },
      workDate: { gte: toDbDate(dateFrom), lte: toDbDate(dateTo) },
      rosterStatus: 'SCHEDULED',
      ledgerStatus: { in: ['READY', 'LOCKED'] },
      holiday: { status: { in: ['PUBLISHED', 'PAYROLL_LOCKED'] } },
    },
    select: { legacyStaffId: true, workDate: true },
  });
  rows.forEach((row) => {
    if (row.legacyStaffId) result.get(row.legacyStaffId)?.add(dateKey(row.workDate));
  });
  return result;
}
