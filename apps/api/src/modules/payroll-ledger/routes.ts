import type { FastifyInstance } from 'fastify';
import type { RecordCcNativeEvidenceRequest } from '@mos-lab/shared';
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.js';
import { CcNativeEvidenceService } from './cc-native-evidence.service.js';
import { CcNativePilotDashboardService } from './cc-native-pilot-dashboard.service.js';
import { CcNativePilotCohortService } from './cc-native-pilot-cohort.service.js';
import { LockedSettlementExportService } from './locked-settlement-export.service.js';

/**
 * Production handoff boundary for the local Adjustment workspace.
 *
 * The route is deliberately read-only and only an authenticated Super Admin
 * can obtain a hash-verified export from an already locked settlement. It
 * does not create a period, rebuild Legacy data, or post any payroll entry.
 */
export async function payrollLedgerRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { periodKey?: string } }>(
    '/payroll-ledger/cc-pilot-dashboard',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (request, reply) => {
      try {
        return reply.send(await CcNativePilotDashboardService.get(fastify, request.query.periodKey));
      } catch (error) {
        return reply.status(409).send({
          message: error instanceof Error ? error.message : 'Unable to load the native CC pilot dashboard',
        });
      }
    }
  );

  /**
   * A temporary, operator-only native-evidence boundary.  Future mOS service,
   * sales-close and tip workflows call this service directly; no Legacy/iOS
   * row can be submitted here and no payroll amount is posted.
   */
  fastify.post<{ Body: RecordCcNativeEvidenceRequest }>(
    '/payroll-ledger/cc-evidence',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (request, reply) => {
      try {
        await CcNativePilotCohortService.requireSubject(fastify, request.body?.subjectKey);
        const evidence = await fastify.prisma.crm.$transaction((tx) =>
          CcNativeEvidenceService.record(tx, request.user.id, request.body)
        );
        return reply.status(201).send({ evidence });
      } catch (error) {
        return reply.status(409).send({
          message: error instanceof Error ? error.message : 'Unable to record native CC evidence',
        });
      }
    }
  );

  fastify.post<{ Params: { periodKey: string; subjectKey: string }; Body: { payrollPeriodId: number } }>(
    '/payroll-ledger/cc-evidence/:periodKey/:subjectKey/finalize',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (request, reply) => {
      const payrollPeriodId = request.body?.payrollPeriodId;
      if (!Number.isSafeInteger(payrollPeriodId) || payrollPeriodId <= 0) {
        return reply
          .status(400)
          .send({ message: 'A positive payroll period is required to finalize native CC evidence' });
      }
      try {
        await CcNativePilotCohortService.requireSubject(fastify, request.params.subjectKey);
        const result = await fastify.prisma.crm.$transaction((tx) =>
          CcNativeEvidenceService.finalizeSubject(tx, {
            payrollPeriodId,
            periodKey: request.params.periodKey,
            subjectKey: request.params.subjectKey,
          })
        );
        return reply.status(201).send({ policy: result.policy, ledgerEventCount: result.ledgerEvents.length });
      } catch (error) {
        return reply.status(409).send({
          message: error instanceof Error ? error.message : 'Unable to finalize native CC evidence',
        });
      }
    }
  );

  fastify.get<{ Params: { periodKey: string } }>(
    '/payroll-ledger/settlements/:periodKey/locked-export',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (request, reply) => {
      try {
        return reply.send(await LockedSettlementExportService.exportLockedPeriod(fastify, request.params.periodKey));
      } catch (error) {
        return reply.status(409).send({
          message: error instanceof Error ? error.message : 'Unable to export the locked payroll settlement',
        });
      }
    }
  );
}
