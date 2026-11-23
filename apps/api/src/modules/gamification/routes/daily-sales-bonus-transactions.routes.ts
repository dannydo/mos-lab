import { FastifyInstance } from 'fastify';
import { DailySalesBonusTransaction, SafeAny } from '@mos-lab/shared';
import {
  buildExcludeTrainingCvlOrderSql,
  CvlTrainingMentorshipService,
} from '../../kpi/services/cvl-training-mentorship.service.js';
import {
  actualCheckinQueryParams,
  buildActualCheckinOrdersCte,
  buildComboTransactionQuery,
  buildComboUpgradeTransactionQuery,
  buildProductTransactionQuery,
  normalizeDatePart,
} from './daily-sales-bonus-queries-core.js';
import {
  buildDebtPaymentTransactionQuery,
  buildSingleServiceTransactionQuery,
} from './daily-sales-bonus-queries-service-debt.js';

export function registerDailySalesBonusTransactionsRoutes(fastify: FastifyInstance): void {
  // 4. GET /api/gamification/daily-sales-bonus/transactions
  fastify.get('/gamification/daily-sales-bonus/transactions', async (request, reply) => {
    const { date, dateFrom, dateTo, consultantId } = request.query as {
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      consultantId?: string;
    };

    const startStr = dateFrom || date;
    const endStr = dateTo || date || startStr;

    if (!startStr || !endStr) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tham số date hoặc dateFrom.' });
    }

    try {
      let subStaffFilter = '';

      if (consultantId && consultantId !== 'ALL' && !isNaN(Number(consultantId))) {
        const uid = Number(consultantId);
        subStaffFilter = `WHERE sub.staff_id = ${uid}`;
      }

      const startPart = normalizeDatePart(startStr, startStr);
      const endPart = normalizeDatePart(endStr, endStr);
      const activeTrainingPairs = await CvlTrainingMentorshipService.getActivePairsForRange(
        fastify,
        startPart,
        endPart
      );
      const filteredOrdersCte = buildActualCheckinOrdersCte(activeTrainingPairs);
      const excludeTrainingDebtSql = buildExcludeTrainingCvlOrderSql(
        activeTrainingPairs,
        'COALESCE(udp.order_id, ud.order_id)',
        'COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created)'
      );
      const dateQueryParams = actualCheckinQueryParams(startPart, endPart);

      const comboQuery = buildComboTransactionQuery(filteredOrdersCte, subStaffFilter);
      const productQuery = buildProductTransactionQuery(filteredOrdersCte, subStaffFilter);
      const serviceQuery = buildSingleServiceTransactionQuery(filteredOrdersCte, subStaffFilter);
      const comboUpgradeQuery = buildComboUpgradeTransactionQuery(filteredOrdersCte, subStaffFilter);
      const debtPaymentQuery = buildDebtPaymentTransactionQuery({
        startStr,
        endStr,
        excludeTrainingDebtSql,
        subStaffFilter,
      });

      const [comboRows, comboUpgradeRows, productRows, serviceRows, debtPaymentRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboQuery, ...dateQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboUpgradeQuery, ...dateQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(productQuery, ...dateQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(serviceQuery, ...dateQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(debtPaymentQuery),
      ]);

      const allRows = [...comboRows, ...comboUpgradeRows, ...productRows, ...serviceRows, ...debtPaymentRows].sort(
        (a, b) => (b.order_time || '').localeCompare(a.order_time || '')
      );

      // Compute total qualifying sales for matching the tier rate
      const totalQualifyingSales = Math.round(
        allRows.reduce((sum, r) => sum + (r.item_type !== 'Service' ? Number(r.net_value || 0) : 0), 0)
      );

      const matchedTierRate =
        totalQualifyingSales >= 30000000
          ? 3.0
          : totalQualifyingSales >= 25000000
            ? 2.5
            : totalQualifyingSales >= 20000000
              ? 2.5
              : totalQualifyingSales >= 15000000
                ? 2.0
                : totalQualifyingSales >= 10000000
                  ? 1.5
                  : totalQualifyingSales >= 5000000
                    ? 1.0
                    : 0.5;

      const transactions: DailySalesBonusTransaction[] = allRows.map((r) => {
        const item_type = r.item_type as 'Combo' | 'Product' | 'Service';
        const gross_value = Math.round(Number(r.gross_value || 0));
        const net_value = Math.round(Number(r.net_value || 0));
        const debt_amount = Math.round(Number(r.debt_amount || 0));
        const recorded_bonus = item_type !== 'Service' ? Math.round((net_value * matchedTierRate) / 100) : 0;

        return {
          order_service_id: Number(r.order_service_id),
          order_id: Number(r.order_id),
          order_time: r.order_time || '10:00:00',
          customer_name: r.customer_name || 'Khách Hàng',
          store_code: r.store_code || 'PXL',
          item_title: r.item_title,
          item_type,
          payment_value: net_value,
          gross_value,
          net_value,
          debt_amount,
          recorded_bonus,
          is_split: Boolean(r.is_split),
          cc_in_name: r.cc_in_name || null,
          cc_out_name: r.cc_out_name || null,
        };
      });

      return {
        data: transactions,
        total: transactions.length,
        matchedTierRate,
        totalQualifyingSales,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Get daily sales bonus transactions error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải chi tiết giao dịch.' });
    }
  });
}
