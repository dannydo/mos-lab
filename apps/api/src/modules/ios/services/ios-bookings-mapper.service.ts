import {
  CvlTrainingMentorshipPair,
  filterBookingsForCvlScope,
  hasCompleteNaturalLashAttributes,
  IosBookingItem,
  IosBookingStatus,
  IosCartProductItem,
  IosPromotionOption,
  IosSegmentCounts,
  matchComboCategoryAndVolumeFromBooking,
  NaturalLashConsultationAttributes,
  resolveIosCustomerTypeIcon,
  resolveIosHasDiscountTag,
} from '@mos-lab/shared';
import { CvlTrainingMentorshipService } from '../../kpi/services/cvl-training-mentorship.service.js';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { BookingOverrideRecord, CustomerComboExpiryOverrideEntry } from './ios-overrides.service.js';
import { applyCustomerComboExpiryOverridesToBooking } from './ios-combo-expiry.service.js';
import { IosCustomerEnrichmentContext, LastVisitSpecSummary, RawIosOrderSnapshot } from './ios-bookings-sql.service.js';
import { computeCanonicalCvRotationPoints } from './ios-cv-points.helper.js';
import { resolveBookingPromotion } from './ios-promotions.service.js';
import {
  computeBookingFinancials,
  formatPhoneNumberDots,
  formatTime12h,
  formatTimeSlot,
  resolveBookingStatusFromState,
  resolveCustomerAvatar,
  resolveStaffAvatar,
} from './ios-bookings-formatters.js';

function stripNewLashLabel(value: string): string {
  return value
    .replace(
      /\b(?:New\s+)+(?=(?:Classic|Volume|Flawless|Hyper(?:light)?|Ultra(?:light)?|Ivy(?:light)?|Mink|Under)\b)/gi,
      ''
    )
    .trim();
}

function normalizeLashMaterialLabel(value?: string): string | undefined {
  if (!value) return value;
  const cleaned = stripNewLashLabel(value);
  return /^Classic$/i.test(cleaned) ? 'Classic 1D' : cleaned;
}

function buildCanonicalServiceNameFromSpecs(specs?: LastVisitSpecSummary, visits = 0): string {
  if (!specs?.material) {
    return visits > 1 ? 'HyperLight 4X 770' : 'Chưa chọn mẫu mi (Tư vấn)';
  }
  const matched = matchComboCategoryAndVolumeFromBooking({
    material: specs.material,
    volume: specs.volume,
    count: specs.count,
    serviceKey: specs.serviceKey,
  });
  const sku = typeof matched.volume === 'number' ? matched.volume : 770;
  switch (matched.categoryId) {
    case 'Classic_1D':
    case 'Classic_Volume':
      return `Classic 1D ${sku}`;
    case 'Volume_2D':
      return `Volume 2D ${sku}`;
    case 'Volume_3D':
      return `Volume 3D ${sku}`;
    case 'FlawlessMink':
      return `Flawless Mink ${sku}`;
    case 'HyperLight_2X':
    case 'HyperLight_3X':
    case 'HyperLight_4X':
    case 'HyperLight_5X':
      return `HyperLight ${matched.categoryId.split('_')[1]} ${sku}`;
    case 'IvyLight_3L':
    case 'IvyLight_4L':
    case 'IvyLight_5L':
      return `Ivylight ${matched.categoryId.split('_')[1]} ${sku}`;
    case 'UltraLight_3D':
    case 'UltraLight_4D':
    case 'UltraLight_5D':
      return `UltraLight ${matched.categoryId.split('_')[1]} ${sku}`;
    default:
      return visits > 1 ? `HyperLight 4X ${sku}` : 'Chưa chọn mẫu mi (Tư vấn)';
  }
}

