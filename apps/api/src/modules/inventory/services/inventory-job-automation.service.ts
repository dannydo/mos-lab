import type { RowDataPacket } from 'mysql2/promise';
import {
  computeStockCheckingMaxCount,
  computeStockNeedQuantity,
  getEndOfMonthRemindDays,
  INVENTORY_ITEM_TYPES,
  type InventoryJobRunRequest,
  type InventoryJobRunResultDto,
  type InventorySaveOrderLineInput,
} from '@mos-lab/shared';
import type { InventoryAuthContext } from './inventory-auth.service.js';
import { transitionCheckStateInTx } from './inventory-check.service.js';
import { executeInventory, queryInventory, withInventoryTransaction } from './inventory-db.js';
import { formatYmd, getMonthBounds, shiftMonthStart } from './inventory-job-reports.service.js';
import { saveWarehouseOrder } from './inventory-order-mutation.service.js';
import { inventorySseBroker } from './inventory-sse.service.js';

export async function runProcessEndOfMonthJob(
  ctx: InventoryAuthContext,
  req: InventoryJobRunRequest
): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const dryRun = Boolean(req.dryRun);
  const yesterday = new Date(startedAt.getTime() - 24 * 60 * 60 * 1000);
  const baseYmd = req.date || formatYmd(yesterday);
  const { dateTo: thisMonth } = getMonthBounds(baseYmd);
  const dayOfMonth = Number(thisMonth.slice(8, 10));
  const monthPrefix = thisMonth.slice(0, 7);
  const todayDay = req.simulateDay ?? startedAt.getDate();
  const todayHour = req.simulateHour ?? startedAt.getHours();
  const remindDays = getEndOfMonthRemindDays(dayOfMonth);

  if (!req.forceRun && !remindDays.includes(todayDay)) {
    const finishedAt = new Date();
    return {
      jobKey: 'process-end-of-month',
      legacyScript: 'process-inventory-end-of-month.php',
      dryRun,
      status: 'skipped',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      targetDate: thisMonth,
      warehouseId: req.warehouseId || null,
      summary: `Bỏ qua EOM: ngày ${todayDay} không thuộc ngày nhắc [${remindDays.join(', ')}] (bật Ép chạy để kiểm tra).`,
      metrics: {
        todayDay,
        dayOfMonth,
        warehousesEvaluated: 0,
        checksCreated: 0,
        checksFinalized: 0,
        receiversMatched: 0,
      },
      details: { remindDays, monthPrefix },
    };
  }

  const whConds = ['is_disabled = 0', 'is_check_needed = 1', "inventory_warehouse_type = 'Other'"];
  const whArgs: unknown[] = [];
  if (req.warehouseId) {
    whConds.push('id = ?');
    whArgs.push(req.warehouseId);
  }
  const warehouses = await queryInventory<
    Array<
      RowDataPacket & {
        id: number;
        client_id: number;
        client_business_id: number;
        client_store_id: number | null;
        inventory_warehouse_name: string;
      }
    >
  >(
    `SELECT id, client_id, client_business_id, client_store_id, inventory_warehouse_name
     FROM inventory_warehouse WHERE ${whConds.join(' AND ')} ORDER BY id ASC`,
    whArgs
  );

  let checksCreated = 0;
  let checksFinalized = 0;
  let receiversMatched = 0;
  const mode =
    todayHour === 0 && todayDay === dayOfMonth - 1
      ? 'auto-finalize-checked'
      : todayHour !== 0
        ? 'warning-reminder'
        : 'standby';
  const perState: Array<Record<string, unknown>> = [];

  if (warehouses.length > 0) {
    const whIds = warehouses.map((w) => Number(w.id));
    const whPh = whIds.map(() => '?').join(',');

    for (const itemState of ['New', 'Using'] as const) {
      const existingChecks = await queryInventory<
        Array<RowDataPacket & { id: number; inventory_warehouse_id: number; check_state: string }>
      >(
        `SELECT id, inventory_warehouse_id, check_state
         FROM inventory_warehouse_check
         WHERE inventory_warehouse_id IN (${whPh}) AND SUBSTR(date_created, 1, 7) = ? AND item_state = ?
         ORDER BY id DESC`,
        [...whIds, monthPrefix, itemState]
      );

      const pendingCheckIds: number[] = [];
      const pendingStoreIds = new Set<number>();
      let stateCreated = 0;
      let stateFinalized = 0;

      for (const wh of warehouses) {
        const whChecks = existingChecks.filter((c) => Number(c.inventory_warehouse_id) === Number(wh.id));
        const hasChecked = whChecks.some((c) => c.check_state === 'Checked');
        const hasCompleted = whChecks.some((c) => c.check_state === 'Completed');
        if (hasChecked || hasCompleted) continue;

        let newCheck = whChecks.find((c) => c.check_state === 'New');
        if (!newCheck) {
          stateCreated += 1;
          checksCreated += 1;
          if (!dryRun) {
            const ins = await executeInventory(
              `INSERT INTO inventory_warehouse_check
                 (client_id, client_business_id, created_staff_id, inventory_warehouse_id, description,
                  item_state, check_state, total_quantity, total_quantity_checked, total_quantity_using,
                  total_quantity_lost, total_retail_price, total_retail_price_checked,
                  total_retail_price_using, total_retail_price_lost, date_created)
               VALUES (?, ?, ?, ?, '', ?, 'New', 0, 0, 0, 0, 0, 0, 0, 0, NOW())`,
              [wh.client_id, wh.client_business_id, ctx.actorLegacyUserId, wh.id, itemState]
            );
            newCheck = {
              id: ins.insertId,
              inventory_warehouse_id: Number(wh.id),
              check_state: 'New',
            } as (typeof whChecks)[number];
          }
        }
        if (newCheck) pendingCheckIds.push(Number(newCheck.id));
        if (wh.client_store_id) pendingStoreIds.add(Number(wh.client_store_id));
      }

      if (mode === 'auto-finalize-checked' && !dryRun && pendingCheckIds.length > 0) {
        await withInventoryTransaction(async (conn) => {
          for (const checkId of pendingCheckIds) {
            await transitionCheckStateInTx(conn, ctx, checkId, 'Checked');
            stateFinalized += 1;
            checksFinalized += 1;
          }
        });
        inventorySseBroker.publish('check-update', { mode: 'eom-finalize', checkIds: pendingCheckIds });
      } else if (mode === 'auto-finalize-checked' && dryRun) {
        stateFinalized = pendingCheckIds.length;
        checksFinalized += pendingCheckIds.length;
      }

      let stateReceivers = 0;
      if (pendingStoreIds.size > 0) {
        const storeIds = [...pendingStoreIds];
        const groupId = itemState === 'New' ? 6 : 5;
        const rows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
          `SELECT COUNT(DISTINCT up.user_id) AS cnt
           FROM user_profile up
           INNER JOIN item_client ic ON up.user_id = ic.user_id AND ic.type = 'store'
           WHERE up.is_disabled = 0 AND up.is_temporary = 0 AND up.client_business_id = 1
             AND up.user_group_id = ? AND ic.item_id IN (${storeIds.map(() => '?').join(',')})`,
          [groupId, ...storeIds]
        );
        stateReceivers = Number(rows[0]?.cnt || 0);
        receiversMatched += stateReceivers;
      }

      perState.push({
        itemState,
        pendingWarehouses: pendingStoreIds.size,
        checksCreated: stateCreated,
        checksFinalized: stateFinalized,
        receiversMatched: stateReceivers,
      });
    }
  }

  const finishedAt = new Date();
  return {
    jobKey: 'process-end-of-month',
    legacyScript: 'process-inventory-end-of-month.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate: thisMonth,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}EOM ${monthPrefix} (${mode}): ${warehouses.length} kho, +${checksCreated} phiếu kiểm, chốt ${checksFinalized} Checked, ${receiversMatched} người nhận nhắc.`,
    metrics: { warehousesEvaluated: warehouses.length, checksCreated, checksFinalized, receiversMatched },
    details: { mode, monthPrefix, remindDays, todayDay, todayHour, perState },
  };
}

