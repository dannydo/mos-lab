'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback } from 'react';
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
  Form,
  InputNumber,
  Row,
  Col,
  Spin,
  Timeline
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  PhoneOutlined,
  SettingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  UndoOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  BookOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../lib/api';
import CallLogModal from '../../../components/CallLogModal';
import { Customer } from '@mos-lab/shared';

const { Title, Text } = Typography;

interface Touchpoint {
  key: string;
  label: string;
  daysMin: number;
  daysMax: number;
  color: string;
}

interface TabConfigs {
  [key: string]: Touchpoint[];
}

const TAB_KEYS = [
  { id: 'NYC_30', name: 'NYC 30', rangeText: '0 - 30 ngày', minDays: 0, maxDays: 30 },
  { id: 'NYC_60', name: 'NYC 60', rangeText: '31 - 60 ngày', minDays: 31, maxDays: 60 },
  { id: 'NYC_90', name: 'NYC 90', rangeText: '61 - 90 ngày', minDays: 61, maxDays: 90 },
  { id: 'NYC_180', name: 'NYC 180', rangeText: '91 - 180 ngày', minDays: 91, maxDays: 180 },
  { id: 'NYC_365', name: 'NYC 365', rangeText: '181 - 365 ngày', minDays: 181, maxDays: 365 },
  { id: 'NYC_365plus', name: 'NYC 365+', rangeText: '> 365 ngày', minDays: 366, maxDays: undefined }
];

