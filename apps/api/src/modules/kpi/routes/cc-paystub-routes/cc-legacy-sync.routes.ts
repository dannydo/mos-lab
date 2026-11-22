import { FastifyInstance } from 'fastify';
import { SafeAny, calculateWheelBonusCap } from '@mos-lab/shared';
import { CcKpiService } from '../../services/cc-kpi.service.js';
import {
  buildExcludeTrainingCvlOrderSql,
  CvlTrainingMentorshipService,
} from '../../services/cvl-training-mentorship.service.js';
import { parseDefaultDateRange } from './cc-paystub.helpers.js';

export function registerCcLegacySyncRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cc-legacy-sync - Single Source of Truth adapter for iOS App (WingsLashes backend)
  fastify.get('/kpi/cc-legacy-sync', async (request, reply) => {
    const { key, staff_user_id, userId, staffId, date_from, dateFrom, date_to, dateTo } = request.query as {
      key?: string;
      staff_user_id?: string;
      userId?: string;
      staffId?: string;
      date_from?: string;
      dateFrom?: string;
      date_to?: string;
      dateTo?: string;
    };

    // Verify key if provided or internal caller
    const hasValidKey = key === 'FDC0D0A177694777A';
    if (!hasValidKey && !request.headers.authorization) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'API key không hợp lệ.' });
    }

    const targetStaffId = Number(staff_user_id || userId || staffId);
    if (!targetStaffId || isNaN(targetStaffId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu staff_user_id.' });
    }

    const { startPart, endPart } = parseDefaultDateRange(date_from || dateFrom, date_to || dateTo);

    try {
      const activeTrainingPairs = await CvlTrainingMentorshipService.getActivePairsForRange(
        fastify,
        startPart,
        endPart
      );
      const excludeTrainingLegacyTipSql = buildExcludeTrainingCvlOrderSql(
        activeTrainingPairs,
        'o.id',
        'COALESCE(ro.actual_booking_date_start, o.booking_date_start)'
      );
      const [xoayRes, dailyRes, tipRows] = await Promise.all([
        CcKpiService.getCcXoayReport(fastify, {
          dateFrom: startPart,
          dateTo: endPart,
          consultantId: String(targetStaffId),
          limit: 999999,
        }),
        CcKpiService.getCcDailySalesBonus(fastify, {
          dateFrom: startPart,
          dateTo: endPart,
          consultantId: String(targetStaffId),
        }),
        fastify.prisma.legacy.$queryRawUnsafe<Array<{ totalTip: number }>>(`
          SELECT COALESCE(SUM(st.tip_amount), 0) as totalTip
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          LEFT JOIN report_order ro ON ro.order_id = o.id
          WHERE st.user_id = ${targetStaffId}
            AND o.order_state = 'Completed'
            AND st.is_academy = 0
            AND st.tip_currency_id IN (1, 2)
            AND st.date_created_only >= '${startPart}' - INTERVAL 2 DAY
            AND st.date_created_only <= '${endPart}' + INTERVAL 2 DAY
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
            ${excludeTrainingLegacyTipSql}
        `),
      ]);

      const xoayRows = xoayRes.data.filter((r) => Number(r.consultantId) === targetStaffId);
      const rawXoayVnd = Math.round(xoayRows.reduce((sum, r) => sum + Number(r.consultantBonus || 0), 0));

      const dailyRows = dailyRes.data.filter((r) => Number(r.user_id) === targetStaffId);
      const dailyBonusVnd = Math.round(dailyRows.reduce((sum, r) => sum + Number(r.daily_bonus || 0), 0));

      const cap = calculateWheelBonusCap(dailyBonusVnd, rawXoayVnd);
      const effectiveXoayVnd = cap.effectiveWheelBonus;
      const heldXoayVnd = Math.max(0, cap.rawWheelBonus - effectiveXoayVnd);

      const cashTipVnd = Math.round(Number(tipRows[0]?.totalTip || 0));
      const rateVal = dailyBonusVnd > 0 ? (rawXoayVnd / dailyBonusVnd).toFixed(2) : '0';

      const bonusSalesDayComboRewards: Record<string, SafeAny> = {};
      dailyRows.forEach((r) => {
        const dateKey = String(r.date);
        const totalSales = Number(r.total_sales || 0);
        const rate = Number(r.commission_rate_percent || 0);
        const bonus = Number(r.daily_bonus || 0);
        const pos = rate >= 2.0 ? 3 : rate >= 1.0 ? 2 : 1;
        bonusSalesDayComboRewards[dateKey] = {
          position: pos,
          total_combo_sold_amount: totalSales,
          reward_percentage: rate,
          total_reward_amount: bonus,
        };
      });

      const bonusSalesDayCombo = {
        position: 1,
        total_reward_amount: dailyBonusVnd,
        reward: bonusSalesDayComboRewards,
      };

      // Best-effort sync to legacy staff_payroll.tracking_key if a record exists for this month (MOS-BUG-137)
      try {
        const monthPart = startPart.substring(0, 7);
        const existingPayroll = await fastify.prisma.legacy.$queryRawUnsafe<
          Array<{ id: number; tracking_key: string | null }>
        >(
          `SELECT id, tracking_key
           FROM staff_payroll
           WHERE user_id = ?
             AND (date LIKE ? OR date_completed LIKE ?)
           ORDER BY date DESC
           LIMIT 1`,
          targetStaffId,
          `${monthPart}%`,
          `${monthPart}%`
        );

        if (existingPayroll.length > 0 && existingPayroll[0].tracking_key) {
          try {
            const tk = JSON.parse(existingPayroll[0].tracking_key);
            if (tk && Array.isArray(tk.level) && tk.level.length > 0) {
              for (const lvl of tk.level) {
                lvl.BonusSalesDayCombo = {
                  ...(lvl.BonusSalesDayCombo || {}),
                  position: 1,
                  total_reward_amount: dailyBonusVnd,
                  reward: bonusSalesDayComboRewards,
                };
                if (lvl.HoldingBonusRelease) {
                  lvl.HoldingBonusRelease.combo_bonus_amount = dailyBonusVnd;
                  lvl.HoldingBonusRelease.servicing_combo_bonus_rate = Number(rateVal);
                }
              }
              tk.total_bonus_amount = dailyBonusVnd;
              const updatedTkJson = JSON.stringify(tk);
              await fastify.prisma.legacy.$executeRawUnsafe(
                `UPDATE staff_payroll SET tracking_key = ? WHERE id = ?`,
                updatedTkJson,
                existingPayroll[0].id
              );
            }
          } catch (parseErr) {
            fastify.log.warn(parseErr, 'Failed to parse/update existing staff_payroll tracking_key');
          }
        }
      } catch (dbSyncErr) {
        fastify.log.warn(dbSyncErr, 'Failed to sync CC bonus to staff_payroll tracking_key');
      }

      return reply.send({
        status: 'success',
        data: {
          staff_id: targetStaffId,
          date_from: startPart,
          date_to: endPart,
          raw_xoay_bonus: rawXoayVnd,
          effective_xoay_bonus: effectiveXoayVnd,
          held_xoay_bonus: heldXoayVnd,
          daily_bonus: dailyBonusVnd,
          tip_bonus: cashTipVnd,
          wheel_cap_percent: cap.wheelCapPercent,
          cap_status: cap.capStatus,
          ios_payload: {
            bonus: {
              '2': {
                all: { total_bonus_amount: String(effectiveXoayVnd) },
                current: { total_bonus_amount: String(effectiveXoayVnd) },
                holding: { total_bonus_amount: String(heldXoayVnd) },
              },
            },
            combo_bonus_amount: String(dailyBonusVnd),
            servicing_combo_bonus_rate: String(rateVal),
            holding_bonus_state:
              cap.capStatus === 'HARDCAPPED' ? 'error' : cap.capStatus === 'WARNING' ? 'warning' : '',
            tip: {
              '2': { total_tip_amount: String(cashTipVnd) },
            },
            bonus_sales_day_combo: bonusSalesDayCombo,
          },
        },
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error in cc-legacy-sync');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tính toán số liệu CC.' });
    }
  });
}
