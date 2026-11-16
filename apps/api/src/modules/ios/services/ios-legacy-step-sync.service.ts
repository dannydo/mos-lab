import mysql from 'mysql2/promise';
import { SafeAny } from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import {
  defaultCallLegacyPhpEndpoint,
  DEMO_BOOKING_IDS,
  resolveActiveLegacyStaffToken,
  SettleLegacyOrderBridgeDeps,
} from './ios-legacy-bridge.service.js';
import { buildLegacyOrderPayloads, resolveLegacyOrderCatalogSnapshot } from './ios-legacy-payload.mapper.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';

export const STEP_SYNC_ELIGIBLE_ACTIONS = new Set([
  'CHECK_IN',
  'SAVE_CONSULTATION',
  'ASSIGN_STAFF',
  'START_SERVICE',
  'UPDATE_PROGRESS',
  'SAVE_PROGRESS',
  'COMPLETE_SURVEY',
  'SAVE_SURVEY',
  'SAVE_UPSELL_AND_CHECKOUT',
  'REVERT_TO_INCOMING',
]);

export type SyncIosStepBridgeDeps = Pick<
  SettleLegacyOrderBridgeDeps,
  'getPool' | 'resolveCatalog' | 'resolveAuthToken' | 'callEndpoint' | 'waitNextSecond'
>;

export interface SyncIosStepParams {
  bookingId: number;
  action: string;
  mergedOverride: BookingOverrideRecord;
  actorStaffId: number;
  checkInStaffId: number;
  assignedStaffId: number;
  checkOutStaffId: number;
  isSimulationMode: boolean;
  isDemoRequest?: boolean;
  previousLastLegacyProgressState?: string;
}

export interface SyncIosStepResult {
  synced: boolean;
  status: 'SYNCED' | 'SKIPPED' | 'DEFERRED';
  legacyOrderState?: string;
  lastLegacyProgressState?: string;
  warning?: string;
}

const PRE_CHECKIN_STATES = new Set(['New', 'Confirmed', 'Parking', '']);
const DONE_OR_LATER_STATES = new Set(['ServiceCompleted', 'CheckOut', 'Completed']);

function mapOverrideOrderStateToLegacyServiceState(rawOrderState: string | undefined): string | null {
  const normalized = String(rawOrderState || '').trim();
  switch (normalized) {
    case 'Preparation':
    case 'Photo before auto-saved':
      return 'Preparation';
    case 'Service Start':
    case 'ServiceStart':
      return 'ServiceStart';
    case 'Service Cleaned':
    case 'ServiceCleaned':
    case 'Photo cleaned auto-saved':
      return 'ServiceCleaned';
    case 'Service End':
    case 'ServiceEnd':
    case 'Photo after auto-saved':
      return 'ServiceEnd';
    case 'Service Completed':
    case 'ServiceCompleted':
      return 'ServiceCompleted';
    default:
      return null;
  }
}

function sanitizeServicesForAssignment(
  services: Array<Record<string, SafeAny>>,
  assignedStaffId: number
): Array<Record<string, SafeAny>> {
  if (assignedStaffId > 0) {
    return services;
  }
  return services.map((svc) => {
    const { assigned_staff_id: _omittedStaffId, ...rest } = svc;
    return rest;
  });
}

function buildStepConsultationPayload(
  basePayload: Record<string, SafeAny>,
  assignedStaffId: number
): Record<string, SafeAny> {
  const sanitizedServices = sanitizeServicesForAssignment(
    Array.isArray(basePayload.selected_service) ? basePayload.selected_service : [],
    assignedStaffId
  );
  if (assignedStaffId > 0) {
    return {
      ...basePayload,
      assigned_staff_id: String(assignedStaffId),
      selected_service: sanitizedServices,
      assigned_staff: sanitizedServices.map(() => ({ user_id: String(assignedStaffId) })),
    };
  }
  const { assigned_staff_id: _dropStaffId, assigned_staff: _dropStaffArr, ...rest } = basePayload;
  return {
    ...rest,
    selected_service: sanitizedServices,
  };
}