function hydrateSavedNaturalLashAttributes(
  attrs: IosBookingItem['attributes'],
  savedProfile?: NaturalLashConsultationAttributes
): IosBookingItem['attributes'] {
  if (!attrs || !savedProfile) return attrs;
  if (attrs.isNewClientDiagnosticDone === false) return attrs;
  if (hasCompleteNaturalLashAttributes(attrs)) return attrs;
  return {
    ...savedProfile,
    ...attrs,
    naturalLashLength: attrs.naturalLashLength || savedProfile.naturalLashLength,
    naturalLashThickness: attrs.naturalLashThickness || savedProfile.naturalLashThickness,
    naturalLashCount: attrs.naturalLashCount || savedProfile.naturalLashCount,
    naturalLashDensity: attrs.naturalLashDensity || savedProfile.naturalLashDensity,
    lashTrail: attrs.lashTrail || savedProfile.lashTrail,
    eyeShape: attrs.eyeShape || savedProfile.eyeShape,
    lashHealth: attrs.lashHealth || savedProfile.lashHealth,
    medicalProblem: attrs.medicalProblem || savedProfile.medicalProblem,
    isNewClientDiagnosticDone: true,
  };
}

export function mapLiveOrdersToBookings(params: {
  orders: RawIosOrderSnapshot[];
  customerContext: IosCustomerEnrichmentContext;
  overrides: Record<string, BookingOverrideRecord>;
  customerAvatarMap: Record<string, string>;
  customerNaturalLashMap?: Record<string, NaturalLashConsultationAttributes>;
  customerComboExpiryMap?: Record<string, Record<string, CustomerComboExpiryOverrideEntry>>;
  storeId: number;
  targetDate: string;
  todayVn: string;
  activeStaffId: number;
  canViewFullPhone: boolean;
  activeTrainingPairs?: CvlTrainingMentorshipPair[];
  promotionsById?: Map<number, IosPromotionOption>;
}): IosBookingItem[] {
  const {
    orders,
    customerContext,
    overrides,
    customerAvatarMap,
    customerNaturalLashMap = {},
    customerComboExpiryMap = {},
    storeId,
    targetDate,
    todayVn,
    activeStaffId,
    canViewFullPhone,
    activeTrainingPairs = [],
    promotionsById,
  } = params;

  return orders
    .map((r, index): IosBookingItem => {
      const override = overrides[String(r.id)] || {};
      const state = r.order_state === 'Completed' ? 'Completed' : override.orderState || r.order_state;
      const status = resolveBookingStatusFromState(override.status, state, targetDate, todayVn);

      const duration = Number(r.booking_duration_minute) || 90;
      const servicePrice = Number(override.servicePrice ?? r.total_price) || 550000;
      const orderNum = r.order_number ? `BK-${r.order_number}` : `BK-${r.id}`;
      const note = r.booking_note || '';
      const rawVisits = Number(r.total_visits) || 0;
      const rawIsNew = r.is_new !== null && r.is_new !== undefined ? Number(r.is_new) : null;
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

      const underComboStatus = customerContext.underMinkComboMap.get(customerId);
      const hasUnderMinkComboActive = Boolean(
        underComboStatus?.hasUnderCombo && (underComboStatus?.remainingSessions ?? 0) > 0
      );
      const overrideAttrs = override.attributes as IosBookingItem['attributes'] | undefined;
      const actualSpecs = r.actual_order_specs || undefined;
      const matchedTrainingPair = CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(
        activeTrainingPairs,
        assignedStaffId,
        targetDate
      );
      const isTrainingCvlOrder = Boolean(matchedTrainingPair);
      const { promotionId, appliedPromotion } = resolveBookingPromotion(override, r.promotion_id, promotionsById);

      const { cvRewardBreakdown, billing } = computeBookingFinancials({
        servicePrice,
        upgradePrice,
        serviceName: override.serviceName || r.service_name,
        isComboLive: Boolean(comboInfo.isComboLive),
        hasUnderMink: overrideAttrs?.hasUnderMink ?? actualSpecs?.hasUnderMink,
        underMinkServiceType: overrideAttrs?.underMinkServiceType ?? actualSpecs?.underMinkServiceType,
        hasUnderMinkCombo: hasUnderMinkComboActive,
        selectedCombo,
        selectedUnderCombo,
        comboRedemption,
        cartProducts,
        overrideBilling: override.billing,
        assignedStaffId,
        checkInStaffId,
        checkOutStaffId,
        activeStaffId,
        dbOrderState: r.order_state,
        isTrainingCvlOrder,
        promotionId,
        appliedPromotion,
      });

      const isAnyServiceName = (name?: string | null) => !name || name.toLowerCase().includes('any');
      const isRawOrderPlaceholder =
        isAnyServiceName(r.service_name) ||
        String(r.service_key || '')
          .toLowerCase()
          .includes('any') ||
        Number(r.is_temporary) === 1;

      const customerHistory = customerContext.lashHistoryMap.get(customerId) ?? [];
      const lastSpecs = customerContext.lastVisitSpecsMap.get(customerId);
      const hasPriorRelationship =
        customerHistory.length > 0 ||
        Boolean(comboInfo.isComboLive) ||
        Boolean(comboInfo.isExpired) ||
        Boolean(underComboStatus?.hasUnderCombo) ||
        Boolean(underComboStatus?.isExpired);
      const visits =
        rawVisits > 0
          ? rawIsNew === 0 && rawVisits <= 1 && hasPriorRelationship
            ? 2
            : rawVisits
          : rawIsNew === 0 && hasPriorRelationship
            ? 2
            : 1;
      const effectiveIsNew = visits > 1 ? 0 : (rawIsNew ?? 0);

      let effectiveServiceName =
        override.serviceName && !isAnyServiceName(override.serviceName) ? String(override.serviceName) : '';

      if (!effectiveServiceName) {
        if (!isRawOrderPlaceholder) {
          effectiveServiceName = r.service_name;
        } else if (comboInfo.isComboLive && comboInfo.comboName && !isAnyServiceName(comboInfo.comboName)) {
          effectiveServiceName = comboInfo.comboName;
        } else if (customerHistory.length > 0) {
          const validHistory = customerHistory.find((h) => !isAnyServiceName(h.serviceName));
          if (validHistory?.serviceName) {
            effectiveServiceName = validHistory.serviceName;
          }
        }
      }

      if (!effectiveServiceName) {
        effectiveServiceName = buildCanonicalServiceNameFromSpecs(lastSpecs, visits);
      }
      effectiveServiceName = stripNewLashLabel(effectiveServiceName);
      const resolvedStoreId = Number(r.client_store_id) || storeId;
      const bookingDdMmYyyy = (() => {
        if (!r.booking_date_start) return '';
        const d = r.booking_date_start instanceof Date ? r.booking_date_start : new Date(String(r.booking_date_start));
        if (Number.isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      })();
      const priorVisitEntry = customerHistory.find((h) => h.date && h.date !== bookingDdMmYyyy) || customerHistory[0];
      const isBookedAdvanceMatch = Boolean(
        (r.booked_staff_id && Number(r.booked_staff_id) > 0 && Number(r.booked_staff_id) === assignedStaffId) ||
        note.toLowerCase().includes('book') ||
        note.toLowerCase().includes('chỉ định')
      );

      const resolvedAttributes = hydrateSavedNaturalLashAttributes(
        (override.attributes
          ? {
              ...override.attributes,
              material: normalizeLashMaterialLabel(override.attributes.material) || override.attributes.material,
            }
          : null) ||
          (() => {
            const isFirstVisitClient = effectiveIsNew === 1 || (visits <= 1 && !hasPriorRelationship);
            const savedProfile = customerNaturalLashMap[String(customerId)];
            const matchedSpec = matchComboCategoryAndVolumeFromBooking({
              material: isRawOrderPlaceholder ? lastSpecs?.material : undefined,
              volume: actualSpecs?.volume || (isRawOrderPlaceholder ? lastSpecs?.volume : undefined),
              count: actualSpecs?.count || (isRawOrderPlaceholder ? lastSpecs?.count : undefined),
              serviceName: effectiveServiceName,
              serviceKey: !isRawOrderPlaceholder ? r.service_key || undefined : lastSpecs?.serviceKey,
              servicePrice: !isRawOrderPlaceholder ? servicePrice : undefined,
            });
            const catId = matchedSpec.categoryId;
            const defaultMat =
              catId === 'Classic_1D' || catId === 'Classic_Volume'
                ? 'Classic 1D'
                : catId === 'Volume_2D' || catId === 'Volume_3D'
                  ? 'Volume'
                  : catId.startsWith('HyperLight')
                    ? 'HyperLight'
                    : catId.startsWith('IvyLight')
                      ? 'Ivylight'
                      : catId.startsWith('UltraLight')
                        ? 'UltraLight'
                        : 'Flawless Mink';
            const defaultVol =
              defaultMat === 'Classic 1D' || defaultMat === 'Flawless Mink'
                ? '1D'
                : catId === 'Volume_3D'
                  ? '3D'
                  : catId === 'Volume_2D'
                    ? '2D'
                    : catId.includes('_')
                      ? catId.split('_')[1]
                      : '4X';
            const unit =
              defaultMat === 'Classic 1D' || defaultMat === 'Flawless Mink'
                ? 'sợi'
                : defaultMat === 'Ivylight'
                  ? 'nhịp'
                  : 'fan';
            const fallbackCountPerEye =
              defaultMat === 'Classic 1D' || defaultMat === 'Ivylight'
                ? 90
                : defaultMat === 'Flawless Mink'
                  ? 60
                  : defaultMat === 'UltraLight' || defaultMat === 'Volume'
                    ? 80
                    : 70;
            const resolvedCountPerEye =
              matchedSpec.volume !== 'under' && matchedSpec.volumeMeta?.countPerEye
                ? matchedSpec.volumeMeta.countPerEye
                : fallbackCountPerEye;
            const defaultCount = `${resolvedCountPerEye} ${unit}`;
            const normalizedLastMaterial = normalizeLashMaterialLabel(lastSpecs?.material);
            const canInheritLastSpecs = isRawOrderPlaceholder || normalizedLastMaterial === defaultMat;

            return {
              material: canInheritLastSpecs ? normalizedLastMaterial || defaultMat : defaultMat,
              style: actualSpecs?.style || lastSpecs?.style || 'Natural',
              volume: actualSpecs?.volume || (canInheritLastSpecs ? lastSpecs?.volume || defaultVol : defaultVol),
              count: actualSpecs?.count || (canInheritLastSpecs ? lastSpecs?.count || defaultCount : defaultCount),
              color: actualSpecs?.color || lastSpecs?.color,
              hasUnderMink: actualSpecs?.hasUnderMink,
              underMinkServiceType: actualSpecs?.underMinkServiceType,
              curl: 'C',
              length: '10-12 mm',
              thickness: defaultMat === 'Flawless Mink' ? '0.07 mm' : '0.10 mm',
              isNewClientDiagnosticDone: savedProfile ? true : isFirstVisitClient ? false : undefined,
              notes: note || '',
            };
          })(),
        customerNaturalLashMap[String(customerId)]
      );

      const resolvedServiceType = override.serviceType || r.service_type || 'Normal';
      let resolvedCvPoints: number;
      let resolvedCvBreakdown: string | undefined;
      if (typeof override.cvRotationPoints === 'number' && override.cvRotationPoints > 0) {
        resolvedCvPoints = Math.round(override.cvRotationPoints);
        resolvedCvBreakdown = override.cvRotationBreakdown;
      } else if (override.attributes) {
        const computed = computeCanonicalCvRotationPoints({
          material: resolvedAttributes?.material,
          volume: resolvedAttributes?.volume,
          count: resolvedAttributes?.count,
          serviceType: resolvedServiceType,
          serviceName: effectiveServiceName,
          style: resolvedAttributes?.style,
          color: resolvedAttributes?.color,
          hasUnderMink: resolvedAttributes?.hasUnderMink,
          underMinkServiceType: resolvedAttributes?.underMinkServiceType,
        });
        resolvedCvPoints = computed.totalPoints;
        resolvedCvBreakdown = override.cvRotationBreakdown || computed.breakdownLabel;
      } else if (typeof r.ledger_cv_points === 'number' && r.ledger_cv_points > 0) {
        resolvedCvPoints = r.ledger_cv_points;
        resolvedCvBreakdown = r.ledger_cv_breakdown || undefined;
      } else {
        const computed = computeCanonicalCvRotationPoints({
          material: resolvedAttributes?.material,
          volume: resolvedAttributes?.volume,
          count: resolvedAttributes?.count,
          serviceType: resolvedServiceType,
          serviceName: effectiveServiceName,
          style: resolvedAttributes?.style,
          color: resolvedAttributes?.color,
          hasUnderMink: resolvedAttributes?.hasUnderMink,
          underMinkServiceType: resolvedAttributes?.underMinkServiceType,
        });
        resolvedCvPoints = computed.totalPoints;
        resolvedCvBreakdown = computed.breakdownLabel;
      }

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
        assignedStaffAvatar: isUnassignedQueue
          ? undefined
          : override.assignedStaffAvatar || resolveStaffAvatar(r.staff_avatar || r.check_in_staff_avatar),
        customerVisits: visits,
        lastVisitDate: priorVisitEntry?.date,
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
        customerTypeIcon: resolveIosCustomerTypeIcon(note, visits, effectiveIsNew),
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
        orderState: state || undefined,
        comboLiveStatus: {
          ...comboInfo,
          retainDaysLimit: comboInfo.retainDaysLimit ?? 25,
          upsellOpportunity:
            comboInfo.upsellOpportunity ??
            (!comboInfo.isComboLive ||
              comboInfo.remainingSessions <= 2 ||
              Boolean(comboInfo.isExpiringSoon) ||
              Boolean(comboInfo.isExpired)),
        },
        underMinkComboStatus: customerContext.underMinkComboMap.get(customerId),
        comboWallets: customerContext.comboWalletsMap?.get(customerId) || [],
        lashHistory: customerHistory,
        selectedCombo,
        selectedUnderCombo,
        comboRedemption,
        attributes: resolvedAttributes,
        progress: override.progress || undefined,
        survey: override.survey || undefined,
        upgradePrice,
        cvRotationPoints: resolvedCvPoints,
        cvRotationBreakdown: resolvedCvBreakdown,
        cartProducts,
        promotionId,
        appliedPromotion,
        cvRewardBreakdown,
        billing,
        isTrainingCvlOrder,
        trainingMentorName: matchedTrainingPair?.mentorDisplayName,
      };
    })
    .map((mapped) =>
      applyCustomerComboExpiryOverridesToBooking(mapped, customerComboExpiryMap[String(mapped.customerId)], todayVn)
    );
}

