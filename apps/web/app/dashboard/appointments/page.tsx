'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Table, 
  Tabs, 
  Button, 
  Card, 
  Space, 
  Radio, 
  DatePicker, 
  Avatar, 
  Tag, 
  Typography, 
  message, 
  Select, 
  theme,
  Descriptions,
  Modal,
  Badge,
  Progress,
  Spin,
  Row,
  Col
} from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  UserOutlined,
  PhoneOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../lib/api';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Appointment {
  id: number;
  orderKey: string;
  bookingDateStart: string | null;
  bookingDateEnd: string | null;
  bookingNote: string | null;
  bookingChannel: string;
  orderState: string;
  totalPrice: number;
  customerId: number;
  customerName: string;
  customerAvatar: string | null;
  customerPhone: string;
  serviceName?: string;
  servicePrice?: number;
  discountPercent?: number;
  netRevenue?: number;
  tipAmount?: number;
  bookingBonus?: number;
}

export default function AppointmentsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter states
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_appointments_viewMode');
      return (stored as any) || 'month';
    }
    return 'month';
  });
  const [referenceDate, setReferenceDate] = useState<dayjs.Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const start = dayjs().startOf('month');
    const end = dayjs().endOf('month');
    return [start, end];
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_appointments_activeTab');
      return (stored as any) || 'pending';
    }
    return 'pending';
  });
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_appointments_selectedStaffId');
      return stored || 'all';
    }
    return 'all';
  });
  const [staffList, setStaffList] = useState<any[]>([]);

  // Appointments data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_appointments_pageSize');
      return stored ? parseInt(stored, 10) : 20;
    }
    return 20;
  });
  const [total, setTotal] = useState<number>(0);
  const [summary, setSummary] = useState<any>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detailed Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);

  // Sync dateRange when viewMode or referenceDate changes
  useEffect(() => {
    let start = referenceDate;
    let end = referenceDate;

    if (viewMode === 'month') {
      start = referenceDate.startOf('month');
      end = referenceDate.endOf('month');
    } else if (viewMode === 'week') {
      start = referenceDate.startOf('isoWeek');
      end = referenceDate.endOf('isoWeek');
    } else if (viewMode === 'day') {
      start = referenceDate.startOf('day');
      end = referenceDate.endOf('day');
    }

    setDateRange([start, end]);
  }, [viewMode, referenceDate]);

  // Load user info and staff list on mount
  useEffect(() => {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setCurrentUser(parsed);
      
      // If admin, load active staff members
      if (parsed.role === 'admin') {
        api.get('/customers/staff')
          .then(res => setStaffList(res.data))
          .catch(err => console.error('Failed to load staff list:', err));
      }
    }
  }, []);

  // Reset currentPage to 1 and clear data when filters change
  useEffect(() => {
    setCurrentPage(1);
    setAppointments([]);
    setTotal(0);
  }, [viewMode, referenceDate, dateRange, activeTab, selectedStaffId]);

  // Fetch appointments data
  const fetchAppointments = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    setLoading(true);
    try {
      const params: any = {
        dateFrom: dateRange[0].startOf('day').toISOString(),
        dateTo: dateRange[1].endOf('day').toISOString(),
        type: activeTab,
        page: currentPage,
        limit: pageSize
      };

      if (currentUser?.role === 'admin' && selectedStaffId !== 'all') {
        params.staffId = selectedStaffId;
      }

      const res = await api.get('/customers/appointments', { params });
      
      if (currentPage === 1) {
        setAppointments(res.data.data);
      } else {
        setAppointments(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = res.data.data.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
      
      setTotal(res.data.total);
      setSummary(res.data.summary || null);
    } catch (err: any) {
      console.error('Fetch appointments error:', err);
      message.error(err.response?.data?.message || 'Không thể tải lịch hẹn');
    } finally {
      setLoading(false);
    }
  }, [dateRange, activeTab, selectedStaffId, currentUser, currentPage, pageSize]);

  useEffect(() => {
    if (currentUser) {
      fetchAppointments();
    }
  }, [fetchAppointments, currentUser]);

  // Intersection Observer for Infinite Scroll (Lazy Loading)
  useEffect(() => {
    if (loading || appointments.length >= total || total === 0) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setCurrentPage(prev => prev + 1);
      }
    }, {
      rootMargin: '150px', // Pre-fetch before user reaches the very bottom
    });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [loading, appointments.length, total]);

  // Quick period navigation
  const handleNavigate = (direction: number) => {
    setReferenceDate(prev => prev.add(direction, viewMode as any));
  };

  const getPeriodLabel = () => {
    if (!dateRange[0] || !dateRange[1]) return 'Chọn thời gian';

    const [start, end] = dateRange;
    let expectedStart = referenceDate;
    let expectedEnd = referenceDate;

    if (viewMode === 'month') {
      expectedStart = referenceDate.startOf('month');
      expectedEnd = referenceDate.endOf('month');
    } else if (viewMode === 'week') {
      expectedStart = referenceDate.startOf('isoWeek');
      expectedEnd = referenceDate.endOf('isoWeek');
    } else if (viewMode === 'day') {
      expectedStart = referenceDate.startOf('day');
      expectedEnd = referenceDate.endOf('day');
    }

    const isMatched = start.isSame(expectedStart, 'day') && end.isSame(expectedEnd, 'day');

    if (!isMatched) {
      return `${start.format('DD/MM')} - ${end.format('DD/MM')}`;
    }

    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const startStr = referenceDate.startOf('isoWeek').format('DD/MM');
      const endStr = referenceDate.endOf('isoWeek').format('DD/MM');
      return `Tuần ${referenceDate.isoWeek()} (${startStr} - ${endStr})`;
    }

    // Day mode
    const today = dayjs().startOf('day');
    const yesterday = dayjs().subtract(1, 'day').startOf('day');
    const ref = referenceDate.startOf('day');

    if (ref.isSame(today)) {
      return `Hôm nay (${ref.format('DD/MM')})`;
    }
    if (ref.isSame(yesterday)) {
      return `Hôm qua (${ref.format('DD/MM')})`;
    }
    return ref.format('DD/MM/YYYY');
  };

  // Open Detail Modal
  const openDetailModal = async (customerId: number) => {
    setDetailModalVisible(true);
    setDetailModalLoading(true);
    setCustomerHistory([]);
    setSelectedCustomer(null);

    try {
      // 1. Fetch detailed customer record
      const customerRes = await api.get(`/customers/${customerId}`);
      setSelectedCustomer(customerRes.data);

      // 2. Fetch history
      const historyRes = await api.get(`/customers/${customerId}/history`);
      setCustomerHistory(historyRes.data);
    } catch (err: any) {
      console.error('Fetch customer details error:', err);
      message.error(err.response?.data?.message || 'Không thể tải thông tin chi tiết khách hàng');
      setDetailModalVisible(false);
    } finally {
      setDetailModalLoading(false);
    }
  };

  // Format currency
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const pendingColumns = [
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (record: Appointment) => (
        <Space size="middle" style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={record.customerAvatar || undefined} 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5', 
              color: '#D4A84B',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0
            }} 
          />
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }}>{record.customerName}</div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>ID: {record.customerId}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (phone: string) => phone ? (
        <Space>
          <PhoneOutlined style={{ color: token.colorPrimary }} />
          <span style={{ color: token.colorText }}>{phone}</span>
        </Space>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'Thời Gian Hẹn',
      key: 'appointmentTime',
      sorter: (a: Appointment, b: Appointment) => {
        const timeA = a.bookingDateStart ? new Date(a.bookingDateStart).getTime() : 0;
        const timeB = b.bookingDateStart ? new Date(b.bookingDateStart).getTime() : 0;
        return timeA - timeB;
      },
      render: (record: Appointment) => {
        if (!record.bookingDateStart) return <Text type="secondary">-</Text>;
        const start = dayjs(record.bookingDateStart);
        return (
          <Space direction="vertical" size={1}>
            <span style={{ fontWeight: '600', color: token.colorText }}>
              {start.format('HH:mm')}
            </span>
            <span style={{ fontSize: '12px', color: token.colorTextDescription }}>
              {start.format('DD/MM/YYYY')}
            </span>
          </Space>
        );
      }
    },
    {
      title: 'Giá trị ước tính',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      sorter: (a: Appointment, b: Appointment) => a.totalPrice - b.totalPrice,
      render: (price: number) => <span style={{ fontWeight: '500', color: token.colorText }}>{formatVND(price)}</span>
    },
    {
      title: 'Kênh đặt lịch',
      dataIndex: 'bookingChannel',
      key: 'bookingChannel',
      render: (channel: string) => <Tag color="orange" style={{ textTransform: 'capitalize' }}>{channel.toLowerCase()}</Tag>
    },
    {
      title: 'Ghi chú đặt lịch',
      dataIndex: 'bookingNote',
      key: 'bookingNote',
      ellipsis: true,
      render: (note: string | null) => note ? <span style={{ color: token.colorText }}>{note}</span> : <Text type="secondary" style={{ fontStyle: 'italic' }}>Không có</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string, record: Appointment) => {
        const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
        const isCompleted = state === 'Completed';
        const isInService = ['CheckIn', 'ServiceCleaned', 'CheckOut'].includes(state);

        let color = 'default';
        if (isCompleted) {
          color = 'success';
        } else if (isInService) {
          color = 'processing';
        } else if (isPast) {
          color = 'error';
        } else {
          const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
          color = isToday ? 'warning' : 'cyan';
        }
        
        return <Tag color={color}>{state}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (record: Appointment) => (
        <Button 
          type="primary" 
          ghost 
          icon={<EyeOutlined />} 
          onClick={() => openDetailModal(record.customerId)}
          style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
        >
          Chi tiết KH
        </Button>
      )
    }
  ];

  const completedColumns = [
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (record: Appointment) => (
        <Space size="middle" style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={record.customerAvatar || undefined} 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5', 
              color: '#D4A84B',
              border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
              flexShrink: 0
            }} 
          />
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }}>{record.customerName}</div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>ID: {record.customerId}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Kênh đặt',
      dataIndex: 'bookingChannel',
      key: 'bookingChannel',
      render: (channel: string) => <Tag color="orange" style={{ textTransform: 'capitalize' }}>{channel?.toLowerCase()}</Tag>
    },
    {
      title: 'Ngày hẹn',
      key: 'appointmentTime',
      sorter: (a: Appointment, b: Appointment) => {
        const timeA = a.bookingDateStart ? new Date(a.bookingDateStart).getTime() : 0;
        const timeB = b.bookingDateStart ? new Date(b.bookingDateStart).getTime() : 0;
        return timeA - timeB;
      },
      render: (record: Appointment) => {
        if (!record.bookingDateStart) return <Text type="secondary">-</Text>;
        const start = dayjs(record.bookingDateStart);
        return (
          <Space direction="vertical" size={1}>
            <span style={{ fontWeight: '600', color: token.colorText }}>
              {start.format('HH:mm')}
            </span>
            <span style={{ fontSize: '12px', color: token.colorTextDescription }}>
              {start.format('DD/MM/YYYY')}
            </span>
          </Space>
        );
      }
    },
    {
      title: 'Dịch vụ chính',
      key: 'serviceName',
      render: (record: Appointment) => (
        <div style={{ color: token.colorText }}>
          <div style={{ fontWeight: '600' }}>{record.serviceName}</div>
          <div style={{ fontSize: '12px', color: token.colorTextDescription }}>
            Giá: {formatVND(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
          </div>
        </div>
      )
    },
    {
      title: 'Doanh thu Net',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      sorter: (a: Appointment, b: Appointment) => (a.netRevenue || 0) - (b.netRevenue || 0),
      render: (val: number) => <span style={{ fontWeight: '500', color: token.colorText }}>{val > 0 ? formatVND(val) : '-'}</span>
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      sorter: (a: Appointment, b: Appointment) => (a.tipAmount || 0) - (b.tipAmount || 0),
      render: (val: number) => <span style={{ color: token.colorText }}>{val > 0 ? formatVND(val) : '-'}</span>
    },
    {
      title: 'Hoa hồng OC',
      dataIndex: 'bookingBonus',
      key: 'bookingBonus',
      sorter: (a: Appointment, b: Appointment) => (a.bookingBonus || 0) - (b.bookingBonus || 0),
      render: (val: number) => val > 0 ? (
        <span style={{ color: '#52C41A', fontWeight: 'bold' }}>+{formatVND(val)}</span>
      ) : <span style={{ color: token.colorTextDescription }}>-</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (state: string, record: Appointment) => {
        const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
        const isCompleted = state === 'Completed';
        const isInService = ['CheckIn', 'ServiceCleaned', 'CheckOut'].includes(state);

        let color = 'default';
        if (isCompleted) {
          color = 'success';
        } else if (isInService) {
          color = 'processing';
        } else if (isPast) {
          color = 'error';
        } else {
          const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
          color = isToday ? 'warning' : 'cyan';
        }
        
        return <Tag color={color}>{state}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (record: Appointment) => (
        <Button 
          type="primary" 
          ghost 
          icon={<EyeOutlined />} 
          onClick={() => openDetailModal(record.customerId)}
          style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
        >
          Chi tiết KH
        </Button>
      )
    }
  ];

  const columns = activeTab === 'completed' ? completedColumns : pendingColumns;

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>Quản Lý Lịch Hẹn Của Tôi</Title>
          <Text style={{ color: token.colorTextDescription }}>
            Theo dõi và quản lý lịch hẹn của khách hàng đã được phân bổ cho bạn
          </Text>
        </div>

        {/* Date Filter & Staff Selection */}
        <div className="flex items-center gap-3 flex-wrap">
          {currentUser?.role === 'admin' && (
            <Select
              value={selectedStaffId}
              onChange={(value) => {
                setSelectedStaffId(value);
                localStorage.setItem('mos_appointments_selectedStaffId', value);
              }}
              style={{ width: '180px' }}
              options={[
                { value: 'all', label: 'Tất cả Booker' },
                ...staffList.map(s => ({ value: s.id.toString(), label: s.displayName }))
              ]}
              placeholder="Chọn Booker"
            />
          )}

          <Space wrap>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => {
                const val = e.target.value;
                setViewMode(val);
                setReferenceDate(dayjs());
                localStorage.setItem('mos_appointments_viewMode', val);
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="month">Tháng</Radio.Button>
              <Radio.Button value="week">Tuần</Radio.Button>
              <Radio.Button value="day">Ngày</Radio.Button>
            </Radio.Group>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Space.Compact>
                <Button 
                  icon={<LeftOutlined />} 
                  onClick={() => handleNavigate(-1)} 
                />
                <Button 
                  onClick={() => setPickerOpen(true)}
                  style={{ 
                    fontWeight: '600', 
                    minWidth: '210px', 
                    textAlign: 'center', 
                    color: token.colorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                <Button 
                  icon={<RightOutlined />} 
                  onClick={() => handleNavigate(1)} 
                />
              </Space.Compact>

              <RangePicker 
                value={dateRange} 
                onChange={(dates) => {
                  if (dates) setDateRange([dates[0]!, dates[1]!]);
                }}
                format="DD/MM/YYYY"
                open={pickerOpen}
                onOpenChange={(open) => setPickerOpen(open)}
                style={{ 
                  position: 'absolute', 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  height: '100%', 
                  opacity: 0, 
                  pointerEvents: 'none',
                  zIndex: -1 
                }}
              />
            </div>
          </Space>
        </div>
      </div>

      <Card style={{ background: token.colorBgContainer, borderRadius: '8px' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => {
            setActiveTab(key as any);
            localStorage.setItem('mos_appointments_activeTab', key);
          }}
          style={{ color: token.colorText }}
          items={[
            {
              key: 'pending',
              label: (
                <span style={{ fontSize: '15px', fontWeight: '500' }}>
                  Lịch hẹn / Chưa đến
                  <Badge count={activeTab === 'pending' ? total : 0} style={{ marginLeft: 8, backgroundColor: '#D4A84B' }} />
                </span>
              ),
            },
            {
              key: 'completed',
              label: (
                <span style={{ fontSize: '15px', fontWeight: '500' }}>
                  Khách hàng đã đến
                  <Badge count={activeTab === 'completed' ? total : 0} style={{ marginLeft: 8, backgroundColor: '#52C41A' }} />
                </span>
              ),
            },
          ]}
        />

        {activeTab === 'completed' && summary && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    LỊCH HẸN / CHECK-IN
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: token.colorText }}>
                    {summary.totalPlanned} lượt / <span style={{ color: '#52C41A' }}>{summary.totalCheckin}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Tỷ lệ đến: {summary.checkInRate}%
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    LƯƠNG CỨNG
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: token.colorText }}>
                    {formatVND(summary.baseSalary)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Cố định hàng tháng
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    HOA HỒNG ĐẶT LỊCH (LIVE)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#52C41A' }}>
                    {formatVND(summary.clientBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Cộng dồn đơn thành công
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    THƯỞNG MỐC DONE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: summary.doneBonus > 0 ? '#52C41A' : token.colorText }}>
                    {formatVND(summary.doneBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    {summary.doneBonus > 0 ? `Đạt mốc ${summary.doneLevelCount} đơn` : 'Chưa đạt mốc thưởng'}
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    THƯỞNG / PHẠT LỖI
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: summary.missedBonus < 0 ? '#FF4D4F' : summary.missedBonus > 0 ? '#52C41A' : token.colorText
                  }}>
                    {summary.missedBonus > 0 ? '+' : ''}{formatVND(summary.missedBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Lỗi {summary.missedRatePct}% (Mốc &lt;= {summary.missedLevelRate || 10}%)
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    THƯỞNG TIPS (7%)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: summary.tipBonus > 0 ? '#52C41A' : token.colorText }}>
                    {formatVND(summary.tipBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Tổng tips: {formatVND(summary.totalTips)}
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: token.colorTextDescription, textTransform: 'uppercase' }}>
                    THƯỞNG DOANH THU NET
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: summary.revBonus > 0 ? '#52C41A' : token.colorText }}>
                    {formatVND(summary.revBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    {summary.revBonus > 0 ? `Đạt mốc ${summary.revLevelMin / 1000000}M (${Math.round(summary.revLevelRate * 100 * 100) / 100}%)` : `Chưa đạt (DS: ${Math.round(summary.totalNetRev/100000)/10}M)`}
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div style={{
                  background: themeMode === 'dark' ? '#2c220f' : '#fefaf0',
                  border: `1px solid #D4A84B`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  height: '100%',
                  boxShadow: themeMode === 'dark' ? '0 0 10px rgba(212, 168, 75, 0.15)' : '0 0 10px rgba(212, 168, 75, 0.08)'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#D4A84B', textTransform: 'uppercase' }}>
                    TỔNG THU NHẬP (LIVE)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#D4A84B' }}>
                    {formatVND(summary.totalSalary)}
                  </div>
                  <div style={{ fontSize: '11px', color: themeMode === 'dark' ? '#bfa36b' : '#a38445' }}>
                    Lương cứng + thưởng live
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        <Table
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading && appointments.length === 0}
          pagination={false}
          style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: '8px',
            marginTop: '16px'
          }}
          className="antd-custom-table"
          onRow={(record) => {
            const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
            const isCompleted = record.orderState === 'Completed';
            const isInService = ['CheckIn', 'ServiceCleaned', 'CheckOut'].includes(record.orderState);

            let style: React.CSSProperties = {};
            
            if (isPast && !isCompleted && !isInService) {
              // Past / Missed / Overdue: Soft Red/Coral tone
              style.backgroundColor = themeMode === 'dark' ? '#2d1818' : '#fff1f0';
            } else if (!isCompleted && !isInService) {
              const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
              if (isToday) {
                // Today pending: Soft Yellow tone
                style.backgroundColor = themeMode === 'dark' ? '#252115' : '#fefbe6';
              }
            } else if (isInService) {
              // In Service: Soft Blue tone
              style.backgroundColor = themeMode === 'dark' ? '#112134' : '#e6f7ff';
            }

            return { style };
          }}
        />

        {/* Infinite Scroll Sentinel */}
        <div 
          ref={sentinelRef} 
          style={{ 
            padding: '20px 0', 
            textAlign: 'center', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '10px',
            color: token.colorTextDescription,
            fontSize: '14px'
          }}
        >
          {loading && appointments.length > 0 && (
            <>
              <Spin size="small" />
              <span>Đang tải thêm dữ liệu...</span>
            </>
          )}
          {!loading && appointments.length >= total && total > 0 && (
            <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
              Đã hiển thị tất cả {total} lịch hẹn
            </span>
          )}
        </div>
      </Card>

      {/* CUSTOMER DETAIL MODAL */}
      <Modal
        title={
          <span style={{ color: '#D4A84B', fontSize: '20px', fontWeight: 'bold' }}>
            Thông Tin Chi Tiết Khách Hàng
          </span>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={750}
        loading={detailModalLoading}
        style={{ top: 50 }}
      >
        {selectedCustomer && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginTop: '16px' }}>
              <Descriptions.Item label="Mã KH" span={2}>
                {selectedCustomer.id}
              </Descriptions.Item>
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
              <Descriptions.Item label="Nhóm phân loại">
                {selectedCustomer.bucket === 'COMBO_LIVE' && <Tag color="green">COMBO LIVE</Tag>}
                {selectedCustomer.bucket === 'COMBO_DEAD' && <Tag color="red">COMBO DEAD</Tag>}
                {selectedCustomer.bucket === 'SINGLE' && <Tag color="orange">SINGLE</Tag>}
              </Descriptions.Item>
              
              {selectedCustomer.bucket !== 'SINGLE' && selectedCustomer.comboBalance && (
                <>
                  <Descriptions.Item label="Số buổi thường còn lại">
                    {selectedCustomer.comboBalance.normalCount} buổi
                  </Descriptions.Item>
                  <Descriptions.Item label="Số buổi bảo hành còn lại">
                    {selectedCustomer.comboBalance.retainCount} buổi
                  </Descriptions.Item>
                  <Descriptions.Item label="Hạn dùng combo" span={2}>
                    {selectedCustomer.comboBalance.expiryDate 
                      ? dayjs(selectedCustomer.comboBalance.expiryDate).format('DD/MM/YYYY') 
                      : 'Không giới hạn'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Title level={4} style={{ color: '#D4A84B', marginTop: '24px', marginBottom: '12px' }}>
              Lịch sử các buổi đã làm
            </Title>
            <Table
              dataSource={customerHistory}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
              columns={[
                {
                  title: 'Mã Đơn',
                  dataIndex: 'orderKey',
                  key: 'orderKey',
                },
                {
                  title: 'Ngày làm',
                  dataIndex: 'dateCreated',
                  key: 'dateCreated',
                  render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
                },
                {
                  title: 'Chi tiêu',
                  dataIndex: 'totalPrice',
                  key: 'totalPrice',
                  render: (price: number) => formatVND(price),
                },
                {
                  title: 'Kênh đặt',
                  dataIndex: 'bookingChannel',
                  key: 'bookingChannel',
                }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
