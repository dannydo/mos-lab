'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../lib/api-client';
import { getViewportSize } from '../../../hooks/useResponsiveTier';

interface UseCustomerDetailProps {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  onUpdate?: () => void;
  editForm: SafeAny;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useCustomerDetail(options: UseCustomerDetailProps) {
  const { open, customerId, onClose, onDeleteSuccess, editForm } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SafeAny>(null);
  const [detailData, setDetailData] = useState<SafeAny>(null);
  const detailRequestRef = useRef<{ customerId: number; promise: Promise<SafeAny> } | null>(null);
  const activeCustomerIdRef = useRef<number | null>(customerId);
  activeCustomerIdRef.current = customerId;
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<SafeAny>(null);
  const [isGemModalOpen, setIsGemModalOpen] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [bookingWizardOpen, setBookingWizardOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [restoreLoading, setRestoreLoading] = useState(false);
  const [unpinLoading, setUnpinLoading] = useState(false);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Resizable drawer
  const [isDragging, setIsDragging] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(1100);
  const widthRef = useRef(drawerWidth);

  // Resizable modal
  const [modalWidth, setModalWidth] = useState(800);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState<{ x: number; width: number; direction: 'left' | 'right' } | null>(
    null
  );
  const modalWidthRef = useRef(modalWidth);

  // Resizable gem modal
  const [gemModalWidth, setGemModalWidth] = useState(750);
  const [isGemModalDragging, setIsGemModalDragging] = useState(false);
  const [gemDragStartInfo, setGemDragStartInfo] = useState<{
    x: number;
    width: number;
    direction: 'left' | 'right';
  } | null>(null);
  const gemModalWidthRef = useRef(gemModalWidth);

  // Resizable tip modal
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipModalWidth, setTipModalWidth] = useState(750);
  const [isTipModalDragging, setIsTipModalDragging] = useState(false);
  const [tipDragStartInfo, setTipDragStartInfo] = useState<{
    x: number;
    width: number;
    direction: 'left' | 'right';
  } | null>(null);
  const tipModalWidthRef = useRef(tipModalWidth);

  // Resizable revenue modal
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [revenueModalWidth, setRevenueModalWidth] = useState(1050);
  const [isRevenueModalDragging, setIsRevenueModalDragging] = useState(false);
  const [revenueDragStartInfo, setRevenueDragStartInfo] = useState<{
    x: number;
    width: number;
    direction: 'left' | 'right';
  } | null>(null);
  const revenueModalWidthRef = useRef(revenueModalWidth);

  const customer = data?.customer;
  const stats = data?.stats;
  const comboBalances = data?.comboBalances || [];
  const bookings = data?.bookings || [];
  const notes = data?.notes || [];
  const calls = data?.calls || [];

  useEffect(() => {
    widthRef.current = drawerWidth;
  }, [drawerWidth]);

  useEffect(() => {
    modalWidthRef.current = modalWidth;
  }, [modalWidth]);

  useEffect(() => {
    gemModalWidthRef.current = gemModalWidth;
  }, [gemModalWidth]);

  useEffect(() => {
    tipModalWidthRef.current = tipModalWidth;
  }, [tipModalWidth]);

  useEffect(() => {
    revenueModalWidthRef.current = revenueModalWidth;
  }, [revenueModalWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_detail_drawer_width');
      if (saved) {
        setDrawerWidth(parseInt(saved, 10));
      }
      const savedModal = localStorage.getItem('customer_combo_modal_width');
      if (savedModal) {
        setModalWidth(parseInt(savedModal, 10));
      }
      const savedGemModal = localStorage.getItem('customer_gem_modal_width');
      if (savedGemModal) {
        setGemModalWidth(parseInt(savedGemModal, 10));
      }
      const savedTipModal = localStorage.getItem('customer_tip_modal_width');
      if (savedTipModal) {
        setTipModalWidth(parseInt(savedTipModal, 10));
      }
      const savedRevenueModal = localStorage.getItem('customer_revenue_modal_width');
      if (savedRevenueModal) {
        setRevenueModalWidth(parseInt(savedRevenueModal, 10));
      }
    }
  }, []);

