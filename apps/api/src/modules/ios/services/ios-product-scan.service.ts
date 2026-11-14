import mysql from 'mysql2/promise';
import { IosScanProductRequest, IosScanProductResponse, SafeAny } from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, defaultIosOverrideRepo } from './ios-overrides.service.js';

export interface ScannedWarehouseCandidateRow {
  inventoryWarehouseItemId: number;
  inventoryWarehouseId: number;
  inventoryItemId: number;
  firstInventoryWarehouseOrderItemId: number;
  scanCode: string;
  itemState: string;
  warehouseClientStoreId: number;
  warehouseDisabled: number;
  storeName: string | null;
  productId: number | null;
  productSku: string | null;
  productDisabled: number | null;
  productName: string | null;
  unitPrice: number | null;
}

export interface ProductScanOrderRow {
  id: number;
  clientStoreId: number;
  orderState: string;
}

export interface ProductScanOrderProductConflictRow {
  orderId: number;
  orderState: string;
}

export interface IosProductScanDeps {
  findOrderById?: (bookingId: number) => Promise<ProductScanOrderRow | null>;
  findWarehouseCandidatesByCode?: (
    rawCode: string,
    numericSerial: number | null
  ) => Promise<ScannedWarehouseCandidateRow[]>;
  findActiveOrderProductConflict?: (warehouseItemId: number) => Promise<ProductScanOrderProductConflictRow | null>;
  loadBookingOverride?: (bookingId: number) => Promise<BookingOverrideRecord | null>;
  listBookingOverrides?: () => Promise<Array<{ bookingId: number; override: BookingOverrideRecord }>>;
}

function cleanProductDisplayName(rawName: string | null | undefined): string {
  return String(rawName || '')
    .replace(/\s*\(\s*Giá gốc[^)]*\)/gi, '')
    .trim();
}

function resolveCvProductBonus(productSku: string | null, productName: string): number {
  const haystack = `${productSku || ''} ${productName}`.toLowerCase();
  if (haystack.includes('yeppeum') || haystack.includes('dưỡng mi')) {
    return 100000;
  }
  return 0;
}

function extractUnitIdsFromOverride(override: BookingOverrideRecord | null | undefined): number[] {
  const ids: number[] = [];
  const items = Array.isArray(override?.cartProducts) ? override.cartProducts : [];
  for (const item of items) {
    const units = Array.isArray(item?.scannedUnits) ? item.scannedUnits : [];
    for (const unit of units) {
      const id = Number(unit?.inventoryWarehouseItemId || 0);
      if (id > 0) ids.push(id);
    }
  }
  return ids;
}

