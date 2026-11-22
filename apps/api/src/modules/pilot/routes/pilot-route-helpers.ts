import type { FastifyInstance, FastifyReply } from 'fastify';
import { PilotServiceError } from '../pilot.service.js';

export function sendPilotError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, action: string) {
  if (error instanceof PilotServiceError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  fastify.log.error(error as Error, action);
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Đã có lỗi xảy ra trong quá trình xử lý ca pilot.',
  });
}
