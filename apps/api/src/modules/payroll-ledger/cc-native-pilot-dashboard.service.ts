import type { NativeCcPilotDashboardResponse } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { CcNativePilotCohortService } from './cc-native-pilot-cohort.service.js';

/**
 * Read-only operational projection for the production CC pilot. It deliberately
 * reads only mOS-owned period, evidence, ledger and settlement state. Legacy
 * comparison data and local rehearsal fixtures cannot cross this boundary.
 */
export class CcNativePilotDashboardService {
  static async get(fastify: FastifyInstance, requestedPeriodKey?: string): Promise<NativeCcPilotDashboardResponse> {
    const cohort = await CcNativePilotCohortService.getCohort(fastify);
    const periods = await fastify.prisma.crm.crmPayrollPeriod.findMany({
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      take: 24,
      select: { id: true, periodKey: true, label: true, status: true, lockedAt: true },
    });
    const activePeriod = requestedPeriodKey
      ? periods.find((period) => period.periodKey === requestedPeriodKey)
      : periods[0];
    if (requestedPeriodKey && !activePeriod) throw new Error('The selected payroll period was not found');
    const periodDtos: NativeCcPilotDashboardResponse['periods'] = periods.map((period) => ({
      id: period.id,
      periodKey: period.periodKey,
      label: period.label,
      status: period.status as NativeCcPilotDashboardResponse['periods'][number]['status'],
      lockedAt: period.lockedAt?.toISOString() ?? null,
    }));

    if (!activePeriod) {
      return {
        mode: 'PRODUCTION_PILOT_READ_ONLY',
        cohort: { version: cohort.version, enabled: true, subjects: cohort.subjects },
        periods: periodDtos,
        activePeriodKey: null,
        summary: {
          cohortSize: cohort.subjects.length,
          evidenceCount: 0,
          finalizedSubjectCount: 0,
          settlementStatus: null,
        },
        rows: cohort.subjects.map((subject) => ({ ...subject, evidence: [], ledger: [], finalized: false })),
      };
    }

    const [evidence, ledger, settlement] = await Promise.all([
      fastify.prisma.crm.crmPayrollCcEvidence.findMany({
        where: {
          payrollPeriodId: activePeriod.id,
          subjectKey: { in: cohort.subjects.map((subject) => subject.subjectKey) },
        },
        orderBy: [{ sourceOccurredAt: 'asc' }, { evidenceKey: 'asc' }],
        select: {
          evidenceKey: true,
          subjectKey: true,
          evidenceKind: true,
          component: true,
          amountHalfDong: true,
          sourceReference: true,
          sourceOccurredAt: true,
          policyVersion: true,
        },
      }),
      fastify.prisma.crm.crmPayrollLedgerEvent.findMany({
        where: {
          payrollPeriodId: activePeriod.id,
          subjectKey: { in: cohort.subjects.map((subject) => subject.subjectKey) },
        },
        orderBy: [{ sourceOccurredAt: 'asc' }, { eventKey: 'asc' }],
        select: {
          eventKey: true,
          subjectKey: true,
          component: true,
          amountHalfDong: true,
          sourceReference: true,
          sourceOccurredAt: true,
        },
      }),
      fastify.prisma.crm.crmPayrollSettlement.findFirst({
        where: { payrollPeriodId: activePeriod.id },
        orderBy: { version: 'desc' },
        select: { status: true },
      }),
    ]);

    const rows = cohort.subjects.map((subject) => {
      const subjectLedger = ledger.filter((row) => row.subjectKey === subject.subjectKey);
      return {
        subjectKey: subject.subjectKey,
        displayName: subject.displayName,
        evidence: evidence
          .filter((row) => row.subjectKey === subject.subjectKey)
          .map((row) => ({
            evidenceKey: row.evidenceKey,
            kind: row.evidenceKind as NativeCcPilotDashboardResponse['rows'][number]['evidence'][number]['kind'],
            component: row.component as NativeCcPilotDashboardResponse['rows'][number]['evidence'][number]['component'],
            amountHalfDong: row.amountHalfDong,
            sourceReference: row.sourceReference,
            sourceOccurredAt: row.sourceOccurredAt.toISOString(),
            policyVersion: row.policyVersion,
          })),
        ledger: subjectLedger.map((row) => ({
          eventKey: row.eventKey,
          component: row.component,
          amountHalfDong: row.amountHalfDong,
          sourceReference: row.sourceReference,
          sourceOccurredAt: row.sourceOccurredAt.toISOString(),
        })),
        finalized: subjectLedger.some((row) => row.component === 'CC_POLICY_FINALIZED'),
      };
    });

    return {
      mode: 'PRODUCTION_PILOT_READ_ONLY',
      cohort: { version: cohort.version, enabled: true, subjects: cohort.subjects },
      periods: periodDtos,
      activePeriodKey: activePeriod.periodKey,
      summary: {
        cohortSize: cohort.subjects.length,
        evidenceCount: evidence.length,
        finalizedSubjectCount: rows.filter((row) => row.finalized).length,
        settlementStatus: settlement?.status ?? null,
      },
      rows,
    };
  }
}
