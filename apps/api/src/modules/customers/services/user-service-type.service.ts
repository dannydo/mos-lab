import { FastifyInstance } from 'fastify';

type LegacyBalanceTransaction = {
  service_group: string | null;
  user_service_balance_id: number | null;
  date_expired: Date | string | null;
};

type LegacyReportOrderService = {
  user_service_type: string | null;
  service_group: string | null;
};

type LegacyUserServiceType = {
  user_service_type: string | null;
};

const LASH_SERVICE_GROUP = 'Lashes';
const LASH_SERVICE_GROUPS = ['LashesTop', 'LashesUnder'];

function formatLocalDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLegacyDate(value: string | Date): string {
  if (typeof value === 'string') {
    const date = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatLocalDate(value);

  return formatLocalDate(new Date());
}

function toLegacyComparableDate(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10) || null;
  return Number.isNaN(value.getTime()) ? null : formatLocalDate(value);
}

/**
 * Single Source of Truth for the booking-time `order_service.user_service_type`.
 *
 * This is a business-rule port of WingsLashes PHP
 * `UserServiceType::getUserOrderServiceType`. The status is determined from
 * the balance transaction ledger as it existed on the booking date; using the
 * current balance rewrites history and classifies booked customers wrongly.
 */
export class UserServiceTypeService {
  public static async determineUserServiceType(
    fastify: FastifyInstance,
    customerId: number,
    bookingDateStart: string | Date,
    serviceGroup = 'LashesTop',
    clientBusinessId = 1
  ): Promise<string> {
    if (!customerId) return 'new';

    const bookingDate = toLegacyDate(bookingDateStart);
    const normalizedServiceGroup = String(serviceGroup || 'LashesTop').trim() || 'LashesTop';
    const serviceGroups =
      normalizedServiceGroup === LASH_SERVICE_GROUP ? LASH_SERVICE_GROUPS : [normalizedServiceGroup];
    const groupPlaceholders = serviceGroups.map(() => '?').join(', ');

    try {
      // PHP: UserServiceBalanceTransaction::find(... DATE(date_created) < $date ...).
      // A row only participates when it was live on this booking date or was
      // consumed, changed, or cancelled on this same date.
      const transactions = await fastify.prisma.legacy.$queryRawUnsafe<LegacyBalanceTransaction[]>(
        `SELECT service_group, user_service_balance_id, date_expired
         FROM user_service_balance_transaction
         WHERE client_business_id = ?
           AND user_id = ?
           AND service_group IN (${groupPlaceholders})
           AND DATE(date_created) < ?
           AND normal_count + retain_count > 0
           AND (
             DATE(date_used) = ?
             OR DATE(date_changed) = ?
             OR DATE(date_cancelled) = ?
             OR (date_used IS NULL AND date_changed IS NULL AND date_cancelled IS NULL)
           )`,
        clientBusinessId,
        customerId,
        ...serviceGroups,
        bookingDate,
        bookingDate,
        bookingDate,
        bookingDate
      );

      const activeBalanceLefts = new Map<string, number>();
      let hasExpiredBalance = false;

      for (const transaction of transactions) {
        const group = String(transaction.service_group || '');
        if (!group) continue;

        const expiryDate = toLegacyComparableDate(transaction.date_expired);
        if (expiryDate && expiryDate < bookingDate) {
          hasExpiredBalance = true;
          continue;
        }

        activeBalanceLefts.set(group, (activeBalanceLefts.get(group) || 0) + 1);
      }

      // A still-live balance must win over an unrelated expired historical
      // balance. The previous PHP ordering made a customer look "Combo Expired"
      // whenever any old balance had expired, even when another balance was
      // usable at the instant of booking.
      let type = '';
      for (const balanceLeft of activeBalanceLefts.values()) {
        if (balanceLeft === 1) type = 'combo_last';
      }

      if (!type) {
        for (const balanceLeft of activeBalanceLefts.values()) {
          if (balanceLeft > 1) type = 'combo';
        }
      }

      if (!type && hasExpiredBalance) type = 'combo_expired';

      let previousOrderService: LegacyReportOrderService | null = null;
      if (!type) {
        const previousOrderServices = await fastify.prisma.legacy.$queryRawUnsafe<LegacyReportOrderService[]>(
          `SELECT user_service_type, service_group
           FROM report_order_service
           WHERE client_business_id = ? AND user_id = ? AND date < ?
           ORDER BY date DESC
           LIMIT 1`,
          clientBusinessId,
          customerId,
          bookingDate
        );
        previousOrderService = previousOrderServices[0] || null;

        if (previousOrderService?.user_service_type === 'combo_last') {
          const balances = await fastify.prisma.legacy.$queryRawUnsafe<{ id: number }[]>(
            `SELECT id
             FROM user_service_balance
             WHERE client_business_id = ?
               AND user_id = ?
               AND service_group = ?
               AND (normal_count > 0 OR retain_count > 0)
             LIMIT 1`,
            clientBusinessId,
            customerId,
            previousOrderService.service_group || ''
          );
          if (balances.length === 0) type = 'combo_over';
        }
      }

      if (!type && normalizedServiceGroup === LASH_SERVICE_GROUP) {
        if (!previousOrderService) {
          const previousOrderServices = await fastify.prisma.legacy.$queryRawUnsafe<LegacyReportOrderService[]>(
            `SELECT user_service_type, service_group
             FROM report_order_service
             WHERE client_business_id = ? AND user_id = ? AND date < ?
             ORDER BY date DESC
             LIMIT 1`,
            clientBusinessId,
            customerId,
            bookingDate
          );
          previousOrderService = previousOrderServices[0] || null;
        }

        if (previousOrderService?.service_group) {
          const inheritedTypes = await fastify.prisma.legacy.$queryRawUnsafe<LegacyUserServiceType[]>(
            `SELECT user_service_type
             FROM user_service_type
             WHERE client_business_id = ? AND user_id = ? AND service_group = ?
             ORDER BY id DESC
             LIMIT 1`,
            clientBusinessId,
            customerId,
            previousOrderService.service_group
          );
          type = String(inheritedTypes[0]?.user_service_type || '');
        }
      }

      if (!type) {
        const savedTypes = await fastify.prisma.legacy.$queryRawUnsafe<LegacyUserServiceType[]>(
          `SELECT user_service_type
           FROM user_service_type
           WHERE client_business_id = ? AND user_id = ? AND service_group = ?
           ORDER BY id DESC
           LIMIT 1`,
          clientBusinessId,
          customerId,
          normalizedServiceGroup
        );
        type = String(savedTypes[0]?.user_service_type || 'new');
      }

      return type === 'lead' ? 'lead_book' : type;
    } catch (error) {
      fastify.log.error(error as Error, `UserServiceTypeService error for customer ${customerId}`);
      return 'new';
    }
  }
}
