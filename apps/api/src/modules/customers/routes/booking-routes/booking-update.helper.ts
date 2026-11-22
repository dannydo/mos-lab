import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { BookingPromotionService } from '../../services/booking-promotion.service.js';
import { BookingUpdateValidationError } from '../../services/booking-update.service.js';

export type BookingUpdateActionType = 'RESCHEDULE' | 'CHANGE_CV' | 'CHANGE_STORE' | 'EDIT';

export const resolveUpdateServiceState = async (
  fastify: FastifyInstance,
  params: {
    orderId: number;
    orderTotalPrice: unknown;
    orderDurationMinutes: unknown;
    requestedServiceIdRaw: number | null | undefined;
  }
) => {
  const { orderId, orderTotalPrice, orderDurationMinutes, requestedServiceIdRaw } = params;

  const existingServices = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT id, service_id, service_group, service_price, discount_amount, total_price, promotion_id
     FROM order_service WHERE order_id = ? ORDER BY service_price DESC LIMIT 1`,
    orderId
  );
  const existingService = existingServices[0] || null;
  const hasServiceChange = requestedServiceIdRaw !== undefined && requestedServiceIdRaw !== null;
  const requestedServiceId = hasServiceChange ? Number(requestedServiceIdRaw) : null;
  if (
    hasServiceChange &&
    (requestedServiceId === null || !Number.isInteger(requestedServiceId) || requestedServiceId < 0)
  ) {
    throw new BookingUpdateValidationError('Dịch vụ được chọn không hợp lệ. Vui lòng chọn lại dịch vụ.');
  }

  let finalServiceId = hasServiceChange ? requestedServiceId! : Number(existingService?.service_id || 0) || null;
  if (finalServiceId === 0) finalServiceId = 1; // Map virtual "Any - Lashes 2" to the legacy service.

  let srvPrice = Number(existingService?.service_price || orderTotalPrice || 0);
  let srvDuration = Number(orderDurationMinutes) || 90;
  let serviceGroup = String(existingService?.service_group || 'LashesTop');

  if (finalServiceId) {
    const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT s.duration_minute_standard as duration,
              sp.service_price as price,
              COALESCE(NULLIF(s.service_group, ''), 'LashesTop') as serviceGroup
       FROM service s
       LEFT JOIN service_price sp
         ON s.id = sp.service_id
         AND sp.service_price_package_key = 'single'
         AND sp.currency_id = 2
         AND sp.is_disabled = 0
       WHERE s.id = ? LIMIT 1`,
      finalServiceId
    );
    if (srvInfo.length > 0) {
      srvPrice = Math.round(Number(srvInfo[0].price || 0));
      srvDuration = Number(srvInfo[0].duration || 90);
      serviceGroup = String(srvInfo[0].serviceGroup || serviceGroup);
    } else if (hasServiceChange) {
      throw new BookingUpdateValidationError('Dịch vụ đã chọn không còn tồn tại. Vui lòng chọn lại dịch vụ.');
    }
  }

  return { existingService, finalServiceId, srvPrice, srvDuration, serviceGroup };
};

