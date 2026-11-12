import http from 'node:http';
import https from 'node:https';
import mysql from 'mysql2/promise';
import { IosSettlementStatus, SafeAny } from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { getLegacyPool } from './db-pools.js';
import { BookingOverrideRecord, LegacySettlementReceipt } from './ios-overrides.service.js';
import {
  buildLegacyOrderPayloads,
  LegacyOrderCatalogSnapshot,
  resolveLegacyOrderCatalogSnapshot,
} from './ios-legacy-payload.mapper.js';

export interface LegacyStaffAuthToken {
  authUserId: number;
  loginToken: string;
}

export interface LegacyPhpTransportResult {
  ok: boolean;
  status: string;
  code: string;
  message: string;
  data?: SafeAny;
}

export type LegacyPhpEndpointCaller = (
  endpointPath: string,
  payload: Record<string, SafeAny>
) => Promise<LegacyPhpTransportResult>;

export interface SettleLegacyOrderBridgeDeps {
  loadSettlementReceipt: (bookingId: number) => Promise<LegacySettlementReceipt | null>;
  saveSettlementReceipt: (bookingId: number, receipt: LegacySettlementReceipt) => Promise<void>;
  getPool?: () => mysql.Pool;
  resolveCatalog?: (
    pool: mysql.Pool,
    bookingId: number,
    state: BookingOverrideRecord
  ) => Promise<LegacyOrderCatalogSnapshot>;
  resolveAuthToken?: (pool: mysql.Pool, preferredStaffIds: number[]) => Promise<LegacyStaffAuthToken | null>;
  callEndpoint?: LegacyPhpEndpointCaller;
  waitNextSecond?: () => Promise<void>;
}

export interface SettleLegacyOrderResult {
  settlementStatus: IosSettlementStatus;
  orderState: string;
  bankTransferRef?: string;
  settledAt: string;
  idempotentHit: boolean;
  warning?: string;
}

const DEMO_BOOKING_IDS = new Set<number>(INITIAL_BOOKINGS.map((b) => Number(b.id)));

