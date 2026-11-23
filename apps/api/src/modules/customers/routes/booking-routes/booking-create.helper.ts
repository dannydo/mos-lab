import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { BookingPromotionService } from '../../services/booking-promotion.service.js';
import { BookingSaleClassificationService } from '../../services/booking-sale-classification.service.js';
import { UserServiceTypeService } from '../../services/user-service-type.service.js';
import { AllocationLedgerService } from '../../../allocation/allocation-ledger.service.js';

export interface BookingAuthUser {
  role: string;
  id: number;
  displayName?: string;
}

export interface CreateBookingBody {
  customerId?: unknown;
  newCustomerName?: string;
  newCustomerPhone?: string;
  storeId?: number | string;
  storeName?: string;
  serviceId?: number | string;
  serviceName?: string;
  technicianId?: number | string | null;
  technicianName?: string;
  bookingDate?: string;
  bookingTime?: string;
  bookingChannel?: string;
  bookingNote?: string;
  promotionId?: number | string | null;
  campaignPromotionId?: number | string | null;
  referralPhone?: string | null;
  isForeign?: unknown;
  is_foreign?: unknown;
}

export const parseExplicitForeignStatus = (isForeign: unknown, isForeignSnake: unknown): boolean | undefined => {
  if (typeof isForeign === 'boolean') return isForeign;
  if (typeof isForeignSnake === 'boolean') return isForeignSnake;
  return undefined;
};

export const parseNumericCustomerId = (customerId: unknown): number | null => {
  if (customerId === undefined || customerId === null || customerId === '') {
    return null;
  }
  const parsed = Number(String(customerId).replace(/\D/g, ''));
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
};

