'use client';

import '../../suppress-warnings';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../lib/api';
import {
  Typography,
  Card,
  theme,
  DatePicker,
  Radio,
  Space,
  Row,
  Col,
  Table,
  Badge,
  Spin,
  message,
  Divider,
  Button,
  Tag,
  Tabs,
  Avatar,
  Drawer,
  Rate,
  Tooltip,
  Switch,
  Select,
} from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  SyncOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  RightOutlined,
  GiftOutlined,
  InboxOutlined,
  SmileOutlined,
  EyeOutlined,
  CloseOutlined,
  BarChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';
import { useOmiCall } from '../../../context/OmiCallContext';
import CustomerDetailDrawer from '../../../components/CustomerDetailDrawer';
import { useTableConfig } from '../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../components/TableConfigDrawer';
import { ResizableHeaderCell } from '../../../components/ResizableHeaderCell';

const { Title, Text } = Typography;

// --- Donut Chart Components & Helpers ---

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

const DonutChart = ({
  segments,
  total,
  themeMode,
  centerLabel,
  centerSubLabel = 'tổng',
  size = 92,
}: {
  segments: DonutSegment[];
  total: number;
  themeMode: 'light' | 'dark';
  centerLabel?: string;
  centerSubLabel?: string;
  size?: number;
}) => {
  let accumulatedPercent = 0;
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="18"
          cy="18"
          r="15.915"
          fill="none"
          stroke={themeMode === 'dark' ? '#2d2d2d' : '#f0f0f0'}
          strokeWidth="3.4"
        />
        {segments.map((seg, idx) => {
          const percent = total > 0 ? (seg.value / total) * 100 : 0;
          if (percent === 0) return null;
          const strokeDasharray = `${percent} ${100 - percent}`;
          const strokeDashoffset = -accumulatedPercent;
          accumulatedPercent += percent;
          return (
            <circle
              key={idx}
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke={seg.color}
              strokeWidth="4.0"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: centerLabel && centerLabel.length > 5 ? '12px' : '17px',
            fontWeight: 'bold',
            lineHeight: 1,
            color: themeMode === 'dark' ? '#ffffff' : '#141414',
          }}
        >
          {centerLabel !== undefined ? centerLabel : total}
        </span>
        {centerSubLabel && (
          <span
            style={{
              fontSize: '9px',
              opacity: 0.5,
              marginTop: '3px',
              color: themeMode === 'dark' ? '#8c8c8c' : '#8c8c8c',
            }}
          >
            {centerSubLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const formatCenterRevenue = (val: number) => {
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (val >= 1000) {
    return `${(val / 1000).toFixed(0)}k`;
  }
  return String(val);
};

// --- Interfaces for Data ---

interface BookingData {
  key: string;
  customerId?: number;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  channel?: string;
  createdTime: string;
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
  branchName?: string;
  bookingDateTime?: string;
  requestedCv?: string;
  bookingNote?: string;
  status?: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
}

interface ComingClientData {
  key: string;
  customerId?: number;
  time: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  channel?: string;
  category?: string;
  cc: string;
  cv: string;
  service: string;
  status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  price?: number;
  tax?: number;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
}

interface ShopCCData {
  name: string;
  doing: string;
  clients: number;
  combos: number;
  revenue: number;
  revLe?: number;
  revCombo?: number;
  revProduct?: number;
  netRevenue?: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
}

interface ShopCVData {
  name: string;
  doing: string;
  clients: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
  status: 'busy' | 'available';
}

interface BranchDetail {
  revLe: number;
  revCombo: number;
  revProduct: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  cc: ShopCCData[];
  cv: ShopCVData[];
  coming: ComingClientData[];
}

const RealtimeClock = React.memo(() => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      setTime(dayjs().format('HH:mm:ss - DD/MM/YYYY'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  return <strong style={{ color: '#D4A84B', fontSize: '14px' }}>{time}</strong>;
});
RealtimeClock.displayName = 'RealtimeClock';

export default function TodayDashboard() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  // Auto-refresh states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // default to 60s
  const [countdown, setCountdown] = useState(60);
  const [silentLoading, setSilentLoading] = useState(false);

  // Tabs states
  const [bookingFilter, setBookingFilter] = useState<'all' | 'combo' | 'oc' | 'other'>('all');
  const [bookingBranch, setBookingBranch] = useState<'all' | 'detham' | 'pxl' | 'estella'>('all');
  const [comingBranch, setComingBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');
  const [comingCategory, setComingCategory] = useState<'all' | 'combo' | 'oc' | 'other'>('all');
  const [shopBranch, setShopBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');

  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showTax, setShowTax] = useState(true);

  // Load persisted states on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistedDate = localStorage.getItem('today_selected_date');
      if (persistedDate) {
        setSelectedDate(dayjs(persistedDate));
      } else {
        setSelectedDate(dayjs());
      }
      const persistedShowTax = localStorage.getItem('today_show_tax');
      if (persistedShowTax !== null) {
        setShowTax(persistedShowTax === 'true');
      }
      const persistedBookingFilter = localStorage.getItem('today_booking_filter');
      if (persistedBookingFilter !== null) {
        setBookingFilter(persistedBookingFilter as any);
      }
      const persistedBookingBranch = localStorage.getItem('today_booking_branch');
      if (persistedBookingBranch !== null) {
        setBookingBranch(persistedBookingBranch as any);
      }
      const persistedComingBranch = localStorage.getItem('today_coming_branch');
      if (persistedComingBranch !== null) {
        setComingBranch(persistedComingBranch as any);
      }
      const persistedComingCategory = localStorage.getItem('today_coming_category');
      if (persistedComingCategory !== null) {
        setComingCategory(persistedComingCategory as any);
      }
      const persistedShopBranch = localStorage.getItem('today_shop_branch');
      if (persistedShopBranch !== null) {
        setShopBranch(persistedShopBranch as any);
      }
      const persistedAutoRefresh = localStorage.getItem('today_auto_refresh');
      if (persistedAutoRefresh !== null) {
        setAutoRefresh(persistedAutoRefresh === 'true');
      }
      const persistedRefreshInterval = localStorage.getItem('today_refresh_interval');
      if (persistedRefreshInterval !== null) {
        const parsed = parseInt(persistedRefreshInterval, 10);
        if (!isNaN(parsed)) {
          setRefreshInterval(parsed);
          setCountdown(parsed);
        }
      }
    }
  }, []);

  const openCustomerDrawer = (record: any) => {
    setSelectedCustomer(record);
    setDrawerVisible(true);
  };

  // Realtime simulated data
  const [branchesData, setBranchesData] = useState<Record<string, BranchDetail>>({
    detham: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      cc: [],
      cv: [],
      coming: [],
    },
    pxl: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      cc: [],
      cv: [],
      coming: [],
    },
    estella: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      cc: [],
      cv: [],
      coming: [],
    },
  });

  const [bookingsCombo, setBookingsCombo] = useState<BookingData[]>([]);
  const [bookingsOc, setBookingsOc] = useState<BookingData[]>([]);
  const [bookingsOther, setBookingsOther] = useState<BookingData[]>([]);

  const fetchDashboardData = useCallback(async (date: dayjs.Dayjs, isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setSilentLoading(true);
    }
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const response = await api.get('/dashboard/today', {
        params: { date: dateStr },
      });
      const data = response.data;
      setBranchesData(data.branchesData);
      setBookingsCombo(data.bookingsCombo);
      setBookingsOc(data.bookingsOc || []);
      setBookingsOther(data.bookingsOther);
    } catch (err) {
      console.error('Fetch dashboard today error:', err);
      if (!isSilent) {
        message.error('Lỗi khi tải dữ liệu vận hành thực tế!');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      } else {
        setSilentLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDashboardData(selectedDate);
    }
  }, [selectedDate, fetchDashboardData]);

  // Auto-refresh countdown & visibility handler
  useEffect(() => {
    if (!autoRefresh || !selectedDate) return;

    // Only auto refresh if target date is today
    const isToday = selectedDate.isSame(dayjs(), 'day');
    if (!isToday) return;

    let timer: any;

    const tick = () => {
      if (document.visibilityState !== 'visible') {
        // Do not countdown or fetch if tab is hidden
        return;
      }
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(selectedDate, true);
          return refreshInterval;
        }
        return prev - 1;
      });
    };

    timer = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Immediately fetch data on focus to ensure accuracy and reset countdown
        fetchDashboardData(selectedDate, true);
        setCountdown(refreshInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, selectedDate, refreshInterval, fetchDashboardData]);

  // Reset countdown if selectedDate changes or refreshInterval changes
  useEffect(() => {
    setCountdown(refreshInterval);
  }, [selectedDate, refreshInterval]);

  const handleRefresh = async () => {
    if (selectedDate) {
      await fetchDashboardData(selectedDate);
      message.success('Đã làm mới dữ liệu vận hành từ cơ sở dữ liệu!');
      setCountdown(refreshInterval);
    }
  };

  const getBranchLabel = (key: string) => {
    if (key === 'detham') return 'Đề Thám';
    if (key === 'pxl') return 'PXL';
    if (key === 'estella') return 'Estella';
    return '';
  };

  const allBookings = React.useMemo(() => {
    const combined = [
      ...bookingsCombo.map((b) => ({ ...b, category: 'combo' })),
      ...bookingsOc.map((b) => ({ ...b, category: 'oc' })),
      ...bookingsOther.map((b) => ({ ...b, category: 'other' })),
    ];
    return combined.sort((a, b) => Number(b.key) - Number(a.key));
  }, [bookingsCombo, bookingsOc, bookingsOther]);

  const bookingBranchCounts = React.useMemo(() => {
    let dt = 0;
    let pxl = 0;
    let ep = 0;
    allBookings.forEach((b) => {
      if (b.branchName === 'Đề Thám') dt++;
      else if (b.branchName === 'PXL') pxl++;
      else if (b.branchName === 'Estella') ep++;
    });
    return { dt, pxl, ep, total: allBookings.length };
  }, [allBookings]);

  const filteredBookings = React.useMemo(() => {
    return allBookings.filter((b) => {
      // Category filter
      if (bookingFilter !== 'all' && b.category !== bookingFilter) {
        return false;
      }
      // Branch filter
      if (bookingBranch !== 'all') {
        if (bookingBranch === 'detham' && b.branchName !== 'Đề Thám') return false;
        if (bookingBranch === 'pxl' && b.branchName !== 'PXL') return false;
        if (bookingBranch === 'estella' && b.branchName !== 'Estella') return false;
      }
      return true;
    });
  }, [allBookings, bookingFilter, bookingBranch]);

  const activeComingList = React.useMemo(() => {
    const fullList = Object.keys(branchesData).flatMap((branchKey) =>
      (branchesData[branchKey].coming || []).map((item) => ({
        ...item,
        branchName: getBranchLabel(branchKey),
        branchKey,
      }))
    );

    const filtered = fullList.filter((item) => {
      // Branch filter
      if (comingBranch !== 'all' && item.branchKey !== comingBranch) {
        return false;
      }
      // Category filter
      if (comingCategory !== 'all' && item.category !== comingCategory) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [branchesData, comingBranch, comingCategory]);

  const activeShopData = React.useMemo(() => {
    const raw =
      shopBranch === 'all'
        ? {
            revLe: Object.values(branchesData).reduce((sum, b) => sum + (b.revLe || 0), 0),
            revCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.revCombo || 0), 0),
            revProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.revProduct || 0), 0),
            netLe: Object.values(branchesData).reduce((sum, b) => sum + (b.netLe || 0), 0),
            netCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.netCombo || 0), 0),
            netProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.netProduct || 0), 0),
            cc: Object.entries(branchesData).flatMap(([branchKey, b]) =>
              b.cc.map((item) => ({ ...item, branchName: getBranchLabel(branchKey) }))
            ),
            cv: Object.entries(branchesData).flatMap(([branchKey, b]) =>
              b.cv.map((item) => ({ ...item, branchName: getBranchLabel(branchKey) }))
            ),
            coming: [] as any[],
          }
        : {
            ...branchesData[shopBranch],
            cc: (branchesData[shopBranch]?.cc || []).map((item) => ({
              ...item,
              branchName: getBranchLabel(shopBranch),
            })),
            cv: (branchesData[shopBranch]?.cv || []).map((item) => ({
              ...item,
              branchName: getBranchLabel(shopBranch),
            })),
          };

    return {
      revLe: showTax ? raw.revLe || 0 : raw.netLe || 0,
      revCombo: showTax ? raw.revCombo || 0 : raw.netCombo || 0,
      revProduct: showTax ? raw.revProduct || 0 : raw.netProduct || 0,
      cc: (raw.cc || []).map((c: any) => ({
        ...c,
        revLe: showTax ? c.revLe || 0 : c.netLe || 0,
        revCombo: showTax ? c.revCombo || 0 : c.netCombo || 0,
        revProduct: showTax ? c.revProduct || 0 : c.netProduct || 0,
        revenue: showTax ? c.revenue || 0 : c.netRevenue || 0,
      })),
      cv: raw.cv || [],
      coming: raw.coming || [],
    };
  }, [branchesData, shopBranch, showTax]);

  const bookingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (t: string) => <Text type="secondary">{t}</Text>,
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (c: string) => <Tag color="purple">{c || 'N/A'}</Tag>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: BookingData) => (
        <Space size="middle" style={{ cursor: 'pointer' }} onClick={() => openCustomerDrawer(record)}>
          <Avatar
            src={record.avatar || undefined}
            style={{
              backgroundColor: record.avatarColor || '#D4A84B',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong className="hover:underline">{record.customer}</strong>
        </Space>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string, record: any) =>
        t ? (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
            onClick={() => makeCall(t, record.customer, record.customerId, record.avatar || undefined)}
            style={{ color: token.colorText, fontWeight: '600' }}
          >
            <PhoneOutlined style={{ color: '#D4A84B' }} />
            <span>{t}</span>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => (
        <Tag color="cyan" style={{ fontWeight: 'bold' }}>
          {b || 'Đề Thám'}
        </Tag>
      ),
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live')
          return (
            <Tag color="gold" style={{ fontWeight: 'bold' }}>
              combo live
            </Tag>
          );
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      },
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) =>
        p ? (
          <Tag color="pink" style={{ fontSize: '10px' }}>
            {p}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Ngày & Giờ đặt lịch',
      dataIndex: 'bookingDateTime',
      key: 'bookingDateTime',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>,
    },
    {
      title: 'Requested CV',
      dataIndex: 'requestedCv',
      key: 'requestedCv',
      render: (cv: string) => <Tag color={cv === 'Chưa phân công' ? 'default' : 'blue'}>{cv}</Tag>,
    },
    {
      title: 'Booking Notes',
      dataIndex: 'bookingNote',
      key: 'bookingNote',
      render: (note: string) =>
        note ? (
          <Tooltip
            title={<div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{note}</div>}
            styles={{ root: { maxWidth: '400px' } }}
          >
            <div
              style={{
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {note}
            </div>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: any) => renderComingStatus(status),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: BookingData) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#D4A84B' }} />}
          onClick={() => openCustomerDrawer(record)}
          style={{ padding: 0 }}
        />
      ),
    },
  ];

  const comingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: 'Giờ Hẹn',
      dataIndex: 'time',
      key: 'time',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>,
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => (
        <Tag color="cyan" style={{ fontWeight: 'bold' }}>
          {b}
        </Tag>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: ComingClientData) => (
        <Space size="middle" style={{ cursor: 'pointer' }} onClick={() => openCustomerDrawer(record)}>
          <Avatar
            src={record.avatar || undefined}
            style={{
              backgroundColor: record.avatarColor || '#D4A84B',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong className="hover:underline">{record.customer}</strong>
        </Space>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string, record: any) =>
        t ? (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
            onClick={() => makeCall(t, record.customer, record.customerId, record.avatar || undefined)}
            style={{ color: token.colorText, fontWeight: '600' }}
          >
            <PhoneOutlined style={{ color: '#D4A84B' }} />
            <span>{t}</span>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live')
          return (
            <Tag color="gold" style={{ fontWeight: 'bold' }}>
              combo live
            </Tag>
          );
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      },
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) =>
        p ? (
          <Tag color="pink" style={{ fontSize: '10px' }}>
            {p}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (c: string) => <Tag color="purple">{c || 'N/A'}</Tag>,
    },
    {
      title: 'CC',
      dataIndex: 'cc',
      key: 'cc',
      render: (cc: string) => <strong style={{ color: '#1890ff' }}>{cc}</strong>,
    },
    {
      title: 'CV',
      dataIndex: 'cv',
      key: 'cv',
      render: (cv: string) => (
        <Tag color={cv === 'Chưa phân công' ? 'default' : cv === 'Nghỉ phép' ? 'red' : 'blue'}>{cv}</Tag>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: any) => renderComingStatus(status),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: ComingClientData) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#D4A84B' }} />}
          onClick={() => openCustomerDrawer(record as any)}
          style={{ padding: 0 }}
        />
      ),
    },
  ];

  const {
    loading: bookingConfigLoading,
    columns: bookingConfigColumns,
    rawConfig: bookingRawConfig,
    configVisible: bookingConfigVisible,
    openConfig: openBookingConfig,
    closeConfig: closeBookingConfig,
    saveConfig: saveBookingConfig,
    resetConfig: resetBookingConfig,
  } = useTableConfig('today_booking_table', bookingColumns);

  const {
    loading: comingConfigLoading,
    columns: comingConfigColumns,
    rawConfig: comingRawConfig,
    configVisible: comingConfigVisible,
    openConfig: openComingConfig,
    closeConfig: closeComingConfig,
    saveConfig: saveComingConfig,
    resetConfig: resetComingConfig,
  } = useTableConfig('today_coming_table', comingColumns);

  const renderComingStatus = (status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late') => {
    switch (status) {
      case 'completed':
        return <Tag color="success">Hoàn thành</Tag>;
      case 'serving':
      case 'arrived':
        return <Tag color="cyan">Đang làm</Tag>;
      case 'confirmed':
        return <Tag color="processing">Đã xác nhận</Tag>;
      case 'pending':
        return <Tag color="warning">Chờ đến</Tag>;
      case 'late':
        return <Tag color="error">Đến muộn</Tag>;
      default:
        return <Tag color="default">Chờ xử lý</Tag>;
    }
  };

  const renderShiftAndAttendance = (
    shift: 'sáng' | 'chiều' | 'full' | 'off',
    attendance: 'none' | 'checked_in' | 'checked_out' | 'late'
  ) => {
    if (shift === 'off') {
      return (
        <Tooltip title="Nghỉ phép tuần">
          <Space size={6} style={{ cursor: 'help' }}>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#bfbfbf',
                verticalAlign: 'middle',
              }}
            />
            <span style={{ fontSize: '12px', color: '#bfbfbf', fontWeight: 500 }}>Off</span>
          </Space>
        </Tooltip>
      );
    }

    let shiftText = '';
    if (shift === 'sáng') shiftText = 'Sáng';
    else if (shift === 'chiều') shiftText = 'Chiều';
    else if (shift === 'full') shiftText = 'Full';

    let attText = '';
    let dotColor = '#bfbfbf';
    if (attendance === 'checked_in') {
      attText = 'Đã check-in';
      dotColor = '#52c41a'; // Green
    } else if (attendance === 'checked_out') {
      attText = 'Đã check-out';
      dotColor = '#8c8c8c'; // Gray
    } else if (attendance === 'late') {
      attText = 'Đi trễ';
      dotColor = '#ff4d4f'; // Red
    } else {
      attText = 'Chưa check-in';
      dotColor = '#faad14'; // Orange/Amber
    }

    return (
      <Tooltip title={`Ca ${shiftText} - ${attText}`}>
        <Space size={6} style={{ cursor: 'help' }}>
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: dotColor,
              verticalAlign: 'middle',
            }}
          />
          <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>{shiftText}</span>
        </Space>
      </Tooltip>
    );
  };

  const comingBranchStats = React.useMemo(() => {
    let dtCount = 0,
      dtPrice = 0;
    let epCount = 0,
      epPrice = 0;
    let pxlCount = 0,
      pxlPrice = 0;

    const getItemPrice = (item: any) => {
      if (typeof item.price === 'number') return item.price;
      const ltvStr = item.ltv || '';
      const parsed = Number(ltvStr.replace(/[^\d]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    (branchesData.detham?.coming || []).forEach((item: any) => {
      dtCount++;
      if (item.status === 'completed') {
        dtPrice += getItemPrice(item);
      }
    });
    (branchesData.estella?.coming || []).forEach((item: any) => {
      epCount++;
      if (item.status === 'completed') {
        epPrice += getItemPrice(item);
      }
    });
    (branchesData.pxl?.coming || []).forEach((item: any) => {
      pxlCount++;
      if (item.status === 'completed') {
        pxlPrice += getItemPrice(item);
      }
    });

    const totalCount = dtCount + epCount + pxlCount;
    const totalPrice = dtPrice + epPrice + pxlPrice;

    return {
      dt: { count: dtCount, price: dtPrice },
      ep: { count: epCount, price: epPrice },
      pxl: { count: pxlCount, price: pxlPrice },
      totalCount,
      totalPrice,
    };
  }, [branchesData]);

  const comingStats = React.useMemo(() => {
    let comboCount = 0,
      comboPrice = 0;
    let ocCount = 0,
      ocPrice = 0;
    let otherCount = 0,
      otherPrice = 0;

    const getItemPrice = (item: any) => {
      if (typeof item.price === 'number') return item.price;
      const ltvStr = item.ltv || '';
      const parsed = Number(ltvStr.replace(/[^\d]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const allComing = Object.keys(branchesData).flatMap((branchKey) => branchesData[branchKey].coming || []);
    allComing.forEach((item) => {
      const price = item.status === 'completed' ? getItemPrice(item) : 0;
      if (item.category === 'combo') {
        comboCount++;
        comboPrice += price;
      } else if (item.category === 'oc') {
        ocCount++;
        ocPrice += price;
      } else {
        otherCount++;
        otherPrice += price;
      }
    });

    const totalCount = allComing.length;
    const totalPrice = comboPrice + ocPrice + otherPrice;

    return {
      combo: { count: comboCount, price: comboPrice },
      oc: { count: ocCount, price: ocPrice },
      other: { count: otherCount, price: otherPrice },
      totalCount,
      totalPrice,
    };
  }, [branchesData]);

  const totalRevenueData = React.useMemo(() => {
    const revLe = Object.values(branchesData).reduce((sum, b) => sum + (showTax ? b.revLe || 0 : b.netLe || 0), 0);
    const revCombo = Object.values(branchesData).reduce(
      (sum, b) => sum + (showTax ? b.revCombo || 0 : b.netCombo || 0),
      0
    );
    const revProduct = Object.values(branchesData).reduce(
      (sum, b) => sum + (showTax ? b.revProduct || 0 : b.netProduct || 0),
      0
    );
    const total = revLe + revCombo + revProduct;
    return { revLe, revCombo, revProduct, total };
  }, [branchesData, showTax]);

  const categoryRevenueData = React.useMemo(() => {
    let revCombo = 0;
    let revTele = 0;
    let revOther = 0;

    const allComing = Object.keys(branchesData).flatMap((branchKey) => branchesData[branchKey].coming || []);
    allComing.forEach((item) => {
      if (item.status === 'completed') {
        const rawPrice = item.price || 0;
        const tax = item.tax || 0;
        const price = showTax ? rawPrice : rawPrice - tax;

        if (item.category === 'combo') {
          revCombo += price;
        } else if (item.category === 'oc') {
          revTele += price;
        } else {
          revOther += price;
        }
      }
    });

    const total = revCombo + revTele + revOther;
    return { revCombo, revTele, revOther, total };
  }, [branchesData, showTax]);

  if (!selectedDate) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: themeMode === 'dark' ? '#0b0f19' : '#ffffff',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Control Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 24px',
          background: themeMode === 'dark' ? '#111827' : '#fffbe6',
          borderRadius: '12px',
          border: `1px solid ${themeMode === 'dark' ? '#1f2937' : '#ffd666'}`,
        }}
      >
        <div>
          <Title
            level={4}
            style={{
              margin: 0,
              color: themeMode === 'dark' ? '#D4A84B' : '#873800',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ClockCircleOutlined /> Control Board Hôm Nay (Today operations)
          </Title>
          <Text style={{ fontSize: '13px', color: themeMode === 'dark' ? '#a6a6a6' : '#595959' }}>
            Giám sát thời gian thực lịch đặt mới, luồng khách đến và trạng thái phục vụ của CC & CV.
          </Text>
        </div>

        <Space size="middle" style={{ flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: token.colorTextDescription }}>Thời gian thực tế</div>
            <RealtimeClock />
          </div>
          <Divider
            type="vertical"
            style={{ height: '32px', borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9' }}
          />
          <DatePicker
            value={selectedDate}
            onChange={(date) => {
              if (date) {
                setSelectedDate(date);
                localStorage.setItem('today_selected_date', date.format('YYYY-MM-DD'));
              }
            }}
            format="DD/MM/YYYY"
            allowClear={false}
            style={{ width: '140px' }}
          />
          <Button
            type="primary"
            icon={<SyncOutlined spin={loading || silentLoading} />}
            onClick={handleRefresh}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000000', fontWeight: 'bold' }}
          >
            Làm mới
          </Button>

          {selectedDate?.isSame(dayjs(), 'day') && (
            <>
              <Divider
                type="vertical"
                style={{ height: '32px', borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9' }}
              />
              <Space size="small">
                <Switch
                  checked={autoRefresh}
                  onChange={(checked) => {
                    setAutoRefresh(checked);
                    localStorage.setItem('today_auto_refresh', String(checked));
                  }}
                  size="small"
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: themeMode === 'dark' ? '#a6a6a6' : '#595959',
                    minWidth: '70px',
                    display: 'inline-block',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Auto: {autoRefresh ? `${countdown}s` : 'Tắt'}
                </span>
                {autoRefresh && (
                  <Select
                    size="small"
                    value={refreshInterval}
                    style={{ width: '75px' }}
                    onChange={(val) => {
                      setRefreshInterval(val);
                      localStorage.setItem('today_refresh_interval', String(val));
                    }}
                    options={[
                      { value: 10, label: '10s' },
                      { value: 15, label: '15s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '60s' },
                    ]}
                  />
                )}
              </Space>
            </>
          )}
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {/* OVERVIEW CHARTS ROW */}
          <Col span={24}>
            <Row gutter={[16, 16]} style={{ marginBottom: '8px' }}>
              {/* CHART 1: BOOKING TẠO HÔM NAY (COMBINED TYPE & BRANCH) */}
              <Col xs={24} sm={24} md={24} lg={24} xl={8}>
                <Card
                  size="small"
                  style={{
                    background: token.colorBgContainer,
                    borderColor: token.colorBorderSecondary,
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorTextSecondary }}>
                      <CalendarOutlined style={{ color: '#52c41a', marginRight: '6px' }} />
                      Booking Tạo Hôm Nay
                    </span>
                    <strong style={{ fontSize: '15px', color: token.colorText }}>{allBookings.length}</strong>
                  </div>

                  <Row gutter={16} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {/* Left Column: Cơ cấu nhóm */}
                    <Col
                      span={12}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                        paddingRight: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: token.colorTextDescription,
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        Nhóm khách
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DonutChart
                          total={allBookings.length}
                          themeMode={themeMode}
                          segments={[
                            { value: bookingsCombo.length, color: '#D4A84B', label: 'Combo' },
                            { value: bookingsOc.length, color: '#52C41A', label: 'Tele' },
                            { value: bookingsOther.length, color: '#1890FF', label: 'Khác' },
                          ]}
                        />
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}
                        >
                          <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#D4A84B',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Combo: <strong>{bookingsCombo.length}</strong>
                          </div>
                          <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#52C41A',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Tele: <strong>{bookingsOc.length}</strong>
                          </div>
                          <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#1890FF',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Khác: <strong>{bookingsOther.length}</strong>
                          </div>
                        </div>
                      </div>
                    </Col>

                    {/* Right Column: Chi nhánh */}
                    <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: token.colorTextDescription,
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        Chi nhánh
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DonutChart
                          total={allBookings.length}
                          themeMode={themeMode}
                          segments={[
                            { value: bookingBranchCounts.dt, color: '#722ED1', label: 'Đ.Thám' },
                            { value: bookingBranchCounts.ep, color: '#13C2C2', label: 'Estella' },
                            { value: bookingBranchCounts.pxl, color: '#EB2F96', label: 'PXL' },
                          ]}
                        />
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}
                        >
                          <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#722ED1',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            DT: <strong>{bookingBranchCounts.dt}</strong>
                          </div>
                          <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#13C2C2',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            EP: <strong>{bookingBranchCounts.ep}</strong>
                          </div>
                          <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#EB2F96',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            PXL: <strong>{bookingBranchCounts.pxl}</strong>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* CHART 2 & 3 COMBINED: PHÂN TÍCH KHÁCH ĐẾN HÔM NAY */}
              <Col xs={24} sm={24} md={24} lg={24} xl={8}>
                <Card
                  size="small"
                  style={{
                    background: token.colorBgContainer,
                    borderColor: token.colorBorderSecondary,
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorTextSecondary }}>
                      <PieChartOutlined style={{ color: '#1890ff', marginRight: '6px' }} />
                      Khách Đến Hôm Nay
                    </span>
                    <strong
                      style={{ fontSize: '13px', color: token.colorText }}
                      title={`Tổng cộng: ${comingStats.totalCount} khách • ${comingStats.totalPrice.toLocaleString('vi-VN')} đ`}
                    >
                      {comingStats.totalCount} khách • {comingStats.totalPrice.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <Row gutter={16} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {/* Left Column: Cơ cấu khách đến */}
                    <Col
                      span={12}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                        paddingRight: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: token.colorTextDescription,
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        Nhóm khách
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DonutChart
                          total={comingStats.totalCount}
                          themeMode={themeMode}
                          segments={[
                            { value: comingStats.combo.count, color: '#D4A84B', label: 'Combo' },
                            { value: comingStats.oc.count, color: '#52C41A', label: 'Tele' },
                            { value: comingStats.other.count, color: '#1890FF', label: 'Khác' },
                          ]}
                        />
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}
                        >
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Combo: ${comingStats.combo.count} khách • ${comingStats.combo.price.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#D4A84B',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Combo: <strong>{comingStats.combo.count}</strong>{' '}
                            <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                              ({comingStats.combo.price.toLocaleString('vi-VN')} đ)
                            </span>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Telesales: ${comingStats.oc.count} khách • ${comingStats.oc.price.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#52C41A',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Tele: <strong>{comingStats.oc.count}</strong>{' '}
                            <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                              ({comingStats.oc.price.toLocaleString('vi-VN')} đ)
                            </span>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Khác: ${comingStats.other.count} khách • ${comingStats.other.price.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#1890FF',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Khác: <strong>{comingStats.other.count}</strong>{' '}
                            <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                              ({comingStats.other.price.toLocaleString('vi-VN')} đ)
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>

                    {/* Right Column: Chi nhánh khách đến */}
                    <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: token.colorTextDescription,
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        Chi nhánh
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DonutChart
                          total={comingBranchStats.totalCount}
                          themeMode={themeMode}
                          segments={[
                            { value: comingBranchStats.dt.count, color: '#722ED1', label: 'Đ.Thám' },
                            { value: comingBranchStats.ep.count, color: '#13C2C2', label: 'Estella' },
                            { value: comingBranchStats.pxl.count, color: '#EB2F96', label: 'PXL' },
                          ]}
                        />
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}
                        >
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Đề Thám: ${comingBranchStats.dt.count} khách • ${comingBranchStats.dt.price.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#722ED1',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            DT: <strong>{comingBranchStats.dt.count}</strong>{' '}
                            <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                              ({comingBranchStats.dt.price.toLocaleString('vi-VN')} đ)
                            </span>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Estella: ${comingBranchStats.ep.count} khách • ${comingBranchStats.ep.price.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#13C2C2',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            EP: <strong>{comingBranchStats.ep.count}</strong>{' '}
                            <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                              ({comingBranchStats.ep.price.toLocaleString('vi-VN')} đ)
                            </span>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Phan Xích Long: ${comingBranchStats.pxl.count} khách • ${comingBranchStats.pxl.price.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#EB2F96',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            PXL: <strong>{comingBranchStats.pxl.count}</strong>{' '}
                            <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                              ({comingBranchStats.pxl.price.toLocaleString('vi-VN')} đ)
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* CHART 4: REVENUE BY TYPE & BY CUSTOMER GROUP */}
              <Col xs={24} sm={24} md={24} lg={24} xl={8}>
                <Card
                  size="small"
                  style={{
                    background: token.colorBgContainer,
                    borderColor: token.colorBorderSecondary,
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorTextSecondary }}>
                      <BarChartOutlined style={{ color: '#D4A84B', marginRight: '6px' }} />
                      Doanh Thu Thực Tế
                    </span>
                    <strong
                      style={{ fontSize: '14px', color: token.colorText }}
                      title={`Tổng cộng: ${totalRevenueData.total.toLocaleString('vi-VN')} đ`}
                    >
                      {totalRevenueData.total.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <Row gutter={16} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {/* Left Column: Nhóm sản phẩm */}
                    <Col
                      span={12}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                        paddingRight: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: token.colorTextDescription,
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        Nhóm sản phẩm
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DonutChart
                          total={totalRevenueData.total}
                          centerLabel={formatCenterRevenue(totalRevenueData.total)}
                          centerSubLabel="doanh thu"
                          themeMode={themeMode}
                          segments={[
                            { value: totalRevenueData.revCombo, color: '#D4A84B', label: 'Combo' },
                            { value: totalRevenueData.revLe, color: '#1890FF', label: 'Lẻ' },
                            { value: totalRevenueData.revProduct, color: '#FA8C16', label: 'Sản phẩm' },
                          ]}
                        />
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}
                        >
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Combo: ${totalRevenueData.revCombo.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#D4A84B',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Combo: <strong>{totalRevenueData.revCombo.toLocaleString('vi-VN')} đ</strong>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Lẻ (Single): ${totalRevenueData.revLe.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#1890FF',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Lẻ: <strong>{totalRevenueData.revLe.toLocaleString('vi-VN')} đ</strong>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Sản phẩm: ${totalRevenueData.revProduct.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#FA8C16',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            SP: <strong>{totalRevenueData.revProduct.toLocaleString('vi-VN')} đ</strong>
                          </div>
                        </div>
                      </div>
                    </Col>

                    {/* Right Column: Nhóm khách */}
                    <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: token.colorTextDescription,
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        Nhóm khách
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DonutChart
                          total={categoryRevenueData.total}
                          centerLabel={formatCenterRevenue(categoryRevenueData.total)}
                          centerSubLabel="doanh thu"
                          themeMode={themeMode}
                          segments={[
                            { value: categoryRevenueData.revCombo, color: '#D4A84B', label: 'Combo' },
                            { value: categoryRevenueData.revTele, color: '#52C41A', label: 'Tele' },
                            { value: categoryRevenueData.revOther, color: '#1890FF', label: 'Khác' },
                          ]}
                        />
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}
                        >
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Combo: ${categoryRevenueData.revCombo.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#D4A84B',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Combo: <strong>{categoryRevenueData.revCombo.toLocaleString('vi-VN')} đ</strong>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Tele: ${categoryRevenueData.revTele.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#52C41A',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Tele: <strong>{categoryRevenueData.revTele.toLocaleString('vi-VN')} đ</strong>
                          </div>
                          <div
                            style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                            title={`Khác: ${categoryRevenueData.revOther.toLocaleString('vi-VN')} đ`}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                backgroundColor: '#1890FF',
                                borderRadius: '50%',
                                marginRight: '4px',
                              }}
                            />
                            Khác: <strong>{categoryRevenueData.revOther.toLocaleString('vi-VN')} đ</strong>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* SECTION 1: BOOKING - CREATED TODAY */}
          <Col span={24}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontWeight: 'bold' }}>Booking Tạo Hôm Nay (Created Today)</span>
                  <Tooltip title="Cấu hình hiển thị cột">
                    <Button
                      type="text"
                      size="small"
                      icon={<SettingOutlined style={{ color: token.colorTextDescription }} />}
                      onClick={openBookingConfig}
                    />
                  </Tooltip>
                </Space>
              }
              extra={
                <Space size="middle">
                  <Radio.Group
                    size="small"
                    value={bookingFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingFilter(val as any);
                      localStorage.setItem('today_booking_filter', val);
                    }}
                  >
                    <Radio.Button value="all">ALL ({allBookings.length})</Radio.Button>
                    <Radio.Button value="combo">Combo ({bookingsCombo.length})</Radio.Button>
                    <Radio.Button value="oc">Telesales ({bookingsOc.length})</Radio.Button>
                    <Radio.Button value="other">Khác ({bookingsOther.length})</Radio.Button>
                  </Radio.Group>
                  <Radio.Group
                    size="small"
                    value={bookingBranch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingBranch(val as any);
                      localStorage.setItem('today_booking_branch', val);
                    }}
                  >
                    <Radio.Button value="all">ALL ({bookingBranchCounts.total})</Radio.Button>
                    <Radio.Button value="detham">DT ({bookingBranchCounts.dt})</Radio.Button>
                    <Radio.Button value="pxl">PXL ({bookingBranchCounts.pxl})</Radio.Button>
                    <Radio.Button value="estella">EP ({bookingBranchCounts.ep})</Radio.Button>
                  </Radio.Group>
                </Space>
              }
              style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            >
              <Table
                dataSource={filteredBookings}
                columns={bookingConfigColumns}
                loading={bookingConfigLoading}
                components={{
                  header: {
                    cell: ResizableHeaderCell,
                  },
                }}
                size="small"
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                className="antd-custom-table"
                rowClassName={(record) => {
                  if (record.status === 'completed') return 'coming-row-completed';
                  if (record.status === 'serving' || record.status === 'arrived') return 'coming-row-serving';
                  if (record.status === 'late') return 'coming-row-late';
                  return '';
                }}
              />
            </Card>
          </Col>

          <Col span={24}>
            <Card
              title={
                <Space>
                  <TeamOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 'bold' }}>Lịch Khách Đến Hôm Nay (Coming Today)</span>
                  <Tooltip title="Cấu hình hiển thị cột">
                    <Button
                      type="text"
                      size="small"
                      icon={<SettingOutlined style={{ color: token.colorTextDescription }} />}
                      onClick={openComingConfig}
                    />
                  </Tooltip>
                </Space>
              }
              extra={
                <Space size="middle">
                  <Radio.Group
                    size="small"
                    value={comingCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setComingCategory(val as any);
                      localStorage.setItem('today_coming_category', val);
                    }}
                  >
                    <Radio.Button value="all">ALL ({comingStats.totalCount})</Radio.Button>
                    <Radio.Button value="combo">Combo ({comingStats.combo.count})</Radio.Button>
                    <Radio.Button value="oc">Telesales ({comingStats.oc.count})</Radio.Button>
                    <Radio.Button value="other">Khác ({comingStats.other.count})</Radio.Button>
                  </Radio.Group>
                  <Radio.Group
                    size="small"
                    value={comingBranch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setComingBranch(val as any);
                      localStorage.setItem('today_coming_branch', val);
                    }}
                  >
                    <Radio.Button value="all">ALL ({comingBranchStats.totalCount})</Radio.Button>
                    <Radio.Button value="detham">DT ({comingBranchStats.dt.count})</Radio.Button>
                    <Radio.Button value="pxl">PXL ({comingBranchStats.pxl.count})</Radio.Button>
                    <Radio.Button value="estella">EP ({comingBranchStats.ep.count})</Radio.Button>
                  </Radio.Group>
                </Space>
              }
              style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            >
              <Table
                dataSource={activeComingList}
                columns={comingConfigColumns}
                loading={comingConfigLoading}
                components={{
                  header: {
                    cell: ResizableHeaderCell,
                  },
                }}
                size="small"
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                className="antd-custom-table"
                rowClassName={(record) => {
                  if (record.status === 'completed') return 'coming-row-completed';
                  if (record.status === 'serving' || record.status === 'arrived') return 'coming-row-serving';
                  if (record.status === 'late') return 'coming-row-late';
                  return '';
                }}
              />
            </Card>
          </Col>

          {/* SECTION 3: SHOP CONTROL */}
          <Col span={24}>
            <Card
              title={
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <Space>
                    <ShopOutlined style={{ color: '#D4A84B' }} />
                    <span style={{ fontWeight: 'bold' }}>Vận Hành Chi Nhánh (Shop Control Center)</span>
                  </Space>

                  <Space size="middle" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: token.colorTextSecondary }}>Bao gồm thuế (VAT 8%)</span>
                      <Switch
                        checked={showTax}
                        onChange={(checked) => {
                          setShowTax(checked);
                          localStorage.setItem('today_show_tax', String(checked));
                        }}
                        checkedChildren="Bật"
                        unCheckedChildren="Tắt"
                      />
                    </div>

                    <Radio.Group
                      value={shopBranch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShopBranch(val);
                        localStorage.setItem('today_shop_branch', val);
                      }}
                      buttonStyle="solid"
                    >
                      <Radio.Button value="all">ALL</Radio.Button>
                      <Radio.Button value="detham">Đề Thám (DT)</Radio.Button>
                      <Radio.Button value="pxl">Phan Xích Long (PXL)</Radio.Button>
                      <Radio.Button value="estella">Estella Place (EP)</Radio.Button>
                    </Radio.Group>
                  </Space>
                </div>
              }
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Doanh thu breakdown cards */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      color: token.colorTextDescription,
                      letterSpacing: '0.5px',
                      marginBottom: '12px',
                    }}
                  >
                    Phân Phối Doanh Thu Hôm Nay (Revenue Breakdown)
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                      <Card
                        size="small"
                        style={{
                          background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        <span style={{ fontSize: '11px', color: token.colorTextDescription }}>
                          Doanh Thu Dịch Vụ Lẻ
                        </span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}>
                          {activeShopData.revLe.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Card
                        size="small"
                        style={{
                          background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#D4A84B' }}>Doanh Thu Combo (Gói)</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#D4A84B', marginTop: '4px' }}>
                          {activeShopData.revCombo.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Card
                        size="small"
                        style={{
                          background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#52c41a' }}>Doanh Thu Sản Phẩm</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>
                          {activeShopData.revProduct.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Card
                        size="small"
                        style={{
                          background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 'bold' }}>Tổng Doanh Thu</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', marginTop: '4px' }}>
                          {(activeShopData.revLe + activeShopData.revCombo + activeShopData.revProduct).toLocaleString(
                            'vi-VN'
                          )}{' '}
                          đ
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </div>

                {/* CC & CV Table split */}
                <Row gutter={[24, 24]}>
                  {/* CV list */}
                  <Col xs={24} xl={12}>
                    <Card
                      title={
                        <Space>
                          <UserOutlined style={{ color: '#D4A84B' }} />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            [CV] Chuyên viên đang làm gì? Bao nhiêu khách?
                          </span>
                        </Space>
                      }
                      styles={{ body: { padding: 0 } }}
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <Table
                        dataSource={activeShopData.cv}
                        rowKey="name"
                        rowClassName={(record) =>
                          record.shift === 'off' || record.attendance === 'checked_out'
                            ? 'opacity-40 pointer-events-none'
                            : ''
                        }
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        columns={[
                          {
                            title: 'Ca',
                            key: 'shift_attendance',
                            render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance),
                          },
                          {
                            title: 'Tên CV',
                            dataIndex: 'name',
                            key: 'name',
                            render: (t) => <strong>{t}</strong>,
                          },
                          {
                            title: 'Chi nhánh',
                            dataIndex: 'branchName',
                            key: 'branchName',
                            render: (b: string) => (
                              <Tag color="cyan" style={{ fontWeight: 'bold' }}>
                                {b}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Đang làm gì?',
                            dataIndex: 'doing',
                            key: 'doing',
                            render: (doing, rec) => (
                              <Badge status={rec.status === 'busy' ? 'warning' : 'success'} text={doing} />
                            ),
                          },
                          {
                            title: 'Khách hôm nay',
                            dataIndex: 'clients',
                            key: 'clients',
                            align: 'center',
                            render: (n) => <strong style={{ fontSize: '13px' }}>{n} khách</strong>,
                          },
                        ]}
                        className="antd-custom-table"
                      />
                    </Card>
                  </Col>

                  {/* CC list */}
                  <Col xs={24} xl={12}>
                    <Card
                      title={
                        <Space>
                          <TeamOutlined style={{ color: '#D4A84B' }} />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            [CC] Client Consultant đang làm gì? Bao nhiêu khách?
                          </span>
                        </Space>
                      }
                      styles={{ body: { padding: 0 } }}
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <Table
                        dataSource={activeShopData.cc}
                        rowKey="name"
                        rowClassName={(record) =>
                          record.shift === 'off' || record.attendance === 'checked_out'
                            ? 'opacity-40 pointer-events-none'
                            : ''
                        }
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        columns={[
                          {
                            title: 'Ca',
                            key: 'shift_attendance',
                            render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance),
                          },
                          {
                            title: 'Tên CC',
                            dataIndex: 'name',
                            key: 'name',
                            render: (t) => <strong>{t}</strong>,
                          },
                          {
                            title: 'Chi nhánh',
                            dataIndex: 'branchName',
                            key: 'branchName',
                            render: (b: string) => (
                              <Tag color="cyan" style={{ fontWeight: 'bold' }}>
                                {b}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Đang làm gì?',
                            dataIndex: 'doing',
                            key: 'doing',
                            render: (doing) => <Text type="secondary">{doing}</Text>,
                          },
                          {
                            title: 'Khách hôm nay',
                            dataIndex: 'clients',
                            key: 'clients',
                            align: 'center',
                            render: (n) => <strong>{n} khách</strong>,
                          },
                          {
                            title: 'Combo bán được',
                            dataIndex: 'combos',
                            key: 'combos',
                            align: 'center',
                            render: (n) => <Tag color="success">{n} Combo</Tag>,
                          },
                          {
                            title: '$ Combo',
                            dataIndex: 'revCombo',
                            key: 'revCombo',
                            align: 'right',
                            render: (r: number) => (
                              <span style={{ color: '#D4A84B' }}>{(r || 0).toLocaleString('vi-VN')} đ</span>
                            ),
                          },
                          {
                            title: '$ Single',
                            dataIndex: 'revLe',
                            key: 'revLe',
                            align: 'right',
                            render: (r: number) => (
                              <span style={{ color: token.colorTextDescription }}>
                                {(r || 0).toLocaleString('vi-VN')} đ
                              </span>
                            ),
                          },
                          {
                            title: '$ Product',
                            dataIndex: 'revProduct',
                            key: 'revProduct',
                            align: 'right',
                            render: (r: number) => (
                              <span style={{ color: '#52c41a' }}>{(r || 0).toLocaleString('vi-VN')} đ</span>
                            ),
                          },
                          {
                            title: 'Doanh số ngày',
                            dataIndex: 'revenue',
                            key: 'revenue',
                            align: 'right',
                            render: (r: number) => (
                              <strong style={{ color: '#1890ff' }}>{(r || 0).toLocaleString('vi-VN')} đ</strong>
                            ),
                          },
                        ]}
                        className="antd-custom-table"
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        open={drawerVisible}
        customerId={selectedCustomer?.customerId || null}
        onClose={() => setDrawerVisible(false)}
      />

      {/* Table Header Config Drawers */}
      <TableConfigDrawer
        visible={bookingConfigVisible}
        onClose={closeBookingConfig}
        title="Cấu hình cột Booking Tạo Hôm Nay"
        columns={bookingRawConfig}
        onSave={saveBookingConfig}
        onReset={resetBookingConfig}
      />

      <TableConfigDrawer
        visible={comingConfigVisible}
        onClose={closeComingConfig}
        title="Cấu hình cột Khách Đến Hôm Nay"
        columns={comingRawConfig}
        onSave={saveComingConfig}
        onReset={resetComingConfig}
      />
    </div>
  );
}
