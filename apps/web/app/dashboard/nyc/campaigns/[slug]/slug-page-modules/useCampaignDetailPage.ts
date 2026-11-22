'use client';

import type React from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { message, theme } from 'antd';
import {
  type Campaign,
  type CampaignBookingStatusFilter,
  type CampaignPromotion,
  type CampaignStatsResponse,
  type CampaignTouchpoint,
  type CustomerServiceFilterCategory,
  type CustomerServiceFilterOption,
  type SharedPoolOverviewStats,
  type Staff,
  isAdminOrSuperAdminRole,
} from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { useTheme } from '~/context/ThemeContext';
import { apiClient } from '~/lib/api-client';
import { getFixedFinalPriceServiceCategories, getFixedFinalPriceServiceOptions } from '~/lib/campaign-fixed-price';
import { normalizeCampaignAccessStaff } from '~/lib/campaign-form-options';
import type { CampaignDetailUser } from './campaignDetailTypes';
import {
  buildDisplayTouchpoints,
  buildInitialCampaignPromotionContext,
  filterBookerStaffList,
  getCampaignCustomerKey,
  isCampaignDetailAdmin,
  readSavedCampaignPage,
  readSavedCampaignPageSize,
  readStoredCampaignUser,
  writeSavedCampaignPage,
  writeSavedCampaignPageSize,
} from './campaignDetailUtils';
import { useCampaignCustomerActions } from './useCampaignCustomerActions';
import { useCampaignEditModal } from './useCampaignEditModal';
import { useCampaignSharedPool } from './useCampaignSharedPool';

