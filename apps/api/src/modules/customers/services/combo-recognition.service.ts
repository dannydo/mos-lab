import { FastifyInstance } from 'fastify';

export interface DateBounds {
  startStr: string;
  endStr: string;
}

export interface RecognizedComboSale {
  comboName: string;
  netRevenue: number;
}

type BookingComboLiveRow = {
  orderId: number | bigint | string;
  hasLiveComboAtBooking: number | bigint | boolean | null;
};

function assertSqlAlias(candidateAlias: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(candidateAlias)) {
    throw new Error('Invalid SQL alias for combo recognition');
  }
}

export function buildComboBalanceExistsSql(candidateAlias: string): string {
  assertSqlAlias(candidateAlias);

  return `EXISTS (
    SELECT 1
    FROM user_service_balance usb
    WHERE usb.user_id = ${candidateAlias}.user_id
  )`;
}

/**
 * Evaluates COMBO_LIVE at the instant an appointment was created.
 *
 * A balance is live only when it existed before that booking, still had at
 * least one use remaining, and had not expired at that same instant. The
 * transaction ledger is deliberately reconstructed by `usbt.date_created`:
 * a combo bought after the appointment was booked must never rewrite that
 * appointment's historical status.
 */
export function buildComboLiveAtBookingSql(orderAlias: string): string {
  assertSqlAlias(orderAlias);

  return `EXISTS (
    SELECT 1
    FROM user_service_balance usb
    WHERE usb.user_id = ${orderAlias}.user_id
      AND usb.date_created < ${orderAlias}.date_created
      AND (
        COALESCE(
          (
            SELECT usbt.date_expired
            FROM user_service_balance_transaction usbt
            WHERE usbt.user_service_balance_id = usb.id
              AND usbt.date_created < ${orderAlias}.date_created
            ORDER BY usbt.date_created DESC, usbt.id DESC
            LIMIT 1
          ),
          usb.date_expired
        ) IS NULL
        OR COALESCE(
          (
            SELECT usbt.date_expired
            FROM user_service_balance_transaction usbt
            WHERE usbt.user_service_balance_id = usb.id
              AND usbt.date_created < ${orderAlias}.date_created
            ORDER BY usbt.date_created DESC, usbt.id DESC
            LIMIT 1
          ),
          usb.date_expired
        ) >= DATE(${orderAlias}.date_created)
      )
      AND LEAST(
        COALESCE(
          (
            SELECT usbt.total_normal_count_left + usbt.total_retain_count_left
            FROM user_service_balance_transaction usbt
            WHERE usbt.user_service_balance_id = usb.id
              AND usbt.date_created < ${orderAlias}.date_created
            ORDER BY usbt.date_created DESC, usbt.id DESC
            LIMIT 1
          ),
          999999
        ),
        usb.normal_count + usb.retain_count + (
          SELECT COALESCE(SUM(usbt_after.normal_count + usbt_after.retain_count), 0)
          FROM user_service_balance_transaction usbt_after
          WHERE usbt_after.user_service_balance_id = usb.id
            AND usbt_after.date_created >= ${orderAlias}.date_created
            AND usbt_after.used_staff_id IS NOT NULL
        )
      ) > 0
  )`;
}

/**
 * Rule #21: Unified Date Range Parsing & Bounds Formatter
 * Guarantees 00:00:00 start and 23:59:59 end bounds for string date inputs.
 */
export function parseComboDateBounds(dFrom?: string, dTo?: string): DateBounds {
  let startStr = dFrom ? dFrom.trim() : '';
  let endStr = dTo ? dTo.trim() : '';

  if (!startStr) {
    startStr = `${new Date().toISOString().slice(0, 10)} 00:00:00`;
  } else if (startStr.length === 10) {
    startStr = `${startStr} 00:00:00`;
  } else if (startStr.includes('T')) {
    startStr = startStr.slice(0, 19).replace('T', ' ');
  }

  if (!endStr) {
    endStr = `${new Date().toISOString().slice(0, 10)} 23:59:59`;
  } else if (endStr.length === 10) {
    endStr = `${endStr} 23:59:59`;
  } else if (endStr.includes('T')) {
    endStr = endStr.slice(0, 19).replace('T', ' ');
  }

  return { startStr, endStr };
}

/**
 * Single Source of Truth helper for New LoCa & Combo Sale Customer Recognition
 */
