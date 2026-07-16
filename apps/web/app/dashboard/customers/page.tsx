'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { 
  Table, 
  Avatar,
  Tabs, 
  Input, 
  Button, 
  Card, 
  Badge, 
  Space, 
  Modal, 
  Descriptions, 
  Tag, 
  Typography, 
  message, 
  Divider,
  Select,
  theme,
  Drawer,
  Form,
  InputNumber,
  Dropdown,
  Row,
  Col,
  Spin,
  Checkbox,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  CalendarOutlined, 
  PhoneOutlined,
  FilterOutlined,
  SaveOutlined,
  DeleteOutlined,
  DownOutlined,
  ClearOutlined,
  DollarOutlined,
  GiftOutlined,
  TeamOutlined,
  UserOutlined,
  SyncOutlined,
  HistoryOutlined,
  UndoOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '../../../context/ThemeContext';
import { useOmiCall } from '../../../context/OmiCallContext';
import api from '../../../lib/api';
import { apiClient } from '../../../lib/api-client';
import CustomerDetailDrawer from '../../../components/CustomerDetailDrawer';
import BookingWizardDrawer from '../../../components/BookingWizardDrawer';
import { Customer, BucketType } from '@mos-lab/shared';

const { Title, Text } = Typography;

const PRESET_FILTERS = [
  { id: 'preset_nyc_30', name: 'NYC 30 (0 - 30 ngày)', criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 0, daysSinceLastVisitMax: 30 } },
  { id: 'preset_nyc_60', name: 'NYC 60 (31 - 60 ngày)', criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 31, daysSinceLastVisitMax: 60 } },
  { id: 'preset_nyc_90', name: 'NYC 90 (61 - 90 ngày)', criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 61, daysSinceLastVisitMax: 90 } },
  { id: 'preset_nyc_180', name: 'NYC 180 (91 - 180 ngày)', criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 91, daysSinceLastVisitMax: 180 } },
  { id: 'preset_nyc_365', name: 'NYC 365 (181 - 365 ngày)', criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 181, daysSinceLastVisitMax: 365 } },
  { id: 'preset_nyc_365plus', name: 'NYC 365+ (> 365 ngày)', criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 366 } },
];