export function useCampaignDetailPage(slug: string) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall, callState } = useOmiCall();
  const isInitializedRef = useRef(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [touchpoints, setTouchpoints] = useState<CampaignTouchpoint[]>([]);
  const [promotions, setPromotions] = useState<CampaignPromotion[]>([]);
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<number | 'ALL'>('ALL');
  const [selectedPoolStatus, setSelectedPoolStatus] = useState<string>('ALL');

  const [customersLoading, setCustomersLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [selectedTouchpointKey] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookerId, setSelectedBookerId] = useState<string>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<CampaignBookingStatusFilter>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedCustomersByKey, setSelectedCustomersByKey] = useState<Map<React.Key, any>>(() => new Map());

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => readSavedCampaignPageSize());
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (slug) {
      const savedPage = readSavedCampaignPage(slug);
      if (savedPage) {
        setCurrentPage(savedPage);
      }
    }
  }, [slug]);

  useEffect(() => {
    setCurrentPage(1);
    if (slug) {
      writeSavedCampaignPage(slug, 1);
    }
  }, [bookingStatusFilter, selectedTouchpointKey, searchQuery, selectedBookerId, slug]);

  const [currentUser, setCurrentUser] = useState<CampaignDetailUser | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceFilterOptions, setServiceFilterOptions] = useState<CustomerServiceFilterOption[]>([]);
  const [serviceFilterCategories, setServiceFilterCategories] = useState<CustomerServiceFilterCategory[]>([]);
  const [campaignFormOptionsLoading, setCampaignFormOptionsLoading] = useState(true);
  const [campaignFormOptionsError, setCampaignFormOptionsError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminOrSuperAdminRole(currentUser?.role)) {
      setSelectedBookerId((current) => (current === 'ALL' ? current : 'ALL'));
    }
  }, [currentUser?.role]);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState<boolean>(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState<boolean>(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any | null>(null);
  const [smsModalVisible, setSmsModalVisible] = useState<boolean>(false);

  useEffect(() => {
    const storedUser = readStoredCampaignUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      if (!isAdminOrSuperAdminRole(storedUser.role)) {
        setSelectedBookerId(String(storedUser.id));
      } else {
        setSelectedBookerId('ALL');
      }
    }

    let cancelled = false;
    const loadCampaignFormOptions = async () => {
      setCampaignFormOptionsLoading(true);
      setCampaignFormOptionsError(null);
      try {
        const [bookerRows, serviceResponse] = await Promise.all([
          apiClient.customers.getStaff({ role: 'booker' }),
          apiClient.customers.getServiceFilterOptions(),
        ]);
        let availableStaff = normalizeCampaignAccessStaff(bookerRows);
        if (availableStaff.length === 0) {
          availableStaff = normalizeCampaignAccessStaff(await apiClient.customers.getStaff());
        }
        if (!cancelled) {
          setStaffList(availableStaff);
          setServiceFilterOptions(serviceResponse.services || []);
          setServiceFilterCategories(serviceResponse.categories || []);
        }
      } catch (error) {
        console.error('Failed to load campaign form options:', error);
        if (!cancelled) {
          setCampaignFormOptionsError('Không thể tải danh sách thành viên hoặc dịch vụ. Hãy thử tải lại trang.');
        }
      } finally {
        if (!cancelled) setCampaignFormOptionsLoading(false);
      }
    };
    void loadCampaignFormOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const fixedFinalPriceServices = useMemo(
    () => getFixedFinalPriceServiceOptions(serviceFilterOptions),
    [serviceFilterOptions]
  );
  const fixedFinalPriceCategories = useMemo(
    () => getFixedFinalPriceServiceCategories(serviceFilterCategories, fixedFinalPriceServices),
    [fixedFinalPriceServices, serviceFilterCategories]
  );

  const isAdmin = useMemo(() => isCampaignDetailAdmin(currentUser), [currentUser]);

  const initialCampaignPromotionContext = useMemo(
    () => buildInitialCampaignPromotionContext(campaign, promotions, serviceFilterCategories, serviceFilterOptions),
    [campaign, promotions, serviceFilterCategories, serviceFilterOptions]
  );

  const fetchCampaignData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const campRes: any = await apiClient.campaigns.getBySlug(slug);
      setCampaign(campRes);
      setTouchpoints(campRes.touchpoints || campRes.CampaignTouchpoint || []);
      setPromotions(campRes.promotions || campRes.CampaignPromotion || []);

      if (campRes.id) {
        const statsRes: any = await apiClient.campaigns.getStats(campRes.id);
        setStats(statsRes);
      }
    } catch (err) {
      console.error('Fetch campaign details error:', err);
      message.error('Không thể tải thông tin chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchCampaignCustomers = useCallback(
    async (isBackground = false) => {
      const campId = campaign?.id;
      if (!campId) return;
      if (!isBackground) setCustomersLoading(true);
      try {
        const params: any = {
          page: currentPage,
          pageSize,
        };
        if (selectedBookerId !== 'ALL') {
          params.assignedStaffId = selectedBookerId;
        }
        if (deferredSearchQuery.trim()) {
          params.search = deferredSearchQuery.trim();
        }
        if (bookingStatusFilter !== 'ALL') {
          params.bookingStatus = bookingStatusFilter;
        }
        if (campaign?.operationMode === 'SHARED_POOL') {
          if (selectedBatch !== 'ALL') {
            params.batchNumber = selectedBatch;
          }
          if (selectedPoolStatus !== 'ALL') {
            params.poolStatus = selectedPoolStatus;
          }
        }
        const res: any = await apiClient.campaigns.getCustomers(campId, params);
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setCustomers(list);
        setCustomersTotal(Array.isArray(res) ? list.length : Number(res?.total ?? list.length));
      } catch (err) {
        console.error('Fetch campaign customers error:', err);
        message.error('Không thể tải danh sách khách hàng');
      } finally {
        if (!isBackground) setCustomersLoading(false);
      }
    },
    [
      bookingStatusFilter,
      campaign,
      currentPage,
      deferredSearchQuery,
      pageSize,
      selectedBatch,
      selectedBookerId,
      selectedPoolStatus,
    ]
  );

  const sharedPool = useCampaignSharedPool({
    campaign,
    currentUser,
    selectedBatch,
    setSelectedBatch,
    selectedPoolStatus,
    setCustomers,
    fetchCampaignCustomers,
    makeCall,
  });

  const editModal = useCampaignEditModal({
    slug,
    campaign,
    touchpoints,
    promotions,
    fixedFinalPriceServices,
    fixedFinalPriceCategories,
    fetchCampaignData,
    fetchCampaignCustomers,
  });

  const customerActions = useCampaignCustomerActions({
    campaign,
    currentUser,
    selectedBookerId,
    selectedTouchpointKey,
    searchQuery,
    bookingStatusFilter,
    selectedRowKeys,
    setSelectedRowKeys,
    setSelectedCustomersByKey,
    setCustomers,
    setStats,
    setCurrentPage,
    fetchCampaignCustomers,
  });

  const { setSharedPoolOverview, fetchSharedPoolOverview } = sharedPool;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const init = async () => {
      try {
        setLoading(true);
        const campRes: any = await apiClient.campaigns.getBySlug(slug);
        if (cancelled) return;
        setCampaign(campRes);
        setTouchpoints(campRes.touchpoints || campRes.CampaignTouchpoint || []);
        setPromotions(campRes.promotions || campRes.CampaignPromotion || []);

        if (campRes.id) {
          const promises: Promise<any>[] = [
            apiClient.campaigns.getStats(campRes.id),
            apiClient.campaigns.getCustomers(campRes.id, {
              page: currentPage,
              pageSize,
              ...(deferredSearchQuery.trim() ? { search: deferredSearchQuery.trim() } : {}),
              ...(selectedBookerId !== 'ALL' ? { assignedStaffId: selectedBookerId } : {}),
              ...(bookingStatusFilter !== 'ALL' ? { bookingStatus: bookingStatusFilter } : {}),
            }),
          ];
          if (campRes.operationMode === 'SHARED_POOL') {
            promises.push(apiClient.campaigns.getSharedPoolOverview(campRes.id));
          }

          const settled = await Promise.allSettled(promises);
          if (cancelled) return;
          if (settled[0].status === 'fulfilled') setStats(settled[0].value as any);
          if (settled[1].status === 'fulfilled') {
            const list = Array.isArray(settled[1].value)
              ? settled[1].value
              : (settled[1].value as any)?.items || (settled[1].value as any)?.data || [];
            setCustomers(list);
            setCustomersTotal(
              Array.isArray(settled[1].value) ? list.length : Number((settled[1].value as any)?.total ?? list.length)
            );
          }
          if (campRes.operationMode === 'SHARED_POOL' && settled[2]?.status === 'fulfilled') {
            const overviewData = settled[2].value as SharedPoolOverviewStats;
            setSharedPoolOverview(overviewData);
            if (overviewData?.activeBatchNumber) {
              setSelectedBatch(overviewData.activeBatchNumber);
            }
          }
        }
        isInitializedRef.current = true;
      } catch (err) {
        console.error('Fetch campaign details error:', err);
        message.error('Không thể tải thông tin chiến dịch');
      } finally {
        setLoading(false);
        setCustomersLoading(false);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!isInitializedRef.current || !campaign?.id) return;
    if (searchQuery !== deferredSearchQuery) return;
    void fetchCampaignCustomers();
  }, [campaign?.id, deferredSearchQuery, fetchCampaignCustomers, searchQuery]);

  useEffect(() => {
    const handleDataRefresh = async (e?: Event) => {
      if (!isInitializedRef.current) return;
      if (campaign?.id) {
        if (campaign.operationMode === 'SHARED_POOL') {
          const detail = (e as CustomEvent)?.detail;
          const customerId = detail?.customerId;
          if (customerId) {
            try {
              await apiClient.campaigns.syncSharedPoolCall(campaign.id, customerId);
            } catch {
              // Handled by backend calls.create or non-claimed
            }
          }
          void fetchSharedPoolOverview(undefined, true);
        }
        void fetchCampaignCustomers();
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }
    };

    window.addEventListener('mos-call-log-saved', handleDataRefresh);
    window.addEventListener('mos-customer-updated', handleDataRefresh);
    window.addEventListener('mos-booking-updated', handleDataRefresh);
    window.addEventListener('mos-data-updated', handleDataRefresh);

    return () => {
      window.removeEventListener('mos-call-log-saved', handleDataRefresh);
      window.removeEventListener('mos-customer-updated', handleDataRefresh);
      window.removeEventListener('mos-booking-updated', handleDataRefresh);
      window.removeEventListener('mos-data-updated', handleDataRefresh);
    };
  }, [campaign?.id, campaign?.operationMode, fetchCampaignCustomers, fetchSharedPoolOverview]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if ((callState === 'idle' || callState === 'wrapup') && campaign?.id) {
      const timer = setTimeout(() => {
        void fetchCampaignCustomers();
        if (campaign.operationMode === 'SHARED_POOL') {
          void fetchSharedPoolOverview(undefined, true);
        }
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [callState, campaign?.id, campaign?.operationMode, fetchCampaignCustomers, fetchSharedPoolOverview]);

  const { showSelectedOnly } = customerActions;
  const tableCustomers = useMemo(
    () => (showSelectedOnly ? Array.from(selectedCustomersByKey.values()) : customers),
    [customers, selectedCustomersByKey, showSelectedOnly]
  );

  const bookerStaffList = useMemo(
    () => filterBookerStaffList(staffList, campaign?.assignedStaffIds),
    [campaign?.assignedStaffIds, staffList]
  );

  const displayTouchpoints = useMemo(() => buildDisplayTouchpoints(touchpoints), [touchpoints]);

  const rawSelectedCustomerId = selectedCustomer
    ? selectedCustomer.legacyUserId || selectedCustomer.customerId || selectedCustomer.id || null
    : null;
  const selectedCustomerId: number | null =
    rawSelectedCustomerId !== null ? Number(rawSelectedCustomerId) || null : null;

  const handleRowSelectionChange = useCallback((keys: React.Key[], rows: any[]) => {
    const nextKeys = new Set(keys);
    setSelectedRowKeys(keys);
    setSelectedCustomersByKey((previous) => {
      const next = new Map(Array.from(previous).filter(([key]) => nextKeys.has(key)));
      rows.forEach((record: any) => {
        next.set(getCampaignCustomerKey(record), record);
      });
      return next;
    });
  }, []);

  const handlePageChange = useCallback(
    (page: number, pSize?: number) => {
      setCurrentPage(page);
      if (slug) {
        writeSavedCampaignPage(slug, page);
      }
      if (pSize && pSize !== pageSize) {
        setPageSize(pSize);
        writeSavedCampaignPageSize(pSize);
      }
    },
    [pageSize, slug]
  );

  const handleSelectBatch = useCallback(
    (batch: number | 'ALL') => {
      setSelectedBatch(batch);
      setCurrentPage(1);
      void fetchSharedPoolOverview(batch);
    },
    [fetchSharedPoolOverview]
  );

  const handleSelectPoolStatus = useCallback((status: string) => {
    setSelectedPoolStatus(status);
    setCurrentPage(1);
  }, []);

  const handleToggleStaffFilter = useCallback((staffId: string) => {
    setSelectedBookerId((prev) => (prev === staffId ? 'ALL' : staffId));
    setCurrentPage(1);
  }, []);

  const handleOpenCustomerDetailDrawer = useCallback((cust?: any) => {
    if (cust) {
      setSelectedCustomer(cust);
    }
    setDetailDrawerVisible(true);
  }, []);

  const handleOpenBookingWizard = useCallback((cust: any) => {
    setBookingInitialCustomer(cust);
    setBookingWizardVisible(true);
  }, []);

  const handleOpenSmsModal = useCallback((cust: any) => {
    setSelectedCustomer(cust);
    setSmsModalVisible(true);
  }, []);

  return {
    themeMode,
    token,
    makeCall,
    loading,
    campaign,
    touchpoints,
    promotions,
    stats,
    selectedBatch,
    selectedPoolStatus,
    customersLoading,
    customers,
    customersTotal,
    searchQuery,
    setSearchQuery,
    selectedBookerId,
    setSelectedBookerId,
    bookingStatusFilter,
    setBookingStatusFilter,
    selectedRowKeys,
    selectedCustomersByKey,
    currentPage,
    setCurrentPage,
    pageSize,
    staffList,
    campaignFormOptionsLoading,
    campaignFormOptionsError,
    fixedFinalPriceServices,
    fixedFinalPriceCategories,
    isAdmin,
    initialCampaignPromotionContext,
    selectedCustomer,
    setSelectedCustomer,
    selectedCustomerId,
    detailDrawerVisible,
    setDetailDrawerVisible,
    bookingWizardVisible,
    setBookingWizardVisible,
    bookingInitialCustomer,
    smsModalVisible,
    setSmsModalVisible,
    tableCustomers,
    bookerStaffList,
    displayTouchpoints,
    fetchCampaignCustomers,
    handleRowSelectionChange,
    handlePageChange,
    handleSelectBatch,
    handleSelectPoolStatus,
    handleToggleStaffFilter,
    handleOpenCustomerDetailDrawer,
    handleOpenBookingWizard,
    handleOpenSmsModal,
    ...sharedPool,
    ...editModal,
    ...customerActions,
  };
}
