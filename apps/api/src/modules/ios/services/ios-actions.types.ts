/**
 * ios-actions.types.ts — Shared types for executeIosBookingAction
 */
import type { SafeAny } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';

export interface ExecuteIosActionResult {
  statusCode: number;
  payload: Record<string, SafeAny>;
}

export interface ExecuteIosActionOptions {
  simulationMode?: boolean;
  enableLegacyStepSync?: boolean;
  /** Fastify instance — required for grantReferralDiamond to access prisma.legacy */
  fastify?: FastifyInstance;
}
