import { FastifyInstance } from 'fastify';
import { BkGameParticipant, SafeAny } from '@mos-lab/shared';
import { getBkCallMetricsByLegacyStaffIds } from '../bk-salary.service.js';
import { computeTargetProgressPercent, formatIctDate, formatIctDateTime } from './bk-game-helpers.js';

export interface LiveScoreGameContext {
  startDate: Date;
  endDate: Date;
  metricType: string;
  targetScore?: number | null;
}

/**
 * Computes real-time metric scores from legacy DB / call telemetry for ACTIVE games.
 */
export async function computeLiveParticipantScores(
  fastify: FastifyInstance,
  game: LiveScoreGameContext,
  participants: BkGameParticipant[],
  channelFilter: string
): Promise<BkGameParticipant[]> {
  if (participants.length === 0) {
    return participants;
  }

  const staffIds = participants.map((p) => p.staffId);
  const startIctDateTime = formatIctDateTime(game.startDate);
  const endIctDateTime = formatIctDateTime(game.endDate);
  const startDateStr = formatIctDate(game.startDate);
  const endDateStr = formatIctDate(game.endDate);

  const scoreMap = new Map<number, number>();

  if (game.metricType === 'BOOKINGS') {
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        o.created_staff_id AS staffId,
        COUNT(DISTINCT o.id) AS metricCount
      FROM \`order\` o
      WHERE o.created_staff_id IN (${staffIds.join(',')})
        AND o.date_created >= '${startIctDateTime}'
        AND o.date_created <= '${endIctDateTime}'
        AND o.order_state != 'Cancelled'
        ${channelFilter}
      GROUP BY o.created_staff_id
    `);
    for (const r of rows) {
      scoreMap.set(Number(r.staffId), Number(r.metricCount || 0));
    }
  } else if (game.metricType === 'DONE') {
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        o.created_staff_id AS staffId,
        COUNT(DISTINCT o.id) AS metricCount
      FROM \`order\` o
      WHERE o.created_staff_id IN (${staffIds.join(',')})
        AND o.booking_date_start >= '${startIctDateTime}'
        AND o.booking_date_start <= '${endIctDateTime}'
        AND o.order_state = 'Completed'
        ${channelFilter}
      GROUP BY o.created_staff_id
    `);
    for (const r of rows) {
      scoreMap.set(Number(r.staffId), Number(r.metricCount || 0));
    }
  } else if (game.metricType === 'CALLS' || game.metricType === 'PICKUPS') {
    const callMetrics = await getBkCallMetricsByLegacyStaffIds(fastify, startDateStr, endDateStr, staffIds);
    for (const staffId of staffIds) {
      const metric = callMetrics.get(staffId);
      const count = game.metricType === 'CALLS' ? metric?.callCount || 0 : metric?.pickupCount || 0;
      scoreMap.set(staffId, count);
    }
  } else {
    // COMPOSITE: 10 pts per booking + 1 pt per call
    const bookingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        o.created_staff_id AS staffId,
        COUNT(DISTINCT o.id) AS metricCount
      FROM \`order\` o
      WHERE o.created_staff_id IN (${staffIds.join(',')})
        AND o.date_created >= '${startIctDateTime}'
        AND o.date_created <= '${endIctDateTime}'
        AND o.order_state != 'Cancelled'
        ${channelFilter}
      GROUP BY o.created_staff_id
    `);
    const callMetrics = await getBkCallMetricsByLegacyStaffIds(fastify, startDateStr, endDateStr, staffIds);
    for (const staffId of staffIds) {
      const bookingRow = bookingRows.find((r) => Number(r.staffId) === staffId);
      const bCount = Number(bookingRow?.metricCount || 0);
      const cCount = callMetrics.get(staffId)?.callCount || 0;
      scoreMap.set(staffId, bCount * 10 + cCount);
    }
  }

  return participants.map((p) => {
    const liveScore = scoreMap.get(p.staffId) || 0;
    return {
      ...p,
      score: liveScore,
      targetProgressPercent: computeTargetProgressPercent(liveScore, game.targetScore),
    };
  });
}