export default function NycCampaignPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  // Main UI States
  const [activeTab, setActiveTab] = useState<string>('NYC_30');
  const [activeTouchpointKey, setActiveTouchpointKey] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('daysSinceLastVisit_asc');
  const [assignedStaffId, setAssignedStaffId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'telesales') return 'me';
      }
    }
    return 'all';
  });

  // Data States
  const [configs, setConfigs] = useState<TabConfigs>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Stats Counters
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [touchpointCounts, setTouchpointCounts] = useState<Record<string, number>>({});
  const [overallStats, setOverallStats] = useState({
    totalNYC: 0,
    nyc30Count: 0,
    bookedRate: 0,
    todayCalls: 0
  });

  // Dropdown lists
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modals Controls
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Resizable Modal States
  const [modalWidth, setModalWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_nyc_settings_modal_width');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) return val;
      }
    }
    return 700;
  });

  const [modalHeight, setModalHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_nyc_settings_modal_height');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) return val;
      }
    }
    return 550;
  });

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Resize Mousedown started!');
    const handleEl = e.currentTarget as HTMLElement;
    const wrapperEl = handleEl.parentElement;
    if (!wrapperEl) {
      console.error('Wrapper element not found!');
      return;
    }

    // Traversal: wrapperEl has style {pointerEvents: 'none'}.
    // Its first child is a div with style {pointerEvents: 'auto'} wrapping {node}.
    // So the actual modal element (.ant-modal) is the first child of that container!
    const modalContainer = wrapperEl.firstElementChild as HTMLElement;
    const modalEl = modalContainer ? (modalContainer.firstElementChild as HTMLElement) : null;
    const listEl = document.getElementById('nyc-touchpoints-list') as HTMLElement;
    
    console.log('Found modalEl:', modalEl);
    console.log('Found listEl:', listEl);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalEl ? modalEl.offsetWidth : modalWidth;
    const startHeight = listEl ? listEl.offsetHeight + 200 : modalHeight;
    
    console.log(`Start X: ${startX}, Y: ${startY}, Width: ${startWidth}, Height: ${startHeight}`);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newWidth = Math.max(500, Math.min(1600, startWidth + deltaX));
      const newHeight = Math.max(400, Math.min(1000, startHeight + deltaY));
      
      console.log(`Dragging... DeltaX: ${deltaX}, DeltaY: ${deltaY} => NewWidth: ${newWidth}, NewHeight: ${newHeight}`);
      
      if (modalEl) {
        modalEl.style.setProperty('width', `${newWidth}px`, 'important');
      }
      if (listEl) {
        listEl.style.height = `${newHeight - 200}px`;
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      console.log('Resize Mouseup triggered.');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      const finalX = upEvent.clientX - startX;
      const finalY = upEvent.clientY - startY;
      const finalWidth = Math.max(500, Math.min(1600, startWidth + finalX));
      const finalHeight = Math.max(400, Math.min(1000, startHeight + finalY));
      
      console.log(`Final dimensions: Width: ${finalWidth}, Height: ${finalHeight}`);
      
      setModalWidth(finalWidth);
      setModalHeight(finalHeight);
      
      localStorage.setItem('mos_nyc_settings_modal_width', finalWidth.toString());
      localStorage.setItem('mos_nyc_settings_modal_height', finalHeight.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Settings Form
  const [settingsForm] = Form.useForm();
  const [selectedConfigTab, setSelectedConfigTab] = useState<string>('NYC_30');

  // Selected Records
  const [selectedPlanInfo, setSelectedPlanInfo] = useState<{
    legacyUserId: number;
    customerName: string;
    planId?: number | null;
  } | null>(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dailyPlanList, setDailyPlanList] = useState<number[]>([]); // Track planned user IDs for today

  // Load configuration & Staff lists on mount
  const fetchConfigs = useCallback(async () => {
    try {
      const res = await api.get('/nyc/config');
      setConfigs(res.data);
    } catch (err) {
      console.error('Failed to load touchpoint config:', err);
      message.error('Không thể tải cấu hình touchpoints.');
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await api.get('/customers/staff');
      setStaffList(res.data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    fetchConfigs();
    fetchStaffList();
  }, [fetchConfigs, fetchStaffList]);

  // Fetch planned users today to highlight "Add to plan" status
  const fetchTodayPlans = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const response = await api.get('/plans/weekly', {
        params: { weekStart: todayStr } // Fetch current week to find today's planned
      });
      const plannedIds: number[] = [];
      const mondayStr = todayStr; // Simplified check
      response.data.forEach((prog: any) => {
        // If has daily plan details, map them
        if (prog.planId) {
          plannedIds.push(prog.customer.id);
        }
      });
      setDailyPlanList(plannedIds);
    } catch (error) {
      console.error('Failed to fetch today plans:', error);
    }
  }, []);

  useEffect(() => {
    fetchTodayPlans();
  }, [fetchTodayPlans]);

  // Fetch main counters for tabs and dashboard summary metrics
  const fetchOverallStats = useCallback(async () => {
    try {
      // 1. Fetch counts for each main tab
      const counts: Record<string, number> = {};
      let totalNYC = 0;
      let nyc30Count = 0;

      await Promise.all(
        TAB_KEYS.map(async (tab) => {
          const params: any = {
            bucket: 'NOT_COMBO_LIVE',
            daysSinceLastVisitMin: tab.minDays.toString(),
          };
          if (tab.maxDays !== undefined) {
            params.daysSinceLastVisitMax = tab.maxDays.toString();
          }
          if (assignedStaffId && assignedStaffId !== 'all') {
            params.assignedStaffId = assignedStaffId;
          }
          if (searchQuery.trim()) {
            params.search = searchQuery.trim();
          }

          const res = await api.get('/customers/stats', { params });
          counts[tab.id] = res.data.total;
          totalNYC += res.data.total;
          if (tab.id === 'NYC_30') {
            nyc30Count = res.data.total;
          }
        })
      );

      setTabCounts(counts);

      // 2. Fetch today's call count and general booking stats
      const kpiRes = await api.get('/kpi/summary', {
        params: {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      });

      let totalCalledToday = 0;
      let totalBooked = 0;
      let totalAnswered = 0;

      if (kpiRes.data && Array.isArray(kpiRes.data)) {
        kpiRes.data.forEach((row: any) => {
          totalCalledToday += Number(row.totalCalled || 0);
          totalBooked += Number(row.totalBooked || 0);
          totalAnswered += Number(row.totalAnswered || 0);
        });
      } else if (kpiRes.data && typeof kpiRes.data === 'object') {
        const stats = kpiRes.data.summary || kpiRes.data;
        totalCalledToday = stats.totalCalled || 0;
        totalBooked = stats.totalBooked || 0;
        totalAnswered = stats.totalAnswered || 0;
      }

      const bookedRate = totalCalledToday > 0 ? Math.round((totalBooked / totalCalledToday) * 100) : 0;

      setOverallStats({
        totalNYC,
        nyc30Count,
        bookedRate,
        todayCalls: totalCalledToday
      });

    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [assignedStaffId, searchQuery]);

  // Fetch counts for touchpoints under the active tab
  const fetchTouchpointCounts = useCallback(async () => {
    const activeTouchpoints = configs[activeTab] || [];
    const counts: Record<string, number> = {};

    try {
      await Promise.all(
        activeTouchpoints.map(async (tp) => {
          const params: any = {
            bucket: 'NOT_COMBO_LIVE',
            daysSinceLastVisitMin: tp.daysMin.toString(),
            daysSinceLastVisitMax: tp.daysMax.toString()
          };
          if (assignedStaffId && assignedStaffId !== 'all') {
            params.assignedStaffId = assignedStaffId;
          }
          if (searchQuery.trim()) {
            params.search = searchQuery.trim();
          }

          const res = await api.get('/customers/stats', { params });
          counts[tp.key] = res.data.total;
        })
      );
      setTouchpointCounts(counts);
    } catch (err) {
      console.error('Failed to fetch touchpoint counts:', err);
    }
  }, [configs, activeTab, assignedStaffId, searchQuery]);

  // Fetch Customer list based on current active tab and touchpoint selection
  const fetchCustomerList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        bucket: 'NOT_COMBO_LIVE',
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sort: sortField
      };

      if (assignedStaffId && assignedStaffId !== 'all') {
        params.assignedStaffId = assignedStaffId;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Determine days range based on touchpoint or active tab
      if (activeTouchpointKey !== 'ALL') {
        const activeTouchpoints = configs[activeTab] || [];
        const touch = activeTouchpoints.find(t => t.key === activeTouchpointKey);
        if (touch) {
          params.daysSinceLastVisitMin = touch.daysMin.toString();
          params.daysSinceLastVisitMax = touch.daysMax.toString();
        }
      } else {
        // Fallback to active tab bounds
        const currentTabInfo = TAB_KEYS.find(t => t.id === activeTab);
        if (currentTabInfo) {
          params.daysSinceLastVisitMin = currentTabInfo.minDays.toString();
          if (currentTabInfo.maxDays !== undefined) {
            params.daysSinceLastVisitMax = currentTabInfo.maxDays.toString();
          }
        }
      }

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to load customer list:', err);
      message.error('Không thể tải danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeTab, activeTouchpointKey, searchQuery, sortField, assignedStaffId, configs]);

  // Fetch triggers
  useEffect(() => {
    fetchOverallStats();
  }, [fetchOverallStats]);

  useEffect(() => {
    if (Object.keys(configs).length > 0) {
      fetchTouchpointCounts();
    }
  }, [configs, activeTab, fetchTouchpointCounts]);

  useEffect(() => {
    if (Object.keys(configs).length > 0) {
      fetchCustomerList();
    }
  }, [configs, currentPage, pageSize, activeTab, activeTouchpointKey, searchQuery, sortField, assignedStaffId, fetchCustomerList]);

  // Reset pagination when filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeTouchpointKey, searchQuery, sortField, assignedStaffId]);

  // Operations
  const handleAddToPlan = async (customerId: number) => {
    try {
      await api.post('/plans', {
        legacyUserId: customerId,
        date: new Date().toISOString().split('T')[0]
      });
      message.success('Đã thêm khách hàng vào kế hoạch gọi hôm nay!');
      setDailyPlanList(prev => [...prev, customerId]);
    } catch (err: any) {
      console.error('Failed to add to call plan:', err);
      message.error(err.response?.data?.message || 'Không thể thêm khách hàng.');
    }
  };

  const handleOpenCallModal = (customer: Customer) => {
    setSelectedPlanInfo({
      legacyUserId: customer.id,
      customerName: customer.name,
      planId: null // Independent touchpoint call
    });
    setCallModalVisible(true);
  };

  const handleCallSuccess = () => {
    setCallModalVisible(false);
    fetchOverallStats();
    fetchCustomerList();
  };

  const handleOpenDetailModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalVisible(true);
    setHistoryLoading(true);
    setOrderHistory([]);
    setCallHistory([]);

    try {
      const [historyRes, callRes] = await Promise.all([
        api.get(`/customers/${customer.id}/history`),
        api.get(`/calls/${customer.id}`)
      ]);
      setOrderHistory(historyRes.data);
      setCallHistory(callRes.data);
    } catch (error) {
      console.error('Failed to fetch details history:', error);
      message.error('Không thể tải lịch sử chi tiết khách hàng.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Settings Configuration (Admin only)
  const handleOpenSettings = () => {
    setSelectedConfigTab('NYC_30');
    // Pre-populate settings form
    const currentTabConfigs = configs['NYC_30'] || [];
    settingsForm.setFieldsValue({ touchpoints: currentTabConfigs });
    setSettingsModalVisible(true);
  };

  const handleConfigTabChange = (val: string) => {
    setSelectedConfigTab(val);
    const tabConfigs = configs[val] || [];
    settingsForm.setFieldsValue({ touchpoints: tabConfigs });
  };

  const handleSaveConfig = async () => {
    try {
      const values = await settingsForm.validateFields();
      
      // Update local state temporarily for selected tab
      const updatedConfigs = {
        ...configs,
        [selectedConfigTab]: values.touchpoints
      };

      await api.put('/nyc/config', updatedConfigs);
      message.success('Đã xuất bản template cấu hình touchpoints mới thành công!');
      setConfigs(updatedConfigs);
      setSettingsModalVisible(false);
      setActiveTouchpointKey('ALL');
    } catch (err: any) {
      console.error('Save configs failed:', err);
      message.error(err.response?.data?.message || 'Lưu cấu hình thất bại.');
    }
  };

  const handleResetConfigDefaults = async () => {
    Modal.confirm({
      title: 'Xác nhận khôi phục mặc định',
      content: 'Bạn có chắc chắn muốn xóa tất cả cấu hình hiện tại và quay về cài đặt gốc không?',
      okText: 'Đồng ý',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          // Send default template object to reset
          const defaultConfigs: TabConfigs = {
            NYC_30: [
              { key: 'now', label: 'Chạm Now', daysMin: 0, daysMax: 1, color: 'blue' },
              { key: '3', label: 'Chạm 3', daysMin: 3, daysMax: 3, color: 'cyan' },
              { key: '7', label: 'Chạm 7', daysMin: 7, daysMax: 7, color: 'green' },
              { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'orange' },
              { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' }
            ],
            NYC_60: [
              { key: '35', label: 'Chạm 35', daysMin: 31, daysMax: 35, color: 'blue' },
              { key: '45', label: 'Chạm 45', daysMin: 41, daysMax: 45, color: 'orange' },
              { key: '55', label: 'Chạm 55', daysMin: 51, daysMax: 55, color: 'red' }
            ],
            NYC_90: [
              { key: '70', label: 'Chạm 70', daysMin: 65, daysMax: 70, color: 'blue' },
              { key: '80', label: 'Chạm 80', daysMin: 75, daysMax: 80, color: 'orange' }
            ],
            NYC_180: [
              { key: '100', label: 'Chạm 100', daysMin: 95, daysMax: 100, color: 'blue' },
              { key: '150', label: 'Chạm 150', daysMin: 145, daysMax: 150, color: 'orange' }
            ],
            NYC_365: [
              { key: '200', label: 'Chạm 200', daysMin: 195, daysMax: 200, color: 'blue' },
              { key: '300', label: 'Chạm 300', daysMin: 295, daysMax: 300, color: 'orange' }
            ],
            NYC_365plus: [
              { key: '400', label: 'Chạm 400', daysMin: 395, daysMax: 400, color: 'blue' },
              { key: '500', label: 'Chạm 500', daysMin: 495, daysMax: 500, color: 'orange' }
            ]
          };
          await api.put('/nyc/config', defaultConfigs);
          message.success('Đã khôi phục cài đặt mặc định thành công.');
          setConfigs(defaultConfigs);
          settingsForm.setFieldsValue({ touchpoints: defaultConfigs[selectedConfigTab] });
        } catch (err: any) {
          console.error(err);
          message.error('Khôi phục thất bại.');
        }
      }
    });
  };

  // Helper formats
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getActiveTabLabelCount = (id: string) => {
    return tabCounts[id] || 0;
  };

  // Columns for main table
  const columns = [
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Customer) => (
        <Space style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={record.avatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
              color: '#D4A84B',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0
            }}
          />
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }}>{text}</div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Chưa ghé tiệm',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      sorter: true,
      render: (days: number | null) => {
        if (days === null) return <Text type="secondary">Chưa từng đến</Text>;
        let color = 'default';
        if (days <= 30) color = 'green';
        else if (days <= 90) color = 'orange';
        else color = 'red';
        return <Tag color={color} style={{ fontWeight: '500' }}>{days} ngày</Tag>;
      }
    },
    {
      title: 'Ghé tiệm gần nhất',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
      render: (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '-'
    },
    {
      title: 'Tổng Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (val: number) => formatVND(val)
    },
    {
      title: 'Booker phụ trách',
      dataIndex: 'assignedStaff',
      key: 'assignedStaff',
      render: (staff: any) => staff ? <Tag color="cyan">{staff.displayName}</Tag> : <Text type="secondary" style={{ fontStyle: 'italic' }}>Chưa phân bổ</Text>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 250,
      render: (_: any, record: Customer) => {
        const isPlanned = dailyPlanList.includes(record.id);
        return (
          <Space size="small">
            <Button
              type={isPlanned ? 'dashed' : 'primary'}
              ghost={!isPlanned}
              size="small"
              icon={isPlanned ? <CheckCircleOutlined style={{ color: '#52C41A' }} /> : <PlusOutlined />}
              onClick={() => !isPlanned && handleAddToPlan(record.id)}
              style={!isPlanned ? { borderColor: token.colorPrimary, color: token.colorPrimary } : {}}
              disabled={isPlanned}
            >
              {isPlanned ? 'Đã lên lịch' : 'Lên lịch gọi'}
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PhoneOutlined />}
              onClick={() => handleOpenCallModal(record)}
              style={{ background: '#52C41A', borderColor: '#52C41A', color: '#fff' }}
            >
              Gọi
            </Button>
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetailModal(record)}
            >
              Chi tiết
            </Button>
          </Space>
        );
      }
    }
  ];

  // History columns for details modal
  const orderColumns = [
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
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (val: string) => <Tag color={val === 'Completed' ? 'green' : 'orange'}>{val}</Tag>
    }
  ];

  const activeTouchpointsList = configs[activeTab] || [];

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0, fontWeight: 'bold', letterSpacing: '0.5px' }}>
            <ClockCircleOutlined /> CHIẾN DỊCH KHÁCH HÀNG NYC
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Hệ thống chăm sóc đặc biệt dành cho khách hàng chưa mua gói Combo (Single/Combo hết hạn).
          </Text>
        </div>
        <Space wrap>
          {currentUser?.role === 'admin' && (
            <>
              <Select
                placeholder="Chọn Booker/Telesales"
                value={assignedStaffId}
                onChange={(val) => setAssignedStaffId(val)}
                style={{ width: 200 }}
                options={[
                  { value: 'all', label: 'Tất cả nhân sự' },
                  { value: 'unassigned', label: 'Chưa phân bổ' },
                  ...staffList.map(s => ({ value: s.id.toString(), label: s.displayName }))
                ]}
              />
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={handleOpenSettings}
                style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
              >
                Cấu hình Quy trình
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* METRICS CARDS */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px'
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>Tổng Khách Hàng NYC</Text>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}>
              {overallStats.totalNYC} <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>khách</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px'
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>NYC 30 (Quan trọng nhất)</Text>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#D4A84B', marginTop: '4px' }}>
              {overallStats.nyc30Count} <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>khách</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px'
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>Hiệu suất Đặt Lịch (Booked Rate)</Text>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#52C41A', marginTop: '4px' }}>
              {overallStats.bookedRate}% <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>đặt lịch</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px'
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>Đã gọi hôm nay</Text>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: token.colorPrimary, marginTop: '4px' }}>
              {overallStats.todayCalls} <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>cuộc gọi</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* TABS CONTAINER */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setActiveTouchpointKey('ALL');
        }}
        type="card"
        style={{ marginBottom: '16px' }}
        items={TAB_KEYS.map(tab => ({
          key: tab.id,
          label: (
            <Space>
              <span>{tab.name}</span>
              <Badge
                count={getActiveTabLabelCount(tab.id)}
                overflowCount={9999}
                style={{
                  backgroundColor: activeTab === tab.id ? '#D4A84B' : (themeMode === 'dark' ? '#333' : '#e8e8e8'),
                  color: activeTab === tab.id ? '#000' : (themeMode === 'dark' ? '#fff' : '#666')
                }}
              />
            </Space>
          )
        }))}
      />

      {/* FILTER & PIPELINE SECTION */}
      <Card
        style={{
          background: themeMode === 'dark' ? '#141414' : '#ffffff',
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: '24px',
          borderRadius: '8px'
        }}
      >
        <div className="flex flex-col gap-6">
          {/* TOUCHPOINTS PIPELINE TIMELINE */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Text style={{ fontWeight: '600', color: token.colorText }}>QUY TRÌNH CHĂM SÓC THEO CHẠM</Text>
              {activeTouchpointKey !== 'ALL' && (
                <Button type="link" size="small" onClick={() => setActiveTouchpointKey('ALL')}>
                  Xem tất cả khách hàng
                </Button>
              )}
            </div>
            
            {activeTouchpointsList.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: token.colorTextDescription }}>
                Chưa cấu hình chạm nào cho mốc thời gian này.
              </div>
            ) : (
              <Row gutter={[12, 12]} justify="start" style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: '8px' }}>
                <Col flex="0 0 160px">
                  <div
                    onClick={() => setActiveTouchpointKey('ALL')}
                    style={{
                      border: `1px solid ${activeTouchpointKey === 'ALL' ? token.colorPrimary : token.colorBorderSecondary}`,
                      background: activeTouchpointKey === 'ALL' 
                        ? (themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.08)')
                        : (themeMode === 'dark' ? '#000' : '#fafafa'),
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      boxShadow: activeTouchpointKey === 'ALL' ? '0 0 10px rgba(212, 168, 75, 0.3)' : 'none'
                    }}
                  >
                    <BookOutlined style={{ fontSize: '18px', color: activeTouchpointKey === 'ALL' ? token.colorPrimary : '#888' }} />
                    <div style={{ fontWeight: '600', marginTop: '6px', fontSize: '13px', color: token.colorText }}>Tất cả</div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Toàn bộ danh sách</Text>
                  </div>
                </Col>

                {activeTouchpointsList.map((tp) => {
                  const isActive = activeTouchpointKey === tp.key;
                  const count = touchpointCounts[tp.key] || 0;
                  
                  // Compute tag color mapping
                  let tagBg = 'rgba(136, 136, 136, 0.1)';
                  let tagBorder = '#888';
                  let activeGlow = 'rgba(136, 136, 136, 0.3)';
                  
                  if (tp.color === 'blue') {
                    tagBg = 'rgba(24, 144, 255, 0.1)';
                    tagBorder = '#1890ff';
                    activeGlow = 'rgba(24, 144, 255, 0.3)';
                  } else if (tp.color === 'cyan') {
                    tagBg = 'rgba(19, 194, 194, 0.1)';
                    tagBorder = '#19c2c2';
                    activeGlow = 'rgba(19, 194, 194, 0.3)';
                  } else if (tp.color === 'green') {
                    tagBg = 'rgba(82, 196, 26, 0.1)';
                    tagBorder = '#52c41a';
                    activeGlow = 'rgba(82, 196, 26, 0.3)';
                  } else if (tp.color === 'orange') {
                    tagBg = 'rgba(250, 143, 20, 0.1)';
                    tagBorder = '#fa8f14';
                    activeGlow = 'rgba(250, 143, 20, 0.3)';
                  } else if (tp.color === 'red') {
                    tagBg = 'rgba(245, 34, 45, 0.1)';
                    tagBorder = '#f5222d';
                    activeGlow = 'rgba(245, 34, 45, 0.3)';
                  } else if (tp.color === 'gold') {
                    tagBg = 'rgba(212, 168, 75, 0.1)';
                    tagBorder = '#D4A84B';
                    activeGlow = 'rgba(212, 168, 75, 0.3)';
                  }

                  return (
                    <Col key={tp.key} flex="0 0 180px">
                      <div
                        onClick={() => setActiveTouchpointKey(tp.key)}
                        style={{
                          border: `1px solid ${isActive ? tagBorder : token.colorBorderSecondary}`,
                          background: isActive ? tagBg : (themeMode === 'dark' ? '#000' : '#ffffff'),
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? `0 0 12px ${activeGlow}` : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Tag color={tp.color}>{tp.label}</Tag>
                          <Badge count={count} style={{ backgroundColor: tagBorder, color: '#fff' }} overflowCount={999} />
                        </div>
                        <div style={{ fontWeight: 'bold', marginTop: '10px', fontSize: '14px', color: token.colorText }}>
                          {tp.daysMin === tp.daysMax ? `${tp.daysMin} ngày` : `${tp.daysMin} - ${tp.daysMax} ngày`}
                        </div>
                        <div style={{ fontSize: '11px', color: token.colorTextDescription, marginTop: '2px' }}>Chưa quay lại tiệm</div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </div>

          <Divider style={{ margin: 0, borderColor: token.colorBorderSecondary }} />

          {/* SEARCH & SORT & FILTERS */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <Input
              placeholder="Tìm kiếm khách hàng theo tên, số điện thoại..."
              prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: 380 }}
              allowClear
              size="large"
            />
            
            <Space>
              <Text type="secondary">Sắp xếp theo:</Text>
              <Select
                value={sortField}
                onChange={(val) => setSortField(val)}
                style={{ width: 220 }}
                options={[
                  { value: 'daysSinceLastVisit_asc', label: 'Ngày chưa quay lại ít nhất' },
                  { value: 'daysSinceLastVisit_desc', label: 'Ngày chưa quay lại nhiều nhất' },
                  { value: 'totalSpent_desc', label: 'Chi tiêu cao nhất' },
                  { value: 'totalSpent_asc', label: 'Chi tiêu thấp nhất' },
                  { value: 'name_asc', label: 'Tên chữ cái (A-Z)' },
                  { value: 'name_desc', label: 'Tên chữ cái (Z-A)' },
                  { value: 'id_desc', label: 'Khách hàng mới nhất' }
                ]}
              />
            </Space>
          </div>
        </div>
      </Card>

      {/* DATA TABLE */}
      <Table
        dataSource={customers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
          style: { marginTop: '16px' }
        }}
        bordered
        style={{
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer
        }}
        className="antd-custom-table"
      />

      {/* CALL LOG MODAL */}
      <CallLogModal
        visible={callModalVisible}
        onCancel={() => setCallModalVisible(false)}
        onSuccess={handleCallSuccess}
        planId={selectedPlanInfo?.planId}
        legacyUserId={selectedPlanInfo?.legacyUserId || 0}
        customerName={selectedPlanInfo?.customerName || ''}
      />

      {/* CUSTOMER DETAIL MODAL */}
      <Modal
        title={
          <span style={{ color: '#D4A84B', fontSize: '20px', fontWeight: 'bold' }}>
            <UserOutlined /> Chi Tiết Khách Hàng Campaign NYC
          </span>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
        style={{ top: 40 }}
      >
        {selectedCustomer && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginTop: '16px' }}>
              <Descriptions.Item label="Mã KH" span={2}>{selectedCustomer.id}</Descriptions.Item>
              <Descriptions.Item label="Tên khách">
                <Space style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    src={selectedCustomer.avatar || undefined}
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
                      color: '#D4A84B',
                      border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
                      flexShrink: 0
                    }}
                  />
                  <span>{selectedCustomer.name}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedCustomer.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedCustomer.email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{selectedCustomer.gender || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedCustomer.dob || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Số ngày chưa quay lại">
                <strong style={{ color: '#FF4D4F' }}>{selectedCustomer.daysSinceLastVisit || 0} ngày</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Nhóm phân loại">
                <Tag color="warning">{selectedCustomer.bucket}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Tabs
              defaultActiveKey="calls"
              style={{ marginTop: '20px' }}
              items={[
                {
                  key: 'calls',
                  label: 'Nhật ký cuộc gọi chăm sóc',
                  children: (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px 5px' }}>
                      <Spin spinning={historyLoading}>
                        {callHistory.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: token.colorTextDescription }}>
                            Chưa có lịch sử cuộc gọi nào cho khách hàng này.
                          </div>
                        ) : (
                          <Timeline mode="left" style={{ marginTop: '10px' }}>
                            {callHistory.map((log: any) => {
                              let statusColor = 'blue';
                              if (log.callResult === 'NO_ANSWER') statusColor = 'red';
                              if (log.outcome === 'BOOKED') statusColor = 'green';
                              if (log.outcome === 'CALL_BACK') statusColor = 'orange';

                              return (
                                <Timeline.Item
                                  key={log.id}
                                  color={statusColor}
                                  label={new Date(log.createdAt).toLocaleString('vi-VN')}
                                >
                                  <div>
                                    <strong>{log.staffName}</strong>: {' '}
                                    <Tag color={log.callResult === 'ANSWERED' ? 'green' : 'red'}>
                                      {log.callResult === 'ANSWERED' ? 'Đã nghe máy' : 'Gọi nhỡ'}
                                    </Tag>
                                    {log.outcome && log.outcome !== 'PENDING' && (
                                      <Tag color="gold">{log.outcome}</Tag>
                                    )}
                                    <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '13px', color: token.colorTextSecondary }}>
                                      Ghi chú: {log.note || 'Không có'}
                                    </div>
                                    {log.callbackDate && (
                                      <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '2px' }}>
                                        <CalendarOutlined /> Hẹn gọi lại vào: {new Date(log.callbackDate).toLocaleDateString('vi-VN')}
                                      </div>
                                    )}
                                  </div>
                                </Timeline.Item>
                              );
                            })}
                          </Timeline>
                        )}
                      </Spin>
                    </div>
                  )
                },
                {
                  key: 'orders',
                  label: 'Lịch sử đơn hàng',
                  children: (
                    <Table
                      dataSource={orderHistory}
                      columns={orderColumns}
                      rowKey="id"
                      loading={historyLoading}
                      pagination={{ pageSize: 5 }}
                      size="small"
                      bordered
                    />
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* SETTINGS TEMPLATES CONFIG MODAL (Admin only) */}
      <Modal
        className="nyc-config-modal"
        title={
          <span style={{ color: '#D4A84B', fontSize: '18px', fontWeight: 'bold' }}>
            <SettingOutlined /> Cấu Hình Quy Trình Chăm Sóc NYC
          </span>
        }
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        footer={[
          <Button key="reset" danger ghost onClick={handleResetConfigDefaults} style={{ float: 'left' }}>
            <UndoOutlined /> Khôi phục mặc định
          </Button>,
          <Button key="close" onClick={() => setSettingsModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={handleSaveConfig}
            style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
          >
            Lưu thành Template chung
          </Button>
        ]}
        width={modalWidth}
        style={{ top: 50 }}
        modalRender={(node) => (
          <div style={{ position: 'relative', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              {node}
            </div>
            <div
              onMouseDown={handleResizeMouseDown}
              style={{
                position: 'absolute',
                right: '0px',
                bottom: '0px',
                width: '28px',
                height: '28px',
                cursor: 'se-resize',
                zIndex: 1060,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                padding: '6px',
                background: 'transparent',
                pointerEvents: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderBottom: `3px solid ${token.colorPrimary}`,
                  borderRight: `3px solid ${token.colorPrimary}`,
                  borderRadius: '0 0 3px 0',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </div>
        )}
      >
        <div style={{ margin: '12px 0 20px 0' }}>
          <Text type="secondary">
            Thiết lập các mốc chạm cho từng tab NYC. Bản lưu này sẽ được xuất bản thành mẫu chung (Template) để mọi nhân sự Online Consultant cùng áp dụng.
          </Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
          <span style={{ fontWeight: '500' }}>Cấu hình cho nhóm tab:</span>
          <Select
            value={selectedConfigTab}
            onChange={handleConfigTabChange}
            style={{ width: 220 }}
            options={TAB_KEYS.map(t => ({ value: t.id, label: `${t.name} (${t.rangeText})` }))}
          />
        </div>

        <Form form={settingsForm} layout="vertical">
          <Form.List name="touchpoints">
            {(fields, { add, remove }) => (
              <>
                <div id="nyc-touchpoints-list" style={{ height: `${modalHeight - 200}px`, minHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      style={{
                        marginBottom: '12px',
                        background: themeMode === 'dark' ? '#141414' : '#fafafa',
                        borderColor: token.colorBorderSecondary
                      }}
                    >
                      <Row gutter={12} align="middle">
                        <Col span={7}>
                          <Form.Item
                            {...restField}
                            name={[name, 'label']}
                            label="Tên chạm (ví dụ: Chạm 3)"
                            rules={[{ required: true, message: 'Nhập tên chạm' }]}
                          >
                            <Input placeholder="Tên chạm" />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'daysMin']}
                            label="Số ngày min"
                            rules={[{ required: true, message: 'Số ngày min' }]}
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'daysMax']}
                            label="Số ngày max"
                            rules={[{ required: true, message: 'Số ngày max' }]}
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'color']}
                            label="Màu sắc tag"
                            rules={[{ required: true }]}
                          >
                            <Select
                              options={[
                                { value: 'blue', label: 'Blue' },
                                { value: 'cyan', label: 'Cyan' },
                                { value: 'green', label: 'Green' },
                                { value: 'orange', label: 'Orange' },
                                { value: 'red', label: 'Red' },
                                { value: 'gold', label: 'Gold' }
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ textAlign: 'center', marginTop: '8px' }}>
                          <MinusCircleOutlined
                            onClick={() => remove(name)}
                            style={{ color: '#FF4D4F', fontSize: '18px', cursor: 'pointer' }}
                          />
                        </Col>
                      </Row>
                      
                      {/* Hidden key field */}
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        initialValue={`tp_${Date.now()}_${key}`}
                        style={{ display: 'none' }}
                      >
                        <Input type="hidden" />
                      </Form.Item>
                    </Card>
                  ))}
                </div>

                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add({ key: `tp_${Date.now()}`, label: 'Chạm mới', daysMin: 3, daysMax: 3, color: 'blue' })}
                    block
                    icon={<PlusOutlined />}
                  >
                    Thêm Chạm mới
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <style jsx global>{`
        /* Keep theme styling consistent */
        .antd-custom-table .ant-table {
          background: ${themeMode === 'dark' ? '#000000' : '#ffffff'} !important;
          color: ${themeMode === 'dark' ? '#ccc' : '#333'} !important;
        }
        
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #141414 !important;
          color: #fff !important;
          border-bottom: 1px solid #303030 !important;
        }

        .light-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #fafafa !important;
          color: #000 !important;
          border-bottom: 1px solid #f0f0f0 !important;
        }

        .dark-theme .antd-custom-table .ant-table-cell {
          border-bottom: 1px solid #1f1f1f !important;
        }

        .light-theme .antd-custom-table .ant-table-cell {
          border-bottom: 1px solid #f0f0f0 !important;
        }

        .dark-theme .ant-table-row:hover > td {
          background: #141414 !important;
        }

        .light-theme .ant-table-row:hover > td {
          background: #fafafa !important;
        }
      `}</style>
    </div>
  );
}
