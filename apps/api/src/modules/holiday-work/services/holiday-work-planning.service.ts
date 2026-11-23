import type { FastifyInstance } from 'fastify';
import {
  type AnnualHolidayCalendarResponse,
  type HolidayCalendarCompanyPeriod,
  type HolidayCoverageRequirement,
  type HolidayPeriodListResponse,
  type HolidayPeriodQuery,
  type HolidayPeriodSummary,
  type HolidayWorkspaceResponse,
  type UpsertHolidayBranchCoverageRequest,
  type UpsertHolidayCoverageRequest,
  type UpsertHolidayPeriodRequest,
  type UpsertHolidayRosterRequest,
} from '@mos-lab/shared';
import {
  type Actor,
  HolidayWorkError,
  ICT_TIME_ZONE,
  TIME_KEY_PATTERN,
  buildVietnamHolidayCalendar2026,
  clamp,
  dateKey,
  normalizeName,
  normalizeWeights,
  toDbDate,
} from './holiday-work-calendar-and-calc.js';
import {
  emptySummary,
  getLeaderTeamCodes,
  isHolidayAdmin,
  mapAdjustment,
  mapCandidate,
  mapCoverage,
  mapLedger,
  mapPeriod,
  mapRoster,
  writeHolidayAudit,
} from './holiday-work-mappers.js';

export async function getAnnualCalendar(
  fastify: FastifyInstance,
  year: number
): Promise<AnnualHolidayCalendarResponse> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new HolidayWorkError('Năm lịch không hợp lệ.');
  }
  if (year !== 2026) {
    throw new HolidayWorkError(
      `Lịch nghỉ lễ chính thức năm ${year} chưa được cấu hình.`,
      404,
      'HOLIDAY_CALENDAR_NOT_CONFIGURED'
    );
  }
  const periods = await fastify.prisma.crm.crmHolidayPeriod.findMany({
    where: {
      startDate: { lte: toDbDate(`${year}-12-31`) },
      endDate: { gte: toDbDate(`${year}-01-01`) },
    },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
  return buildVietnamHolidayCalendar2026(
    dateKey(new Date()),
    periods.map((period) => ({
      id: period.id,
      code: period.code,
      name: period.name,
      startDate: dateKey(period.startDate),
      endDate: dateKey(period.endDate),
      status: period.status as HolidayCalendarCompanyPeriod['status'],
    }))
  );
}

export async function listPeriods(
  fastify: FastifyInstance,
  query: HolidayPeriodQuery
): Promise<HolidayPeriodListResponse> {
  const page = Math.max(1, Number(query.page || 1));
  const limit = clamp(Number(query.limit || 20), 1, 100);
  const search = String(query.search || '').trim();
  const where = {
    ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
  };
  const [records, total] = await Promise.all([
    fastify.prisma.crm.crmHolidayPeriod.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { coverage: true, roster: true, ledger: true, adjustments: true },
    }),
    fastify.prisma.crm.crmHolidayPeriod.count({ where }),
  ]);
  const globalSummary = emptySummary();
  const data = records.map((record) => {
    const summary = emptySummary();
    const payrollExceptionKeys = new Set<string>();
    record.coverage.forEach((item) => (summary.coverageRequired += item.requiredCount));
    record.roster.forEach((item) => {
      if (item.status === 'SCHEDULED') summary.scheduled += 1;
      else if (item.status === 'NOMINATED') summary.nominated += 1;
      else if (item.status === 'HOLIDAY_OFF') summary.holidayOff += 1;
      else if (item.status === 'BOOKED_OFF') summary.bookedOff += 1;
      else if (item.status === 'PAYROLL_EXCEPTION') {
        payrollExceptionKeys.add(`${dateKey(item.workDate)}:${item.legacyStaffId || item.displayName}`);
      }
    });
    record.ledger.forEach((item) => {
      if (item.ledgerStatus === 'EXCEPTION') {
        payrollExceptionKeys.add(`${dateKey(item.workDate)}:${item.legacyStaffId || item.displayName}`);
      }
      if (item.ledgerStatus === 'READY') summary.payrollReady += 1;
      if (item.ledgerStatus === 'LOCKED') summary.payrollLocked += 1;
      summary.totalPayrollAddition += item.payrollAdditionAmount;
    });
    summary.payrollExceptions = payrollExceptionKeys.size;
    record.adjustments.forEach((item) => (summary.totalPayrollAddition += item.amount));
    Object.keys(globalSummary).forEach((key) => {
      const typedKey = key as keyof HolidayPeriodSummary;
      globalSummary[typedKey] += summary[typedKey];
    });
    return mapPeriod(record, summary);
  });
  return { data, total, page, limit, summary: globalSummary };
}

