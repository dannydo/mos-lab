import { FastifyInstance } from 'fastify';
import {
  BkGameParticipant,
  BkGameTeamBookingDoneBonusRecord,
  BkGameTeamBookingDoneBonusSummary,
  SafeAny,
} from '@mos-lab/shared';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';
import {
  buildChannelFilterLocal,
  buildIctDateList,
  formatIctDateLocal,
  formatVietnameseDateLabel,
  normalizeTeamBookingDoneTiers,
  normalizeTimeHHmm,
  parseChannelsLocal,
  parseTeamBookingDoneBonusConfig,
  parseTeamKpiConfigLocal,
  resolveEffectiveDailyTimeWindow,
  resolveTeamBookingDoneTier,
  type ResolvedTeamBookingDoneTier,
} from './bk-game-team-bonus/team-bonus-config.js';
import {
  aggregateTeamBookingDoneBonusData,
  type CompletedOrderCandidate,
  type QualifiedTeamBookingDoneLedgerItem,
} from './bk-game-team-bonus/team-bonus-aggregator.js';
import { mergeActiveBkTelesalesParticipants } from './bk-game-team-bonus/team-bonus-participants.js';

export {
  aggregateTeamBookingDoneBonusData,
  buildIctDateList,
  formatVietnameseDateLabel,
  mergeActiveBkTelesalesParticipants,
  normalizeTeamBookingDoneTiers,
  normalizeTimeHHmm,
  parseTeamBookingDoneBonusConfig,
  resolveEffectiveDailyTimeWindow,
  resolveTeamBookingDoneTier,
  type CompletedOrderCandidate,
  type QualifiedTeamBookingDoneLedgerItem,
  type ResolvedTeamBookingDoneTier,
};

