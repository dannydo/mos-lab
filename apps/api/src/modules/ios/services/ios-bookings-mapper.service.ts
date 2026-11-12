import {
  filterBookingsForCvlScope,
  IosBookingItem,
  IosBookingStatus,
  IosCartProductItem,
  IosSegmentCounts,
  resolveIosCustomerTypeIcon,
  resolveIosHasDiscountTag,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';
import { IosCustomerEnrichmentContext, RawIosOrderSnapshot } from './ios-bookings-sql.service.js';
import {
  computeBookingFinancials,
  formatPhoneNumberDots,
  formatTime12h,
  formatTimeSlot,
  resolveBookingStatusFromState,
  resolveCustomerAvatar,
  resolveStaffAvatar,
} from './ios-bookings-formatters.js';

export function mapLiveOrdersToBookings(params: {
  orders: RawIosOrderSnapshot[];
  customerContext: IosCustomerEnrichmentContext;
  overrides: Record<string, BookingOverrideRecord>;
  customerAvatarMap: Record<string, string>;
  storeId: number;
  targetDate: string;
  todayVn: string;
  activeStaffId: number;
  canViewFullPhone: boolean;
}): IosBookingItem[] {
  const {
    orders,
    customerContext,
    overrides,
    customerAvatarMap,
    storeId,
    targetDate,
    todayVn,
    activeStaffId,
    canViewFullPhone,
  } = params;

  return orders.map((r, index) => {
    const override = overrides[String(r.id)] || {};
    const state = override.orderState || r.order_state;
    const status = resolveBookingStatusFromState(override.status, state, targetDate, todayVn);

    const duration = Number(r.booking_duration_minute) || 90;
    const servicePrice = Number(override.servicePrice ?? r.total_price) || 550000;
    const orderNum = r.order_number ? `BK-${r.order_number}` : `BK-${r.id}`;
    const note = r.booking_note || '';
    const visits = Number(r.total_visits) || 0;
    const isNew = Number(r.is_new) || 0;
    const customerId = Number(r.user_id) || 0;

    const checkInStaffId = override.checkInStaffId ?? (r.check_in_staff_id ? Number(r.check_in_staff_id) : undefined);
    const checkInStaffName = override.checkInStaffName ?? r.check_in_staff_name ?? undefined;
    const checkInStaffTier = override.checkInStaffTier ?? undefined;

    const checkOutStaffId =
      override.checkOutStaffId ?? (r.check_out_staff_id ? Number(r.check_out_staff_id) : undefined);
    const checkOutStaffName = override.checkOutStaffName ?? r.check_out_staff_name ?? undefined;
    const checkOutStaffTier = override.checkOutStaffTier ?? undefined;

    const isDbUnassigned = !r.assigned_staff_id || Number(r.assigned_staff_id) === 0;
    const isServicingOrDone =
      status === 'SERVICING' ||
      status === 'DONE' ||
      Boolean(checkInStaffId) ||
      Boolean(override.assignedStaffId) ||
      Boolean(r.check_in_staff_id) ||
      Boolean(r.assigned_staff_id && Number(r.assigned_staff_id) > 0);
    const isUnassignedQueue = !override.assignedStaffId && isDbUnassigned && !checkInStaffId && !isServicingOrDone;

    const assignedStaffId = isUnassignedQueue
      ? 0
      : Number(override.assignedStaffId ?? r.assigned_staff_id ?? checkInStaffId ?? 0);
    const assignedStaffName = isUnassignedQueue
      ? 'Chờ phân công (Đầu tua)'
      : override.assignedStaffName ||
        (r.staff_name && r.staff_name !== 'Chưa phân công' ? r.staff_name : checkInStaffName || 'Chuyên Viên');

    const comboInfo = customerContext.comboBalanceMap.get(customerId) || {
      isComboLive: false,
      remainingSessions: 0,
      normalRemaining: 0,
      retainRemaining: 0,
      comboName: 'Chưa có gói ❖ Live',
      serviceKey: undefined,
      packageKey: undefined,
      retainDaysLimit: 21,
      upsellOpportunity: true,
    };

    const selectedCombo = override.selectedCombo || null;
    const selectedUnderCombo = override.selectedUnderCombo || null;
    const comboRedemption = override.comboRedemption || null;
    const cartProducts: IosCartProductItem[] = Array.isArray(override.cartProducts) ? override.cartProducts : [];
    const upgradePrice = Number(override.upgradePrice || 0);

    const { cvRewardBreakdown, billing } = computeBookingFinancials({
      servicePrice,
      upgradePrice,
      isComboLive: Boolean(comboInfo.isComboLive),
      selectedCombo,
      selectedUnderCombo,
      comboRedemption,
      cartProducts,
      overrideBilling: override.billing,
      assignedStaffId,
      checkInStaffId,
      checkOutStaffId,
      activeStaffId,
    });

    const isAnyPlaceholder = (name?: string | null) =>
      !name ||
      name.toLowerCase().includes('any') ||
      String(r.service_key || '')
        .toLowerCase()
        .includes('any') ||
      Number(r.is_temporary) === 1;

    const customerHistory = customerContext.lashHistoryMap.get(customerId) ?? [];

    let effectiveServiceName =
      override.serviceName && !isAnyPlaceholder(override.serviceName) ? String(override.serviceName) : '';

    if (!effectiveServiceName) {
      if (!isAnyPlaceholder(r.service_name)) {
        effectiveServiceName = r.service_name;
      } else if (comboInfo.isComboLive && comboInfo.comboName) {
        effectiveServiceName = comboInfo.comboName;
      } else if (customerHistory.length > 0) {
        const validHistory = customerHistory.find((h) => !isAnyPlaceholder(h.serviceName));
        if (validHistory?.serviceName) {
          effectiveServiceName = validHistory.serviceName;
        }
      }
    }

    if (!effectiveServiceName) {
      const mat = customerContext.lastVisitSpecsMap.get(customerId)?.material || 'HyperLight';
      if (mat === 'HyperLight') {
        effectiveServiceName = 'New Hyperlight 550';
      } else if (mat === 'Ivylight') {
        effectiveServiceName = 'Ivylight 4L 1220';
      } else {
        effectiveServiceName = visits > 1 ? 'New Flawless Mink 770' : 'Chưa chọn mẫu mi (Tư vấn)';
      }
    }

    const lastSpecs = customerContext.lastVisitSpecsMap.get(customerId);
    const resolvedStoreId = Number(r.client_store_id) || storeId;
    const isBookedAdvanceMatch = Boolean(
      (r.booked_staff_id && Number(r.booked_staff_id) > 0 && Number(r.booked_staff_id) === assignedStaffId) ||
      note.toLowerCase().includes('book') ||
      note.toLowerCase().includes('chỉ định')
    );

    return {
      id: Number(r.id),
      orderNumber: orderNum,
      customerName: (r.customer_name || 'Khách').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim(),
      customerPhone: formatPhoneNumberDots(r.customer_phone, !canViewFullPhone),
      customerId,
      diamondBalance: customerContext.diamondBalanceMap.get(customerId) ?? 0,
      customerAvatar:
        (override.customerAvatar !== undefined ? override.customerAvatar : customerAvatarMap[String(customerId)]) ||
        resolveCustomerAvatar(r.customer_avatar, customerId),
      assignedStaffAvatar: resolveStaffAvatar(r.staff_avatar || r.check_in_staff_avatar),
      customerVisits: visits || 1,
      customerNote: note,
      timeSlot: formatTimeSlot(r.booking_date_start, duration),
      time12h: formatTime12h(r.booking_date_start),
      storeId: resolvedStoreId,
      branchCode: resolvedStoreId === 16 ? 'EP' : 'DT',
      branchName: resolvedStoreId === 16 ? 'Estella Place' : 'Đề Thám',
      serviceName: effectiveServiceName,
      serviceType: override.serviceType || r.service_type || 'Normal',
      servicePrice,
      serviceDuration: duration,
      bookerName: r.booker_name,
      bookerAvatar: resolveCustomerAvatar(r.booker_avatar),
      customerTypeIcon: resolveIosCustomerTypeIcon(note, visits, isNew),
      hasDiscountTag: resolveIosHasDiscountTag(note, Number(r.combo_sale_required), r.promotion_id),
      assignedStaffName,
      assignedStaffId,
      isUnassignedQueue,
      isNextQueueCustomer: isUnassignedQueue,
      isBookedInAdvance: !isUnassignedQueue && assignedStaffId > 0 && isBookedAdvanceMatch,
      isTuaAssigned: !isUnassignedQueue && assignedStaffId > 0 && !isBookedAdvanceMatch,
      bookingAccessTag: isUnassignedQueue
        ? 'NEXT_QUEUE_CUSTOMER'
        : assignedStaffId === activeStaffId || checkInStaffId === activeStaffId || checkOutStaffId === activeStaffId
          ? 'MY_BOOKED_CUSTOMER'
          : 'STORE_CUSTOMER',
      checkInStaffId,
      checkInStaffName,
      checkInStaffTier,
      checkInStaffAvatar: resolveCustomerAvatar(r.check_in_staff_avatar),
      checkOutStaffId,
      checkOutStaffName,
      checkOutStaffTier,
      checkOutStaffAvatar: resolveCustomerAvatar(r.check_out_staff_avatar),
      assignedBed: override.assignedBed || `Giường 0${(index % 6) + 1}`,
      status,
      comboLiveStatus: {
        isComboLive: comboInfo.isComboLive,
        remainingSessions: comboInfo.remainingSessions,
        normalRemaining: comboInfo.normalRemaining,
        retainRemaining: comboInfo.retainRemaining,
        comboName: comboInfo.comboName,
        serviceKey: comboInfo.serviceKey,
        packageKey: comboInfo.packageKey,
        retainDaysLimit: comboInfo.retainDaysLimit ?? 25,
        upsellOpportunity: !comboInfo.isComboLive,
      },
      underMinkComboStatus: customerContext.underMinkComboMap.get(customerId),
      lashHistory: customerHistory,
      selectedCombo,
      selectedUnderCombo,
      comboRedemption,
      attributes:
        override.attributes ||
        (() => {
          const isFirstVisitClient = isNew === 1 || visits <= 1;
          const svcLower = effectiveServiceName.toLowerCase();
          const isHyper = svcLower.includes('hyperlight');
          const isClassic = svcLower.includes('classic');
          const isIvy = svcLower.includes('ivylight');
          const isUltra = svcLower.includes('ultralight');
          const defaultMat = isHyper
            ? 'HyperLight'
            : isClassic
              ? 'New Classic'
              : isIvy
                ? 'Ivylight'
                : isUltra
                  ? 'UltraLight'
                  : 'Flawless Mink';
          const defaultVol = isHyper ? '2X' : isIvy ? '4L' : isUltra ? '4D' : '1D';
          const defaultCount = isHyper ? '70 fan' : isIvy ? '90 nhịp' : '90 sợi';
          return {
            material: lastSpecs?.material || defaultMat,
            style: lastSpecs?.style || 'Natural',
            volume: lastSpecs?.volume || defaultVol,
            count: lastSpecs?.count || defaultCount,
            color: lastSpecs?.color,
            curl: 'C',
            length: '10-12 mm',
            thickness: defaultMat === 'Flawless Mink' ? '0.07 mm' : '0.10 mm',
            isNewClientDiagnosticDone: isFirstVisitClient ? false : undefined,
            notes: note || '',
          };
        })(),
      progress: override.progress || undefined,
      survey: override.survey || undefined,
      upgradePrice,
      cvRotationPoints: override.cvRotationPoints,
      cvRotationBreakdown: override.cvRotationBreakdown,
      cartProducts,
      cvRewardBreakdown,
      billing,
    };
  });
}

export function buildDemoModeBookings(params: {
  overrides: Record<string, BookingOverrideRecord>;
  customerAvatarMap: Record<string, string>;
  storeId: number;
  activeStaffId: number;
  canViewFullPhone: boolean;
}): IosBookingItem[] {
  const { overrides, customerAvatarMap, storeId, activeStaffId, canViewFullPhone } = params;

  return INITIAL_BOOKINGS.filter((b) => !b.storeId || storeId <= 0 || Number(b.storeId) === storeId).map((mock) => {
    const override = overrides[String(mock.id)] || {};
    const status = (override.status || mock.status) as IosBookingStatus;
    const assignedStaffId = Number(override.assignedStaffId ?? mock.assignedStaffId ?? 0);
    const isUnassignedQueue = !assignedStaffId && status !== 'SERVICING' && status !== 'DONE';
    const assignedStaffName = isUnassignedQueue
      ? 'Chờ phân công (Đầu tua)'
      : String(override.assignedStaffName || mock.assignedStaffName || 'Chuyên Viên');
    const checkInStaffId = override.checkInStaffId ?? mock.checkInStaffId;
    const checkInStaffName = override.checkInStaffName ?? mock.checkInStaffName;
    const checkInStaffTier = override.checkInStaffTier ?? mock.checkInStaffTier;
    const checkOutStaffId = override.checkOutStaffId ?? mock.checkOutStaffId;
    const checkOutStaffName = override.checkOutStaffName ?? mock.checkOutStaffName;
    const checkOutStaffTier = override.checkOutStaffTier ?? mock.checkOutStaffTier;
    const servicePrice = Number(override.servicePrice ?? mock.servicePrice) || 550000;
    const upgradePrice = Number(override.upgradePrice ?? mock.upgradePrice ?? 0);
    const selectedCombo = override.selectedCombo !== undefined ? override.selectedCombo : (mock.selectedCombo ?? null);
    const selectedUnderCombo =
      override.selectedUnderCombo !== undefined ? override.selectedUnderCombo : (mock.selectedUnderCombo ?? null);
    const comboRedemption =
      override.comboRedemption !== undefined ? override.comboRedemption : (mock.comboRedemption ?? null);
    const cartProducts: IosCartProductItem[] = Array.isArray(override.cartProducts)
      ? override.cartProducts
      : Array.isArray(mock.cartProducts)
        ? mock.cartProducts
        : [];

    const { cvRewardBreakdown, billing } = computeBookingFinancials({
      servicePrice,
      upgradePrice,
      isComboLive: Boolean(mock.comboLiveStatus?.isComboLive),
      selectedCombo,
      selectedUnderCombo,
      comboRedemption,
      cartProducts,
      overrideBilling: override.billing ?? mock.billing,
      assignedStaffId,
      checkInStaffId,
      checkOutStaffId,
      activeStaffId,
    });

    const resolvedStoreId = Number(mock.storeId) || (storeId > 0 ? storeId : 6);

    return {
      ...(mock as unknown as IosBookingItem),
      customerPhone: formatPhoneNumberDots(mock.customerPhone, !canViewFullPhone),
      customerVisits: mock.customerVisits ?? 1,
      customerNote: mock.customerNote ?? '',
      customerAvatar:
        (override.customerAvatar !== undefined
          ? override.customerAvatar
          : customerAvatarMap[String(mock.customerId)]) || mock.customerAvatar,
      storeId: resolvedStoreId,
      branchCode: resolvedStoreId === 16 ? 'EP' : 'DT',
      branchName: resolvedStoreId === 16 ? 'Estella Place' : 'Đề Thám',
      status,
      serviceName: override.serviceName || mock.serviceName,
      serviceType: override.serviceType || mock.serviceType,
      servicePrice,
      assignedStaffId,
      assignedStaffName,
      assignedBed: override.assignedBed || mock.assignedBed,
      isUnassignedQueue,
      isNextQueueCustomer: isUnassignedQueue,
      checkInStaffId,
      checkInStaffName,
      checkInStaffTier,
      checkOutStaffId,
      checkOutStaffName,
      checkOutStaffTier,
      selectedCombo,
      selectedUnderCombo,
      comboRedemption,
      attributes: (override.attributes || mock.attributes) as IosBookingItem['attributes'],
      progress:
        status === 'INCOMING' ? undefined : ((override.progress || mock.progress) as IosBookingItem['progress']),
      survey: override.survey || mock.survey,
      upgradePrice,
      cvRotationPoints: override.cvRotationPoints !== undefined ? override.cvRotationPoints : mock.cvRotationPoints,
      cvRotationBreakdown: override.cvRotationBreakdown || mock.cvRotationBreakdown,
      cartProducts,
      cvRewardBreakdown,
      billing,
      lashHistory: mock.lashHistory ?? [],
    };
  });
}

export function applyIosScopeAndCounts(
  allBookings: IosBookingItem[],
  params: { effectiveRole: string; scope: string; activeStaffId: number }
): { effectiveList: IosBookingItem[]; counts: IosSegmentCounts } {
  const { effectiveRole, scope, activeStaffId } = params;
  const shouldApplyCvlPrivacyScope = effectiveRole === 'CVL' || scope === 'MY_CUSTOMERS';
  const effectiveList = shouldApplyCvlPrivacyScope
    ? filterBookingsForCvlScope(allBookings, activeStaffId)
    : allBookings;

  const counts: IosSegmentCounts = {
    incoming: effectiveList.filter((b) => b.status === 'INCOMING' || b.status === 'CHECKED_IN').length,
    servicing: effectiveList.filter((b) => b.status === 'SERVICING').length,
    done: effectiveList.filter((b) => b.status === 'DONE').length,
    cancel: effectiveList.filter((b) => b.status === 'CANCELLED').length,
  };

  return { effectiveList, counts };
}
