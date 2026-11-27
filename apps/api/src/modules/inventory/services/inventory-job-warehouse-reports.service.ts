import type { RowDataPacket } from 'mysql2/promise';
import {
  computeInventoryForecastQuantity,
  INVENTORY_ITEM_AVAILABLE_STATES,
  INVENTORY_ITEM_TYPES,
  INVENTORY_ITEM_UNAVAILABLE_STATES,
  type InventoryItemType,
  type InventoryJobRunRequest,
  type InventoryJobRunResultDto,
} from '@mos-lab/shared';
import { executeInventory, queryInventory } from './inventory-db.js';
import { chunkArray, formatYmd, getMonthBounds, shiftMonthStart } from './inventory-job-reports.service.js';

const WAREHOUSE_REPORT_METRIC_KEYS = [
  'total_quantity_start',
  'total_quantity_input',
  'total_quantity_input_main',
  'total_quantity_input_other',
  'total_quantity_input_supplier',
  'total_quantity_new',
  'total_quantity_using',
  'total_quantity_used',
  'total_quantity_lost',
  'total_quantity_broken',
  'total_quantity_output',
  'total_quantity_output_main',
  'total_quantity_output_other',
  'total_quantity_output_supplier',
  'total_quantity_output_return',
  'total_quantity_output_destroy',
  'total_quantity_end',
  'total_retail_price_start',
  'total_retail_price_input',
  'total_retail_price_input_main',
  'total_retail_price_input_other',
  'total_retail_price_input_supplier',
  'total_retail_price_new',
  'total_retail_price_using',
  'total_retail_price_used',
  'total_retail_price_lost',
  'total_retail_price_broken',
  'total_retail_price_output',
  'total_retail_price_output_main',
  'total_retail_price_output_other',
  'total_retail_price_output_supplier',
  'total_retail_price_output_return',
  'total_retail_price_output_destroy',
  'total_retail_price_end',
] as const;

type ReportMetricKey = (typeof WAREHOUSE_REPORT_METRIC_KEYS)[number];
type WarehouseMetricRecord = Record<ReportMetricKey, number>;

function emptyWarehouseMetrics(): WarehouseMetricRecord {
  const rec = {} as WarehouseMetricRecord;
  for (const k of WAREHOUSE_REPORT_METRIC_KEYS) rec[k] = 0;
  return rec;
}

