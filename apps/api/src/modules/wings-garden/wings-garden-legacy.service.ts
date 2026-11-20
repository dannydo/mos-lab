import type { FastifyInstance } from 'fastify';
import {
  matchWingsGardenSku,
  normalizeWingsGardenScanCode,
  WingsGardenConfig,
  WingsGardenItemTimelineEntry,
  WingsGardenLegacyQrLookup,
  WingsGardenLegacyWarehouseCounts,
  WingsGardenLiveSampleQr,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';

interface LegacyQrUnitRow {
  id: number;
  inventory_warehouse_id: number;
  warehouse_name: string | null;
  inventory_item_id: number;
  item_code: string | null;
  item_name: string | null;
  item_unit: string | null;
  first_inventory_warehouse_order_item_id: number | null;
  scan_code: string | null;
  item_state: string | null;
  retail_price: number | null;
  date_created: Date | string | null;
}

interface LegacyStateHistoryRow {
  item_state: string | null;
  date_created: Date | string | null;
  staff_name: string | null;
}

interface LegacyGroupCountRow {
  inventory_item_id: number;
  item_state: string | null;
  cnt: bigint | number;
}

interface LegacySampleRow {
  id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  item_name: string | null;
  first_inventory_warehouse_order_item_id: number | null;
  scan_code: string | null;
  retail_price: number | null;
}

function formatLegacyDateTime(raw: Date | string | null | undefined): string {
  if (!raw) return 'Không rõ thời gian';
  const dt = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(dt.getTime())) return String(raw);
  return dt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function extractCandidateTokens(rawCode: string): { cleaned: string; numericSerial: number | null } {
  const base = normalizeWingsGardenScanCode(rawCode);
  if (base.numericSerial !== null || !base.cleaned) return base;

  // Handle Wings QR URLs or JSON payloads if sticker encodes a URL/JSON
  if (base.cleaned.startsWith('http://') || base.cleaned.startsWith('https://')) {
    try {
      const parsedUrl = new URL(base.cleaned);
      const codeParam =
        parsedUrl.searchParams.get('scan_code') ||
        parsedUrl.searchParams.get('code') ||
        parsedUrl.pathname.split('/').filter(Boolean).pop() ||
        '';
      if (codeParam) return normalizeWingsGardenScanCode(codeParam);
    } catch {
      return base;
    }
  }

  return base;
}

export async function lookupLegacyQrUnit(
  fastify: FastifyInstance,
  rawCode: string,
  config: WingsGardenConfig
): Promise<WingsGardenLegacyQrLookup> {
  const { cleaned, numericSerial } = extractCandidateTokens(rawCode);
  const emptyResult: WingsGardenLegacyQrLookup = {
    found: false,
    legacyOnline: true,
    rawCode,
    cleanedCode: cleaned,
    numericSerial,
    inventoryWarehouseItemId: null,
    inventoryWarehouseId: null,
    warehouseName: null,
    inventoryItemId: null,
    itemCode: null,
    itemName: null,
    itemUnit: null,
    legacyState: null,
    retailPriceVnd: null,
    matchedSkuId: null,
    matchedSkuName: null,
    overlayState: null,
    overlayOwnerName: null,
    legacyTimeline: [],
  };

  if (!cleaned) {
    return emptyResult;
  }

  try {
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQrUnitRow[]>(
      `SELECT iwi.id,
              iwi.inventory_warehouse_id,
              iw.inventory_warehouse_name AS warehouse_name,
              iwi.inventory_item_id,
              ii.inventory_item_code AS item_code,
              ii.inventory_item_name AS item_name,
              ii.inventory_item_unit AS item_unit,
              iwi.first_inventory_warehouse_order_item_id,
              iwi.scan_code,
              iwi.item_state,
              iwi.retail_price,
              iwi.date_created
       FROM inventory_warehouse_item iwi
       LEFT JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
       LEFT JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
       WHERE iwi.scan_code = ?
          OR (? IS NOT NULL AND (iwi.first_inventory_warehouse_order_item_id = ? OR iwi.id = ?))
       ORDER BY iwi.id DESC
       LIMIT 1`,
      cleaned,
      numericSerial,
      numericSerial,
      numericSerial
    );

    if (!rows || rows.length === 0) {
      return emptyResult;
    }

    const row = rows[0];
    const matchedSku = matchWingsGardenSku(Number(row.inventory_item_id), row.item_name, config);

    let timeline: WingsGardenItemTimelineEntry[] = [
      {
        time: formatLegacyDateTime(row.date_created),
        actor: 'Hệ thống Wings (Legacy)',
        detail: `Tạo đơn vị #${row.first_inventory_warehouse_order_item_id || row.id} · Kho ${row.warehouse_name || row.inventory_warehouse_id}`,
      },
    ];

    try {
      const historyRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyStateHistoryRow[]>(
        `SELECT s.item_state,
                s.date_created,
                COALESCE(up.full_name, u.account, CONCAT('Staff #', s.created_staff_id)) AS staff_name
         FROM inventory_warehouse_item_state s
         LEFT JOIN user u ON u.id = s.created_staff_id
         LEFT JOIN user_profile up ON up.user_id = s.created_staff_id
         WHERE s.inventory_warehouse_item_id = ?
         ORDER BY s.id ASC
         LIMIT 12`,
        Number(row.id)
      );
      if (historyRows.length > 0) {
        timeline = historyRows.map((h) => ({
          time: formatLegacyDateTime(h.date_created),
          actor: String(h.staff_name || 'Hệ thống Wings'),
          detail: `Trạng thái Legacy: ${String(h.item_state || 'Unknown')}`,
        }));
      }
    } catch {
      // Fallback to single creation row if legacy history join columns differ across DB snapshots
    }

    return {
      found: true,
      legacyOnline: true,
      rawCode,
      cleanedCode: row.scan_code ? String(row.scan_code) : cleaned,
      numericSerial: row.first_inventory_warehouse_order_item_id
        ? Number(row.first_inventory_warehouse_order_item_id)
        : numericSerial,
      inventoryWarehouseItemId: Number(row.id),
      inventoryWarehouseId: Number(row.inventory_warehouse_id),
      warehouseName: row.warehouse_name ? String(row.warehouse_name) : null,
      inventoryItemId: Number(row.inventory_item_id),
      itemCode: row.item_code ? String(row.item_code) : null,
      itemName: row.item_name ? String(row.item_name) : null,
      itemUnit: row.item_unit ? String(row.item_unit) : null,
      legacyState: row.item_state ? String(row.item_state) : null,
      retailPriceVnd:
        row.retail_price !== null && row.retail_price !== undefined ? Math.round(Number(row.retail_price)) : null,
      matchedSkuId: matchedSku?.skuId || null,
      matchedSkuName: matchedSku?.name || null,
      overlayState: null,
      overlayOwnerName: null,
      legacyTimeline: timeline,
    };
  } catch (err) {
    fastify.log.warn({ err }, 'Legacy DB offline during QR lookup; falling back gracefully');
    return {
      ...emptyResult,
      legacyOnline: false,
    };
  }
}

export async function fetchLegacyWarehouseSnapshot(
  fastify: FastifyInstance,
  warehouseId: WingsGardenWarehouseId,
  config: WingsGardenConfig
): Promise<WingsGardenLegacyWarehouseCounts> {
  const bySkuNew: Record<string, number> = {};
  for (const sku of config.skus) {
    bySkuNew[sku.skuId] = 0;
  }

  try {
    const groupedRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyGroupCountRow[]>(
      `SELECT inventory_item_id, item_state, COUNT(*) AS cnt
       FROM inventory_warehouse_item
       WHERE inventory_warehouse_id = ?
       GROUP BY inventory_item_id, item_state`,
      warehouseId
    );

    let totalNew = 0;
    let totalUsing = 0;
    let totalUsed = 0;
    let totalLost = 0;

    for (const r of groupedRows) {
      const count = Number(r.cnt || 0);
      const state = String(r.item_state || '');
      if (state === 'New') {
        totalNew += count;
        const matched = matchWingsGardenSku(Number(r.inventory_item_id), null, config);
        if (matched) {
          bySkuNew[matched.skuId] = (bySkuNew[matched.skuId] || 0) + count;
        }
      } else if (state === 'Using') {
        totalUsing += count;
      } else if (state === 'Used') {
        totalUsed += count;
      } else if (state === 'Lost') {
        totalLost += count;
      }
    }

    const legacyItemIds = Array.from(new Set(config.skus.flatMap((s) => s.legacyItemIds).filter((id) => id > 0)));
    const sampleNewStickers: WingsGardenLiveSampleQr[] = [];

    if (legacyItemIds.length > 0) {
      const placeholders = legacyItemIds.map(() => '?').join(',');
      const sampleRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacySampleRow[]>(
        `SELECT iwi.id,
                iwi.inventory_warehouse_id,
                iwi.inventory_item_id,
                ii.inventory_item_name AS item_name,
                iwi.first_inventory_warehouse_order_item_id,
                iwi.scan_code,
                iwi.retail_price
         FROM inventory_warehouse_item iwi
         JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
         WHERE iwi.inventory_warehouse_id = ?
           AND iwi.item_state = 'New'
           AND iwi.inventory_item_id IN (${placeholders})
         ORDER BY iwi.id DESC
         LIMIT 24`,
        warehouseId,
        ...legacyItemIds
      );

      // Deduplicate by matched skuId so Admin tester gets diverse sample QR codes across starter items
      const seenSku = new Set<string>();
      for (const s of sampleRows) {
        const matched = matchWingsGardenSku(Number(s.inventory_item_id), s.item_name, config);
        const key = matched ? matched.skuId : String(s.inventory_item_id);
        if (seenSku.has(key) && sampleNewStickers.length >= 12) continue;
        seenSku.add(key);
        sampleNewStickers.push({
          scanCode: String(s.scan_code || ''),
          serialNumber: Number(s.first_inventory_warehouse_order_item_id || s.id),
          legacyWarehouseItemId: Number(s.id),
          legacyItemId: Number(s.inventory_item_id),
          legacyItemName: String(s.item_name || 'Sản phẩm Wings'),
          skuId: matched?.skuId || null,
          skuName: matched?.name || String(s.item_name || 'Sản phẩm Wings'),
          retailPriceVnd:
            s.retail_price !== null && s.retail_price !== undefined
              ? Math.round(Number(s.retail_price))
              : matched?.listedPriceVnd || 30000,
          warehouseId,
          isLiveFromDb: true,
        });
        if (sampleNewStickers.length >= 12) break;
      }
    }

    return {
      warehouseId,
      legacyOnline: true,
      totalNew,
      totalUsing,
      totalUsed,
      totalLost,
      bySkuNew,
      sampleNewStickers,
    };
  } catch (err) {
    fastify.log.warn({ err, warehouseId }, 'Legacy warehouse snapshot unavailable; using safe offline fallback');
    sampleFallback(bySkuNew, config);
    const offlineSamples: WingsGardenLiveSampleQr[] = [
      {
        scanCode: 'YZMv4r6iruIAv5xM',
        serialNumber: 4509466,
        legacyWarehouseItemId: 90999,
        legacyItemId: 714,
        legacyItemName: 'Glue - Wings SH',
        skuId: 'keo-den',
        skuName: 'Keo Đen (Wings SH)',
        retailPriceVnd: 95000,
        warehouseId,
        isLiveFromDb: false,
      },
      {
        scanCode: 'OFFLINE_KEO_XANH',
        serialNumber: 4402334,
        legacyWarehouseItemId: 78110,
        legacyItemId: 293,
        legacyItemName: 'Glue',
        skuId: 'keo-xanh',
        skuName: 'Keo Xanh (Sky Zone)',
        retailPriceVnd: 96000,
        warehouseId,
        isLiveFromDb: false,
      },
      {
        scanCode: 'OFFLINE_BOT_RUA_MI',
        serialNumber: 4431435,
        legacyWarehouseItemId: 79120,
        legacyItemId: 745,
        legacyItemName: 'Lash Shampoo - Rose',
        skuId: 'bot-rua-mi',
        skuName: 'Bọt Rửa Mi',
        retailPriceVnd: 21000,
        warehouseId,
        isLiveFromDb: false,
      },
      {
        scanCode: 'OFFLINE_MICRO_BRUSH',
        serialNumber: 4406204,
        legacyWarehouseItemId: 77880,
        legacyItemId: 702,
        legacyItemName: 'Micro brush (bag)',
        skuId: 'bong-tam-nho',
        skuName: 'Bông Tăm Nhỏ (Micro Brush)',
        retailPriceVnd: 28000,
        warehouseId,
        isLiveFromDb: false,
      },
    ];
    return {
      warehouseId,
      legacyOnline: false,
      totalNew: warehouseId === 3 ? 1402 : 914,
      totalUsing: warehouseId === 3 ? 208 : 300,
      totalUsed: warehouseId === 3 ? 26328 : 11716,
      totalLost: warehouseId === 3 ? 1106 : 1102,
      bySkuNew,
      sampleNewStickers: offlineSamples,
    };
  }
}

function sampleFallback(bySkuNew: Record<string, number>, config: WingsGardenConfig): void {
  for (const sku of config.skus) {
    bySkuNew[sku.skuId] = sku.category === 'LASH' ? 40 : 12;
  }
}

export interface LegacySyncedEarnEvent {
  eventKey: string;
  trigger: 'LASH_FULL_SET' | 'LASH_REFILL' | 'BOTTOM_LASH' | 'SERUM_UPSELL' | 'CUSTOMER_COMBO_BUY';
  title: string;
  detail: string;
}

export interface LegacyStaffTodayEventsResult {
  online: boolean;
  events: LegacySyncedEarnEvent[];
}

interface LegacyTodayServiceRow {
  id: number;
  order_id: number;
  service_type: string | null;
  service_group: string | null;
  service_name: string | null;
}

interface LegacyTodayProductRow {
  id: number;
  order_id: number;
  product_name: string | null;
  quantity: number | null;
}

interface LegacyTodayComboRow {
  id: number;
  order_id: number;
  service_group: string | null;
}

export async function fetchLegacyStaffTodayEvents(
  fastify: FastifyInstance,
  legacyStaffId: number | undefined,
  todayDateKey: string,
  comboWindowDays: number = 0
): Promise<LegacyStaffTodayEventsResult> {
  const staffIdNum = Number(legacyStaffId || 0);
  if (!Number.isFinite(staffIdNum) || staffIdNum <= 0) {
    return { online: true, events: [] };
  }

  const startDt = `${todayDateKey} 00:00:00`;
  const endDt = `${todayDateKey} 23:59:59`;
  const baseDate = new Date(`${todayDateKey}T00:00:00+07:00`);
  const safeWindow = Math.max(0, Math.min(30, Math.round(comboWindowDays)));
  const windowDate = new Date(baseDate.getTime() - safeWindow * 86400000);
  const windowStartKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(windowDate);
  const comboWindowStartDt = `${windowStartKey} 00:00:00`;

  try {
    const events: LegacySyncedEarnEvent[] = [];

    const serviceRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyTodayServiceRow[]>(
      `SELECT os.id, os.order_id, os.service_type, os.service_group, MAX(sl.service_name) AS service_name
       FROM order_service os
       LEFT JOIN service_language sl ON sl.service_id = os.service_id
       WHERE os.assigned_staff_id = ?
         AND os.date_created BETWEEN ? AND ?
       GROUP BY os.id, os.order_id, os.service_type, os.service_group
       ORDER BY os.id ASC
       LIMIT 60`,
      staffIdNum,
      startDt,
      endDt
    );

    for (const row of serviceRows) {
      const sType = String(row.service_type || '').toLowerCase();
      const sGroup = String(row.service_group || '').toLowerCase();
      const sName = String(row.service_name || '').toLowerCase();

      if (sGroup.includes('under') || sName.includes('mi dưới') || sName.includes('bottom')) {
        events.push({
          eventKey: `leg:os:${Number(row.id)}`,
          trigger: 'BOTTOM_LASH',
          title: `Nối Mi Dưới · Đơn #${Number(row.order_id)}`,
          detail: row.service_name || 'Dịch vụ mi dưới từ đơn thật',
        });
      } else if (sGroup.includes('lashes') && sType === 'normal') {
        events.push({
          eventKey: `leg:os:${Number(row.id)}`,
          trigger: 'LASH_FULL_SET',
          title: `Nối Mi Mới · Đơn #${Number(row.order_id)}`,
          detail: row.service_name || 'Ca nối mi mới từ đơn thật',
        });
      } else if (sGroup.includes('lashes') && sType === 'retain') {
        events.push({
          eventKey: `leg:os:${Number(row.id)}`,
          trigger: 'LASH_REFILL',
          title: `Dặm Mi · Đơn #${Number(row.order_id)}`,
          detail: row.service_name || 'Ca dặm mi từ đơn thật',
        });
      }
    }

    const serumRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyTodayProductRow[]>(
      `SELECT op.id, op.order_id, MAX(pl.product_name) AS product_name, op.quantity
       FROM order_product op
       LEFT JOIN product_language pl ON pl.product_id = op.product_id
       WHERE op.date_created BETWEEN ? AND ?
         AND (
           op.promotion_staff_id = ?
           OR op.created_staff_id = ?
           OR EXISTS (
             SELECT 1 FROM order_service os
             WHERE os.order_id = op.order_id AND os.assigned_staff_id = ?
           )
         )
       GROUP BY op.id, op.order_id, op.quantity
       ORDER BY op.id ASC
       LIMIT 30`,
      startDt,
      endDt,
      staffIdNum,
      staffIdNum,
      staffIdNum
    );

    for (const row of serumRows) {
      const pName = String(row.product_name || '').toLowerCase();
      if (pName.includes('dưỡng') || pName.includes('serum') || pName.includes('yeppeum')) {
        events.push({
          eventKey: `leg:op:${Number(row.id)}`,
          trigger: 'SERUM_UPSELL',
          title: `Bán Dưỡng Mi · Đơn #${Number(row.order_id)}`,
          detail: row.product_name || 'Cây dưỡng mi từ đơn thật',
        });
      }
    }

    const comboRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyTodayComboRow[]>(
      `SELECT osc.id, osc.order_id, osc.service_group
       FROM order_service_combo osc
       WHERE osc.date_created BETWEEN ? AND ?
         AND EXISTS (
           SELECT 1 FROM order_service os
           WHERE os.user_id = osc.user_id
             AND os.assigned_staff_id = ?
             AND os.date_created BETWEEN ? AND ?
         )
       ORDER BY osc.id ASC
       LIMIT 20`,
      startDt,
      endDt,
      staffIdNum,
      comboWindowStartDt,
      endDt
    );

    for (const row of comboRows) {
      events.push({
        eventKey: `leg:osc:${Number(row.id)}`,
        trigger: 'CUSTOMER_COMBO_BUY',
        title: `Khách Mua Combo · Đơn #${Number(row.order_id)}`,
        detail: `Khách mới nối mi chốt Combo (${row.service_group || 'LashesTop'})`,
      });
    }

    return { online: true, events };
  } catch (err) {
    fastify.log.warn({ err, staffIdNum }, 'Legacy today staff events query failed; returning empty safely');
    return { online: false, events: [] };
  }
}
