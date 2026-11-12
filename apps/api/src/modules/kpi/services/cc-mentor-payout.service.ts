import { FastifyInstance } from 'fastify';
import {
  CcTrainingMentorshipBreakdown,
  CvlTrainingMentorshipPair,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  SafeAny,
  calculateCcMentorTrainingBonus,
  intersectDateRanges,
} from '@mos-lab/shared';
import { CareerProgressionService } from '../../career/career.service.js';
import { CvlTrainingMentorshipService } from './cvl-training-mentorship.service.js';

/**
 * Single Source of Truth tính toán thưởng đào tạo cuối tháng (1M + 50% tổng thu nhập tăng thêm của Mentee CVL)
 * dành cho Mentor CC theo Điều răn CC-006 & CV-002.
 * Công thức khớp 100% từng đồng với Thu nhập CV (`cv-paystub.routes.ts`).
 */
export class CcMentorPayoutService {
  static async calculateMentorBreakdownsByCc(
    fastify: FastifyInstance,
    activePairs: CvlTrainingMentorshipPair[],
    rangeStartDate: string,
    rangeEndDate: string
  ): Promise<Map<number, CcTrainingMentorshipBreakdown[]>> {
    const byMentor = new Map<number, CcTrainingMentorshipBreakdown[]>();
    if (!activePairs || activePairs.length === 0) return byMentor;

    const careerConfig = await CareerProgressionService.getConfig(fastify).catch(
      () => DEFAULT_CAREER_PROGRESSION_CONFIG
    );
    const cvToCvPlusConfig = careerConfig.cvToCvPlus || DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus;
    const targetCvPlusHourlyWage = cvToCvPlusConfig.hourlyWage || 27500;

    const items = await Promise.all(
      activePairs.map(async (pair) => {
        if (!pair.isActive) return null;
        const window = intersectDateRanges(pair.startDate, pair.endDate, rangeStartDate, rangeEndDate);
        if (!window) return null;

        const { startDate: effStart, endDate: effEnd } = window;
        const menteeId = Math.floor(Number(pair.menteeLegacyStaffId));
        if (!Number.isInteger(menteeId) || menteeId <= 0) return null;

        const [snapshot, latestRateRows, periodRateRows, reportDaysRows, ownTipRows, transferredTipMap] =
          await Promise.all([
            CareerProgressionService.calculateCvPlusRewardsForStaff(
              fastify,
              menteeId,
              { startStr: `${effStart} 00:00:00`, endStr: `${effEnd} 23:59:59` },
              false,
              { mode: 'ACTUAL_PAYROLL' }
            ),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
              SELECT sp.working_hour_rate
              FROM \`staff_payroll\` sp
              WHERE sp.user_id = ${menteeId}
                AND sp.working_hour_rate > 0
                AND sp.date <= '${effEnd}'
              ORDER BY sp.id DESC
              LIMIT 1
            `),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
              SELECT sp.working_hour_rate
              FROM \`staff_payroll\` sp
              WHERE sp.user_id = ${menteeId}
                AND sp.date >= '${effStart}'
                AND sp.date <= '${effEnd}'
              ORDER BY sp.id DESC
              LIMIT 1
            `),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
              SELECT
                DATE_FORMAT(rs.date, '%Y-%m-%d') AS dateStr,
                MAX(rs.working_minute) AS working_minute
              FROM \`report_staff\` rs
              WHERE rs.user_id = ${menteeId}
                AND rs.date >= '${effStart}'
                AND rs.date <= '${effEnd}'
                AND rs.working_minute > 0
              GROUP BY DATE(rs.date)
            `),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
              SELECT
                COALESCE(SUM(st.tip_amount), 0) AS total_cv_tip,
                COALESCE(SUM(
                  CASE
                    WHEN COALESCE(st.tip_percentage, 70) >= 70
                      THEN ROUND(st.tip_amount * 70 / COALESCE(NULLIF(st.tip_percentage, 0), 70))
                    ELSE 0
                  END
                ), 0) AS base_tech_tip
              FROM \`staff_tip\` st
              JOIN \`order\` o ON st.order_id = o.id
              LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
              WHERE st.user_id = ${menteeId}
                AND COALESCE(ro.date, DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))) BETWEEN '${effStart}' AND '${effEnd}'
                AND o.order_state = 'Completed'
            `),
            CvlTrainingMentorshipService.queryTransferredCcTipsByMentee(fastify, [pair], effStart, effEnd),
          ]);

        let contractHourlyRate = Number(latestRateRows[0]?.working_hour_rate || 21500);
        if (periodRateRows[0]?.working_hour_rate && Number(periodRateRows[0].working_hour_rate) > 0) {
          contractHourlyRate = Number(periodRateRows[0].working_hour_rate);
        }

        let regularHours = 0;
        for (const r of reportDaysRows) {
          regularHours += Number(r.working_minute || 0) / 60;
        }
        regularHours = Math.round(regularHours * 100) / 100;

        const totalOwnTip = Math.round(Number(ownTipRows[0]?.total_cv_tip || 0));
        const baseTechTip = Math.min(totalOwnTip, Math.round(Number(ownTipRows[0]?.base_tech_tip ?? totalOwnTip)));
        const ownConsultDeltaTip = Math.max(0, totalOwnTip - baseTechTip);
        const transferredCcTip = transferredTipMap.get(menteeId) || 0;

        const isMenteeUnlocked = snapshot.isTargetHit;
        const wageDiffPerHour = Math.max(0, targetCvPlusHourlyWage - contractHourlyRate);
        const menteeDeltaHourlyWage = isMenteeUnlocked ? Math.round(regularHours * wageDiffPerHour) : 0;
        const menteeDeltaTipBonus = ownConsultDeltaTip + transferredCcTip;
        const menteeComboBonusTotal = isMenteeUnlocked ? snapshot.comboBonusTotal : 0;
        const menteeSerumBonusTotal = isMenteeUnlocked ? snapshot.productBonusTotal : 0;

        const breakdown = calculateCcMentorTrainingBonus({
          pair: {
            ...pair,
            menteeDisplayName: pair.menteeDisplayName || snapshot.staffName || `CVL #${menteeId}`,
            startDate: effStart,
            endDate: effEnd,
          },
          combosSoldCount: snapshot.comboSoldCount,
          notComboLiveOrders: snapshot.notComboLiveOrders,
          comboLiveOrders: snapshot.comboLiveOrders,
          menteeDeltaHourlyWage,
          menteeDeltaTipBonus,
          menteeComboBonusTotal,
          menteeSerumBonusTotal,
        });

        return {
          mentorId: pair.mentorLegacyStaffId,
          breakdown,
        };
      })
    );

    for (const item of items) {
      if (!item) continue;
      const list = byMentor.get(item.mentorId) || [];
      list.push(item.breakdown);
      byMentor.set(item.mentorId, list);
    }

    return byMentor;
  }
}
