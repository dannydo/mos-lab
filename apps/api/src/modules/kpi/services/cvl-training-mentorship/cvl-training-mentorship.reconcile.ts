import { FastifyInstance } from 'fastify';
import type mysql from 'mysql2/promise';
import { CvlTrainingMentorshipPair, SafeAny } from '@mos-lab/shared';
import {
  ISO_DATE_RE,
  RECONCILE_COOLDOWN_MS,
  getLastReconciledAt,
  setLastReconciledAt,
} from './cvl-training-mentorship.helpers.js';

export interface LegacyTipSqlExecutor {
  queryRows<T = SafeAny>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

export function createMysqlPoolTipExecutor(pool: mysql.Pool): LegacyTipSqlExecutor {
  return {
    async queryRows<T = SafeAny>(sql: string, params: unknown[] = []): Promise<T[]> {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
      return rows as unknown as T[];
    },
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      await pool.query(sql, params);
    },
  };
}

export function createFastifyLegacyTipExecutor(fastify: FastifyInstance): LegacyTipSqlExecutor {
  return {
    async queryRows<T = SafeAny>(sql: string, params: unknown[] = []): Promise<T[]> {
      return fastify.prisma.legacy.$queryRawUnsafe<T[]>(sql, ...params);
    },
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      if (typeof fastify.prisma.legacy.$executeRawUnsafe === 'function') {
        await fastify.prisma.legacy.$executeRawUnsafe(sql, ...params);
      } else {
        await fastify.prisma.legacy.$queryRawUnsafe(sql, ...params);
      }
    },
  };
}

/**
 * Hợp nhất các dòng staff_tip phân mảnh (70%+20% hoặc 80%+10%) trên đơn của Mentee CVL trong kỳ Training
 * thành 1 dòng thống nhất 90% cho Mentee CVL (và 0đ cho Mentor/CC), bảo đảm App Wings lẫn mOS hiển thị
 * đồng nhất 90% từ đầu kỳ tới hiện tại (idempotent, có cooldown 60s khi quét diện rộng).
 */
