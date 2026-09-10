import type { FastifyInstance } from 'fastify';
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.js';
import { LockedSettlementExportService } from './locked-settlement-export.service.js';

/**
 * Production handoff boundary for the local Adjustment workspace.
 *
 * The route is deliberately read-only and only an authenticated Super Admin
 * can obtain a hash-verified export from an already locked settlement. It
 * does not create a period, rebuild Legacy data, or post any payroll entry.
 */
export async function payrollLedgerRoutes(fastify: FastifyInstance) {
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
