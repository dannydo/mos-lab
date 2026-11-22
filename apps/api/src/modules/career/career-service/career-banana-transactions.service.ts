import type { FastifyInstance } from 'fastify';
import type {
  BananaTransactionCategory,
  BananaTransactionItem,
  BananaTransactionResponse,
  CareerPeriod,
  SafeAny,
} from '@mos-lab/shared';
import { normalizeAvatarUrl, resolveCareerPeriodDates } from './career-helpers.js';

/**
 * Lấy lịch sử biến động và sao kê chi tiết Chuối của nhân sự
 */
export async function getStaffBananaTransactions(
  fastify: FastifyInstance,
  staffId: number,
  query?: { category?: string; timeRange?: string; period?: CareerPeriod; search?: string; limit?: number }
): Promise<BananaTransactionResponse> {
  // 1. Tìm thông tin nhân sự
  let staff = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    staff = await fastify.prisma.crm.crmStaff.findFirst({
      where: { legacyStaffId: staffId },
    });
  }

  const targetLegacyStaffId = staff?.legacyStaffId || staffId;

  // 2. Lấy số dư thực tế từ user_balance (bao gồm cả số âm!)
  let currentBalance = 0;
  try {
    const balanceRow = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
      targetLegacyStaffId
    );
    if (balanceRow && balanceRow.length > 0) {
      currentBalance = Number(balanceRow[0].amount) || 0;
    }
  } catch {
    // Safe fallback
  }

  // 3. Thống kê tổng số Chuối Yêu Thương (Nhận & Tặng) & Chuối Checkin từ staff_give_away
  let totalReceivedGiveAway = 0;
  let totalSentGiveAway = 0;
  let countReceivedGiveAway = 0;
  let countSentGiveAway = 0;
  let countCheckin = 0;
  let totalCheckinAmount = 0;

  try {
    const stats = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
        SELECT 
          (SELECT COALESCE(SUM(give_away_amount), 0) FROM staff_give_away WHERE to_user_id = ?) as total_received,
          (SELECT COUNT(*) FROM staff_give_away WHERE to_user_id = ?) as count_received,
          (SELECT COALESCE(SUM(give_away_amount), 0) FROM staff_give_away WHERE from_user_id = ?) as total_sent,
          (SELECT COUNT(*) FROM staff_give_away WHERE from_user_id = ?) as count_sent
        `,
      targetLegacyStaffId,
      targetLegacyStaffId,
      targetLegacyStaffId,
      targetLegacyStaffId
    );
    if (stats && stats.length > 0) {
      totalReceivedGiveAway = Number(stats[0].total_received) || 0;
      countReceivedGiveAway = Number(stats[0].count_received) || 0;
      totalSentGiveAway = Number(stats[0].total_sent) || 0;
      countSentGiveAway = Number(stats[0].count_sent) || 0;
    }
  } catch {
    // Safe fallback
  }

  // 4. Map tên thân thiện của các nhân sự liên quan từ crmStaff
  const crmStaffMap = new Map<number, { displayName: string; avatarUrl?: string | null }>();
  try {
    const allStaff = await fastify.prisma.crm.crmStaff.findMany({
      where: { legacyStaffId: { not: null } },
      select: { legacyStaffId: true, displayName: true, username: true, avatarUrl: true },
    });
    allStaff.forEach((s) => {
      if (s.legacyStaffId) {
        crmStaffMap.set(s.legacyStaffId, {
          displayName: s.displayName || s.username?.split('@')[0] || `Staff #${s.legacyStaffId}`,
          avatarUrl: s.avatarUrl ? normalizeAvatarUrl(s.avatarUrl) : null,
        });
      }
    });
  } catch {
    // Safe fallback
  }

  // 5. Query các giao dịch Chuối
  const category = query?.category || 'ALL';
  const timeRange = query?.timeRange || '90d';
  const period = query?.period;
  const search = query?.search?.trim()?.toLowerCase();
  const limit = query?.limit && query.limit > 0 ? Math.min(query.limit, 300) : 150;

  let timeFilterSql = '';
  let periodConfig: ReturnType<typeof resolveCareerPeriodDates> | null = null;
  if (period) {
    periodConfig = resolveCareerPeriodDates(period);
    timeFilterSql = `AND ubt.date_created >= ${periodConfig.periodStartSql} AND ubt.date_created < ${periodConfig.periodEndSql}`;
  } else if (timeRange === '30d') {
    timeFilterSql = 'AND ubt.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  } else if (timeRange === '90d') {
    timeFilterSql = 'AND ubt.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
  }

  // Query từ user_balance_transaction kết hợp staff_give_away
  let rawTransactions: SafeAny[];
  try {
    rawTransactions = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
        SELECT 
          ubt.id,
          ubt.user_id,
          ubt.amount,
          ubt.balance,
          ubt.type,
          ubt.description as ubt_description,
          ubt.date_created,
          sga.id as give_away_id,
          sga.from_user_id,
          sga.to_user_id,
          sga.give_away_amount,
          sga.description as give_away_message,
          sga.staff_give_away_rule_id,
          sgar.type as rule_type,
          p_from.avatar as from_avatar,
          p_from.username as from_username,
          CONCAT(COALESCE(p_from.first_name, ''), ' ', COALESCE(p_from.last_name, '')) as from_fullname,
          p_to.avatar as to_avatar,
          p_to.username as to_username,
          CONCAT(COALESCE(p_to.first_name, ''), ' ', COALESCE(p_to.last_name, '')) as to_fullname
        FROM user_balance_transaction ubt
        LEFT JOIN staff_give_away sga ON ubt.item_id = sga.id
        LEFT JOIN staff_give_away_rule sgar ON sga.staff_give_away_rule_id = sgar.id
        LEFT JOIN user_profile p_from ON sga.from_user_id = p_from.user_id
        LEFT JOIN user_profile p_to ON sga.to_user_id = p_to.user_id
        WHERE ubt.currency_id = 3
          AND ubt.user_id = ?
          ${timeFilterSql}
        ORDER BY ubt.date_created DESC
        LIMIT ?
        `,
      targetLegacyStaffId,
      limit
    );
  } catch {
    rawTransactions = [];
  }

  const transactions: BananaTransactionItem[] = [];

  // Query thêm các lượt đã gửi tặng từ staff_give_away nếu lọc ALL hoặc GIVE_AWAY_SENT
  let sentGiveAways: SafeAny[] = [];
  if (category === 'ALL' || category === 'GIVE_AWAY_SENT') {
    let sgaTimeFilter = '';
    if (periodConfig) {
      sgaTimeFilter = `AND sga.date_created >= ${periodConfig.periodStartSql} AND sga.date_created < ${periodConfig.periodEndSql}`;
    } else if (timeRange === '30d') {
      sgaTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (timeRange === '90d') {
      sgaTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    }
    try {
      sentGiveAways = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            sga.id,
            sga.from_user_id,
            sga.to_user_id,
            sga.give_away_amount,
            sga.description as give_away_message,
            sga.date_created,
            p_to.avatar as to_avatar,
            p_to.username as to_username,
            CONCAT(COALESCE(p_to.first_name, ''), ' ', COALESCE(p_to.last_name, '')) as to_fullname
          FROM staff_give_away sga
          LEFT JOIN user_profile p_to ON sga.to_user_id = p_to.user_id
          WHERE sga.from_user_id = ?
            ${sgaTimeFilter}
          ORDER BY sga.date_created DESC
          LIMIT ?
          `,
        targetLegacyStaffId,
        limit
      );
    } catch {
      sentGiveAways = [];
    }
  }

  // Query các lượt Checkin tặng trực tiếp từ staff_give_away (đặc biệt khi lọc ALL hoặc CHECKIN)
  let checkinGiveAways: SafeAny[] = [];
  if (category === 'ALL' || category === 'CHECKIN') {
    let checkinTimeFilter = '';
    if (periodConfig) {
      checkinTimeFilter = `AND sga.date_created >= ${periodConfig.periodStartSql} AND sga.date_created < ${periodConfig.periodEndSql}`;
    } else if (timeRange === '30d') {
      checkinTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (timeRange === '90d') {
      checkinTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    }
    try {
      checkinGiveAways = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            sga.id,
            sga.from_user_id,
            sga.to_user_id,
            sga.give_away_amount,
            sga.description as give_away_message,
            sga.date_created,
            sgar.type as rule_type,
            p_from.avatar as from_avatar,
            p_from.username as from_username,
            CONCAT(COALESCE(p_from.first_name, ''), ' ', COALESCE(p_from.last_name, '')) as from_fullname
          FROM staff_give_away sga
          JOIN staff_give_away_rule sgar ON sga.staff_give_away_rule_id = sgar.id
          LEFT JOIN user_profile p_from ON sga.from_user_id = p_from.user_id
          WHERE sga.to_user_id = ?
            AND sgar.type = 'CheckIn5MinuteEarly'
            AND sga.from_user_id != sga.to_user_id
            AND (sga.created_staff_id IS NULL OR sga.created_staff_id != sga.to_user_id)
            ${checkinTimeFilter}
          ORDER BY sga.date_created DESC
          LIMIT ?
          `,
        targetLegacyStaffId,
        limit
      );
    } catch {
      checkinGiveAways = [];
    }
  }

  // Process raw balance transactions
  for (const row of rawTransactions) {
    const type = (row.type || 'other').toString().toLowerCase();
    const amount = Number(row.amount) || 0;
    const balance = Number(row.balance) || 0;
    const dateCreated = row.date_created instanceof Date ? row.date_created.toISOString() : String(row.date_created);

    let itemCategory: BananaTransactionCategory = 'OTHER';
    let title = 'Biến động số dư chuối';
    let giveAway: BananaTransactionItem['giveAway'] = null;

    if (type === 'staff_give_away' || row.give_away_id) {
      const fromUserId = Number(row.from_user_id);
      const toUserId = Number(row.to_user_id);
      const isReceived = toUserId === Number(targetLegacyStaffId) || amount > 0;
      const isCheckin =
        isReceived &&
        (row.rule_type === 'CheckIn5MinuteEarly' ||
          (row.rule_type && String(row.rule_type).toLowerCase().includes('checkin')) ||
          (row.give_away_message && String(row.give_away_message).toLowerCase().includes('checkin')));

      if (isCheckin) {
        itemCategory = 'CHECKIN';
        countCheckin++;
        totalCheckinAmount += Math.abs(amount || Number(row.give_away_amount) || 1);
      } else {
        itemCategory = isReceived ? 'GIVE_AWAY_RECEIVED' : 'GIVE_AWAY_SENT';
      }

      const otherUserId = isReceived ? fromUserId : toUserId;
      const otherStaff = crmStaffMap.get(otherUserId);
      const otherName =
        otherStaff?.displayName ||
        (isReceived ? row.from_fullname?.trim() || row.from_username : row.to_fullname?.trim() || row.to_username) ||
        `Đồng nghiệp #${otherUserId || ''}`;

      const rawOtherAvatar = isReceived
        ? row.from_avatar || otherStaff?.avatarUrl
        : row.to_avatar || otherStaff?.avatarUrl;
      const otherAvatarUrl = normalizeAvatarUrl(rawOtherAvatar) || otherStaff?.avatarUrl || undefined;

      title = isCheckin
        ? `Nhận Chuối Check-in cùng ${otherName}`
        : isReceived
          ? `Nhận Chuối yêu thương từ ${otherName}`
          : `Gửi tặng Chuối yêu thương cho ${otherName}`;

      giveAway = {
        id: Number(row.give_away_id) || Number(row.id),
        direction: isReceived ? 'RECEIVED' : 'SENT',
        otherUserId,
        otherStaffName: otherName,
        otherAvatarUrl,
        message: isCheckin
          ? row.give_away_message || 'Check-in sớm 5 phút'
          : row.give_away_message || row.ubt_description || null,
        isCheckin: !!isCheckin,
        ruleType: row.rule_type || (isCheckin ? 'CheckIn5MinuteEarly' : undefined),
      };
    } else if (type === 'staff_working_shift') {
      itemCategory = 'SHIFT';
      title = 'Trừ Chuối ca làm việc';
    } else if (type === 'staff_bonus' || type === 'staff_task' || type === 'staff_activity') {
      itemCategory = 'REWARD';
      title =
        type === 'staff_bonus'
          ? 'Thưởng Chuối thành tích'
          : type === 'staff_task'
            ? 'Thưởng Chuối nhiệm vụ'
            : 'Thưởng Chuối hoạt động';
    }

    transactions.push({
      id: `ubt-${row.id}`,
      dateCreated,
      amount,
      balance,
      type,
      category: itemCategory,
      title,
      description: row.ubt_description || row.give_away_message || null,
      giveAway,
    });
  }

  // Process sent give aways (merge from staff_give_away if not captured in ubt)
  const existingGiveAwayIds = new Set(
    transactions
      .filter((t) => t.giveAway)
      .map((t) => t.giveAway?.id)
      .filter(Boolean)
  );

  for (const sga of sentGiveAways) {
    const sgaId = Number(sga.id);
    if (existingGiveAwayIds.has(sgaId)) continue;

    const toUserId = Number(sga.to_user_id);
    const otherStaff = crmStaffMap.get(toUserId);
    const otherName =
      otherStaff?.displayName || sga.to_fullname?.trim() || sga.to_username || `Đồng nghiệp #${toUserId}`;
    const amount = -Math.abs(Number(sga.give_away_amount) || 1);
    const dateCreated = sga.date_created instanceof Date ? sga.date_created.toISOString() : String(sga.date_created);

    const rawOtherAvatar = sga.to_avatar || otherStaff?.avatarUrl;
    const otherAvatarUrl = normalizeAvatarUrl(rawOtherAvatar) || otherStaff?.avatarUrl || undefined;

    transactions.push({
      id: `sga-${sgaId}`,
      dateCreated,
      amount,
      balance: currentBalance,
      type: 'staff_give_away',
      category: 'GIVE_AWAY_SENT',
      title: `Gửi tặng Chuối yêu thương cho ${otherName}`,
      description: sga.give_away_message || null,
      giveAway: {
        id: sgaId,
        direction: 'SENT',
        otherUserId: toUserId,
        otherStaffName: otherName,
        otherAvatarUrl,
        message: sga.give_away_message || null,
      },
    });
  }

  // Merge checkin give aways directly from staff_give_away (if not in ubt)
  const existingCheckinIds = new Set(
    transactions
      .filter((t) => t.category === 'CHECKIN')
      .map((t) => t.giveAway?.id)
      .filter(Boolean)
  );

  for (const cga of checkinGiveAways) {
    const cgaId = Number(cga.id);
    if (existingCheckinIds.has(cgaId)) continue;

    const fromUserId = Number(cga.from_user_id);
    const otherStaff = crmStaffMap.get(fromUserId);
    const otherName =
      otherStaff?.displayName || cga.from_fullname?.trim() || cga.from_username || `Đồng nghiệp #${fromUserId}`;
    const amount = Math.abs(Number(cga.give_away_amount) || 1);
    const dateCreated = cga.date_created instanceof Date ? cga.date_created.toISOString() : String(cga.date_created);

    const rawOtherAvatar = cga.from_avatar || otherStaff?.avatarUrl;
    const otherAvatarUrl = normalizeAvatarUrl(rawOtherAvatar) || otherStaff?.avatarUrl || undefined;

    countCheckin++;
    totalCheckinAmount += amount;

    transactions.push({
      id: `cga-${cgaId}`,
      dateCreated,
      amount,
      balance: currentBalance,
      type: 'staff_give_away',
      category: 'CHECKIN',
      title: `Nhận Chuối Check-in cùng ${otherName}`,
      description: cga.give_away_message || 'Check-in sớm 5 phút',
      giveAway: {
        id: cgaId,
        direction: 'RECEIVED',
        otherUserId: fromUserId,
        otherStaffName: otherName,
        otherAvatarUrl,
        message: cga.give_away_message || 'Check-in sớm 5 phút',
        isCheckin: true,
        ruleType: cga.rule_type || 'CheckIn5MinuteEarly',
      },
    });
  }

  // Sort by date_created DESC
  transactions.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  // Filter by Category
  let filteredTransactions = transactions;
  if (category !== 'ALL') {
    filteredTransactions = filteredTransactions.filter((t) => t.category === category);
  }

  // Filter by Search text (tên bạn bè, lời chúc, tiêu đề)
  if (search) {
    filteredTransactions = filteredTransactions.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(search);
      const descMatch = t.description?.toLowerCase().includes(search);
      const nameMatch = t.giveAway?.otherStaffName.toLowerCase().includes(search);
      const msgMatch = t.giveAway?.message?.toLowerCase().includes(search);
      return titleMatch || descMatch || nameMatch || msgMatch;
    });
  }

  return {
    currentBalance,
    totalReceivedGiveAway,
    totalSentGiveAway,
    countReceivedGiveAway,
    countSentGiveAway,
    countCheckin,
    totalCheckinAmount,
    transactions: filteredTransactions,
  };
}
