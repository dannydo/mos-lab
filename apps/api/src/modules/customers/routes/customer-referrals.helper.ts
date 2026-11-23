import { FastifyInstance } from 'fastify';
import {
  ReferralFriendItem,
  ReferralTabCounts,
  ReferralsPaginatedResponse,
  ReferrerSummaryItem,
  SafeAny,
} from '@mos-lab/shared';

export type ReferralTimeFilter = keyof ReferralTabCounts;

const VALID_TIME_FILTERS = new Set<ReferralTimeFilter>([
  'all_time',
  'this_month',
  'last_month',
  'this_year',
  'last_year',
]);

const REFERRALS_CACHE_TTL_MS = 60_000;

export function normalizeReferralTimeFilter(raw?: string): ReferralTimeFilter {
  if (raw && VALID_TIME_FILTERS.has(raw as ReferralTimeFilter)) {
    return raw as ReferralTimeFilter;
  }
  return 'all_time';
}

export function createEmptyReferralTabCounts(): ReferralTabCounts {
  return {
    all_time: 0,
    this_month: 0,
    last_month: 0,
    this_year: 0,
    last_year: 0,
  };
}

export function createEmptyReferralsResponse(page = 1, pageSize = 20): ReferralsPaginatedResponse {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    tabCounts: createEmptyReferralTabCounts(),
  };
}

function buildReferralTimeWhere(timeFilter: ReferralTimeFilter): string {
  if (timeFilter === 'this_month') {
    return "AND up.date_created >= DATE_FORMAT(NOW(), '%Y-%m-01')";
  }
  if (timeFilter === 'last_month') {
    return "AND up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01') AND up.date_created < DATE_FORMAT(NOW(), '%Y-%m-01')";
  }
  if (timeFilter === 'this_year') {
    return "AND up.date_created >= DATE_FORMAT(NOW(), '%Y-01-01')";
  }
  if (timeFilter === 'last_year') {
    return "AND up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 YEAR, '%Y-01-01') AND up.date_created < DATE_FORMAT(NOW(), '%Y-01-01')";
  }
  return '';
}

