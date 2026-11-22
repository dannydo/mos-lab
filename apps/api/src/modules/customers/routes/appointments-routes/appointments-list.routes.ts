import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { computeDailyCapacities } from './appointments-capacity.helper.js';
import {
  computeAppointmentSummaryMetrics,
  fetchAppointmentEnrichment,
  mapAppointmentRows,
} from './appointments-hydration.helper.js';
import { fetchAppointmentPageData } from './appointments-orders-query.helper.js';
import { resolveAppointmentsScope } from './appointments-scope.helper.js';
import { AppointmentAuthUser, AppointmentsListQuery } from './appointments.types.js';

export async function registerAppointmentsListRoutes(fastify: FastifyInstance) {
  // GET /api/customers/appointments
  // Get list of appointments for assigned customers
  fastify.get('/customers/appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as AppointmentsListQuery;
    const { dateFrom, dateTo, type, status, storeId, page, limit, pageSize } = query;
    const user = request.user as AppointmentAuthUser;

    if (!dateFrom || !dateTo) {
      return reply.status(400).send({ error: 'Bad Request', message: 'dateFrom and dateTo are required' });
    }

    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || pageSize || '50', 10) || 50;
    const offsetNum = (pageNum - 1) * limitNum;

    try {
      const scope = await resolveAppointmentsScope(fastify, user, query);
      if (scope.empty) {
        return { data: [], total: 0 };
      }

      const cleanDateFrom = dateFrom.includes(' ') ? dateFrom : `${dateFrom} 00:00:00`;
      const cleanDateTo = dateTo.includes(' ') ? dateTo : `${dateTo} 23:59:59`;
      const filterType = (type || (status && status !== 'all' ? status : '')).toLowerCase();

      const pageData = await fetchAppointmentPageData({
        fastify,
        cleanDateFrom,
        cleanDateTo,
        scope,
        storeId,
        filterType,
        limitNum,
        offsetNum,
      });

      const enrichment = await fetchAppointmentEnrichment(fastify, pageData.result);

      const { orderCheckinMap, summary } = await computeAppointmentSummaryMetrics({
        fastify,
        dateFrom,
        dateTo,
        cleanDateFrom,
        cleanDateTo,
        filterByStaff: scope.filterByStaff,
        staffLegacyId: scope.staffLegacyId,
        staffRole: scope.staffRole,
        candidateIds: pageData.candidateIds,
        total: pageData.total,
      });

      const appointments = mapAppointmentRows({
        result: pageData.result,
        enrichment,
        orderCheckinMap,
        branchCodeByStoreId: pageData.branchCodeByStoreId,
      });

      const dailyCapacities = await computeDailyCapacities({
        fastify,
        cleanDateFrom,
        cleanDateTo,
        storeId,
      });

      return {
        data: appointments,
        total: pageData.total,
        dailyCapacities,
        summary,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to retrieve appointments',
      });
    }
  });
}
