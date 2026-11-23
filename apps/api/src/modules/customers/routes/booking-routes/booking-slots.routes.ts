import { FastifyInstance } from 'fastify';
import { SlotBookingInfo } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  buildBookingSlotMatrix,
  fetchActiveOrdersForDate,
  fetchCvRosterForDate,
  resolveBookingSlotsStoreId,
} from './booking-slots.helper.js';
import { enrichSlotOrderBookings } from './booking-slots-enrichment.helper.js';

export async function registerBookingSlotsRoutes(fastify: FastifyInstance) {
  // GET /api/customers/booking-slots
  // Calculate slot available matrix based on core shift tables, weekly/requested day-offs, and live orders
  fastify.get('/customers/booking-slots', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      date,
      storeName,
      storeId: queryStoreId,
      technicianId,
    } = request.query as {
      date?: string;
      storeName?: string;
      storeId?: string | number;
      technicianId?: string;
    };

    if (!date || (!storeName && !queryStoreId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'date and storeName/storeId are required' });
    }

    try {
      const storeId = resolveBookingSlotsStoreId(queryStoreId, storeName);

      const roster = await fetchCvRosterForDate(fastify, { date, storeId, technicianId });
      if (roster === null) {
        return reply.send({});
      }

      const orders = await fetchActiveOrdersForDate(fastify, { date, storeId, technicianId });

      // When technicianId is provided, enrich orders with customer profiles, previous/next bookings, and lash history
      const customerBookingInfoMap =
        technicianId && orders.length > 0
          ? await enrichSlotOrderBookings(fastify, date, orders)
          : new Map<number, SlotBookingInfo>();

      return buildBookingSlotMatrix(roster, orders, customerBookingInfoMap);
    } catch (error: unknown) {
      fastify.log.error(error as Error, 'Calculate booking slots error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to calculate booking slots' });
    }
  });
}