export async function persistRetainLashCountsToLegacy(
  bookingId: number,
  incomingProgress: Record<string, SafeAny>,
  getPoolOverride?: () => mysql.Pool
): Promise<void> {
  if (bookingId <= 0 || bookingId >= 900_000_000 || DEMO_BOOKING_IDS.has(bookingId)) {
    return;
  }
  if (incomingProgress.retainLashCountLeft === undefined && !incomingProgress.retainLashes) {
    return;
  }

  let progressPool: mysql.Pool;
  try {
    progressPool = (getPoolOverride || getLegacyPool)();
  } catch {
    return;
  }

  try {
    const leftVal = incomingProgress.retainLashCountLeft ?? incomingProgress.retainLashes?.left;
    const rightVal = incomingProgress.retainLashCountRight ?? incomingProgress.retainLashes?.right;
    if (leftVal === undefined || rightVal === undefined) {
      return;
    }

    const [osRows] = await progressPool.query<mysql.RowDataPacket[]>(
      'SELECT id FROM order_service WHERE order_id = ? ORDER BY id ASC LIMIT 1',
      [Number(bookingId)]
    );
    if (osRows.length > 0) {
      const osId = osRows[0].id;
      const groupKey = String(Math.floor(Date.now() / 1000));
      await progressPool.query(
        `INSERT INTO item_attribute_value (client_id, client_business_id, type, item_id, attribute_id, attribute_option_value, group_key, date_created)
         VALUES (11, 1, 'service-retain-attribute', ?, 17, ?, ?, NOW()),
                (11, 1, 'service-retain-attribute', ?, 18, ?, ?, NOW())`,
        [osId, String(leftVal), groupKey, osId, String(rightVal), groupKey]
      );
    }
  } catch (dbErr) {
    console.warn('[ios-actions] Failed to persist retain lash counts to legacy DB:', dbErr);
  }
}

