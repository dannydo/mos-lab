import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

export interface BookingSaleClassification {
  isNew: number;
  comboSaleRequired: number;
}

function formatLocalDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLegacyComparableDate(value: string | Date): string {
  if (typeof value === 'string') {
    const date = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatLocalDate(value);

  return formatLocalDate(new Date());
}

/**
 * Calculates `is_new` and `combo_sale_required` snapshots when creating a booking.
 *
 * Business Rules:
 * 1. `is_new`:
 *    - 1 if the customer has never had an active/completed booking before.
 *    - 0 if the customer has previous bookings or an existing `user_profile.last_order_booking`.
 *
 * 2. `combo_sale_required`:
 *    - In Legacy WingsLashes (`UserServiceBalance::getComboSaleRequired`), starts at 1 for `LashesTop`.
 *    - If the customer has an active combo balance with `normal_count + retain_count > 1` (and not expired),
 *      it decrements to 0 (`combo_sale_required = 0`).
 *    - Otherwise (Single / khách lẻ customer, or combo balance depleted with <= 1 use remaining),
 *      it remains 1 (`combo_sale_required = 1`), indicating the CC must sell a combo.
 *    - The Legacy iOS app checks `order.combo_sale_required != "0"` to render the Green Avatar Border (Vòng Xanh).
 */
export class BookingSaleClassificationService {
  public static async determineBookingSaleClassification(
    fastify: FastifyInstance,
    customerId: number,
    bookingDateStart: string | Date,
    serviceGroup = 'LashesTop',
    clientBusinessId = 1
  ): Promise<BookingSaleClassification> {
    if (!customerId) {
      return { isNew: 1, comboSaleRequired: 1 };
    }

    const bookingDate = toLegacyComparableDate(bookingDateStart);

    // 1. Determine is_new
    let isNew: number;
    try {
      const profile = await (fastify.prisma.legacy as SafeAny).user_profile?.findFirst?.({
        where: { user_id: customerId },
        select: { last_order_booking: true },
      });

      if (profile?.last_order_booking) {
        isNew = 0;
      } else {
        const prevOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id FROM \`order\` 
           WHERE user_id = ? 
             AND order_state NOT IN ('Cancel', 'Deleted') 
           LIMIT 1`,
          customerId
        );
        isNew = prevOrders && prevOrders.length > 0 ? 0 : 1;
      }
    } catch {
      // Fallback in case user_profile table query fails
      try {
        const prevOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id FROM \`order\` 
           WHERE user_id = ? 
             AND order_state NOT IN ('Cancel', 'Deleted') 
           LIMIT 1`,
          customerId
        );
        isNew = prevOrders && prevOrders.length > 0 ? 0 : 1;
      } catch {
        isNew = 0;
      }
    }

    // 2. Determine combo_sale_required
    let comboSaleRequired: number;
    try {
      // Check if user has an active combo balance for lashes with > 1 use remaining and not expired
      const targetGroups =
        serviceGroup === 'LashesUnder' ? ['LashesUnder', 'LashesTop', 'Lashes'] : ['LashesTop', 'Lashes'];
      const placeholders = targetGroups.map(() => '?').join(', ');

      const activeCombos = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user_service_balance 
         WHERE client_business_id = ?
           AND user_id = ? 
           AND (service_group IS NULL OR service_group IN (${placeholders}))
           AND (normal_count + retain_count > 1)
           AND (date_expired IS NULL OR date_expired >= ?)
         LIMIT 1`,
        clientBusinessId,
        customerId,
        ...targetGroups,
        bookingDate
      );

      if (activeCombos && activeCombos.length > 0) {
        comboSaleRequired = 0;
      } else {
        comboSaleRequired = 1;
      }
    } catch (error) {
      fastify.log?.error?.(
        error as Error,
        `BookingSaleClassificationService error determining comboSaleRequired for customer ${customerId}`
      );
      comboSaleRequired = 1;
    }

    return { isNew, comboSaleRequired };
  }
}
