'use client';

import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Card,
  Badge,
  Tag,
  Switch,
  Typography,
  Space,
  theme as antdTheme,
  Result,
  Alert,
  Button,
  Select,
  Input,
  Row,
  Col,
  message,
  Drawer,
  Form,
  InputNumber,
  Popconfirm,
  Tooltip,
  DatePicker,
} from 'antd';
import {
  ShopOutlined,
  AppstoreOutlined,
  TagOutlined,
  ProjectOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TrophyOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { PageHeader } from '../../../components/ui';
import CatalogReportHeader from './components/CatalogReportHeader';
import CatalogLeaderboardCard from './components/CatalogLeaderboardCard';
import CatalogItemDetailPanel from './components/CatalogItemDetailPanel';
import CatalogComboLiveTab from './components/CatalogComboLiveTab';
import { ServiceDeactivateConfirmModal } from './components/ServiceDeactivateConfirmModal';
import {
  CatalogService,
  CatalogServicePrice,
  CatalogProduct,
  CatalogReportSummary,
  CatalogItemHistoryResponse,
  CatalogItemType,
  ServiceLiveComboCheckResult,
  SERVICE_GROUPS,
  SERVICE_TYPES,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

export type CatalogViewMode = 'month' | 'week' | 'day';
export type CatalogFilterItemType = 'all' | 'service' | 'combo' | 'product';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CatalogPage() {
  const { themeMode } = useTheme();
  const { token } = antdTheme.useToken();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Persistent Tab state ('report' | 'services' | 'combos' | 'products')
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_active_tab');
      if (saved) return saved;
    }
    return 'report';
  });

  // Persistent Pagination states
  const [leaderboardPage, setLeaderboardPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_leaderboard_page');
      if (saved) return Number(saved);
    }
    return 1;
  });
  const [leaderboardPageSize, setLeaderboardPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_leaderboard_pageSize');
      if (saved) return Number(saved);
    }
    return 20;
  });

  const [servicePage, setServicePage] = useState<number>(1);
  const [servicePageSize, setServicePageSize] = useState<number>(10);

  const [comboPage, setComboPage] = useState<number>(1);
  const [comboPageSize, setComboPageSize] = useState<number>(10);

  const [productPage, setProductPage] = useState<number>(1);
  const [productPageSize, setProductPageSize] = useState<number>(10);

  // Data states
  const [services, setServices] = useState<CatalogService[]>([]);
  const [combos, setCombos] = useState<CatalogServicePrice[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  // Loading states
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceGroupFilter, setServiceGroupFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    totalCombos: 0,
    activeCombos: 0,
    totalProducts: 0,
    activeProducts: 0,
  });

  // Drawer states
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);

  // Live Combo Pre-deactivation Warning Modal states
  const [liveComboModalOpen, setLiveComboModalOpen] = useState(false);
  const [liveComboCheckData, setLiveComboCheckData] = useState<ServiceLiveComboCheckResult | null>(null);
  const [pendingDeactivateTarget, setPendingDeactivateTarget] = useState<{
    type: 'toggle' | 'save' | 'delete';
    id: number;
    values?: any;
    currentDisabled?: boolean;
    serviceName?: string;
  } | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const [comboDrawerOpen, setComboDrawerOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<CatalogServicePrice | null>(null);

  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Form instances
  const [serviceForm] = Form.useForm();
  const [comboForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [isCatalogAdmin, setIsCatalogAdmin] = useState(false);

  // Show disabled items filter (default false -> hides disabled items)
  const [showDisabled, setShowDisabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_show_disabled');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  // Report & Leaderboard States (CC Dashboard Style)
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_view_mode');
      if (saved && ['month', 'week', 'day'].includes(saved)) return saved as CatalogViewMode;
    }
    return 'month';
  });
  const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs());
  const [pickerOpen, setPickerOpen] = useState(false);
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

  // Selected Item Detail State
  const [selectedLeaderboardItem, setSelectedLeaderboardItem] = useState<{
    itemId: number;
    itemType: CatalogItemType;
    name: string;
  } | null>(null);
  const [itemHistoryData, setItemHistoryData] = useState<CatalogItemHistoryResponse | null>(null);
  const [loadingItemHistory, setLoadingItemHistory] = useState(false);

  // Load persistent settings from localStorage on mount
  useEffect(() => {
    const userStr = localStorage.getItem('mos_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isDanhDo = Boolean(
          user?.username?.toLowerCase() === 'danhdo@gmail.com' || user?.email?.toLowerCase() === 'danhdo@gmail.com'
        );
        setIsAdmin(user?.role === 'admin');
        setIsCatalogAdmin(isDanhDo);
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
  }, []);

  const handleViewModeChange = (mode: CatalogViewMode) => {
    setViewMode(mode);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_view_mode', mode);
  };

  const handleReportItemTypeChange = (type: CatalogFilterItemType) => {
    setReportItemType(type);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_report_item_type', type);
  };

  const handleReportSearchChange = (val: string) => {
    setReportSearch(val);
    setLeaderboardPage(1);
    localStorage.setItem('catalog_report_search', val);
  };

  const handleLeaderboardPageChange = (page: number, pageSize: number) => {
    setLeaderboardPage(page);
    setLeaderboardPageSize(pageSize);
    localStorage.setItem('catalog_leaderboard_page', String(page));
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

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res = await apiClient.catalog.listServices({
        search: serviceSearch || undefined,
        group: serviceGroupFilter !== 'all' ? serviceGroupFilter : undefined,
        pageSize: 1000,
      });
      setServices(res.data);
      updateStats('services', res.data);
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
      updateStats('combos', res.data);
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
      updateStats('products', res.data);
    } catch {
      message.error('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoadingProducts(false);
    }
  };

  const getDateBounds = () => {
    let dFrom: string;
    let dTo: string;
    if (viewMode === 'day') {
      dFrom = referenceDate.format('YYYY-MM-DD');
      dTo = referenceDate.format('YYYY-MM-DD');
    } else if (viewMode === 'week') {
      dFrom = referenceDate.startOf('isoWeek').format('YYYY-MM-DD');
      dTo = referenceDate.endOf('isoWeek').format('YYYY-MM-DD');
    } else {
      dFrom = referenceDate.startOf('month').format('YYYY-MM-DD');
      dTo = referenceDate.endOf('month').format('YYYY-MM-DD');
    }
    return { dFrom, dTo };
  };

  const handleNavigateDate = (direction: number) => {
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

  const fetchItemHistory = async (item: { itemId: number; itemType: CatalogItemType; name: string }) => {
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
    if (selectedLeaderboardItem) {
      fetchItemHistory(selectedLeaderboardItem);
    } else {
      setItemHistoryData(null);
    }
  }, [selectedLeaderboardItem, viewMode, referenceDate]);

  const handleEditItemFromDetail = (itemId: number, itemType: CatalogItemType) => {
    if (itemType === 'service') {
      const target = services.find((s) => s.id === itemId);
      if (target) {
        setActiveTab('services');
        handleOpenServiceDrawer(target);
      } else {
        message.info('Vui lòng mở tab Dịch vụ bên dưới để chỉnh sửa');
      }
    } else if (itemType === 'combo') {
      const target = combos.find((c) => c.id === itemId);
      if (target) {
        setActiveTab('combos');
        handleOpenComboDrawer(target);
      } else {
        message.info('Vui lòng mở tab Combo bên dưới để chỉnh sửa');
      }
    } else {
      const target = products.find((p) => p.id === itemId);
      if (target) {
        setActiveTab('products');
        handleOpenProductDrawer(target);
      } else {
        message.info('Vui lòng mở tab Sản phẩm bên dưới để chỉnh sửa');
      }
    }
  };

  const handleToggleStatusFromDetail = async (itemId: number, itemType: CatalogItemType, currentDisabled: boolean) => {
    if (itemType === 'service') {
      await handleToggleServiceStatus(itemId, currentDisabled);
    } else if (itemType === 'combo') {
      await handleToggleComboStatus(itemId, currentDisabled);
    } else {
      await handleToggleProductStatus(itemId, currentDisabled);
    }
    fetchReportSummary();
    if (selectedLeaderboardItem) {
      fetchItemHistory(selectedLeaderboardItem);
    }
  };

  const updateStats = (type: 'services' | 'combos' | 'products', data: any[]) => {
    setStats((prev) => {
      const newStats = { ...prev };
      if (type === 'services') {
        newStats.totalServices = data.length;
        newStats.activeServices = data.filter((d) => !d.isDisabled).length;
      } else if (type === 'combos') {
        newStats.totalCombos = data.length;
        newStats.activeCombos = data.filter((d) => !d.isDisabled).length;
      } else if (type === 'products') {
        newStats.totalProducts = data.length;
        newStats.activeProducts = data.filter((d) => !d.isDisabled).length;
      }
      return newStats;
    });
  };

  useEffect(() => {
    if (isAdmin) {
      fetchServices();
      fetchCombos();
      fetchProducts();
    }
  }, [isAdmin, serviceSearch, serviceGroupFilter, productSearch]);

  if (isAdmin === null) return null;
  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Xin lỗi, bạn không có quyền truy cập trang này."
        extra={
          <Button type="primary" href="/dashboard">
            Về trang chủ
          </Button>
        }
      />
    );
  }

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  // ─── Service Handlers ──────────────────────────────────────────────────────

  const handleOpenServiceDrawer = (record?: CatalogService) => {
    if (record) {
      setEditingService(record);
      const firstPrice = record.prices && record.prices.length > 0 ? record.prices[0].servicePrice : undefined;
      serviceForm.setFieldsValue({
        serviceName: record.serviceName,
        serviceKey: record.serviceKey,
        serviceGroup: record.serviceGroup,
        serviceType: record.serviceType,
        durationMinute: record.durationMinute,
        durationMinuteStandard: record.durationMinuteStandard || record.durationMinute,
        remindingIntervalDay: record.remindingIntervalDay,
        servicePrice: firstPrice,
        serviceDescription: record.serviceDescription,
      });
    } else {
      setEditingService(null);
      serviceForm.resetFields();
      serviceForm.setFieldsValue({
        serviceGroup: 'LashesTop',
        serviceType: 'Normal',
        durationMinute: 60,
        durationMinuteStandard: 60,
        remindingIntervalDay: 21,
      });
    }
    setServiceDrawerOpen(true);
  };

  const handleSaveService = async (values: any, forceConfirm = false) => {
    setSaving(true);
    try {
      if (editingService) {
        if (values.isDisabled && !forceConfirm) {
          try {
            const checkRes = await apiClient.catalog.checkServiceLiveCombos(editingService.id);
            if (checkRes.data && checkRes.data.totalOwners > 0) {
              setLiveComboCheckData(checkRes.data);
              setPendingDeactivateTarget({
                type: 'save',
                id: editingService.id,
                values,
                serviceName: editingService.serviceName,
              });
              setLiveComboModalOpen(true);
              setSaving(false);
              return;
            }
          } catch (e) {
            console.error(e);
          }
        }
        await apiClient.catalog.updateService(editingService.id, { ...values, confirm: forceConfirm });
        message.success('Cập nhật dịch vụ thành công');
      } else {
        await apiClient.catalog.createService(values);
        message.success('Tạo dịch vụ mới thành công');
      }
      setServiceDrawerOpen(false);
      fetchServices();
    } catch (err: any) {
      if (err.response?.data?.code === 'LIVE_COMBOS_DETECTED' && err.response?.data?.data) {
        setLiveComboCheckData(err.response.data.data);
        setPendingDeactivateTarget({
          type: 'save',
          id: editingService?.id || 0,
          values,
          serviceName: editingService?.serviceName,
        });
        setLiveComboModalOpen(true);
      } else {
        message.error('Lỗi khi lưu dịch vụ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleServiceStatus = async (id: number, currentDisabled: boolean, forceConfirm = false) => {
    const targetService = services.find((s) => s.id === id);
    const targetName = targetService?.serviceName;

    if (!currentDisabled && !forceConfirm) {
      try {
        const checkRes = await apiClient.catalog.checkServiceLiveCombos(id);
        if (checkRes.data && checkRes.data.totalOwners > 0) {
          setLiveComboCheckData(checkRes.data);
          setPendingDeactivateTarget({
            type: 'toggle',
            id,
            currentDisabled,
            serviceName: targetName,
          });
          setLiveComboModalOpen(true);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    try {
      await apiClient.catalog.updateService(id, { isDisabled: !currentDisabled, confirm: forceConfirm });
      message.success(currentDisabled ? 'Đã kích hoạt dịch vụ' : 'Đã vô hiệu hóa dịch vụ');
      fetchServices();
    } catch (err: any) {
      if (err.response?.data?.code === 'LIVE_COMBOS_DETECTED' && err.response?.data?.data) {
        setLiveComboCheckData(err.response.data.data);
        setPendingDeactivateTarget({
          type: 'toggle',
          id,
          currentDisabled,
          serviceName: targetName,
        });
        setLiveComboModalOpen(true);
      } else {
        message.error('Lỗi khi đổi trạng thái dịch vụ');
      }
    }
  };

  const handleDeleteService = async (id: number, forceConfirm = false) => {
    const targetService = services.find((s) => s.id === id);
    const targetName = targetService?.serviceName;

    if (!forceConfirm) {
      try {
        const checkRes = await apiClient.catalog.checkServiceLiveCombos(id);
        if (checkRes.data && checkRes.data.totalOwners > 0) {
          setLiveComboCheckData(checkRes.data);
          setPendingDeactivateTarget({
            type: 'delete',
            id,
            serviceName: targetName,
          });
          setLiveComboModalOpen(true);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    try {
      await apiClient.catalog.deleteService(id, forceConfirm);
      message.success('Đã vô hiệu hóa dịch vụ');
      fetchServices();
    } catch (err: any) {
      if (err.response?.data?.code === 'LIVE_COMBOS_DETECTED' && err.response?.data?.data) {
        setLiveComboCheckData(err.response.data.data);
        setPendingDeactivateTarget({
          type: 'delete',
          id,
          serviceName: targetName,
        });
        setLiveComboModalOpen(true);
      } else {
        message.error('Lỗi khi vô hiệu hóa dịch vụ');
      }
    }
  };

  const handleConfirmDeactivateModal = async () => {
    if (!pendingDeactivateTarget) return;
    setDeactivateLoading(true);
    try {
      const { type, id, values, currentDisabled } = pendingDeactivateTarget;
      if (type === 'save' && values) {
        await handleSaveService(values, true);
      } else if (type === 'toggle') {
        await handleToggleServiceStatus(id, currentDisabled || false, true);
      } else if (type === 'delete') {
        await handleDeleteService(id, true);
      }
      setLiveComboModalOpen(false);
      setLiveComboCheckData(null);
      setPendingDeactivateTarget(null);
    } catch {
      message.error('Lỗi khi ngưng hoạt động dịch vụ');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleComboValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.serviceId || changedValues.normalCount !== undefined || changedValues.retainCount !== undefined) {
      const selectedService = services.find((s) => s.id === allValues.serviceId);
      if (selectedService && selectedService.prices && selectedService.prices.length > 0) {
        const retailPrice = selectedService.prices[0].servicePrice || 0;
        const buyNormal = allValues.normalCount || 0;
        const calculatedPrice = Math.round(retailPrice * buyNormal);
        if (calculatedPrice > 0) {
          comboForm.setFieldsValue({ servicePrice: calculatedPrice });
        }
      }
    }
  };

  const handleOpenComboDrawer = (record?: CatalogServicePrice) => {
    if (record) {
      setEditingCombo(record);
      comboForm.setFieldsValue({
        serviceId: record.serviceId,
        servicePricePackageKey: record.servicePricePackageKey,
        servicePriceType: record.servicePriceType,
        servicePrice: record.servicePrice,
        normalCount: record.normalCount,
        bonusNormalCount: record.bonusNormalCount || 0,
        retainCount: record.retainCount,
        bonusRetainCount: record.bonusRetainCount || 0,
        expiryAfterDay: record.expiryAfterDay,
      });
    } else {
      setEditingCombo(null);
      comboForm.resetFields();
      comboForm.setFieldsValue({
        servicePriceType: 'Combo',
        normalCount: 7,
        bonusNormalCount: 3,
        retainCount: 0,
        bonusRetainCount: 0,
        expiryAfterDay: 180,
        servicePrice: 2000000,
      });
    }
    setComboDrawerOpen(true);
  };

  const handleSaveCombo = async (values: any) => {
    setSaving(true);
    try {
      const perNormalPrice =
        values.normalCount > 0
          ? Math.round(values.servicePrice / (values.normalCount + values.retainCount))
          : values.servicePrice;
      const perRetainPrice = perNormalPrice;

      const payload = {
        ...values,
        servicePriceType: 'Combo',
        perNormalPrice,
        perRetainPrice,
      };

      if (editingCombo) {
        await apiClient.catalog.updateCombo(editingCombo.id, payload);
        message.success('Cập nhật gói combo thành công');
      } else {
        await apiClient.catalog.createCombo(payload);
        message.success('Tạo gói combo mới thành công');
      }
      setComboDrawerOpen(false);
      fetchCombos();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Lỗi khi lưu gói combo');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComboStatus = async (id: number, currentDisabled: boolean) => {
    try {
      await apiClient.catalog.updateCombo(id, { isDisabled: !currentDisabled });
      message.success(currentDisabled ? 'Đã kích hoạt gói combo' : 'Đã vô hiệu hóa gói combo');
      fetchCombos();
    } catch {
      message.error('Lỗi khi đổi trạng thái gói combo');
    }
  };

  const handleDeleteCombo = async (id: number) => {
    try {
      await apiClient.catalog.deleteCombo(id);
      message.success('Đã vô hiệu hóa gói combo');
      fetchCombos();
    } catch {
      message.error('Lỗi khi vô hiệu hóa gói combo');
    }
  };

  // ─── Product Handlers ──────────────────────────────────────────────────────

  const handleOpenProductDrawer = (record?: CatalogProduct) => {
    if (record) {
      setEditingProduct(record);
      productForm.setFieldsValue({
        productName: record.productName,
        productSku: record.productSku,
        productPrice: record.productPrice,
        productDescription: record.productDescription,
      });
    } else {
      setEditingProduct(null);
      productForm.resetFields();
    }
    setProductDrawerOpen(true);
  };

  const handleSaveProduct = async (values: any) => {
    setSaving(true);
    try {
      if (editingProduct) {
        await apiClient.catalog.updateProduct(editingProduct.id, values);
        message.success('Cập nhật sản phẩm thành công');
      } else {
        await apiClient.catalog.createProduct(values);
        message.success('Tạo sản phẩm mới thành công');
      }
      setProductDrawerOpen(false);
      fetchProducts();
    } catch {
      message.error('Lỗi khi lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProductStatus = async (id: number, currentDisabled: boolean) => {
    try {
      await apiClient.catalog.updateProduct(id, { isDisabled: !currentDisabled });
      message.success(currentDisabled ? 'Đã kích hoạt sản phẩm' : 'Đã vô hiệu hóa sản phẩm');
      fetchProducts();
    } catch {
      message.error('Lỗi khi đổi trạng thái sản phẩm');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await apiClient.catalog.deleteProduct(id);
      message.success('Đã vô hiệu hóa sản phẩm');
      fetchProducts();
    } catch {
      message.error('Lỗi khi vô hiệu hóa sản phẩm');
    }
  };

  // ─── Table Columns ─────────────────────────────────────────────────────────

  const serviceColumns = [
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 80,
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-semibold">{val}</span>,
    },
    {
      title: 'Tên dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (text: string, record: CatalogService) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || record.serviceKey}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.serviceKey}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loại dịch vụ',
      dataIndex: 'serviceType',
      key: 'serviceType',
      render: (type: string) => {
        let color = 'blue';
        let label = type;
        if (type === 'Normal') {
          color = 'blue';
          label = 'Normal (Thường)';
        } else if (type === 'Retain') {
          color = 'purple';
          label = 'Retain (Dặm mi)';
        } else if (type === 'Fix') {
          color = 'orange';
          label = 'Fix (Sửa mi hỏng)';
        } else if (type === 'Adjust') {
          color = 'magenta';
          label = 'Adjust (Chỉnh dáng)';
        } else if (type === 'Log') {
          color = 'cyan';
          label = 'Log (Ghi nhận)';
        } else if (type === 'Removal') {
          color = 'red';
          label = 'Removal (Tháo mi)';
        }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Nhóm',
      dataIndex: 'serviceGroup',
      key: 'serviceGroup',
      render: (group: string) => <Tag color="blue">{group}</Tag>,
    },
    {
      title: 'Thời lượng (phút)',
      dataIndex: 'durationMinute',
      key: 'durationMinute',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums">{val}</span>,
    },
    {
      title: 'Giá bán lẻ',
      key: 'servicePrice',
      align: 'right' as const,
      render: (_: any, record: CatalogService) => {
        const price = record.prices && record.prices.length > 0 ? record.prices[0].servicePrice : undefined;
        return (
          <span className="tabular-nums font-semibold" style={{ color: '#D4A84B' }}>
            {formatCurrency(price)}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      align: 'center' as const,
      render: (isDisabled: boolean, record: CatalogService) => (
        <Switch checked={!isDisabled} size="small" onChange={() => handleToggleServiceStatus(record.id, isDisabled)} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: any, record: CatalogService) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: token.colorPrimary }} />}
              onClick={() => handleOpenServiceDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Vô hiệu hóa dịch vụ"
            description="Bạn có chắc chắn muốn vô hiệu hóa dịch vụ này không?"
            onConfirm={() => handleDeleteService(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Vô hiệu hóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const comboColumns = [
    {
      title: 'Tên gói',
      dataIndex: 'servicePricePackageKey',
      key: 'servicePricePackageKey',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Loại giá',
      dataIndex: 'servicePriceType',
      key: 'servicePriceType',
      render: (type: string) => <Tag color="purple">{type}</Tag>,
    },
    {
      title: 'Giá gói',
      dataIndex: 'servicePrice',
      key: 'servicePrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums" style={{ color: '#52c41a', fontWeight: 'bold' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Số lượt nối',
      key: 'normalCount',
      align: 'center' as const,
      render: (_: any, record: CatalogServicePrice) => {
        const hasBonus = (record.bonusNormalCount || 0) > 0;
        return (
          <Space direction="vertical" size={2} align="center">
            <span className="tabular-nums font-medium">
              {hasBonus ? `${record.normalCount} mua` : `${record.normalCount}`}
            </span>
            {hasBonus && (
              <Tag color="green" style={{ fontSize: '11px', margin: 0 }}>
                + {record.bonusNormalCount} tặng
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Số lượt dặm',
      key: 'retainCount',
      align: 'center' as const,
      render: (_: any, record: CatalogServicePrice) => {
        const hasBonus = (record.bonusRetainCount || 0) > 0;
        return (
          <Space direction="vertical" size={2} align="center">
            <span className="tabular-nums font-medium">
              {hasBonus ? `${record.retainCount} mua` : `${record.retainCount}`}
            </span>
            {hasBonus && (
              <Tag color="cyan" style={{ fontSize: '11px', margin: 0 }}>
                + {record.bonusRetainCount} tặng
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Hạn (ngày)',
      dataIndex: 'expiryAfterDay',
      key: 'expiryAfterDay',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums">{val}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      align: 'center' as const,
      render: (isDisabled: boolean, record: CatalogServicePrice) => (
        <Switch checked={!isDisabled} size="small" onChange={() => handleToggleComboStatus(record.id, isDisabled)} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: any, record: CatalogServicePrice) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: token.colorPrimary }} />}
              onClick={() => handleOpenComboDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Vô hiệu hóa gói combo"
            description="Bạn có chắc chắn muốn vô hiệu hóa gói combo này không?"
            onConfirm={() => handleDeleteCombo(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Vô hiệu hóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const productColumns = [
    {
      title: 'SKU',
      dataIndex: 'productSku',
      key: 'productSku',
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (text: string, record: CatalogProduct) => <Text strong>{text || record.productSku}</Text>,
    },
    {
      title: 'Giá',
      dataIndex: 'productPrice',
      key: 'productPrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums" style={{ color: '#D4A84B', fontWeight: 'bold' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'inStockCount',
      key: 'inStockCount',
      align: 'center' as const,
      render: (inStock: number = 0, record: CatalogProduct) => {
        const total = record.totalStockCount || 0;
        if (inStock > 0) {
          return (
            <Tooltip title={`Tồn mới: ${inStock} / Tổng lịch sử nhập: ${total}`}>
              <Tag color="success" className="font-semibold tabular-nums">
                {inStock} sẵn có
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title={`Đã hết tồn kho mới. Tổng lịch sử nhập: ${total}`}>
            <Tag color="default" style={{ opacity: 0.6 }} className="tabular-nums">
              Hết hàng ({total})
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      align: 'center' as const,
      render: (isDisabled: boolean, record: CatalogProduct) => (
        <Switch checked={!isDisabled} size="small" onChange={() => handleToggleProductStatus(record.id, isDisabled)} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: any, record: CatalogProduct) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: token.colorPrimary }} />}
              onClick={() => handleOpenProductDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Vô hiệu hóa sản phẩm"
            description="Bạn có chắc chắn muốn vô hiệu hóa sản phẩm này không?"
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Vô hiệu hóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header (CC Dashboard Style) */}
      <PageHeader
        title="Quản lý Catalog"
        subtitle="Báo cáo doanh số & Quản lý danh mục Dịch vụ, Gói Combo, và Sản phẩm"
        icon={<ShopOutlined />}
        extra={
          <Space wrap size={8}>
            {/* View Mode Switcher: Minimalist Icons + Tooltips */}
            <Space.Compact>
              <Tooltip title="Xem theo Tháng">
                <Button
                  type={viewMode === 'month' ? 'primary' : 'default'}
                  icon={<CalendarOutlined />}
                  onClick={() => handleViewModeChange('month')}
                />
              </Tooltip>
              <Tooltip title="Xem theo Tuần">
                <Button
                  type={viewMode === 'week' ? 'primary' : 'default'}
                  icon={<ScheduleOutlined />}
                  onClick={() => handleViewModeChange('week')}
                />
              </Tooltip>
              <Tooltip title="Xem theo Ngày">
                <Button
                  type={viewMode === 'day' ? 'primary' : 'default'}
                  icon={<ClockCircleOutlined />}
                  onClick={() => handleViewModeChange('day')}
                />
              </Tooltip>
            </Space.Compact>

            {/* Date Navigation & Selector Pill (CC Style Image 2) */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/60 flex items-center shadow-sm">
              <Tooltip title="Kỳ trước">
                <Button
                  type="text"
                  icon={<LeftOutlined className="text-slate-600 dark:text-slate-300" />}
                  onClick={() => handleNavigateDate(-1)}
                  className="hover:bg-slate-200/60 dark:hover:bg-slate-800"
                />
              </Tooltip>
              <Tooltip title="Bấm để chọn ngày trực tiếp">
                <Button
                  type="text"
                  icon={<CalendarOutlined className="text-amber-600 dark:text-amber-400" />}
                  onClick={() => setPickerOpen(true)}
                  className="font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                >
                  {getPeriodLabel()}
                </Button>
              </Tooltip>
              <Tooltip title="Kỳ sau">
                <Button
                  type="text"
                  icon={<RightOutlined className="text-slate-600 dark:text-slate-300" />}
                  onClick={() => handleNavigateDate(1)}
                  className="hover:bg-slate-200/60 dark:hover:bg-slate-800"
                />
              </Tooltip>
            </div>

            {/* Today Button: Minimalist Icon + Tooltip */}
            <Tooltip title="Quay về Hôm nay">
              <Button
                size="middle"
                type="default"
                icon={<ReloadOutlined />}
                onClick={handleToday}
                className="text-amber-600 dark:text-amber-400 border-slate-200 dark:border-amber-500/30 hover:border-amber-500 bg-white dark:bg-transparent shadow-sm"
              />
            </Tooltip>

            {/* Hidden DatePicker for direct date picking */}
            <DatePicker
              open={pickerOpen}
              onOpenChange={(open) => setPickerOpen(open)}
              picker={viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'date'}
              onChange={(val) => {
                if (val) {
                  setReferenceDate(val);
                }
              }}
              style={{ display: 'none' }}
            />

            {/* Filter Item Type for Report Tab */}
            {activeTab === 'report' && (
              <Select
                value={reportItemType}
                onChange={(val) => handleReportItemTypeChange(val as CatalogFilterItemType)}
                style={{ width: 130 }}
                options={[
                  { value: 'all', label: 'Tất cả loại' },
                  { value: 'service', label: 'Dịch vụ' },
                  { value: 'combo', label: 'Gói Combo' },
                  { value: 'product', label: 'Sản phẩm' },
                ]}
              />
            )}

            {/* Search Input for Report Tab */}
            {activeTab === 'report' && (
              <Input
                placeholder="Tìm kiếm..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={reportSearch}
                onChange={(e) => handleReportSearchChange(e.target.value)}
                allowClear
                style={{ width: 150 }}
              />
            )}

            {/* Action Buttons for Catalog Admin: Minimalist Icon + Tooltip */}
            {isCatalogAdmin && activeTab === 'services' && (
              <Tooltip title="Thêm dịch vụ mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenServiceDrawer()} />
              </Tooltip>
            )}
            {isCatalogAdmin && activeTab === 'combos' && (
              <Tooltip title="Thêm gói combo mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenComboDrawer()} />
              </Tooltip>
            )}
            {isCatalogAdmin && activeTab === 'products' && (
              <Tooltip title="Thêm sản phẩm mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenProductDrawer()} />
              </Tooltip>
            )}
          </Space>
        }
      />

      {!isCatalogAdmin && (
        <Alert
          type="info"
          showIcon
          message="Phân quyền Quản lý Catalog"
          description="Chỉ riêng tài khoản danhdo@gmail.com mới có quyền Thêm, Sửa, Xóa dữ liệu Catalog. Bạn đang xem ở chế độ Read-only."
          className="mb-4 rounded-xl"
        />
      )}

      {/* Main Tabs Container (CC Dashboard Style) */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card"
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          size="large"
          destroyOnHidden
          animated={{ inkBar: true, tabPane: true }}
          items={[
            {
              key: 'report',
              label: (
                <Space>
                  <TrophyOutlined className="text-amber-500" />
                  <span>Báo cáo & Leaderboard</span>
                </Space>
              ),
              children: (
                <div className="p-4 space-y-4">
                  <CatalogReportHeader summary={reportSummary} loading={loadingReport} />
                  <CatalogLeaderboardCard
                    leaderboard={reportSummary?.leaderboard || []}
                    loading={loadingReport}
                    selectedItem={selectedLeaderboardItem}
                    page={leaderboardPage}
                    pageSize={leaderboardPageSize}
                    onPageChange={handleLeaderboardPageChange}
                    onSelectItem={(item) => {
                      if (
                        selectedLeaderboardItem?.itemId === item.itemId &&
                        selectedLeaderboardItem?.itemType === item.itemType
                      ) {
                        setSelectedLeaderboardItem(null);
                      } else {
                        setSelectedLeaderboardItem(item);
                      }
                    }}
                  />
                  {selectedLeaderboardItem && (
                    <div className="mt-6 pt-2">
                      <CatalogItemDetailPanel
                        selectedItem={selectedLeaderboardItem}
                        historyData={itemHistoryData}
                        loading={loadingItemHistory}
                        onClose={() => setSelectedLeaderboardItem(null)}
                        onEditItem={handleEditItemFromDetail}
                        onToggleStatus={handleToggleStatusFromDetail}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'services',
              label: (
                <Space>
                  <AppstoreOutlined />
                  <span>Dịch vụ</span>
                </Space>
              ),
              children: (
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <Space wrap align="center">
                      <Input
                        placeholder="Tìm dịch vụ..."
                        prefix={<SearchOutlined />}
                        value={serviceSearch}
                        onChange={(e) => {
                          setServiceSearch(e.target.value);
                          setServicePage(1);
                          localStorage.setItem('catalog_service_page', '1');
                        }}
                        style={{ width: 220 }}
                        allowClear
                      />
                      <Select
                        value={serviceGroupFilter}
                        onChange={(val) => {
                          setServiceGroupFilter(val);
                          setServicePage(1);
                          localStorage.setItem('catalog_service_page', '1');
                        }}
                        style={{ width: 150 }}
                        options={[
                          { value: 'all', label: 'Tất cả nhóm' },
                          { value: 'LashesTop', label: 'LashesTop' },
                          { value: 'LashesUnder', label: 'LashesUnder' },
                          { value: 'Lashes', label: 'Lashes' },
                          { value: 'Sauna', label: 'Sauna' },
                        ]}
                      />
                      <Select
                        value={serviceTypeFilter}
                        onChange={(val) => {
                          setServiceTypeFilter(val);
                          setServicePage(1);
                          localStorage.setItem('catalog_service_page', '1');
                        }}
                        style={{ width: 170 }}
                        options={[
                          { value: 'all', label: 'Tất cả loại dịch vụ' },
                          { value: 'Normal', label: 'Normal (Thường)' },
                          { value: 'Retain', label: 'Retain (Dặm mi)' },
                          { value: 'Fix', label: 'Fix (Sửa mi hỏng)' },
                          { value: 'Adjust', label: 'Adjust (Chỉnh dáng)' },
                          { value: 'Log', label: 'Log (Ghi nhận)' },
                          { value: 'Removal', label: 'Removal (Tháo mi)' },
                        ]}
                      />
                      <Space className="ml-2">
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          Chỉ hiện mục đã ẩn:
                        </Text>
                        <Switch
                          checked={showDisabled}
                          onChange={(checked) => {
                            handleShowDisabledChange(checked);
                            setServicePage(1);
                          }}
                          size="small"
                        />
                      </Space>
                    </Space>

                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenServiceDrawer()}>
                      Thêm Dịch Vụ
                    </Button>
                  </div>

                  <Table
                    rowKey="id"
                    columns={serviceColumns}
                    dataSource={services
                      .filter((s) => (showDisabled ? s.isDisabled : !s.isDisabled))
                      .filter((s) => (serviceTypeFilter === 'all' ? true : s.serviceType === serviceTypeFilter))}
                    loading={loadingServices}
                    pagination={{
                      current: servicePage,
                      pageSize: servicePageSize,
                      onChange: handleServicePageChange,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} dịch vụ`,
                    }}
                    scroll={{ x: 800 }}
                  />
                </div>
              ),
            },
            {
              key: 'combos',
              label: (
                <Space>
                  <ProjectOutlined />
                  <span>Gói Combo</span>
                </Space>
              ),
              children: (
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <Space wrap align="center">
                      <Text type="secondary">Danh sách tất cả các gói dịch vụ combo mua trước nhiều lượt</Text>
                      <Space className="ml-3">
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          Chỉ hiện mục đã ẩn:
                        </Text>
                        <Switch
                          checked={showDisabled}
                          onChange={(checked) => {
                            handleShowDisabledChange(checked);
                            setComboPage(1);
                          }}
                          size="small"
                        />
                      </Space>
                    </Space>

                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenComboDrawer()}>
                      Thêm Gói Combo
                    </Button>
                  </div>

                  <Table
                    rowKey="id"
                    columns={comboColumns}
                    dataSource={combos.filter((c) => (showDisabled ? c.isDisabled : !c.isDisabled))}
                    loading={loadingCombos}
                    pagination={{
                      current: comboPage,
                      pageSize: comboPageSize,
                      onChange: handleComboPageChange,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} gói combo`,
                    }}
                    scroll={{ x: 900 }}
                  />
                </div>
              ),
            },
            {
              key: 'combo-live',
              label: (
                <Space>
                  <ThunderboltOutlined className="text-amber-400" />
                  <span>Combo Live</span>
                </Space>
              ),
              children: (
                <div className="p-4 space-y-4">
                  <CatalogComboLiveTab />
                </div>
              ),
            },
            {
              key: 'products',
              label: (
                <Space>
                  <TagOutlined />
                  <span>Sản phẩm</span>
                </Space>
              ),
              children: (
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <Space wrap align="center">
                      <Input
                        placeholder="Tìm sản phẩm SKU hoặc tên..."
                        prefix={<SearchOutlined />}
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setProductPage(1);
                          localStorage.setItem('catalog_product_page', '1');
                        }}
                        style={{ width: 260 }}
                        allowClear
                      />
                      <Space className="ml-2">
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          Chỉ hiện mục đã ẩn:
                        </Text>
                        <Switch
                          checked={showDisabled}
                          onChange={(checked) => {
                            handleShowDisabledChange(checked);
                            setProductPage(1);
                          }}
                          size="small"
                        />
                      </Space>
                    </Space>

                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenProductDrawer()}>
                      Thêm Sản Phẩm
                    </Button>
                  </div>

                  <Table
                    rowKey="id"
                    columns={productColumns}
                    dataSource={products.filter((p) => (showDisabled ? p.isDisabled : !p.isDisabled))}
                    loading={loadingProducts}
                    pagination={{
                      current: productPage,
                      pageSize: productPageSize,
                      onChange: handleProductPageChange,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`,
                    }}
                    scroll={{ x: 700 }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ─── Service Drawer Form ────────────────────────────────────────────── */}
      <Drawer
        title={editingService ? 'Chỉnh sửa Dịch vụ' : 'Thêm Dịch Vụ Mới'}
        open={serviceDrawerOpen}
        onClose={() => setServiceDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" loading={saving} onClick={() => serviceForm.submit()}>
            Lưu Dịch Vụ
          </Button>
        }
      >
        <Form form={serviceForm} layout="vertical" onFinish={handleSaveService}>
          <Form.Item
            name="serviceName"
            label="Tên dịch vụ"
            rules={[{ required: true, message: 'Vui lòng nhập tên dịch vụ' }]}
          >
            <Input placeholder="Ví dụ: Classic 390" />
          </Form.Item>

          <Form.Item
            name="serviceKey"
            label="Mã SKU / Service Key"
            rules={[{ required: true, message: 'Vui lòng nhập mã key' }]}
          >
            <Input placeholder="Ví dụ: classic-390" disabled={!!editingService} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serviceGroup" label="Nhóm dịch vụ" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'LashesTop', label: 'LashesTop' },
                    { value: 'LashesUnder', label: 'LashesUnder' },
                    { value: 'Lashes', label: 'Lashes' },
                    { value: 'Sauna', label: 'Sauna' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serviceType" label="Loại dịch vụ" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'Normal', label: 'Normal' },
                    { value: 'Retain', label: 'Retain' },
                    { value: 'Fix', label: 'Fix' },
                    { value: 'Adjust', label: 'Adjust' },
                    { value: 'Removal', label: 'Removal' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="durationMinute" label="Thời lượng (phút)" rules={[{ required: true }]}>
                <InputNumber min={5} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="servicePrice" label="Giá bán lẻ (VNĐ)">
                <InputNumber
                  min={0}
                  step={10000}
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="serviceDescription" label="Mô tả chi tiết">
            <TextArea rows={3} placeholder="Nhập mô tả chi tiết dịch vụ..." />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ─── Combo Drawer Form ──────────────────────────────────────────────── */}
      <Drawer
        title={editingCombo ? 'Chỉnh sửa Gói Combo' : 'Thêm Gói Combo Mới'}
        open={comboDrawerOpen}
        onClose={() => setComboDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" loading={saving} onClick={() => comboForm.submit()}>
            Lưu Gói Combo
          </Button>
        }
      >
        <Form form={comboForm} layout="vertical" onFinish={handleSaveCombo} onValuesChange={handleComboValuesChange}>
          <Form.Item
            name="servicePricePackageKey"
            label="Tên gói Combo (Package Key)"
            rules={[{ required: true, message: 'Vui lòng nhập tên gói combo' }]}
          >
            <Input placeholder="Ví dụ: 7+3-classic-volume" />
          </Form.Item>

          <Form.Item
            name="serviceId"
            label="Dịch vụ áp dụng"
            rules={[{ required: true, message: 'Vui lòng chọn dịch vụ áp dụng' }]}
          >
            <Select
              showSearch
              placeholder="Chọn dịch vụ"
              optionFilterProp="label"
              options={services.map((s) => ({
                value: s.id,
                label: `${s.serviceName || s.serviceKey} (${s.serviceGroup})`,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Loại gói">
                <Input value="Gói Combo" disabled style={{ color: '#d4b106', fontWeight: 600 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="servicePrice" label="Giá trọn gói (VNĐ)" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  step={50000}
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="normalCount" label="Số lượt nối (Mua)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bonusNormalCount" label="Lượt nối tặng (+)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="retainCount" label="Số lượt dặm (Mua)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bonusRetainCount" label="Lượt dặm tặng (+)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="expiryAfterDay" label="Hạn sử dụng (ngày)" rules={[{ required: true }]}>
            <InputNumber min={1} max={1000} style={{ width: '100%' }} placeholder="Ví dụ: 180" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ─── Product Drawer Form ────────────────────────────────────────────── */}
      <Drawer
        title={editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản Phẩm Mới'}
        open={productDrawerOpen}
        onClose={() => setProductDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" loading={saving} onClick={() => productForm.submit()}>
            Lưu Sản Phẩm
          </Button>
        }
      >
        <Form form={productForm} layout="vertical" onFinish={handleSaveProduct}>
          <Form.Item
            name="productName"
            label="Tên sản phẩm"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="Ví dụ: Lipstick Supreme Matte RD 144" />
          </Form.Item>

          <Form.Item
            name="productSku"
            label="Mã SKU sản phẩm"
            rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}
          >
            <Input placeholder="Ví dụ: lipstick-144" disabled={!!editingProduct} />
          </Form.Item>

          <Form.Item name="productPrice" label="Giá bán lẻ (VNĐ)" rules={[{ required: true }]}>
            <InputNumber
              min={0}
              step={10000}
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ─── Service Deactivate Live Combo Warning Modal ─────────────────── */}
      <ServiceDeactivateConfirmModal
        open={liveComboModalOpen}
        loading={deactivateLoading}
        serviceName={pendingDeactivateTarget?.serviceName}
        data={liveComboCheckData}
        onCancel={() => {
          setLiveComboModalOpen(false);
          setLiveComboCheckData(null);
          setPendingDeactivateTarget(null);
        }}
        onConfirm={handleConfirmDeactivateModal}
      />
    </div>
  );
}