export const resolveCreateServiceInfo = async (fastify: FastifyInstance, requestedServiceId: SafeAny) => {
  let finalServiceId = requestedServiceId;
  if (finalServiceId === 0) {
    finalServiceId = 1; // Map to "Any - Lashes 2" to satisfy foreign key constraint
  }

  let srvPrice = 0;
  let srvDuration = 90;
  let serviceGroup = 'LashesTop';
  const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT s.duration_minute_standard as duration,
            sp.service_price as price,
            COALESCE(NULLIF(s.service_group, ''), 'LashesTop') as serviceGroup
     FROM service s
     LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
     WHERE s.id = ? LIMIT 1`,
    finalServiceId
  );
  if (srvInfo.length > 0) {
    srvPrice = Number(srvInfo[0].price || 0);
    srvDuration = Number(srvInfo[0].duration || 90);
    serviceGroup = String(srvInfo[0].serviceGroup || serviceGroup);
  }

  // If virtual service 0 was selected, keep the price 0 and duration 90
  if (requestedServiceId === 0) {
    srvPrice = 0;
    srvDuration = 90;
  }

  return { finalServiceId, srvPrice, srvDuration, serviceGroup };
};

const formatLocalMySQL = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const computeCreateBookingWindow = (
  bookingDate: string | undefined,
  bookingTime: string | undefined,
  srvDuration: number
) => {
  const dateClean = (bookingDate || new Date().toISOString().slice(0, 10)).trim();
  const timeClean = (bookingTime || '09:00').trim();
  const timeWithSec = timeClean.length === 5 ? `${timeClean}:00` : timeClean;
  const startStr = `${dateClean}T${timeWithSec}`;
  let startDate = new Date(startStr);
  if (isNaN(startDate.getTime())) {
    startDate = new Date();
  }
  const endDate = new Date(startDate.getTime() + srvDuration * 60 * 1000);

  return {
    startDate,
    mysqlStart: formatLocalMySQL(startDate),
    mysqlEnd: formatLocalMySQL(endDate),
  };
};

export const fetchBookerProfileName = async (
  fastify: FastifyInstance,
  validStaffId: number | null,
  fallbackDisplayName?: string
): Promise<string> => {
  if (validStaffId) {
    const staffProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
      validStaffId
    );
    if (staffProfile.length > 0 && staffProfile[0].full_name) {
      return String(staffProfile[0].full_name);
    }
  }
  return fallbackDisplayName || '';
};

export const buildCreateBookingNote = (bookingNote: string | undefined, campaignPromotionTag: string): string => {
  let finalBookingNote = (bookingNote || '').trim();
  if (campaignPromotionTag && !finalBookingNote.includes(campaignPromotionTag)) {
    finalBookingNote = finalBookingNote ? `${finalBookingNote}\n${campaignPromotionTag}` : campaignPromotionTag;
  }
  return finalBookingNote;
};

export interface PersistNewBookingParams {
  fastify: FastifyInstance;
  validStaffId: number | null;
  storeId: number | string | undefined;
  finalCustomerId: number;
  finalServiceId: SafeAny;
  technicianId: number | string | null | undefined;
  bookingChannel: string | undefined;
  finalBookingNote: string;
  srvDuration: number;
  srvPrice: number;
  serviceGroup: string;
  startDate: Date;
  mysqlStart: string;
  mysqlEnd: string;
  promotionResolution: Awaited<ReturnType<typeof BookingPromotionService.resolve>>;
}

export const persistNewLegacyBooking = async (params: PersistNewBookingParams): Promise<number> => {
  const {
    fastify,
    validStaffId,
    storeId,
    finalCustomerId,
    finalServiceId,
    technicianId,
    bookingChannel,
    finalBookingNote,
    srvDuration,
    srvPrice,
    serviceGroup,
    startDate,
    mysqlStart,
    mysqlEnd,
    promotionResolution,
  } = params;

  const selectedPromoId = promotionResolution.legacyPromotionId;
  const campaignId = promotionResolution.legacyCampaignId;
  const discountAmount = promotionResolution.discountAmount;
  const finalPrice = promotionResolution.finalPrice;

  const { isNew, comboSaleRequired } = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify,
    Number(finalCustomerId),
    startDate,
    serviceGroup
  );

  const orderKey = 'booking_' + Math.random().toString(36).substring(2, 12);
  await fastify.prisma.legacy.$executeRawUnsafe(
    `INSERT INTO \`order\` (
      client_id, client_business_id, created_staff_id, order_key, client_store_id, 
      user_id, currency_id, booking_note, booking_channels, booking_duration_minute, 
      booking_date_start, booking_date_end, total_quantity, total_price, order_state, 
      last_day_order_completed, combo_sale_required, is_new, is_debt, date_created, date_updated,
      promotion_id, selected_promotion_id, campaign_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
    11,
    1,
    validStaffId || null,
    orderKey,
    Number(storeId) || 1,
    Number(finalCustomerId),
    1,
    finalBookingNote || '',
    bookingChannel || 'FB',
    Number(srvDuration) || 90,
    mysqlStart,
    mysqlEnd,
    1,
    Number(finalPrice) || 0,
    'New',
    0,
    comboSaleRequired,
    isNew,
    0,
    selectedPromoId ? Number(selectedPromoId) : null,
    selectedPromoId ? Number(selectedPromoId) : null,
    campaignId ? Number(campaignId) : null
  );

  const insertedOrder = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT id FROM \`order\` WHERE order_key = ? LIMIT 1`,
    orderKey
  );
  if (insertedOrder.length === 0) {
    throw new Error('Failed to create booking order.');
  }
  const orderId = Number(insertedOrder[0].id);

  // Insert log record into order_booking_date_change to sync booker details and time on legacy frontend
  await fastify.prisma.legacy.$executeRawUnsafe(
    `INSERT INTO order_booking_date_change (
      created_staff_id, order_id, client_store_id, assigned_staff_id, 
      booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    validStaffId || null,
    orderId,
    Number(storeId) || 1,
    technicianId ? Number(technicianId) : null,
    finalBookingNote || '',
    Number(srvDuration) || 90,
    mysqlStart,
    mysqlEnd
  );

  const userServiceType = await UserServiceTypeService.determineUserServiceType(
    fastify,
    finalCustomerId,
    mysqlStart,
    serviceGroup
  );

  await fastify.prisma.legacy.$executeRawUnsafe(
    `INSERT INTO order_service (
      client_id, client_business_id, user_id, order_id, service_id, 
      service_type, service_group, user_service_type, assigned_staff_id, booked_staff_id, 
      duration_minute, quantity, service_price, discount_amount, paid_credit_amount, 
      tax_amount, balance_price, upgrade_price, downgrade_price, refund_price, total_price, date_created
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    11,
    1,
    Number(finalCustomerId),
    orderId,
    Number(finalServiceId) || 1,
    'Normal',
    serviceGroup,
    userServiceType || 'lead_book',
    technicianId ? Number(technicianId) : null,
    technicianId ? Number(technicianId) : null,
    Number(srvDuration) || 90,
    1,
    Number(srvPrice) || 0,
    Number(discountAmount) || 0,
    0,
    0,
    0,
    0,
    0,
    0,
    Number(finalPrice) || 0
  );

  return orderId;
};