export async function reconcileTrainingCvlStaffTipsImpl(
  executor: LegacyTipSqlExecutor,
  pairs: CvlTrainingMentorshipPair[],
  options?: { orderIds?: number[]; force?: boolean }
): Promise<{ updatedOrders: number; consolidatedRows: number }> {
  const activePairs = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (activePairs.length === 0) {
    return { updatedOrders: 0, consolidatedRows: 0 };
  }

  const scopedOrderIds = Array.from(
    new Set((options?.orderIds || []).map((id) => Math.floor(Number(id))).filter((id) => id > 0))
  );
  const cooldownKey = activePairs
    .map((p) => `${p.menteeLegacyStaffId}:${p.startDate}:${p.endDate}`)
    .sort()
    .join('|');
  if (scopedOrderIds.length === 0 && !options?.force) {
    const lastRun = getLastReconciledAt(cooldownKey);
    if (Date.now() - lastRun < RECONCILE_COOLDOWN_MS) {
      return { updatedOrders: 0, consolidatedRows: 0 };
    }
    setLastReconciledAt(cooldownKey, Date.now());
  }

  try {
    const pairClauses = activePairs.map(
      (p) =>
        `(os.assigned_staff_id = ${p.menteeLegacyStaffId} AND COALESCE(ro.date, DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))) BETWEEN '${p.startDate}' AND '${p.endDate}')`
    );
    const orderFilterSql = scopedOrderIds.length > 0 ? `AND o.id IN (${scopedOrderIds.join(',')})` : '';

    const candidateRows = await executor.queryRows<{ order_id: number; mentee_id: number }>(
      `SELECT DISTINCT
         o.id AS order_id,
         os.assigned_staff_id AS mentee_id
       FROM \`order\` o
       JOIN \`order_service\` os ON os.order_id = o.id
       LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
       JOIN \`staff_tip\` st ON st.order_id = o.id
       WHERE o.order_state = 'Completed'
         ${orderFilterSql}
         AND (${pairClauses.join(' OR ')})
         AND (st.user_id IS NULL OR st.user_id <> os.assigned_staff_id)
         AND COALESCE(st.tip_percentage, 0) > 0
         AND COALESCE(st.tip_percentage, 0) <= 20
         AND COALESCE(st.is_academy, 0) = 0`
    );

    if (!candidateRows || candidateRows.length === 0) {
      return { updatedOrders: 0, consolidatedRows: 0 };
    }

    const candidateOrderIds = Array.from(new Set(candidateRows.map((r) => Number(r.order_id)).filter((id) => id > 0)));
    if (candidateOrderIds.length === 0) {
      return { updatedOrders: 0, consolidatedRows: 0 };
    }

    const menteeByOrderId = new Map<number, number>();
    for (const r of candidateRows) {
      const oid = Number(r.order_id);
      const mid = Number(r.mentee_id);
      if (oid > 0 && mid > 0 && !menteeByOrderId.has(oid)) {
        menteeByOrderId.set(oid, mid);
      }
    }

    const [serviceRows, tipRows] = await Promise.all([
      executor.queryRows<{ id: number; order_id: number; assigned_staff_id: number | null }>(
        `SELECT id, order_id, assigned_staff_id
         FROM \`order_service\`
         WHERE order_id IN (${candidateOrderIds.join(',')})
           AND assigned_staff_id IS NOT NULL
           AND assigned_staff_id > 0`
      ),
      executor.queryRows<{
        id: number;
        order_id: number;
        order_service_id: number | null;
        user_id: number | null;
        tip_amount: number | string | null;
        tip_percentage: number | string | null;
        is_academy: number | null;
      }>(
        `SELECT id, order_id, order_service_id, user_id, tip_amount, tip_percentage, is_academy
         FROM \`staff_tip\`
         WHERE order_id IN (${candidateOrderIds.join(',')})
           AND COALESCE(is_academy, 0) = 0
         ORDER BY id ASC`
      ),
    ]);

    const serviceStaffMap = new Map<number, number>();
    for (const sr of serviceRows || []) {
      const osId = Number(sr.id || 0);
      const staffId = Number(sr.assigned_staff_id || 0);
      if (osId > 0 && staffId > 0) {
        serviceStaffMap.set(osId, staffId);
      }
    }

    const tipsByBucket = new Map<
      string,
      {
        orderId: number;
        menteeId: number;
        rows: Array<{ id: number; userId: number; tipAmount: number; tipPercentage: number }>;
      }
    >();

    for (const tr of tipRows || []) {
      const oid = Number(tr.order_id || 0);
      const osId = Number(tr.order_service_id || 0);
      const menteeId = (osId > 0 ? serviceStaffMap.get(osId) : undefined) ?? menteeByOrderId.get(oid) ?? 0;
      if (oid <= 0 || menteeId <= 0) continue;

      const bucketKey = `${oid}:${osId}:${menteeId}`;
      const bucket = tipsByBucket.get(bucketKey) || { orderId: oid, menteeId, rows: [] };
      bucket.rows.push({
        id: Number(tr.id),
        userId: Number(tr.user_id || 0),
        tipAmount: Math.round(Number(tr.tip_amount || 0)),
        tipPercentage: Number(tr.tip_percentage || 0),
      });
      tipsByBucket.set(bucketKey, bucket);
    }

    const touchedOrderIds = new Set<number>();
    let consolidatedRows = 0;

    for (const bucket of tipsByBucket.values()) {
      const menteeRows = bucket.rows.filter((r) => r.userId === bucket.menteeId);
      const transferableCcRows = bucket.rows.filter(
        (r) => r.userId !== bucket.menteeId && r.tipPercentage > 0 && r.tipPercentage <= 20
      );
      if (transferableCcRows.length === 0) continue;

      const sourceRows = [...menteeRows, ...transferableCcRows];
      const combinedAmount = sourceRows.reduce((sum, r) => sum + r.tipAmount, 0);
      const combinedPct = Math.min(90, Math.round(sourceRows.reduce((sum, r) => sum + r.tipPercentage, 0)));
      const keepRow = menteeRows[0] || transferableCcRows[0];
      const deleteIds = sourceRows.filter((r) => r.id !== keepRow.id).map((r) => r.id);

      await executor.execute(`UPDATE \`staff_tip\` SET user_id = ?, tip_amount = ?, tip_percentage = ? WHERE id = ?`, [
        bucket.menteeId,
        combinedAmount,
        combinedPct,
        keepRow.id,
      ]);
      if (deleteIds.length > 0) {
        await executor.execute(`DELETE FROM \`staff_tip\` WHERE id IN (${deleteIds.join(',')})`, []);
      }
      touchedOrderIds.add(bucket.orderId);
      consolidatedRows += 1;
    }

    return { updatedOrders: touchedOrderIds.size, consolidatedRows };
  } catch {
    return { updatedOrders: 0, consolidatedRows: 0 };
  }
}