export async function runReportWarehouseJob(req: InventoryJobRunRequest): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const targetDate = req.date || formatYmd(startedAt);
  const { dateFrom, dateTo } = getMonthBounds(targetDate);
  const prevMonthStart = shiftMonthStart(dateFrom, -1);
  const { dateFrom: lastDateFrom, dateTo: lastDateTo } = getMonthBounds(prevMonthStart);
  const dryRun = Boolean(req.dryRun);

  const whConds = ['client_store_id IS NOT NULL', 'is_disabled = 0'];
  const whArgs: unknown[] = [];
  if (req.warehouseId) {
    whConds.push('id = ?');
    whArgs.push(req.warehouseId);
  }
  const warehouses = await queryInventory<
    Array<RowDataPacket & { id: number; client_id: number; client_business_id: number }>
  >(
    `SELECT id, client_id, client_business_id FROM inventory_warehouse WHERE ${whConds.join(' AND ')} ORDER BY id ASC`,
    whArgs
  );

  let toInsertCount = 0;
  let toUpdateCount = 0;
  let totalQuantityEnd = 0;

  if (warehouses.length > 0) {
    const whIds = warehouses.map((w) => Number(w.id));
    const whPh = whIds.map(() => '?').join(',');
    const availPh = INVENTORY_ITEM_AVAILABLE_STATES.map(() => '?').join(',');
    const unavailPh = INVENTORY_ITEM_UNAVAILABLE_STATES.map(() => '?').join(',');
    const dtFromStart = `${dateFrom} 00:00:00`;
    const dtToEnd = `${dateTo} 23:59:59`;

    const [startRows, newRows, inputRows, outputRows, stateRows, endRows, existingRows] = await Promise.all([
      queryInventory<
        Array<RowDataPacket & { wh_id: number; item_type: InventoryItemType; cnt: number; retail: number }>
      >(
        `SELECT riwis.inventory_warehouse_id AS wh_id, ii.inventory_item_type AS item_type,
                COUNT(DISTINCT iwi.id) AS cnt, COALESCE(SUM(iwi.retail_price), 0) AS retail
         FROM report_inventory_warehouse_item_state riwis
         INNER JOIN inventory_warehouse_item iwi ON iwi.id = riwis.inventory_warehouse_item_id
         INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
         WHERE riwis.date BETWEEN ? AND ? AND riwis.item_state IN (${availPh})
           AND riwis.inventory_warehouse_id IN (${whPh})
         GROUP BY riwis.inventory_warehouse_id, ii.inventory_item_type`,
        [lastDateFrom, lastDateTo, ...INVENTORY_ITEM_AVAILABLE_STATES, ...whIds]
      ),
      queryInventory<
        Array<RowDataPacket & { wh_id: number; item_type: InventoryItemType; cnt: number; retail: number }>
      >(
        `SELECT iwi.inventory_warehouse_id AS wh_id, ii.inventory_item_type AS item_type,
                COUNT(*) AS cnt, COALESCE(SUM(iwi.retail_price), 0) AS retail
         FROM inventory_warehouse_item iwi
         INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
         WHERE iwi.inventory_warehouse_id IN (${whPh}) AND iwi.item_state = 'New'
           AND iwi.date_created BETWEEN ? AND ?
         GROUP BY iwi.inventory_warehouse_id, ii.inventory_item_type`,
        [...whIds, dtFromStart, dtToEnd]
      ),
      queryInventory<
        Array<
          RowDataPacket & {
            wh_id: number;
            item_type: InventoryItemType;
            cnt_main: number;
            cnt_other: number;
            cnt_supplier: number;
            retail_main: number;
            retail_other: number;
            retail_supplier: number;
          }
        >
      >(
        `SELECT iwoi.to_inventory_warehouse_id AS wh_id, ii.inventory_item_type AS item_type,
                SUM(IF(fw.inventory_warehouse_type = 'Main', 1, 0)) AS cnt_main,
                SUM(IF(fw.inventory_warehouse_type = 'Other', 1, 0)) AS cnt_other,
                SUM(IF(fw.inventory_warehouse_type = 'Supplier', 1, 0)) AS cnt_supplier,
                COALESCE(SUM(IF(fw.inventory_warehouse_type = 'Main', iwoi.retail_price, 0)), 0) AS retail_main,
                COALESCE(SUM(IF(fw.inventory_warehouse_type = 'Other', iwoi.retail_price, 0)), 0) AS retail_other,
                COALESCE(SUM(IF(fw.inventory_warehouse_type = 'Supplier', iwoi.retail_price, 0)), 0) AS retail_supplier
         FROM inventory_warehouse_order_item iwoi
         INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
         INNER JOIN inventory_warehouse fw ON fw.id = iwoi.from_inventory_warehouse_id
         WHERE iwoi.to_inventory_warehouse_id IN (${whPh}) AND iwoi.date_imported BETWEEN ? AND ?
         GROUP BY iwoi.to_inventory_warehouse_id, ii.inventory_item_type`,
        [...whIds, dtFromStart, dtToEnd]
      ),
      queryInventory<
        Array<
          RowDataPacket & {
            wh_id: number;
            item_type: InventoryItemType;
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
        >
      >(
        `SELECT iwoi.from_inventory_warehouse_id AS wh_id, ii.inventory_item_type AS item_type,
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
         INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
         INNER JOIN inventory_warehouse tw ON tw.id = iwoi.to_inventory_warehouse_id
         INNER JOIN inventory_warehouse_item fi ON fi.id = iwoi.from_inventory_warehouse_item_id
         WHERE iwoi.from_inventory_warehouse_id IN (${whPh}) AND iwoi.date_imported BETWEEN ? AND ?
         GROUP BY iwoi.from_inventory_warehouse_id, ii.inventory_item_type`,
        [...whIds, dtFromStart, dtToEnd]
      ),
      queryInventory<
        Array<
          RowDataPacket & {
            wh_id: number;
            item_type: InventoryItemType;
            cnt_using: number;
            cnt_used: number;
            cnt_lost: number;
            cnt_broken: number;
            retail_using: number;
            retail_used: number;
            retail_lost: number;
            retail_broken: number;
          }
        >
      >(
        `SELECT iwi.inventory_warehouse_id AS wh_id, ii.inventory_item_type AS item_type,
                SUM(IF(iwi.item_state IN ('Testing', 'Using'), 1, 0)) AS cnt_using,
                SUM(IF(iwi.item_state = 'Used', 1, 0)) AS cnt_used,
                SUM(IF(iwi.item_state IN ('Lost', 'Lost-Temporary'), 1, 0)) AS cnt_lost,
                SUM(IF(iwi.item_state = 'Broken', 1, 0)) AS cnt_broken,
                COALESCE(SUM(IF(iwi.item_state IN ('Testing', 'Using'), iwi.retail_price, 0)), 0) AS retail_using,
                COALESCE(SUM(IF(iwi.item_state = 'Used', iwi.retail_price, 0)), 0) AS retail_used,
                COALESCE(SUM(IF(iwi.item_state IN ('Lost', 'Lost-Temporary'), iwi.retail_price, 0)), 0) AS retail_lost,
                COALESCE(SUM(IF(iwi.item_state = 'Broken', iwi.retail_price, 0)), 0) AS retail_broken
         FROM inventory_warehouse_item iwi
         INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
         WHERE iwi.inventory_warehouse_id IN (${whPh}) AND iwi.date_updated BETWEEN ? AND ?
         GROUP BY iwi.inventory_warehouse_id, ii.inventory_item_type`,
        [...whIds, dtFromStart, dtToEnd]
      ),
      queryInventory<
        Array<RowDataPacket & { wh_id: number; item_type: InventoryItemType; cnt: number; retail: number }>
      >(
        `SELECT riwis.inventory_warehouse_id AS wh_id, ii.inventory_item_type AS item_type,
                COUNT(iwi.id) AS cnt, COALESCE(SUM(iwi.retail_price), 0) AS retail
         FROM inventory_warehouse_item iwi
         INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
         INNER JOIN report_inventory_warehouse_item_state riwis
           ON riwis.inventory_warehouse_item_id = iwi.id AND riwis.date BETWEEN ? AND ?
         WHERE NOT (iwi.item_state IN (${unavailPh}) AND DATE(iwi.date_updated) <= ?)
           AND riwis.item_state IN (${availPh}) AND riwis.inventory_warehouse_id IN (${whPh})
         GROUP BY riwis.inventory_warehouse_id, ii.inventory_item_type`,
        [dateFrom, dateTo, ...INVENTORY_ITEM_UNAVAILABLE_STATES, dateTo, ...INVENTORY_ITEM_AVAILABLE_STATES, ...whIds]
      ),
      queryInventory<
        Array<RowDataPacket & { id: number; inventory_warehouse_id: number; inventory_item_type: InventoryItemType }>
      >(
        `SELECT id, inventory_warehouse_id, inventory_item_type FROM report_inventory_warehouse WHERE inventory_warehouse_id IN (${whPh}) AND date = ?`,
        [...whIds, dateTo]
      ),
    ]);

    const grid = new Map<string, WarehouseMetricRecord>();
    const ensure = (whId: number, itemType: string) => {
      const k = `${whId}:${itemType}`;
      let rec = grid.get(k);
      if (!rec) {
        rec = emptyWarehouseMetrics();
        grid.set(k, rec);
      }
      return rec;
    };

    for (const r of startRows) {
      const m = ensure(Number(r.wh_id), r.item_type);
      m.total_quantity_start = Number(r.cnt || 0);
      m.total_retail_price_start = Number(r.retail || 0);
    }
    for (const r of newRows) {
      const m = ensure(Number(r.wh_id), r.item_type);
      m.total_quantity_new = Number(r.cnt || 0);
      m.total_retail_price_new = Number(r.retail || 0);
    }
    for (const r of inputRows) {
      const m = ensure(Number(r.wh_id), r.item_type);
      m.total_quantity_input_main = Number(r.cnt_main || 0);
      m.total_quantity_input_other = Number(r.cnt_other || 0);
      m.total_quantity_input_supplier = Number(r.cnt_supplier || 0);
      m.total_quantity_input =
        m.total_quantity_input_main + m.total_quantity_input_other + m.total_quantity_input_supplier;
      m.total_retail_price_input_main = Number(r.retail_main || 0);
      m.total_retail_price_input_other = Number(r.retail_other || 0);
      m.total_retail_price_input_supplier = Number(r.retail_supplier || 0);
      m.total_retail_price_input =
        m.total_retail_price_input_main + m.total_retail_price_input_other + m.total_retail_price_input_supplier;
    }
    for (const r of outputRows) {
      const m = ensure(Number(r.wh_id), r.item_type);
      m.total_quantity_output_main = Number(r.cnt_main || 0);
      m.total_quantity_output_other = Number(r.cnt_other || 0);
      m.total_quantity_output_supplier = Number(r.cnt_supplier || 0);
      m.total_quantity_output_return = Number(r.cnt_return || 0);
      m.total_quantity_output_destroy = Number(r.cnt_destroy || 0);
      m.total_quantity_output =
        m.total_quantity_output_main +
        m.total_quantity_output_other +
        m.total_quantity_output_supplier +
        m.total_quantity_output_return +
        m.total_quantity_output_destroy;
      m.total_retail_price_output_main = Number(r.retail_main || 0);
      m.total_retail_price_output_other = Number(r.retail_other || 0);
      m.total_retail_price_output_supplier = Number(r.retail_supplier || 0);
      m.total_retail_price_output_return = Number(r.retail_return || 0);
      m.total_retail_price_output_destroy = Number(r.retail_destroy || 0);
      m.total_retail_price_output =
        m.total_retail_price_output_main +
        m.total_retail_price_output_other +
        m.total_retail_price_output_supplier +
        m.total_retail_price_output_return +
        m.total_retail_price_output_destroy;
    }
    for (const r of stateRows) {
      const m = ensure(Number(r.wh_id), r.item_type);
      m.total_quantity_using = Number(r.cnt_using || 0);
      m.total_quantity_used = Number(r.cnt_used || 0);
      m.total_quantity_lost = Number(r.cnt_lost || 0);
      m.total_quantity_broken = Number(r.cnt_broken || 0);
      m.total_retail_price_using = Number(r.retail_using || 0);
      m.total_retail_price_used = Number(r.retail_used || 0);
      m.total_retail_price_lost = Number(r.retail_lost || 0);
      m.total_retail_price_broken = Number(r.retail_broken || 0);
    }
    for (const r of endRows) {
      const m = ensure(Number(r.wh_id), r.item_type);
      m.total_quantity_end = Number(r.cnt || 0);
      m.total_retail_price_end = Number(r.retail || 0);
    }

    const existingMap = new Map(
      existingRows.map((e) => [`${e.inventory_warehouse_id}:${e.inventory_item_type}`, Number(e.id)])
    );
    const toInsert: Array<unknown[]> = [];
    const toUpdate: Array<{ id: number; args: unknown[] }> = [];

    for (const wh of warehouses) {
      for (const itemType of INVENTORY_ITEM_TYPES) {
        const m = grid.get(`${wh.id}:${itemType}`) || emptyWarehouseMetrics();
        totalQuantityEnd += m.total_quantity_end;
        const metricValues = WAREHOUSE_REPORT_METRIC_KEYS.map((k) => m[k]);
        const exId = existingMap.get(`${wh.id}:${itemType}`);
        if (exId) {
          toUpdate.push({ id: exId, args: [...metricValues, exId] });
        } else {
          toInsert.push([
            Number(wh.client_id),
            Number(wh.client_business_id),
            Number(wh.id),
            itemType,
            ...metricValues,
            dateTo,
          ]);
        }
      }
    }

    toInsertCount = toInsert.length;
    toUpdateCount = toUpdate.length;

    if (!dryRun) {
      const colsSql = WAREHOUSE_REPORT_METRIC_KEYS.join(', ');
      const placeholders = WAREHOUSE_REPORT_METRIC_KEYS.map(() => '?').join(', ');
      for (const insBatch of chunkArray(toInsert, 200)) {
        await executeInventory(
          `INSERT INTO report_inventory_warehouse
             (client_id, client_business_id, inventory_warehouse_id, inventory_item_type, ${colsSql}, date, date_updated, date_created)
           VALUES ${insBatch.map(() => `(?, ?, ?, ?, ${placeholders}, ?, NOW(), NOW())`).join(',')}`,
          insBatch.flat()
        );
      }
      const setSql = `${WAREHOUSE_REPORT_METRIC_KEYS.map((k) => `${k} = ?`).join(', ')}, date_updated = NOW()`;
      for (const updBatch of chunkArray(toUpdate, 100)) {
        await Promise.all(
          updBatch.map((u) => executeInventory(`UPDATE report_inventory_warehouse SET ${setSql} WHERE id = ?`, u.args))
        );
      }
    }
  }

  const finishedAt = new Date();
  const rowsEvaluated = warehouses.length * INVENTORY_ITEM_TYPES.length;
  return {
    jobKey: 'report-warehouse',
    legacyScript: 'generate-report-inventory-warehouse.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate: dateTo,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}${warehouses.length} kho chi nhánh (${rowsEvaluated} dòng): +${toInsertCount} mới, ~${toUpdateCount} cập nhật, tồn cuối ${totalQuantityEnd.toLocaleString('vi-VN')}.`,
    metrics: {
      warehousesProcessed: warehouses.length,
      rowsEvaluated,
      toInsert: toInsertCount,
      toUpdate: toUpdateCount,
      totalQuantityEnd,
    },
  };
}

