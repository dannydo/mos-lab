import type { FastifyInstance } from 'fastify';
import { happyCallService } from './happy-call.service.js';

export function registerHappyCallCron(fastify: FastifyInstance): void {
  // Initial run on startup (after 10s delay to allow server boot)
  setTimeout(() => {
    happyCallService.generateDailyTasks(fastify).catch((err) => {
      fastify.log.error(err, '[HappyCallCron] Failed initial task generation');
    });
  }, 10000);

  // Run every 2 hours
  const INTERVAL_MS = 2 * 60 * 60 * 1000;
  setInterval(() => {
    happyCallService.generateDailyTasks(fastify).catch((err) => {
      fastify.log.error(err, '[HappyCallCron] Failed scheduled task generation');
    });
  }, INTERVAL_MS);

  fastify.log.info('[HappyCallCron] Registered Happy Call automated task generation cronjob');
}