export default function CustomersPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();
  const [modal, contextHolder] = Modal.useModal();
  // Table state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Filters & Search state
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_customers_active_tab');
      return stored || 'ALL';
    }
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [sortField, setSortField] = useState('id_desc');
  
  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    comboLive: 0,
    comboDead: 0,
    single: 0,
    notComboLive: 0
  });

  // Dynamic filters state
  const [daysSinceLastVisitMin, setDaysSinceLastVisitMin] = useState<number | undefined>(undefined);
  const [daysSinceLastVisitMax, setDaysSinceLastVisitMax] = useState<number | undefined>(undefined);
  const [totalSpentMin, setTotalSpentMin] = useState<number | undefined>(undefined);
  const [totalSpentMax, setTotalSpentMax] = useState<number | undefined>(undefined);
  const [totalVisitsMin, setTotalVisitsMin] = useState<number | undefined>(undefined);
  const [totalVisitsMax, setTotalVisitsMax] = useState<number | undefined>(undefined);
  
  const [promoUsed, setPromoUsed] = useState<'yes' | 'no' | 'all'>('all');
  const [promoCountMin, setPromoCountMin] = useState<number | undefined>(undefined);
  const [promoCountMax, setPromoCountMax] = useState<number | undefined>(undefined);
  const [referralUsed, setReferralUsed] = useState<'yes' | 'no' | 'all'>('all');
  const [referralCountMin, setReferralCountMin] = useState<number | undefined>(undefined);
  const [referralCountMax, setReferralCountMax] = useState<number | undefined>(undefined);

  // Assignment states
  const searchParams = useSearchParams();
  const scopeParam = searchParams?.get('assignedStaffId');

  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  
  const [assignedStaffId, setAssignedStaffId] = useState<string>(() => {
    if (scopeParam) {
      return scopeParam;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'telesales') {
          return 'me';
        }
      }
    }
    return 'all';
  });

  useEffect(() => {
    if (scopeParam) {
      setAssignedStaffId(scopeParam);
    }
  }, [scopeParam]);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<number | undefined>(undefined);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  // Random Selector states
  const [randomModalVisible, setRandomModalVisible] = useState(false);
  const [randomCount, setRandomCount] = useState<number>(20);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomSelectedIds, setRandomSelectedIds] = useState<number[] | null>(null);
  const [excludeAssigned, setExcludeAssigned] = useState<boolean>(true);

  // Drawer & Modal control
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [saveFilterModalVisible, setSaveFilterModalVisible] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Saved Filters
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Modal detail state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any>(null);

  // Allocation History states
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState<any[]>([]);
  const [undoingBatchId, setUndoingBatchId] = useState<string | null>(null);

  // Fetch Stats (Counts for badges)
  const fetchStats = useCallback(async (
    searchVal: string,
    visitMin?: number,
    visitMax?: number,
    spentMin?: number,
    spentMax?: number,
    visitsMin?: number,
    visitsMax?: number,
    promoU?: 'yes' | 'no' | 'all',
    promoCMin?: number,
    promoCMax?: number,
    refU?: 'yes' | 'no' | 'all',
    refCMin?: number,
    refCMax?: number,
    staffId?: string
  ) => {
    try {
      const params: any = { search: searchVal };
      if (showTrash) {
        params.trash = 'true';
      }
      if (randomSelectedIds && randomSelectedIds.length > 0) {
        params.ids = randomSelectedIds.join(',');
      }
      if (visitMin !== undefined) params.daysSinceLastVisitMin = visitMin.toString();
      if (visitMax !== undefined) params.daysSinceLastVisitMax = visitMax.toString();
      if (spentMin !== undefined) params.totalSpentMin = spentMin.toString();
      if (spentMax !== undefined) params.totalSpentMax = spentMax.toString();
      if (visitsMin !== undefined) params.totalVisitsMin = visitsMin.toString();
      if (visitsMax !== undefined) params.totalVisitsMax = visitsMax.toString();
      if (promoU && promoU !== 'all') params.promoUsed = promoU;
      if (promoCMin !== undefined) params.promoCountMin = promoCMin.toString();
      if (promoCMax !== undefined) params.promoCountMax = promoCMax.toString();
      if (refU && refU !== 'all') params.referralUsed = refU;
      if (refCMin !== undefined) params.referralCountMin = refCMin.toString();
      if (refCMax !== undefined) params.referralCountMax = refCMax.toString();
      if (staffId && staffId !== 'all') params.assignedStaffId = staffId;

      const response = await api.get('/customers/stats', {
        params
      });
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  }, [randomSelectedIds, showTrash]);

  // Fetch Customer List
  const fetchCustomers = useCallback(async (
    page: number, 
    limit: number, 
    tab: string, 
    search: string, 
    sort: string,
    visitMin?: number,
    visitMax?: number,
    spentMin?: number,
    spentMax?: number,
    visitsMin?: number,
    visitsMax?: number,
    promoU?: 'yes' | 'no' | 'all',
    promoCMin?: number,
    promoCMax?: number,
    refU?: 'yes' | 'no' | 'all',
    refCMin?: number,
    refCMax?: number,
    staffId?: string,
    overrideIds?: number[]
  ) => {
    setLoading(true);
    try {
      const params: any = {
        page: page.toString(),
        limit: limit.toString(),
        sort
      };
      if (showTrash) {
        params.trash = 'true';
      }

      const idsToUse = overrideIds !== undefined ? overrideIds : randomSelectedIds;
      if (idsToUse && idsToUse.length > 0) {
        params.ids = idsToUse.join(',');
      }

      if (tab !== 'ALL') {
        params.bucket = tab;
      }
      if (search && search.trim() !== '') {
        params.search = search;
      }
      if (visitMin !== undefined) params.daysSinceLastVisitMin = visitMin.toString();
      if (visitMax !== undefined) params.daysSinceLastVisitMax = visitMax.toString();
      if (spentMin !== undefined) params.totalSpentMin = spentMin.toString();
      if (spentMax !== undefined) params.totalSpentMax = spentMax.toString();
      if (visitsMin !== undefined) params.totalVisitsMin = visitsMin.toString();
      if (visitsMax !== undefined) params.totalVisitsMax = visitsMax.toString();
      if (promoU && promoU !== 'all') params.promoUsed = promoU;
      if (promoCMin !== undefined) params.promoCountMin = promoCMin.toString();
      if (promoCMax !== undefined) params.promoCountMax = promoCMax.toString();
      if (refU && refU !== 'all') params.referralUsed = refU;
      if (refCMin !== undefined) params.referralCountMin = refCMin.toString();
      if (refCMax !== undefined) params.referralCountMax = refCMax.toString();
      if (staffId && staffId !== 'all') params.assignedStaffId = staffId;

      const response = await api.get('/customers', {
        params
      });

      if (page === 1) {
        setCustomers(response.data.data);
      } else {
        setCustomers(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = response.data.data.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
      
      if (idsToUse && idsToUse.length > 0) {
        setTotal(idsToUse.length);
      } else {
        setTotal(response.data.pagination.total);
      }
    } catch (error: any) {
      console.error('Fetch customers error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [randomSelectedIds, showTrash]);

  // Fetch Saved Filters from DB
  const fetchSavedFilters = useCallback(async () => {
    try {
      const response = await api.get('/saved-filters');
      setSavedFilters(response.data);
    } catch (error) {
      console.error('Fetch saved filters error:', error);
    }
  }, []);

  // Trigger loading list & badges on filters change
  useEffect(() => {
    fetchCustomers(
      currentPage, 
      pageSize, 
      activeTab, 
      searchQuery, 
      sortField,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId
    );
    fetchStats(
      searchQuery,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId
    );
  }, [
    currentPage, 
    pageSize, 
    activeTab, 
    searchQuery, 
    showTrash,
    sortField, 
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    fetchCustomers, 
    fetchStats
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab, 
    searchQuery, 
    sortField, 
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId
  ]);

  // Infinite Scroll / Lazy Loading Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && customers.length < total) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loading, customers.length, total]);

  // Load saved filters and staff list on mount
  useEffect(() => {
    fetchSavedFilters();
    
    const loadStaff = async () => {
      if (currentUser?.role !== 'admin') {
        return;
      }
      try {
        const res = await api.get('/customers/staff');
        setStaffList(res.data);
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };
    loadStaff();
  }, [fetchSavedFilters, currentUser?.role]);

  // Handle Search Input
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1); // Reset page to 1
  };

  // Apply a filter criteria to active state
  const applyFilter = (filter: any) => {
    setActiveFilterId(filter.id);
    const criteria = filter.criteria || {};
    
    // Set bucket (tab) if specified
    if (criteria.bucket) {
      setActiveTab(criteria.bucket);
    } else {
      setActiveTab('ALL');
    }
    
    setDaysSinceLastVisitMin(criteria.daysSinceLastVisitMin);
    setDaysSinceLastVisitMax(criteria.daysSinceLastVisitMax);
    setTotalSpentMin(criteria.totalSpentMin);
    setTotalSpentMax(criteria.totalSpentMax);
    setTotalVisitsMin(criteria.totalVisitsMin);
    setTotalVisitsMax(criteria.totalVisitsMax);
    setPromoUsed(criteria.promoUsed || 'all');
    setPromoCountMin(criteria.promoCountMin);
    setPromoCountMax(criteria.promoCountMax);
    setReferralUsed(criteria.referralUsed || 'all');
    setReferralCountMin(criteria.referralCountMin);
    setReferralCountMax(criteria.referralCountMax);
    setAssignedStaffId(criteria.assignedStaffId || (currentUser?.role === 'telesales' ? 'me' : 'all'));
    
    setCurrentPage(1);
    message.success(`Đã áp dụng bộ lọc "${filter.name}"`);
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilterId(null);
    setActiveTab('ALL');
    localStorage.setItem('mos_customers_active_tab', 'ALL');
    setDaysSinceLastVisitMin(undefined);
    setDaysSinceLastVisitMax(undefined);
    setTotalSpentMin(undefined);
    setTotalSpentMax(undefined);
    setTotalVisitsMin(undefined);
    setTotalVisitsMax(undefined);
    setPromoUsed('all');
    setPromoCountMin(undefined);
    setPromoCountMax(undefined);
    setReferralUsed('all');
    setReferralCountMin(undefined);
    setReferralCountMax(undefined);
    setAssignedStaffId(currentUser?.role === 'telesales' ? 'me' : 'all');
    setCurrentPage(1);
    setRandomSelectedIds(null);
    setSelectedRowKeys([]);
    message.info('Đã xóa tất cả bộ lọc');
  };

  // Save current dynamic filters to Database
  const handleSaveFilter = async () => {
    if (!newFilterName.trim()) {
      message.error('Vui lòng nhập tên bộ lọc');
      return;
    }

    const criteria = {
      bucket: activeTab,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId
    };

    try {
      const response = await api.post('/saved-filters', {
        name: newFilterName.trim(),
        criteria
      });
      message.success('Đã lưu bộ lọc thành công');
      setSaveFilterModalVisible(false);
      setNewFilterName('');
      fetchSavedFilters();
      setActiveFilterId(response.data.id);
    } catch (error) {
      console.error('Save filter error:', error);
      message.error('Không thể lưu bộ lọc');
    }
  };

  // Delete saved filter
  const handleDeleteFilter = async (id: string, name: string) => {
    try {
      await api.delete(`/saved-filters/${id}`);
      message.success(`Đã xóa bộ lọc "${name}"`);
      fetchSavedFilters();
      if (activeFilterId === id) {
        clearFilters();
      }
    } catch (error) {
      console.error('Delete filter error:', error);
      message.error('Không thể xóa bộ lọc');
    }
  };

  const handleAssignCustomers = async () => {
    if (!targetStaffId) {
      message.error('Vui lòng chọn nhân viên Booker');
      return;
    }
    setAssigning(true);
    try {
      await api.post('/customers/assign', {
        customerIds: selectedRowKeys.map(k => Number(k)),
        staffId: targetStaffId
      });
      message.success(`Đã phân bổ thành công ${selectedRowKeys.length} khách hàng!`);
      setSelectedRowKeys([]);
      setRandomSelectedIds(null);
      setAssignModalVisible(false);
      setTargetStaffId(undefined);
      // Reload table
      fetchCustomers(
        currentPage,
        pageSize,
        activeTab,
        searchQuery,
        sortField,
        daysSinceLastVisitMin,
        daysSinceLastVisitMax,
        totalSpentMin,
        totalSpentMax,
        totalVisitsMin,
        totalVisitsMax,
        promoUsed,
        promoCountMin,
        promoCountMax,
        referralUsed,
        referralCountMin,
        referralCountMax,
        assignedStaffId
      );
    } catch (error: any) {
      console.error('Assign error:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân bổ');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignCustomers = async () => {
    setUnassigning(true);
    try {
      await api.post('/customers/unassign', {
        customerIds: selectedRowKeys.map(k => Number(k))
      });
      message.success(`Đã hủy phân bổ thành công ${selectedRowKeys.length} khách hàng!`);
      setSelectedRowKeys([]);
      setRandomSelectedIds(null);
      setAssignModalVisible(false);
      
      // Reload table
      fetchCustomers(
        currentPage,
        pageSize,
        activeTab,
        searchQuery,
        sortField,
        daysSinceLastVisitMin,
        daysSinceLastVisitMax,
        totalSpentMin,
        totalSpentMax,
        totalVisitsMin,
        totalVisitsMax,
        promoUsed,
        promoCountMin,
        promoCountMax,
        referralUsed,
        referralCountMin,
        referralCountMax,
        assignedStaffId
      );
    } catch (error: any) {
      console.error('Unassign error:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy phân bổ');
    } finally {
      setUnassigning(false);
    }
  };

  const handleBulkDeleteCustomers = async () => {
    if (selectedRowKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const ids = selectedRowKeys.map(k => Number(k));
      const res = await apiClient.customers.bulkDelete(ids);
      if (res.success) {
        message.success(`Đã xóa thành công ${res.count} khách hàng!`);
        setSelectedRowKeys([]);
        setRandomSelectedIds(null);
        // Refresh list
        fetchCustomers(
          1,
          pageSize,
          activeTab,
          searchQuery,
          sortField,
          daysSinceLastVisitMin,
          daysSinceLastVisitMax,
          totalSpentMin,
          totalSpentMax,
          totalVisitsMin,
          totalVisitsMax,
          promoUsed,
          promoCountMin,
          promoCountMax,
          referralUsed,
          referralCountMin,
          referralCountMax,
          assignedStaffId
        );
        // Refresh stats
        fetchStats(
          searchQuery,
          daysSinceLastVisitMin,
          daysSinceLastVisitMax,
          totalSpentMin,
          totalSpentMax,
          totalVisitsMin,
          totalVisitsMax,
          promoUsed,
          promoCountMin,
          promoCountMax,
          referralUsed,
          referralCountMin,
          referralCountMax,
          assignedStaffId
        );
      }
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa hàng loạt');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const fetchAssignmentHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/customers/assignment-history', {
        params: { page, limit: 10 }
      });
      setHistoryData(response.data.data);
      setHistoryTotal(response.data.pagination.total);
      setHistoryPage(page);
    } catch (error) {
      console.error('Fetch assignment history error:', error);
      message.error('Không thể lấy lịch sử phân bổ');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchBatchDetails = async (batchId: string) => {
    setBatchDetailsLoading(true);
    setExpandedBatchId(batchId);
    try {
      const response = await api.get(`/customers/assignment-history/${batchId}/details`);
      setBatchDetails(response.data.data);
    } catch (error) {
      console.error('Fetch batch details error:', error);
      message.error('Không thể lấy chi tiết đợt phân bổ');
    } finally {
      setBatchDetailsLoading(false);
    }
  };

  const handleUndoAssignment = async (batchId: string) => {
    setUndoingBatchId(batchId);
    try {
      const response = await api.post('/customers/assignment-history/undo', { batchId });
      const { revertedCount, totalCount, skippedCount } = response.data;
      
      let msg = `Đã hoàn tác thành công ${revertedCount}/${totalCount} khách hàng!`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} khách hàng bỏ qua do đã có phân bổ mới hơn)`;
      }
      message.success(msg);
      
      fetchAssignmentHistory(historyPage);
      
      if (expandedBatchId === batchId) {
        fetchBatchDetails(batchId);
      }
      
      fetchCustomers(
        currentPage,
        pageSize,
        activeTab,
        searchQuery,
        sortField,
        daysSinceLastVisitMin,
        daysSinceLastVisitMax,
        totalSpentMin,
        totalSpentMax,
        totalVisitsMin,
        totalVisitsMax,
        promoUsed,
        promoCountMin,
        promoCountMax,
        referralUsed,
        referralCountMin,
        referralCountMax,
        assignedStaffId
      );
    } catch (error: any) {
      console.error('Undo assignment error:', error);
      message.error(error.response?.data?.message || 'Không thể hoàn tác phân bổ');
    } finally {
      setUndoingBatchId(null);
    }
  };

  useEffect(() => {
    if (historyDrawerVisible) {
      fetchAssignmentHistory(1);
    }
  }, [historyDrawerVisible, fetchAssignmentHistory]);

  const handleRandomSelect = async () => {
    setRandomLoading(true);
    try {
      const params: any = {
        limit: randomCount.toString(),
        bucket: activeTab !== 'ALL' ? activeTab : undefined,
        search: searchQuery || undefined,
        daysSinceLastVisitMin: daysSinceLastVisitMin?.toString(),
        daysSinceLastVisitMax: daysSinceLastVisitMax?.toString(),
        totalSpentMin: totalSpentMin?.toString(),
        totalSpentMax: totalSpentMax?.toString(),
        totalVisitsMin: totalVisitsMin?.toString(),
        totalVisitsMax: totalVisitsMax?.toString(),
        promoUsed: promoUsed !== 'all' ? promoUsed : undefined,
        promoCountMin: promoCountMin?.toString(),
        promoCountMax: promoCountMax?.toString(),
        referralUsed: referralUsed !== 'all' ? referralUsed : undefined,
        referralCountMin: referralCountMin?.toString(),
        referralCountMax: referralCountMax?.toString(),
        assignedStaffId,
        excludeAssigned: excludeAssigned ? 'true' : 'false'
      };

      const res = await api.get('/customers/random-ids', { params });
      const selectedIds = res.data.ids;
      
      if (selectedIds.length === 0) {
        message.warning('Không tìm thấy khách hàng chưa phân bổ nào phù hợp với bộ lọc hiện tại.');
      } else {
        setSelectedRowKeys(selectedIds);
        setRandomSelectedIds(selectedIds);
        
        // Force immediate fetch with the new selected random IDs
        fetchCustomers(
          1,
          pageSize,
          activeTab,
          searchQuery,
          sortField,
          daysSinceLastVisitMin,
          daysSinceLastVisitMax,
          totalSpentMin,
          totalSpentMax,
          totalVisitsMin,
          totalVisitsMax,
          promoUsed,
          promoCountMin,
          promoCountMax,
          referralUsed,
          referralCountMin,
          referralCountMax,
          assignedStaffId,
          selectedIds
        );
        setCurrentPage(1);

        message.success(`Đã chọn ngẫu nhiên ${selectedIds.length} khách hàng chưa phân bổ!`);
        setRandomModalVisible(false);
      }
    } catch (err: any) {
      console.error('Random select error:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi chọn ngẫu nhiên.');
    } finally {
      setRandomLoading(false);
    }
  };

  // Check if any filter condition is currently active
  const hasActiveFilters = 
    daysSinceLastVisitMin !== undefined ||
    daysSinceLastVisitMax !== undefined ||
    totalSpentMin !== undefined ||
    totalSpentMax !== undefined ||
    totalVisitsMin !== undefined ||
    totalVisitsMax !== undefined ||
    promoUsed !== 'all' ||
    promoCountMin !== undefined ||
    promoCountMax !== undefined ||
    referralUsed !== 'all' ||
    referralCountMin !== undefined ||
    referralCountMax !== undefined ||
    activeFilterId !== null;

  // Open Detail Modal
  const openDetailModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
    setModalLoading(true);
    setHistory([]);

    try {
      const response = await api.get(`/customers/${customer.id}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error('Fetch history error:', error);
      message.error('Không thể tải lịch sử đơn hàng');
    } finally {
      setModalLoading(false);
    }
  };

  // Format currency VND
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Setup tab badges
  const getTabLabel = (key: string, baseLabel: string, count: number) => {
    let color = 'default';
    if (key === 'COMBO_LIVE') color = 'green';
    if (key === 'NOT_COMBO_LIVE') color = 'blue';
    if (key === 'COMBO_DEAD') color = 'red';
    if (key === 'SINGLE') color = 'gold';

    return (
      <Space>
        {baseLabel}
        <Badge 
          count={count} 
          overflowCount={99999}
          style={{ 
            backgroundColor: color === 'green' ? '#52C41A' : color === 'red' ? '#FF4D4F' : color === 'gold' ? '#D4A84B' : color === 'blue' ? '#1677ff' : '#888',
            color: color === 'gold' ? '#000' : '#fff'
          }} 
        />
      </Space>
    );
  };

  const getRowClassName = (record: Customer) => {
    // 1. check callback date ("có hẹn gọi lại -> màu hy vọng")
    const hasCallback = record.callbackDate ? new Date(record.callbackDate) >= new Date(new Date().setHours(0,0,0,0)) : false;
    if (hasCallback) {
      return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
    }

    // 2. check if they have a future booking ("đã booked -> sẽ đến, chuyển sang màu xanh")
    const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
    if (isBookingInFuture) {
      const state = record.lastBookingState;
      const isBooked = state === 'New' || state === 'Confirmed';
      if (isBooked) {
        return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
      }
    }

    // 3. check positive daysSinceLastVisit but missed booking ("đã booked mà chưa tới (missed), chuyển sang màu đỏ lợt")
    const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
    if (isBookingInPast) {
      const state = record.lastBookingState;
      const isMissed = state && state !== 'Completed' && state !== 'ServiceCompleted' && state !== 'CheckIn' && state !== 'CheckOut' && state !== 'ServiceStart';
      if (isMissed) {
        return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
      }
    }

    return '';
  };

  // Define table columns
  const columns = [
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Tên Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Customer) => (
        <Space 
          size="small" 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openDetailModal(record)}
        >
          <Avatar 
            size="small"
            src={record.avatar || undefined} 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5', 
              color: '#D4A84B',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0
            }} 
          />
          <span className="hover:underline" style={{ fontWeight: '600', color: token.colorText }}>
            {text}
          </span>
        </Space>
      ),
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string, record: Customer) => phone ? (
        <span 
          className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
          onClick={() => makeCall(phone, record.name, record.id)}
          style={{ color: token.colorTextDescription }}
        >
          <PhoneOutlined style={{ color: '#D4A84B' }} />
          <span>{phone}</span>
        </span>
      ) : <span style={{ color: token.colorTextDescription }}>-</span>
    },
    {
      title: 'Nhóm',
      dataIndex: 'bucket',
      key: 'bucket',
      render: (bucket: BucketType) => {
        if (bucket === 'COMBO_LIVE') return <Tag color="green">Live Combo</Tag>;
        if (bucket === 'COMBO_DEAD') return <Tag color="red">Dead Combo</Tag>;
        return <Tag color="warning">Single</Tag>;
      },
    },
    {
      title: 'Chưa tới tiệm (Ngày)',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      render: (days: number | null, record: Customer) => {
        // 1. check callback date ("có hẹn gọi lại")
        const hasCallback = record.callbackDate ? new Date(record.callbackDate) >= new Date(new Date().setHours(0,0,0,0)) : false;
        if (hasCallback) {
          const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
          return (
            <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#d4b106', fontWeight: 'bold' }}>
              🕒 Hẹn gọi lại: {callbackFormatted}
            </span>
          );
        }

        // 2. check future booking ("đã booked -> sẽ đến")
        const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
        if (isBookingInFuture) {
          const state = record.lastBookingState;
          const isBooked = state === 'New' || state === 'Confirmed';
          if (isBooked) {
            const bookingFormatted = dayjs(record.lastBookingDate).format('DD/MM/YYYY');
            return (
              <span style={{ color: themeMode === 'dark' ? '#73d13d' : '#389e0d', fontWeight: 'bold' }}>
                📅 Booked: {bookingFormatted}
              </span>
            );
          }
        }

        // 3. check missed booking ("đã booked mà chưa tới (missed)")
        const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
        if (isBookingInPast) {
          const state = record.lastBookingState;
          const isMissed = state && state !== 'Completed' && state !== 'ServiceCompleted' && state !== 'CheckIn' && state !== 'CheckOut' && state !== 'ServiceStart';
          if (isMissed) {
            let missedDays = days;
            if (record.lastBookingDate) {
              const bookingDate = new Date(record.lastBookingDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              bookingDate.setHours(0, 0, 0, 0);
              const diffMs = today.getTime() - bookingDate.getTime();
              missedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            }
            return (
              <span style={{ color: themeMode === 'dark' ? '#ff7875' : '#cf1322', fontWeight: 'bold' }}>
                ⚠️ Missed: {missedDays} ngày
              </span>
            );
          }
        }

        // 4. normal daysSinceLastVisit ("số dương -> chưa ghé x days, bình thường")
        return days !== null ? `${days} ngày` : <Text style={{ color: '#888' }}>Chưa từng đến</Text>;
      },
    },
    {
      title: 'Chi tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (spent: number) => formatVND(spent),
    },
    {
      title: 'Dùng Promo',
      dataIndex: 'totalPromotionsUsed',
      key: 'totalPromotionsUsed',
      render: (count: number) => count > 0 ? <Tag color="blue">{count} lần</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Giới thiệu bạn',
      dataIndex: 'totalReferrals',
      key: 'totalReferrals',
      render: (count: number) => count > 0 ? <Tag color="purple">{count} người</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Booker phụ trách',
      dataIndex: 'assignedStaff',
      key: 'assignedStaff',
      render: (staff: any) => {
        if (staff) {
          return <Tag color="cyan">{staff.displayName}</Tag>;
        }
        return <Text type="secondary" style={{ fontStyle: 'italic' }}>Chưa phân bổ</Text>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_: any, record: Customer) => (
        <Tooltip title="Chi tiết khách hàng">
          <Button 
            type="text" 
            shape="circle" 
            icon={<EyeOutlined style={{ color: '#D4A84B' }} />} 
            onClick={() => openDetailModal(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // History columns for details modal
  const historyColumns = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderKey',
      key: 'orderKey',
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (val: number) => formatVND(val),
    },
    {
      title: 'Kênh',
      dataIndex: 'bookingChannel',
      key: 'bookingChannel',
      render: (val: string) => <Tag>{val}</Tag>
    }
  ];

  return (
    <div>
      {contextHolder}
      <div className="flex justify-between items-center mb-6" style={{ marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>Danh Sách Khách Hàng</Title>
          <Text style={{ color: token.colorTextDescription }}>Xem danh sách khách hàng và quản lý phân loại buckets real-time</Text>
        </div>
        <Button 
          type="primary" 
          icon={<CalendarOutlined />} 
          style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', height: '38px', borderRadius: '6px', fontWeight: 'bold' }}
          onClick={() => setBookingWizardVisible(true)}
        >
          Đặt lịch mới
        </Button>
      </div>

      <Card style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, marginBottom: '24px' }}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <Input.Search
              placeholder="Tìm theo tên hoặc số điện thoại..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              style={{ maxWidth: 400 }}
            />

            <div className="flex items-center gap-2">
              {currentUser?.role === 'admin' && (
                <Checkbox
                  checked={showTrash}
                  onChange={(e) => {
                    setShowTrash(e.target.checked);
                    setCurrentPage(1);
                  }}
                  style={{ color: token.colorText, marginRight: '16px', fontWeight: 'bold' }}
                >
                  🗑️ Xem thùng rác
                </Checkbox>
              )}
              <Text style={{ color: token.colorTextDescription }}>Sắp xếp theo:</Text>
              <Select
                defaultValue="id_desc"
                style={{ width: 220 }}
                onChange={(val) => {
                  setSortField(val);
                  setCurrentPage(1); // Reset page to 1
                }}
                options={[
                  { value: 'id_desc', label: 'Khách hàng mới nhất' },
                  { value: 'name_asc', label: 'Tên A -> Z' },
                  { value: 'daysSinceLastVisit_desc', label: 'Lâu nhất chưa ghé tiệm' },
                  { value: 'daysSinceLastVisit_asc', label: 'Gần đây mới ghé tiệm' },
                  { value: 'totalSpent_desc', label: 'Tổng chi tiêu giảm dần' },
                ]}
              />
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div className="flex flex-wrap gap-4 items-center justify-between">
            <Space wrap size="small">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'presets',
                      label: <span style={{ fontWeight: 'bold', color: token.colorTextDescription }}>BỘ LỌC MẶC ĐỊNH (PRESETS)</span>,
                      type: 'group',
                      children: PRESET_FILTERS.map(f => ({
                        key: f.id,
                        label: f.name
                      }))
                    },
                    {
                      key: 'custom',
                      label: <span style={{ fontWeight: 'bold', color: token.colorTextDescription }}>BỘ LỌC TỰ LƯU (DATABASE)</span>,
                      type: 'group',
                      children: savedFilters.length > 0 ? savedFilters.map(f => ({
                        key: f.id,
                        label: (
                          <div className="flex justify-between items-center w-full min-w-[220px]">
                            <span>{f.name}</span>
                            <Button 
                              type="text" 
                              size="small" 
                              danger 
                              icon={<DeleteOutlined />} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFilter(f.id, f.name);
                              }} 
                            />
                          </div>
                        )
                      })) : [{ key: 'no_custom', label: <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa lưu bộ lọc nào</span>, disabled: true }]
                    }
                  ],
                  onClick: (info) => {
                    const preset = PRESET_FILTERS.find(p => p.id === info.key);
                    if (preset) {
                      applyFilter(preset);
                      return;
                    }
                    const custom = savedFilters.find(f => f.id === info.key);
                    if (custom) {
                      applyFilter(custom);
                      return;
                    }
                  }
                }}
                trigger={['click']}
              >
                <Button icon={<FilterOutlined />}>
                  Bộ lọc đã lưu <DownOutlined />
                </Button>
              </Dropdown>

              <Badge dot={hasActiveFilters}>
                <Button 
                  type={hasActiveFilters ? 'primary' : 'default'}
                  icon={<FilterOutlined />} 
                  onClick={() => setFilterDrawerVisible(true)}
                  style={hasActiveFilters ? { background: '#D4A84B', borderColor: '#D4A84B' } : undefined}
                >
                  Bộ lọc nâng cao
                </Button>
              </Badge>

              {hasActiveFilters && (
                <>
                  <Button 
                    type="dashed" 
                    icon={<ClearOutlined />} 
                    onClick={clearFilters}
                  >
                    Xóa lọc
                  </Button>
                  <Button 
                    type="primary" 
                    ghost
                    icon={<SaveOutlined />} 
                    onClick={() => setSaveFilterModalVisible(true)}
                    style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
                  >
                    Lưu bộ lọc
                  </Button>
                </>
              )}
              {currentUser?.role === 'admin' && (
                <>
                  <Button 
                    icon={<SyncOutlined />} 
                    onClick={() => setRandomModalVisible(true)}
                    style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
                  >
                    Chọn ngẫu nhiên
                  </Button>
                  <Button 
                    icon={<HistoryOutlined />} 
                    onClick={() => setHistoryDrawerVisible(true)}
                    style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
                  >
                    Lịch sử phân bổ
                  </Button>
                </>
              )}
            </Space>

            {hasActiveFilters && (
              <Space wrap size="small">
                <Text style={{ fontSize: '12px', color: token.colorTextDescription }}>Đang lọc:</Text>
                {daysSinceLastVisitMin !== undefined && (
                  <Tag color="blue" closable onClose={() => { setDaysSinceLastVisitMin(undefined); setActiveFilterId(null); }}>
                    Chưa ghé &gt;= {daysSinceLastVisitMin} ngày
                  </Tag>
                )}
                {daysSinceLastVisitMax !== undefined && (
                  <Tag color="blue" closable onClose={() => { setDaysSinceLastVisitMax(undefined); setActiveFilterId(null); }}>
                    Chưa ghé &lt;= {daysSinceLastVisitMax} ngày
                  </Tag>
                )}
                {totalSpentMin !== undefined && (
                  <Tag color="gold" closable onClose={() => { setTotalSpentMin(undefined); setActiveFilterId(null); }}>
                    Chi tiêu &gt;= {formatVND(totalSpentMin)}
                  </Tag>
                )}
                {totalSpentMax !== undefined && (
                  <Tag color="gold" closable onClose={() => { setTotalSpentMax(undefined); setActiveFilterId(null); }}>
                    Chi tiêu &lt;= {formatVND(totalSpentMax)}
                  </Tag>
                )}
                {totalVisitsMin !== undefined && (
                  <Tag color="purple" closable onClose={() => { setTotalVisitsMin(undefined); setActiveFilterId(null); }}>
                    Ghé &gt;= {totalVisitsMin} lần
                  </Tag>
                )}
                {totalVisitsMax !== undefined && (
                  <Tag color="purple" closable onClose={() => { setTotalVisitsMax(undefined); setActiveFilterId(null); }}>
                    Ghé &lt;= {totalVisitsMax} lần
                  </Tag>
                )}
                {promoUsed !== 'all' && promoCountMin === undefined && promoCountMax === undefined && (
                  <Tag color="cyan" closable onClose={() => { setPromoUsed('all'); setActiveFilterId(null); }}>
                    Promo: {promoUsed === 'yes' ? 'Đã dùng' : 'Chưa dùng'}
                  </Tag>
                )}
                {promoCountMin !== undefined && (
                  <Tag color="cyan" closable onClose={() => { setPromoCountMin(undefined); setActiveFilterId(null); }}>
                    Dùng Promo &gt;= {promoCountMin} lần
                  </Tag>
                )}
                {promoCountMax !== undefined && (
                  <Tag color="cyan" closable onClose={() => { setPromoCountMax(undefined); setActiveFilterId(null); }}>
                    Dùng Promo &lt;= {promoCountMax} lần
                  </Tag>
                )}
                {referralUsed !== 'all' && referralCountMin === undefined && referralCountMax === undefined && (
                  <Tag color="magenta" closable onClose={() => { setReferralUsed('all'); setActiveFilterId(null); }}>
                    Giới thiệu: {referralUsed === 'yes' ? 'Đã giới thiệu' : 'Chưa giới thiệu'}
                  </Tag>
                )}
                {referralCountMin !== undefined && (
                  <Tag color="magenta" closable onClose={() => { setReferralCountMin(undefined); setActiveFilterId(null); }}>
                    Giới thiệu &gt;= {referralCountMin} người
                  </Tag>
                )}
                {referralCountMax !== undefined && (
                  <Tag color="magenta" closable onClose={() => { setReferralCountMax(undefined); setActiveFilterId(null); }}>
                    Giới thiệu &lt;= {referralCountMax} người
                  </Tag>
                )}
              </Space>
            )}
          </div>
        </div>
      </Card>

      {selectedRowKeys.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: themeMode === 'dark' ? '#1f1f1f' : '#e6f7ff',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#91d5ff'}`,
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
        }}>
          <Space>
            <Text strong style={{ color: token.colorText }}>
              Đã chọn <span style={{ color: '#D4A84B', fontSize: '16px' }}>{selectedRowKeys.length}</span> khách hàng
            </Text>
          </Space>
          <Space>
            <Button onClick={() => setSelectedRowKeys([])} style={{ borderRadius: '6px' }}>
              Hủy chọn
            </Button>
            <Button 
              type="primary" 
              icon={<TeamOutlined />} 
              onClick={() => setAssignModalVisible(true)}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', borderRadius: '6px', fontWeight: 600 }}
            >
              Phân bổ Booker
            </Button>
            {currentUser?.role === 'admin' && (
              <Popconfirm
                title={`Anh/chị có chắc chắn muốn xóa ${selectedRowKeys.length} khách hàng đã chọn không?`}
                onConfirm={handleBulkDeleteCustomers}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
              >
                <Button 
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  loading={bulkDeleteLoading}
                  style={{ borderRadius: '6px', fontWeight: 600 }}
                >
                  Xóa hàng loạt
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      )}

      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => {
          setActiveTab(key);
          setCurrentPage(1); // Reset page to 1
          localStorage.setItem('mos_customers_active_tab', key);
        }}
        style={{ color: token.colorText }}
        items={[
          {
            key: 'ALL',
            label: getTabLabel('ALL', 'Tất cả', stats.total),
          },
          {
            key: 'COMBO_LIVE',
            label: getTabLabel('COMBO_LIVE', 'Combo Live', stats.comboLive),
          },
          {
            key: 'NOT_COMBO_LIVE',
            label: getTabLabel('NOT_COMBO_LIVE', 'Not Combo Live', stats.notComboLive),
          },
          {
            key: 'COMBO_DEAD',
            label: getTabLabel('COMBO_DEAD', 'Combo Dead', stats.comboDead),
          },
          {
            key: 'SINGLE',
            label: getTabLabel('SINGLE', 'Single', stats.single),
          },
        ]}
      />

      {randomSelectedIds && randomSelectedIds.length > 0 && (
        <div style={{ 
          background: themeMode === 'dark' ? '#2b2111' : '#FFFBE6', 
          border: `1px solid ${themeMode === 'dark' ? '#5c3e16' : '#FFE58F'}`, 
          borderRadius: '8px', 
          padding: '12px 16px', 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span style={{ color: themeMode === 'dark' ? '#d48806' : '#D46B08' }}>
            Đang hiển thị <strong>{randomSelectedIds.length}</strong> khách hàng chưa phân bổ được chọn ngẫu nhiên.
          </span>
          <Button 
            type="link" 
            size="small" 
            onClick={() => {
              setRandomSelectedIds(null);
              setSelectedRowKeys([]);
            }}
            style={{ color: '#D4A84B', padding: 0, fontWeight: 'bold' }}
          >
            Hủy chế độ ngẫu nhiên (Xem tất cả)
          </Button>
        </div>
      )}

      <Table
        dataSource={customers}
        columns={columns.filter(col => col.key !== 'assignedStaff' || currentUser?.role === 'admin')}
        rowKey="id"
        rowClassName={getRowClassName}
        size="small"
        loading={loading}
        rowSelection={currentUser?.role === 'admin' ? {
          selectedRowKeys,
          onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
          },
          preserveSelectedRowKeys: true
        } : undefined}
        pagination={false}
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: '8px'
        }}
        className="antd-custom-table"
      />

      <div ref={sentinelRef} style={{ height: '30px', margin: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {loading && <Spin size="small" />}
      </div>

      {/* RANDOM SELECTOR MODAL */}
      <Modal
        title={
          <span style={{ color: '#D4A84B', fontSize: '18px', fontWeight: 'bold' }}>
            Chọn Ngẫu Nhiên Khách Hàng
          </span>
        }
        open={randomModalVisible}
        onCancel={() => setRandomModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRandomModalVisible(false)}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={randomLoading}
            onClick={handleRandomSelect}
            style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
          >
            Chọn
          </Button>
        ]}
      >
        <div style={{ margin: '16px 0' }}>
          <p style={{ color: token.colorTextDescription, marginBottom: '16px' }}>
            Hệ thống sẽ tự động tìm kiếm và chọn ngẫu nhiên các khách hàng thỏa mãn bộ lọc hiện tại của anh/chị.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: token.colorText }}>Số lượng khách hàng:</span>
              <InputNumber
                min={1}
                max={1000}
                value={randomCount}
                onChange={(val) => setRandomCount(val || 20)}
                style={{ width: '120px' }}
              />
            </div>
            <div>
              <Checkbox
                checked={excludeAssigned}
                onChange={(e) => setExcludeAssigned(e.target.checked)}
                style={{ color: token.colorText }}
              >
                Chỉ chọn khách hàng chưa được phân bổ Booker
              </Checkbox>
            </div>
          </div>
        </div>
      </Modal>

      {/* CUSTOMER DETAIL DRAWER (Redesigned Mockup 1 style) */}
      <CustomerDetailDrawer
        open={modalVisible}
        customerId={selectedCustomer?.id || null}
        onClose={() => setModalVisible(false)}
        onBookAppointment={(cust) => {
          setModalVisible(false);
          setBookingInitialCustomer({
            id: cust.id,
            name: cust.name,
            phone: cust.phone,
            bucket: cust.bucket
          });
          setBookingWizardVisible(true);
        }}
        onDeleteSuccess={() => {
          setModalVisible(false);
          fetchCustomers(
            1, 
            pageSize, 
            activeTab, 
            searchQuery, 
            sortField,
            daysSinceLastVisitMin,
            daysSinceLastVisitMax,
            totalSpentMin,
            totalSpentMax,
            totalVisitsMin,
            totalVisitsMax,
            promoUsed,
            promoCountMin,
            promoCountMax,
            referralUsed,
            referralCountMin,
            referralCountMax,
            assignedStaffId
          );
          fetchStats(
            searchQuery,
            daysSinceLastVisitMin,
            daysSinceLastVisitMax,
            totalSpentMin,
            totalSpentMax,
            totalVisitsMin,
            totalVisitsMax,
            promoUsed,
            promoCountMin,
            promoCountMax,
            referralUsed,
            referralCountMin,
            referralCountMax,
            assignedStaffId
          );
        }}
      />

      {/* BOOKING WIZARD DRAWER WITH SLOTS MATRIX */}
      <BookingWizardDrawer
        open={bookingWizardVisible}
        initialCustomer={bookingInitialCustomer}
        onClose={() => {
          setBookingWizardVisible(false);
          setBookingInitialCustomer(null);
        }}
        onSuccess={() => fetchCustomers(1, pageSize, activeTab, searchQuery, sortField)}
      />

      {/* ADVANCED FILTER DRAWER */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.1)', color: '#D4A84B' }}>
              <FilterOutlined style={{ fontSize: '15px' }} />
            </span>
            <span style={{ color: '#D4A84B', fontWeight: 'bold', fontSize: '16px' }}>Bộ Lọc Nâng Cao</span>
          </div>
        }
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={420}
        styles={{
          header: {
            borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
            padding: '16px 24px',
          },
          body: {
            padding: '20px 24px',
            background: themeMode === 'dark' ? '#141414' : '#fff',
          }
        }}
        extra={
          <Space size="middle">
            <Button 
              onClick={clearFilters}
              icon={<ClearOutlined />}
              style={{ borderRadius: '6px' }}
            >
              Xóa tất cả
            </Button>
            <Button 
              type="primary" 
              onClick={() => setFilterDrawerVisible(false)}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', borderRadius: '6px', fontWeight: 600 }}
            >
              Áp dụng
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          {/* SECTION 1: VÒNG ĐỜI & GHÉ TIỆM */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.08)', color: '#D4A84B' }}>
                <CalendarOutlined style={{ fontSize: '14px' }} />
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
                Vòng đời & Ghé tiệm
              </span>
            </div>
            
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Chưa tới tối thiểu</span>}>
                  <InputNumber
                    style={{ width: '100%', borderRadius: '6px' }}
                    min={0}
                    placeholder="VD: 30 ngày"
                    value={daysSinceLastVisitMin}
                    onChange={(val) => { setDaysSinceLastVisitMin(val ?? undefined); setActiveFilterId(null); }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Chưa tới tối đa</span>}>
                  <InputNumber
                    style={{ width: '100%', borderRadius: '6px' }}
                    min={0}
                    placeholder="VD: 90 ngày"
                    value={daysSinceLastVisitMax}
                    onChange={(val) => { setDaysSinceLastVisitMax(val ?? undefined); setActiveFilterId(null); }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '8px' }} />
          </div>

          {/* SECTION 2: CHI TIÊU & GIAO DỊCH */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.08)', color: '#D4A84B' }}>
                <DollarOutlined style={{ fontSize: '14px' }} />
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
                Chi tiêu (VND)
              </span>
            </div>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Từ mức</span>}>
                  <InputNumber
                    style={{ width: '100%', borderRadius: '6px' }}
                    min={0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                    placeholder="Tối thiểu"
                    value={totalSpentMin}
                    onChange={(val) => { setTotalSpentMin(val ?? undefined); setActiveFilterId(null); }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Đến mức</span>}>
                  <InputNumber
                    style={{ width: '100%', borderRadius: '6px' }}
                    min={0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                    placeholder="Tối đa"
                    value={totalSpentMax}
                    onChange={(val) => { setTotalSpentMax(val ?? undefined); setActiveFilterId(null); }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '8px' }} />
          </div>

          {/* SECTION 3: SỐ LẦN GHÉ TIỆM */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.08)', color: '#D4A84B' }}>
                <EyeOutlined style={{ fontSize: '14px' }} />
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
                Số lần ghé tiệm
              </span>
            </div>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Ghé tối thiểu</span>}>
                  <InputNumber
                    style={{ width: '100%', borderRadius: '6px' }}
                    min={0}
                    placeholder="VD: 3 lần"
                    value={totalVisitsMin}
                    onChange={(val) => { setTotalVisitsMin(val ?? undefined); setActiveFilterId(null); }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Ghé tối đa</span>}>
                  <InputNumber
                    style={{ width: '100%', borderRadius: '6px' }}
                    min={0}
                    placeholder="VD: 10 lần"
                    value={totalVisitsMax}
                    onChange={(val) => { setTotalVisitsMax(val ?? undefined); setActiveFilterId(null); }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '8px' }} />
          </div>

          {/* SECTION 4: KHUYẾN MÃI (PROMOTION) */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.08)', color: '#D4A84B' }}>
                <GiftOutlined style={{ fontSize: '14px' }} />
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
                Khuyến mãi (Promotion)
              </span>
            </div>

            <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Trạng thái sử dụng</span>}>
              <Select
                value={promoUsed}
                style={{ width: '100%' }}
                onChange={(val) => { 
                  setPromoUsed(val); 
                  setActiveFilterId(null); 
                  if (val !== 'yes') {
                    setPromoCountMin(undefined);
                    setPromoCountMax(undefined);
                  }
                }}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'yes', label: 'Đã sử dụng' },
                  { value: 'no', label: 'Chưa sử dụng' },
                ]}
              />
            </Form.Item>

            {promoUsed === 'yes' && (
              <Row gutter={12} style={{ marginTop: '8px', padding: '12px', background: themeMode === 'dark' ? '#1c1c1c' : '#fafafa', borderRadius: '8px', border: `1px solid ${themeMode === 'dark' ? '#2d2d2d' : '#e8e8e8'}` }}>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontSize: '11px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Dùng tối thiểu</span>} style={{ marginBottom: 0 }}>
                    <InputNumber
                      style={{ width: '100%', borderRadius: '6px' }}
                      min={1}
                      placeholder="VD: 1 lần"
                      value={promoCountMin}
                      onChange={(val) => { setPromoCountMin(val ?? undefined); setActiveFilterId(null); }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontSize: '11px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Dùng tối đa</span>} style={{ marginBottom: 0 }}>
                    <InputNumber
                      style={{ width: '100%', borderRadius: '6px' }}
                      min={1}
                      placeholder="VD: 5 lần"
                      value={promoCountMax}
                      onChange={(val) => { setPromoCountMax(val ?? undefined); setActiveFilterId(null); }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <div style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '16px' }} />
          </div>

          {/* SECTION 5: GIỚI THIỆU BẠN (REFERRALS) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.08)', color: '#D4A84B' }}>
                <TeamOutlined style={{ fontSize: '14px' }} />
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
                Giới thiệu bạn (Referrals)
              </span>
            </div>

            <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Trạng thái giới thiệu</span>}>
              <Select
                value={referralUsed}
                style={{ width: '100%' }}
                onChange={(val) => { 
                  setReferralUsed(val); 
                  setActiveFilterId(null); 
                  if (val !== 'yes') {
                    setReferralCountMin(undefined);
                    setReferralCountMax(undefined);
                  }
                }}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'yes', label: 'Đã giới thiệu bạn' },
                  { value: 'no', label: 'Chưa giới thiệu ai' },
                ]}
              />
            </Form.Item>

            {referralUsed === 'yes' && (
              <Row gutter={12} style={{ marginTop: '8px', padding: '12px', background: themeMode === 'dark' ? '#1c1c1c' : '#fafafa', borderRadius: '8px', border: `1px solid ${themeMode === 'dark' ? '#2d2d2d' : '#e8e8e8'}` }}>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontSize: '11px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>GT tối thiểu</span>} style={{ marginBottom: 0 }}>
                    <InputNumber
                      style={{ width: '100%', borderRadius: '6px' }}
                      min={1}
                      placeholder="VD: 1 người"
                      value={referralCountMin}
                      onChange={(val) => { setReferralCountMin(val ?? undefined); setActiveFilterId(null); }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontSize: '11px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>GT tối đa</span>} style={{ marginBottom: 0 }}>
                    <InputNumber
                      style={{ width: '100%', borderRadius: '6px' }}
                      min={1}
                      placeholder="VD: 5 người"
                      value={referralCountMax}
                      onChange={(val) => { setReferralCountMax(val ?? undefined); setActiveFilterId(null); }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <div style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '16px' }} />
          </div>

          {/* SECTION 6: PHÂN BỔ BOOKER */}
          {currentUser?.role === 'admin' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.08)', color: '#D4A84B' }}>
                  <TeamOutlined style={{ fontSize: '14px' }} />
                </span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
                  Phân bổ Booker
                </span>
              </div>
  
              <Form.Item label={<span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>Trạng thái phụ trách</span>}>
                <Select
                  value={assignedStaffId}
                  style={{ width: '100%' }}
                  onChange={(val) => { 
                    setAssignedStaffId(val); 
                    setActiveFilterId(null); 
                  }}
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'unassigned', label: 'Chưa phân bổ' },
                    { value: 'me', label: 'Khách hàng của tôi' },
                    ...staffList.map(s => ({ value: s.id.toString(), label: s.displayName }))
                  ]}
                />
              </Form.Item>
            </div>
          )}
        </Form>
      </Drawer>

      {/* SAVE FILTER MODAL */}
      <Modal
        title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>Lưu bộ lọc khách hàng</span>}
        open={saveFilterModalVisible}
        onOk={handleSaveFilter}
        onCancel={() => setSaveFilterModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#D4A84B', borderColor: '#D4A84B' } }}
      >
        <div style={{ marginTop: '16px' }}>
          <Text>Nhập tên gợi nhớ cho bộ lọc này (bộ lọc sẽ được lưu vào cơ sở dữ liệu để booker sử dụng):</Text>
          <Input
            style={{ marginTop: '12px' }}
            placeholder="VD: Combo Dead mới hết hạn dưới 30 ngày"
            value={newFilterName}
            onChange={(e) => setNewFilterName(e.target.value)}
          />
        </div>
      </Modal>

      {/* ASSIGN BOOKER MODAL */}
      <Modal
        title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>Phân bổ khách hàng cho Booker</span>}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={[
          <Button 
            key="unassign" 
            danger 
            type="dashed"
            loading={unassigning}
            onClick={handleUnassignCustomers}
            style={{ float: 'left' }}
          >
            Hủy phân bổ (Gỡ Booker)
          </Button>,
          <Button key="cancel" onClick={() => setAssignModalVisible(false)}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={assigning}
            onClick={handleAssignCustomers}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
          >
            Xác nhận phân bổ
          </Button>
        ]}
      >
        <div style={{ marginTop: '16px' }}>
          <Text>
            Chọn Booker phụ trách cho <span style={{ fontWeight: 'bold', color: '#D4A84B' }}>{selectedRowKeys.length}</span> khách hàng đã chọn:
          </Text>
          <div style={{ marginTop: '16px' }}>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn nhân viên Booker"
              value={targetStaffId}
              onChange={(val) => setTargetStaffId(val)}
              options={staffList.map(s => ({ value: s.id, label: `${s.displayName} (${s.username})` }))}
            />
          </div>
        </div>
      </Modal>

      {/* ALLOCATION HISTORY DRAWER */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 168, 75, 0.1)', color: '#D4A84B' }}>
              <HistoryOutlined style={{ fontSize: '15px' }} />
            </span>
            <span style={{ color: '#D4A84B', fontWeight: 'bold', fontSize: '16px' }}>Lịch Sử Phân Bổ</span>
          </div>
        }
        placement="right"
        onClose={() => {
          setHistoryDrawerVisible(false);
          setExpandedBatchId(null);
          setBatchDetails([]);
        }}
        open={historyDrawerVisible}
        width={650}
        styles={{
          header: {
            borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
            padding: '16px 24px',
          },
          body: {
            padding: '20px 24px',
            background: themeMode === 'dark' ? '#141414' : '#fff',
          }
        }}
      >
        <Spin spinning={historyLoading && historyData.length === 0}>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: token.colorTextDescription }}>
              Không có dữ liệu phân bổ trước đây.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historyData.map((batch) => {
                const isExpanded = expandedBatchId === batch.batchId;
                const formattedDate = new Date(batch.assignedAt).toLocaleString('vi-VN');
                const isUndone = batch.isUndone;

                return (
                  <Card
                    key={batch.batchId}
                    size="small"
                    style={{
                      background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                      border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: token.colorText }}>
                            {batch.newStaffName ? `Phân bổ cho ${batch.newStaffName}` : 'Gỡ Booker'}
                          </span>
                          <Tag color={isUndone ? 'default' : (batch.newStaffName ? 'blue' : 'warning')}>
                            {isUndone ? 'Đã hoàn tác' : (batch.newStaffName ? 'Phân bổ' : 'Hủy phân bổ')}
                          </Tag>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: token.colorTextDescription }}>
                          <span style={{ marginRight: '16px' }}>Thời gian: {formattedDate}</span>
                          <span>Người thực hiện: {batch.assignedBy}</span>
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '13px', color: token.colorText }}>
                          Số khách hàng: <span style={{ fontWeight: 'bold', color: '#D4A84B' }}>{batch.customerCount}</span>
                        </div>
                      </div>

                      <Space>
                        <Button
                          size="small"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedBatchId(null);
                              setBatchDetails([]);
                            } else {
                              fetchBatchDetails(batch.batchId);
                            }
                          }}
                        >
                          {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                        </Button>

                        {!isUndone && (
                          <Button
                            danger
                            size="small"
                            type="primary"
                            icon={<UndoOutlined />}
                            loading={undoingBatchId === batch.batchId}
                            onClick={() => {
                              modal.confirm({
                                title: 'Xác nhận hoàn tác',
                                content: `Bạn có chắc chắn muốn hoàn tác đợt phân bổ này không? Toàn bộ ${batch.customerCount} khách hàng trong đợt này sẽ được hoàn tác về Booker cũ (nếu Booker chưa được phân bổ mới).`,
                                okText: 'Đồng ý',
                                cancelText: 'Hủy',
                                okButtonProps: { danger: true },
                                onOk: () => handleUndoAssignment(batch.batchId)
                              });
                            }}
                          >
                            Hoàn tác
                          </Button>
                        )}
                      </Space>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '12px', borderTop: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`, paddingTop: '12px' }}>
                        <Spin spinning={batchDetailsLoading}>
                          <div className="antd-custom-table">
                            <Table
                              size="small"
                              pagination={false}
                              dataSource={batchDetails}
                              rowKey="id"
                              columns={[
                                { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName', render: (text) => <span style={{ fontWeight: 500 }}>{text}</span> },
                                { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone' },
                                { title: 'Booker cũ', dataIndex: 'prevStaffName', key: 'prevStaffName', render: (text) => <Tag>{text}</Tag> },
                                { title: 'Booker mới', dataIndex: 'newStaffName', key: 'newStaffName', render: (text) => <Tag color="blue">{text}</Tag> }
                              ]}
                            />
                          </div>
                        </Spin>
                      </div>
                    )}
                  </Card>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', alignItems: 'center' }}>
                <Button
                  disabled={historyPage === 1 || historyLoading}
                  onClick={() => fetchAssignmentHistory(historyPage - 1)}
                  style={{ marginRight: '8px' }}
                >
                  Trang trước
                </Button>
                <span style={{ display: 'flex', alignItems: 'center', margin: '0 8px', color: token.colorTextDescription }}>
                  Trang {historyPage} / {Math.ceil(historyTotal / 10) || 1}
                </span>
                <Button
                  disabled={historyPage >= Math.ceil(historyTotal / 10) || historyLoading}
                  onClick={() => fetchAssignmentHistory(historyPage + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>

      <style jsx global>{`
        /* Custom styles for Ant Design Table under Dark Mode */
        .dark-theme .antd-custom-table .ant-table {
          background: #141414 !important;
          color: #ccc !important;
        }
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #1f1f1f !important;
          color: #D4A84B !important;
          border-bottom: 1px solid #2a2a2a !important;
        }
        .dark-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1a1a1a !important;
        }
        .dark-theme .antd-custom-table .ant-table-row:hover > td {
          background: #1e1e1e !important;
        }

        /* Row highlighting - Light Theme */
        .light-theme .row-missed-light > td {
          background-color: #fff1f0 !important;
        }
        .light-theme .row-booked-future-light > td {
          background-color: #f6ffed !important;
        }
        .light-theme .row-hope-light > td {
          background-color: #fffbe6 !important;
        }
        .light-theme .row-missed-light:hover > td {
          background-color: #ffe8e6 !important;
        }
        .light-theme .row-booked-future-light:hover > td {
          background-color: #ebfcdd !important;
        }
        .light-theme .row-hope-light:hover > td {
          background-color: #fffac6 !important;
        }

        /* Row highlighting - Dark Theme */
        .dark-theme .row-missed-dark > td {
          background-color: #2a1215 !important;
        }
        .dark-theme .row-booked-future-dark > td {
          background-color: #162c1b !important;
        }
        .dark-theme .row-hope-dark > td {
          background-color: #2b2111 !important;
        }
        .dark-theme .row-missed-dark:hover > td {
          background-color: #381b1e !important;
        }
        .dark-theme .row-booked-future-dark:hover > td {
          background-color: #1e3a24 !important;
        }
        .dark-theme .row-hope-dark:hover > td {
          background-color: #382c16 !important;
        }

        /* Gold highlights for both light/dark */
        .antd-custom-table .ant-pagination-item-active {
          border-color: #D4A84B !important;
        }
        .antd-custom-table .ant-pagination-item-active a {
          color: #D4A84B !important;
        }

        /* Compact line height & padding */
        .antd-custom-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          line-height: 1.25 !important;
        }
        .antd-custom-table .ant-table-thead > tr > th {
          padding: 8px 8px !important;
          line-height: 1.25 !important;
        }
      `}</style>
    </div>
  );
}
