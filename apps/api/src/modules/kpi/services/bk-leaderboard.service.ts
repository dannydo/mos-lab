import { FastifyInstance } from 'fastify';
import type {
  BkBookingLeaderboardParams,
  BkBookingLeaderboardResult,
  BkDoneLeaderboardParams,
  BkDoneLeaderboardResult,
  BkIncomingBookingsCountParams,
  BkRevenueLeaderboardParams,
  BkRevenueLeaderboardResult,
} from './bk-leaderboard/bk-leaderboard.types.js';
import {
  getBookingLeaderboard as fetchBookingLeaderboard,
  getIncomingBookingsCount as fetchIncomingBookingsCount,
} from './bk-leaderboard/booking-leaderboard.js';
import { getDoneLeaderboard as fetchDoneLeaderboard } from './bk-leaderboard/done-leaderboard.js';
import { getRevenueLeaderboard as fetchRevenueLeaderboard } from './bk-leaderboard/revenue-leaderboard.js';

export type {
  BkBookingLeaderboardParams,
  BkBookingLeaderboardResult,
  BkDoneLeaderboardParams,
  BkDoneLeaderboardResult,
  BkIncomingBookingsCountParams,
  BkRevenueLeaderboardParams,
  BkRevenueLeaderboardResult,
};

export class BkLeaderboardService {
  /**
   * Single Source of Truth for BK Booking Leaderboard, Call & Pickup metrics.
   * Unified across /dashboard/bk?tab=booking and /dashboard/telesale-target.
   */
  static async getBookingLeaderboard(
    fastify: FastifyInstance,
    options: BkBookingLeaderboardParams = {}
  ): Promise<BkBookingLeaderboardResult> {
    return fetchBookingLeaderboard(fastify, options);
  }

  /**
   * Single Source of Truth for BK Done Leaderboard.
   * Unified across /dashboard/bk?tab=done and /dashboard/telesale-target.
   */
  static async getDoneLeaderboard(
    fastify: FastifyInstance,
    options: BkDoneLeaderboardParams = {}
  ): Promise<BkDoneLeaderboardResult> {
    return fetchDoneLeaderboard(fastify, options);
  }

  /**
   * Single Source of Truth for BK Net Revenue Leaderboard.
   * Unified across /dashboard/bk?tab=revenue and /dashboard/telesale-target.
   */
  static async getRevenueLeaderboard(
    fastify: FastifyInstance,
    options: BkRevenueLeaderboardParams = {}
  ): Promise<BkRevenueLeaderboardResult> {
    return fetchRevenueLeaderboard(fastify, options);
  }

  /**
   * MOS-BUG-95: Count incoming (Sắp tới) bookings in month for War Room team.
   */
  static async getIncomingBookingsCount(
    fastify: FastifyInstance,
    params: BkIncomingBookingsCountParams
  ): Promise<number> {
    return fetchIncomingBookingsCount(fastify, params);
  }
}
