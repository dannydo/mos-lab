import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { createEmptyCcPaystubResponse, parseDefaultDateRange } from './cc-paystub.helpers.js';
import { fetchActiveCcStaffProfiles, fetchCcPaystubSources } from './cc-paystub.queries.js';
import { indexCcPaystubSources } from './cc-paystub.indexer.js';
import { buildCcPaystubResponse } from './cc-paystub.calculator.js';

export function registerCcPaystubMainRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cc-paystub
  fastify.get('/kpi/cc-paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const { startPart, endPart } = parseDefaultDateRange(dateFrom, dateTo);

    try {
      const { activeCcIds, filteredStaffProfiles } = await fetchActiveCcStaffProfiles(fastify, storeId);

      if (activeCcIds.length === 0 || filteredStaffProfiles.length === 0) {
        return reply.send(createEmptyCcPaystubResponse());
      }

      const validStaffIds = filteredStaffProfiles.map((s) => Number(s.userId));
      const sources = await fetchCcPaystubSources(fastify, validStaffIds, startPart, endPart, storeId);
      const indexed = indexCcPaystubSources(validStaffIds, startPart, endPart, sources);
      const response = buildCcPaystubResponse(filteredStaffProfiles, indexed);

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Get CC Paystub error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải báo cáo thu nhập CC.' });
    }
  });
}
