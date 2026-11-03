'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingItem, INITIAL_BOOKINGS, COMBO_PACKAGES_CVL, SERUM_TIERS_CVL } from './mockData';

export type IosUserRole = 'CVL' | 'CVLL' | 'CC' | 'CV' | 'STORE' | 'INVENTORY';
export type BookingScopeMode = 'MY_CUSTOMERS' | 'STORE_ALL';

export interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

export interface ActiveActorProfile {
  staffId: number;
  name: string;
  tier: 'CVL' | 'CVLL' | 'CV' | 'CC' | 'ADMIN';
  badgeLabel: string;
}

export function resolveActorProfile(role: IosUserRole, loggedInUser?: any): ActiveActorProfile {
  if (role === 'CVLL') {
    return {
      staffId: Number(loggedInUser?.legacyStaffId) || 25337,
      name: loggedInUser?.role === 'cvll' && loggedInUser?.displayName ? loggedInUser.displayName : 'Tuyết Nhi ❤️',
      tier: 'CVLL',
      badgeLabel: '🪶CV🪶 · Chuyên Viên Tự Chủ Cấp Cao',
    };
  }
  if (role === 'CVL') {
    return {
      staffId: Number(loggedInUser?.legacyStaffId) || 46272,
      name: loggedInUser?.role === 'cvl' && loggedInUser?.displayName ? loggedInUser.displayName : 'Thảo Ly',
      tier: 'CVL',
      badgeLabel: 'CV🪶 · Chuyên Viên Tự Chủ',
    };
  }
  if (role === 'CV') {
    return {
      staffId: Number(loggedInUser?.legacyStaffId) || 49076,
      name: 'Phương Nhi',
      tier: 'CV',
      badgeLabel: 'CV · Chuyên Viên Kỹ Thuật',
    };
  }
  return {
    staffId: 37790,
    name: 'Diễm Hương',
    tier: 'CC',
    badgeLabel: 'CC · Tư Vấn Viên',
  };
}