export const autoAssignBookingCustomerIfUnowned = async (
  fastify: FastifyInstance,
  finalCustomerId: number,
  staffId: number
): Promise<void> => {
  const existingAssignment = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
    where: { legacyUserId: finalCustomerId },
  });

  if (existingAssignment) {
    return;
  }

  const crmStaffExists = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: staffId },
  });

  if (!crmStaffExists) {
    return;
  }

  const batchId = `alloc_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await fastify.prisma.crm.$transaction(async (tx) => {
    await AllocationLedgerService.setOwner(tx, {
      customerId: finalCustomerId,
      nextStaffId: staffId,
      actorStaffId: staffId,
      eventType: 'ACCEPTED',
      previousStaffId: null,
      reason: 'Booker tạo lịch hẹn cho khách chưa có chủ sở hữu',
      sourceType: 'BOOKING',
      actionContext: 'BOOKING_AUTO_ASSIGN',
      batchId,
    });
    await tx.crmAssignmentHistory.create({
      data: {
        batchId,
        legacyUserId: finalCustomerId,
        prevStaffId: null,
        newStaffId: staffId,
        assignedBy: staffId,
      },
    });
  });
};

export const recordCampaignBookingActivity = async (
  fastify: FastifyInstance,
  params: {
    campaignPromotionId: SafeAny;
    finalCustomerId: number;
    user: BookingAuthUser;
    campaignPromotionTag: string;
  }
): Promise<void> => {
  const { campaignPromotionId, finalCustomerId, user, campaignPromotionTag } = params;
  if (!campaignPromotionId) {
    return;
  }

  try {
    const campaignPromo = await fastify.prisma.crm.crmCampaignPromotion.findUnique({
      where: { id: Number(campaignPromotionId) },
      include: { campaign: true },
    });

    if (!campaignPromo) {
      return;
    }

    const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId: campaignPromo.campaignId,
        legacyUserId: finalCustomerId,
        removedAt: null,
      },
    });

    if (campaignCustomer) {
      const firstTouchpoint = await fastify.prisma.crm.crmCampaignTouchpoint.findFirst({
        where: { campaignId: campaignPromo.campaignId },
        orderBy: { sortOrder: 'asc' },
      });

      if (firstTouchpoint) {
        await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
          where: {
            campaignCustomerId_touchpointId: {
              campaignCustomerId: campaignCustomer.id,
              touchpointId: firstTouchpoint.id,
            },
          },
          create: {
            campaignCustomerId: campaignCustomer.id,
            touchpointId: firstTouchpoint.id,
            isChecked: true,
            completedAt: new Date(),
            completedByStaffId: user.id,
            completedByStaffName: user.displayName || `Staff #${user.id}`,
            note: `Đặt lịch thành công - Ưu đãi: ${campaignPromo.name}`,
          },
          update: {
            isChecked: true,
            completedAt: new Date(),
            completedByStaffId: user.id,
            completedByStaffName: user.displayName || `Staff #${user.id}`,
            note: `Đặt lịch thành công - Ưu đãi: ${campaignPromo.name}`,
          },
        });
      }
    }

    await fastify.prisma.crm.crmCallLog.create({
      data: {
        legacyUserId: finalCustomerId,
        staffId: user.id,
        callType: 'CAMPAIGN_BOOKING',
        callResult: 'BOOKED',
        note: `Tạo lịch thành công kèm ưu đãi ${campaignPromotionTag}`,
      },
    });
  } catch (logErr) {
    fastify.log.warn({ err: logErr }, 'Failed to record campaign touchpoint/call log');
  }
};
