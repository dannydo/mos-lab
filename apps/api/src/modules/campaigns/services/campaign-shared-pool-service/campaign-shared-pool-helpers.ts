import type { FastifyInstance } from 'fastify';
import { CampaignPoolStatus, DEFAULT_SHARED_POOL_CONFIG, SharedPoolConfig } from '@mos-lab/shared';
import type { CrmCampaignCustomer } from '../../../../generated/crm-client/index.js';

export function parseSharedPoolConfig(
  raw: unknown,
  options?: { mergeRecycleRules?: boolean; defaultConfig?: SharedPoolConfig }
): SharedPoolConfig {
  let config: SharedPoolConfig = { ...(options?.defaultConfig ?? DEFAULT_SHARED_POOL_CONFIG) };
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (options?.mergeRecycleRules) {
        config = {
          ...config,
          ...parsed,
          recycleRules: {
            ...config.recycleRules,
            ...(parsed?.recycleRules || {}),
          },
        };
      } else {
        config = { ...config, ...parsed };
      }
    } catch {
      // Ignore malformed shared pool JSON and keep defaults
    }
  }
  return config;
}

export function parseAssignedStaffIds(raw: unknown): number[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function resolveStaffDisplayName(
  fastify: FastifyInstance,
  staffId: number,
  fallbackPrefix: string = 'NV'
): Promise<string> {
  const staff = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: staffId },
    select: { displayName: true, username: true },
  });
  return staff?.displayName || staff?.username || `${fallbackPrefix} #${staffId}`;
}

export async function findCampaignCustomer(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number
): Promise<CrmCampaignCustomer | null> {
  return fastify.prisma.crm.crmCampaignCustomer.findFirst({
    where: {
      campaignId,
      OR: [{ id: customerId }, { legacyUserId: customerId }],
      removedAt: null,
    },
  });
}

/**
 * Helper to map standard mOS call log (callResult, outcome, duration) to Shared Pool status,
 * pickup classification, and recycling rules (Single Source of Truth - MOS-BUG-99).
 */
