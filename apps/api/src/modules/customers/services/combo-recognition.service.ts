import { FastifyInstance } from 'fastify';

export interface DateBounds {
  startStr: string;
  endStr: string;
}

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
