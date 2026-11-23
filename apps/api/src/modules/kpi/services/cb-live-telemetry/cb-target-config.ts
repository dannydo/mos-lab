import { FastifyInstance } from 'fastify';
import type { CbTargetConfig } from '@mos-lab/shared';

export type CbStoreScope = 'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL';

export function getIctNow(): Date {
  const now = new Date();
  const ictOffsetMs = 7 * 60 * 60 * 1000;
  return new Date(now.getTime() + ictOffsetMs);
}

export function formatIctYm(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function resolveCbStoreScope(
  storeScopeParam?: string,
  storeIdParam?: string
): { storeScope: CbStoreScope; storeFilterSql: string } {
  if (storeScopeParam === 'DE_THAM' || storeIdParam === '6') {
    return { storeScope: 'DE_THAM', storeFilterSql: 'AND o.client_store_id = 6' };
  }
  if (storeScopeParam === 'ESTELLA' || storeIdParam === '16') {
    return { storeScope: 'ESTELLA', storeFilterSql: 'AND o.client_store_id = 16' };
  }
  if (storeScopeParam === 'ALL' || storeIdParam === 'ALL') {
    return { storeScope: 'ALL', storeFilterSql: '' };
  }
  return { storeScope: 'DE_THAM_ESTELLA', storeFilterSql: 'AND o.client_store_id IN (6, 16)' };
}

/**
 * Resolve target config for given month and scope.
 * If not found in crmConfig, default to November 2026 targets if month === '2026-11',
 * otherwise return configured: false as per guidelines (e.g. month 10).
 */
export async function getCbTargetConfig(
  fastify: FastifyInstance,
  month: string,
  storeScope: CbStoreScope = 'DE_THAM_ESTELLA'
): Promise<CbTargetConfig> {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const configKey = `CB_TARGET_${month}_${storeScope}`;

  try {
    const existing = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: configKey },
    });
    if (existing?.value) {
      const parsed = JSON.parse(existing.value);
      return {
        ...parsed,
        configured: true,
        month,
        storeScope,
        greenFunnelBookTarget: parsed.greenFunnelBookTarget || 780,
        greenFunnelDoneTarget: parsed.greenFunnelDoneTarget || 540,
        greenFunnelConversionTarget: parsed.greenFunnelConversionTarget || 10.0,
        packageUsageDoneTarget: parsed.packageUsageDoneTarget || 1000,
        repeatComboSalesTarget: parsed.repeatComboSalesTarget || 349_000_000,
        aovPackageUsageTarget: parsed.aovPackageUsageTarget || 5_550_000,
        daysInMonth,
        updatedAt: existing.updatedAt?.toISOString(),
      };
    }
  } catch {
    // Fallback if config table is unreachable
  }

  // Default configuration for November 2026
  if (month === '2026-11') {
    const comboSalesTarget = 550_000_000;
    const productSalesTarget = 10_000_000;
    const totalSalesTarget = comboSalesTarget + productSalesTarget; // 560,000,000
    const dailyPlanPace = Math.round(totalSalesTarget / daysInMonth); // 18,666,667 (~18.7M)

    return {
      configured: true,
      month,
      storeScope,
      comboSalesTarget,
      productSalesTarget,
      totalSalesTarget,
      dailyPlanPace,
      greenFunnelBookTarget: 780,
      greenFunnelDoneTarget: 540,
      greenFunnelConversionTarget: 10.0,
      packageUsageDoneTarget: 1000,
      repeatComboSalesTarget: 349_000_000,
      aovPackageUsageTarget: 5_550_000,
      daysInMonth,
    };
  }

  // Month 10 or other months without custom target
  return {
    configured: false,
    month,
    storeScope,
    comboSalesTarget: 0,
    productSalesTarget: 0,
    totalSalesTarget: 0,
    dailyPlanPace: 0,
    greenFunnelBookTarget: 780,
    greenFunnelDoneTarget: 540,
    greenFunnelConversionTarget: 10.0,
    packageUsageDoneTarget: 1000,
    repeatComboSalesTarget: 349_000_000,
    aovPackageUsageTarget: 5_550_000,
    daysInMonth,
  };
}

/**
 * Save custom target configuration to crmConfig
 */
export async function saveCbTargetConfig(
  fastify: FastifyInstance,
  target: Partial<CbTargetConfig> & { month: string; storeScope?: string; userStaffName?: string }
): Promise<CbTargetConfig> {
  const scope = (target.storeScope || 'DE_THAM_ESTELLA') as CbStoreScope;
  const configKey = `CB_TARGET_${target.month}_${scope}`;
  const [y, m] = target.month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const comboSalesTarget = Number(target.comboSalesTarget || 0);
  const productSalesTarget = Number(target.productSalesTarget || 0);
  const totalSalesTarget = comboSalesTarget + productSalesTarget;
  const dailyPlanPace = daysInMonth > 0 ? Math.round(totalSalesTarget / daysInMonth) : 0;

  const fullConfig: CbTargetConfig = {
    configured: true,
    month: target.month,
    storeScope: scope,
    comboSalesTarget,
    productSalesTarget,
    totalSalesTarget,
    dailyPlanPace,
    greenFunnelBookTarget: Number(target.greenFunnelBookTarget || 780),
    greenFunnelDoneTarget: Number(target.greenFunnelDoneTarget || 540),
    greenFunnelConversionTarget: Number(target.greenFunnelConversionTarget || 10.0),
    packageUsageDoneTarget: Number(target.packageUsageDoneTarget || 1000),
    repeatComboSalesTarget: Number(target.repeatComboSalesTarget || 349_000_000),
    aovPackageUsageTarget: Number(target.aovPackageUsageTarget || 5_550_000),
    daysInMonth,
    updatedAt: new Date().toISOString(),
    updatedBy: target.userStaffName || 'Admin',
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: configKey },
    create: {
      key: configKey,
      value: JSON.stringify(fullConfig),
    },
    update: {
      value: JSON.stringify(fullConfig),
    },
  });

  return fullConfig;
}