function buildDefaultDeps(): Required<IosProductScanDeps> {
  return {
    async findOrderById(bookingId: number): Promise<ProductScanOrderRow | null> {
      const pool = getLegacyPool();
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id, client_store_id AS clientStoreId, order_state AS orderState
         FROM \`order\`
         WHERE id = ?
         LIMIT 1`,
        [bookingId]
      );
      if (!rows.length) return null;
      return {
        id: Number(rows[0].id),
        clientStoreId: Number(rows[0].clientStoreId || 0),
        orderState: String(rows[0].orderState || ''),
      };
    },

    async findWarehouseCandidatesByCode(
      rawCode: string,
      numericSerial: number | null
    ): Promise<ScannedWarehouseCandidateRow[]> {
      const pool = getLegacyPool();
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT iwi.id AS inventoryWarehouseItemId,
                iwi.inventory_warehouse_id AS inventoryWarehouseId,
                iwi.inventory_item_id AS inventoryItemId,
                COALESCE(iwi.first_inventory_warehouse_order_item_id, 0) AS firstInventoryWarehouseOrderItemId,
                iwi.scan_code AS scanCode,
                iwi.item_state AS itemState,
                COALESCE(iw.client_store_id, 0) AS warehouseClientStoreId,
                COALESCE(iw.is_disabled, 0) AS warehouseDisabled,
                csl.client_store_name AS storeName,
                p.id AS productId,
                p.product_sku AS productSku,
                p.is_disabled AS productDisabled,
                COALESCE(pl_vi.product_name, pl_en.product_name, p.product_sku) AS productName,
                COALESCE(pp.product_price, pp_any.product_price, 0) AS unitPrice
         FROM inventory_warehouse_item iwi
         LEFT JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
         LEFT JOIN client_store_language csl ON csl.client_store_id = iw.client_store_id AND csl.language_id = 1
         LEFT JOIN product p ON p.inventory_item_id = iwi.inventory_item_id AND p.is_disabled = 0
         LEFT JOIN product_language pl_vi ON pl_vi.product_id = p.id AND pl_vi.language_id = 2
         LEFT JOIN product_language pl_en ON pl_en.product_id = p.id AND pl_en.language_id = 1
         LEFT JOIN product_price pp ON pp.product_id = p.id AND pp.currency_id = 1
         LEFT JOIN product_price pp_any ON pp_any.product_id = p.id
         WHERE iwi.scan_code = ?
            OR (? IS NOT NULL AND iwi.first_inventory_warehouse_order_item_id = ?)
         ORDER BY CASE WHEN iwi.item_state = 'New' THEN 0 ELSE 1 END, iwi.id ASC
         LIMIT 20`,
        [rawCode, numericSerial, numericSerial]
      );
      return rows.map((row) => ({
        inventoryWarehouseItemId: Number(row.inventoryWarehouseItemId),
        inventoryWarehouseId: Number(row.inventoryWarehouseId || 0),
        inventoryItemId: Number(row.inventoryItemId || 0),
        firstInventoryWarehouseOrderItemId: Number(row.firstInventoryWarehouseOrderItemId || 0),
        scanCode: String(row.scanCode || ''),
        itemState: String(row.itemState || ''),
        warehouseClientStoreId: Number(row.warehouseClientStoreId || 0),
        warehouseDisabled: Number(row.warehouseDisabled || 0),
        storeName: row.storeName ? String(row.storeName) : null,
        productId: row.productId !== null && row.productId !== undefined ? Number(row.productId) : null,
        productSku: row.productSku ? String(row.productSku) : null,
        productDisabled:
          row.productDisabled !== null && row.productDisabled !== undefined ? Number(row.productDisabled) : null,
        productName: row.productName ? String(row.productName) : null,
        unitPrice: row.unitPrice !== null && row.unitPrice !== undefined ? Number(row.unitPrice) : null,
      }));
    },

    async findActiveOrderProductConflict(warehouseItemId: number): Promise<ProductScanOrderProductConflictRow | null> {
      const pool = getLegacyPool();
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT op.order_id AS orderId, COALESCE(o.order_state, '') AS orderState
         FROM order_product op
         JOIN \`order\` o ON o.id = op.order_id
         WHERE op.inventory_warehouse_item_id = ?
           AND o.order_state != 'Cancelled'
         ORDER BY op.id DESC
         LIMIT 1`,
        [warehouseItemId]
      );
      if (!rows.length) return null;
      return {
        orderId: Number(rows[0].orderId),
        orderState: String(rows[0].orderState || ''),
      };
    },

    loadBookingOverride: defaultIosOverrideRepo.loadBookingOverride,
    listBookingOverrides: defaultIosOverrideRepo.listBookingOverrides,
  };
}

