/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type {
  CampaignSharedPoolDetailedLog,
  SharedPoolHistoryQueryParams,
  SharedPoolHistoryResponse,
} from '@mos-lab/shared';

function resolveHistoryActionFilter(action: string): any {
  const act = action.toUpperCase();
  if (act === 'CLAIM') return 'CLAIM';
  if (act === 'RELEASE') return { in: ['RELEASE_MANUAL', 'RELEASE_MANAGER', 'RELEASE_EXPIRED'] };
  if (act === 'CALL' || act === 'STATUS_UPDATE') return { in: ['CALL', 'STATUS_UPDATE'] };
  if (act === 'RECYCLE') return { in: ['RECYCLE', 'RECYCLE_RETURN'] };
  if (act === 'EXCLUDE') return 'EXCLUDE';
  if (act === 'BOOKING') return { in: ['BOOK', 'BOOKING'] };
  if (act === 'MANAGER') {
    return {
      in: [
        'RELEASE_MANAGER',
        'RETURN_TO_POOL',
        'EXCLUDE',
        'RECOVERY_OVERRIDE',
        'PAUSE_POOL',
        'RESUME_POOL',
        'MANUAL_ADVANCE_BATCH',
      ],
    };
  }
  if (act === 'RECOVERY') return 'RECOVERY_OVERRIDE';
  return action;
}

const ACTION_LABELS: Record<string, string> = {
  CLAIM: 'Lock / Giữ Data',
  RELEASE_MANUAL: 'Nhả Claim',
  RELEASE_MANAGER: 'Quản lý nhả Claim',
  RELEASE_EXPIRED: 'Hết hạn Lock (TTL)',
  CALL: 'Báo cáo gọi / Trạng thái',
  STATUS_UPDATE: 'Báo cáo gọi / Trạng thái',
  RECYCLE: 'Chờ quay lại (Recycle)',
  RECYCLE_RETURN: 'Chờ quay lại (Recycle)',
  EXCLUDE: 'Đã loại khỏi Pool',
  RETURN_TO_POOL: 'Về lại Pool',
  BOOK: 'Chốt Booking',
  BOOKING: 'Chốt Booking',
  RECOVERY_OVERRIDE: 'Quản lý Khôi phục',
  PAUSE_POOL: 'Tạm dừng Pool',
  RESUME_POOL: 'Tiếp tục Pool',
  MANUAL_ADVANCE_BATCH: 'Mở Batch mới',
  AUTO_ADVANCE_BATCH: 'Mở Batch mới',
};

const RESTORABLE_ACTIONS = new Set([
  'CLAIM',
  'RELEASE_MANUAL',
  'RELEASE_MANAGER',
  'RELEASE_EXPIRED',
  'STATUS_UPDATE',
  'CALL',
  'EXCLUDE',
  'RETURN_TO_POOL',
  'RECOVERY_OVERRIDE',
]);

/**
 * Get immutable audit and action logs for a customer in Shared Pool (chống tranh công).
 */