export async function runProcessStockCheckingJob(
  ctx: InventoryAuthContext,
  req: InventoryJobRunRequest
): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const dryRun = Boolean(req.dryRun);
  const targetDate = req.date || formatYmd(startedAt);
  const { dateFrom } = getMonthBounds(targetDate);
  const lastDateFrom = shiftMonthStart(dateFrom, -3);
  const { dateTo: lastDateTo } = getMonthBounds(shiftMonthStart(dateFrom, -1));
  const lastYearAnchor = `${Number(dateFrom.slice(0, 4)) - 1}-${dateFrom.slice(5, 7)}-01`;
  const { dateFrom: lastYearFrom, dateTo: lastYearTo } = getMonthBounds(lastYearAnchor);

  const whConds = ['is_disabled = 0', 'client_store_id IS NOT NULL'];
  const whArgs: unknown[] = [];
  if (req.warehouseId) {
    whConds.push('id = ?');
    whArgs.push(req.warehouseId);
  }
  const warehouses = await queryInventory<
    Array<
      RowDataPacket & {
        id: number;
        client_id: number;
        client_business_id: number;
        inventory_warehouse_type: string;
        inventory_warehouse_name: string;
        parent_inventory_warehouse_id: number | null;
      }
    >
  >(
    `SELECT id, client_id, client_business_id, inventory_warehouse_type, inventory_warehouse_name, parent_inventory_warehouse_id
     FROM inventory_warehouse WHERE ${whConds.join(' AND ')} ORDER BY id ASC`,
    whArgs
  );

  let limitsToInsert = 0;
  let limitsToUpdate = 0;
  let candidateOrders = 0;
  let ordersCreated = 0;
  let totalOrderQuantity = 0;
  const createdOrderIds: number[] = [];
  const orderPreviews: Array<{
    warehouseId: number;
    warehouseName: string;
    itemType: string;
    lineCount: number;
    quantity: number;
    isInternal: boolean;
  }> = [];

  for (const wh of warehouses) {
    const isMain = wh.inventory_warehouse_type === 'Main';
    const usedSql = isMain
      ? `SELECT iwi.inventory_item_id, COUNT(*) AS cnt
         FROM inventory_warehouse_item iwi
         INNER JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
         WHERE iwi.item_state = 'Used' AND iw.parent_inventory_warehouse_id = ? AND DATE(iwi.date_updated) BETWEEN ? AND ?
         GROUP BY iwi.inventory_item_id`
      : `SELECT inventory_item_id, COUNT(*) AS cnt
         FROM inventory_warehouse_item
         WHERE item_state = 'Used' AND inventory_warehouse_id = ? AND DATE(date_updated) BETWEEN ? AND ?
         GROUP BY inventory_item_id`;

    const [used3mRows, usedLastYearRows, limitRows, newStockRows] = await Promise.all([
      queryInventory<Array<RowDataPacket & { inventory_item_id: number; cnt: number }>>(usedSql, [
        wh.id,
        lastDateFrom,
        lastDateTo,
      ]),
      queryInventory<Array<RowDataPacket & { inventory_item_id: number; cnt: number }>>(usedSql, [
        wh.id,
        lastYearFrom,
        lastYearTo,
      ]),
      queryInventory<
        Array<
          RowDataPacket & {
            id: number;
            inventory_item_id: number;
            inventory_item_type: string;
            min_count: number;
            max_count: number;
            last_max_count: number;
            limit_count_standard: number;
          }
        >
      >(
        `SELECT l.id, l.inventory_item_id, ii.inventory_item_type, l.min_count, l.max_count, l.last_max_count, l.limit_count_standard
         FROM inventory_warehouse_item_limit l
         INNER JOIN inventory_item ii ON ii.id = l.inventory_item_id
         WHERE l.item_state = 'New' AND l.inventory_warehouse_id = ?`,
        [wh.id]
      ),
      queryInventory<Array<RowDataPacket & { inventory_item_id: number; cnt: number }>>(
        `SELECT inventory_item_id, COUNT(*) AS cnt FROM inventory_warehouse_item WHERE item_state = 'New' AND inventory_warehouse_id = ? GROUP BY inventory_item_id`,
        [wh.id]
      ),
    ]);

    const usageMap = new Map<number, { prev3m: number; lastYear: number }>();
    for (const r of used3mRows) usageMap.set(Number(r.inventory_item_id), { prev3m: Number(r.cnt || 0), lastYear: 0 });
    for (const r of usedLastYearRows) {
      const k = Number(r.inventory_item_id);
      const u = usageMap.get(k) || { prev3m: 0, lastYear: 0 };
      u.lastYear = Number(r.cnt || 0);
      usageMap.set(k, u);
    }

    const existingLimitMap = new Map(limitRows.map((l) => [Number(l.inventory_item_id), l]));
    const insertLimitRows: Array<unknown[]> = [];
    const projectedLimits = limitRows.map((l) => ({ ...l }));

    for (const [itemId, u] of usageMap.entries()) {
      const calcMax = computeStockCheckingMaxCount(u.prev3m, u.lastYear);
      const ex = existingLimitMap.get(itemId);
      if (!ex) {
        limitsToInsert += 1;
        insertLimitRows.push([wh.client_id, wh.client_business_id, wh.id, itemId, 'New', 0, calcMax, calcMax, calcMax]);
      } else if (calcMax > 0) {
        const nextLastMax = Number(ex.last_max_count) !== calcMax ? calcMax : Number(ex.last_max_count);
        const std = Number(ex.limit_count_standard || 0);
        const ratioOk = std > 0 && calcMax / std < 1.2 && calcMax / std > 0.8;
        const nextMax = ratioOk && Number(ex.max_count) !== calcMax ? calcMax : Number(ex.max_count);

        if (nextLastMax !== Number(ex.last_max_count) || nextMax !== Number(ex.max_count)) {
          limitsToUpdate += 1;
          ex.last_max_count = nextLastMax;
          ex.max_count = nextMax;
          if (!dryRun) {
            await executeInventory(
              `UPDATE inventory_warehouse_item_limit SET last_max_count = ?, max_count = ?, date_updated = NOW() WHERE id = ?`,
              [nextLastMax, nextMax, ex.id]
            );
          }
        }
      }
    }

    if (!dryRun && insertLimitRows.length > 0) {
      await executeInventory(
        `INSERT INTO inventory_warehouse_item_limit
           (client_id, client_business_id, inventory_warehouse_id, inventory_item_id, item_state, min_count, max_count, last_max_count, limit_count_standard, date_updated, date_created)
         VALUES ${insertLimitRows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW())').join(',')}`,
        insertLimitRows.flat()
      );
    }

    const stockMap = new Map(newStockRows.map((s) => [Number(s.inventory_item_id), Number(s.cnt || 0)]));
    const lastFromRows = isMain
      ? await queryInventory<
          Array<RowDataPacket & { inventory_item_id: number; from_inventory_warehouse_id: number; from_name: string }>
        >(
          `SELECT iwoi.inventory_item_id, iwoi.from_inventory_warehouse_id, iw.inventory_warehouse_name AS from_name
           FROM inventory_warehouse_order_item iwoi
           INNER JOIN inventory_warehouse iw ON iw.id = iwoi.from_inventory_warehouse_id
           WHERE iwoi.to_inventory_warehouse_id = ? AND iwoi.date_imported IS NOT NULL AND iw.client_store_id IS NULL
           ORDER BY iwoi.date_imported DESC, iwoi.id DESC`,
          [wh.id]
        )
      : [];
    const lastFromMap = new Map<number, { fromWhId: number; fromName: string }>();
    for (const r of lastFromRows) {
      const k = Number(r.inventory_item_id);
      if (!lastFromMap.has(k))
        lastFromMap.set(k, { fromWhId: Number(r.from_inventory_warehouse_id), fromName: r.from_name });
    }

    for (const itemType of INVENTORY_ITEM_TYPES) {
      const typedLimits = projectedLimits.filter((l) => l.inventory_item_type === itemType);
      if (isMain) {
        const grouped = new Map<number, { fromName: string; lines: InventorySaveOrderLineInput[]; totalQty: number }>();
        for (const l of typedLimits) {
          const itemId = Number(l.inventory_item_id);
          const need = computeStockNeedQuantity({
            minCount: Number(l.min_count),
            maxCount: Number(l.max_count),
            lastMaxCount: Number(l.last_max_count),
            limitCountStandard: Number(l.limit_count_standard),
            currentStock: stockMap.get(itemId) ?? 0,
            isMainWarehouse: true,
          });
          if (need <= 0) continue;
          const lastFrom = lastFromMap.get(itemId);
          const fromId = lastFrom?.fromWhId || 0;
          const bucket = grouped.get(fromId) || { fromName: lastFrom?.fromName || '', lines: [], totalQty: 0 };
          bucket.lines.push({
            inventory_item_id: itemId,
            from_inventory_warehouse_id: fromId > 0 ? fromId : undefined,
            quantity: need,
            retail_price: 0,
          });
          bucket.totalQty += need;
          grouped.set(fromId, bucket);
        }
        for (const bucket of grouped.values()) {
          if (bucket.lines.length <= 10) continue;
          candidateOrders += 1;
          totalOrderQuantity += bucket.totalQty;
          orderPreviews.push({
            warehouseId: Number(wh.id),
            warehouseName: wh.inventory_warehouse_name,
            itemType,
            lineCount: bucket.lines.length,
            quantity: bucket.totalQty,
            isInternal: false,
          });
          if (!dryRun) {
            const saved = await saveWarehouseOrder(ctx, {
              to_inventory_warehouse_id: Number(wh.id),
              description: `${itemType} - ${bucket.fromName}`.trim(),
              is_internal: false,
              inventory_item: bucket.lines,
            });
            if (saved.order) {
              ordersCreated += 1;
              createdOrderIds.push(saved.order.inventory_warehouse_order_id);
            }
          }
        }
      } else {
        const lines: InventorySaveOrderLineInput[] = [];
        let qty = 0;
        for (const l of typedLimits) {
          const itemId = Number(l.inventory_item_id);
          const need = computeStockNeedQuantity({
            minCount: Number(l.min_count),
            maxCount: Number(l.max_count),
            lastMaxCount: Number(l.last_max_count),
            limitCountStandard: Number(l.limit_count_standard),
            currentStock: stockMap.get(itemId) ?? 0,
            isMainWarehouse: false,
          });
          if (need <= 0) continue;
          lines.push({ inventory_item_id: itemId, quantity: need, retail_price: 0 });
          qty += need;
        }
        if (lines.length > 5 && wh.parent_inventory_warehouse_id) {
          candidateOrders += 1;
          totalOrderQuantity += qty;
          orderPreviews.push({
            warehouseId: Number(wh.id),
            warehouseName: wh.inventory_warehouse_name,
            itemType,
            lineCount: lines.length,
            quantity: qty,
            isInternal: true,
          });
          if (!dryRun) {
            const saved = await saveWarehouseOrder(ctx, {
              from_inventory_warehouse_id: Number(wh.parent_inventory_warehouse_id),
              to_inventory_warehouse_id: Number(wh.id),
              description: itemType,
              is_internal: true,
              inventory_item: lines,
            });
            if (saved.order) {
              ordersCreated += 1;
              createdOrderIds.push(saved.order.inventory_warehouse_order_id);
            }
          }
        }
      }
    }
  }

  const finishedAt = new Date();
  return {
    jobKey: 'process-stock-checking',
    legacyScript: 'process-inventory-stock-checking.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}${warehouses.length} kho: định mức (+${limitsToInsert} / ~${limitsToUpdate}), ${candidateOrders} phiếu đủ ngưỡng (${dryRun ? 'dự kiến' : `đã tạo ${ordersCreated}`}, tổng SL ${totalOrderQuantity}).`,
    metrics: {
      warehousesProcessed: warehouses.length,
      limitsToInsert,
      limitsToUpdate,
      candidateOrders,
      ordersCreated,
      totalOrderQuantity,
    },
    details: { createdOrderIds, orderPreviews: orderPreviews.slice(0, 30) },
  };
}