export async function scanIosProductByCode(
  authUser: IosAuthContext,
  body: Partial<IosScanProductRequest> | SafeAny,
  depsOverride?: IosProductScanDeps
): Promise<{ statusCode: number; payload: IosScanProductResponse }> {
  const deps = { ...buildDefaultDeps(), ...depsOverride };
  const bookingId = Number(body?.bookingId || 0);
  const rawInput = String(body?.code || '').trim();
  const normalizedCode = rawInput.replace(/^#/, '').trim();

  if (!bookingId || bookingId <= 0) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Thiếu bookingId để xác thực kho chi nhánh.' },
    };
  }
  if (!normalizedCode) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Vui lòng quét mã QR hoặc nhập mã / số serial trên tem sản phẩm.' },
    };
  }

  const [orderRow, currentOverride] = await Promise.all([
    deps.findOrderById(bookingId),
    deps.loadBookingOverride(bookingId),
  ]);

  const demoBooking = INITIAL_BOOKINGS.find((b) => b.id === bookingId);
  if (!orderRow && !demoBooking) {
    return {
      statusCode: 404,
      payload: { success: false, error: `Không tìm thấy đơn hàng #${bookingId} trong hệ thống.` },
    };
  }

  const bookingStoreId = Number(orderRow?.clientStoreId || demoBooking?.storeId || authUser.clientStoreId || 0);
  const numericSerial = /^\d+$/.test(normalizedCode) ? Number(normalizedCode) : null;

  const candidates = await deps.findWarehouseCandidatesByCode(rawInput, numericSerial);
  if (candidates.length === 0 && rawInput !== normalizedCode) {
    const strippedCandidates = await deps.findWarehouseCandidatesByCode(normalizedCode, numericSerial);
    candidates.push(...strippedCandidates);
  }

  if (candidates.length === 0) {
    return {
      statusCode: 404,
      payload: {
        success: false,
        error: `Không tìm thấy mã QR / serial "${rawInput}" trong hệ thống kho.`,
      },
    };
  }

  const storeMatches =
    bookingStoreId > 0 ? candidates.filter((c) => Number(c.warehouseClientStoreId) === bookingStoreId) : candidates;

  if (storeMatches.length === 0) {
    const foundBranch = candidates[0].storeName || `chi nhánh #${candidates[0].warehouseClientStoreId}`;
    const serialLabel = candidates[0].firstInventoryWarehouseOrderItemId
      ? `#${candidates[0].firstInventoryWarehouseOrderItemId}`
      : normalizedCode;
    return {
      statusCode: 409,
      payload: {
        success: false,
        error: `Tem ${serialLabel} thuộc kho ${foundBranch}, không thuộc kho chi nhánh của đơn hiện tại.`,
      },
    };
  }

  const activeCatalogMatches = storeMatches.filter(
    (c) =>
      Number(c.warehouseDisabled || 0) === 0 && Number(c.productId || 0) > 0 && Number(c.productDisabled || 0) === 0
  );
  if (activeCatalogMatches.length === 0) {
    return {
      statusCode: 409,
      payload: {
        success: false,
        error: 'Mã kho này chưa liên kết với sản phẩm bán lẻ đang hoạt động trong catalog.',
      },
    };
  }

  const newStateMatches = activeCatalogMatches.filter((c) => c.itemState === 'New');
  if (newStateMatches.length === 0) {
    const sample = activeCatalogMatches[0];
    const serialLabel = sample.firstInventoryWarehouseOrderItemId
      ? `#${sample.firstInventoryWarehouseOrderItemId}`
      : normalizedCode;
    const stateDesc =
      sample.itemState === 'Used'
        ? 'đã được bán / xuất kho (Used)'
        : sample.itemState === 'Using'
          ? 'đang ở trạng thái sử dụng nội bộ (Using), chỉ chấp nhận tem New'
          : `đang ở trạng thái ${sample.itemState}`;
    return {
      statusCode: 409,
      payload: {
        success: false,
        error: `Tem ${serialLabel} ${stateDesc}. Vui lòng quét cây mới còn nguyên tem (New).`,
      },
    };
  }

  const requestScannedIds = new Set<number>(
    Array.isArray(body?.scannedItemIds)
      ? body.scannedItemIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
      : []
  );
  for (const id of extractUnitIdsFromOverride(currentOverride)) {
    requestScannedIds.add(id);
  }

  const matched = newStateMatches[0];
  const serialDisplay =
    matched.firstInventoryWarehouseOrderItemId > 0
      ? `#${matched.firstInventoryWarehouseOrderItemId}`
      : matched.scanCode;

  if (requestScannedIds.has(matched.inventoryWarehouseItemId)) {
    return {
      statusCode: 409,
      payload: {
        success: false,
        error: `Tem ${serialDisplay} đã được quét trong đơn hàng hiện tại rồi.`,
      },
    };
  }

  const legacyOrderConflict = await deps.findActiveOrderProductConflict(matched.inventoryWarehouseItemId);
  if (legacyOrderConflict && legacyOrderConflict.orderId !== bookingId) {
    return {
      statusCode: 409,
      payload: {
        success: false,
        error: `Tem ${serialDisplay} đã được gắn vào đơn hàng #${legacyOrderConflict.orderId} (${legacyOrderConflict.orderState}).`,
      },
    };
  }

  const allOverrides = await deps.listBookingOverrides();
  for (const entry of allOverrides) {
    if (entry.bookingId === bookingId) continue;
    if (String(entry.override?.status || '').toUpperCase() === 'CANCELLED') continue;
    const heldIds = extractUnitIdsFromOverride(entry.override);
    if (heldIds.includes(matched.inventoryWarehouseItemId)) {
      return {
        statusCode: 409,
        payload: {
          success: false,
          error: `Tem ${serialDisplay} đang nằm trong giỏ của đơn hàng #${entry.bookingId}.`,
        },
      };
    }
  }

  const cleanName =
    cleanProductDisplayName(matched.productName) || matched.productSku || `Sản phẩm #${matched.productId}`;
  const isYeppeum =
    `${matched.productSku || ''} ${cleanName}`.toLowerCase().includes('yeppeum') ||
    cleanName.toLowerCase().includes('dưỡng mi');
  const resolvedPrice =
    Number(matched.unitPrice || 0) > 0 ? Math.round(Number(matched.unitPrice)) : isYeppeum ? 1100000 : 0;

  return {
    statusCode: 200,
    payload: {
      success: true,
      product: {
        productId: Number(matched.productId),
        productSku: String(matched.productSku || ''),
        productName: cleanName,
        unitPrice: resolvedPrice,
        cvBonus: resolveCvProductBonus(matched.productSku, cleanName),
        inventoryItemId: matched.inventoryItemId,
        inventoryWarehouseId: matched.inventoryWarehouseId,
        clientStoreId: matched.warehouseClientStoreId,
        storeName: matched.storeName,
        scannedUnit: {
          inventoryWarehouseItemId: matched.inventoryWarehouseItemId,
          firstInventoryWarehouseOrderItemId: matched.firstInventoryWarehouseOrderItemId,
          scanCode: matched.scanCode,
        },
      },
    },
  };
}