export async function getWorkspace(
  fastify: FastifyInstance,
  holidayId: number,
  actor: Actor
): Promise<HolidayWorkspaceResponse> {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
    where: { id: holidayId },
    include: {
      coverage: { orderBy: [{ workDate: 'asc' }, { storeKey: 'asc' }, { teamCode: 'asc' }] },
      roster: { orderBy: [{ workDate: 'asc' }, { status: 'asc' }, { displayName: 'asc' }] },
      candidates: { orderBy: [{ workDate: 'asc' }, { totalScore: 'desc' }, { displayName: 'asc' }] },
      ledger: { orderBy: [{ workDate: 'asc' }, { displayName: 'asc' }] },
      adjustments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    },
  });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404, 'HOLIDAY_NOT_FOUND');
  const candidateByStaffDay = new Map(
    period.candidates.map((candidate) => [`${dateKey(candidate.workDate)}:${candidate.legacyStaffId}`, candidate])
  );
  const crmStaffIds = period.roster.map((entry) => entry.crmStaffId).filter((id): id is number => Boolean(id));
  const staffs = crmStaffIds.length
    ? await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: crmStaffIds } },
        select: { id: true, avatarUrl: true },
      })
    : [];
  const avatarByStaffId = new Map(staffs.map((staff) => [staff.id, staff.avatarUrl]));
  const roster = period.roster.map((entry) =>
    mapRoster({
      ...entry,
      avatarUrl: entry.crmStaffId ? avatarByStaffId.get(entry.crmStaffId) : null,
      candidateScore: entry.legacyStaffId
        ? candidateByStaffDay.get(`${dateKey(entry.workDate)}:${entry.legacyStaffId}`)
        : null,
    })
  );
  const leaderTeams = await getLeaderTeamCodes(fastify, actor);
  return {
    period: mapPeriod(period),
    coverage: period.coverage.map(mapCoverage),
    roster: isHolidayAdmin(actor) ? roster : roster.filter((entry) => leaderTeams.includes(entry.teamCode)),
    candidates: (isHolidayAdmin(actor)
      ? period.candidates
      : period.candidates.filter((candidate) => leaderTeams.includes(candidate.teamCode))
    ).map(mapCandidate),
    ledger: isHolidayAdmin(actor) ? period.ledger.map(mapLedger) : [],
    adjustments: isHolidayAdmin(actor) ? period.adjustments.map(mapAdjustment) : [],
    canManage: isHolidayAdmin(actor),
    canNominate: isHolidayAdmin(actor) || leaderTeams.length > 0,
  };
}

