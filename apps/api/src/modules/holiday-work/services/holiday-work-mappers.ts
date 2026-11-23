import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
  type HolidayCandidateMetrics,
  type HolidayCandidateScore,
  type HolidayCoverageRequirement,
  type HolidayPayrollAdjustment,
  type HolidayPayrollLedgerEntry,
  type HolidayPeriod,
  type HolidayPeriodSummary,
  type HolidayRosterEntry,
  type SafeAny,
  type StaffPerformanceEvent,
} from '@mos-lab/shared';
import { type Actor, dateKey, normalizeWeights, parseJson } from './holiday-work-calendar-and-calc.js';

export const mapPeriod = (record: SafeAny, summary?: HolidayPeriodSummary): HolidayPeriod => ({
  id: record.id,
  code: record.code,
  name: record.name,
  startDate: dateKey(record.startDate),
  endDate: dateKey(record.endDate),
  timezone: record.timezone,
  status: record.status,
  standardShiftHours: Number(record.standardShiftHours),
  workPremiumMultiplier: Number(record.workPremiumMultiplier),
  paidLeaveMultiplier: Number(record.paidLeaveMultiplier),
  monthlyStandardDays: Number(record.monthlyStandardDays),
  monthlyStandardHours: Number(record.monthlyStandardHours),
  selectionWindowDays: Number(record.selectionWindowDays),
  selectionWeights: normalizeWeights(parseJson(record.selectionWeightsJson, DEFAULT_HOLIDAY_SELECTION_WEIGHTS)),
  notes: record.notes,
  publishedAt: record.publishedAt?.toISOString() || null,
  payrollLockedAt: record.payrollLockedAt?.toISOString() || null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  summary,
});

export const mapCoverage = (record: SafeAny): HolidayCoverageRequirement => ({
  id: record.id,
  holidayId: record.holidayId,
  workDate: dateKey(record.workDate),
  storeId: record.storeId,
  storeKey: record.storeKey,
  teamCode: record.teamCode,
  shiftStart: record.shiftStart,
  shiftEnd: record.shiftEnd,
  requiredCount: record.requiredCount,
  notes: record.notes,
});

export const mapCandidate = (record: SafeAny): HolidayCandidateScore => ({
  id: record.id,
  holidayId: record.holidayId,
  workDate: dateKey(record.workDate),
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  displayName: record.displayName,
  avatarUrl: record.avatarUrl,
  teamCode: record.teamCode,
  storeId: record.storeId,
  storeKey: record.storeKey,
  scoreWindowFrom: dateKey(record.scoreWindowFrom),
  scoreWindowTo: dateKey(record.scoreWindowTo),
  totalScore: record.totalScore === null ? null : Number(record.totalScore),
  dataSufficient: Boolean(record.dataSufficient),
  dataCoverageReason: record.dataCoverageReason,
  metrics: parseJson<HolidayCandidateMetrics>(record.metricsJson, {
    completedServices: 0,
    verifiedNegativeFeedbackCount: 0,
    feedbackRate: null,
    fixCount: 0,
    fixRate: null,
    tippedVisits: 0,
    tipRate: null,
    medianSpeedRatio: null,
    attendanceIncidentPoints: 0,
    feedbackPercentile: null,
    fixPercentile: null,
    tipPercentile: null,
    speedPercentile: null,
    attendancePercentile: null,
  }),
  explanation: parseJson<string[]>(record.explanationJson, []),
  generatedAt: record.generatedAt.toISOString(),
});

