'use client';

import '../../suppress-warnings';
import React, { useState, useEffect, useCallback } from 'react';
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
  Switch
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
  CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';

const { Title, Text } = Typography;

// --- Interfaces for Data ---

interface BookingData {
  key: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
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
}

interface ComingClientData {
  key: string;
  time: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  cc: string;
  cv: string;
  service: string;
  status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
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

export default function TodayDashboard() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [liveClock, setLiveClock] = useState('');
  
  // Tabs states
  const [bookingTab, setBookingTab] = useState<'combo' | 'oc' | 'other'>('combo');
  const [comingBranch, setComingBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');
  const [shopBranch, setShopBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');

  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<BookingData | null>(null);
  const [showTax, setShowTax] = useState(true);

  // Load persisted states on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistedShowTax = localStorage.getItem('today_show_tax');
      if (persistedShowTax !== null) {
        setShowTax(persistedShowTax === 'true');
      }
      const persistedBookingTab = localStorage.getItem('today_booking_tab');
      if (persistedBookingTab !== null) {
        setBookingTab(persistedBookingTab as any);
      }
      const persistedComingBranch = localStorage.getItem('today_coming_branch');
      if (persistedComingBranch !== null) {
        setComingBranch(persistedComingBranch as any);
      }
      const persistedShopBranch = localStorage.getItem('today_shop_branch');
      if (persistedShopBranch !== null) {
        setShopBranch(persistedShopBranch as any);
      }
    }
  }, []);

  // Save states to localStorage when they change
  useEffect(() => {
    localStorage.setItem('today_show_tax', String(showTax));
  }, [showTax]);

  useEffect(() => {
    localStorage.setItem('today_booking_tab', bookingTab);
  }, [bookingTab]);

  useEffect(() => {
    localStorage.setItem('today_coming_branch', comingBranch);
  }, [comingBranch]);

  useEffect(() => {
    localStorage.setItem('today_shop_branch', shopBranch);
  }, [shopBranch]);

  const openCustomerDrawer = (record: BookingData) => {
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
      coming: []
    },
    pxl: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      cc: [],
      cv: [],
      coming: []
    },
    estella: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      cc: [],
      cv: [],
      coming: []
    }
  });

  const [bookingsCombo, setBookingsCombo] = useState<BookingData[]>([]);
  const [bookingsOc, setBookingsOc] = useState<BookingData[]>([]);
  const [bookingsOther, setBookingsOther] = useState<BookingData[]>([]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = dayjs();
      setLiveClock(now.format('HH:mm:ss - DD/MM/YYYY'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = useCallback(async (date: dayjs.Dayjs) => {
    setLoading(true);
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const response = await api.get('/dashboard/today', {
        params: { date: dateStr }
      });
      const data = response.data;
      setBranchesData(data.branchesData);
      setBookingsCombo(data.bookingsCombo);
      setBookingsOc(data.bookingsOc || []);
      setBookingsOther(data.bookingsOther);
    } catch (err) {
      console.error('Fetch dashboard today error:', err);
      message.error('Lỗi khi tải dữ liệu vận hành thực tế!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate, fetchDashboardData]);

  const handleRefresh = async () => {
    await fetchDashboardData(selectedDate);
    message.success('Đã làm mới dữ liệu vận hành từ cơ sở dữ liệu!');
  };

  const getBranchLabel = (key: string) => {
    if (key === 'detham') return 'Đề Thám';
    if (key === 'pxl') return 'PXL';
    if (key === 'estella') return 'Estella';
    return '';
  };

  const activeComingList = React.useMemo(() => {
    const list = comingBranch === 'all'
      ? Object.keys(branchesData).flatMap(branchKey => 
          branchesData[branchKey].coming.map(item => ({
            ...item,
            branchName: getBranchLabel(branchKey)
          }))
        )
      : branchesData[comingBranch].coming.map(item => ({
          ...item,
          branchName: getBranchLabel(comingBranch)
        }));
    return [...list].sort((a, b) => a.time.localeCompare(b.time));
  }, [branchesData, comingBranch]);

  const activeShopData = React.useMemo(() => {
    const raw = shopBranch === 'all'
      ? {
          revLe: Object.values(branchesData).reduce((sum, b) => sum + (b.revLe || 0), 0),
          revCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.revCombo || 0), 0),
          revProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.revProduct || 0), 0),
          netLe: Object.values(branchesData).reduce((sum, b) => sum + (b.netLe || 0), 0),
          netCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.netCombo || 0), 0),
          netProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.netProduct || 0), 0),
          cc: Object.entries(branchesData).flatMap(([branchKey, b]) => 
            b.cc.map(item => ({ ...item, branchName: getBranchLabel(branchKey) }))
          ),
          cv: Object.entries(branchesData).flatMap(([branchKey, b]) => 
            b.cv.map(item => ({ ...item, branchName: getBranchLabel(branchKey) }))
          ),
          coming: [] as any[]
        }
      : {
          ...branchesData[shopBranch],
          cc: (branchesData[shopBranch]?.cc || []).map(item => ({ ...item, branchName: getBranchLabel(shopBranch) })),
          cv: (branchesData[shopBranch]?.cv || []).map(item => ({ ...item, branchName: getBranchLabel(shopBranch) }))
        };

    return {
      revLe: showTax ? (raw.revLe || 0) : (raw.netLe || 0),
      revCombo: showTax ? (raw.revCombo || 0) : (raw.netCombo || 0),
      revProduct: showTax ? (raw.revProduct || 0) : (raw.netProduct || 0),
      cc: (raw.cc || []).map((c: any) => ({
        ...c,
        revLe: showTax ? (c.revLe || 0) : (c.netLe || 0),
        revCombo: showTax ? (c.revCombo || 0) : (c.netCombo || 0),
        revProduct: showTax ? (c.revProduct || 0) : (c.netProduct || 0),
        revenue: showTax ? (c.revenue || 0) : (c.netRevenue || 0)
      })),
      cv: raw.cv || [],
      coming: raw.coming || []
    };
  }, [branchesData, shopBranch, showTax]);

  const bookingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>
    },
    {
      title: 'Created At',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: BookingData) => (
        <Space size="middle">
          <Avatar 
            src={record.avatar || undefined}
            style={{ 
              backgroundColor: record.avatarColor || '#D4A84B', 
              color: '#fff', 
              fontSize: '11px',
              fontWeight: 'bold' 
            }} 
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong>{record.customer}</strong>
        </Space>
      )
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b || 'Đề Thám'}</Tag>
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live') return <Tag color="gold" style={{ fontWeight: 'bold' }}>combo live</Tag>;
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      }
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) => p ? <Tag color="pink" style={{ fontSize: '10px' }}>{p}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: 'Ngày & Giờ đặt lịch',
      dataIndex: 'bookingDateTime',
      key: 'bookingDateTime',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>
    },
    {
      title: 'Requested CV',
      dataIndex: 'requestedCv',
      key: 'requestedCv',
      render: (cv: string) => <Tag color={cv === 'Chưa phân công' ? 'default' : 'blue'}>{cv}</Tag>
    },
    {
      title: 'Booking Notes',
      dataIndex: 'bookingNote',
      key: 'bookingNote',
      render: (note: string) => (
        <div style={{ 
          maxWidth: '200px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }} title={note}>
          {note || <Text type="secondary">-</Text>}
        </div>
      )
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
      )
    }
  ];

  const comingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>
    },
    {
      title: 'Giờ Hẹn',
      dataIndex: 'time',
      key: 'time',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b}</Tag>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: ComingClientData) => (
        <Space size="middle">
          <Avatar 
            src={record.avatar || undefined}
            style={{ 
              backgroundColor: record.avatarColor || '#D4A84B', 
              color: '#fff', 
              fontSize: '11px',
              fontWeight: 'bold' 
            }} 
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong>{record.customer}</strong>
        </Space>
      )
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live') return <Tag color="gold" style={{ fontWeight: 'bold' }}>combo live</Tag>;
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      }
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) => p ? <Tag color="pink" style={{ fontSize: '10px' }}>{p}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>
    },
    {
      title: 'CC',
      dataIndex: 'cc',
      key: 'cc',
      render: (cc: string) => <strong style={{ color: '#1890ff' }}>{cc}</strong>
    },
    {
      title: 'CV',
      dataIndex: 'cv',
      key: 'cv',
      render: (cv: string) => <Tag color={cv === 'Chưa phân công' ? 'default' : (cv === 'Nghỉ phép' ? 'red' : 'blue')}>{cv}</Tag>
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: any) => renderComingStatus(status)
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
      )
    }
  ];

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

  const renderShiftAndAttendance = (shift: 'sáng' | 'chiều' | 'full' | 'off', attendance: 'none' | 'checked_in' | 'checked_out' | 'late') => {
    if (shift === 'off') {
      return (
        <Tooltip title="Nghỉ phép tuần">
          <Space size={6} style={{ cursor: 'help' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: '#bfbfbf', 
              verticalAlign: 'middle'
            }} />
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
          <span style={{ 
            display: 'inline-block', 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: dotColor, 
            verticalAlign: 'middle'
          }} />
          <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>{shiftText}</span>
        </Space>
      </Tooltip>
    );
  };

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
          background: themeMode === 'dark' ? '#141414' : '#fffbe6',
          borderRadius: '12px',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#ffd666'}`
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: themeMode === 'dark' ? '#D4A84B' : '#873800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockCircleOutlined /> Control Board Hôm Nay (Today operations)
          </Title>
          <Text style={{ fontSize: '13px', color: themeMode === 'dark' ? '#a6a6a6' : '#595959' }}>
            Giám sát thời gian thực lịch đặt mới, luồng khách đến và trạng thái phục vụ của CC & CV.
          </Text>
        </div>
        
        <Space size="middle">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: token.colorTextDescription }}>Thời gian thực tế</div>
            <strong style={{ color: '#D4A84B', fontSize: '14px' }}>{liveClock}</strong>
          </div>
          <Divider type="vertical" style={{ height: '32px', borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9' }} />
          <DatePicker 
            value={selectedDate} 
            onChange={(date) => date && setSelectedDate(date)} 
            format="DD/MM/YYYY" 
            allowClear={false}
            style={{ width: '140px' }}
          />
          <Button 
            type="primary" 
            icon={<SyncOutlined spin={loading} />} 
            onClick={handleRefresh}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000000', fontWeight: 'bold' }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          
          {/* SECTION 1: BOOKING - CREATED TODAY */}
          <Col span={24}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontWeight: 'bold' }}>Booking Tạo Hôm Nay (Created Today)</span>
                </Space>
              }
              extra={
                <Badge 
                  count={bookingsCombo.length + bookingsOther.length + bookingsOc.length} 
                  style={{ backgroundColor: '#52c41a' }}
                />
              }
              style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            >
              <Tabs 
                activeKey={bookingTab} 
                onChange={(k: any) => setBookingTab(k)}
                items={[
                  {
                    key: 'combo',
                    label: `Combo (${bookingsCombo.length})`,
                    children: (
                      <Table
                        dataSource={bookingsCombo}
                        columns={bookingColumns}
                        size="small"
                        pagination={false}
                        bordered
                        className="antd-custom-table"
                      />
                    )
                  },
                  {
                    key: 'oc',
                    label: `Telesales Executive (${bookingsOc.length})`,
                    children: (
                      <Table
                        dataSource={bookingsOc}
                        columns={bookingColumns}
                        size="small"
                        pagination={false}
                        bordered
                        className="antd-custom-table"
                      />
                    )
                  },
                  {
                    key: 'other',
                    label: `Khác (${bookingsOther.length})`,
                    children: (
                      <Table
                        dataSource={bookingsOther}
                        columns={bookingColumns}
                        size="small"
                        pagination={false}
                        bordered
                        className="antd-custom-table"
                      />
                    )
                  }
                ]}
              />
            </Card>
          </Col>

          <Col span={24}>
            <Card
              title={
                <Space>
                  <TeamOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 'bold' }}>Lịch Khách Đến Hôm Nay (Coming Today)</span>
                </Space>
              }
              extra={
                <Radio.Group 
                  size="small" 
                  value={comingBranch} 
                  onChange={(e) => setComingBranch(e.target.value)}
                >
                  <Radio.Button value="all">ALL</Radio.Button>
                  <Radio.Button value="detham">Đề Thám (DT)</Radio.Button>
                  <Radio.Button value="pxl">PXL</Radio.Button>
                  <Radio.Button value="estella">Estella (EP)</Radio.Button>
                </Radio.Group>
              }
              style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            >
              <Table
                dataSource={activeComingList}
                columns={comingColumns}
                size="small"
                pagination={false}
                bordered
                className="antd-custom-table"
                rowClassName={(record) => {
                  if (record.status === 'completed') return 'coming-row-completed';
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <Space>
                    <ShopOutlined style={{ color: '#D4A84B' }} />
                    <span style={{ fontWeight: 'bold' }}>Vận Hành Chi Nhánh (Shop Control Center)</span>
                  </Space>
                  
                  <Space size="middle" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: token.colorTextSecondary }}>Bao gồm thuế (VAT 8%)</span>
                      <Switch 
                        checked={showTax} 
                        onChange={(checked) => setShowTax(checked)} 
                        checkedChildren="Bật"
                        unCheckedChildren="Tắt"
                      />
                    </div>
                    
                    <Radio.Group 
                      value={shopBranch} 
                      onChange={(e) => setShopBranch(e.target.value)}
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
                  <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: token.colorTextDescription, letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Phân Phối Doanh Thu Hôm Nay (Revenue Breakdown)
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: token.colorTextDescription }}>Doanh Thu Dịch Vụ Lẻ</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}>
                          {activeShopData.revLe.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>
                    
                    <Col xs={24} sm={12} md={6}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: '#D4A84B' }}>Doanh Thu Combo (Gói)</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#D4A84B', marginTop: '4px' }}>
                          {activeShopData.revCombo.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: '#52c41a' }}>Doanh Thu Sản Phẩm</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>
                          {activeShopData.revProduct.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 'bold' }}>Tổng Doanh Thu</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', marginTop: '4px' }}>
                          {(activeShopData.revLe + activeShopData.revCombo + activeShopData.revProduct).toLocaleString('vi-VN')} đ
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
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>[CV] Chuyên viên đang làm gì? Bao nhiêu khách?</span>
                        </Space>
                      }
                      styles={{ body: { padding: 0 } }}
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <Table
                        dataSource={activeShopData.cv}
                        rowKey="name"
                        rowClassName={(record) => record.shift === 'off' ? 'opacity-40 pointer-events-none' : ''}
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Ca',
                            key: 'shift_attendance',
                            render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance)
                          },
                          {
                            title: 'Tên CV',
                            dataIndex: 'name',
                            key: 'name',
                            render: (t) => <strong>{t}</strong>
                          },
                          {
                            title: 'Chi nhánh',
                            dataIndex: 'branchName',
                            key: 'branchName',
                            render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b}</Tag>
                          },
                          {
                            title: 'Đang làm gì?',
                            dataIndex: 'doing',
                            key: 'doing',
                            render: (doing, rec) => (
                              <Badge 
                                status={rec.status === 'busy' ? 'warning' : 'success'} 
                                text={doing}
                              />
                            )
                          },
                          {
                            title: 'Khách hôm nay',
                            dataIndex: 'clients',
                            key: 'clients',
                            align: 'center',
                            render: (n) => <strong style={{ fontSize: '13px' }}>{n} khách</strong>
                          }
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
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>[CC] Client Consultant đang làm gì? Bao nhiêu khách?</span>
                        </Space>
                      }
                      styles={{ body: { padding: 0 } }}
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <Table
                        dataSource={activeShopData.cc}
                        rowKey="name"
                        rowClassName={(record) => record.shift === 'off' ? 'opacity-40 pointer-events-none' : ''}
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Ca',
                            key: 'shift_attendance',
                            render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance)
                          },
                          {
                            title: 'Tên CC',
                            dataIndex: 'name',
                            key: 'name',
                            render: (t) => <strong>{t}</strong>
                          },
                          {
                            title: 'Chi nhánh',
                            dataIndex: 'branchName',
                            key: 'branchName',
                            render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b}</Tag>
                          },
                          {
                            title: 'Đang làm gì?',
                            dataIndex: 'doing',
                            key: 'doing',
                            render: (doing) => <Text type="secondary">{doing}</Text>
                          },
                          {
                            title: 'Khách hôm nay',
                            dataIndex: 'clients',
                            key: 'clients',
                            align: 'center',
                            render: (n) => <strong>{n} khách</strong>
                          },
                          {
                            title: 'Combo bán được',
                            dataIndex: 'combos',
                            key: 'combos',
                            align: 'center',
                            render: (n) => <Tag color="success">{n} Combo</Tag>
                          },
                          {
                            title: '$ Combo',
                            dataIndex: 'revCombo',
                            key: 'revCombo',
                            align: 'right',
                            render: (r: number) => <span style={{ color: '#D4A84B' }}>{(r || 0).toLocaleString('vi-VN')} đ</span>
                          },
                          {
                            title: '$ Single',
                            dataIndex: 'revLe',
                            key: 'revLe',
                            align: 'right',
                            render: (r: number) => <span style={{ color: token.colorTextDescription }}>{(r || 0).toLocaleString('vi-VN')} đ</span>
                          },
                          {
                            title: '$ Product',
                            dataIndex: 'revProduct',
                            key: 'revProduct',
                            align: 'right',
                            render: (r: number) => <span style={{ color: '#52c41a' }}>{(r || 0).toLocaleString('vi-VN')} đ</span>
                          },
                          {
                            title: 'Doanh số ngày',
                            dataIndex: 'revenue',
                            key: 'revenue',
                            align: 'right',
                            render: (r: number) => <strong style={{ color: '#1890ff' }}>{(r || 0).toLocaleString('vi-VN')} đ</strong>
                          }
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
      <Drawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={960}
        closable={false}
        styles={{
          body: {
            padding: 0,
            background: themeMode === 'dark' ? '#141414' : '#f5f5f5',
            color: themeMode === 'dark' ? '#fff' : '#000'
          }
        }}
      >
        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
            }}>
              <Space size="middle">
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => setDrawerVisible(false)} 
                  style={{ color: themeMode === 'dark' ? '#fff' : '#595959' }}
                />
                <Avatar 
                  size={48} 
                  style={{ 
                    backgroundColor: selectedCustomer.avatarColor || '#D4A84B', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: '#fff'
                  }}
                >
                  {selectedCustomer.customer.split(' ').pop()?.substring(0, 2).toUpperCase()}
                </Avatar>
                <div>
                  <Space size="small" style={{ alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                      {selectedCustomer.customer}
                    </h3>
                    <Rate disabled defaultValue={4} style={{ fontSize: '12px', color: '#fadb14' }} />
                  </Space>
                  <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#a6a6a6' : '#595959', marginTop: '4px' }}>
                    <Text type="secondary">
                      📞 {selectedCustomer.phone} &nbsp;|&nbsp; 
                      <strong>Mã KH:</strong> {selectedCustomer.code || '52380'} &nbsp;|&nbsp; 
                      <strong>Email:</strong> {selectedCustomer.email || 'user52380@orb.local'}
                    </Text>
                  </div>
                </div>
              </Space>
              
              <Button 
                type="primary" 
                style={{ 
                  backgroundColor: '#D4A84B', 
                  borderColor: '#D4A84B', 
                  color: '#000', 
                  fontWeight: 'bold',
                  borderRadius: '6px'
                }}
              >
                Đặt Lịch Hẹn
              </Button>
            </div>

            {/* Drawer Body */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '24px', 
              display: 'grid', 
              gridTemplateColumns: '1fr 2fr', 
              gap: '24px' 
            }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* CHỈ SỐ TÍCH LUỸ */}
                <Card 
                  title="📈 CHỈ SỐ TÍCH LUỸ" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' 
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>LTV (Doanh thu)</div>
                      <strong style={{ fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                        {selectedCustomer.ltv || '0 đ'}
                      </strong>
                    </div>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Tổng đặt lịch</div>
                      <strong style={{ fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                        {selectedCustomer.bookingsCount || 1}
                      </strong>
                    </div>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Kim cương còn lại</div>
                      <strong style={{ fontSize: '14px', color: '#1890ff' }}>
                        💎 {selectedCustomer.diamonds || 50}
                      </strong>
                    </div>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Tần suất (Avg)</div>
                      <strong style={{ fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                        {selectedCustomer.frequency || 'N/A'}
                      </strong>
                    </div>
                  </div>
                </Card>

                {/* THÔNG TIN CÁ NHÂN */}
                <Card 
                  title="👤 THÔNG TIN CÁ NHÂN" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Giới tính:</Text>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>{selectedCustomer.gender || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Ngày sinh:</Text>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>{selectedCustomer.dob || '2026-04-11'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Nhóm phân loại:</Text>
                      <Tag color={selectedCustomer.group === 'combo_live' ? 'gold' : selectedCustomer.group === 'combo_dead' ? 'error' : 'blue'}>
                        {selectedCustomer.group === 'combo_live' ? 'COMBO LIVE' : selectedCustomer.group === 'combo_dead' ? 'COMBO DEAD' : 'SINGLE'}
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Số ngày chưa quay lại:</Text>
                      <strong style={{ color: '#ff4d4f' }}>{selectedCustomer.daysAway || '2 ngày'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Thứ hay đi nhất:</Text>
                      <strong style={{ color: '#fa8c16' }}>{selectedCustomer.favoriteDay || 'Thứ Sáu (1 lần)'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Phụ trách (OC):</Text>
                      <strong style={{ color: '#1890ff' }}>{selectedCustomer.oc || 'Danny Wings'}</strong>
                    </div>
                  </div>
                </Card>

                {/* GÓI DỊCH VỤ ĐANG CHẠY */}
                <Card 
                  title="GÓI DỊCH VỤ ĐANG CHẠY" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
                  }}
                >
                  <p style={{ textAlign: 'center', color: '#bfbfbf', margin: 0, fontSize: '12px' }}>
                    Không có gói combo nào đang chạy.
                  </p>
                </Card>

                {/* GIỚI THIỆU KHÁCH HÀNG */}
                <Card 
                  title="GIỚI THIỆU KHÁCH HÀNG" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>ĐƯỢC GIỚI THIỆU BỞI</div>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>Tự đăng ký (Không có người giới thiệu)</strong>
                    </div>
                    <Divider style={{ margin: '8px 0', borderColor: themeMode === 'dark' ? '#303030' : '#f0f0f0' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>DANH SÁCH ĐÃ GIỚI THIỆU (0)</div>
                      <span style={{ color: '#bfbfbf' }}>Chưa giới thiệu khách hàng nào.</span>
                    </div>
                  </div>
                </Card>

              </div>

              {/* Right Column */}
              <div style={{ 
                background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff', 
                padding: '24px', 
                borderRadius: '8px', 
                border: `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                {/* Tabs inside drawer */}
                <Tabs 
                  defaultActiveKey="1"
                  items={[
                    {
                      key: '1',
                      label: `Lịch sử đặt lịch (1)`,
                      children: (
                        <div style={{ paddingTop: '16px', display: 'flex', gap: '16px' }}>
                          {/* Timeline node */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              border: '2px solid #52c41a', 
                              background: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#52c41a' }} />
                            </div>
                            <div style={{ width: '2px', flexGrow: 1, background: themeMode === 'dark' ? '#303030' : '#f0f0f0', marginTop: '4px' }} />
                          </div>

                          {/* Timeline content */}
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                                  {selectedCustomer.historyService || 'New Flawless Mink 1110'}
                                </h4>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                  CN: <strong>{selectedCustomer.historyBranch || 'Estella Place'}</strong> &nbsp;|&nbsp; 
                                  CV: <strong>{selectedCustomer.historyCv || 'Cẩm Tiên'}</strong>
                                </div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                                  CC IN: <strong>{selectedCustomer.historyCcIn || 'Yến Vy'}</strong> &nbsp;|&nbsp; 
                                  CC OUT: <strong>{selectedCustomer.historyCcOut || 'Yến Vy'}</strong> &nbsp;|&nbsp; 
                                  BK: <strong>{selectedCustomer.historyBooker || 'Bích Phượng'}</strong>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <Text style={{ fontSize: '12px' }}>{selectedCustomer.historyDate || 'T6, 21:45:00 10/7/2026'}</Text>
                                <div style={{ marginTop: '4px' }}>
                                  <Tag color="success">{selectedCustomer.historyStatus || 'Hoàn thành'}</Tag>
                                </div>
                              </div>
                            </div>

                            {/* Note block */}
                            <div style={{ 
                              background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                              padding: '16px', 
                              borderRadius: '8px', 
                              borderLeft: '4px solid #D4A84B',
                              fontSize: '12px',
                              fontStyle: 'italic',
                              lineHeight: '1.6',
                              color: themeMode === 'dark' ? '#d9d9d9' : '#595959'
                            }}>
                              {selectedCustomer.historyNote || 'Ghi chú đặt lịch: 10/7 gọi ĐXN đi chung với chị Phương 9/7 chị dời 8/7 đã ib nhắc lịch 5/7 c book, nối mới, đi 2 tính 1, đi với c Julia (0945951706), NHẮC LỊCH SỚM 1 NGÀY GIÚP ELM'}
                            </div>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: '2',
                      label: `Nhật ký ghi chú (0)`,
                      children: <p style={{ color: '#bfbfbf', textAlign: 'center', padding: '24px' }}>Chưa có ghi chú nào.</p>
                    },
                    {
                      key: '3',
                      label: `Lịch sử cuộc gọi (3)`,
                      children: <p style={{ color: '#bfbfbf', textAlign: 'center', padding: '24px' }}>Chưa có cuộc gọi nào.</p>
                    }
                  ]}
                />
              </div>

            </div>

          </div>
        )}
      </Drawer>
    </div>
  );
}