export class BkGameTeamBookingDoneBonusService {
  static async syncAndComputeSummary(
    fastify: FastifyInstance,
    game: {
      id: number;
      gameType: string;
      status: string;
      startDate: Date;
      endDate: Date;
      allowedBookingChannels?: string | null;
      teamKpiConfig?: string | null;
      teamBookingDoneBonusConfig?: string | null;
    },
    participants: BkGameParticipant[],
    options: { forceSync?: boolean } = {}
  ): Promise<BkGameTeamBookingDoneBonusSummary | null> {
    const config = parseTeamBookingDoneBonusConfig(game.teamBookingDoneBonusConfig);
    if (!config || !config.enabled || config.tiers.length === 0) {
      return null;
    }

    const resolvedParticipants = await mergeActiveBkTelesalesParticipants(fastify, game, participants);

    const staffIds = Array.from(
      new Set(resolvedParticipants.map((p) => Number(p.staffId)).filter((id) => Number.isInteger(id) && id > 0))
    );
    if (staffIds.length === 0) {
      return null;
    }

    const startDateStr = formatIctDateLocal(game.startDate);
    const endDateStr = formatIctDateLocal(game.endDate);
    const todayStr = formatIctDateLocal(new Date());
    const dailyList = buildIctDateList(startDateStr, endDateStr, 120);
    if (dailyList.length === 0) {
      return null;
    }

    // Daily bonus evaluation covers full calendar days in ICT (startDateStr..endDateStr),
    // while effectiveWindow narrows booking creation hours within each day.
    const dayStartIctDateTime = `${startDateStr} 00:00:00`;
    const dayEndIctDateTime = `${endDateStr} 23:59:59`;
    const allowedChannels = parseChannelsLocal(game.allowedBookingChannels);
    const channelFilter = buildChannelFilterLocal(allowedChannels, 'o.booking_channels');
    const teamKpiConfig = parseTeamKpiConfigLocal(game.teamKpiConfig);
    const effectiveWindow = resolveEffectiveDailyTimeWindow(config, game.gameType, teamKpiConfig);

    const timeWindowFilter = effectiveWindow
      ? `AND TIME(o.date_created) >= '${effectiveWindow.start}:00' AND TIME(o.date_created) <= '${effectiveWindow.end}:59'`
      : '';

    const ledgerModel = fastify.prisma?.crm?.crmBkGameTeamBookingDoneBonus;
    const isCompletedGame = game.status === 'COMPLETED';
    const shouldSyncLedger = Boolean(ledgerModel) && (!isCompletedGame || options.forceSync === true);

    let frozenRecords: BkGameTeamBookingDoneBonusRecord[] | undefined;
    if (isCompletedGame && !options.forceSync && ledgerModel) {
      const existingFrozen = await ledgerModel.findMany({
        where: { gameId: game.id },
        orderBy: [{ orderCompletedAt: 'desc' }, { id: 'desc' }],
      });
      if (existingFrozen.length > 0) {
        frozenRecords = existingFrozen.map((r) => {
          const p = resolvedParticipants.find((x) => x.staffId === r.staffId);
          return {
            id: r.id,
            gameId: r.gameId,
            orderId: r.orderId,
            orderKey: r.orderKey,
            staffId: r.staffId,
            staffName: p?.staffName || `Nhân viên #${r.staffId}`,
            customerName: r.customerName,
            rewardDate: r.rewardDate,
            teamBookings: r.teamBookings,
            tierLabel: r.tierLabel,
            bonusPerDone: r.bonusPerDone,
            bonusAmount: r.bonusAmount,
            orderCompletedAt: r.orderCompletedAt ? r.orderCompletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
          };
        });
      }
    }

    let bookingRows: SafeAny[];
    let completedOrderRows: SafeAny[];

    try {
      [bookingRows, completedOrderRows] = await Promise.all([
        // Rule BK-007 v1.1.0 (2026-11-20): Count all created bookings in the configured time window
        // (including orders cancelled later) per Product Owner ruling accepting virtual/cancelled bookings for this game.
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT
            DATE_FORMAT(o.date_created, '%Y-%m-%d') AS bookingDate,
            COUNT(DISTINCT o.id) AS teamBookings
          FROM \`order\` o
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.date_created >= '${dayStartIctDateTime}'
            AND o.date_created <= '${dayEndIctDateTime}'
            ${timeWindowFilter}
            ${channelFilter}
          GROUP BY DATE_FORMAT(o.date_created, '%Y-%m-%d')
        `),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT
            o.id AS orderId,
            o.order_key AS orderKey,
            o.created_staff_id AS staffId,
            COALESCE(up_c.full_name, 'Khách hàng') AS customerName,
            COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) AS completedAt,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created), '%Y-%m-%d') AS completedDate
          FROM \`order\` o
          LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
          LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.order_state IN ('Completed', 'CheckOut')
            AND (
              (ro.actual_booking_date_start >= '${dayStartIctDateTime}' AND ro.actual_booking_date_start <= '${dayEndIctDateTime}')
              OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${dayStartIctDateTime}' AND o.booking_date_start <= '${dayEndIctDateTime}')
              OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start IS NULL AND o.date_created >= '${dayStartIctDateTime}' AND o.date_created <= '${dayEndIctDateTime}')
            )
            ${channelFilter}
          ORDER BY completedAt DESC, o.id DESC
        `),
      ]);
    } catch (err) {
      fastify.log?.warn?.(err, `Could not query legacy orders for team-booking done bonus on game ${game.id}`);
      bookingRows = [];
      completedOrderRows = [];
    }

    const dailyTeamBookingsMap = new Map<string, number>();
    for (const r of bookingRows || []) {
      const d = String(r.bookingDate || '');
      if (d) {
        dailyTeamBookingsMap.set(d, Number(r.teamBookings || 0));
      }
    }

    const uniqueOrdersMap = new Map<number, CompletedOrderCandidate>();
    for (const r of completedOrderRows || []) {
      const oid = Number(r.orderId);
      if (!Number.isInteger(oid) || oid <= 0 || uniqueOrdersMap.has(oid)) continue;
      uniqueOrdersMap.set(oid, {
        orderId: oid,
        orderKey: r.orderKey ? String(r.orderKey) : `#${oid}`,
        staffId: Number(r.staffId),
        customerName: r.customerName ? String(r.customerName) : 'Khách hàng',
        completedAt: r.completedAt,
        completedDate: String(r.completedDate || ''),
      });
    }

    const completedOrders = Array.from(uniqueOrdersMap.values());
    const orderIds = completedOrders.map((o) => o.orderId);
    const comboLiveMap =
      orderIds.length > 0
        ? await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, orderIds)
        : new Map<number, boolean>();

    const { summary, qualifiedLedgerItems } = aggregateTeamBookingDoneBonusData({
      gameId: game.id,
      config,
      effectiveWindow,
      dailyList,
      todayStr,
      dailyTeamBookingsMap,
      completedOrders,
      comboLiveMap,
      participants: resolvedParticipants,
      frozenRecords,
    });

    if (shouldSyncLedger && ledgerModel) {
      const existingRows = await ledgerModel.findMany({
        where: { gameId: game.id },
      });
      const existingByOrderId = new Map(existingRows.map((row) => [row.orderId, row]));
      const qualifiedOrderIds = new Set(qualifiedLedgerItems.map((item) => item.orderId));

      const staleIds = existingRows.filter((row) => !qualifiedOrderIds.has(row.orderId)).map((row) => row.id);
      if (staleIds.length > 0) {
        await ledgerModel.deleteMany({
          where: { id: { in: staleIds } },
        });
      }

      for (const item of qualifiedLedgerItems) {
        const existing = existingByOrderId.get(item.orderId);
        if (
          existing &&
          existing.staffId === item.staffId &&
          existing.rewardDate === item.rewardDate &&
          existing.teamBookings === item.teamBookings &&
          existing.tierLabel === item.tierLabel &&
          existing.bonusPerDone === item.bonusPerDone &&
          existing.bonusAmount === item.bonusAmount
        ) {
          continue;
        }
        try {
          await ledgerModel.upsert({
            where: {
              gameId_orderId: {
                gameId: game.id,
                orderId: item.orderId,
              },
            },
            create: {
              gameId: game.id,
              orderId: item.orderId,
              orderKey: item.orderKey,
              staffId: item.staffId,
              customerName: item.customerName,
              rewardDate: item.rewardDate,
              teamBookings: item.teamBookings,
              tierLabel: item.tierLabel,
              bonusPerDone: item.bonusPerDone,
              bonusAmount: item.bonusAmount,
              orderCompletedAt: !isNaN(item.orderCompletedAt.getTime()) ? item.orderCompletedAt : null,
            },
            update: {
              orderKey: item.orderKey,
              staffId: item.staffId,
              customerName: item.customerName,
              rewardDate: item.rewardDate,
              teamBookings: item.teamBookings,
              tierLabel: item.tierLabel,
              bonusPerDone: item.bonusPerDone,
              bonusAmount: item.bonusAmount,
              orderCompletedAt: !isNaN(item.orderCompletedAt.getTime()) ? item.orderCompletedAt : null,
            },
          });
        } catch {
          // Unique key protection under concurrent sync
        }
      }

      const persistedRows = await ledgerModel.findMany({
        where: { gameId: game.id },
        orderBy: [{ orderCompletedAt: 'desc' }, { id: 'desc' }],
      });
      summary.records = persistedRows.map((r) => {
        const p = participants.find((x) => x.staffId === r.staffId);
        return {
          id: r.id,
          gameId: r.gameId,
          orderId: r.orderId,
          orderKey: r.orderKey,
          staffId: r.staffId,
          staffName: p?.staffName || `Nhân viên #${r.staffId}`,
          customerName: r.customerName,
          rewardDate: r.rewardDate,
          teamBookings: r.teamBookings,
          tierLabel: r.tierLabel,
          bonusPerDone: r.bonusPerDone,
          bonusAmount: r.bonusAmount,
          orderCompletedAt: r.orderCompletedAt ? r.orderCompletedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        };
      });
    }

    return summary;
  }
}