export const mapRoster = (record: SafeAny): HolidayRosterEntry => ({
  id: record.id,
  holidayId: record.holidayId,
  rosterKey: record.rosterKey,
  workDate: dateKey(record.workDate),
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  importedName: record.importedName,
  displayName: record.displayName,
  avatarUrl: record.avatarUrl || null,
  teamCode: record.teamCode,
  storeId: record.storeId,
  storeKey: record.storeKey,
  shiftStart: record.shiftStart,
  shiftEnd: record.shiftEnd,
  status: record.status,
  nominationReason: record.nominationReason,
  decisionReason: record.decisionReason,
  isApprovedLeave: Boolean(record.isApprovedLeave),
  candidateScore: record.candidateScore ? mapCandidate(record.candidateScore) : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const mapLedger = (record: SafeAny): HolidayPayrollLedgerEntry => ({
  id: record.id,
  holidayId: record.holidayId,
  rosterId: record.rosterId,
  workDate: dateKey(record.workDate),
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  displayName: record.displayName,
  teamCode: record.teamCode,
  storeKey: record.storeKey,
  rosterStatus: record.rosterStatus,
  payBasis: record.payBasis,
  ledgerStatus: record.ledgerStatus,
  attendanceSource: record.attendanceSource,
  actualMinutes: record.actualMinutes,
  actualHours: Number(record.actualHours),
  standardShiftHours: Number(record.standardShiftHours),
  hourlyRate: record.hourlyRate,
  baseHolidayAmount: record.baseHolidayAmount,
  holidayPremiumAmount: record.holidayPremiumAmount,
  holidayTotalValue: record.holidayTotalValue,
  payrollAdditionAmount: record.payrollAdditionAmount,
  baseIncludedInMonthlySalary: Boolean(record.baseIncludedInMonthlySalary),
  exceptionCode: record.exceptionCode,
  exceptionMessage: record.exceptionMessage,
  calculationVersion: record.calculationVersion,
  lockedAt: record.lockedAt?.toISOString() || null,
  lockedByStaffId: record.lockedByStaffId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const mapPerformanceEvent = (record: SafeAny): StaffPerformanceEvent => ({
  id: record.id,
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  displayName: record.displayName,
  eventType: record.eventType,
  source: record.source,
  severity: record.severity,
  occurredAt: record.occurredAt.toISOString(),
  storeId: record.storeId,
  storeKey: record.storeKey,
  relatedOrderId: record.relatedOrderId,
  relatedTicketId: record.relatedTicketId,
  evidenceUrl: record.evidenceUrl,
  note: record.note,
  status: record.status,
  createdByStaffId: record.createdByStaffId,
  verifiedByStaffId: record.verifiedByStaffId,
  verifiedAt: record.verifiedAt?.toISOString() || null,
  rejectionReason: record.rejectionReason,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const mapAdjustment = (record: SafeAny): HolidayPayrollAdjustment => ({
  id: record.id,
  holidayId: record.holidayId,
  ledgerId: record.ledgerId,
  amount: record.amount,
  reason: record.reason,
  createdByStaffId: record.createdByStaffId,
  createdAt: record.createdAt.toISOString(),
});

export const emptySummary = (): HolidayPeriodSummary => ({
  coverageRequired: 0,
  scheduled: 0,
  nominated: 0,
  holidayOff: 0,
  bookedOff: 0,
  payrollExceptions: 0,
  payrollReady: 0,
  payrollLocked: 0,
  totalPayrollAddition: 0,
});

export const isHolidayAdmin = (actor: Actor) => ['admin', 'super_admin'].includes(String(actor.role).toLowerCase());

export async function getLeaderTeamCodes(fastify: FastifyInstance, actor: Actor): Promise<string[]> {
  if (isHolidayAdmin(actor)) {
    const teams = await fastify.prisma.crm.crmTeam.findMany({ where: { isActive: true }, select: { code: true } });
    return teams.map((team) => team.code);
  }
  const staff = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: actor.id },
    select: { legacyStaffId: true },
  });
  if (!staff?.legacyStaffId) return [];
  const memberships = await fastify.prisma.crm.crmTeamMember.findMany({
    where: { legacyStaffId: staff.legacyStaffId, isActive: true, role: 'leader', team: { isActive: true } },
    select: { team: { select: { code: true } } },
  });
  return memberships.map((membership) => membership.team.code);
}

export async function writeHolidayAudit(
  fastify: FastifyInstance,
  input: {
    holidayId: number;
    action: string;
    entityType: string;
    entityId?: number | null;
    actorStaffId: number;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
  }
) {
  await fastify.prisma.crm.crmHolidayAuditLog.create({
    data: {
      holidayId: input.holidayId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorStaffId: input.actorStaffId,
      reason: input.reason ?? null,
      beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
      afterJson: input.after === undefined ? null : JSON.stringify(input.after),
    },
  });
}