export function mapCallLogToSharedPool(
  callLog: {
    callResult?: string | null;
    outcome?: string | null;
    durationSec?: number | null;
    callbackDate?: Date | string | null;
    note?: string | null;
  },
  config?: SharedPoolConfig
): {
  mappedCallResult: string;
  isPickup: boolean;
  nextPoolStatus: CampaignPoolStatus;
  availableAt: Date | null;
  cooldownUntil: Date | null;
  isBooked: boolean;
  isExcluded: boolean;
} {
  const rawResult = String(callLog.callResult || '')
    .toUpperCase()
    .trim();
  const rawOutcome = String(callLog.outcome || '')
    .toUpperCase()
    .trim();
  const durationSec = Number(callLog.durationSec) || 0;
  const now = new Date();

  let mappedCallResult = 'THINKING';
  if (
    rawOutcome === 'BOOKED' ||
    rawOutcome === 'RENEWED' ||
    rawOutcome.includes('ĐẶT LỊCH') ||
    rawOutcome.includes('ĐẶT CỌC') ||
    rawOutcome.includes('BOOKED') ||
    rawResult === 'BOOKED'
  ) {
    mappedCallResult = 'BOOKED';
  } else if (
    rawOutcome === 'CALL_BACK' ||
    rawOutcome === 'CALLBACK' ||
    rawOutcome.includes('HẸN GỌI LẠI') ||
    rawOutcome.includes('GỌI LẠI')
  ) {
    mappedCallResult = 'CALLBACK';
  } else if (
    rawOutcome === 'NO_NEED' ||
    rawOutcome.includes('KHÔNG CÓ NHU CẦU') ||
    rawOutcome.includes('KHÔNG NHU CẦU') ||
    rawResult === 'NO_NEED'
  ) {
    mappedCallResult = 'NO_NEED';
  } else if (
    rawOutcome === 'REFUSED' ||
    rawOutcome === 'REJECTED' ||
    rawOutcome.includes('TỪ CHỐI') ||
    rawOutcome.includes('KHÔNG GỌI') ||
    rawResult === 'REJECTED'
  ) {
    mappedCallResult = 'REJECTED';
  } else if (
    rawResult === 'WRONG_NUMBER' ||
    rawOutcome === 'WRONG_NUMBER' ||
    rawOutcome.includes('SAI SỐ') ||
    rawOutcome.includes('NHẦM SỐ')
  ) {
    mappedCallResult = 'WRONG_NUMBER';
  } else if (
    rawResult === 'NO_ANSWER' ||
    rawResult === 'MISSED' ||
    rawResult === 'UNANSWERED' ||
    rawOutcome.includes('GỌI NHỠ') ||
    rawOutcome.includes('KHÔNG TRẢ LỜI')
  ) {
    mappedCallResult = 'NO_ANSWER';
  } else if (rawResult === 'BUSY' || rawOutcome.includes('MÁY BẬN') || rawOutcome.includes('BẬN MÁY')) {
    mappedCallResult = 'BUSY';
  } else if (
    rawResult === 'FAILED' ||
    rawResult === 'ERROR' ||
    rawOutcome.includes('LỖI CUỘC GỌI') ||
    rawOutcome.includes('KHÔNG LIÊN LẠC') ||
    rawOutcome.includes('THUÊ BAO')
  ) {
    mappedCallResult = 'ERROR';
  } else if (
    rawResult === 'ANSWERED' ||
    durationSec > 0 ||
    rawOutcome === 'PENDING' ||
    rawOutcome.includes('SUY NGHĨ') ||
    rawOutcome.includes('CHƯA CHỐT')
  ) {
    mappedCallResult = 'THINKING';
  }

  const NON_PICKUP_RESULTS = new Set(['NO_ANSWER', 'BUSY', 'ERROR', 'FAILED', 'MISSED', 'UNANSWERED']);
  const PICKUP_CALL_RESULTS = new Set([
    'BOOKED',
    'THINKING',
    'CALLBACK',
    'NO_NEED',
    'REJECTED',
    'WRONG_NUMBER',
    'ANSWERED',
    'ANSWER',
    'CONNECTED',
  ]);
  const isPickup =
    !NON_PICKUP_RESULTS.has(rawResult) &&
    (PICKUP_CALL_RESULTS.has(mappedCallResult) || PICKUP_CALL_RESULTS.has(rawResult) || durationSec > 0);

  const isBooked = mappedCallResult === 'BOOKED';
  const isExcluded = ['NO_NEED', 'REJECTED', 'WRONG_NUMBER'].includes(mappedCallResult);

  let nextPoolStatus: CampaignPoolStatus;
  let availableAt: Date | null = null;
  let cooldownUntil: Date | null;

  if (isBooked) {
    nextPoolStatus = 'BOOKED';
    availableAt = null;
    cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
  } else if (isExcluded) {
    nextPoolStatus = 'EXCLUDED';
    availableAt = null;
    cooldownUntil = null;
  } else if (mappedCallResult === 'CALLBACK') {
    nextPoolStatus = 'RECYCLING';
    availableAt = callLog.callbackDate ? new Date(callLog.callbackDate) : new Date(now.getTime() + 24 * 3600 * 1000);
    cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
  } else if (['THINKING', 'NO_ANSWER', 'BUSY', 'ERROR'].includes(mappedCallResult)) {
    const defaultDays = mappedCallResult === 'THINKING' ? 7 : 3;
    const days = config?.recycleRules?.[mappedCallResult as keyof typeof config.recycleRules] ?? defaultDays;
    nextPoolStatus = 'RECYCLING';
    availableAt = new Date(now.getTime() + (Number(days) || defaultDays) * 24 * 3600 * 1000);
    cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
  } else {
    nextPoolStatus = 'EXPLOITED';
    cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
  }

  return {
    mappedCallResult,
    isPickup,
    nextPoolStatus,
    availableAt,
    cooldownUntil,
    isBooked,
    isExcluded,
  };
}
