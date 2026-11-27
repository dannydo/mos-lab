import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_ITEM_AVAILABLE_STATES,
  INVENTORY_ITEM_UNAVAILABLE_STATES,
  type InventoryItemType,
  type InventoryLifecycleCounters,
  type InventoryLifecycleResponse,
  type InventoryLifecycleRowDto,
  type InventoryWarehouseDto,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory } from './inventory-db.js';
import { mapWarehouseRow } from './inventory-query.service.js';

export { getWarehouseItemsDrilldown } from './inventory-lifecycle-drilldown.service.js';

interface PageItemRow extends RowDataPacket {
  inventory_item_id: number;
  inventory_warehouse_id: number;
  last_retail_price: number;
  item_name: string;
  item_code: string;
  item_type: InventoryItemType;
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
}

interface ForecastRow extends RowDataPacket {
  inventory_item_id: number;
  forecast_val: number;
}

interface StartEndAggRow extends RowDataPacket {
  inventory_item_id: number;
  cnt: number;
  retail: number;
}

interface InputAggRow extends RowDataPacket {
  inventory_item_id: number;
  cnt_main: number;
  cnt_other: number;
  cnt_supplier: number;
  retail_main: number;
  retail_other: number;
  retail_supplier: number;
}

interface OutputAggRow extends RowDataPacket {
  inventory_item_id: number;
  cnt_main: number;
  cnt_other: number;
  cnt_supplier: number;
  cnt_return: number;
  cnt_destroy: number;
  retail_main: number;
  retail_other: number;
  retail_supplier: number;
  retail_return: number;
  retail_destroy: number;
}

interface StateAggRow extends RowDataPacket {
  inventory_item_id: number;
  cnt_using: number;
  cnt_used: number;
  cnt_lost: number;
  cnt_broken: number;
  retail_using: number;
  retail_used: number;
  retail_lost: number;
  retail_broken: number;
}

function emptyCounters(includePrice: boolean): InventoryLifecycleCounters {
  const base: InventoryLifecycleCounters = {
    total_quantity_start: 0,
    total_quantity_input: 0,
    total_quantity_input_main: 0,
    total_quantity_input_other: 0,
    total_quantity_input_supplier: 0,
    total_quantity_new: 0,
    total_quantity_using: 0,
    total_quantity_used: 0,
    total_quantity_lost: 0,
    total_quantity_broken: 0,
    total_quantity_output: 0,
    total_quantity_output_main: 0,
    total_quantity_output_other: 0,
    total_quantity_output_supplier: 0,
    total_quantity_output_return: 0,
    total_quantity_output_destroy: 0,
    total_quantity_end: 0,
  };
  if (includePrice) {
    Object.assign(base, {
      total_retail_price_start: 0,
      total_retail_price_input: 0,
      total_retail_price_input_main: 0,
      total_retail_price_input_other: 0,
      total_retail_price_input_supplier: 0,
      total_retail_price_new: 0,
      total_retail_price_using: 0,
      total_retail_price_used: 0,
      total_retail_price_lost: 0,
      total_retail_price_broken: 0,
      total_retail_price_output: 0,
      total_retail_price_output_main: 0,
      total_retail_price_output_other: 0,
      total_retail_price_output_supplier: 0,
      total_retail_price_output_return: 0,
      total_retail_price_output_destroy: 0,
      total_retail_price_end: 0,
    });
  }
  return base;
}

export function prevMonthBounds(dateFrom: string): { lastStart: string; lastEnd: string } {
  const d = new Date(`${dateFrom}T00:00:00`);
  const firstPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const lastPrev = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { lastStart: fmt(firstPrev), lastEnd: fmt(lastPrev) };
}