export function validatePeriodRequest(input: UpsertHolidayPeriodRequest) {
  const startDate = toDbDate(input.startDate);
  const endDate = toDbDate(input.endDate);
  if (startDate > endDate) throw new HolidayWorkError('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  if (!/^[A-Z0-9_]{3,50}$/.test(input.code)) {
    throw new HolidayWorkError('Mã kỳ lễ chỉ gồm A-Z, 0-9 và dấu gạch dưới.');
  }
  if (!input.name.trim()) throw new HolidayWorkError('Tên kỳ lễ là bắt buộc.');
  const standardShiftHours = Number(input.standardShiftHours ?? 9);
  const monthlyStandardHours = Number(input.monthlyStandardHours ?? 234);
  const selectionWindowDays = Number(input.selectionWindowDays ?? 90);
  if (standardShiftHours <= 0 || standardShiftHours > 24) throw new HolidayWorkError('Ca chuẩn không hợp lệ.');
  if (monthlyStandardHours <= 0) throw new HolidayWorkError('Giờ chuẩn tháng phải lớn hơn 0.');
  if (selectionWindowDays < 1 || selectionWindowDays > 365) {
    throw new HolidayWorkError('Kỳ đánh giá phải từ 1 đến 365 ngày.');
  }
  return {
    code: input.code,
    name: input.name.trim(),
    startDate,
    endDate,
    timezone: ICT_TIME_ZONE,
    standardShiftHours,
    workPremiumMultiplier: Number(input.workPremiumMultiplier ?? 3),
    paidLeaveMultiplier: Number(input.paidLeaveMultiplier ?? 1),
    monthlyStandardDays: Number(input.monthlyStandardDays ?? 26),
    monthlyStandardHours,
    selectionWindowDays,
    selectionWeightsJson: JSON.stringify(normalizeWeights(input.selectionWeights)),
    notes: input.notes?.trim() || null,
  };
}

export async function upsertPeriod(
  fastify: FastifyInstance,
  input: UpsertHolidayPeriodRequest,
  actor: Actor,
  holidayId?: number
) {
  const data = validatePeriodRequest(input);
  if (holidayId) {
    const existing = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
    if (!existing) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (existing.status !== 'DRAFT') throw new HolidayWorkError('Chỉ kỳ lễ DRAFT mới được sửa policy.', 409);
    const updated = await fastify.prisma.crm.crmHolidayPeriod.update({ where: { id: holidayId }, data });
    await writeHolidayAudit(fastify, {
      holidayId,
      action: 'UPDATE_PERIOD',
      entityType: 'HOLIDAY_PERIOD',
      entityId: holidayId,
      actorStaffId: actor.id,
      before: existing,
      after: updated,
    });
    return mapPeriod(updated);
  }
  const created = await fastify.prisma.crm.crmHolidayPeriod.create({
    data: { ...data, createdByStaffId: actor.id },
  });
  await writeHolidayAudit(fastify, {
    holidayId: created.id,
    action: 'CREATE_PERIOD',
    entityType: 'HOLIDAY_PERIOD',
    entityId: created.id,
    actorStaffId: actor.id,
    after: created,
  });
  return mapPeriod(created);
}

export async function upsertCoverage(
  fastify: FastifyInstance,
  holidayId: number,
  input: UpsertHolidayCoverageRequest,
  actor: Actor,
  coverageId?: number
) {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status !== 'DRAFT') throw new HolidayWorkError('Chỉ được sửa nhu cầu khi kỳ lễ còn DRAFT.', 409);
  if (!TIME_KEY_PATTERN.test(input.shiftStart) || !TIME_KEY_PATTERN.test(input.shiftEnd)) {
    throw new HolidayWorkError('Khung giờ phải có dạng HH:mm.');
  }
  if (input.shiftStart >= input.shiftEnd) throw new HolidayWorkError('Giờ kết thúc phải sau giờ bắt đầu.');
  if (input.requiredCount < 1 || !Number.isInteger(input.requiredCount)) {
    throw new HolidayWorkError('Số nhân sự cần phải là số nguyên dương.');
  }
  const workDate = toDbDate(input.workDate);
  if (workDate < period.startDate || workDate > period.endDate) {
    throw new HolidayWorkError('Ngày coverage nằm ngoài kỳ lễ.');
  }
  const data = {
    holidayId,
    workDate,
    storeId: input.storeId ?? null,
    storeKey: input.storeKey.trim().toUpperCase(),
    teamCode: input.teamCode.trim().toUpperCase(),
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    requiredCount: input.requiredCount,
    notes: input.notes?.trim() || null,
  };
  const before = coverageId
    ? await fastify.prisma.crm.crmHolidayCoverage.findUnique({ where: { id: coverageId } })
    : null;
  if (coverageId && (!before || before.holidayId !== holidayId)) {
    throw new HolidayWorkError('Không tìm thấy coverage.', 404);
  }
  const saved = coverageId
    ? await fastify.prisma.crm.crmHolidayCoverage.update({ where: { id: coverageId }, data })
    : await fastify.prisma.crm.crmHolidayCoverage.create({ data });
  await writeHolidayAudit(fastify, {
    holidayId,
    action: coverageId ? 'UPDATE_COVERAGE' : 'CREATE_COVERAGE',
    entityType: 'HOLIDAY_COVERAGE',
    entityId: saved.id,
    actorStaffId: actor.id,
    before,
    after: saved,
  });
  return mapCoverage(saved);
}