export function resolveLegacyPhpApiConfig(): { baseUrl: string; hostHeader?: string } {
  const explicit = String(process.env.LEGACY_PHP_API_URL || '').trim();
  const explicitHost = String(process.env.LEGACY_PHP_HOST_HEADER || '').trim();
  if (explicit) {
    return {
      baseUrl: explicit.replace(/\/+$/, ''),
      ...(explicitHost ? { hostHeader: explicitHost } : {}),
    };
  }

  const dbUrl = String(process.env.LEGACY_DATABASE_URL || '');
  const hostMatch = dbUrl.match(/@([^:/?#]+)/);
  const dbHost = hostMatch?.[1] || '';

  if (dbHost === '127.0.0.1' || dbHost === 'localhost') {
    return { baseUrl: 'http://127.0.0.1/1' };
  }

  if (dbHost.startsWith('192.168.')) {
    return {
      baseUrl: `http://${dbHost}/1`,
      hostHeader: 'api.orb',
    };
  }

  return { baseUrl: 'https://api.wingslashes.com/1' };
}

export async function defaultCallLegacyPhpEndpoint(
  endpointPath: string,
  payload: Record<string, SafeAny>
): Promise<LegacyPhpTransportResult> {
  const { baseUrl, hostHeader } = resolveLegacyPhpApiConfig();
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const targetUrl = new URL(`${baseUrl}${normalizedPath}`);
  const bodyStr = JSON.stringify(payload);
  const client = targetUrl.protocol === 'https:' ? https : http;

  const headers: Record<string, string | number> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr),
  };
  if (hostHeader) {
    headers.Host = hostHeader;
  }

  return new Promise<LegacyPhpTransportResult>((resolve, reject) => {
    const req = client.request(
      targetUrl,
      {
        method: 'POST',
        headers,
        timeout: 10_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const rawText = Buffer.concat(chunks).toString('utf8');
          let json: SafeAny;
          try {
            json = JSON.parse(rawText);
          } catch {
            json = null;
          }
          const httpOk = (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300;
          const status = String(json?.status ?? '0');
          const code = String(json?.code ?? String(res.statusCode || 500));
          const ok = httpOk && (status === '1' || status.toLowerCase() === 'success') && code === '0000';
          resolve({
            ok,
            status,
            code,
            message: String(json?.message || ''),
            data: json?.data,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Legacy PHP endpoint timeout: ${normalizedPath}`));
    });
    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

export async function resolveActiveLegacyStaffToken(
  pool: mysql.Pool,
  preferredStaffIds: number[]
): Promise<LegacyStaffAuthToken | null> {
  const validIds = Array.from(new Set(preferredStaffIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (validIds.length > 0) {
    const placeholders = validIds.map(() => '?').join(',');
    const [preferredRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT uat.user_id, uat.access_token
       FROM user_access_token uat
       JOIN user_profile up ON up.user_id = uat.user_id
       WHERE uat.access_token IS NOT NULL
         AND uat.access_token != ''
         AND (up.user_group_id != 1 OR uat.user_id = 3879)
         AND uat.user_id IN (${placeholders})
       ORDER BY (uat.date_expired > NOW()) DESC, uat.id DESC
       LIMIT 1`,
      validIds
    );
    if (preferredRows.length > 0) {
      return {
        authUserId: Number(preferredRows[0].user_id),
        loginToken: String(preferredRows[0].access_token),
      };
    }
  }

  const [fallbackRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT uat.user_id, uat.access_token
     FROM user_access_token uat
     JOIN user_profile up ON up.user_id = uat.user_id
     WHERE uat.access_token IS NOT NULL
       AND uat.access_token != ''
       AND (up.user_group_id != 1 OR uat.user_id = 3879)
     ORDER BY (uat.date_expired > NOW()) DESC, uat.id DESC
     LIMIT 1`
  );
  if (!fallbackRows.length) return null;

  return {
    authUserId: Number(fallbackRows[0].user_id),
    loginToken: String(fallbackRows[0].access_token),
  };
}

async function waitForReportOrderServiceRow(pool: mysql.Pool, orderId: number): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM report_order_service WHERE order_id = ?`,
      [orderId]
    );
    if (Number(rows?.[0]?.cnt || 0) > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

/**
 * Thực thi đồng bộ Idempotent đơn hàng từ /ios-app sang hệ thống Legacy PHP (WingsLashes):
 * 1. Bảo vệ tuyệt đối bằng khóa chống ghi trùng IOS_LEGACY_SETTLE:<orderId>.
 * 2. Gắn chuẩn xác check_in_staff_id, assigned_staff_id, check_out_staff_id trên order_service.
 * 3. Phân luồng an toàn két tiền & thuế (Điều răn A3 / VAT-001):
 *    - Đơn 0đ hoặc VIETQR: Chốt thẳng Completed + phát sinh report_order, staff_bonus, staff_tip, accountant_revenue.
 *    - Đơn Tiền mặt (CASH) hoặc Máy POS (> 0đ): Khóa ở trạng thái CheckOut + check_out_staff_id để Quầy thu tiền & bấm Completed.
 */
export async function settleIosOrderWithLegacyPhp(
  params: {
    bookingId: number;
    mergedOverride: BookingOverrideRecord;
    checkInStaffId: number;
    assignedStaffId: number;
    checkOutStaffId: number;
  },
  deps: SettleLegacyOrderBridgeDeps
): Promise<SettleLegacyOrderResult> {
  const { bookingId, mergedOverride, checkInStaffId, assignedStaffId, checkOutStaffId } = params;
  const nowIso = new Date().toISOString();

  if (DEMO_BOOKING_IDS.has(bookingId)) {
    return {
      settlementStatus: 'DEMO_ONLY',
      orderState: 'Completed',
      settledAt: nowIso,
      idempotentHit: false,
    };
  }

  const existingReceipt = await deps.loadSettlementReceipt(bookingId);
  if (existingReceipt?.settlementStatus === 'SETTLED_COMPLETED') {
    return {
      settlementStatus: 'SETTLED_COMPLETED',
      orderState: 'Completed',
      bankTransferRef: existingReceipt.bankTransferRef,
      settledAt: existingReceipt.settledAt,
      idempotentHit: true,
    };
  }

  const rawMethod = String(mergedOverride.billing?.paymentMethod || 'VIETQR').toUpperCase();
  const requestedMethod: 'CASH' | 'POS' | 'VIETQR' =
    rawMethod === 'CASH' ? 'CASH' : rawMethod === 'POS' ? 'POS' : 'VIETQR';
  const requestedGrandTotal = Math.max(0, Math.round(Number(mergedOverride.billing?.grandTotal ?? 0)));
  const wantsImmediateComplete = requestedGrandTotal <= 0 || requestedMethod === 'VIETQR';

  if (existingReceipt?.settlementStatus === 'PENDING_COUNTER_SETTLEMENT' && !wantsImmediateComplete) {
    return {
      settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
      orderState: 'CheckOut',
      settledAt: existingReceipt.settledAt,
      idempotentHit: true,
    };
  }

  let pool: mysql.Pool;
  try {
    pool = (deps.getPool || getLegacyPool)();
  } catch {
    return {
      settlementStatus: 'BRIDGE_DEFERRED',
      orderState: wantsImmediateComplete ? 'Completed' : 'CheckOut',
      settledAt: nowIso,
      idempotentHit: false,
      warning: 'Legacy database pool is not configured in this environment.',
    };
  }

  try {
    const catalog = deps.resolveCatalog
      ? await deps.resolveCatalog(pool, bookingId, mergedOverride)
      : await resolveLegacyOrderCatalogSnapshot(pool, {
          orderId: bookingId,
          serviceName: mergedOverride.serviceName,
          servicePrice: mergedOverride.servicePrice,
          serviceType: mergedOverride.serviceType,
          attributes: mergedOverride.attributes,
          hasUnderMink: mergedOverride.attributes?.hasUnderMink,
          underMinkServiceType: mergedOverride.attributes?.underMinkServiceType,
          selectedCombo: mergedOverride.selectedCombo,
          selectedUnderCombo: mergedOverride.selectedUnderCombo,
          cartProducts: mergedOverride.cartProducts,
        });

    if (!catalog.orderExists || catalog.upperService.serviceId <= 0) {
      return {
        settlementStatus: 'DEMO_ONLY',
        orderState: 'Completed',
        settledAt: nowIso,
        idempotentHit: false,
      };
    }

    if (catalog.currentOrderState === 'Completed') {
      const completedReceipt: LegacySettlementReceipt = {
        bookingId,
        settlementStatus: 'SETTLED_COMPLETED',
        orderState: 'Completed',
        paymentMethod: requestedMethod,
        grandTotal: requestedGrandTotal,
        bankTransferRef: mergedOverride.billing?.bankTransferRef,
        settledAt: nowIso,
      };
      await deps.saveSettlementReceipt(bookingId, completedReceipt);
      return {
        settlementStatus: 'SETTLED_COMPLETED',
        orderState: 'Completed',
        bankTransferRef: completedReceipt.bankTransferRef,
        settledAt: nowIso,
        idempotentHit: true,
      };
    }

    const authToken = await (deps.resolveAuthToken || resolveActiveLegacyStaffToken)(pool, [
      checkOutStaffId,
      assignedStaffId,
      checkInStaffId,
    ]);
    if (!authToken) {
      return {
        settlementStatus: 'BRIDGE_DEFERRED',
        orderState: wantsImmediateComplete ? 'Completed' : 'CheckOut',
        settledAt: nowIso,
        idempotentHit: false,
        warning: 'No active Legacy PHP staff token available.',
      };
    }

    const callPhp = deps.callEndpoint || defaultCallLegacyPhpEndpoint;
    const withAuth = (modifyStaffId: number, body: Record<string, SafeAny>): Record<string, SafeAny> => ({
      user_id: String(authToken.authUserId),
      login_token: authToken.loginToken,
      modify_staff_id: String(modifyStaffId),
      language_code: 'vi',
      language_id: '2',
      select_language_id: '2',
      client_business_id: '1',
      select_client_business_id: '1',
      select_client_store_id: String(catalog.clientStoreId),
      client_store_id: String(catalog.clientStoreId),
      device_platform: 'iOS',
      device_os: 'mOS-iOS-Bridge',
      ...body,
    });

    const built = buildLegacyOrderPayloads({
      orderId: bookingId,
      assignedStaffId,
      serviceType: mergedOverride.serviceType,
      upgradePrice: mergedOverride.upgradePrice,
      attributes: mergedOverride.attributes,
      hasUnderMink: mergedOverride.attributes?.hasUnderMink,
      underMinkServiceType: mergedOverride.attributes?.underMinkServiceType,
      isComboLive: Boolean(mergedOverride.comboRedemption?.redeemSession),
      hasUnderMinkCombo: false,
      selectedCombo: mergedOverride.selectedCombo,
      selectedUnderCombo: mergedOverride.selectedUnderCombo,
      comboRedemption: mergedOverride.comboRedemption,
      cartProducts: mergedOverride.cartProducts,
      servicePrice: mergedOverride.servicePrice,
      serviceName: mergedOverride.serviceName,
      billing: mergedOverride.billing,
      catalog,
    });

    // Bước 1: Check-in (nếu đơn đang ở New / Confirmed) để gắn check_in_staff_id chuẩn xác
    if (['New', 'Confirmed', ''].includes(catalog.currentOrderState)) {
      await callPhp(
        '/order/booking/check-in',
        withAuth(checkInStaffId, {
          customer_user_id: String(catalog.customerUserId),
          order_id: String(bookingId),
          order_service_index: '0',
          selected_service: built.selectedService,
          attribute_value: built.checkInAttributeValue,
        })
      );
    }

    // Bước 2: Consultation (lưu selected_service + selected_service_combo + tách riêng attribute_group_key time() giữa Mi Trên & Mi Dưới)
    let activeOrderServiceIds = [...catalog.existingOrderServiceIds];
    const syncOrderServiceIds = async () => {
      if (deps.resolveCatalog) return;
      const [refreshedOs] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id FROM order_service WHERE order_id = ? ORDER BY id ASC`,
        [bookingId]
      );
      if (refreshedOs.length > 0) {
        activeOrderServiceIds = refreshedOs.map((r) => Number(r.id));
        const withIds = built.selectedService.map((svc, idx) =>
          activeOrderServiceIds[idx] ? { ...svc, order_service_id: String(activeOrderServiceIds[idx]) } : svc
        );
        built.consultationPayload.selected_service = withIds;
        built.paymentUpdatePayload.selected_service = withIds;
      }
    };

    if (built.preConsultationUpperAttrPayload) {
      const preRes = await callPhp(
        '/order/booking/consultation',
        withAuth(checkInStaffId, built.preConsultationUpperAttrPayload)
      );
      if (!preRes.ok) {
        return {
          settlementStatus: 'BRIDGE_DEFERRED',
          orderState: wantsImmediateComplete ? 'Completed' : 'CheckOut',
          settledAt: nowIso,
          idempotentHit: false,
          warning: preRes.message || `Legacy pre-consultation returned code ${preRes.code}`,
        };
      }
      await syncOrderServiceIds();
      const waitStep =
        deps.waitNextSecond ||
        (deps.callEndpoint ? async () => {} : () => new Promise<void>((resolve) => setTimeout(resolve, 1100)));
      await waitStep();
    }

    const consultRes = await callPhp(
      '/order/booking/consultation',
      withAuth(checkInStaffId, built.consultationPayload)
    );
    if (!consultRes.ok) {
      return {
        settlementStatus: 'BRIDGE_DEFERRED',
        orderState: wantsImmediateComplete ? 'Completed' : 'CheckOut',
        settledAt: nowIso,
        idempotentHit: false,
        warning: consultRes.message || `Legacy consultation returned code ${consultRes.code}`,
      };
    }
    await syncOrderServiceIds();

    // Bước 3: Đồng bộ sản phẩm Dưỡng mi Yeppeum vào giỏ order_product (nếu có)
    for (const prod of catalog.products) {
      await callPhp(
        '/order/product/update',
        withAuth(checkOutStaffId, {
          order_id: String(bookingId),
          product_id: String(prod.productId),
          inventory_warehouse_item_id: String(prod.inventoryWarehouseItemId),
          quantity: String(prod.quantity),
        })
      );
    }

    // Bước 4: Hoàn tất ca kỹ thuật (/order/service/done -> kích hoạt FAL-001 ưu tiên xoay tua)
    for (const osId of activeOrderServiceIds) {
      await callPhp(
        '/order/service/done',
        withAuth(assignedStaffId, { order_service_id: String(osId), assigned_staff_id: String(assignedStaffId) })
      );
    }

    const hasStaffSurveyAnswers = Object.keys(catalog.staffFiveStarSurveyAnswers || {}).length > 0;
    const hasCustomerSurveyAnswers = Object.keys(catalog.customerHappySurveyAnswers || {}).length > 0;

    // Bước 5: Lưu tự đánh giá kỹ thuật 5 sao vào ItemSurveyAnswer
    if (hasStaffSurveyAnswers) {
      await callPhp(
        '/order/survey/staff/update',
        withAuth(assignedStaffId, { order_id: String(bookingId), survey_answer: catalog.staffFiveStarSurveyAnswers })
      );
    }

    // Bước 6: Khóa CheckOut & gắn chặt check_out_staff_id cho toàn bộ order_service của đơn
    if (activeOrderServiceIds[0]) {
      await callPhp(
        '/order/survey/customer/done',
        withAuth(checkOutStaffId, {
          order_id: String(bookingId),
          order_service_id: String(activeOrderServiceIds[0]),
          ...(hasCustomerSurveyAnswers ? { survey_answer: catalog.customerHappySurveyAnswers } : {}),
        })
      );
    }
    await callPhp('/order/booking/check-out/product', withAuth(checkOutStaffId, { order_id: String(bookingId) }));

    // Bước 7 (Cổng Két Tiền & Thuế A3): Dừng ở CheckOut nếu CASH/POS > 0đ
    if (!built.shouldSettleCompletedImmediately) {
      await deps.saveSettlementReceipt(bookingId, {
        bookingId,
        settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
        orderState: 'CheckOut',
        paymentMethod: built.paymentMethod,
        grandTotal: built.grandTotal,
        settledAt: nowIso,
      });
      return {
        settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
        orderState: 'CheckOut',
        settledAt: nowIso,
        idempotentHit: false,
      };
    }

    // Đơn 0đ hoặc VIETQR: chốt thẳng /order/payment/update + /order/booking/generate/report
    const paymentRes = await callPhp('/order/payment/update', withAuth(checkOutStaffId, built.paymentUpdatePayload));
    if (!paymentRes.ok) {
      return {
        settlementStatus: 'BRIDGE_DEFERRED',
        orderState: 'CheckOut',
        bankTransferRef: built.bankTransferRef || undefined,
        settledAt: nowIso,
        idempotentHit: false,
        warning: paymentRes.message || `Legacy payment/update returned code ${paymentRes.code}`,
      };
    }

    await callPhp('/order/booking/generate/report', withAuth(checkOutStaffId, { order_id: String(bookingId) }));

    // Chờ report_order_service sinh xong rồi gọi lại survey/staff/update để giải ngân staff_bonus technician
    if (hasStaffSurveyAnswers && !deps.callEndpoint) {
      if (await waitForReportOrderServiceRow(pool, bookingId)) {
        await callPhp(
          '/order/survey/staff/update',
          withAuth(assignedStaffId, { order_id: String(bookingId), survey_answer: catalog.staffFiveStarSurveyAnswers })
        );
      }
    }

    await deps.saveSettlementReceipt(bookingId, {
      bookingId,
      settlementStatus: 'SETTLED_COMPLETED',
      orderState: 'Completed',
      paymentMethod: built.paymentMethod,
      grandTotal: built.grandTotal,
      bankTransferRef: built.bankTransferRef || undefined,
      settledAt: nowIso,
    });

    return {
      settlementStatus: 'SETTLED_COMPLETED',
      orderState: 'Completed',
      bankTransferRef: built.bankTransferRef || undefined,
      settledAt: nowIso,
      idempotentHit: false,
    };
  } catch (err: SafeAny) {
    return {
      settlementStatus: 'BRIDGE_DEFERRED',
      orderState: wantsImmediateComplete ? 'Completed' : 'CheckOut',
      settledAt: nowIso,
      idempotentHit: false,
      warning: err?.message || 'Legacy PHP bridge network timeout or error.',
    };
  }
}