export async function getWarehouseItemLifecycle(
  ctx: InventoryAuthContext,
  params: {
    inventoryItemType?: InventoryItemType;
    warehouseIds?: number[];
    dateFrom: string;
    dateTo: string;
    forecastMonth?: number;
    keyword?: string;
    page?: number;
    limit?: number;
  }
): Promise<InventoryLifecycleResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;
  const includePrice = hasInventoryPermission(ctx, 'view-price');
  const forecastCol = Math.min(6, Math.max(1, Number(params.forecastMonth || 1)));

  let scopedWarehouseIds = params.warehouseIds && params.warehouseIds.length > 0 ? params.warehouseIds : null;
  if (!scopedWarehouseIds && !hasInventoryPermission(ctx, 'edit-order-global')) {
    if (ctx.allowedStoreIds.length === 0) {
      return { success: true, data: [], summary: emptyCounters(includePrice), page: { total: 0, page, limit } };
    }
    const storeWhs = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse WHERE client_store_id IN (${ctx.allowedStoreIds.map(() => '?').join(',')})`,
      ctx.allowedStoreIds
    );
    scopedWarehouseIds = storeWhs.map((w) => Number(w.id));
    if (scopedWarehouseIds.length === 0) {
      return { success: true, data: [], summary: emptyCounters(includePrice), page: { total: 0, page, limit } };
    }
  }

  const baseConds: string[] = ['riwi.date BETWEEN ? AND ?'];
  const baseArgs: unknown[] = [params.dateFrom, params.dateTo];
  if (scopedWarehouseIds) {
    baseConds.push(`riwi.inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`);
    baseArgs.push(...scopedWarehouseIds);
  }
  if (params.inventoryItemType) {
    baseConds.push('ii.inventory_item_type = ?');
    baseArgs.push(params.inventoryItemType);
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    baseConds.push(
      `(ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR EXISTS (
         SELECT 1 FROM inventory_warehouse_item kw_iwi
         WHERE kw_iwi.inventory_item_id = riwi.inventory_item_id
           AND kw_iwi.first_inventory_warehouse_order_item_id = ?
       ))`
    );
    baseArgs.push(`%${kw}%`, `%${kw}%`, kw);
  }

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(DISTINCT riwi.inventory_item_id) AS cnt
     FROM report_inventory_warehouse_item riwi
     INNER JOIN inventory_item ii ON ii.id = riwi.inventory_item_id
     WHERE ${baseConds.join(' AND ')}`,
    baseArgs
  );
  const total = Number(countRows[0]?.cnt || 0);

  const pageRows =
    total === 0
      ? []
      : await queryInventory<PageItemRow[]>(
          `SELECT riwi.inventory_item_id,
                  MIN(riwi.inventory_warehouse_id) AS inventory_warehouse_id,
                  MAX(riwi.last_retail_price) AS last_retail_price,
                  ii.inventory_item_name AS item_name,
                  ii.inventory_item_code AS item_code,
                  ii.inventory_item_type AS item_type,
                  ii.inventory_item_unit AS item_unit,
                  ii.inventory_item_attribute AS item_attribute,
                  ii.inventory_item_brand_id AS item_brand_id,
                  iib.inventory_item_brand AS item_brand
           FROM report_inventory_warehouse_item riwi
           INNER JOIN inventory_item ii ON ii.id = riwi.inventory_item_id
           LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
           WHERE ${baseConds.join(' AND ')}
           GROUP BY riwi.inventory_item_id
           ORDER BY ii.inventory_item_name ASC, ii.inventory_item_attribute ASC
           LIMIT ? OFFSET ?`,
          [...baseArgs, limit, offset]
        );

  const itemIds = pageRows.map((r) => Number(r.inventory_item_id));
  const whIdsToHydrate = [...new Set(pageRows.map((r) => Number(r.inventory_warehouse_id)))];

  // Overall Summary from report_inventory_warehouse
  const sumConds: string[] = ['date BETWEEN ? AND ?'];
  const sumArgs: unknown[] = [params.dateFrom, params.dateTo];
  if (scopedWarehouseIds) {
    sumConds.push(`inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`);
    sumArgs.push(...scopedWarehouseIds);
  }
  if (params.inventoryItemType) {
    sumConds.push('inventory_item_type = ?');
    sumArgs.push(params.inventoryItemType);
  }
  const sumRows = await queryInventory<Array<RowDataPacket & Record<string, number>>>(
    `SELECT
       COALESCE(SUM(total_quantity_start), 0) AS total_quantity_start,
       COALESCE(SUM(total_quantity_input), 0) AS total_quantity_input,
       COALESCE(SUM(total_quantity_input_main), 0) AS total_quantity_input_main,
       COALESCE(SUM(total_quantity_input_other), 0) AS total_quantity_input_other,
       COALESCE(SUM(total_quantity_input_supplier), 0) AS total_quantity_input_supplier,
       COALESCE(SUM(total_quantity_new), 0) AS total_quantity_new,
       COALESCE(SUM(total_quantity_using), 0) AS total_quantity_using,
       COALESCE(SUM(total_quantity_used), 0) AS total_quantity_used,
       COALESCE(SUM(total_quantity_lost), 0) AS total_quantity_lost,
       COALESCE(SUM(total_quantity_broken), 0) AS total_quantity_broken,
       COALESCE(SUM(total_quantity_output), 0) AS total_quantity_output,
       COALESCE(SUM(total_quantity_output_main), 0) AS total_quantity_output_main,
       COALESCE(SUM(total_quantity_output_other), 0) AS total_quantity_output_other,
       COALESCE(SUM(total_quantity_output_supplier), 0) AS total_quantity_output_supplier,
       COALESCE(SUM(total_quantity_output_return), 0) AS total_quantity_output_return,
       COALESCE(SUM(total_quantity_output_destroy), 0) AS total_quantity_output_destroy,
       COALESCE(SUM(total_quantity_end), 0) AS total_quantity_end,
       COALESCE(SUM(total_retail_price_start), 0) AS total_retail_price_start,
       COALESCE(SUM(total_retail_price_input), 0) AS total_retail_price_input,
       COALESCE(SUM(total_retail_price_new), 0) AS total_retail_price_new,
       COALESCE(SUM(total_retail_price_using), 0) AS total_retail_price_using,
       COALESCE(SUM(total_retail_price_used), 0) AS total_retail_price_used,
       COALESCE(SUM(total_retail_price_lost), 0) AS total_retail_price_lost,
       COALESCE(SUM(total_retail_price_broken), 0) AS total_retail_price_broken,
       COALESCE(SUM(total_retail_price_output), 0) AS total_retail_price_output,
       COALESCE(SUM(total_retail_price_end), 0) AS total_retail_price_end
     FROM report_inventory_warehouse
     WHERE ${sumConds.join(' AND ')}`,
    sumArgs
  );
  const sRow = sumRows[0] || {};
  const summary = emptyCounters(includePrice);
  for (const key of Object.keys(summary) as Array<keyof InventoryLifecycleCounters>) {
    summary[key] = Math.round(Number(sRow[key] || 0));
  }

  if (itemIds.length === 0) {
    return { success: true, data: [], summary, page: { total, page, limit } };
  }

  const itemIn = itemIds.map(() => '?').join(',');
  const availSql = INVENTORY_ITEM_AVAILABLE_STATES.map(() => '?').join(',');
  const unavailSql = INVENTORY_ITEM_UNAVAILABLE_STATES.map(() => '?').join(',');
  const whFilter = (col: string) =>
    scopedWarehouseIds ? `AND ${col} IN (${scopedWarehouseIds.map(() => '?').join(',')})` : '';
  const whArgs = scopedWarehouseIds || [];
  const { lastStart, lastEnd } = prevMonthBounds(params.dateFrom);

  const [whRows, fcRows, startRows, newRows, inputRows, outputRows, stateRows, endRows] = await Promise.all([
    queryInventory<RowDataPacket[]>(
      `SELECT * FROM inventory_warehouse WHERE id IN (${whIdsToHydrate.map(() => '?').join(',')})`,
      whIdsToHydrate
    ),
    queryInventory<ForecastRow[]>(
      `SELECT inventory_item_id, COALESCE(SUM(forecast_month_${forecastCol}), 0) AS forecast_val
       FROM report_inventory_item_forecast
       WHERE client_business_id = ? ${whFilter('inventory_warehouse_id')}
         AND inventory_item_id IN (${itemIn})
       GROUP BY inventory_item_id`,
      [ctx.clientBusinessId, ...whArgs, ...itemIds]
    ),
    queryInventory<StartEndAggRow[]>(
      `SELECT s.inventory_item_id, COUNT(DISTINCT iwi.id) AS cnt, COALESCE(SUM(iwi.retail_price), 0) AS retail
       FROM (
         SELECT DISTINCT inventory_warehouse_item_id, inventory_item_id, inventory_warehouse_id
         FROM report_inventory_warehouse_item_state
         WHERE date BETWEEN ? AND ?
           AND item_state IN (${availSql})
           ${whFilter('inventory_warehouse_id')}
           AND inventory_item_id IN (${itemIn})
       ) s
       INNER JOIN inventory_warehouse_item iwi ON iwi.id = s.inventory_warehouse_item_id
       GROUP BY s.inventory_item_id`,
      [lastStart, lastEnd, ...INVENTORY_ITEM_AVAILABLE_STATES, ...whArgs, ...itemIds]
    ),
    queryInventory<StartEndAggRow[]>(
      `SELECT inventory_item_id, COUNT(*) AS cnt, COALESCE(SUM(retail_price), 0) AS retail
       FROM inventory_warehouse_item
       WHERE item_state = 'New' AND date_created BETWEEN ? AND ?
         ${whFilter('inventory_warehouse_id')}
         AND inventory_item_id IN (${itemIn})
       GROUP BY inventory_item_id`,
      [`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`, ...whArgs, ...itemIds]
    ),
    queryInventory<InputAggRow[]>(
      `SELECT iwoi.inventory_item_id,
              SUM(IF(fw.inventory_warehouse_type = 'Main', 1, 0)) AS cnt_main,
              SUM(IF(fw.inventory_warehouse_type = 'Other', 1, 0)) AS cnt_other,
              SUM(IF(fw.inventory_warehouse_type = 'Supplier', 1, 0)) AS cnt_supplier,
              COALESCE(SUM(IF(fw.inventory_warehouse_type = 'Main', iwoi.retail_price, 0)), 0) AS retail_main,
              COALESCE(SUM(IF(fw.inventory_warehouse_type = 'Other', iwoi.retail_price, 0)), 0) AS retail_other,
              COALESCE(SUM(IF(fw.inventory_warehouse_type = 'Supplier', iwoi.retail_price, 0)), 0) AS retail_supplier
       FROM inventory_warehouse_order_item iwoi
       LEFT JOIN inventory_warehouse fw ON fw.id = iwoi.from_inventory_warehouse_id
       WHERE iwoi.date_imported IS NOT NULL
         AND iwoi.date_imported BETWEEN ? AND ?
         ${whFilter('iwoi.to_inventory_warehouse_id')}
         AND iwoi.inventory_item_id IN (${itemIn})
       GROUP BY iwoi.inventory_item_id`,
      [`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`, ...whArgs, ...itemIds]
    ),
    queryInventory<OutputAggRow[]>(
      `SELECT iwoi.inventory_item_id,
              SUM(IF(tw.inventory_warehouse_type = 'Main', 1, 0)) AS cnt_main,
              SUM(IF(tw.inventory_warehouse_type = 'Other', 1, 0)) AS cnt_other,
              SUM(IF(tw.inventory_warehouse_type = 'Supplier', 1, 0)) AS cnt_supplier,
              SUM(IF(tw.inventory_warehouse_type = 'Return', 1, 0)) AS cnt_return,
              SUM(IF(tw.inventory_warehouse_type = 'Destroy', 1, 0)) AS cnt_destroy,
              COALESCE(SUM(IF(tw.inventory_warehouse_type = 'Main', iwoi.retail_price, 0)), 0) AS retail_main,
              COALESCE(SUM(IF(tw.inventory_warehouse_type = 'Other', iwoi.retail_price, 0)), 0) AS retail_other,
              COALESCE(SUM(IF(tw.inventory_warehouse_type = 'Supplier', iwoi.retail_price, 0)), 0) AS retail_supplier,
              COALESCE(SUM(IF(tw.inventory_warehouse_type = 'Return', iwoi.retail_price, 0)), 0) AS retail_return,
              COALESCE(SUM(IF(tw.inventory_warehouse_type = 'Destroy', iwoi.retail_price, 0)), 0) AS retail_destroy
       FROM inventory_warehouse_order_item iwoi
       LEFT JOIN inventory_warehouse tw ON tw.id = iwoi.to_inventory_warehouse_id
       INNER JOIN inventory_warehouse_item iwi ON iwi.id = iwoi.from_inventory_warehouse_item_id
       WHERE iwoi.date_imported IS NOT NULL
         AND iwoi.date_imported BETWEEN ? AND ?
         ${whFilter('iwoi.from_inventory_warehouse_id')}
         AND iwoi.inventory_item_id IN (${itemIn})
       GROUP BY iwoi.inventory_item_id`,
      [`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`, ...whArgs, ...itemIds]
    ),
    queryInventory<StateAggRow[]>(
      `SELECT inventory_item_id,
              SUM(IF(item_state IN ('Testing', 'Using'), 1, 0)) AS cnt_using,
              SUM(IF(item_state = 'Used', 1, 0)) AS cnt_used,
              SUM(IF(item_state IN ('Lost', 'Lost-Temporary'), 1, 0)) AS cnt_lost,
              SUM(IF(item_state = 'Broken', 1, 0)) AS cnt_broken,
              COALESCE(SUM(IF(item_state IN ('Testing', 'Using'), retail_price, 0)), 0) AS retail_using,
              COALESCE(SUM(IF(item_state = 'Used', retail_price, 0)), 0) AS retail_used,
              COALESCE(SUM(IF(item_state IN ('Lost', 'Lost-Temporary'), retail_price, 0)), 0) AS retail_lost,
              COALESCE(SUM(IF(item_state = 'Broken', retail_price, 0)), 0) AS retail_broken
       FROM inventory_warehouse_item
       WHERE date_updated BETWEEN ? AND ?
         ${whFilter('inventory_warehouse_id')}
         AND inventory_item_id IN (${itemIn})
       GROUP BY inventory_item_id`,
      [`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`, ...whArgs, ...itemIds]
    ),
    queryInventory<StartEndAggRow[]>(
      `SELECT s.inventory_item_id, COUNT(DISTINCT iwi.id) AS cnt, COALESCE(SUM(iwi.retail_price), 0) AS retail
       FROM report_inventory_warehouse_item_state s
       INNER JOIN inventory_warehouse_item iwi ON iwi.id = s.inventory_warehouse_item_id
       WHERE s.date BETWEEN ? AND ?
         AND s.item_state IN (${availSql})
         AND NOT (iwi.item_state IN (${unavailSql}) AND iwi.date_updated <= ?)
         ${whFilter('s.inventory_warehouse_id')}
         AND s.inventory_item_id IN (${itemIn})
       GROUP BY s.inventory_item_id`,
      [
        params.dateFrom,
        params.dateTo,
        ...INVENTORY_ITEM_AVAILABLE_STATES,
        ...INVENTORY_ITEM_UNAVAILABLE_STATES,
        `${params.dateTo} 23:59:59`,
        ...whArgs,
        ...itemIds,
      ]
    ),
  ]);

  const whMap = new Map(whRows.map((w) => [Number(w.id), mapWarehouseRow(w as never)]));
  const fcMap = new Map(fcRows.map((r) => [Number(r.inventory_item_id), Number(r.forecast_val || 0)]));
  const countersMap = new Map<number, InventoryLifecycleCounters>();
  for (const id of itemIds) countersMap.set(id, emptyCounters(includePrice));

  for (const r of startRows) {
    const c = countersMap.get(Number(r.inventory_item_id))!;
    c.total_quantity_start += Number(r.cnt || 0);
    if (includePrice)
      c.total_retail_price_start = Math.round((c.total_retail_price_start || 0) + Number(r.retail || 0));
  }
  for (const r of newRows) {
    const c = countersMap.get(Number(r.inventory_item_id))!;
    c.total_quantity_new += Number(r.cnt || 0);
    if (includePrice) c.total_retail_price_new = Math.round((c.total_retail_price_new || 0) + Number(r.retail || 0));
  }
  for (const r of inputRows) {
    const c = countersMap.get(Number(r.inventory_item_id))!;
    c.total_quantity_input_main += Number(r.cnt_main || 0);
    c.total_quantity_input_other += Number(r.cnt_other || 0);
    c.total_quantity_input_supplier += Number(r.cnt_supplier || 0);
    c.total_quantity_input += Number(r.cnt_main || 0) + Number(r.cnt_other || 0) + Number(r.cnt_supplier || 0);
    if (includePrice) {
      c.total_retail_price_input_main = Math.round(Number(r.retail_main || 0));
      c.total_retail_price_input_other = Math.round(Number(r.retail_other || 0));
      c.total_retail_price_input_supplier = Math.round(Number(r.retail_supplier || 0));
      c.total_retail_price_input = Math.round(
        Number(r.retail_main || 0) + Number(r.retail_other || 0) + Number(r.retail_supplier || 0)
      );
    }
  }
  for (const r of outputRows) {
    const c = countersMap.get(Number(r.inventory_item_id))!;
    c.total_quantity_output_main += Number(r.cnt_main || 0);
    c.total_quantity_output_other += Number(r.cnt_other || 0);
    c.total_quantity_output_supplier += Number(r.cnt_supplier || 0);
    c.total_quantity_output_return += Number(r.cnt_return || 0);
    c.total_quantity_output_destroy += Number(r.cnt_destroy || 0);
    c.total_quantity_output +=
      Number(r.cnt_main || 0) +
      Number(r.cnt_other || 0) +
      Number(r.cnt_supplier || 0) +
      Number(r.cnt_return || 0) +
      Number(r.cnt_destroy || 0);
    if (includePrice) {
      c.total_retail_price_output = Math.round(
        Number(r.retail_main || 0) +
          Number(r.retail_other || 0) +
          Number(r.retail_supplier || 0) +
          Number(r.retail_return || 0) +
          Number(r.retail_destroy || 0)
      );
    }
  }
  for (const r of stateRows) {
    const c = countersMap.get(Number(r.inventory_item_id))!;
    c.total_quantity_using += Number(r.cnt_using || 0);
    c.total_quantity_used += Number(r.cnt_used || 0);
    c.total_quantity_lost += Number(r.cnt_lost || 0);
    c.total_quantity_broken += Number(r.cnt_broken || 0);
    if (includePrice) {
      c.total_retail_price_using = Math.round(Number(r.retail_using || 0));
      c.total_retail_price_used = Math.round(Number(r.retail_used || 0));
      c.total_retail_price_lost = Math.round(Number(r.retail_lost || 0));
      c.total_retail_price_broken = Math.round(Number(r.retail_broken || 0));
    }
  }
  for (const r of endRows) {
    const c = countersMap.get(Number(r.inventory_item_id))!;
    c.total_quantity_end += Number(r.cnt || 0);
    if (includePrice) c.total_retail_price_end = Math.round((c.total_retail_price_end || 0) + Number(r.retail || 0));
  }

  const fallbackWh: InventoryWarehouseDto = {
    inventory_warehouse_id: 0,
    parent_inventory_warehouse_id: null,
    client_store_id: null,
    inventory_warehouse_name: 'Tất cả kho',
    inventory_warehouse_phone_number: null,
    inventory_warehouse_address: null,
    inventory_warehouse_type: 'Other',
    is_check_needed: false,
    is_disabled: false,
    date_created: '',
  };

  const data: InventoryLifecycleRowDto[] = pageRows.map((row) => {
    const itemId = Number(row.inventory_item_id);
    const counters = countersMap.get(itemId)!;
    const dto: InventoryLifecycleRowDto = {
      ...counters,
      inventory_warehouse_id: Number(row.inventory_warehouse_id),
      inventory_item_id: itemId,
      forecast_month: Number(fcMap.get(itemId) || 0),
      warehouse: whMap.get(Number(row.inventory_warehouse_id)) || fallbackWh,
      item: {
        inventory_item_id: itemId,
        inventory_item_name: row.item_name,
        inventory_item_code: row.item_code,
        inventory_item_type: row.item_type,
        inventory_item_unit: row.item_unit,
        inventory_item_attribute: row.item_attribute,
        inventory_item_brand_id: Number(row.item_brand_id),
        inventory_item_brand: row.item_brand || '',
      },
    };
    if (includePrice) {
      dto.last_retail_price = Math.round(Number(row.last_retail_price || 0));
    }
    return dto;
  });

  return { success: true, data, summary, page: { total, page, limit } };
}
