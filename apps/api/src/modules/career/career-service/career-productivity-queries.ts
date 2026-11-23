import type { FastifyInstance } from 'fastify';
import type { SafeAny, StaffHourlyProductivity } from '@mos-lab/shared';
import { type CareerPeriodDates, computeHourlyProductivity } from './career-helpers.js';

export interface BulkProductivitySvcStats {
  fullSetCount: number;
  comboRetainCount: number;
  singleRetainCount: number;
  serviceRevenue: number;
}

export interface BulkProductivityMaps {
  productivitySvcMap: Record<number, BulkProductivitySvcStats>;
  shiftHoursMap: Record<number, number>;
  payrollHoursMap: Record<number, number>;
}

/**
 * Truy vấn hàng loạt chỉ số hiệu suất dịch vụ và giờ công thực tế từ Legacy DB cho danh sách nhân sự.
 */
export async function fetchBulkProductivityMaps(
  fastify: FastifyInstance,
  periodConfig: CareerPeriodDates
): Promise<BulkProductivityMaps> {
  const productivitySvcMap: Record<number, BulkProductivitySvcStats> = {};
  const shiftHoursMap: Record<number, number> = {};
  const payrollHoursMap: Record<number, number> = {};

  const [productivitySvcRows, shiftHoursRows, payrollHoursRows] = await Promise.all([
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
          SELECT
            os.assigned_staff_id,
            COUNT(CASE WHEN os.service_type = 'Normal' THEN 1 END) as full_set_count,
            COUNT(CASE WHEN os.service_type = 'Retain' AND COALESCE(os.user_service_type, '') = 'combo' THEN 1 END) as combo_retain_count,
            COUNT(CASE WHEN os.service_type = 'Retain' AND COALESCE(os.user_service_type, '') != 'combo' THEN 1 END) as single_retain_count,
            COALESCE(SUM(COALESCE(os.total_price, 0) + COALESCE(os.balance_price, 0)), 0) as service_revenue
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
            AND os.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
            AND os.service_type IN ('Normal', 'Retain')
          GROUP BY os.assigned_staff_id
        `
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
          SELECT
            sws.user_id,
            ROUND(
              COALESCE(
                SUM(
                  CASE
                    WHEN sws.check_in_staff_task_id IS NOT NULL
                    THEN GREATEST(
                      0,
                      TIMESTAMPDIFF(MINUTE, sws.start_time, sws.end_time) -
                      COALESCE(TIMESTAMPDIFF(MINUTE, sws.start_break_time, sws.end_break_time), 0)
                    )
                    ELSE 0
                  END
                ),
                0
              ) / 60,
              1
            ) as shift_hours
          FROM staff_working_shift sws
          WHERE sws.date >= ${periodConfig.shiftStartDateSql}
            AND sws.date <= ${periodConfig.shiftEndInclusiveSql}
          GROUP BY sws.user_id
        `
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
          SELECT
            sp.user_id,
            ROUND(COALESCE(SUM(sp.total_working_hour), 0), 1) as payroll_hours
          FROM staff_payroll sp
          WHERE sp.date >= ${periodConfig.shiftStartDateSql}
            AND sp.date <= LAST_DAY(${periodConfig.shiftEndInclusiveSql})
            AND sp.date < '3000-01-01'
          GROUP BY sp.user_id
        `
      )
      .catch(() => []),
  ]);

  if (Array.isArray(productivitySvcRows)) {
    productivitySvcRows.forEach((r: SafeAny) => {
      if (r.assigned_staff_id) {
        productivitySvcMap[Number(r.assigned_staff_id)] = {
          fullSetCount: Number(r.full_set_count) || 0,
          comboRetainCount: Number(r.combo_retain_count) || 0,
          singleRetainCount: Number(r.single_retain_count) || 0,
          serviceRevenue: Number(r.service_revenue) || 0,
        };
      }
    });
  }

  if (Array.isArray(shiftHoursRows)) {
    shiftHoursRows.forEach((r: SafeAny) => {
      if (r.user_id) {
        shiftHoursMap[Number(r.user_id)] = Number(r.shift_hours) || 0;
      }
    });
  }

  if (Array.isArray(payrollHoursRows)) {
    payrollHoursRows.forEach((r: SafeAny) => {
      if (r.user_id) {
        payrollHoursMap[Number(r.user_id)] = Number(r.payroll_hours) || 0;
      }
    });
  }

  return {
    productivitySvcMap,
    shiftHoursMap,
    payrollHoursMap,
  };
}

/**
 * Truy vấn hiệu suất phục vụ theo giờ công (SPH & Revenue/Hour) cho một nhân sự cụ thể.
 */
export async function fetchStaffHourlyProductivity(
  fastify: FastifyInstance,
  targetLegacyStaffId: number,
  periodConfig: CareerPeriodDates
): Promise<StaffHourlyProductivity> {
  const [staffProductivityRes, staffShiftPeriodRes, staffPayrollPeriodHoursRes] = await Promise.all([
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
          SELECT
            COUNT(CASE WHEN os.service_type = 'Normal' THEN 1 END) as full_set_count,
            COUNT(CASE WHEN os.service_type = 'Retain' AND COALESCE(os.user_service_type, '') = 'combo' THEN 1 END) as combo_retain_count,
            COUNT(CASE WHEN os.service_type = 'Retain' AND COALESCE(os.user_service_type, '') != 'combo' THEN 1 END) as single_retain_count,
            COALESCE(SUM(COALESCE(os.total_price, 0) + COALESCE(os.balance_price, 0)), 0) as service_revenue
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
            AND os.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
            AND os.service_type IN ('Normal', 'Retain')
        `,
        targetLegacyStaffId
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
          SELECT
            ROUND(
              COALESCE(
                SUM(
                  CASE
                    WHEN sws.check_in_staff_task_id IS NOT NULL
                    THEN GREATEST(
                      0,
                      TIMESTAMPDIFF(MINUTE, sws.start_time, sws.end_time) -
                      COALESCE(TIMESTAMPDIFF(MINUTE, sws.start_break_time, sws.end_break_time), 0)
                    )
                    ELSE 0
                  END
                ),
                0
              ) / 60,
              1
            ) as shift_hours
          FROM staff_working_shift sws
          WHERE sws.user_id = ?
            AND sws.date >= ${periodConfig.shiftStartDateSql}
            AND sws.date <= ${periodConfig.shiftEndInclusiveSql}
        `,
        targetLegacyStaffId
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
          SELECT
            ROUND(COALESCE(SUM(sp.total_working_hour), 0), 1) as payroll_hours
          FROM staff_payroll sp
          WHERE sp.user_id = ?
            AND sp.date >= ${periodConfig.shiftStartDateSql}
            AND sp.date <= LAST_DAY(${periodConfig.shiftEndInclusiveSql})
            AND sp.date < '3000-01-01'
        `,
        targetLegacyStaffId
      )
      .catch(() => []),
  ]);

  const prodMetricsRow = staffProductivityRes?.[0];
  const periodShiftHours = Number(staffShiftPeriodRes?.[0]?.shift_hours || 0);
  const periodPayrollHours = Number(staffPayrollPeriodHoursRes?.[0]?.payroll_hours || 0);
  return computeHourlyProductivity({
    fullSetCount: Number(prodMetricsRow?.full_set_count || 0),
    comboRetainCount: Number(prodMetricsRow?.combo_retain_count || 0),
    singleRetainCount: Number(prodMetricsRow?.single_retain_count || 0),
    serviceRevenue: Number(prodMetricsRow?.service_revenue || 0),
    shiftHours: periodShiftHours,
    payrollHours: periodPayrollHours,
  });
}