export const resolveUpdatePromotionState = async (
  fastify: FastifyInstance,
  params: {
    requestBody: object;
    order: SafeAny;
    existingService: SafeAny;
    finalCustomerId: number;
    finalServiceId: number | null;
    srvPrice: number;
    bookingDate: string;
    promotionId: number | null | undefined;
    campaignPromotionId: number | null | undefined;
  }
) => {
  const {
    requestBody,
    order,
    existingService,
    finalCustomerId,
    finalServiceId,
    srvPrice,
    bookingDate,
    promotionId,
    campaignPromotionId,
  } = params;

  const currentPromotionId = Number(order.selected_promotion_id || order.promotion_id || 0) || null;
  const currentCustomCampaign = await BookingPromotionService.getCustomCampaignContext(fastify, currentPromotionId);
  const hasPromotionSelection =
    Object.prototype.hasOwnProperty.call(requestBody, 'promotionId') ||
    Object.prototype.hasOwnProperty.call(requestBody, 'campaignPromotionId');
  const selectedPromotionId = hasPromotionSelection
    ? (promotionId ?? null)
    : currentCustomCampaign
      ? null
      : currentPromotionId;
  const selectedCampaignPromotionId = hasPromotionSelection
    ? (campaignPromotionId ?? null)
    : (currentCustomCampaign?.campaignPromotionId ?? null);

  const isKeepingCurrentService = Number(existingService?.service_id || 0) === Number(finalServiceId || 0);
  const mayKeepInactiveLegacyPromotion = Boolean(
    !hasPromotionSelection && currentPromotionId && !currentCustomCampaign && isKeepingCurrentService
  );
  const activeCurrentPromotion = mayKeepInactiveLegacyPromotion
    ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        'SELECT id FROM promotion WHERE id = ? AND is_disabled = 0 LIMIT 1',
        currentPromotionId
      )
    : [];
  const shouldKeepInactiveLegacyPromotion = mayKeepInactiveLegacyPromotion && activeCurrentPromotion.length === 0;

  // A historical appointment can reference a legacy campaign promotion whose CRM campaign
  // has already been retired. Moving its time without changing its service must retain the
  // booked price instead of rejecting the reschedule for an offer that is no longer selectable.
  const promotionResolution = shouldKeepInactiveLegacyPromotion
    ? {
        source: 'NONE' as const,
        legacyPromotionId: currentPromotionId,
        legacyCampaignId: Number(order.campaign_id || 0) || null,
        discountAmount: Math.round(Number(existingService?.discount_amount || 0)),
        finalPrice: Math.round(Number(existingService?.total_price ?? order.total_price ?? 0)),
        campaignPromotionTag: null,
        campaignPromotionId: null,
      }
    : await BookingPromotionService.resolve(fastify, {
        customerId: finalCustomerId,
        serviceId: finalServiceId,
        basePrice: srvPrice,
        bookingDate,
        promotionId: selectedPromotionId,
        campaignPromotionId: selectedCampaignPromotionId,
        allowedCampaignId: currentCustomCampaign?.campaignId ?? null,
      });

  return { currentCustomCampaign, promotionResolution };
};

export const buildUpdatedBookingNote = (
  baseNote: string | null | undefined,
  oldCustomTag: string | null | undefined,
  newCustomTag: string | null | undefined
): string => {
  let finalBookingNote = String(baseNote || '').trim();
  if (oldCustomTag) {
    finalBookingNote = finalBookingNote
      .split(/\r?\n/)
      .filter((line) => line.trim() !== oldCustomTag)
      .join('\n')
      .trim();
  }
  if (newCustomTag) {
    finalBookingNote = finalBookingNote ? `${finalBookingNote}\n${newCustomTag}` : newCustomTag;
  }
  return finalBookingNote;
};

export const determineBookingActionType = (params: {
  oldStartStr: string;
  mysqlStart: string;
  oldTechnicianId: unknown;
  finalTechnicianId: number | null;
  oldStoreId: unknown;
  finalStoreId: number;
}): BookingUpdateActionType => {
  const { oldStartStr, mysqlStart, oldTechnicianId, finalTechnicianId, oldStoreId, finalStoreId } = params;
  if (oldStartStr !== mysqlStart) {
    return 'RESCHEDULE';
  }
  if (Number(oldTechnicianId || 0) !== Number(finalTechnicianId || 0)) {
    return 'CHANGE_CV';
  }
  if (Number(oldStoreId) !== Number(finalStoreId)) {
    return 'CHANGE_STORE';
  }
  return 'EDIT';
};

