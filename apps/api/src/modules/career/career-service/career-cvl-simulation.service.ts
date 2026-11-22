import type { FastifyInstance } from 'fastify';
import type { CvPlusRewardSnapshot, CvPlusSimulationSummaryResponse } from '@mos-lab/shared';
import { calculateCvPlusRewardsForStaff } from './career-cvl-rewards.service.js';
import { listCareerStaff } from './career-staff-list.service.js';

/**
 * Tổng hợp mô phỏng toàn salon cho tất cả Chuyên Viên trong tháng
 */
export async function getAllCvPlusSimulations(
  fastify: FastifyInstance,
  month?: string
): Promise<CvPlusSimulationSummaryResponse> {
  const staffList = await listCareerStaff(fastify);
  const activeCvs = staffList.filter((s) => s.currentRole === 'CV' || s.currentRole === 'CV_PLUS');
  const items: CvPlusRewardSnapshot[] = [];

  for (const staff of activeCvs) {
    const snap = await calculateCvPlusRewardsForStaff(fastify, staff.id, month, false);
    items.push(snap);
  }

  // Sort items by deltaGain descending
  items.sort((a, b) => b.deltaGain - a.deltaGain);

  const qualifiedCount = items.filter((i) => i.isTargetHit).length;
  const penalizedCount = items.filter((i) => i.isPenalized).length;
  const totalAdditionalPayout = items.reduce((sum, i) => sum + i.deltaGain, 0);

  return {
    month: items[0]?.month || month || '2026-09',
    totalStaffCount: items.length,
    qualifiedCount,
    penalizedCount,
    totalAdditionalPayout,
    items,
  };
}