export async function upsertBranchCoverage(
  fastify: FastifyInstance,
  holidayId: number,
  input: UpsertHolidayBranchCoverageRequest,
  actor: Actor
): Promise<HolidayCoverageRequirement[]> {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status !== 'DRAFT') throw new HolidayWorkError('Chỉ được sửa nhu cầu khi kỳ lễ còn DRAFT.', 409);
  if (!TIME_KEY_PATTERN.test(input.shiftStart) || !TIME_KEY_PATTERN.test(input.shiftEnd)) {
    throw new HolidayWorkError('Khung giờ phải có dạng HH:mm.');
  }
  if (input.shiftStart >= input.shiftEnd) throw new HolidayWorkError('Giờ kết thúc phải sau giờ bắt đầu.');

  const counts = input.requiredByTeam;
  if (!counts || !Number.isInteger(counts.CC) || !Number.isInteger(counts.CV) || counts.CC < 0 || counts.CV < 0) {
    throw new HolidayWorkError('Nhu cầu CC và CV phải là số nguyên không âm.');
  }
  if (counts.CC + counts.CV < 1) {
    throw new HolidayWorkError('Cần ít nhất 1 nhân sự CC hoặc CV.');
  }

  const workDate = toDbDate(input.workDate);
  if (workDate < period.startDate || workDate > period.endDate) {
    throw new HolidayWorkError('Ngày coverage nằm ngoài kỳ lễ.');
  }

  const branch = await fastify.prisma.crm.crmStore.findUnique({ where: { id: input.storeId } });
  if (!branch || !branch.isActive || branch.storeType !== 'SALON') {
    throw new HolidayWorkError('Chi nhánh không tồn tại hoặc không còn hoạt động.');
  }
  const storeKey = branch.code.trim().toUpperCase();
  const targetWhere = {
    holidayId,
    workDate,
    storeKey,
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    teamCode: { in: ['CC', 'CV'] },
  };
  const sourceWhere = input.source
    ? {
        holidayId,
        workDate: toDbDate(input.source.workDate),
        storeKey: input.source.storeKey.trim().toUpperCase(),
        shiftStart: input.source.shiftStart,
        shiftEnd: input.source.shiftEnd,
        teamCode: { in: ['CC', 'CV'] },
      }
    : null;
  const sourceMoved = Boolean(
    sourceWhere &&
    (dateKey(sourceWhere.workDate) !== dateKey(targetWhere.workDate) ||
      sourceWhere.storeKey !== targetWhere.storeKey ||
      sourceWhere.shiftStart !== targetWhere.shiftStart ||
      sourceWhere.shiftEnd !== targetWhere.shiftEnd)
  );
  const before = await fastify.prisma.crm.crmHolidayCoverage.findMany({
    where: sourceMoved && sourceWhere ? { OR: [sourceWhere, targetWhere] } : targetWhere,
  });

  const saved = await fastify.prisma.crm.$transaction(async (tx) => {
    if (sourceMoved && sourceWhere) {
      await tx.crmHolidayCoverage.deleteMany({ where: sourceWhere });
    }
    const rows: HolidayCoverageRequirement[] = [];
    for (const teamCode of ['CC', 'CV'] as const) {
      const requiredCount = counts[teamCode];
      const slotWhere = { ...targetWhere, teamCode };
      const existing = await tx.crmHolidayCoverage.findFirst({ where: slotWhere });
      if (requiredCount === 0) {
        if (existing) await tx.crmHolidayCoverage.delete({ where: { id: existing.id } });
        continue;
      }
      const data = {
        holidayId,
        workDate,
        storeId: branch.id,
        storeKey,
        teamCode,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
        requiredCount,
        notes: input.notes?.trim() || null,
      };
      const record = existing
        ? await tx.crmHolidayCoverage.update({ where: { id: existing.id }, data })
        : await tx.crmHolidayCoverage.create({ data });
      rows.push(mapCoverage(record));
    }
    return rows;
  });

  await writeHolidayAudit(fastify, {
    holidayId,
    action: 'UPSERT_BRANCH_COVERAGE',
    entityType: 'HOLIDAY_COVERAGE',
    actorStaffId: actor.id,
    before,
    after: saved,
  });
  return saved;
}