export async function runPushWarehouseOrderJob(req: InventoryJobRunRequest): Promise<InventoryJobRunResultDto> {
  const startedAt = new Date();
  const dryRun = Boolean(req.dryRun);
  const yesterday = new Date(startedAt.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = req.date || formatYmd(yesterday);

  const ordConds = ['DATE(iwo.date_created) = ?', "iwo.order_state = 'New'"];
  const ordArgs: unknown[] = [targetDate];
  if (req.warehouseId) {
    ordConds.push('iwo.to_inventory_warehouse_id = ?');
    ordArgs.push(req.warehouseId);
  }

  const [recipients, orders] = await Promise.all([
    queryInventory<Array<RowDataPacket & { user_id: number; full_name: string }>>(
      `SELECT up.user_id, up.full_name
       FROM user_profile up
       INNER JOIN user u ON u.id = up.user_id
       WHERE (FIND_IN_SET(21, up.access_user_group_ids) <> 0 OR FIND_IN_SET(29, up.access_user_group_ids) <> 0)
         AND up.is_temporary = 0 AND up.is_leaved = 0 AND up.is_disabled = 0`,
      []
    ),
    queryInventory<
      Array<
        RowDataPacket & {
          order_id: number;
          to_inventory_warehouse_id: number;
          warehouse_name: string;
          order_count: number;
        }
      >
    >(
      `SELECT MIN(iwo.id) AS order_id, iwo.to_inventory_warehouse_id, iw.inventory_warehouse_name AS warehouse_name, COUNT(*) AS order_count
       FROM inventory_warehouse_order iwo
       INNER JOIN inventory_warehouse iw ON iw.id = iwo.to_inventory_warehouse_id
       WHERE ${ordConds.join(' AND ')}
       GROUP BY iwo.to_inventory_warehouse_id, iw.inventory_warehouse_name
       ORDER BY order_id ASC`,
      ordArgs
    ),
  ]);

  const notificationsPrepared = orders.length * recipients.length;
  if (!dryRun && orders.length > 0) {
    inventorySseBroker.publish('order-push-digest', {
      targetDate,
      targetWarehouses: orders.length,
      recipientCount: recipients.length,
    });
  }

  const finishedAt = new Date();
  return {
    jobKey: 'push-warehouse-order',
    legacyScript: 'push-inventory-warehouse-order.php',
    dryRun,
    status: 'completed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    targetDate,
    warehouseId: req.warehouseId || null,
    summary: `${dryRun ? '[Dry-Run] ' : ''}Ngày ${targetDate}: ${orders.length} kho có phiếu New × ${recipients.length} người duyệt = ${notificationsPrepared} thông báo.`,
    metrics: {
      pendingOrders: orders.reduce((s, o) => s + Number(o.order_count || 0), 0),
      targetWarehouses: orders.length,
      recipientCount: recipients.length,
      notificationsPrepared,
    },
    details: {
      orders: orders
        .slice(0, 20)
        .map((o) => ({
          orderId: Number(o.order_id),
          warehouseId: Number(o.to_inventory_warehouse_id),
          warehouseName: o.warehouse_name,
          orderCount: Number(o.order_count),
        })),
      recipients: recipients.slice(0, 20).map((r) => ({ userId: Number(r.user_id), fullName: r.full_name })),
    },
  };
}
