import { Prisma } from '../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import {
  FM_DEFAULT_WEEKLY_QUESTS,
  FM_SHOP_FUND_SPECS,
  type FmBranchCode,
  type FmTeamDinnerRecord,
  type FmWeeklyQuestDefinition,
  type FmWeeklyQuestLedgerEntry,
  type FmWeeklyQuestsConfig,
} from '@mos-lab/shared';

export const FM_WEEKLY_QUESTS_CONFIG_KEY = 'FM_WEEKLY_QUESTS_CONFIG';
export const FM_WEEKLY_QUEST_LEDGER_KEY = 'FM_WEEKLY_QUEST_LEDGER';
export const FM_MONTHLY_TEAM_DINNERS_KEY = 'FM_MONTHLY_TEAM_DINNERS';

export function buildDefaultQuestsConfig(): FmWeeklyQuestsConfig {
  return {
    monthlyQuestCapVnd: null,
    quests: FM_DEFAULT_WEEKLY_QUESTS.map((q) => ({ ...q, targetConfig: { ...q.targetConfig } })),
    updatedAt: '2026-11-27T00:00:00.000Z',
    updatedBy: 'System Default',
  };
}

export async function readQuestsConfig(crm: CrmPrismaClient): Promise<FmWeeklyQuestsConfig> {
  const row = await crm.crmConfig.findUnique({ where: { key: FM_WEEKLY_QUESTS_CONFIG_KEY } });
  if (!row?.value) {
    return buildDefaultQuestsConfig();
  }
  try {
    const parsed = JSON.parse(row.value) as Partial<FmWeeklyQuestsConfig>;
    const quests =
      Array.isArray(parsed.quests) && parsed.quests.length > 0 ? parsed.quests : buildDefaultQuestsConfig().quests;
    return {
      monthlyQuestCapVnd:
        parsed.monthlyQuestCapVnd == null || Number.isNaN(Number(parsed.monthlyQuestCapVnd))
          ? null
          : Math.max(0, Math.round(Number(parsed.monthlyQuestCapVnd))),
      quests: quests.map((q, idx) => ({
        id: String(q.id || `quest-${idx + 1}`),
        code: String(q.code || `QUEST_${idx + 1}`),
        title: String(q.title || 'Weekly Quest'),
        description: String(q.description || ''),
        type: (q.type as FmWeeklyQuestDefinition['type']) || 'custom',
        rewardVnd: Math.max(0, Math.round(Number(q.rewardVnd || 0))),
        branchScope: q.branchScope === 'dt' || q.branchScope === 'ep' ? q.branchScope : 'all',
        isActive: q.isActive !== false,
        targetConfig: q.targetConfig || {},
        sortOrder: Number.isFinite(Number(q.sortOrder)) ? Number(q.sortOrder) : idx + 1,
        updatedAt: q.updatedAt || new Date().toISOString(),
        updatedBy: q.updatedBy || 'System',
      })),
      updatedAt: parsed.updatedAt || row.updatedAt.toISOString(),
      updatedBy: parsed.updatedBy || 'HR/CEO',
    };
  } catch {
    return buildDefaultQuestsConfig();
  }
}

export async function writeQuestsConfig(
  crm: CrmPrismaClient,
  config: FmWeeklyQuestsConfig
): Promise<FmWeeklyQuestsConfig> {
  await crm.crmConfig.upsert({
    where: { key: FM_WEEKLY_QUESTS_CONFIG_KEY },
    update: { value: JSON.stringify(config) },
    create: { key: FM_WEEKLY_QUESTS_CONFIG_KEY, value: JSON.stringify(config) },
  });
  return config;
}

export async function readQuestLedger(crm: CrmPrismaClient): Promise<Record<string, FmWeeklyQuestLedgerEntry>> {
  const row = await crm.crmConfig.findUnique({ where: { key: FM_WEEKLY_QUEST_LEDGER_KEY } });
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value) as Record<string, FmWeeklyQuestLedgerEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeQuestLedger(
  crm: CrmPrismaClient,
  ledger: Record<string, FmWeeklyQuestLedgerEntry>
): Promise<void> {
  await crm.crmConfig.upsert({
    where: { key: FM_WEEKLY_QUEST_LEDGER_KEY },
    update: { value: JSON.stringify(ledger) },
    create: { key: FM_WEEKLY_QUEST_LEDGER_KEY, value: JSON.stringify(ledger) },
  });
}