export function useIosAppState(initialStep: number = 1, enabled: boolean = true, initialRole: IosUserRole = 'CVL') {
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [activeBookingId, setActiveBookingId] = useState<number>(336695);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [consultationReturnStep, setConsultationReturnStep] = useState<number | null>(null);

  const handleOpenConsultation = (returnStep?: number) => {
    setConsultationReturnStep(returnStep ?? currentStep);
    setCurrentStep(3);
  };
  const [role, setRoleState] = useState<IosUserRole>(initialRole);
  const [scopeMode, setScopeMode] = useState<BookingScopeMode>(initialRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL');
  const [deviceMode, setDeviceMode] = useState<'iphone' | 'ipad' | 'fullscreen'>('iphone');
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const [counts, setCounts] = useState<SegmentCounts>({
    incoming: 4,
    servicing: 0,
    done: 0,
    cancel: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('mos_user');
      if (raw) {
        setLoggedInUser(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const actor = resolveActorProfile(role, loggedInUser);

  const setRole = useCallback((nextRole: IosUserRole) => {
    setRoleState(nextRole);
    if (nextRole === 'CVL') {
      setScopeMode('MY_CUSTOMERS');
    } else if (nextRole === 'CVLL' || nextRole === 'CC' || nextRole === 'STORE') {
      setScopeMode('STORE_ALL');
    }
  }, []);

  const activeBooking = bookings.find((b) => b.id === activeBookingId) || bookings[0] || INITIAL_BOOKINGS[0];

  const postAction = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
        await fetch('/api/ios/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            bookingId: activeBookingId,
            action,
            actorStaffId: actor.staffId,
            actorStaffName: actor.name,
            actorStaffTier: actor.tier,
            ...payload,
          }),
        });
      } catch (err) {
        console.warn('[useIosAppState] Failed to persist action:', action, err);
      }
    },
    [activeBookingId, actor.staffId, actor.name, actor.tier]
  );

  const refreshDb = useCallback(
    async (options?: {
      segment?: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
      storeId?: number;
      scope?: BookingScopeMode;
      staffId?: number;
    }) => {
      const seg = options?.segment || bookingSegment;
      const storeId = options?.storeId ?? 6;
      const effScope = options?.scope || scopeMode;
      const effStaffId = options?.staffId ?? actor.staffId;

      setIsRefreshing(true);
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
        const res = await fetch(
          `/api/ios/bookings?storeId=${storeId}&segment=${seg}&scope=${effScope}&staffId=${effStaffId}&date=2026-11-03&limit=40`,
          {
            cache: 'no-store',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
          setBookings(data.bookings);
          if (data.counts) {
            setCounts(data.counts);
          }
          setIsLiveDb(true);
          setLastRefreshedAt(
            new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );

          const exists = data.bookings.some((b: BookingItem) => b.id === activeBookingId);
          if (!exists && data.bookings.length > 0) {
            setActiveBookingId(data.bookings[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not refresh from live DB, keeping current state:', err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [bookingSegment, scopeMode, actor.staffId, activeBookingId]
  );

  useEffect(() => {
    if (!enabled) return;
    refreshDb();
  }, [bookingSegment, scopeMode, role, enabled, refreshDb]);

  const updateActiveBooking = (updater: (prev: BookingItem) => BookingItem) => {
    setBookings((prev) => prev.map((b) => (b.id === activeBookingId ? updater(b) : b)));
  };

  // Step 2: Check-in action (Ai bấm Check-in nhận 10% Tip Check-in)
  const handleCheckIn = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'CHECKED_IN',
      checkInStaffId: actor.staffId,
      checkInStaffName: actor.name,
      checkInStaffTier: actor.tier,
    }));
    void postAction('CHECK_IN');
    setCurrentStep(3); // Go to Consultation Matrix + Combo Selection
  };

  // Step 3: Save Consultation & Optional Combo Upsell
  const handleSaveConsultation = (
    attributes: {
      style: string;
      curl: string;
      length: string;
      thickness: string;
      material?: string;
      color?: string;
      volume?: string;
      count?: string;
      eyeShape?: string;
      naturalLashLength?: string;
      naturalLashThickness?: string;
      naturalLashDensity?: string;
      isNewClientDiagnosticDone?: boolean;
      lashHealth?: string;
      lashTrail?: string;
      medicalProblem?: string;
      notes?: string;
    },
    selectedCombo?: {
      id: string;
      name: string;
      price: number;
      bonus: number;
      sessions: number;
    } | null,
    skuPricing?: {
      skuName?: string;
      skuPrice?: number;
      upgradePrice?: number;
      cvPoints?: number;
      cvBreakdown?: string;
      serviceType?: string;
    } | null
  ) => {
    const isSelfAssignedCv =
      role === 'CVL' ||
      (role === 'CVLL' && (!activeBooking.assignedStaffId || activeBooking.assignedStaffId === actor.staffId));

    updateActiveBooking((prev) => {
      const nextCombo = selectedCombo !== undefined ? selectedCombo : prev.selectedCombo || null;
      const nextServiceName = skuPricing?.skuName || prev.serviceName;
      const nextServicePrice = skuPricing?.skuPrice || prev.servicePrice;
      const nextUpgradePrice = skuPricing?.upgradePrice ?? prev.upgradePrice ?? 0;
      const originalBookedServiceName = prev.originalBookedServiceName || prev.serviceName;
      const originalBookedServicePrice = prev.originalBookedServicePrice || prev.servicePrice;

      const comboPrice = nextCombo ? nextCombo.price : 0;
      const productTotal = (prev.cartProducts || []).reduce((s, p) => s + p.price * p.quantity, 0);
      const subtotal = nextServicePrice + comboPrice + productTotal;
      const vatRate = 0.08;
      const vatAmount = Math.round(subtotal * vatRate);
      const tipAmount = prev.billing?.tipAmount ?? 50000;
      const grandTotal = subtotal + vatAmount + tipAmount;

      return {
        ...prev,
        attributes,
        serviceType: skuPricing?.serviceType || prev.serviceType || 'Normal',
        serviceName: nextServiceName,
        servicePrice: nextServicePrice,
        originalBookedServiceName,
        originalBookedServicePrice,
        upgradePrice: nextUpgradePrice,
        cvRotationPoints: skuPricing?.cvPoints ?? prev.cvRotationPoints,
        cvRotationBreakdown: skuPricing?.cvBreakdown ?? prev.cvRotationBreakdown,
        selectedCombo: nextCombo,
        checkInStaffId: prev.checkInStaffId || actor.staffId,
        checkInStaffName: prev.checkInStaffName || actor.name,
        checkInStaffTier: prev.checkInStaffTier || actor.tier,
        assignedStaffId: prev.assignedStaffId || actor.staffId,
        assignedStaffName: prev.assignedStaffName || actor.name,
        status: isSelfAssignedCv ? 'SERVICING' : prev.status,
        billing: {
          subtotal,
          vatRate,
          vatAmount,
          serviceTotal: nextServicePrice,
          comboTotal: comboPrice,
          productTotal,
          paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
          tipAmount,
          tipCvShare: Math.round(tipAmount * 0.7),
          tipCheckInShare: Math.round(tipAmount * 0.1),
          tipCheckOutShare: Math.round(tipAmount * 0.1),
          tipCcShare: Math.round(tipAmount * 0.2),
          grandTotal,
        },
      };
    });

    void postAction('SAVE_CONSULTATION', {
      attributes,
      selectedCombo: selectedCombo !== undefined ? selectedCombo : activeBooking.selectedCombo || null,
      nextStatus: isSelfAssignedCv ? 'SERVICING' : 'CHECKED_IN',
    });

    if (consultationReturnStep) {
      const nextStep = consultationReturnStep;
      setConsultationReturnStep(null);
      setCurrentStep(nextStep);
      return;
    }

    if (isSelfAssignedCv) {
      // CV🪶 tự tư vấn khách của mình -> vào thẳng màn hình Nhận ca / Chụp ảnh tiến trình mi, không cần qua CC chia ca!
      setBookingSegment('SERVICING');
      setCurrentStep(6);
    } else {
      // 🪶CV🪶 tư vấn chéo hộ CV khác hoặc CC -> sang bước xác nhận CV làm mi
      setCurrentStep(4);
    }
  };

  // Step 4: Assign Staff & Bed
  const handleAssignStaff = (staffId: number, staffName: string, bed: string) => {
    updateActiveBooking((prev) => ({
      ...prev,
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      assignedBed: bed,
      status: 'SERVICING',
    }));
    void postAction('ASSIGN_STAFF', {
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      assignedBed: bed,
    });
    setBookingSegment('SERVICING');
    setCurrentStep(5);
  };

  // Step 5 -> Step 6: Handover to CV
  const handleTransferToCv = () => {
    setCurrentStep(6);
  };

  // Step 6 -> Step 7: CV starts task
  const handleCvStartTask = () => {
    setCurrentStep(7);
  };

  // Step 7 -> Step 8: Save Before Photo & Start Timer
  const handleSaveBeforePhoto = (photoUrl: string) => {
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
      beforePhotoUrl: photoUrl,
      timerRunning: true,
      startedAt: new Date().toISOString(),
    };
    updateActiveBooking((prev) => ({
      ...prev,
      progress: progressPatch,
    }));
    void postAction('UPDATE_PROGRESS', { orderState: 'Service Start', progress: progressPatch });
    setCurrentStep(8);
  };

  // Step 8: Timer controls
  const handleToggleTimer = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      progress: {
        ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
        timerRunning: !prev.progress?.timerRunning,
      },
    }));
  };

  const handleFinishTimer = () => {
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
      timerRunning: false,
      completedAt: new Date().toISOString(),
    };
    updateActiveBooking((prev) => ({
      ...prev,
      progress: progressPatch,
    }));
    void postAction('UPDATE_PROGRESS', { orderState: 'Service End', progress: progressPatch });
    setCurrentStep(9);
  };

  // Step 9 -> Step 10: Save After Photo & Go to Survey (Mở khóa cho CV🪶 tự bấm Done mà không cần CC!)
  const handleSaveAfterPhoto = (photoUrl: string) => {
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
      afterPhotoUrl: photoUrl,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      progress: progressPatch,
    }));
    void postAction('UPDATE_PROGRESS', { orderState: 'Service Completed', progress: progressPatch });
    setCurrentStep(10);
  };

  // Step 10: Complete Survey -> Giữ nguyên quyền điều khiển của CV🪶 / 🪶CV🪶 để tự bán Dưỡng mi / Combo & Tự Checkout!
  const handleCompleteSurvey = (survey: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  }) => {
    updateActiveBooking((prev) => ({
      ...prev,
      survey,
    }));
    void postAction('COMPLETE_SURVEY', { survey });
    setCurrentStep(11); // Go directly to Product Upsell & Combo Checkout as CV🪶 / 🪶CV🪶!
  };

  // Step 11 -> Step 12: Save Product Upsell (Yeppeum) & Optional Combo + Lock in check_out_staff_id = actor!
  const handleGoToBilling = (upsellPayload?: {
    cartProducts?: Array<{ productId: number; productName: string; price: number; quantity: number; cvBonus?: number }>;
    selectedCombo?: { id: string; name: string; price: number; bonus: number; sessions: number } | null;
  }) => {
    updateActiveBooking((prev) => {
      const nextProducts =
        upsellPayload?.cartProducts !== undefined
          ? upsellPayload.cartProducts
          : prev.cartProducts && prev.cartProducts.length > 0
            ? prev.cartProducts
            : [
                {
                  productId: 36,
                  productName: 'Cây dưỡng mi Yeppeum 6ml (Giá gốc)',
                  price: SERUM_TIERS_CVL[0].price,
                  quantity: 1,
                  cvBonus: SERUM_TIERS_CVL[0].cvBonus,
                },
              ];
      const nextCombo =
        upsellPayload?.selectedCombo !== undefined ? upsellPayload.selectedCombo : prev.selectedCombo || null;
      const productTotal = nextProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
      const comboTotal = nextCombo ? nextCombo.price : 0;
      const subtotal = prev.servicePrice + comboTotal + productTotal;
      const tipAmount = prev.billing?.tipAmount ?? 50000;

      const comboBonusAmount = nextCombo ? nextCombo.bonus : 0;
      const serumBonusAmount = nextProducts.reduce((sum, p) => sum + (p.cvBonus || 0) * p.quantity, 0);

      void postAction('SAVE_UPSELL_AND_CHECKOUT', {
        cartProducts: nextProducts,
        selectedCombo: nextCombo,
      });

      return {
        ...prev,
        checkOutStaffId: actor.staffId,
        checkOutStaffName: actor.name,
        checkOutStaffTier: actor.tier,
        cartProducts: nextProducts,
        selectedCombo: nextCombo,
        cvRewardBreakdown: {
          techTipPercent: 70,
          checkInTipPercent: 10,
          checkOutTipPercent: 10,
          cvTotalTipPercent:
            (prev.assignedStaffId === actor.staffId ? 70 : 0) +
            ((prev.checkInStaffId || actor.staffId) === actor.staffId ? 10 : 0) +
            10,
          comboBonusAmount,
          serumBonusAmount,
          totalOrderBonusForCheckoutStaff: comboBonusAmount + serumBonusAmount,
        },
        billing: {
          subtotal,
          vatRate: 0.08,
          vatAmount: Math.round(subtotal * 0.08),
          serviceTotal: prev.servicePrice,
          comboTotal,
          productTotal,
          paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
          tipAmount,
          tipCvShare: Math.round(tipAmount * 0.7),
          tipCheckInShare: Math.round(tipAmount * 0.1),
          tipCheckOutShare: Math.round(tipAmount * 0.1),
          tipCcShare: Math.round(tipAmount * 0.2),
          grandTotal: subtotal + Math.round(subtotal * 0.08) + tipAmount,
        },
      };
    });
    setCurrentStep(12);
  };

  // Step 12: Choose Payment Method
  const handleChoosePaymentMethod = (method: 'CASH' | 'POS' | 'VIETQR') => {
    updateActiveBooking((prev) => ({
      ...prev,
      billing: {
        ...(prev.billing || {
          subtotal: prev.servicePrice,
          vatRate: 0.08,
          vatAmount: Math.round(prev.servicePrice * 0.08),
          serviceTotal: prev.servicePrice,
          comboTotal: 0,
          productTotal: 0,
          tipAmount: 50000,
          tipCvShare: 35000,
          tipCheckInShare: 5000,
          tipCheckOutShare: 5000,
          tipCcShare: 10000,
          grandTotal: prev.servicePrice + Math.round(prev.servicePrice * 0.08) + 50000,
        }),
        paymentMethod: method,
      },
    }));
    setCurrentStep(13);
  };

  // Step 13: Record Tip (Kinh Thánh mOS Điều răn TIP-001 & CV-002: 70% Làm mi + 10% Check-in + 10% Check-out)
  const handleRecordTip = (tipAmount: number) => {
    updateActiveBooking((prev) => {
      const cvShare = Math.round(tipAmount * 0.7);
      const checkInShare = Math.round(tipAmount * 0.1);
      const checkOutShare = Math.round(tipAmount * 0.1);
      const ccShare = checkInShare + checkOutShare;
      const currentBilling = prev.billing || {
        subtotal: prev.servicePrice,
        vatRate: 0.08,
        vatAmount: Math.round(prev.servicePrice * 0.08),
        serviceTotal: prev.servicePrice,
        comboTotal: 0,
        productTotal: 0,
        paymentMethod: 'VIETQR' as const,
      };
      const subtotal = currentBilling.subtotal;
      const vatRate = currentBilling.vatRate ?? 0.08;
      const vatAmount = currentBilling.vatAmount ?? Math.round(subtotal * vatRate);
      const grandTotal = subtotal + vatAmount + tipAmount;

      const nextBilling = {
        ...currentBilling,
        vatRate,
        vatAmount,
        tipAmount,
        tipCvShare: cvShare,
        tipCheckInShare: checkInShare,
        tipCheckOutShare: checkOutShare,
        tipCcShare: ccShare,
        grandTotal,
      };

      void postAction('COMPLETE_ORDER', { billing: nextBilling });

      return {
        ...prev,
        checkOutStaffId: prev.checkOutStaffId || actor.staffId,
        checkOutStaffName: prev.checkOutStaffName || actor.name,
        checkOutStaffTier: prev.checkOutStaffTier || actor.tier,
        billing: nextBilling,
      };
    });
    setCurrentStep(14);
  };

  // Step 14: Finish Order
  const handleFinishOrder = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'DONE',
    }));
    setBookingSegment('DONE');
    setCurrentStep(1);
  };

  return {
    bookings,
    activeBooking,
    activeBookingId,
    setActiveBookingId,
    currentStep,
    setCurrentStep,
    role,
    setRole,
    actor,
    scopeMode,
    setScopeMode,
    deviceMode,
    setDeviceMode,
    activeTab,
    setActiveTab,
    bookingSegment,
    setBookingSegment,
    isSettingsOpen,
    setIsSettingsOpen,
    counts,
    isRefreshing,
    lastRefreshedAt,
    isLiveDb,
    refreshDb,
    handleOpenConsultation,
    consultationReturnStep,
    handleCheckIn,
    handleSaveConsultation,
    handleAssignStaff,
    handleTransferToCv,
    handleCvStartTask,
    handleSaveBeforePhoto,
    handleToggleTimer,
    handleFinishTimer,
    handleSaveAfterPhoto,
    handleCompleteSurvey,
    handleGoToBilling,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
  };
}
