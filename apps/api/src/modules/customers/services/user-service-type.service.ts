import { FastifyInstance } from 'fastify';

/**
 * Single Source of Truth helper for determining user_service_type for customer bookings.
 * Aligns 100% with legacy PHP UserServiceType::getUserOrderServiceType logic.
 */
export class UserServiceTypeService {
  /**
   * Dynamically determines user_service_type for a customer's booking or reschedule.
   *
   * Returned values map to iOS App icons:
   * - 'combo': 🔄 (Mũi tên xoay vòng màu cam - Còn lượt gói Combo)
   * - 'combo_last': 💲 (Dấu đô-la - Lượt Combo cuối cùng)
   * - 'combo_expired': 🔄 (Mũi tên xoay vòng màu đỏ - Gói Combo đã hết hạn)
   * - 'combo_over': 🔍💲 (Kính lúp đô-la - Đã dùng hết lượt Combo)
   * - 'new': ☀️ (Mặt trời - Khách hàng mới)
   * - 'lapser': 💓 (Trái tim - Khách có nguy cơ rời bỏ)
   * - 'long_time': 📅 (Tờ lịch - Khách lâu ngày chưa làm)
   */
  public static async determineUserServiceType(
    fastify: FastifyInstance,
    customerId: number,
    bookingDateStart: string | Date
  ): Promise<string> {
    if (!customerId) return 'new';

    let dateStr = '';
    if (typeof bookingDateStart === 'string') {
      dateStr = bookingDateStart.trim().slice(0, 10);
    } else if (bookingDateStart instanceof Date) {
      dateStr = bookingDateStart.toISOString().slice(0, 10);
    }
    if (!dateStr || dateStr.length < 10) {
      dateStr = new Date().toISOString().slice(0, 10);
    }

    try {
      // 1. Check user_service_balance for active combo balances
      const balances = await fastify.prisma.legacy.$queryRawUnsafe<
        { normal_count: number; retain_count: number; date_expired: Date | null }[]
      >(
        `SELECT normal_count, retain_count, date_expired
         FROM user_service_balance
         WHERE user_id = ? AND (normal_count > 0 OR retain_count > 0)`,
        customerId
      );

      if (balances && balances.length > 0) {
        let totalCount = 0;
        let isExpired = false;

        for (const b of balances) {
          const count = (Number(b.normal_count) || 0) + (Number(b.retain_count) || 0);
          totalCount += count;

          if (b.date_expired) {
            const expDate = new Date(b.date_expired).toISOString().slice(0, 10);
            if (expDate < dateStr) {
              isExpired = true;
            }
          }
        }

        if (totalCount > 1) {
          return 'combo';
        }
        if (totalCount === 1) {
          return 'combo_last';
        }
        if (isExpired) {
          return 'combo_expired';
        }
      }

      // 2. Check if previous completed service was combo_last (combo_over)
      const prevOrderServices = await fastify.prisma.legacy.$queryRawUnsafe<{ user_service_type: string }[]>(
        `SELECT os.user_service_type
         FROM order_service os
         JOIN \`order\` o ON os.order_id = o.id
         WHERE o.user_id = ? AND o.order_state = 'Completed'
         ORDER BY os.id DESC LIMIT 1`,
        customerId
      );

      if (prevOrderServices && prevOrderServices.length > 0) {
        if (prevOrderServices[0].user_service_type === 'combo_last') {
          return 'combo_over';
        }
      }

      // 3. Check customer completed orders history
      const orderCountRows = await fastify.prisma.legacy.$queryRawUnsafe<{ cnt: bigint; last_booking: Date | null }[]>(
        `SELECT COUNT(o.id) as cnt, MAX(COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created)) as last_booking
         FROM \`order\` o
         LEFT JOIN report_order ro ON o.id = ro.order_id
         WHERE o.user_id = ? AND o.order_state = 'Completed'`,
        customerId
      );

      const completedCount = orderCountRows?.[0] ? Number(orderCountRows[0].cnt) : 0;
      if (completedCount === 0) {
        return 'new';
      }

      // 4. Returning customer: calculate days since last booking for lapser / long_time
      const lastBooking = orderCountRows?.[0]?.last_booking;
      if (lastBooking) {
        const lastDate = new Date(lastBooking);
        const targetDate = new Date(dateStr);
        const diffDays = Math.floor((targetDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays >= 60) {
          return 'lapser';
        }
        if (diffDays >= 30) {
          return 'long_time';
        }
      }

      return 'combo';
    } catch (err) {
      fastify.log.error(err as Error, `UserServiceTypeService error for customer ${customerId}`);
      return 'new';
    }
  }
}
