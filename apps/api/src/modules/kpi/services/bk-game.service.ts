import { FastifyInstance } from 'fastify';
import {
  BkGame,
  BkGameCreateInput,
  BkGameDetailResponse,
  BkGameFinalizeInput,
  BkGameListResponse,
  BkGameParticipant,
  BkGameTeamKpiSummary,
  BkGameUpdateInput,
} from '@mos-lab/shared';
import { syncGameDoneBonuses as syncGameDoneBonusesImpl } from './bk-game-service/bk-game-done-bonus.js';
import { computeTeamKpiSummary as computeTeamKpiSummaryImpl } from './bk-game-service/bk-game-team-kpi.js';
import { getGameDetail as getGameDetailImpl, getGames as getGamesImpl } from './bk-game-service/bk-game-queries.js';
import {
  cancelGame as cancelGameImpl,
  createGame as createGameImpl,
  finalizeGame as finalizeGameImpl,
  updateGame as updateGameImpl,
} from './bk-game-service/bk-game-mutations.js';

export { parseTeamBookingDoneBonusConfig } from './bk-game-team-booking-done-bonus.service.js';
export {
  buildBookingChannelFilter,
  formatIctDate,
  formatIctDateTime,
  parseAllowedBookingChannels,
  parseDoneBonusConfig,
  parseTeamKpiConfig,
} from './bk-game-service/bk-game-helpers.js';

export class BkGameService {
  /**
   * Retrieves all Telesales games, optionally filtered by status.
   */
  static async getGames(fastify: FastifyInstance, statusFilter?: string): Promise<BkGameListResponse> {
    return getGamesImpl(fastify, statusFilter);
  }

  /**
   * Synchronizes completed order bonuses for games configured with doneBonusConfig.
   * Ensures each order is credited only once and cancelled/missed orders are pruned.
   */
  static async syncGameDoneBonuses(fastify: FastifyInstance, gameId: number): Promise<void> {
    return syncGameDoneBonusesImpl(fastify, gameId);
  }

  /**
   * Computes Team KPI summary, daily breakdown, and reward/penalty ledger.
   */
  static async computeTeamKpiSummary(
    fastify: FastifyInstance,
    game: {
      id: number;
      startDate: Date;
      endDate: Date;
      targetScore?: number | null;
      teamKpiConfig?: string | null;
      allowedBookingChannels?: string | null;
    },
    participants: BkGameParticipant[]
  ): Promise<BkGameTeamKpiSummary | null> {
    return computeTeamKpiSummaryImpl(fastify, game, participants);
  }

  /**
   * Retrieves single game with real-time computed scores & ranks.
   */
  static async getGameDetail(fastify: FastifyInstance, gameId: number): Promise<BkGameDetailResponse | null> {
    return getGameDetailImpl(fastify, gameId);
  }

  /**
   * Creates a new Telesales Game (individual or team battle).
   */
  static async createGame(fastify: FastifyInstance, input: BkGameCreateInput, creatorStaffId: number): Promise<BkGame> {
    return createGameImpl(fastify, input, creatorStaffId);
  }

  /**
   * Updates an existing Telesales game's settings (channels, target, descriptions, etc.).
   */
  static async updateGame(fastify: FastifyInstance, gameId: number, input: BkGameUpdateInput): Promise<BkGame> {
    return updateGameImpl(fastify, gameId, input);
  }

  /**
   * Finalizes game, calculates winners, distributes reward pool, and records fun penalty notes.
   */
  static async finalizeGame(fastify: FastifyInstance, gameId: number, input?: BkGameFinalizeInput): Promise<BkGame> {
    return finalizeGameImpl(fastify, gameId, input);
  }

  /**
   * Cancels a game.
   */
  static async cancelGame(fastify: FastifyInstance, gameId: number): Promise<boolean> {
    return cancelGameImpl(fastify, gameId);
  }
}
