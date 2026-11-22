import type { FastifyInstance } from 'fastify';
import {
  type AnnualHolidayCalendarResponse,
  type CreateHolidayPayrollAdjustmentRequest,
  type CreateStaffPerformanceEventRequest,
  type HolidayCoverageRequirement,
  type HolidayPayBreakdown,
  type HolidayPeriodListResponse,
  type HolidayPeriodQuery,
  type HolidayWorkspaceResponse,
  type SafeAny,
  type StaffPerformanceEventListResponse,
  type StaffPerformanceEventQuery,
  type UpsertHolidayBranchCoverageRequest,
  type UpsertHolidayCoverageRequest,
  type UpsertHolidayPeriodRequest,
  type UpsertHolidayRosterRequest,
} from '@mos-lab/shared';
import {
  type Actor,
  HolidayWorkError,
  buildVietnamHolidayCalendar2026,
  calculateHolidayCandidateScore,
  calculateHolidayPayroll,
} from './services/holiday-work-calendar-and-calc.js';
import { generateCandidates } from './services/holiday-work-candidates.service.js';
import { getLeaderTeamCodes, isHolidayAdmin, writeHolidayAudit } from './services/holiday-work-mappers.js';
import {
  createPayrollAdjustment,
  createPerformanceEvent,
  detectUnplannedAttendance,
  getPayBreakdownByLegacyStaffIds,
  getPublishedHolidayWorkedDateKeys,
  listPerformanceEvents,
  lockPayroll,
  recalculateLedger,
  reviewPerformanceEvent,
} from './services/holiday-work-payroll-and-events.service.js';
import {
  buildRosterKey,
  getAnnualCalendar,
  getWorkspace,
  listPeriods,
  publishHolidayPeriod,
  upsertBranchCoverage,
  upsertCoverage,
  upsertPeriod,
  upsertRoster,
  validatePeriodRequest,
} from './services/holiday-work-planning.service.js';

export { HolidayWorkError, buildVietnamHolidayCalendar2026, calculateHolidayCandidateScore, calculateHolidayPayroll };

export class HolidayWorkService {
  static isAdmin(actor: Actor) {
    return isHolidayAdmin(actor);
  }

  static getAnnualCalendar(fastify: FastifyInstance, year: number): Promise<AnnualHolidayCalendarResponse> {
    return getAnnualCalendar(fastify, year);
  }

  static getLeaderTeamCodes(fastify: FastifyInstance, actor: Actor): Promise<string[]> {
    return getLeaderTeamCodes(fastify, actor);
  }

  static audit(
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
    return writeHolidayAudit(fastify, input);
  }

  static listPeriods(fastify: FastifyInstance, query: HolidayPeriodQuery): Promise<HolidayPeriodListResponse> {
    return listPeriods(fastify, query);
  }

  static getWorkspace(fastify: FastifyInstance, holidayId: number, actor: Actor): Promise<HolidayWorkspaceResponse> {
    return getWorkspace(fastify, holidayId, actor);
  }

  static validatePeriodRequest(input: UpsertHolidayPeriodRequest) {
    return validatePeriodRequest(input);
  }

  static upsertPeriod(fastify: FastifyInstance, input: UpsertHolidayPeriodRequest, actor: Actor, holidayId?: number) {
    return upsertPeriod(fastify, input, actor, holidayId);
  }

  static upsertCoverage(
    fastify: FastifyInstance,
    holidayId: number,
    input: UpsertHolidayCoverageRequest,
    actor: Actor,
    coverageId?: number
  ) {
    return upsertCoverage(fastify, holidayId, input, actor, coverageId);
  }

  static upsertBranchCoverage(
    fastify: FastifyInstance,
    holidayId: number,
    input: UpsertHolidayBranchCoverageRequest,
    actor: Actor
  ): Promise<HolidayCoverageRequirement[]> {
    return upsertBranchCoverage(fastify, holidayId, input, actor);
  }

  static rosterKey(
    input: Pick<UpsertHolidayRosterRequest, 'workDate' | 'legacyStaffId' | 'importedName' | 'displayName'>
  ) {
    return buildRosterKey(input);
  }

  static upsertRoster(
    fastify: FastifyInstance,
    holidayId: number,
    input: UpsertHolidayRosterRequest,
    actor: Actor,
    rosterId?: number
  ) {
    return upsertRoster(fastify, holidayId, input, actor, rosterId);
  }

  static generateCandidates(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    return generateCandidates(fastify, holidayId, actor);
  }

  static detectUnplannedAttendance(fastify: FastifyInstance, period: SafeAny, actor: Actor) {
    return detectUnplannedAttendance(fastify, period, actor);
  }

  static recalculateLedger(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    return recalculateLedger(fastify, holidayId, actor);
  }

  static publish(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    return publishHolidayPeriod(fastify, holidayId, actor);
  }

  static lockPayroll(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    return lockPayroll(fastify, holidayId, actor);
  }

  static listPerformanceEvents(
    fastify: FastifyInstance,
    query: StaffPerformanceEventQuery
  ): Promise<StaffPerformanceEventListResponse> {
    return listPerformanceEvents(fastify, query);
  }

  static createPerformanceEvent(fastify: FastifyInstance, input: CreateStaffPerformanceEventRequest, actor: Actor) {
    return createPerformanceEvent(fastify, input, actor);
  }

  static reviewPerformanceEvent(
    fastify: FastifyInstance,
    eventId: number,
    status: 'VERIFIED' | 'REJECTED',
    actor: Actor,
    rejectionReason?: string
  ) {
    return reviewPerformanceEvent(fastify, eventId, status, actor, rejectionReason);
  }

  static createPayrollAdjustment(
    fastify: FastifyInstance,
    holidayId: number,
    input: CreateHolidayPayrollAdjustmentRequest,
    actor: Actor
  ) {
    return createPayrollAdjustment(fastify, holidayId, input, actor);
  }

  static getPayBreakdownByLegacyStaffIds(
    fastify: FastifyInstance,
    legacyStaffIds: number[],
    dateFrom: string,
    dateTo: string
  ): Promise<Map<number, HolidayPayBreakdown>> {
    return getPayBreakdownByLegacyStaffIds(fastify, legacyStaffIds, dateFrom, dateTo);
  }

  static getPublishedHolidayWorkedDateKeys(
    fastify: FastifyInstance,
    legacyStaffIds: number[],
    dateFrom: string,
    dateTo: string
  ): Promise<Map<number, Set<string>>> {
    return getPublishedHolidayWorkedDateKeys(fastify, legacyStaffIds, dateFrom, dateTo);
  }
}