export async function syncIosStepWithLegacyPhp(
  params: SyncIosStepParams,
  deps?: Partial<SyncIosStepBridgeDeps>
): Promise<SyncIosStepResult> {
  const {
    bookingId,
    action,
    mergedOverride,
    actorStaffId,
    checkInStaffId,
    assignedStaffId,
    checkOutStaffId,
    isSimulationMode,
    isDemoRequest = false,
    previousLastLegacyProgressState,
  } = params;

  if (
    isSimulationMode ||
    isDemoRequest ||
    bookingId <= 0 ||
    bookingId >= 900_000_000 ||
    DEMO_BOOKING_IDS.has(bookingId) ||
    !STEP_SYNC_ELIGIBLE_ACTIONS.has(action)
  ) {
    return { synced: false, status: 'SKIPPED' };
  }

  let pool: mysql.Pool;
  try {
    pool = (deps?.getPool || getLegacyPool)();
  } catch {
    return {
      synced: false,
      status: 'DEFERRED',
      warning: 'Legacy database pool is not configured in this environment.',
    };
  }

  try {
    const catalog = deps?.resolveCatalog
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
      return { synced: false, status: 'SKIPPED' };
    }

    if (catalog.currentOrderState === 'Completed' && action !== 'REVERT_TO_INCOMING') {
      return { synced: false, status: 'SKIPPED', legacyOrderState: 'Completed' };
    }

    const authToken = await (deps?.resolveAuthToken || resolveActiveLegacyStaffToken)(pool, [
      actorStaffId,
      checkOutStaffId,
      assignedStaffId,
      checkInStaffId,
    ]);
    if (!authToken) {
      return {
        synced: false,
        status: 'DEFERRED',
        warning: 'No active Legacy PHP staff token available.',
      };
    }

    const callPhp = deps?.callEndpoint || defaultCallLegacyPhpEndpoint;
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
      promotionId:
        mergedOverride.promotionId !== undefined ? mergedOverride.promotionId : mergedOverride.billing?.promotionId,
      appliedPromotion: mergedOverride.appliedPromotion,
      servicePromotionId: mergedOverride.servicePromotionId,
      servicePromotion: mergedOverride.servicePromotion,
      comboPromotionId: mergedOverride.comboPromotionId,
      comboPromotion: mergedOverride.comboPromotion,
      underComboPromotionId: mergedOverride.underComboPromotionId,
      underComboPromotion: mergedOverride.underComboPromotion,
      billing: mergedOverride.billing,
      catalog,
    });

    let effectiveOrderState = catalog.currentOrderState;
    let activeOrderServiceIds = [...catalog.existingOrderServiceIds];

    const refreshOrderServiceIds = async () => {
      if (deps?.resolveCatalog) return;
      const [refreshedOs] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT id FROM order_service WHERE order_id = ? ORDER BY id ASC',
        [bookingId]
      );
      if (refreshedOs.length > 0) {
        activeOrderServiceIds = refreshedOs.map((r) => Number(r.id));
        const withIds = built.selectedService.map((svc, idx) =>
          activeOrderServiceIds[idx] ? { ...svc, order_service_id: String(activeOrderServiceIds[idx]) } : svc
        );
        built.selectedService = withIds;
        built.consultationPayload.selected_service = withIds;
        if (built.preConsultationUpperAttrPayload) {
          built.preConsultationUpperAttrPayload.selected_service = withIds;
        }
      }
    };

    const ensureCheckedIn = async (): Promise<{ ok: boolean; warning?: string }> => {
      if (!PRE_CHECKIN_STATES.has(effectiveOrderState)) {
        return { ok: true };
      }
      const res = await callPhp(
        '/order/booking/check-in',
        withAuth(checkInStaffId || actorStaffId, {
          customer_user_id: String(catalog.customerUserId),
          order_id: String(bookingId),
          order_service_index: '0',
          selected_service: sanitizeServicesForAssignment(built.selectedService, assignedStaffId),
          attribute_value: built.checkInAttributeValue,
        })
      );
      if (!res.ok) {
        return { ok: false, warning: res.message || `Legacy check-in returned code ${res.code}` };
      }
      effectiveOrderState = 'CheckIn';
      await refreshOrderServiceIds();
      return { ok: true };
    };

    const ensureConsulted = async (): Promise<{ ok: boolean; warning?: string }> => {
      const checkInRes = await ensureCheckedIn();
      if (!checkInRes.ok) return checkInRes;

      const consultActorId = Number(mergedOverride.consultedByStaffId || actorStaffId || checkInStaffId);
      if (built.preConsultationUpperAttrPayload) {
        const preRes = await callPhp(
          '/order/booking/consultation',
          withAuth(consultActorId, buildStepConsultationPayload(built.preConsultationUpperAttrPayload, assignedStaffId))
        );
        if (!preRes.ok) {
          return { ok: false, warning: preRes.message || `Legacy pre-consultation returned code ${preRes.code}` };
        }
        await refreshOrderServiceIds();
        const waitStep =
          deps?.waitNextSecond ||
          (deps?.callEndpoint ? async () => {} : () => new Promise<void>((resolve) => setTimeout(resolve, 1100)));
        await waitStep();
      }

      const consultRes = await callPhp(
        '/order/booking/consultation',
        withAuth(consultActorId, buildStepConsultationPayload(built.consultationPayload, assignedStaffId))
      );
      if (!consultRes.ok) {
        return { ok: false, warning: consultRes.message || `Legacy consultation returned code ${consultRes.code}` };
      }
      await refreshOrderServiceIds();
      effectiveOrderState = assignedStaffId > 0 ? 'Consultation' : 'CheckIn';
      return { ok: true };
    };

    if (action === 'CHECK_IN') {
      if (!PRE_CHECKIN_STATES.has(catalog.currentOrderState)) {
        return { synced: false, status: 'SKIPPED', legacyOrderState: catalog.currentOrderState };
      }
      const res = await ensureCheckedIn();
      if (!res.ok) {
        return { synced: false, status: 'DEFERRED', warning: res.warning };
      }
      return { synced: true, status: 'SYNCED', legacyOrderState: 'CheckIn' };
    }

    if (action === 'SAVE_CONSULTATION' || action === 'ASSIGN_STAFF') {
      const res = await ensureConsulted();
      if (!res.ok) {
        return { synced: false, status: 'DEFERRED', warning: res.warning };
      }
      return {
        synced: true,
        status: 'SYNCED',
        legacyOrderState: assignedStaffId > 0 ? 'Consultation' : 'CheckIn',
      };
    }

    if (action === 'START_SERVICE' || action === 'UPDATE_PROGRESS' || action === 'SAVE_PROGRESS') {
      const mappedState = mapOverrideOrderStateToLegacyServiceState(mergedOverride.orderState);
      if (
        !mappedState ||
        assignedStaffId <= 0 ||
        (mappedState === previousLastLegacyProgressState && catalog.currentOrderState === mappedState)
      ) {
        return {
          synced: false,
          status: 'SKIPPED',
          lastLegacyProgressState: previousLastLegacyProgressState,
        };
      }
      if (PRE_CHECKIN_STATES.has(effectiveOrderState) || effectiveOrderState === 'CheckIn') {
        const consultRes = await ensureConsulted();
        if (!consultRes.ok) {
          return { synced: false, status: 'DEFERRED', warning: consultRes.warning };
        }
      }
      if (activeOrderServiceIds.length === 0) {
        await refreshOrderServiceIds();
      }
      if (activeOrderServiceIds.length === 0) {
        return {
          synced: false,
          status: 'DEFERRED',
          warning: 'No legacy order_service found for progress sync.',
        };
      }
      for (const osId of activeOrderServiceIds) {
        const res =
          mappedState === 'ServiceCompleted'
            ? await callPhp(
                '/order/service/done',
                withAuth(assignedStaffId, {
                  order_service_id: String(osId),
                  assigned_staff_id: String(assignedStaffId),
                })
              )
            : await callPhp(
                '/order/service/progress/update',
                withAuth(assignedStaffId, {
                  order_service_id: String(osId),
                  assigned_staff_id: String(assignedStaffId),
                  service_state: mappedState,
                })
              );
        if (!res.ok) {
          return {
            synced: false,
            status: 'DEFERRED',
            warning: res.message || `Legacy progress update (${mappedState}) returned code ${res.code}`,
          };
        }
      }
      return {
        synced: true,
        status: 'SYNCED',
        legacyOrderState: mappedState,
        lastLegacyProgressState: mappedState,
      };
    }

    if (action === 'COMPLETE_SURVEY' || action === 'SAVE_SURVEY') {
      if (assignedStaffId <= 0) {
        return { synced: false, status: 'SKIPPED' };
      }
      if (PRE_CHECKIN_STATES.has(effectiveOrderState) || effectiveOrderState === 'CheckIn') {
        const consultRes = await ensureConsulted();
        if (!consultRes.ok) {
          return { synced: false, status: 'DEFERRED', warning: consultRes.warning };
        }
      }
      if (!DONE_OR_LATER_STATES.has(effectiveOrderState)) {
        for (const osId of activeOrderServiceIds) {
          const doneRes = await callPhp(
            '/order/service/done',
            withAuth(assignedStaffId, { order_service_id: String(osId), assigned_staff_id: String(assignedStaffId) })
          );
          if (!doneRes.ok) {
            return {
              synced: false,
              status: 'DEFERRED',
              warning: doneRes.message || `Legacy service/done returned code ${doneRes.code}`,
            };
          }
        }
      }
      if (Object.keys(catalog.staffFiveStarSurveyAnswers || {}).length > 0) {
        await callPhp(
          '/order/survey/staff/update',
          withAuth(assignedStaffId, { order_id: String(bookingId), survey_answer: catalog.staffFiveStarSurveyAnswers })
        );
      }
      return {
        synced: true,
        status: 'SYNCED',
        legacyOrderState: 'ServiceCompleted',
        lastLegacyProgressState: 'ServiceCompleted',
      };
    }

    if (action === 'SAVE_UPSELL_AND_CHECKOUT') {
      const checkInRes = await ensureCheckedIn();
      if (!checkInRes.ok) {
        return { synced: false, status: 'DEFERRED', warning: checkInRes.warning };
      }
      if (assignedStaffId > 0 && effectiveOrderState === 'CheckIn') {
        const consultRes = await ensureConsulted();
        if (!consultRes.ok) {
          return { synced: false, status: 'DEFERRED', warning: consultRes.warning };
        }
      }
      if (assignedStaffId > 0 && !DONE_OR_LATER_STATES.has(effectiveOrderState)) {
        for (const osId of activeOrderServiceIds) {
          await callPhp(
            '/order/service/done',
            withAuth(assignedStaffId, { order_service_id: String(osId), assigned_staff_id: String(assignedStaffId) })
          );
        }
      }
      for (const prod of catalog.products) {
        await callPhp(
          '/order/product/update',
          withAuth(checkOutStaffId || actorStaffId, {
            order_id: String(bookingId),
            product_id: String(prod.productId),
            inventory_warehouse_item_id: String(prod.inventoryWarehouseItemId),
            quantity: String(prod.quantity),
          })
        );
      }
      if (activeOrderServiceIds[0]) {
        const hasCustSurvey = Object.keys(catalog.customerHappySurveyAnswers || {}).length > 0;
        await callPhp(
          '/order/survey/customer/done',
          withAuth(checkOutStaffId || actorStaffId, {
            order_id: String(bookingId),
            order_service_id: String(activeOrderServiceIds[0]),
            ...(hasCustSurvey ? { survey_answer: catalog.customerHappySurveyAnswers } : {}),
          })
        );
      }
      const checkoutRes = await callPhp(
        '/order/booking/check-out/product',
        withAuth(checkOutStaffId || actorStaffId, { order_id: String(bookingId) })
      );
      if (!checkoutRes.ok) {
        return {
          synced: false,
          status: 'DEFERRED',
          warning: checkoutRes.message || `Legacy check-out/product returned code ${checkoutRes.code}`,
        };
      }
      return { synced: true, status: 'SYNCED', legacyOrderState: 'CheckOut' };
    }

    if (action === 'REVERT_TO_INCOMING') {
      if (['New', 'Confirmed', ''].includes(catalog.currentOrderState) || catalog.currentOrderState === 'Completed') {
        return { synced: false, status: 'SKIPPED', legacyOrderState: catalog.currentOrderState };
      }
      const revertRes = await callPhp(
        '/order/booking/update/incoming',
        withAuth(actorStaffId, { order_id: String(bookingId), order_service_index: '0' })
      );
      if (!revertRes.ok) {
        return {
          synced: false,
          status: 'DEFERRED',
          warning: revertRes.message || `Legacy update/incoming returned code ${revertRes.code}`,
        };
      }
      return { synced: true, status: 'SYNCED', legacyOrderState: 'Confirmed' };
    }

    return { synced: false, status: 'SKIPPED' };
  } catch (err: SafeAny) {
    return {
      synced: false,
      status: 'DEFERRED',
      warning: err?.message || 'Legacy PHP step sync network timeout or error.',
    };
  }
}