export async function getPaginatedReferrals(
  fastify: FastifyInstance,
  query: {
    page?: string | number;
    pageSize?: string | number;
    search?: string;
    timeFilter?: string;
  }
): Promise<ReferralsPaginatedResponse> {
  const timeFilter = normalizeReferralTimeFilter(query.timeFilter);
  const pageNum = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const offset = (pageNum - 1) * limit;
  const cleanSearch = String(query.search || '').trim();

  const cacheKey = `customers:referrals:${timeFilter}:${pageNum}:${limit}:${cleanSearch.toLowerCase()}`;
  const cached = fastify.cache?.get<ReferralsPaginatedResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const timeWhere = buildReferralTimeWhere(timeFilter);
  const hasSearch = cleanSearch.length > 0;
  const likePattern = `%${cleanSearch}%`;
  const searchWhere = hasSearch ? 'AND (r_up.full_name LIKE ? OR r_uc.phone_number LIKE ?)' : '';
  const searchParams = hasSearch ? [likePattern, likePattern] : [];

  const referrersPromise = fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT
       up.referrer_user_id AS referrerId,
       MAX(r_up.full_name) AS referrerName,
       COALESCE(MAX(r_uc.phone_number), '') AS referrerPhone,
       COUNT(DISTINCT up.user_id) AS totalReferred
     FROM user_profile up
     INNER JOIN user r_u ON up.referrer_user_id = r_u.id
     INNER JOIN user_profile r_up ON r_u.id = r_up.user_id
     LEFT JOIN user_contact r_uc ON r_u.id = r_uc.user_id AND r_uc.is_disabled = 0
     INNER JOIN user u ON up.user_id = u.id
     WHERE up.referrer_user_id IS NOT NULL AND up.is_deleted = 0 ${timeWhere} ${searchWhere}
     GROUP BY up.referrer_user_id
     ORDER BY totalReferred DESC, up.referrer_user_id DESC
     LIMIT ? OFFSET ?`,
    ...searchParams,
    limit,
    offset
  );

  const tabCountsCacheKey = !hasSearch ? 'customers:referrals:tabCounts' : null;
  const cachedTabCounts = tabCountsCacheKey ? fastify.cache?.get<ReferralTabCounts>(tabCountsCacheKey) : undefined;

  const tabCountsPromise: Promise<ReferralTabCounts> = cachedTabCounts
    ? Promise.resolve(cachedTabCounts)
    : fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `SELECT
             COUNT(DISTINCT up.referrer_user_id) AS all_time,
             COUNT(DISTINCT CASE WHEN up.date_created >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN up.referrer_user_id END) AS this_month,
             COUNT(DISTINCT CASE WHEN up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01') AND up.date_created < DATE_FORMAT(NOW(), '%Y-%m-01') THEN up.referrer_user_id END) AS last_month,
             COUNT(DISTINCT CASE WHEN up.date_created >= DATE_FORMAT(NOW(), '%Y-01-01') THEN up.referrer_user_id END) AS this_year,
             COUNT(DISTINCT CASE WHEN up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 YEAR, '%Y-01-01') AND up.date_created < DATE_FORMAT(NOW(), '%Y-01-01') THEN up.referrer_user_id END) AS last_year
           FROM user_profile up
           INNER JOIN user r_u ON up.referrer_user_id = r_u.id
           INNER JOIN user u ON up.user_id = u.id
           ${hasSearch ? 'INNER JOIN user_profile r_up ON r_u.id = r_up.user_id LEFT JOIN user_contact r_uc ON r_u.id = r_uc.user_id AND r_uc.is_disabled = 0' : ''}
           WHERE up.referrer_user_id IS NOT NULL AND up.is_deleted = 0 ${searchWhere}`,
          ...searchParams
        )
        .then((rows) => {
          const row = rows?.[0] || {};
          const counts: ReferralTabCounts = {
            all_time: Number(row.all_time || 0),
            this_month: Number(row.this_month || 0),
            last_month: Number(row.last_month || 0),
            this_year: Number(row.this_year || 0),
            last_year: Number(row.last_year || 0),
          };
          if (tabCountsCacheKey) {
            fastify.cache?.set(tabCountsCacheKey, counts, REFERRALS_CACHE_TTL_MS);
          }
          return counts;
        });

  const [referrers, tabCounts] = await Promise.all([referrersPromise, tabCountsPromise]);
  const total = tabCounts[timeFilter] ?? 0;

  const referrerIds = referrers.map((r) => Number(r.referrerId)).filter((id) => Number.isFinite(id) && id > 0);
  if (referrerIds.length === 0) {
    const emptyRes: ReferralsPaginatedResponse = {
      items: [],
      total,
      page: pageNum,
      pageSize: limit,
      tabCounts,
    };
    fastify.cache?.set(cacheKey, emptyRes, REFERRALS_CACHE_TTL_MS);
    return emptyRes;
  }

  const refPlaceholders = referrerIds.map(() => '?').join(',');

  const [referredFriends, referralTxs] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT
         u.id AS referredId,
         up.full_name AS referredName,
         COALESCE(uc.phone_number, '') AS referredPhone,
         u.date_created AS dateCreated,
         up.referrer_user_id AS referrerId
       FROM user u
       INNER JOIN user_profile up ON u.id = up.user_id
       LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
       WHERE up.referrer_user_id IN (${refPlaceholders}) AND up.is_deleted = 0 ${timeWhere}
       ORDER BY u.id DESC`,
      ...referrerIds
    ),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id AS referrerId, amount, tracking_key
       FROM user_balance_transaction
       WHERE template_id = 7 AND currency_id = 3 AND user_id IN (${refPlaceholders})`,
      ...referrerIds
    ),
  ]);

  const referrerRewardMaps = new Map<number, Map<number, number>>();
  for (const tx of referralTxs) {
    const refId = Number(tx.referrerId);
    try {
      if (tx.tracking_key) {
        const keyObj = JSON.parse(tx.tracking_key);
        const referredId = Number(keyObj.user_id);
        if (referredId && refId) {
          const amt = Number(tx.amount || 0);
          if (!referrerRewardMaps.has(refId)) {
            referrerRewardMaps.set(refId, new Map<number, number>());
          }
          const rewardMap = referrerRewardMaps.get(refId)!;
          rewardMap.set(referredId, (rewardMap.get(referredId) || 0) + amt);
        }
      }
    } catch {
      // ignore malformed tracking_key
    }
  }

  const friendsGrouped = new Map<number, Map<number, ReferralFriendItem>>();
  for (const rf of referredFriends) {
    const refId = Number(rf.referrerId);
    const friendId = Number(rf.referredId);
    if (!refId || !friendId) continue;

    if (!friendsGrouped.has(refId)) {
      friendsGrouped.set(refId, new Map<number, ReferralFriendItem>());
    }
    const refMap = friendsGrouped.get(refId)!;
    const existing = refMap.get(friendId);
    if (existing) {
      if (rf.referredPhone && !existing.phone.includes(rf.referredPhone)) {
        existing.phone = existing.phone ? `${existing.phone}, ${rf.referredPhone}` : rf.referredPhone;
      }
    } else {
      const rewardDiamonds = referrerRewardMaps.get(refId)?.get(friendId) || 0;
      refMap.set(friendId, {
        id: friendId,
        name: rf.referredName || 'Khách hàng',
        phone: rf.referredPhone || '',
        dateCreated: rf.dateCreated ? new Date(rf.dateCreated).toISOString() : null,
        rewardDiamonds,
      });
    }
  }

  const items: ReferrerSummaryItem[] = referrers.map((r) => {
    const refId = Number(r.referrerId);
    const referredUsers = Array.from(friendsGrouped.get(refId)?.values() || []);
    const totalRewardDiamonds = referredUsers.reduce((sum, friend) => sum + (friend.rewardDiamonds || 0), 0);
    return {
      referrerId: refId,
      referrerName: r.referrerName || 'Khách hàng',
      referrerPhone: r.referrerPhone || '',
      totalReferred: referredUsers.length > 0 ? referredUsers.length : Number(r.totalReferred || 0),
      totalRewardDiamonds,
      referredUsers,
    };
  });

  const response: ReferralsPaginatedResponse = {
    items,
    total,
    page: pageNum,
    pageSize: limit,
    tabCounts,
  };
  fastify.cache?.set(cacheKey, response, REFERRALS_CACHE_TTL_MS);
  return response;
}