  // Tab data state & memory cache
  const [activeTab, setActiveTab] = useState<string>('bookings');
  const [tabDataMap, setTabDataMap] = useState<
    Record<string, { items: SafeAny[]; totalCount: number; hasMore: boolean; page: number; loading: boolean }>
  >({});
  const tabDataMapRef = useRef(tabDataMap);
  tabDataMapRef.current = tabDataMap;

  const fetchDetails = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setForbiddenError(null);
    try {
      const summaryData = await apiClient.customers.getSummary(customerId);
      setData(summaryData);
    } catch (err) {
      console.error('Failed to fetch detailed customer:', err);
      if ((err as SafeAny).response?.status === 403) {
        setForbiddenError(
          (err as SafeAny).response?.data?.message || 'Bạn không có quyền xem thông tin chi tiết khách hàng này.'
        );
      } else {
        optionsRef.current?.onError?.(
          (err as SafeAny).response?.data?.message || 'Không thể tải thông tin chi tiết khách hàng.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const loadDetailedData = useCallback(async () => {
    if (!customerId) return null;

    if (detailData?.customer?.id === customerId) {
      return detailData;
    }

    if (detailRequestRef.current?.customerId === customerId) {
      return detailRequestRef.current.promise;
    }

    const requestedCustomerId = customerId;
    let request: Promise<SafeAny>;
    request = apiClient.customers
      .getDetailed(customerId)
      .then((nextDetailData) => {
        if (activeCustomerIdRef.current === requestedCustomerId) {
          setDetailData(nextDetailData);
        }
        return nextDetailData;
      })
      .catch((err) => {
        console.error('Failed to fetch customer report details:', err);
        optionsRef.current?.onError?.(
          (err as SafeAny).response?.data?.message || 'Không thể tải lịch sử giao dịch khách hàng.'
        );
        return null;
      })
      .finally(() => {
        if (detailRequestRef.current?.promise === request) {
          detailRequestRef.current = null;
        }
      });

    detailRequestRef.current = { customerId: requestedCustomerId, promise: request };
    return request;
  }, [customerId, detailData]);

  const fetchTabData = useCallback(
    async (tabKey: string, pageNum = 1, append = false, force = false) => {
      if (!customerId) return;

      const currentTabData = tabDataMapRef.current[tabKey];
      // If already cached and not loading more page 1, skip (unless force is true)
      if (!force && !append && pageNum === 1 && currentTabData?.items && currentTabData.items.length > 0) {
        return;
      }

      setTabDataMap((prev) => ({
        ...prev,
        [tabKey]: {
          items: append ? prev[tabKey]?.items || [] : prev[tabKey]?.items || [],
          totalCount: prev[tabKey]?.totalCount || 0,
          hasMore: prev[tabKey]?.hasMore ?? true,
          page: pageNum,
          loading: true,
        },
      }));

      try {
        let res: { items: SafeAny[]; totalCount: number; hasMore: boolean };
        if (tabKey === 'bookings') {
          res = await apiClient.customers.getBookings(customerId, { page: pageNum, limit: 15 });
        } else if (tabKey === 'notes') {
          res = await apiClient.customers.getNotes(customerId, { page: pageNum, limit: 15 });
        } else if (tabKey === 'calls') {
          res = await apiClient.customers.getCalls(customerId, { page: pageNum, limit: 15 });
        } else {
          res = { items: [], totalCount: 0, hasMore: false };
        }

        setTabDataMap((prev) => {
          const currentItems = append ? prev[tabKey]?.items || [] : [];
          return {
            ...prev,
            [tabKey]: {
              items: [...currentItems, ...res.items],
              totalCount: res.totalCount,
              hasMore: res.hasMore,
              page: pageNum,
              loading: false,
            },
          };
        });
      } catch (err) {
        console.error(`Failed to fetch tab ${tabKey}:`, err);
        setTabDataMap((prev) => ({
          ...prev,
          [tabKey]: {
            ...prev[tabKey],
            loading: false,
          },
        }));
      }
    },
    [customerId]
  );

  const refetchTabData = useCallback(
    (tabKey: string) => {
      return fetchTabData(tabKey, 1, false, true);
    },
    [fetchTabData]
  );

  const refreshAllDetails = useCallback(async () => {
    const loadedTabs = Object.keys(tabDataMapRef.current).filter((key) => ['bookings', 'notes', 'calls'].includes(key));
    await Promise.all([fetchDetails(), ...loadedTabs.map((key) => fetchTabData(key, 1, false, true))]);
    optionsRef.current?.onUpdate?.();
  }, [fetchDetails, fetchTabData]);

  // Instantly refresh customer detail drawer when calls/bookings/customer data are updated
  useEffect(() => {
    const handleDataChanged = () => {
      if (open && customerId) {
        refreshAllDetails();
      }
    };
    window.addEventListener('mos-data-updated', handleDataChanged);
    window.addEventListener('mos-call-log-saved', handleDataChanged);
    window.addEventListener('mos-customer-updated', handleDataChanged);
    window.addEventListener('mos-booking-updated', handleDataChanged);
    return () => {
      window.removeEventListener('mos-data-updated', handleDataChanged);
      window.removeEventListener('mos-call-log-saved', handleDataChanged);
      window.removeEventListener('mos-customer-updated', handleDataChanged);
      window.removeEventListener('mos-booking-updated', handleDataChanged);
    };
  }, [open, customerId, refreshAllDetails]);

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      if (key === 'timeline') {
        void Promise.all([fetchTabData('notes', 1, false), fetchTabData('calls', 1, false)]);
        return;
      }
      void fetchTabData(key, 1, false);
    },
    [fetchTabData]
  );

  const prevOpenRef = useRef<boolean>(false);
  const prevCustomerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const isJustOpened = open && !prevOpenRef.current;
    const isCustomerChanged = open && customerId !== prevCustomerIdRef.current;
    const isJustClosed = !open && prevOpenRef.current;

    if (open && customerId && (isJustOpened || isCustomerChanged)) {
      setTabDataMap({});
      setActiveTab('bookings');
      setDetailData(null);
      detailRequestRef.current = null;
      void fetchDetails();
      void fetchTabData('bookings', 1, false);
      // Booking cards render their attached CC/CS notes immediately, so warm
      // only this first note page instead of the entire customer dossier.
      void fetchTabData('notes', 1, false);
    } else if (isJustClosed) {
      setData(null);
      setDetailData(null);
      detailRequestRef.current = null;
      setForbiddenError(null);
      setTabDataMap({});
    }

    prevOpenRef.current = open;
    prevCustomerIdRef.current = customerId;
  }, [open, customerId]);

  // Drawer resize event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const viewportWidth = getViewportSize().width;
      const newWidth = viewportWidth - e.clientX;
      const minWidth = 500;
      const maxWidth = viewportWidth * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setDrawerWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('customer_detail_drawer_width', String(widthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Combo Modal drag event handlers
  const handleModalDragStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setDragStartInfo({
      x: e.clientX,
      width: modalWidthRef.current,
      direction,
    });
    setIsModalDragging(true);
  }, []);

  useEffect(() => {
    if (!isModalDragging || !dragStartInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      let deltaX = 0;
      if (dragStartInfo.direction === 'right') {
        deltaX = e.clientX - dragStartInfo.x;
      } else {
        deltaX = dragStartInfo.x - e.clientX;
      }

      const newWidth = dragStartInfo.width + deltaX * 2;
      const minWidth = 500;
      const maxWidth = getViewportSize().width * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setModalWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsModalDragging(false);
      setDragStartInfo(null);
      localStorage.setItem('customer_combo_modal_width', String(modalWidthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isModalDragging, dragStartInfo]);

  // Gem Modal drag event handlers
  const handleGemModalDragStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setGemDragStartInfo({
      x: e.clientX,
      width: gemModalWidthRef.current,
      direction,
    });
    setIsGemModalDragging(true);
  }, []);

  useEffect(() => {
    if (!isGemModalDragging || !gemDragStartInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      let deltaX = 0;
      if (gemDragStartInfo.direction === 'right') {
        deltaX = e.clientX - gemDragStartInfo.x;
      } else {
        deltaX = gemDragStartInfo.x - e.clientX;
      }

      const newWidth = gemDragStartInfo.width + deltaX * 2;
      const minWidth = 500;
      const maxWidth = getViewportSize().width * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setGemModalWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsGemModalDragging(false);
      setGemDragStartInfo(null);
      localStorage.setItem('customer_gem_modal_width', String(gemModalWidthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isGemModalDragging, gemDragStartInfo]);

  // Tip Modal drag event handlers
  const handleTipModalDragStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setTipDragStartInfo({
      x: e.clientX,
      width: tipModalWidthRef.current,
      direction,
    });
    setIsTipModalDragging(true);
  }, []);

  useEffect(() => {
    if (!isTipModalDragging || !tipDragStartInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      let deltaX = 0;
      if (tipDragStartInfo.direction === 'right') {
        deltaX = e.clientX - tipDragStartInfo.x;
      } else {
        deltaX = tipDragStartInfo.x - e.clientX;
      }

      const newWidth = tipDragStartInfo.width + deltaX * 2;
      const minWidth = 500;
      const maxWidth = getViewportSize().width * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setTipModalWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsTipModalDragging(false);
      setTipDragStartInfo(null);
      localStorage.setItem('customer_tip_modal_width', String(tipModalWidthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTipModalDragging, tipDragStartInfo]);

  // Revenue Modal drag event handlers
  const handleRevenueModalDragStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setRevenueDragStartInfo({
      x: e.clientX,
      width: revenueModalWidthRef.current,
      direction,
    });
    setIsRevenueModalDragging(true);
  }, []);

  useEffect(() => {
    if (!isRevenueModalDragging || !revenueDragStartInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      let deltaX = 0;
      if (revenueDragStartInfo.direction === 'right') {
        deltaX = e.clientX - revenueDragStartInfo.x;
      } else {
        deltaX = revenueDragStartInfo.x - e.clientX;
      }

      const newWidth = revenueDragStartInfo.width + deltaX * 2;
      const minWidth = 600;
      const maxWidth = getViewportSize().width * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setRevenueModalWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsRevenueModalDragging(false);
      setRevenueDragStartInfo(null);
      localStorage.setItem('customer_revenue_modal_width', String(revenueModalWidthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRevenueModalDragging, revenueDragStartInfo]);

  // Save edits handler
  const handleOpenEditModal = () => {
    if (!customer) return;
    editForm.setFieldsValue({
      name: customer.name,
      email: customer.email,
      gender: customer.gender,
      isForeign: Boolean(customer.isForeign),
      dob: customer.dob ? dayjs(customer.dob) : null,
      phones:
        customer.phones && customer.phones.length > 0
          ? customer.phones.map((p: SafeAny) => ({ id: p.id, phone_number: p.phone_number, is_active: !p.is_disabled }))
          : [{ phone_number: customer.phone, is_active: true }],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setSaveLoading(true);

      const originalPhones = customer.phones || [];
      const currentPhones = values.phones || [];
      const phonesPayload = [];

      for (const orig of originalPhones) {
        const isStillHere = currentPhones.some((curr: SafeAny) => curr.id === orig.id);
        if (!isStillHere) {
          phonesPayload.push({
            id: orig.id,
            phone_number: orig.phone_number,
            is_deleted: true,
          });
        }
      }

      for (const curr of currentPhones) {
        phonesPayload.push({
          id: curr.id,
          phone_number: curr.phone_number,
          is_disabled: !curr.is_active,
        });
      }

      const targetId = Number(customer?.legacyUserId || customer?.id || customerId);
      await apiClient.customers.update(targetId, {
        name: values.name,
        email: values.email || null,
        gender: values.gender || null,
        isForeign: values.isForeign,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        phones: phonesPayload,
      });

      optionsRef.current?.onSuccess?.('Cập nhật thông tin khách hàng thành công!');
      setIsEditModalOpen(false);
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'customer-edit' } }));
      await refreshAllDetails();
    } catch (err) {
      console.error('Update customer failed:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Không thể cập nhật thông tin khách hàng.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleForeign = async () => {
    if (!customerId || !customer) return;
    try {
      setSaveLoading(true);
      const newStatus = !customer.isForeign;
      const targetId = Number(customer?.legacyUserId || customer?.id || customerId);
      await apiClient.customers.update(targetId, {
        name: customer.name,
        email: customer.email || null,
        gender: customer.gender || null,
        isForeign: newStatus,
        dob: customer.dob ? dayjs(customer.dob).format('YYYY-MM-DD') : null,
        phones: (customer.phones || []).map((p: SafeAny) => ({
          id: p.id,
          phone_number: p.phone_number,
          is_disabled: Boolean(p.is_disabled),
        })),
      });

      optionsRef.current?.onSuccess?.(
        newStatus ? 'Đã đổi thành Khách nước ngoài 🌐' : 'Đã đổi thành Khách Việt Nam 🇻🇳'
      );
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'customer-edit' } }));
      await refreshAllDetails();
    } catch (err) {
      console.error('Toggle foreign status failed:', err);
      optionsRef.current?.onError?.('Không thể đổi trạng thái quốc tịch khách hàng.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete & Restore Customer
  const handleDeleteCustomer = async () => {
    if (!customerId) return;
    setDeleteLoading(true);
    try {
      await apiClient.customers.delete(customerId);
      optionsRef.current?.onSuccess?.('Xóa khách hàng thành công!');
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'customer-delete' } }));
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      console.error('Delete customer error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể xóa khách hàng.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestoreCustomer = async () => {
    if (!customerId) return;
    setRestoreLoading(true);
    try {
      await apiClient.customers.restore(customerId);
      optionsRef.current?.onSuccess?.('Khôi phục khách hàng thành công!');
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'customer-restore' } }));
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      console.error('Restore customer error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể khôi phục khách hàng.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (orderId: number) => {
    try {
      await apiClient.customers.deleteBooking(orderId);
      optionsRef.current?.onSuccess?.('Hủy lịch hẹn thành công!');
      window.dispatchEvent(new CustomEvent('mos-booking-updated'));
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'cancel-booking' } }));
      await refreshAllDetails();
    } catch (err) {
      console.error('[Cancel] Failed to cancel booking:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi hủy lịch hẹn.');
    }
  };

  // Unpin customer note
  const handleUnpinNote = async (noteId: number) => {
    if (!customerId) return;
    setUnpinLoading(true);
    try {
      const res = await apiClient.customers.unpinNote(customerId, noteId);
      optionsRef.current?.onSuccess?.(res.message || 'Bỏ ghim ghi chú thành công!');
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'unpin-note' } }));
      await refreshAllDetails();
    } catch (err) {
      console.error('Failed to unpin note:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể bỏ ghim ghi chú.');
    } finally {
      setUnpinLoading(false);
    }
  };

  // Pin/Unpin note toggle
  const handlePinToggle = async (noteId: number, currentSticky: boolean) => {
    if (!customerId) return;
    setUnpinLoading(true);
    try {
      if (currentSticky) {
        const res = await apiClient.customers.unpinNote(customerId, noteId);
        optionsRef.current?.onSuccess?.(res.message || 'Bỏ ghim ghi chú thành công!');
      } else {
        const res = await apiClient.customers.pinNote(customerId, noteId);
        optionsRef.current?.onSuccess?.(res.message || 'Ghim ghi chú thành công!');
      }
      await refreshAllDetails();
    } catch (err) {
      console.error('Failed to toggle pin state:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái ghim.'
      );
    } finally {
      setUnpinLoading(false);
    }
  };

  const getMostFrequentDay = (bookingsList: SafeAny[]) => {
    if (!bookingsList || bookingsList.length === 0) return 'N/A';
    const dayCounts = Array(7).fill(0);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    bookingsList.forEach((b) => {
      if (b.bookingDate) {
        const day = new Date(b.bookingDate).getDay();
        dayCounts[day]++;
      }
    });

    let maxIndex = 0;
    let maxVal = 0;
    dayCounts.forEach((val, idx) => {
      if (val > maxVal) {
        maxVal = val;
        maxIndex = idx;
      }
    });

    return maxVal > 0 ? `${dayNames[maxIndex]} (${maxVal} lần)` : 'N/A';
  };

  const isCompletedOrValidVisit = (orderState: string) => {
    return (
      [
        'ServiceCompleted',
        'Completed',
        'CheckOut',
        'CheckIn',
        'ServiceStart',
        'ServiceEnd',
        'ServiceCleaned',
        'Consultation',
      ].includes(orderState) || orderState !== 'Cancelled'
    );
  };

  const getFavoriteTechnicians = (bookingsList: SafeAny[]) => {
    if (!bookingsList || bookingsList.length === 0) return 'Chưa có';
    const techCounts: { [key: string]: number } = {};

    bookingsList.forEach((b) => {
      if (isCompletedOrValidVisit(b.orderState)) {
        const name = b.technicianName || b.checkinStaffName || b.checkoutStaffName;
        if (name && name !== 'Unknown' && name !== 'Kỹ thuật viên' && name !== 'Chuyên viên') {
          const trimmed = name.trim();
          if (!trimmed.includes('(Đã nghỉ)')) {
            techCounts[trimmed] = (techCounts[trimmed] || 0) + 1;
          }
        }
      }
    });

    const sortedTechs = Object.entries(techCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (sortedTechs.length === 0) return 'Chưa có';

    const top2 = sortedTechs.slice(0, 2);
    return top2.map((t) => `${t.name} (${t.count} lần)`).join(', ');
  };

  const getFavoriteBranch = (bookingsList: SafeAny[]) => {
    if (!bookingsList || bookingsList.length === 0) return 'N/A';
    const branchCounts: { [key: string]: number } = {};

    bookingsList.forEach((b) => {
      if (isCompletedOrValidVisit(b.orderState) && b.branchName) {
        const name = b.branchName.trim();
        branchCounts[name] = (branchCounts[name] || 0) + 1;
      }
    });

    const sortedBranches = Object.entries(branchCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (sortedBranches.length === 0) return 'N/A';
    return `${sortedBranches[0].name} (${sortedBranches[0].count} lần)`;
  };

  const getRecentTechnician = (bookingsList: SafeAny[]) => {
    if (!bookingsList || bookingsList.length === 0) return 'N/A';

    // Sort bookings by date descending
    const sorted = [...bookingsList].sort((a, b) => {
      const dateA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
      const dateB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
      return dateB - dateA;
    });

    for (const b of sorted) {
      if (isCompletedOrValidVisit(b.orderState)) {
        const name = b.technicianName || b.checkinStaffName || b.checkoutStaffName;
        if (name && name !== 'Unknown' && name !== 'Kỹ thuật viên' && name !== 'Chuyên viên') {
          const trimmed = name.trim();
          if (!trimmed.includes('(Đã nghỉ)')) {
            return trimmed;
          }
        }
      }
    }
    return 'N/A';
  };

  const getFavoriteTimeSlot = (bookingsList: SafeAny[]) => {
    if (!bookingsList || bookingsList.length === 0) return 'N/A';
    const hourCounts: { [key: number]: number } = {};

    bookingsList.forEach((b) => {
      if (isCompletedOrValidVisit(b.orderState) && b.bookingDate) {
        const hour = new Date(b.bookingDate).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const sortedHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
      .sort((a, b) => b.count - a.count);

    if (sortedHours.length === 0) return 'N/A';
    const favoriteHour = sortedHours[0].hour;
    const startStr = favoriteHour < 10 ? `0${favoriteHour}:00` : `${favoriteHour}:00`;
    const endHour = (favoriteHour + 1) % 24;
    const endStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
    return `${startStr} - ${endStr} (${sortedHours[0].count} lần)`;
  };

  const getRecentVisitTime = (bookingsList: SafeAny[]) => {
    if (!bookingsList || bookingsList.length === 0) return 'N/A';

    // Sort bookings by date descending
    const sorted = [...bookingsList].sort((a, b) => {
      const dateA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
      const dateB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
      return dateB - dateA;
    });

    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    for (const b of sorted) {
      if (isCompletedOrValidVisit(b.orderState) && b.bookingDate) {
        const date = new Date(b.bookingDate);
        const dayOfWeek = dayNames[date.getDay()];
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const timeStr = `${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}`;
        return `${dayOfWeek} lúc ${timeStr}`;
      }
    }
    return 'N/A';
  };

  const getComboDisplayInfo = (
    serviceName: string,
    normalCount: number,
    retainCount: number,
    packageNormalCount?: number,
    packageKey?: string
  ) => {
    const nameLower = (serviceName || '').toLowerCase();

    let totalNew: number | null = null;
    let totalRefill: number | null = null;

    if (packageKey) {
      const match = packageKey.match(/^(\d+)\+(\d+)/);
      if (match) {
        totalNew = parseInt(match[1], 10);
        totalRefill = parseInt(match[2], 10);
      }
    }

    const total = packageNormalCount && packageNormalCount > 0 ? packageNormalCount : null;
    if (totalNew === null && totalRefill === null) {
      if (nameLower.includes('refill')) {
        totalRefill = total;
        totalNew = 0;
      } else {
        totalNew = total;
        totalRefill = 0;
      }
    }

    if (totalNew === null) totalNew = nameLower.includes('new') ? 10 : 0;
    if (totalRefill === null) totalRefill = nameLower.includes('refill') ? 3 : 0;

    return {
      displayName: `${serviceName} ${packageKey ? `(${packageKey})` : ''}`,
      totalNew,
      totalRefill,
      total,
    };
  };

  return {
    // tab states & caching
    activeTab,
    tabDataMap,
    handleTabChange,
    fetchTabData,
    counts: data?.counts || { bookingCount: 0, noteCount: 0, callCount: 0, timelineCount: 0 },
    // states
    loading,
    data,
    detailData,
    rescheduleModalVisible,
    selectedBookingForReschedule,
    isGemModalOpen,
    isComboModalOpen,
    bookingWizardOpen,
    deleteLoading,
    isEditModalOpen,
    editForm,
    saveLoading,
    restoreLoading,
    forbiddenError,
    drawerWidth,
    isDragging,
    modalWidth,
    gemModalWidth,
    isTipModalOpen,
    tipModalWidth,
    isRevenueModalOpen,
    revenueModalWidth,
    // data items
    customer,
    stats,
    comboBalances,
    bookings,
    notes,
    calls,
    // handlers
    setRescheduleModalVisible,
    setSelectedBookingForReschedule,
    setIsGemModalOpen,
    setIsComboModalOpen,
    setBookingWizardOpen,
    setIsEditModalOpen,
    setIsTipModalOpen,
    setIsRevenueModalOpen,
    fetchDetails,
    loadDetailedData,
    refetchTabData,
    refreshAllDetails,
    handleMouseDown,

    handleModalDragStart,
    handleGemModalDragStart,
    handleTipModalDragStart,
    handleRevenueModalDragStart,
    handleOpenEditModal,
    handleSaveEdit,
    handleToggleForeign,
    handleDeleteCustomer,
    handleRestoreCustomer,
    handleCancelBooking,
    handleUnpinNote,
    handlePinToggle,
    unpinLoading,
    // helpers
    getMostFrequentDay,
    getFavoriteTechnicians,
    getComboDisplayInfo,
    getFavoriteBranch,
    getRecentTechnician,
    getFavoriteTimeSlot,
    getRecentVisitTime,
  };
}