export interface PersistBookingUpdateParams {
  fastify: FastifyInstance;
  orderId: number;
  actorLegacyStaffId: number | null;
  mysqlStart: string;
  mysqlEnd: string;
  finalTechnicianId: number | null;
  finalStoreId: number;
  finalBookingNote: string;
  duration: number;
  totalPrice: number;
  legacyPromotionId: number | null;
  legacyCampaignId: number | null;
  discountAmount: number;
  finalOrderState: string;
  comboSaleRequired: number;
  isNew: number;
  isLockedScheduleUpdateRequested: boolean;
  didTechnicianChange: boolean;
  existingService: SafeAny;
  finalServiceId: number | null;
  serviceGroup: string;
  srvPrice: number;
  userServiceType: string;
}

export const persistBookingUpdateTransaction = async (params: PersistBookingUpdateParams): Promise<void> => {
  const {
    fastify,
    orderId,
    actorLegacyStaffId,
    mysqlStart,
    mysqlEnd,
    finalTechnicianId,
    finalStoreId,
    finalBookingNote,
    duration,
    totalPrice,
    legacyPromotionId,
    legacyCampaignId,
    discountAmount,
    finalOrderState,
    comboSaleRequired,
    isNew,
    isLockedScheduleUpdateRequested,
    didTechnicianChange,
    existingService,
    finalServiceId,
    serviceGroup,
    srvPrice,
    userServiceType,
  } = params;

  // Keep all legacy writes atomic. A rejected service or a later write failure
  // must not leave the appointment time updated while its service is unchanged.
  await fastify.prisma.legacy.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE \`order\`
       SET booking_date_start = ?,
           booking_date_end = ?,
           assigned_staff_id = ?,
           client_store_id = ?,
           booking_note = ?,
           booking_duration_minute = ?,
           total_price = ?,
           promotion_id = ?,
           selected_promotion_id = ?,
           campaign_id = ?,
           order_state = ?,
           combo_sale_required = ?,
           is_new = ?,
           date_updated = NOW()
       WHERE id = ?`,
      mysqlStart,
      mysqlEnd,
      finalTechnicianId,
      finalStoreId,
      finalBookingNote || null,
      duration,
      totalPrice,
      legacyPromotionId,
      legacyPromotionId,
      legacyCampaignId,
      finalOrderState,
      comboSaleRequired,
      isNew,
      orderId
    );

    if (isLockedScheduleUpdateRequested || didTechnicianChange) {
      await tx.$executeRawUnsafe(
        `INSERT INTO order_booking_date_change (
          created_staff_id, order_id, client_store_id, assigned_staff_id,
          booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        actorLegacyStaffId,
        orderId,
        finalStoreId,
        finalTechnicianId,
        finalBookingNote || null,
        duration,
        mysqlStart,
        mysqlEnd
      );
    }

    if (existingService && finalServiceId) {
      await tx.$executeRawUnsafe(
        `UPDATE order_service
         SET service_id = ?,
             service_group = ?,
             duration_minute = ?,
             service_price = ?,
             discount_amount = ?,
             total_price = ?,
             promotion_id = ?,
             assigned_staff_id = ?,
             booked_staff_id = ?,
             user_service_type = ?
         WHERE id = ?`,
        finalServiceId,
        serviceGroup,
        duration,
        srvPrice,
        discountAmount,
        totalPrice,
        legacyPromotionId,
        finalTechnicianId,
        finalTechnicianId,
        userServiceType,
        existingService.id
      );
    } else if (finalServiceId) {
      await tx.$executeRawUnsafe(
        `INSERT INTO order_service (
           order_id, service_id, duration_minute, service_price, discount_amount, total_price,
           promotion_id, service_group, assigned_staff_id, booked_staff_id, user_service_type, date_created
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        orderId,
        finalServiceId,
        duration,
        srvPrice,
        discountAmount,
        totalPrice,
        legacyPromotionId,
        serviceGroup,
        finalTechnicianId,
        finalTechnicianId,
        userServiceType
      );
    } else {
      await tx.$executeRawUnsafe(
        `UPDATE order_service
         SET assigned_staff_id = ?, booked_staff_id = ?, user_service_type = ?
         WHERE order_id = ?`,
        finalTechnicianId,
        finalTechnicianId,
        userServiceType,
        orderId
      );
    }
  });
};