export class ComboRecognitionService {
  /**
   * Returns the canonical combo-live state for a set of bookings.
   *
   * This is intentionally order-level: a booking's customer segment is
   * determined from the balance ledger at the instant the booking was created,
   * rather than from an individual legacy `order_service.user_service_type`
   * value that may have been affected by an old, expired balance.
   */
  public static async getBookingComboLiveStatesByOrderIds(
    fastify: FastifyInstance,
    orderIds: number[]
  ): Promise<Map<number, boolean>> {
    const validOrderIds = [...new Set(orderIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (validOrderIds.length === 0) return new Map();

    const comboLiveAtBookingSql = buildComboLiveAtBookingSql('o');
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<BookingComboLiveRow[]>(`
      SELECT
        o.id AS orderId,
        CASE WHEN ${comboLiveAtBookingSql} THEN 1 ELSE 0 END AS hasLiveComboAtBooking
      FROM \`order\` o
      WHERE o.id IN (${validOrderIds.join(',')})
    `);

    return new Map(
      rows.map((row) => [
        Number(row.orderId),
        row.hasLiveComboAtBooking === true || Number(row.hasLiveComboAtBooking || 0) === 1,
      ])
    );
  }

  /**
   * Rule #21 source of truth for a completed order's real combo sale.
   * It intentionally excludes legacy `single`, `refill`, and `balance`
   * package keys, and requires that the customer's combo balance exists.
   */
  public static async getRecognizedComboSalesByOrderIds(
    fastify: FastifyInstance,
    orderIds: number[]
  ): Promise<Map<number, RecognizedComboSale>> {
    const validOrderIds = [...new Set(orderIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    const comboSalesByOrder = new Map<number, RecognizedComboSale>();

    if (validOrderIds.length === 0) return comboSalesByOrder;

    const orderIdsSql = validOrderIds.join(',');
    const balanceExistsSql = buildComboBalanceExistsSql('o');

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<
      Array<{ orderId: number; serviceName: string | null; packageKey: string | null; netRevenue: number | null }>
    >(`
      SELECT
        recognized_combo.orderId,
        recognized_combo.serviceName,
        recognized_combo.packageKey,
        recognized_combo.netRevenue
      FROM (
        SELECT
          osc.order_id AS orderId,
          COALESCE(sl.service_name, s.service_key, 'Gói combo') AS serviceName,
          sp.service_price_package_key AS packageKey,
          GREATEST(0, COALESCE(
            NULLIF(osc.total_price - osc.tax_amount, 0),
            osc.service_price - osc.discount_amount - osc.tax_amount,
            0
          )) AS netRevenue
        FROM \`order_service_combo\` osc
        JOIN \`order\` o ON o.id = osc.order_id
        LEFT JOIN service s ON s.id = osc.service_id
        LEFT JOIN service_language sl ON sl.service_id = osc.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON sp.id = osc.service_price_id
        WHERE o.id IN (${orderIdsSql})
          AND o.order_state = 'Completed'
          AND osc.total_price > 0
          AND ${balanceExistsSql}
          AND (sp.service_price_package_key IS NULL OR (
            LOWER(sp.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
          ))

        UNION ALL

        SELECT
          os.order_id AS orderId,
          COALESCE(sl.service_name, s.service_key, 'Gói combo') AS serviceName,
          sp.service_price_package_key AS packageKey,
          GREATEST(0, COALESCE(
            NULLIF(os.total_price - os.tax_amount, 0),
            os.service_price - os.discount_amount - os.tax_amount,
            0
          )) AS netRevenue
        FROM \`order_service\` os
        JOIN \`order\` o ON o.id = os.order_id
        LEFT JOIN service s ON s.id = os.service_id
        LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON sp.id = os.service_price_id
        WHERE o.id IN (${orderIdsSql})
          AND o.order_state = 'Completed'
          AND os.total_price > 0
          AND (os.user_service_type = 'combo' OR os.service_group = 'combo' OR s.service_group = 'combo')
          AND ${balanceExistsSql}
          AND (sp.service_price_package_key IS NULL OR (
            LOWER(sp.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
          ))
      ) recognized_combo
    `);

    const comboSales = new Map<number, { names: Set<string>; netRevenue: number }>();
    rows.forEach((row) => {
      const orderId = Number(row.orderId);
      const packageKey = String(row.packageKey || '').trim();
      const counts = packageKey.match(/\d+\s*\+\s*\d+/)?.[0]?.replace(/\s/g, '');
      const comboName = [String(row.serviceName || 'Gói combo'), counts || packageKey].filter(Boolean).join(' ');
      const existing = comboSales.get(orderId) || { names: new Set<string>(), netRevenue: 0 };
      existing.names.add(comboName);
      existing.netRevenue += Number(row.netRevenue || 0);
      comboSales.set(orderId, existing);
    });

    comboSales.forEach((sale, orderId) => {
      comboSalesByOrder.set(orderId, {
        comboName: [...sale.names].join(', '),
        netRevenue: Math.round(sale.netRevenue),
      });
    });

    return comboSalesByOrder;
  }

  public static async getNewLoCaCustomerIds(fastify: FastifyInstance, dFrom?: string, dTo?: string): Promise<number[]> {
    const { startStr, endStr } = parseComboDateBounds(dFrom, dTo);
    const balanceExistsSql = buildComboBalanceExistsSql('recognized_combo');

    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT recognized_combo.user_id FROM (
          SELECT o_nl.user_id FROM \`order\` o_nl
          JOIN order_service_combo osc_nl ON osc_nl.order_id = o_nl.id
          LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
          LEFT JOIN service_price sp_nl ON osc_nl.service_price_id = sp_nl.id
          LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
          WHERE o_nl.order_state = 'Completed'
            AND osc_nl.total_price > 0
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start) >= ?
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start) <= ?
            AND (sp_nl.service_price_package_key IS NULL OR (
              LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl_nl.service_name IS NULL OR (
              LOWER(sl_nl.service_name) NOT LIKE '%single%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%balance%'
            ))
          UNION
          SELECT o_nl.user_id FROM \`order\` o_nl
          JOIN order_service os_nl ON os_nl.order_id = o_nl.id
          LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
          LEFT JOIN service_price sp_nl ON os_nl.service_price_id = sp_nl.id
          LEFT JOIN service_language sl_nl ON os_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
          WHERE o_nl.order_state = 'Completed'
            AND os_nl.total_price > 0
            AND (os_nl.user_service_type = 'combo' OR os_nl.service_group = 'combo')
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start) >= ?
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start) <= ?
            AND (sp_nl.service_price_package_key IS NULL OR (
              LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl_nl.service_name IS NULL OR (
              LOWER(sl_nl.service_name) NOT LIKE '%single%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%balance%'
            ))
        ) recognized_combo
        WHERE ${balanceExistsSql}`,
        startStr,
        endStr,
        startStr,
        endStr
      );

      return (rows || []).map((r) => Number(r.user_id)).filter((id) => !isNaN(id) && id > 0);
    } catch (err) {
      fastify.log.error(err as Error, 'ComboRecognitionService getNewLoCaCustomerIds error');
      return [];
    }
  }
}