export function buildRosterKey(
  input: Pick<UpsertHolidayRosterRequest, 'workDate' | 'legacyStaffId' | 'importedName' | 'displayName'>
) {
  const identity = input.legacyStaffId
    ? `staff:${input.legacyStaffId}`
    : `name:${normalizeName(input.importedName || input.displayName)}`;
  return `${input.workDate}:${identity}`;
}

export async function upsertRoster(
  fastify: FastifyInstance,
  holidayId: number,
  input: UpsertHolidayRosterRequest,
  actor: Actor,
  rosterId?: number
) {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status === 'PAYROLL_LOCKED') throw new HolidayWorkError('Kỳ lương đã khóa, không thể sửa roster.', 409);
  const workDate = toDbDate(input.workDate);
  if (workDate < period.startDate || workDate > period.endDate) {
    throw new HolidayWorkError('Ngày roster nằm ngoài kỳ lễ.');
  }
  if (!TIME_KEY_PATTERN.test(input.shiftStart) || !TIME_KEY_PATTERN.test(input.shiftEnd)) {
    throw new HolidayWorkError('Khung giờ phải có dạng HH:mm.');
  }
  const leaderTeams = await getLeaderTeamCodes(fastify, actor);
  const teamCode = input.teamCode.trim().toUpperCase();
  if (!isHolidayAdmin(actor) && (!leaderTeams.includes(teamCode) || input.status !== 'NOMINATED')) {
    throw new HolidayWorkError('Manager chỉ được đề cử NOMINATED trong đội mình phụ trách.', 403);
  }
  if (!isHolidayAdmin(actor) && !input.nominationReason?.trim()) {
    throw new HolidayWorkError('Manager phải nhập lý do đề cử.');
  }
  if (isHolidayAdmin(actor) && input.status === 'SCHEDULED' && !input.legacyStaffId) {
    throw new HolidayWorkError('Không thể SCHEDULED khi tên chưa khớp legacyStaffId.');
  }
  const before = rosterId ? await fastify.prisma.crm.crmHolidayRoster.findUnique({ where: { id: rosterId } }) : null;
  if (rosterId && (!before || before.holidayId !== holidayId)) {
    throw new HolidayWorkError('Không tìm thấy roster.', 404);
  }
  if (
    before?.status === 'PAYROLL_EXCEPTION' &&
    input.status !== 'PAYROLL_EXCEPTION' &&
    (!input.decisionReason?.trim() || input.decisionReason.trim() === before.decisionReason?.trim())
  ) {
    throw new HolidayWorkError('Cần ghi lý do khi xử lý ngoại lệ roster.');
  }
  if (isHolidayAdmin(actor) && input.status === 'SCHEDULED' && input.legacyStaffId) {
    const candidate = await fastify.prisma.crm.crmHolidayCandidateSnapshot.findUnique({
      where: {
        holiday_candidate_staff_day: {
          holidayId,
          workDate,
          legacyStaffId: input.legacyStaffId,
        },
      },
      select: { dataSufficient: true },
    });
    if (candidate && !candidate.dataSufficient && !input.decisionReason?.trim()) {
      throw new HolidayWorkError('Nhân sự chưa đủ mẫu dữ liệu; Admin phải ghi lý do khi chốt đi làm.');
    }
  }
  const data = {
    holidayId,
    rosterKey: buildRosterKey(input),
    workDate,
    crmStaffId: input.crmStaffId ?? null,
    legacyStaffId: input.legacyStaffId ?? null,
    importedName: input.importedName?.trim() || null,
    displayName: input.displayName.trim(),
    teamCode,
    storeId: input.storeId ?? null,
    storeKey: input.storeKey.trim().toUpperCase(),
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    status: input.status,
    nominationReason: input.nominationReason?.trim() || null,
    decisionReason: input.decisionReason?.trim() || null,
    nominatedByStaffId: input.status === 'NOMINATED' ? actor.id : before?.nominatedByStaffId || null,
    scheduledByStaffId: input.status === 'SCHEDULED' ? actor.id : before?.scheduledByStaffId || null,
  };
  const saved = rosterId
    ? await fastify.prisma.crm.crmHolidayRoster.update({ where: { id: rosterId }, data })
    : await fastify.prisma.crm.crmHolidayRoster.upsert({
        where: { holiday_roster_key: { holidayId, rosterKey: data.rosterKey } },
        create: data,
        update: data,
      });
  await writeHolidayAudit(fastify, {
    holidayId,
    action: rosterId ? 'UPDATE_ROSTER' : 'UPSERT_ROSTER',
    entityType: 'HOLIDAY_ROSTER',
    entityId: saved.id,
    actorStaffId: actor.id,
    reason: input.decisionReason || input.nominationReason,
    before,
    after: saved,
  });
  return mapRoster(saved);
}