export function buildDemoModeBookings(params: {
  overrides: Record<string, BookingOverrideRecord>;
  customerAvatarMap: Record<string, string>;
  customerNaturalLashMap?: Record<string, NaturalLashConsultationAttributes>;
  customerComboExpiryMap?: Record<string, Record<string, CustomerComboExpiryOverrideEntry>>;
  storeId: number;
  activeStaffId: number;
  canViewFullPhone: boolean;
  targetDate?: string;
  todayVn?: string;
  activeTrainingPairs?: CvlTrainingMentorshipPair[];
}): IosBookingItem[] {
  const {
    overrides,
    customerAvatarMap,
    customerNaturalLashMap = {},
    customerComboExpiryMap = {},
    storeId,
    activeStaffId,
    canViewFullPhone,
    targetDate = new Date().toISOString().slice(0, 10),
    todayVn = targetDate,
    activeTrainingPairs = [],
  } = params;

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

    const preHydratedDemo = applyCustomerComboExpiryOverridesToBooking(
      mock as unknown as IosBookingItem,
      customerComboExpiryMap[String(mock.customerId)],
      todayVn
    );
    const effectiveAttrs = (override.attributes || mock.attributes) as IosBookingItem['attributes'];
    const hasUnderMinkComboMock = Boolean(
      preHydratedDemo.underMinkComboStatus?.hasUnderCombo &&
      (preHydratedDemo.underMinkComboStatus?.remainingSessions ?? 0) > 0
    );
    const matchedTrainingPair = CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(
      activeTrainingPairs,
      assignedStaffId,
      targetDate
    );
    const isTrainingCvlOrder = Boolean(matchedTrainingPair);
    const { promotionId: demoPromoId, appliedPromotion: demoAppliedPromotion } = resolveBookingPromotion(
      override,
      null
    );

    const { cvRewardBreakdown, billing } = computeBookingFinancials({
      servicePrice,
      upgradePrice,
      serviceName: override.serviceName || mock.serviceName,
      isComboLive: Boolean(preHydratedDemo.comboLiveStatus?.isComboLive),
      hasUnderMink: effectiveAttrs?.hasUnderMink,
      underMinkServiceType: effectiveAttrs?.underMinkServiceType,
      hasUnderMinkCombo: hasUnderMinkComboMock,
      selectedCombo,
      selectedUnderCombo,
      comboRedemption,
      cartProducts,
      overrideBilling: override.billing ?? mock.billing,
      assignedStaffId,
      checkInStaffId,
      checkOutStaffId,
      activeStaffId,
      isTrainingCvlOrder,
      promotionId: demoPromoId,
      appliedPromotion: demoAppliedPromotion,
    });

    const resolvedStoreId = Number(mock.storeId) || (storeId > 0 ? storeId : 6);

    return {
      ...preHydratedDemo,
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
      orderState: override.orderState || (mock as unknown as IosBookingItem).orderState,
      serviceName: stripNewLashLabel(override.serviceName || mock.serviceName),
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
      attributes: hydrateSavedNaturalLashAttributes(
        (() => {
          const baseAttr = (override.attributes || mock.attributes) as IosBookingItem['attributes'];
          return baseAttr
            ? {
                ...baseAttr,
                material: normalizeLashMaterialLabel(baseAttr.material) || baseAttr.material,
              }
            : baseAttr;
        })(),
        customerNaturalLashMap[String(mock.customerId)]
      ),
      progress:
        status === 'INCOMING' ? undefined : ((override.progress || mock.progress) as IosBookingItem['progress']),
      survey: override.survey || mock.survey,
      upgradePrice,
      cvRotationPoints:
        override.cvRotationPoints !== undefined
          ? override.cvRotationPoints
          : mock.cvRotationPoints !== undefined
            ? mock.cvRotationPoints
            : computeCanonicalCvRotationPoints({
                material: effectiveAttrs?.material,
                volume: effectiveAttrs?.volume,
                count: effectiveAttrs?.count,
                serviceType: override.serviceType || mock.serviceType,
                serviceName: override.serviceName || mock.serviceName,
                style: effectiveAttrs?.style,
                color: effectiveAttrs?.color,
                hasUnderMink: effectiveAttrs?.hasUnderMink,
                underMinkServiceType: effectiveAttrs?.underMinkServiceType,
              }).totalPoints,
      cvRotationBreakdown: override.cvRotationBreakdown || mock.cvRotationBreakdown,
      cartProducts,
      promotionId: demoPromoId,
      appliedPromotion: demoAppliedPromotion,
      cvRewardBreakdown,
      billing,
      isTrainingCvlOrder,
      trainingMentorName: matchedTrainingPair?.mentorDisplayName,
      lashHistory: mock.lashHistory ?? [],
    };
  });
}

export function applyIosScopeAndCounts(
  allBookings: IosBookingItem[],
  params: {
    effectiveRole: string;
    scope: string;
    activeStaffId: number;
    targetDate?: string;
    todayVn?: string;
  }
): { effectiveList: IosBookingItem[]; counts: IosSegmentCounts } {
  const { effectiveRole, scope, activeStaffId, targetDate, todayVn } = params;
  const shouldApplyCvlPrivacyScope =
    effectiveRole === 'CVL' || (effectiveRole !== 'CC' && effectiveRole !== 'STORE' && scope === 'MY_CUSTOMERS');
  const effectiveList = shouldApplyCvlPrivacyScope
    ? filterBookingsForCvlScope(allBookings, activeStaffId, { targetDate, todayVn })
    : allBookings;

  const counts: IosSegmentCounts = {
    incoming: effectiveList.filter((b) => b.status === 'INCOMING').length,
    servicing: effectiveList.filter((b) => b.status === 'SERVICING' || b.status === 'CHECKED_IN').length,
    done: effectiveList.filter((b) => b.status === 'DONE').length,
    cancel: effectiveList.filter((b) => b.status === 'CANCELLED').length,
  };

  return { effectiveList, counts };
}
