import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export const CC_KPI_DAILY_PROJECTION_KEY = 'cc-kpi-daily';
export const CC_KPI_DAILY_FORMULA_VERSION = 'cc-kpi-daily-v1';

type DailyRow = Record<string, unknown>;

export type CcKpiDailyResponse = {
  data: DailyRow[];
  total: number;
  summary?: Record<string, unknown>;
  activeStaff?: Array<Record<string, unknown>>;
};

type CanonicalDailyReader = (filters: {
  dateFrom: string;
  dateTo: string;
  storeId: string;
}) => Promise<CcKpiDailyResponse>;

function asNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateAtMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function payloadRevision(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function responseFromPayload(value: unknown): { data: DailyRow[]; activeStaff: Array<Record<string, unknown>> } {
  if (!value || typeof value !== 'object') return { data: [], activeStaff: [] };
  const payload = value as { data?: unknown; activeStaff?: unknown };
  return {
    data: Array.isArray(payload.data) ? (payload.data as DailyRow[]) : [],
    activeStaff: Array.isArray(payload.activeStaff) ? (payload.activeStaff as Array<Record<string, unknown>>) : [],
  };
}

/**
 * Materializes the already-split, already-tiered daily CC result. Persisting
 * post-rule daily facts avoids changing the 50/50 allocation or tier formula
 * on the fast read path. Legacy can always rebuild a business day canonically.
 */
export class CcKpiDailyProjectionService {
  static async rebuildRange(
    fastify: FastifyInstance,
    readCanonical: CanonicalDailyReader,
    dateFrom: string,
    dateTo: string,
    storeScope = 'ALL'
  ): Promise<number> {
    const canonical = await readCanonical({ dateFrom, dateTo, storeId: storeScope });
    return this.materializeCanonicalRange(fastify, canonical, storeScope, dateFrom, dateTo);
  }

  static async materializeCanonicalRange(
    fastify: FastifyInstance,
    response: CcKpiDailyResponse,
    storeScope: string,
    dateFrom: string,
    dateTo: string
  ): Promise<number> {
    const byDate = new Map<string, DailyRow[]>();
    for (const row of response.data) {
      const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const rows = byDate.get(date) || [];
      rows.push(row);
      byDate.set(date, rows);
    }

    const now = new Date();
    const dates: string[] = [];
    for (
      let current = dateAtMidnight(dateFrom);
      current <= dateAtMidnight(dateTo);
      current = new Date(current.getTime() + 86_400_000)
    ) {
      dates.push(dateKey(current));
    }
    await Promise.all(
      dates.map(async (businessDate) => {
        const data = byDate.get(businessDate) || [];
        const payload = { data, activeStaff: response.activeStaff || [] };
        // JSON round-trip makes the persisted boundary explicit and prevents
        // non-serializable runtime values crossing into the CRM read model.
        const storedPayload = JSON.parse(JSON.stringify(payload));
        await fastify.prisma.crm.crmCcKpiDailyProjection.upsert({
          where: {
            businessDate_storeScope: { businessDate: dateAtMidnight(businessDate), storeScope },
          },
          create: {
            businessDate: dateAtMidnight(businessDate),
            storeScope,
            payload: storedPayload,
            sourceRevision: payloadRevision(storedPayload),
            formulaVersion: CC_KPI_DAILY_FORMULA_VERSION,
            status: 'FRESH',
            computedAt: now,
            reconciledAt: now,
          },
          update: {
            payload: storedPayload,
            sourceRevision: payloadRevision(storedPayload),
            formulaVersion: CC_KPI_DAILY_FORMULA_VERSION,
            status: 'FRESH',
            computedAt: now,
            reconciledAt: now,
            lastError: null,
          },
        });
      })
    );
    return dates.length;
  }

  static async readRange(
    fastify: FastifyInstance,
    dateFrom: string,
    dateTo: string,
    storeScope: string,
    activeStaffIds: readonly number[],
    consultantId?: number
  ): Promise<CcKpiDailyResponse | null> {
    const rows = await fastify.prisma.crm.crmCcKpiDailyProjection.findMany({
      where: {
        businessDate: { gte: dateAtMidnight(dateFrom), lte: dateAtMidnight(dateTo) },
        storeScope,
        formulaVersion: CC_KPI_DAILY_FORMULA_VERSION,
        status: 'FRESH',
      },
      orderBy: { businessDate: 'asc' },
      select: { payload: true },
    });

    const expectedDays = Math.max(
      1,
      Math.round((dateAtMidnight(dateTo).getTime() - dateAtMidnight(dateFrom).getTime()) / 86_400_000) + 1
    );
    if (rows.length !== expectedDays) return null;
    const responsePayloads = rows.map((row) => responseFromPayload(row.payload));
    const projectedStaffIds = new Set(responsePayloads[0]?.activeStaff.map((staff) => asNumber(staff.userId)) || []);
    const expectedStaffIds = new Set(activeStaffIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0));
    if (
      projectedStaffIds.size !== expectedStaffIds.size ||
      [...expectedStaffIds].some((id) => !projectedStaffIds.has(id))
    ) {
      return null;
    }
    const data = responsePayloads
      .flatMap((payload) => payload.data)
      .filter((row) => !consultantId || asNumber(row.user_id) === consultantId);
    const activeStaff = (responsePayloads[0]?.activeStaff || []).filter(
      (staff) => !consultantId || asNumber(staff.userId) === consultantId
    );
    const totalComboSales = Math.round(data.reduce((sum, row) => sum + asNumber(row.combo_sales), 0));
    const totalProductSales = Math.round(data.reduce((sum, row) => sum + asNumber(row.product_sales), 0));
    const totalSingleSales = Math.round(data.reduce((sum, row) => sum + asNumber(row.single_sales), 0));
    const totalSales = Math.round(data.reduce((sum, row) => sum + asNumber(row.total_sales), 0));
    const totalCcBonus = Math.round(data.reduce((sum, row) => sum + asNumber(row.daily_bonus), 0));
    const start = dateAtMidnight(dateFrom);
    const end = dateAtMidnight(dateTo);
    const today = dateAtMidnight(dateKey(new Date()));
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const currentHour = new Date().getHours();
    const fractionToday = currentHour < 11 ? 0 : currentHour > 22 ? 1 : (currentHour - 11 + 1) / 12;
    const elapsedRatio =
      today < start
        ? 0.001
        : today > end
          ? 1
          : Math.min(
              1,
              Math.max(
                0.001,
                (Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000)) + fractionToday) / totalDays
              )
            );

    return {
      data,
      total: data.length,
      summary: {
        totalComboSales,
        totalProductSales,
        totalSingleSales,
        totalSales,
        totalCcBonus,
        projectedComboSales: Math.round(totalComboSales / elapsedRatio),
        projectedProductSales: Math.round(totalProductSales / elapsedRatio),
        projectedTotalSales: Math.round(totalSales / elapsedRatio),
        projectedCcBonus: Math.round(totalCcBonus / elapsedRatio),
        elapsedRatioPercent: Math.round(elapsedRatio * 1000) / 10,
      },
      activeStaff,
    };
  }
}
