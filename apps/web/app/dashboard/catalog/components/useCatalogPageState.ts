'use client';

import { useEffect, useState } from 'react';
import { message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  type CatalogItemHistoryResponse,
  type CatalogItemType,
  type CatalogProduct,
  type CatalogReportSummary,
  type CatalogService,
  type CatalogServicePrice,
  isAdminOrSuperAdminRole,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { type CatalogFilterItemType, type CatalogViewMode, getLastPage } from './catalogHelpers';

dayjs.extend(isoWeek);

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const saved = localStorage.getItem(key);
  return saved ? Number(saved) : fallback;
};

export interface SelectedLeaderboardItem {
  itemId: number;
  itemType: CatalogItemType;
  name: string;
}

export function useCatalogPageState() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCatalogAdmin, setIsCatalogAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_active_tab');
      if (saved) return saved;
    }
    return 'report';
  });

  const [leaderboardPage, setLeaderboardPage] = useState<number>(() => readStoredNumber('catalog_leaderboard_page', 1));
  const [leaderboardPageSize, setLeaderboardPageSize] = useState<number>(() =>
    readStoredNumber('catalog_leaderboard_pageSize', 20)
  );

  const [servicePage, setServicePage] = useState<number>(1);
  const [servicePageSize, setServicePageSize] = useState<number>(10);
  const [comboPage, setComboPage] = useState<number>(1);
  const [comboPageSize, setComboPageSize] = useState<number>(10);
  const [productPage, setProductPage] = useState<number>(1);
  const [productPageSize, setProductPageSize] = useState<number>(10);

  const [services, setServices] = useState<CatalogService[]>([]);
  const [combos, setCombos] = useState<CatalogServicePrice[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceGroupFilter, setServiceGroupFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');

  const [dynamicGroups, setDynamicGroups] = useState<string[]>(['LashesTop', 'LashesUnder', 'LashLift', 'Product']);
  const [dynamicTypes, setDynamicTypes] = useState<string[]>(['Normal', 'Retain', 'Removal']);

  const [showDisabled, setShowDisabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_show_disabled');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_view_mode');
      if (saved && ['month', 'week', 'day'].includes(saved)) return saved as CatalogViewMode;
    }
    return 'month';
  });
  const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs());
  const [reportItemType, setReportItemType] = useState<CatalogFilterItemType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_report_item_type');
      if (saved && ['all', 'service', 'combo', 'product'].includes(saved)) return saved as CatalogFilterItemType;
    }
    return 'all';
  });
  const [reportSearch, setReportSearch] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_report_search');
      if (saved !== null) return saved;
    }
    return '';
  });
  const [reportSummary, setReportSummary] = useState<CatalogReportSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [selectedLeaderboardItem, setSelectedLeaderboardItem] = useState<SelectedLeaderboardItem | null>(null);
  const [itemHistoryData, setItemHistoryData] = useState<CatalogItemHistoryResponse | null>(null);
  const [loadingItemHistory, setLoadingItemHistory] = useState(false);

  const fetchGroupsAndTypes = async () => {
    try {
      const [groupsRes, typesRes] = await Promise.all([apiClient.catalog.getGroups(), apiClient.catalog.getTypes()]);
      if (groupsRes?.success && Array.isArray(groupsRes.data) && groupsRes.data.length > 0) {
        setDynamicGroups(groupsRes.data);
      }
      if (typesRes?.success && Array.isArray(typesRes.data) && typesRes.data.length > 0) {
        setDynamicTypes(typesRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch catalog groups and types:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('mos_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isDanhDo = Boolean(
          user?.username?.toLowerCase() === 'danhdo@gmail.com' || user?.email?.toLowerCase() === 'danhdo@gmail.com'
        );
        const hasAdminAccess = isAdminOrSuperAdminRole(user?.role) || isDanhDo;
        setIsAdmin(hasAdminAccess);
        setIsCatalogAdmin(hasAdminAccess);
      } catch {
        setIsAdmin(false);
        setIsCatalogAdmin(false);
      }
    } else {
      setIsAdmin(false);
      setIsCatalogAdmin(false);
    }

    const savedServicePage = localStorage.getItem('catalog_service_page');
    if (savedServicePage) setServicePage(Number(savedServicePage));
    const savedServiceSize = localStorage.getItem('catalog_service_pageSize');
    if (savedServiceSize) setServicePageSize(Number(savedServiceSize));

    const savedComboPage = localStorage.getItem('catalog_combo_page');
    if (savedComboPage) setComboPage(Number(savedComboPage));
    const savedComboSize = localStorage.getItem('catalog_combo_pageSize');
    if (savedComboSize) setComboPageSize(Number(savedComboSize));

    const savedProductPage = localStorage.getItem('catalog_product_page');
    if (savedProductPage) setProductPage(Number(savedProductPage));
    const savedProductSize = localStorage.getItem('catalog_product_pageSize');
    if (savedProductSize) setProductPageSize(Number(savedProductSize));

    fetchGroupsAndTypes();
  }, []);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res = await apiClient.catalog.listServices({
        search: serviceSearch || undefined,
        group: serviceGroupFilter !== 'all' ? serviceGroupFilter : undefined,
        pageSize: 1000,
      });
      setServices(res.data);
    } catch {
      message.error('Lỗi khi tải danh sách dịch vụ');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchCombos = async () => {
    setLoadingCombos(true);
    try {
      const res = await apiClient.catalog.listCombos({ pageSize: 1000 });
      setCombos(res.data);
    } catch {
      message.error('Lỗi khi tải danh sách gói combo');
    } finally {
      setLoadingCombos(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await apiClient.catalog.listProducts({
        search: productSearch || undefined,
        pageSize: 1000,
      });
      setProducts(res.data);
    } catch {
      message.error('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoadingProducts(false);
    }
  };

  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const weekNum = referenceDate.isoWeek();
      return `Tuần ${weekNum} (${referenceDate.startOf('isoWeek').format('DD/MM')} - ${referenceDate.endOf('isoWeek').format('DD/MM/YYYY')})`;
    }
    return referenceDate.format('DD/MM/YYYY');
  };

  const getDateBounds = () => {
    if (viewMode === 'day') {
      const dayStr = referenceDate.format('YYYY-MM-DD');
      return { dFrom: dayStr, dTo: dayStr };
    }
    if (viewMode === 'week') {
      return {
        dFrom: referenceDate.startOf('isoWeek').format('YYYY-MM-DD'),
        dTo: referenceDate.endOf('isoWeek').format('YYYY-MM-DD'),
      };
    }
    return {
      dFrom: referenceDate.startOf('month').format('YYYY-MM-DD'),
      dTo: referenceDate.endOf('month').format('YYYY-MM-DD'),
    };
  };

  const fetchReportSummary = async () => {
    setLoadingReport(true);
    try {
      const { dFrom, dTo } = getDateBounds();
      const res = await apiClient.catalog.statsSummary({
        period: viewMode === 'day' ? 'today' : viewMode,
        dateFrom: dFrom,
        dateTo: dTo,
        search: reportSearch || undefined,
        itemType: reportItemType,
      });
      if (res && res.success) {
        setReportSummary(res.data);
      }
    } catch (err) {
      console.error('Error fetching catalog report summary:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchItemHistory = async (item: SelectedLeaderboardItem) => {
    setLoadingItemHistory(true);
    try {
      const { dFrom, dTo } = getDateBounds();
      const res = await apiClient.catalog.itemHistory({
        itemId: item.itemId,
        itemType: item.itemType,
        dateFrom: dFrom,
        dateTo: dTo,
      });
      if (res && res.success) {
        setItemHistoryData(res);
      }
    } catch (err) {
      console.error('Error fetching item history:', err);
    } finally {
      setLoadingItemHistory(false);
    }
  };

  useEffect(() => {
    fetchReportSummary();
  }, [viewMode, referenceDate, reportItemType, reportSearch]);

  useEffect(() => {
    const lastPage = getLastPage(reportSummary?.leaderboard.length ?? 0, leaderboardPageSize);
    if (leaderboardPage <= lastPage) return;

    setLeaderboardPage(lastPage);
    localStorage.setItem('catalog_leaderboard_page', String(lastPage));
  }, [leaderboardPage, leaderboardPageSize, reportSummary?.leaderboard.length]);

  useEffect(() => {
    if (selectedLeaderboardItem) {
      fetchItemHistory(selectedLeaderboardItem);
    } else {
      setItemHistoryData(null);
    }
  }, [selectedLeaderboardItem, viewMode, referenceDate]);

  useEffect(() => {
    if (isAdmin) {
      fetchServices();
      fetchCombos();
      fetchProducts();
    }
  }, [isAdmin, serviceSearch, serviceGroupFilter, productSearch]);

  const handleViewModeChange = (mode: CatalogViewMode) => {
    setViewMode(mode);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_view_mode', mode);
    localStorage.setItem('catalog_leaderboard_page', '1');
  };

  const handleReportItemTypeChange = (type: CatalogFilterItemType) => {
    setReportItemType(type);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_report_item_type', type);
    localStorage.setItem('catalog_leaderboard_page', '1');
  };

  const handleReportSearchChange = (val: string) => {
    setReportSearch(val);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_report_search', val);
    localStorage.setItem('catalog_leaderboard_page', '1');
  };

  const handleLeaderboardPageChange = (page: number, pageSize: number) => {
    const nextPage = pageSize === leaderboardPageSize ? page : 1;
    setLeaderboardPage(nextPage);
    setLeaderboardPageSize(pageSize);
    localStorage.setItem('catalog_leaderboard_page', String(nextPage));
    localStorage.setItem('catalog_leaderboard_pageSize', String(pageSize));
  };

  const handleShowDisabledChange = (checked: boolean) => {
    setShowDisabled(checked);
    localStorage.setItem('catalog_show_disabled', String(checked));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    localStorage.setItem('catalog_active_tab', key);
  };

  const handleServicePageChange = (page: number, pageSize: number) => {
    setServicePage(page);
    setServicePageSize(pageSize);
    localStorage.setItem('catalog_service_page', String(page));
    localStorage.setItem('catalog_service_pageSize', String(pageSize));
  };

  const handleComboPageChange = (page: number, pageSize: number) => {
    setComboPage(page);
    setComboPageSize(pageSize);
    localStorage.setItem('catalog_combo_page', String(page));
    localStorage.setItem('catalog_combo_pageSize', String(pageSize));
  };

  const handleProductPageChange = (page: number, pageSize: number) => {
    setProductPage(page);
    setProductPageSize(pageSize);
    localStorage.setItem('catalog_product_page', String(page));
    localStorage.setItem('catalog_product_pageSize', String(pageSize));
  };

  const handleNavigateDate = (direction: number) => {
    setLeaderboardPage(1);
    localStorage.setItem('catalog_leaderboard_page', '1');
    if (viewMode === 'month') {
      setReferenceDate((prev) => prev.add(direction, 'month'));
    } else if (viewMode === 'week') {
      setReferenceDate((prev) => prev.add(direction, 'week'));
    } else if (viewMode === 'day') {
      setReferenceDate((prev) => prev.add(direction, 'day'));
    }
  };

  const handleToday = () => {
    setReferenceDate(dayjs());
    setViewMode('month');
    setLeaderboardPage(1);
    localStorage.setItem('catalog_leaderboard_page', '1');
  };

  const handleDateValueChange = (date: Dayjs) => {
    setReferenceDate(date);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_leaderboard_page', '1');
  };

  return {
    isAdmin,
    isCatalogAdmin,
    activeTab,
    setActiveTab,
    leaderboardPage,
    leaderboardPageSize,
    servicePage,
    setServicePage,
    servicePageSize,
    comboPage,
    setComboPage,
    comboPageSize,
    productPage,
    setProductPage,
    productPageSize,
    services,
    combos,
    products,
    loadingServices,
    loadingCombos,
    loadingProducts,
    serviceSearch,
    setServiceSearch,
    serviceGroupFilter,
    setServiceGroupFilter,
    serviceTypeFilter,
    setServiceTypeFilter,
    productSearch,
    setProductSearch,
    dynamicGroups,
    dynamicTypes,
    showDisabled,
    viewMode,
    referenceDate,
    reportItemType,
    reportSearch,
    reportSummary,
    loadingReport,
    selectedLeaderboardItem,
    setSelectedLeaderboardItem,
    itemHistoryData,
    loadingItemHistory,
    fetchServices,
    fetchCombos,
    fetchProducts,
    fetchReportSummary,
    fetchItemHistory,
    getPeriodLabel,
    handleViewModeChange,
    handleReportItemTypeChange,
    handleReportSearchChange,
    handleLeaderboardPageChange,
    handleShowDisabledChange,
    handleTabChange,
    handleServicePageChange,
    handleComboPageChange,
    handleProductPageChange,
    handleNavigateDate,
    handleToday,
    handleDateValueChange,
  };
}