export async function readTeamDinners(crm: CrmPrismaClient): Promise<FmTeamDinnerRecord[]> {
  const row = await crm.crmConfig.findUnique({ where: { key: FM_MONTHLY_TEAM_DINNERS_KEY } });
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? (parsed as FmTeamDinnerRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeTeamDinners(crm: CrmPrismaClient, dinners: FmTeamDinnerRecord[]): Promise<void> {
  await crm.crmConfig.upsert({
    where: { key: FM_MONTHLY_TEAM_DINNERS_KEY },
    update: { value: JSON.stringify(dinners) },
    create: { key: FM_MONTHLY_TEAM_DINNERS_KEY, value: JSON.stringify(dinners) },
  });
}

export async function ensureShopFund(
  crm: CrmPrismaClient,
  branch: FmBranchCode
): Promise<{ fundId: string; code: string; name: string; currentBalanceVnd: number }> {
  const spec = FM_SHOP_FUND_SPECS[branch];
  const existing = await crm.crmFund.findUnique({ where: { id: spec.fundId } });
  if (existing) {
    return {
      fundId: existing.id,
      code: existing.code,
      name: existing.name,
      currentBalanceVnd: Math.round(Number(existing.currentBalance)),
    };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const created = await crm.$transaction(async (tx) => {
    const fund = await tx.crmFund.create({
      data: {
        id: spec.fundId,
        code: spec.code,
        name: spec.name,
        description: `Quỹ Shop ${spec.storeName} (Fun Fund 80K/ca tư vấn + Weekly Quest FM). Số dư tự động cộng dồn giữa các tháng để tổ chức tiệc đội ngũ.`,
        currentBalance: new Prisma.Decimal(0),
        maxQuota: new Prisma.Decimal(15_000_000),
        unitQuota: new Prisma.Decimal(400_000),
        alertThresholdPercent: 80,
        toleranceMode: 'STRICT',
        toleranceAmount: new Prisma.Decimal(0),
        status: 'ACTIVE',
      },
    });
    await tx.crmFundPeriod.create({
      data: {
        id: `${spec.fundId}-period-${year}-${String(month).padStart(2, '0')}`,
        fundId: spec.fundId,
        periodName: `Kỳ Tháng ${month}/${year}`,
        startDate: new Date(year, now.getMonth(), 1),
        endDate: new Date(year, month, 0, 23, 59, 59),
        openingBalance: new Prisma.Decimal(0),
        systemBalance: new Prisma.Decimal(0),
        totalIncome: new Prisma.Decimal(0),
        totalExpense: new Prisma.Decimal(0),
        status: 'OPEN',
      },
    });
    return fund;
  });

  return {
    fundId: created.id,
    code: created.code,
    name: created.name,
    currentBalanceVnd: Math.round(Number(created.currentBalance)),
  };
}

export async function creditShopFundForQuest(
  crm: CrmPrismaClient,
  params: {
    branch: FmBranchCode;
    amountVnd: number;
    description: string;
    actor: { id: number; name: string };
  }
): Promise<{ transactionId: string; newBalanceVnd: number }> {
  await ensureShopFund(crm, params.branch);
  const spec = FM_SHOP_FUND_SPECS[params.branch];
  const amount = Math.max(0, Math.round(params.amountVnd));

  return await crm.$transaction(async (tx) => {
    const fund = await tx.crmFund.findUnique({ where: { id: spec.fundId } });
    if (!fund) {
      throw new Error(`Không tìm thấy quỹ shop ${spec.name}`);
    }

    const balanceBefore = Math.round(Number(fund.currentBalance));
    const balanceAfter = balanceBefore + amount;

    let activePeriod = await tx.crmFundPeriod.findFirst({
      where: { fundId: spec.fundId, status: 'OPEN' },
      orderBy: { startDate: 'desc' },
    });

    if (!activePeriod) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      activePeriod = await tx.crmFundPeriod.create({
        data: {
          id: `${spec.fundId}-period-${year}-${String(month).padStart(2, '0')}`,
          fundId: spec.fundId,
          periodName: `Kỳ Tháng ${month}/${year}`,
          startDate: new Date(year, now.getMonth(), 1),
          endDate: new Date(year, month, 0, 23, 59, 59),
          openingBalance: new Prisma.Decimal(balanceBefore),
          systemBalance: new Prisma.Decimal(balanceAfter),
          totalIncome: new Prisma.Decimal(0),
          totalExpense: new Prisma.Decimal(0),
          status: 'OPEN',
        },
      });
    }

    const txId = `tx-quest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await tx.crmFundTransaction.create({
      data: {
        id: txId,
        fundId: spec.fundId,
        periodId: activePeriod.id,
        type: 'TOPUP',
        amount: new Prisma.Decimal(amount),
        balanceBefore: new Prisma.Decimal(balanceBefore),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        description: params.description,
        status: 'COMPLETED',
        actorStaffId: params.actor.id,
        actorStaffName: params.actor.name,
      },
    });

    await tx.crmFund.update({
      where: { id: spec.fundId },
      data: { currentBalance: new Prisma.Decimal(balanceAfter) },
    });

    await tx.crmFundPeriod.update({
      where: { id: activePeriod.id },
      data: {
        totalIncome: new Prisma.Decimal(Number(activePeriod.totalIncome) + amount),
        systemBalance: new Prisma.Decimal(balanceAfter),
      },
    });

    return { transactionId: txId, newBalanceVnd: balanceAfter };
  });
}
