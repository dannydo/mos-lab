'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Col,
  Popconfirm,
  Tooltip,
  Popover,
  Checkbox,
  Slider,
  Divider
} from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  UserOutlined,
  PhoneOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTheme } from '../../../context/ThemeContext';
import { useOmiCall } from '../../../context/OmiCallContext';
import api from '../../../lib/api';
import CustomerDetailDrawer from '../../../components/CustomerDetailDrawer';
import BookingWizardDrawer from '../../../components/BookingWizardDrawer';
import { RescheduleBookingModal } from '../../../components/RescheduleBookingModal';

dayjs.extend(isoWeek);

const { Title, Text, Paragraph } = Typography;
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
  technicianId?: number | null;
  storeId?: number | null;
  branchName?: string;
  technicianName?: string;
}

export default function AppointmentsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Column configuration state
  const defaultColumnConfig = {
    customerName: { visible: true, width: 220, label: 'Khách hàng' },
    customerPhone: { visible: true, width: 140, label: 'Số Điện Thoại' },
    appointmentTime: { visible: true, width: 150, label: 'Thời Gian Hẹn' },
    serviceName: { visible: true, width: 200, label: 'Dịch vụ chính' },
    totalPrice: { visible: true, width: 130, label: 'Giá trị ước tính' },
    netRevenue: { visible: true, width: 130, label: 'Doanh thu Net' },
    tipAmount: { visible: true, width: 120, label: 'Tiền tips' },
    bookingBonus: { visible: true, width: 130, label: 'Hoa hồng OC' },
    bookingChannel: { visible: true, width: 120, label: 'Kênh đặt lịch' },
    bookingNote: { visible: true, width: 220, label: 'Ghi chú đặt lịch' },
    orderState: { visible: true, width: 120, label: 'Trạng thái' },
  };

  const [columnConfig, setColumnConfig] = useState<Record<string, { visible: boolean; width: number; label: string }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('appointment_columns_config_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const merged = { ...defaultColumnConfig };
          Object.keys(parsed).forEach(key => {
            if (merged[key as keyof typeof defaultColumnConfig]) {
              merged[key as keyof typeof defaultColumnConfig] = {
                ...merged[key as keyof typeof defaultColumnConfig],
                visible: parsed[key].visible,
                width: parsed[key].width || merged[key as keyof typeof defaultColumnConfig].width
              };
            }
          });
          return merged;
        } catch (e) {
          return defaultColumnConfig;
        }
      }
    }
    return defaultColumnConfig;
  });

  const saveColumnConfig = (newConfig: typeof columnConfig) => {
    setColumnConfig(newConfig);
    localStorage.setItem('appointment_columns_config_v2', JSON.stringify(newConfig));
  };

  // Filter states
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_appointments_viewMode');
      return (stored as any) || 'month';
    }
    return 'month';
  });
  const [referenceDate, setReferenceDate] = useState<dayjs.Dayjs>(dayjs());
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const dateRange = useMemo<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    if (customRange) {
      return customRange;
    }
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
    return [start, end];
  }, [viewMode, referenceDate, customRange]);
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
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any>(null);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<any>(null);

  // Caching mechanism replaces the redundant useEffect sync block

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

  const handleCancelBooking = async (orderId: number) => {
    try {
      await api.delete(`/customers/booking/${orderId}`);
      message.success('Hủy lịch hẹn thành công!');
      setAppointments([]);
      setCurrentPage(1);
      fetchAppointments();
    } catch (err: any) {
      console.error('[Cancel] Failed to cancel booking:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi hủy lịch hẹn.');
    }
  };

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
    setCustomRange(null);
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
        <Space 
          size="middle" 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openDetailModal(record.customerId)}
        >
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
            <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline">{record.customerName}</div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>ID: {record.customerId}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (phone: string, record: Appointment) => phone ? (
        <span 
          className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
          onClick={() => makeCall(phone, record.customerName, record.customerId)}
          style={{ color: token.colorText }}
        >
          <PhoneOutlined style={{ color: '#D4A84B' }} />
          <span>{phone}</span>
        </span>
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
      render: (note: string | null) => note ? (
        <Tooltip 
          title={
            <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {note}
            </div>
          }
          overlayStyle={{ maxWidth: '400px' }}
        >
          <Paragraph 
            ellipsis={{ rows: 2 }} 
            title=""
            style={{ 
              color: themeMode === 'dark' ? token.colorText : token.colorText, 
              margin: 0, 
              maxWidth: '100%',
              whiteSpace: 'normal',
              wordBreak: 'break-word'
            }}
          >
            {note}
          </Paragraph>
        </Tooltip>
      ) : <Text type="secondary" style={{ fontStyle: 'italic' }}>Không có</Text>
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
        <Space size="middle">
          <Tooltip title="Chi tiết khách hàng">
            <Button 
              type="text" 
              shape="circle" 
              icon={<EyeOutlined style={{ fontSize: '16px' }} />} 
              onClick={() => openDetailModal(record.customerId)}
              style={{ color: themeMode === 'dark' ? '#D4A84B' : '#D4A84B' }}
            />
          </Tooltip>
          <Tooltip title="Dời lịch hẹn">
            <Button
              type="text"
              shape="circle"
              icon={<CalendarOutlined style={{ fontSize: '16px' }} />}
              onClick={() => {
                const bookingObj = {
                  id: record.id,
                  bookingDate: record.bookingDateStart ? dayjs(record.bookingDateStart).format('YYYY-MM-DD') : '',
                  bookingTime: record.bookingDateStart ? dayjs(record.bookingDateStart).format('HH:mm') : '',
                  branchName: record.branchName || (record.storeId === 16 ? 'Estella Place' : record.storeId === 6 ? 'De Tham' : 'Phan Xích Long'),
                  technicianName: record.technicianName,
                  technicianId: record.technicianId,
                  bookingNote: record.bookingNote,
                  customerName: record.customerName,
                  customerPhone: record.customerPhone,
                  customerId: record.customerId
                };
                setSelectedBookingForReschedule(bookingObj);
                setRescheduleModalVisible(true);
              }}
              style={{ color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563' }}
            />
          </Tooltip>
          <Tooltip title="Hủy lịch hẹn">
            <Popconfirm
              title="Xác nhận hủy lịch"
              description="Anh/chị có chắc chắn muốn hủy lịch hẹn này không?"
              okText="Có, Hủy lịch"
              cancelText="Không"
              onConfirm={() => handleCancelBooking(record.id)}
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                shape="circle"
                danger
                icon={<CloseCircleOutlined style={{ fontSize: '16px' }} />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const completedColumns = [
    {
      title: 'Khách hàng',
      key: 'customerName',
      render: (record: Appointment) => (
        <Space 
          size="middle" 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openDetailModal(record.customerId)}
        >
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
            <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline">{record.customerName}</div>
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
      width: 80,
      render: (record: Appointment) => (
        <Tooltip title="Chi tiết khách hàng">
          <Button 
            type="text" 
            shape="circle" 
            icon={<EyeOutlined style={{ fontSize: '16px' }} />} 
            onClick={() => openDetailModal(record.customerId)}
            style={{ color: themeMode === 'dark' ? '#D4A84B' : '#D4A84B' }}
          />
        </Tooltip>
      )
    }
  ];

  const baseColumns = activeTab === 'completed' ? completedColumns : pendingColumns;
  const columns = baseColumns
    .filter(col => {
      if (col.key === 'action') return true;
      const config = columnConfig[col.key as string];
      return config ? config.visible : true;
    })
    .map(col => {
      const config = columnConfig[col.key as string];
      if (config) {
        return {
          ...col,
          width: config.width
        };
      }
      return col;
    });

  const totalWidth = columns.reduce((sum, col) => sum + (Number(col.width) || 120), 0);

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>Quản Lý Lịch Hẹn Của Tôi</Title>
            <Text style={{ color: token.colorTextDescription }}>
              Theo dõi và quản lý lịch hẹn của khách hàng đã được phân bổ cho bạn
            </Text>
          </div>
          <Button 
            type="primary" 
            icon={<CalendarOutlined />} 
            style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', height: '38px', borderRadius: '6px', fontWeight: 'bold', marginTop: '4px' }}
            onClick={() => setBookingWizardVisible(true)}
          >
            Đặt lịch mới
          </Button>
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
                setCustomRange(null);
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
                  if (dates) setCustomRange([dates[0]!, dates[1]!]);
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

            <Popover
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>Cấu hình hiển thị cột</span>
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => saveColumnConfig(defaultColumnConfig)}
                    style={{ padding: 0 }}
                  >
                    Khôi phục
                  </Button>
                </div>
              }
              trigger="click"
              placement="bottomRight"
              content={
                <div className="custom-scrollbar" style={{ width: '300px', maxHeight: '400px' }}>
                  {Object.entries(columnConfig)
                    .filter(([key]) => {
                      if (activeTab === 'completed') {
                        return !['totalPrice', 'bookingNote'].includes(key);
                      } else {
                        return !['netRevenue', 'tipAmount', 'bookingBonus', 'serviceName'].includes(key);
                      }
                    })
                    .map(([key, config]) => (
                      <div key={key} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Checkbox
                            checked={config.visible}
                            onChange={(e) => {
                              saveColumnConfig({
                                ...columnConfig,
                                [key]: { ...config, visible: e.target.checked }
                              });
                            }}
                          >
                            <span style={{ fontWeight: '500' }}>{config.label}</span>
                          </Checkbox>
                          <span style={{ fontSize: '12px', color: token.colorTextDescription }}>
                            {config.width}px
                          </span>
                        </div>
                        {config.visible && (
                          <div style={{ paddingLeft: '24px', marginTop: '4px' }}>
                            <Slider
                              min={80}
                              max={400}
                              step={10}
                              value={config.width}
                              onChange={(val) => {
                                saveColumnConfig({
                                  ...columnConfig,
                                  [key]: { ...config, width: val }
                                });
                              }}
                              tooltip={{ formatter: (v) => `${v}px` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              }
            >
              <Button icon={<SettingOutlined />} title="Cấu hình cột" />
            </Popover>
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
          scroll={{ x: totalWidth }}
          tableLayout="fixed"
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

      {/* CUSTOMER DETAIL DRAWER (Redesigned Mockup 1 style) */}
      <CustomerDetailDrawer
        open={detailModalVisible}
        customerId={selectedCustomer?.id || null}
        onClose={() => setDetailModalVisible(false)}
        onBookAppointment={(cust) => {
          setDetailModalVisible(false);
          setBookingInitialCustomer({
            id: cust.id,
            name: cust.name,
            phone: cust.phone,
            bucket: cust.bucket
          });
          setBookingWizardVisible(true);
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
        onSuccess={fetchAppointments}
      />

      <RescheduleBookingModal
        open={rescheduleModalVisible}
        booking={selectedBookingForReschedule}
        onClose={() => {
          setRescheduleModalVisible(false);
          setSelectedBookingForReschedule(null);
        }}
        onSuccess={fetchAppointments}
      />
    </div>
  );
}