export async function runReportItemForecastJob(req: InventoryJobRunRequest): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const targetDate = req.date || formatYmd(startedAt);
  const baseMonthStart = `${targetDate.slice(0, 7)}-01`;
  const dryRun = Boolean(req.dryRun);

  const whConds = ['is_disabled = 0'];
  const whArgs: unknown[] = [];
  if (req.warehouseId) {
    whConds.push('id = ?');
    whArgs.push(req.warehouseId);
  }
  const warehouses = await queryInventory<
    Array<RowDataPacket & { id: number; client_id: number; client_business_id: number }>
  >(
    `SELECT id, client_id, client_business_id FROM inventory_warehouse WHERE ${whConds.join(' AND ')} ORDER BY id ASC`,
    whArgs
  );

  let pairsEvaluated = 0;
  let toInsertCount = 0;
  let toUpdateCount = 0;
  let nonZeroForecasts = 0;

  if (warehouses.length > 0) {
    const whIds = warehouses.map((w) => Number(w.id));
    const whPh = whIds.map(() => '?').join(',');
    const availPh = INVENTORY_ITEM_AVAILABLE_STATES.map(() => '?').join(',');
    const unavailPh = INVENTORY_ITEM_UNAVAILABLE_STATES.map(() => '?').join(',');
    const lastPrevMonthStart = shiftMonthStart(baseMonthStart, -1);
    const { dateTo: windowEnd } = getMonthBounds(lastPrevMonthStart);

    interface ForecastBucket {
      clientId: number;
      bizId: number;
      whId: number;
      itemId: number;
      months: [number, number, number, number, number, number];
    }
    const buckets = new Map<string, ForecastBucket>();
    const itemFilter = req.inventoryItemId ? ' AND inventory_item_id = ?' : '';
    const itemArgs = req.inventoryItemId ? [req.inventoryItemId] : [];

    for (let month = 6; month >= 1; month -= 1) {
      const mStart = shiftMonthStart(baseMonthStart, -month);
      const { dateFrom, dateTo: endDateTo } = getMonthBounds(mStart);

      const [usedRows, endRows] = await Promise.all([
        queryInventory<
          Array<
            RowDataPacket & {
              wh_id: number;
              item_id: number;
              client_id: number;
              client_business_id: number;
              cnt_using: number;
              cnt_used: number;
              cnt_lost: number;
              cnt_broken: number;
            }
          >
        >(
          `SELECT inventory_warehouse_id AS wh_id, inventory_item_id AS item_id,
                  MIN(client_id) AS client_id, MIN(client_business_id) AS client_business_id,
                  SUM(IF(item_state = 'Using', 1, 0)) AS cnt_using,
                  SUM(IF(item_state = 'Used', 1, 0)) AS cnt_used,
                  SUM(IF(item_state IN ('Lost', 'Lost-Temporary'), 1, 0)) AS cnt_lost,
                  SUM(IF(item_state = 'Broken', 1, 0)) AS cnt_broken
           FROM inventory_warehouse_item
           WHERE inventory_warehouse_id IN (${whPh})${itemFilter} AND DATE(date_updated) BETWEEN ? AND ?
           GROUP BY inventory_warehouse_id, inventory_item_id`,
          [...whIds, ...itemArgs, dateFrom, windowEnd]
        ),
        queryInventory<Array<RowDataPacket & { wh_id: number; item_id: number; total_qty: number }>>(
          `SELECT riwis.inventory_warehouse_id AS wh_id, riwis.inventory_item_id AS item_id, COUNT(iwi.id) AS total_qty
           FROM inventory_warehouse_item iwi
           INNER JOIN report_inventory_warehouse_item_state riwis
             ON riwis.inventory_warehouse_item_id = iwi.id AND riwis.date BETWEEN ? AND ?
           WHERE NOT (iwi.item_state IN (${unavailPh}) AND iwi.date_updated <= ?)
             AND riwis.item_state IN (${availPh}) AND riwis.inventory_warehouse_id IN (${whPh})
           GROUP BY riwis.inventory_warehouse_id, riwis.inventory_item_id`,
          [
            dateFrom,
            endDateTo,
            ...INVENTORY_ITEM_UNAVAILABLE_STATES,
            `${endDateTo} 23:59:59`,
            ...INVENTORY_ITEM_AVAILABLE_STATES,
            ...whIds,
          ]
        ),
      ]);

      const endMap = new Map(endRows.map((e) => [`${e.wh_id}:${e.item_id}`, Number(e.total_qty || 0)]));
      for (const row of usedRows) {
        const key = `${row.wh_id}:${row.item_id}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            clientId: Number(row.client_id),
            bizId: Number(row.client_business_id),
            whId: Number(row.wh_id),
            itemId: Number(row.item_id),
            months: [0, 0, 0, 0, 0, 0],
          };
          buckets.set(key, bucket);
        }
        const usedQty =
          Number(row.cnt_broken || 0) +
          Number(row.cnt_lost || 0) +
          Number(row.cnt_used || 0) +
          Number(row.cnt_using || 0) / 2;
        const endQty = endMap.get(key) ?? 0;
        bucket.months[month - 1] += computeInventoryForecastQuantity(usedQty, endQty);
      }
    }

    const existingRows = await queryInventory<
      Array<
        RowDataPacket & {
          id: number;
          client_business_id: number;
          inventory_warehouse_id: number;
          inventory_item_id: number;
        }
      >
    >(
      `SELECT id, client_business_id, inventory_warehouse_id, inventory_item_id
       FROM report_inventory_item_forecast WHERE inventory_warehouse_id IN (${whPh})`,
      whIds
    );
    const existingMap = new Map(
      existingRows.map((e) => [
        `${e.client_business_id}:${e.inventory_warehouse_id}:${e.inventory_item_id}`,
        Number(e.id),
      ])
    );

    const toInsert: Array<unknown[]> = [];
    const toUpdate: Array<{ id: number; months: number[] }> = [];
    for (const b of buckets.values()) {
      const ceiled = b.months.map((v) => Math.ceil(v));
      if (ceiled.some((v) => v > 0)) nonZeroForecasts += 1;
      const exId = existingMap.get(`${b.bizId}:${b.whId}:${b.itemId}`);
      if (exId) {
        toUpdate.push({ id: exId, months: ceiled });
      } else {
        toInsert.push([b.clientId, b.bizId, b.whId, b.itemId, ...ceiled]);
      }
    }

    pairsEvaluated = buckets.size;
    toInsertCount = toInsert.length;
    toUpdateCount = toUpdate.length;

    if (!dryRun) {
      for (const insBatch of chunkArray(toInsert, 500)) {
        await executeInventory(
          `INSERT INTO report_inventory_item_forecast
             (client_id, client_business_id, inventory_warehouse_id, inventory_item_id, forecast_month_1, forecast_month_2, forecast_month_3, forecast_month_4, forecast_month_5, forecast_month_6, date_updated, date_created)
           VALUES ${insBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',')}`,
          insBatch.flat()
        );
      }
      for (const updBatch of chunkArray(toUpdate, 200)) {
        await Promise.all(
          updBatch.map((u) =>
            executeInventory(
              `UPDATE report_inventory_item_forecast SET forecast_month_1 = ?, forecast_month_2 = ?, forecast_month_3 = ?, forecast_month_4 = ?, forecast_month_5 = ?, forecast_month_6 = ?, date_updated = NOW() WHERE id = ?`,
              [...u.months, u.id]
            )
          )
        );
      }
    }
  }

  const finishedAt = new Date();
  return {
    jobKey: 'report-item-forecast',
    legacyScript: 'generate-report-inventory-item-forecast.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}${warehouses.length} kho, ${pairsEvaluated} SKU (${nonZeroForecasts} có dự báo > 0): +${toInsertCount} mới, ~${toUpdateCount} cập nhật.`,
    metrics: {
      warehousesProcessed: warehouses.length,
      pairsEvaluated,
      toInsert: toInsertCount,
      toUpdate: toUpdateCount,
      nonZeroForecasts,
    },
  };
}