export async function publishHolidayPeriod(fastify: FastifyInstance, holidayId: number, actor: Actor) {
  const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
    where: { id: holidayId },
    include: { coverage: true, roster: true },
  });
  if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
  if (period.status !== 'DRAFT') throw new HolidayWorkError('Chỉ kỳ DRAFT mới được publish.', 409);
  if (period.coverage.length === 0) throw new HolidayWorkError('Cần cấu hình nhu cầu nhân sự trước khi publish.');
  const unresolved = period.roster.filter(
    (entry) => entry.status === 'PAYROLL_EXCEPTION' || (!entry.legacyStaffId && entry.status !== 'CANCELLED')
  );
  if (unresolved.length > 0) {
    throw new HolidayWorkError(`Còn ${unresolved.length} roster chưa khớp nhân sự hoặc đang lỗi.`, 409);
  }
  for (const coverage of period.coverage) {
    const scheduled = period.roster.filter(
      (entry) =>
        dateKey(entry.workDate) === dateKey(coverage.workDate) &&
        entry.teamCode === coverage.teamCode &&
        entry.storeKey === coverage.storeKey &&
        entry.status === 'SCHEDULED'
    ).length;
    if (scheduled < coverage.requiredCount) {
      throw new HolidayWorkError(
        `${dateKey(coverage.workDate)} ${coverage.storeKey}/${coverage.teamCode} thiếu ${coverage.requiredCount - scheduled} người.`,
        409
      );
    }
  }
  const updated = await fastify.prisma.crm.crmHolidayPeriod.update({
    where: { id: holidayId },
    data: { status: 'PUBLISHED', publishedAt: new Date(), publishedByStaffId: actor.id },
  });
  await writeHolidayAudit(fastify, {
    holidayId,
    action: 'PUBLISH_PERIOD',
    entityType: 'HOLIDAY_PERIOD',
    entityId: holidayId,
    actorStaffId: actor.id,
    before: period,
    after: updated,
  });
  return mapPeriod(updated);
}
