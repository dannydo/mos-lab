import { FastifyInstance } from 'fastify';

export interface DateBounds {
  startStr: string;
  endStr: string;
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

    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id FROM (
          SELECT o_nl.user_id FROM \`order\` o_nl
          JOIN order_service_combo osc_nl ON osc_nl.order_id = o_nl.id
          LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
          LEFT JOIN service_price sp_nl ON osc_nl.service_price_id = sp_nl.id
          LEFT JOIN service s_nl ON osc_nl.service_id = s_nl.id
          LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
          WHERE o_nl.order_state = 'Completed'
            AND osc_nl.total_price > 0
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) >= ? 
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) <= ?
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
          LEFT JOIN service s_nl ON os_nl.service_id = s_nl.id
          LEFT JOIN service_language sl_nl ON os_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
          WHERE o_nl.order_state = 'Completed'
            AND os_nl.total_price > 0
            AND (os_nl.user_service_type = 'combo' OR s_nl.service_group = 'combo')
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) >= ? 
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) <= ?
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
        ) t`,
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
