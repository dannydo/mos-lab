'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingItem, INITIAL_BOOKINGS, SALON_INFO, STAFF_QUEUE } from './mockData';

export type IosUserRole = 'CC' | 'CV' | 'STORE' | 'INVENTORY';

export interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

export function useIosAppState(initialStep: number = 1) {
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [activeBookingId, setActiveBookingId] = useState<number>(103);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [role, setRole] = useState<IosUserRole>('CC');
  const [deviceMode, setDeviceMode] = useState<'iphone' | 'ipad' | 'fullscreen'>('iphone');
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [bookingSegment, setBookingSegment] = useState<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>('INCOMING');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Real Database state
  const [counts, setCounts] = useState<SegmentCounts>({
    incoming: 431,
    servicing: 1,
    done: 4612,
    cancel: 239,
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

  const activeBooking = bookings.find((b) => b.id === activeBookingId) || bookings[0] || INITIAL_BOOKINGS[2];

  // Refresh DB function connecting to /api/ios/bookings
  const refreshDb = useCallback(
    async (options?: { segment?: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'; storeId?: number }) => {
      const seg = options?.segment || bookingSegment;
      const storeId = options?.storeId ?? 6; // Đề Thám default

      setIsRefreshing(true);
      try {
        const res = await fetch(`/api/ios/bookings?storeId=${storeId}&segment=${seg}&limit=30`, {
          cache: 'no-store',
        });
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

          // Keep activeBookingId if it exists in new data, otherwise select the first item
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
    [bookingSegment, activeBookingId]
  );

  // Auto fetch live data on mount and segment change
  useEffect(() => {
    refreshDb();
  }, [bookingSegment]);

  // Helper to update active booking
  const updateActiveBooking = (updater: (prev: BookingItem) => BookingItem) => {
    setBookings((prev) => prev.map((b) => (b.id === activeBookingId ? updater(b) : b)));
  };

  // Step 2: Check in action
  const handleCheckIn = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'CHECKED_IN',
    }));
    setCurrentStep(3); // Go to consultation
  };

  // Step 3: Save Consultation
  const handleSaveConsultation = (attributes: {
    style: string;
    curl: string;
    length: string;
    thickness: string;
    notes?: string;
  }) => {
    updateActiveBooking((prev) => ({
      ...prev,
      attributes,
    }));
    setCurrentStep(4); // Go to staff queue
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
    setBookingSegment('SERVICING');
    setCurrentStep(5); // Show servicing tab
  };

  // Step 5 -> Step 6: Handover to CV
  const handleTransferToCv = () => {
    setRole('CV');
    setCurrentStep(6); // CV Dashboard
  };

  // Step 6 -> Step 7: CV starts task
  const handleCvStartTask = () => {
    setCurrentStep(7); // Before Photo
  };

  // Step 7 -> Step 8: Save Before Photo & Start Timer
  const handleSaveBeforePhoto = (photoUrl: string) => {
    updateActiveBooking((prev) => ({
      ...prev,
      progress: {
        ...(prev.progress || { elapsedSeconds: 0, timerRunning: true }),
        beforePhotoUrl: photoUrl,
        timerRunning: true,
        startedAt: new Date().toISOString(),
      },
    }));
    setCurrentStep(8); // Service Timer
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
    updateActiveBooking((prev) => ({
      ...prev,
      progress: {
        ...(prev.progress || { elapsedSeconds: 4468, timerRunning: false }),
        timerRunning: false,
        completedAt: new Date().toISOString(),
      },
    }));
    setCurrentStep(9); // After Photo
  };

  // Step 9 -> Step 10: Save After Photo & Go to Survey
  const handleSaveAfterPhoto = (photoUrl: string) => {
    updateActiveBooking((prev) => ({
      ...prev,
      progress: {
        ...(prev.progress || { elapsedSeconds: 4468, timerRunning: false }),
        afterPhotoUrl: photoUrl,
      },
    }));
    setCurrentStep(10); // Survey
  };

  // Step 10: Complete Survey & Handover to CC checkout
  const handleCompleteSurvey = (survey: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  }) => {
    updateActiveBooking((prev) => ({
      ...prev,
      survey,
    }));
    setRole('CC');
    setCurrentStep(11); // Product Upsell
  };

  // Step 11: Add Retail Product
  const handleAddProduct = (product: { productId: number; productName: string; price: number; quantity: number }) => {
    updateActiveBooking((prev) => {
      const currentProducts = prev.cartProducts || [];
      const updatedProducts = [...currentProducts, product];
      const productTotal = updatedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
      const subtotal = prev.servicePrice + productTotal;

      return {
        ...prev,
        cartProducts: updatedProducts,
        billing: {
          subtotal,
          serviceTotal: prev.servicePrice,
          productTotal,
          paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
          tipAmount: prev.billing?.tipAmount || 0,
          tipCvShare: prev.billing?.tipCvShare || 0,
          tipCcShare: prev.billing?.tipCcShare || 0,
          grandTotal: subtotal + (prev.billing?.tipAmount || 0),
        },
      };
    });
  };

  // Step 11 -> Step 12: Go to Billing
  const handleGoToBilling = () => {
    updateActiveBooking((prev) => {
      const productTotal = (prev.cartProducts || []).reduce((sum, p) => sum + p.price * p.quantity, 0);
      const subtotal = prev.servicePrice + productTotal;
      return {
        ...prev,
        billing: {
          subtotal,
          serviceTotal: prev.servicePrice,
          productTotal,
          paymentMethod: prev.billing?.paymentMethod || 'VIETQR',
          tipAmount: prev.billing?.tipAmount || 0,
          tipCvShare: prev.billing?.tipCvShare || 0,
          tipCcShare: prev.billing?.tipCcShare || 0,
          grandTotal: subtotal + (prev.billing?.tipAmount || 0),
        },
      };
    });
    setCurrentStep(12); // Billing
  };

  // Step 12: Choose Payment Method
  const handleChoosePaymentMethod = (method: 'CASH' | 'POS' | 'VIETQR') => {
    updateActiveBooking((prev) => ({
      ...prev,
      billing: {
        ...(prev.billing || {
          subtotal: prev.servicePrice,
          serviceTotal: prev.servicePrice,
          productTotal: 0,
          tipAmount: 0,
          tipCvShare: 0,
          tipCcShare: 0,
          grandTotal: prev.servicePrice,
        }),
        paymentMethod: method,
      },
    }));
    setCurrentStep(13); // Tip
  };

  // Step 13: Record Tip (Kinh Thánh mOS Điều răn TIP-001)
  const handleRecordTip = (tipAmount: number) => {
    updateActiveBooking((prev) => {
      const cvShare = Math.round(tipAmount * 0.7);
      const ccShare = Math.round(tipAmount * 0.2);
      const currentBilling = prev.billing || {
        subtotal: prev.servicePrice,
        serviceTotal: prev.servicePrice,
        productTotal: 0,
        paymentMethod: 'VIETQR',
      };
      return {
        ...prev,
        billing: {
          ...currentBilling,
          tipAmount,
          tipCvShare: cvShare,
          tipCcShare: ccShare,
          grandTotal: currentBilling.subtotal + tipAmount,
        },
      };
    });
    setCurrentStep(14); // Thermal Receipt
  };

  // Step 14: Finish Order
  const handleFinishOrder = () => {
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'DONE',
    }));
    setBookingSegment('DONE');
    setCurrentStep(1); // Return to booking list with DONE status
  };

  // Reset to initial demo state
  const handleResetDemo = () => {
    setBookings(INITIAL_BOOKINGS);
    setActiveBookingId(103);
    setCurrentStep(1);
    setRole('CC');
    setBookingSegment('INCOMING');
    setActiveTab('booking');
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
    deviceMode,
    setDeviceMode,
    activeTab,
    setActiveTab,
    bookingSegment,
    setBookingSegment,
    isSettingsOpen,
    setIsSettingsOpen,
    staffQueue: STAFF_QUEUE,
    salonInfo: SALON_INFO,

    // Real DB controls
    counts,
    isRefreshing,
    lastRefreshedAt,
    isLiveDb,
    refreshDb,

    // Step Actions
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
    handleAddProduct,
    handleGoToBilling,
    handleChoosePaymentMethod,
    handleRecordTip,
    handleFinishOrder,
    handleResetDemo,
  };
}