export async function getSharedPoolLogs(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number
): Promise<any[]> {
  const logs = await fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
    where: {
      campaignId,
      OR: [{ campaignCustomerId: customerId }, { legacyUserId: customerId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return logs.map((l) => ({
    id: l.id,
    campaignId: l.campaignId,
    campaignCustomerId: l.campaignCustomerId,
    legacyUserId: l.legacyUserId,
    staffId: l.staffId,
    staffName: l.staffName,
    action: l.action,
    note: l.note,
    metadata: l.metadata,
    createdAt: l.createdAt.toISOString(),
  }));
}

/**
 * Get detailed real-time history and audit trail for Campaign Shared Pool
 */
export async function getCampaignSharedPoolHistory(
  fastify: FastifyInstance,
  campaignId: number,
  params: SharedPoolHistoryQueryParams = {}
): Promise<SharedPoolHistoryResponse> {
  const pageNum = Math.max(1, Math.floor(Number(params.page) || 1));
  const limitNum = Math.min(200, Math.max(1, Math.floor(Number(params.pageSize) || 20)));
  const skip = (pageNum - 1) * limitNum;

  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, operationMode: true },
  });
  if (!campaign) {
    throw new Error(`Chiến dịch ID ${campaignId} không tồn tại.`);
  }

  const where: any = {
    campaignId,
  };

  // Filter by action group
  if (params.action && params.action !== 'ALL') {
    where.action = resolveHistoryActionFilter(params.action);
  }

  // Filter by specific customer
  if (params.customerId) {
    const cid = Number(params.customerId);
    if (!isNaN(cid) && cid > 0) {
      where.OR = [{ campaignCustomerId: cid }, { legacyUserId: cid }];
    }
  }

  // Filter by staff
  if (params.staffId) {
    const sid = Number(params.staffId);
    if (!isNaN(sid) && sid > 0) {
      where.staffId = sid;
    }
  }

  // Filter by date range
  if (params.dateFrom || params.dateTo) {
    const dateFilter: any = {};
    if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
    if (params.dateTo) dateFilter.lte = new Date(params.dateTo);
    where.createdAt = dateFilter;
  }

  // Search query: matching customer name / phone or staff name
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    const numMatch = parseInt(q, 10);
    const isNum = !isNaN(numMatch) && String(numMatch) === q;

    const [matchedUserProfiles, matchedUserContacts] = await Promise.all([
      fastify.prisma.legacy.user_profile.findMany({
        where: {
          OR: [{ full_name: { contains: q } }, ...(isNum ? [{ user_id: numMatch }] : [])],
        },
        select: { user_id: true },
        take: 100,
      }),
      fastify.prisma.legacy.user_contact.findMany({
        where: {
          phone_number: { contains: q },
        },
        select: { user_id: true },
        take: 100,
      }),
    ]);

    const matchedUserIds = Array.from(
      new Set([
        ...matchedUserProfiles.map((p) => p.user_id),
        ...matchedUserContacts.map((c) => c.user_id),
        ...(isNum ? [numMatch] : []),
      ])
    );

    where.AND = [
      {
        OR: [
          ...(matchedUserIds.length > 0 ? [{ legacyUserId: { in: matchedUserIds } }] : []),
          { staffName: { contains: q } },
          { note: { contains: q } },
        ],
      },
    ];
  }

  const [total, rawLogs] = await Promise.all([
    fastify.prisma.crm.crmCampaignSharedPoolLog.count({ where }),
    fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
      where,
      orderBy: { id: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  const legacyUserIds = Array.from(
    new Set(rawLogs.map((l) => l.legacyUserId).filter((id): id is number => typeof id === 'number' && id > 0))
  );
  const campaignCustomerIds = Array.from(
    new Set(rawLogs.map((l) => l.campaignCustomerId).filter((id): id is number => typeof id === 'number' && id > 0))
  );

  const [profiles, contacts, currentCustomers] = await Promise.all([
    legacyUserIds.length > 0
      ? fastify.prisma.legacy.user_profile.findMany({
          where: { user_id: { in: legacyUserIds } },
          select: { user_id: true, full_name: true },
        })
      : [],
    legacyUserIds.length > 0
      ? fastify.prisma.legacy.user_contact.findMany({
          where: { user_id: { in: legacyUserIds }, is_disabled: false },
          select: { user_id: true, phone_number: true },
        })
      : [],
    campaignCustomerIds.length > 0
      ? fastify.prisma.crm.crmCampaignCustomer.findMany({
          where: { id: { in: campaignCustomerIds }, campaignId },
          select: {
            id: true,
            legacyUserId: true,
            poolStatus: true,
            claimedByStaffId: true,
            claimedByStaffName: true,
            removedAt: true,
          },
        })
      : [],
  ]);

  const profileMap = new Map<number, string>();
  profiles.forEach((p) => profileMap.set(p.user_id, p.full_name || ''));

  const contactMap = new Map<number, string>();
  contacts.forEach((c) => {
    if (!contactMap.has(c.user_id)) {
      contactMap.set(c.user_id, c.phone_number || '');
    }
  });

  const currentCustomerMap = new Map<number, any>();
  currentCustomers.forEach((cc) => currentCustomerMap.set(cc.id, cc));

  const items: CampaignSharedPoolDetailedLog[] = rawLogs.map((l) => {
    let parsedMeta: any = null;
    if (l.metadata) {
      try {
        parsedMeta = JSON.parse(l.metadata);
      } catch {
        parsedMeta = { raw: l.metadata };
      }
    }

    const actionLabel = ACTION_LABELS[l.action] ?? l.action;

    let previousPoolStatus: string | null =
      parsedMeta?.previousPoolStatus || parsedMeta?.previousState?.poolStatus || null;
    let nextPoolStatus: string | null = parsedMeta?.nextPoolStatus || parsedMeta?.nextState?.poolStatus || null;

    if (!previousPoolStatus || !nextPoolStatus) {
      if (l.action === 'CLAIM') {
        previousPoolStatus = previousPoolStatus || 'AVAILABLE';
        nextPoolStatus = nextPoolStatus || 'CLAIMED';
      } else if (l.action === 'RELEASE_MANUAL' || l.action === 'RELEASE_MANAGER' || l.action === 'RELEASE_EXPIRED') {
        previousPoolStatus = previousPoolStatus || 'CLAIMED';
        nextPoolStatus = nextPoolStatus || 'AVAILABLE';
      } else if (l.action === 'RETURN_TO_POOL') {
        nextPoolStatus = nextPoolStatus || 'AVAILABLE';
      } else if (l.action === 'EXCLUDE') {
        nextPoolStatus = nextPoolStatus || 'EXCLUDED';
      } else if (l.action === 'STATUS_UPDATE' || l.action === 'CALL') {
        nextPoolStatus = nextPoolStatus || parsedMeta?.nextPoolStatus || null;
      }
    }

    const currentCust = l.campaignCustomerId ? currentCustomerMap.get(l.campaignCustomerId) : null;
    const currentPoolStatus = currentCust?.poolStatus || null;
    const isDrifted = Boolean(currentCust && nextPoolStatus && currentPoolStatus !== nextPoolStatus);

    const canRestore = Boolean(
      currentCust &&
      !currentCust.removedAt &&
      typeof l.campaignCustomerId === 'number' &&
      l.campaignCustomerId > 0 &&
      RESTORABLE_ACTIONS.has(l.action)
    );

    let resultText: string | null = parsedMeta?.result || null;
    if (!resultText) {
      if (parsedMeta?.callResult) {
        resultText = `Kết quả gọi: ${parsedMeta.callResult}`;
      } else if (l.action === 'RECOVERY_OVERRIDE') {
        resultText = 'Đã khôi phục thành công';
      } else {
        resultText = 'Thành công';
      }
    }

    return {
      id: l.id,
      campaignId: l.campaignId,
      campaignCustomerId: l.campaignCustomerId,
      legacyUserId: l.legacyUserId,
      customerName: (l.legacyUserId && profileMap.get(l.legacyUserId)) || null,
      customerPhone: (l.legacyUserId && contactMap.get(l.legacyUserId)) || null,
      currentPoolStatus,
      currentClaimedByStaffId: currentCust?.claimedByStaffId || null,
      currentClaimedByStaffName: currentCust?.claimedByStaffName || null,
      staffId: l.staffId,
      staffName: l.staffName,
      action: l.action,
      actionLabel,
      previousPoolStatus,
      nextPoolStatus,
      previousClaimedByStaffName: parsedMeta?.previousClaimedByStaffName || null,
      nextClaimedByStaffName: parsedMeta?.nextClaimedByStaffName || null,
      note: l.note,
      metadata: parsedMeta,
      result: resultText,
      isDrifted,
      canRestore,
      createdAt: l.createdAt.toISOString(),
    };
  });

  return {
    items,
    total,
    page: pageNum,
    pageSize: limitNum,
    pages: Math.ceil(total / limitNum) || 0,
  };
}
