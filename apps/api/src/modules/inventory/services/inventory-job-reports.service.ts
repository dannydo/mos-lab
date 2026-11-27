import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_ITEM_PERMANENT_UNAVAILABLE_STATES,
  INVENTORY_ITEM_UNAVAILABLE_STATES,
  type InventoryJobRunRequest,
  type InventoryJobRunResultDto,
} from '@mos-lab/shared';
import { executeInventory, queryInventory } from './inventory-db.js';

export { runReportItemForecastJob, runReportWarehouseJob } from './inventory-job-warehouse-reports.service.js';

export function formatYmd(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function getMonthBounds(ymd: string): { dateFrom: string; dateTo: string } {
  const [yStr, mStr] = ymd.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return { dateFrom: `${y}-${mm}-01`, dateTo: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export function shiftMonthStart(ymd: string, deltaMonths: number): string {
  const [yStr, mStr] = ymd.split('-');
  const dt = new Date(Number(yStr), Number(mStr) - 1 + deltaMonths, 1);
  return formatYmd(dt);
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function runReportWarehouseItemStateJob(req: InventoryJobRunRequest): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const targetDate = req.date || formatYmd(startedAt);
  const { dateFrom, dateTo } = getMonthBounds(targetDate);
  const currentMonthStart = `${formatYmd(startedAt).slice(0, 7)}-01`;
  const dryRun = Boolean(req.dryRun);

  const itemConds: string[] = [
    `(DATE(date_created) <= ? OR (item_state NOT IN (${INVENTORY_ITEM_UNAVAILABLE_STATES.map(() => '?').join(',')}) AND DATE(date_updated) BETWEEN ? AND ?))`,
  ];
  const itemArgs: unknown[] = [dateTo, ...INVENTORY_ITEM_UNAVAILABLE_STATES, dateFrom, dateTo];
  if (req.warehouseId) {
    itemConds.push('inventory_warehouse_id = ?');
    itemArgs.push(req.warehouseId);
  }
  if (req.warehouseItemId) {
    itemConds.push('id = ?');
    itemArgs.push(req.warehouseItemId);
  }

  const candidates = await queryInventory<
    Array<
      RowDataPacket & {
        id: number;
        client_id: number;
        client_business_id: number;
        inventory_warehouse_id: number;
        inventory_item_id: number;
        item_state: string;
        date_updated: string | null;
      }
    >
  >(
    `SELECT id, client_id, client_business_id, inventory_warehouse_id, inventory_item_id, item_state, date_updated
     FROM inventory_warehouse_item WHERE ${itemConds.join(' AND ')} ORDER BY id ASC`,
    itemArgs
  );

  const permSet = new Set<string>(INVENTORY_ITEM_PERMANENT_UNAVAILABLE_STATES);
  let skippedPermanentUnavailable = 0;
  const activeItems = candidates.filter((c) => {
    const updatedDay = c.date_updated ? String(c.date_updated).slice(0, 10) : '';
    if (permSet.has(c.item_state) && updatedDay && updatedDay < dateFrom) {
      skippedPermanentUnavailable += 1;
      return false;
    }
    return true;
  });

  const toInsert: Array<unknown[]> = [];
  const toUpdate: Array<{ id: number; warehouseId: number; itemState: string }> = [];
  const toDeleteIds: number[] = [];
  const toTouchItemIds: number[] = [];

  for (const batch of chunkArray(activeItems, 2000)) {
    const ids = batch.map((b) => Number(b.id));
    const ph = ids.map(() => '?').join(',');

    const [orderFromRows, orderToRows, priorRows, monthStateRows, existingRows] = await Promise.all([
      queryInventory<
        Array<
          RowDataPacket & { item_id: number; to_inventory_warehouse_id: number; date_imported: string; oid: number }
        >
      >(
        `SELECT from_inventory_warehouse_item_id AS item_id, to_inventory_warehouse_id, date_imported, id AS oid
         FROM inventory_warehouse_order_item
         WHERE from_inventory_warehouse_item_id IN (${ph}) AND DATE(date_imported) BETWEEN ? AND ?
         ORDER BY date_imported DESC, id DESC`,
        [...ids, dateFrom, dateTo]
      ),
      queryInventory<
        Array<
          RowDataPacket & { item_id: number; to_inventory_warehouse_id: number; date_imported: string; oid: number }
        >
      >(
        `SELECT to_inventory_warehouse_item_id AS item_id, to_inventory_warehouse_id, date_imported, id AS oid
         FROM inventory_warehouse_order_item
         WHERE to_inventory_warehouse_item_id IN (${ph}) AND DATE(date_imported) BETWEEN ? AND ?
         ORDER BY date_imported DESC, id DESC`,
        [...ids, dateFrom, dateTo]
      ),
      queryInventory<
        Array<
          RowDataPacket & { inventory_warehouse_item_id: number; inventory_warehouse_id: number; item_state: string }
        >
      >(
        `SELECT inventory_warehouse_item_id, inventory_warehouse_id, item_state
         FROM report_inventory_warehouse_item_state
         WHERE inventory_warehouse_item_id IN (${ph}) AND date < ? ORDER BY date DESC, id DESC`,
        [...ids, dateFrom]
      ),
      queryInventory<Array<RowDataPacket & { inventory_warehouse_item_id: number; item_state: string }>>(
        `SELECT inventory_warehouse_item_id, item_state
         FROM inventory_warehouse_item_state
         WHERE inventory_warehouse_item_id IN (${ph}) AND DATE(date_created) BETWEEN ? AND ? ORDER BY id DESC`,
        [...ids, dateFrom, dateTo]
      ),
      queryInventory<
        Array<
          RowDataPacket & {
            id: number;
            inventory_warehouse_item_id: number;
            inventory_warehouse_id: number;
            item_state: string;
          }
        >
      >(
        `SELECT id, inventory_warehouse_item_id, inventory_warehouse_id, item_state
         FROM report_inventory_warehouse_item_state
         WHERE inventory_warehouse_item_id IN (${ph}) AND date = ? ORDER BY id ASC`,
        [...ids, dateTo]
      ),
    ]);

    const orderWhMap = new Map<number, { toWhId: number; dateImported: string; oid: number }>();
    for (const r of [...orderFromRows, ...orderToRows]) {
      const k = Number(r.item_id);
      const prev = orderWhMap.get(k);
      if (!prev || r.date_imported > prev.dateImported || (r.date_imported === prev.dateImported && r.oid > prev.oid)) {
        orderWhMap.set(k, {
          toWhId: Number(r.to_inventory_warehouse_id),
          dateImported: r.date_imported,
          oid: Number(r.oid),
        });
      }
    }
    const priorMap = new Map<number, { whId: number; state: string }>();
    for (const r of priorRows) {
      const k = Number(r.inventory_warehouse_item_id);
      if (!priorMap.has(k)) priorMap.set(k, { whId: Number(r.inventory_warehouse_id), state: r.item_state });
    }
    const monthStateMap = new Map<number, string>();
    for (const r of monthStateRows) {
      const k = Number(r.inventory_warehouse_item_id);
      if (!monthStateMap.has(k)) monthStateMap.set(k, r.item_state);
    }
    const existingMap = new Map<number, { id: number; whId: number; state: string }>();
    for (const r of existingRows) {
      const k = Number(r.inventory_warehouse_item_id);
      if (!existingMap.has(k))
        existingMap.set(k, { id: Number(r.id), whId: Number(r.inventory_warehouse_id), state: r.item_state });
    }

    for (const item of batch) {
      const id = Number(item.id);
      const prior = priorMap.get(id);
      const existing = existingMap.get(id);
      const resolvedWhId = orderWhMap.get(id)?.toWhId ?? prior?.whId ?? Number(item.inventory_warehouse_id);
      const resolvedState = monthStateMap.get(id) ?? prior?.state ?? 'New';

      if (existing && prior?.state === 'Used') {
        toDeleteIds.push(existing.id);
      } else {
        if (existing) {
          if (existing.whId !== resolvedWhId || existing.state !== resolvedState) {
            toUpdate.push({ id: existing.id, warehouseId: resolvedWhId, itemState: resolvedState });
          }
        } else {
          toInsert.push([
            Number(item.client_id),
            Number(item.client_business_id),
            resolvedWhId,
            Number(item.inventory_item_id),
            id,
            resolvedState,
            dateTo,
          ]);
        }
        const updatedDay = item.date_updated ? String(item.date_updated).slice(0, 10) : '';
        if (!permSet.has(item.item_state) && (!updatedDay || updatedDay < currentMonthStart)) {
          toTouchItemIds.push(id);
        }
      }
    }
  }

  if (!dryRun) {
    for (const delBatch of chunkArray(toDeleteIds, 500)) {
      await executeInventory(
        `DELETE FROM report_inventory_warehouse_item_state WHERE id IN (${delBatch.map(() => '?').join(',')})`,
        delBatch
      );
    }
    for (const updBatch of chunkArray(toUpdate, 200)) {
      await Promise.all(
        updBatch.map((u) =>
          executeInventory(
            `UPDATE report_inventory_warehouse_item_state SET inventory_warehouse_id = ?, item_state = ?, date_updated = NOW() WHERE id = ?`,
            [u.warehouseId, u.itemState, u.id]
          )
        )
      );
    }
    for (const insBatch of chunkArray(toInsert, 500)) {
      const valuesSql = insBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',');
      await executeInventory(
        `INSERT INTO report_inventory_warehouse_item_state
           (client_id, client_business_id, inventory_warehouse_id, inventory_item_id, inventory_warehouse_item_id, item_state, date, date_updated, date_created)
         VALUES ${valuesSql}`,
        insBatch.flat()
      );
    }
    for (const touchBatch of chunkArray(toTouchItemIds, 500)) {
      await executeInventory(
        `UPDATE inventory_warehouse_item SET date_updated = NOW() WHERE id IN (${touchBatch.map(() => '?').join(',')})`,
        touchBatch
      );
    }
  }

  const finishedAt = new Date();
  return {
    jobKey: 'report-warehouse-item-state',
    legacyScript: 'generate-report-inventory-warehouse-item-state.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate: dateTo,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}Quét ${candidates.length} mã QR (${dateFrom}..${dateTo}): +${toInsert.length} mới, ~${toUpdate.length} cập nhật, -${toDeleteIds.length} xóa.`,
    metrics: {
      scannedItems: candidates.length,
      skippedPermanentUnavailable,
      toInsert: toInsert.length,
      toUpdate: toUpdate.length,
      toDelete: toDeleteIds.length,
      toTouchUpdated: toTouchItemIds.length,
    },
  };
}

export async function runReportWarehouseItemJob(req: InventoryJobRunRequest): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const targetDate = req.date || formatYmd(startedAt);
  const { dateFrom, dateTo } = getMonthBounds(targetDate);
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

  if (warehouses.length > 0) {
    const whIds = warehouses.map((w) => Number(w.id));
    const whMap = new Map(warehouses.map((w) => [Number(w.id), w]));
    const whPh = whIds.map(() => '?').join(',');
    const dtFromStart = `${dateFrom} 00:00:00`;
    const dtToEnd = `${dateTo} 23:59:59`;

    const pairItemFilter = req.warehouseItemId ? ' AND id = ?' : '';
    const pairItemArgs = req.warehouseItemId ? [req.warehouseItemId] : [];
    const activePairRows = await queryInventory<
      Array<
        RowDataPacket & {
          inventory_warehouse_id: number;
          inventory_item_id: number;
          client_id: number;
          client_business_id: number;
        }
      >
    >(
      `SELECT inventory_warehouse_id, inventory_item_id, MIN(client_id) AS client_id, MIN(client_business_id) AS client_business_id
       FROM inventory_warehouse_item
       WHERE inventory_warehouse_id IN (${whPh})${pairItemFilter}
         AND ((item_state NOT IN (${INVENTORY_ITEM_UNAVAILABLE_STATES.map(() => '?').join(',')}) AND date_created <= ?)
              OR (date_updated BETWEEN ? AND ?))
       GROUP BY inventory_warehouse_id, inventory_item_id`,
      [...whIds, ...pairItemArgs, ...INVENTORY_ITEM_UNAVAILABLE_STATES, dtToEnd, dtFromStart, dtToEnd]
    );

    const orderPairs = req.warehouseItemId
      ? []
      : await queryInventory<Array<RowDataPacket & { wh_id: number; inventory_item_id: number }>>(
          `SELECT DISTINCT from_inventory_warehouse_id AS wh_id, inventory_item_id
           FROM inventory_warehouse_order_item
           WHERE from_inventory_warehouse_id IN (${whPh}) AND date_imported BETWEEN ? AND ?
           UNION
           SELECT DISTINCT to_inventory_warehouse_id AS wh_id, inventory_item_id
           FROM inventory_warehouse_order_item
           WHERE to_inventory_warehouse_id IN (${whPh}) AND date_imported BETWEEN ? AND ?`,
          [...whIds, dtFromStart, dtToEnd, ...whIds, dtFromStart, dtToEnd]
        );

    const pairMap = new Map<string, { whId: number; itemId: number; clientId: number; bizId: number }>();
    for (const r of activePairRows) {
      const whId = Number(r.inventory_warehouse_id);
      const itemId = Number(r.inventory_item_id);
      pairMap.set(`${whId}:${itemId}`, {
        whId,
        itemId,
        clientId: Number(r.client_id),
        bizId: Number(r.client_business_id),
      });
    }
    for (const r of orderPairs) {
      const whId = Number(r.wh_id);
      const itemId = Number(r.inventory_item_id);
      const wh = whMap.get(whId);
      if (wh && !pairMap.has(`${whId}:${itemId}`)) {
        pairMap.set(`${whId}:${itemId}`, {
          whId,
          itemId,
          clientId: Number(wh.client_id),
          bizId: Number(wh.client_business_id),
        });
      }
    }

    const [monthPriceRows, priorPriceRows, existingRows] = await Promise.all([
      queryInventory<
        Array<
          RowDataPacket & {
            inventory_warehouse_id: number;
            inventory_item_id: number;
            retail_price: number;
            sale_price: number;
            internal_price: number;
          }
        >
      >(
        `SELECT iwi.inventory_warehouse_id, iwi.inventory_item_id, iwi.retail_price, iwi.sale_price, iwi.internal_price
         FROM inventory_warehouse_item iwi
         INNER JOIN (
           SELECT inventory_warehouse_id, inventory_item_id, MAX(id) AS max_id
           FROM inventory_warehouse_item
           WHERE inventory_warehouse_id IN (${whPh}) AND retail_price > 0 AND date_created BETWEEN ? AND ?
           GROUP BY inventory_warehouse_id, inventory_item_id
         ) t ON t.max_id = iwi.id`,
        [...whIds, dtFromStart, dtToEnd]
      ),
      queryInventory<
        Array<
          RowDataPacket & {
            inventory_warehouse_id: number;
            inventory_item_id: number;
            retail_price: number;
            sale_price: number;
            internal_price: number;
          }
        >
      >(
        `SELECT iwi.inventory_warehouse_id, iwi.inventory_item_id, iwi.retail_price, iwi.sale_price, iwi.internal_price
         FROM inventory_warehouse_item iwi
         INNER JOIN (
           SELECT inventory_warehouse_id, inventory_item_id, MAX(id) AS max_id
           FROM inventory_warehouse_item
           WHERE inventory_warehouse_id IN (${whPh}) AND retail_price > 0 AND date_created < ?
           GROUP BY inventory_warehouse_id, inventory_item_id
         ) t ON t.max_id = iwi.id`,
        [...whIds, dtFromStart]
      ),
      queryInventory<
        Array<
          RowDataPacket & {
            id: number;
            inventory_warehouse_id: number;
            inventory_item_id: number;
            last_retail_price: number;
            last_sale_price: number;
            last_internal_price: number;
          }
        >
      >(
        `SELECT id, inventory_warehouse_id, inventory_item_id, last_retail_price, last_sale_price, last_internal_price
         FROM report_inventory_warehouse_item
         WHERE inventory_warehouse_id IN (${whPh}) AND date = ?`,
        [...whIds, dateTo]
      ),
    ]);

    const priceMap = new Map<string, { retail: number; sale: number; internal: number }>();
    for (const p of priorPriceRows) {
      priceMap.set(`${p.inventory_warehouse_id}:${p.inventory_item_id}`, {
        retail: Number(p.retail_price || 0),
        sale: Number(p.sale_price || 0),
        internal: Number(p.internal_price || 0),
      });
    }
    for (const p of monthPriceRows) {
      priceMap.set(`${p.inventory_warehouse_id}:${p.inventory_item_id}`, {
        retail: Number(p.retail_price || 0),
        sale: Number(p.sale_price || 0),
        internal: Number(p.internal_price || 0),
      });
    }
    const existingMap = new Map(existingRows.map((e) => [`${e.inventory_warehouse_id}:${e.inventory_item_id}`, e]));

    const toInsert: Array<unknown[]> = [];
    const toUpdate: Array<{ id: number; retail: number; sale: number; internal: number }> = [];
    for (const [key, pair] of pairMap.entries()) {
      const price = priceMap.get(key) || { retail: 0, sale: 0, internal: 0 };
      const ex = existingMap.get(key);
      if (ex) {
        if (
          Number(ex.last_retail_price) !== price.retail ||
          Number(ex.last_sale_price) !== price.sale ||
          Number(ex.last_internal_price) !== price.internal
        ) {
          toUpdate.push({ id: Number(ex.id), retail: price.retail, sale: price.sale, internal: price.internal });
        }
      } else {
        toInsert.push([
          pair.clientId,
          pair.bizId,
          pair.whId,
          pair.itemId,
          price.retail,
          price.sale,
          price.internal,
          dateTo,
        ]);
      }
    }

    pairsEvaluated = pairMap.size;
    toInsertCount = toInsert.length;
    toUpdateCount = toUpdate.length;

    if (!dryRun) {
      for (const insBatch of chunkArray(toInsert, 500)) {
        await executeInventory(
          `INSERT INTO report_inventory_warehouse_item
             (client_id, client_business_id, inventory_warehouse_id, inventory_item_id, last_retail_price, last_sale_price, last_internal_price, date, date_updated, date_created)
           VALUES ${insBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',')}`,
          insBatch.flat()
        );
      }
      for (const updBatch of chunkArray(toUpdate, 200)) {
        await Promise.all(
          updBatch.map((u) =>
            executeInventory(
              `UPDATE report_inventory_warehouse_item SET last_retail_price = ?, last_sale_price = ?, last_internal_price = ?, date_updated = NOW() WHERE id = ?`,
              [u.retail, u.sale, u.internal, u.id]
            )
          )
        );
      }
    }
  }

  const finishedAt = new Date();
  return {
    jobKey: 'report-warehouse-item',
    legacyScript: 'generate-report-inventory-warehouse-item.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate: dateTo,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}${warehouses.length} kho, ${pairsEvaluated} cặp SKU (${dateFrom}..${dateTo}): +${toInsertCount} mới, ~${toUpdateCount} đổi giá.`,
    metrics: {
      warehousesProcessed: warehouses.length,
      pairsEvaluated,
      toInsert: toInsertCount,
      toUpdate: toUpdateCount,
    },
  };
}
