'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Drawer,
  Spin,
  Card,
  Avatar,
  Tag,
  Tabs,
  Timeline,
  theme,
  message,
  Space,
  Button,
  Popconfirm,
  Modal,
  Table
} from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  RiseOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  SunOutlined,
  SyncOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { RescheduleBookingModal } from './RescheduleBookingModal';

interface CustomerDetailDrawerProps {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
  onBookAppointment?: (customer: any) => void;
}

const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  open,
  customerId,
  onClose,
  onBookAppointment
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<any>(null);
  const [isGemModalOpen, setIsGemModalOpen] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);

  // Resizable drawer states and hooks
  const [isDragging, setIsDragging] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(1100);
  const widthRef = React.useRef(drawerWidth);

  useEffect(() => {
    widthRef.current = drawerWidth;
  }, [drawerWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_detail_drawer_width');
      if (saved) {
        setDrawerWidth(parseInt(saved, 10));
      }
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 500;
      const maxWidth = window.innerWidth * 0.95;
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

  // Resizable modal states and hooks
  const [modalWidth, setModalWidth] = useState(800);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState<{ x: number; width: number; direction: 'left' | 'right' } | null>(null);
  const modalWidthRef = React.useRef(modalWidth);

  useEffect(() => {
    modalWidthRef.current = modalWidth;
  }, [modalWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_combo_modal_width');
      if (saved) {
        setModalWidth(parseInt(saved, 10));
      }
    }
  }, []);

  const handleModalDragStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setDragStartInfo({
      x: e.clientX,
      width: modalWidthRef.current,
      direction
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
      const maxWidth = window.innerWidth * 0.95;
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

  // Resizable gem modal states and hooks
  const [gemModalWidth, setGemModalWidth] = useState(750);
  const [isGemModalDragging, setIsGemModalDragging] = useState(false);
  const [gemDragStartInfo, setGemDragStartInfo] = useState<{ x: number; width: number; direction: 'left' | 'right' } | null>(null);
  const gemModalWidthRef = React.useRef(gemModalWidth);

  useEffect(() => {
    gemModalWidthRef.current = gemModalWidth;
  }, [gemModalWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_gem_modal_width');
      if (saved) {
        setGemModalWidth(parseInt(saved, 10));
      }
    }
  }, []);

  const handleGemModalDragStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setGemDragStartInfo({
      x: e.clientX,
      width: gemModalWidthRef.current,
      direction
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
      const maxWidth = window.innerWidth * 0.95;
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

  const gemColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (text: string) => text ? new Date(text).toLocaleString('vi-VN') : 'N/A',
      width: '160px'
    },
    {
      title: 'Loại',
      dataIndex: 'method',
      key: 'method',
      render: (method: string, record: any) => {
        const val = Number(record.amount || 0);
        const isNegative = val < 0 || method !== 'Credit';
        return (
          <Tag color={isNegative ? 'error' : 'success'}>
            {isNegative ? 'Trừ (-)' : 'Cộng (+)'}
          </Tag>
        );
      },
      width: '100px'
    },
    {
      title: 'Số lượng',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number, record: any) => {
        const amountVal = Number(val || 0);
        const isNegative = amountVal < 0 || record.method !== 'Credit';
        const displayVal = Math.abs(amountVal);
        return (
          <span style={{ 
            fontWeight: 'bold', 
            color: isNegative 
              ? (themeMode === 'dark' ? '#ff7875' : '#ff4d4f') 
              : (themeMode === 'dark' ? '#4ade80' : '#22c55e') 
          }}>
            {isNegative ? '-' : '+'}{displayVal} 💎
          </span>
        );
      },
      width: '110px'
    },
    {
      title: 'Số dư khả dụng',
      dataIndex: 'balance',
      key: 'balance',
      render: (val: number) => <strong style={{ color: themeMode === 'dark' ? '#fbbf24' : '#d97706' }}>{val} 💎</strong>,
      width: '130px'
    },
    {
      title: 'Lý do / Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <span style={{ color: '#888', fontStyle: 'italic' }}>Không có mô tả</span>
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'staffName',
      key: 'staffName',
      width: '150px'
    }
  ];

  const comboHistoryColumns = [
    {
      title: 'Tên Combo',
      key: 'serviceName',
      render: (_: any, record: any) => (
        <span style={{ fontWeight: 'bold' }}>
          {record.serviceName} {record.packageKey ? `(${record.packageKey})` : ''}
        </span>
      )
    },
    {
      title: 'Ngày mua',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (text: string) => text ? new Date(text).toLocaleDateString('vi-VN') : 'N/A',
      width: '110px'
    },
    {
      title: 'Người bán (CC)',
      dataIndex: 'creatorStaffName',
      key: 'creatorStaffName',
      render: (text: string) => text || 'Hệ thống',
      width: '130px'
    },
    {
      title: 'Giá tiền',
      dataIndex: 'packagePrice',
      key: 'packagePrice',
      render: (val: number | null | undefined) => {
        if (val === null || val === undefined) {
          return 'N/A';
        }
        if (val === 0) {
          return 'Miễn phí';
        }
        return `${val.toLocaleString('vi-VN')} đ`;
      },
      width: '120px'
    },
    {
      title: 'Số buổi',
      key: 'sessions',
      render: (_: any, record: any) => (
        <span>
          Mới: <strong>{record.normalCount}</strong> / Dặm: <strong>{record.retainCount}</strong>
        </span>
      ),
      width: '130px'
    },
    {
      title: 'Hạn dùng',
      dataIndex: 'dateExpired',
      key: 'dateExpired',
      render: (text: string) => text ? new Date(text).toLocaleDateString('vi-VN') : 'Vô thời hạn',
      width: '110px'
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: any) => {
        const isActive = (record.normalCount || 0) + (record.retainCount || 0) > 0;
        return (
          <Tag color={isActive ? 'success' : 'default'}>
            {isActive ? 'Đang chạy' : 'Đã dùng hết'}
          </Tag>
        );
      },
      width: '110px'
    }
  ];

  useEffect(() => {
    if (open && customerId) {
      fetchDetails();
    } else {
      setData(null);
    }
  }, [open, customerId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}/detailed`);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch detailed customer:', err);
      message.error(err.response?.data?.message || 'Không thể tải thông tin chi tiết khách hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (orderId: number) => {
    try {
      await api.delete(`/customers/booking/${orderId}`);
      message.success('Hủy lịch hẹn thành công!');
      fetchDetails();
    } catch (err: any) {
      console.error('[Cancel] Failed to cancel booking:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi hủy lịch hẹn.');
    }
  };

  const getMostFrequentDay = (bookings: any[]) => {
    if (!bookings || bookings.length === 0) return 'N/A';
    const dayCounts = Array(7).fill(0);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    
    bookings.forEach(b => {
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

  const customer = data?.customer;
  const stats = data?.stats;
  const comboBalances = data?.comboBalances || [];
  const bookings = data?.bookings || [];
  const notes = data?.notes || [];
  const calls = data?.calls || [];

    const getComboDisplayInfo = (serviceName: string, normalCount: number, retainCount: number, packageNormalCount?: number, packageKey?: string) => {
    const nameLower = (serviceName || '').toLowerCase();
    
    // Try to parse from packageKey first (e.g., '7+3-flawless-mink' -> totalNew = 7, totalRefill = 3)
    let totalNew: number | null = null;
    let totalRefill: number | null = null;
    
    if (packageKey) {
      const match = packageKey.match(/^(\d+)\+(\d+)/);
      if (match) {
        totalNew = parseInt(match[1], 10);
        totalRefill = parseInt(match[2], 10);
      }
    }
    
    // Fallbacks if not matching X+Y
    const total = (packageNormalCount && packageNormalCount > 0) ? packageNormalCount : null;
    if (totalNew === null && totalRefill === null) {
      if (nameLower.includes('refill')) {
        totalRefill = total;
        totalNew = 0;
      } else {
        totalNew = total;
        totalRefill = 0;
      }
    }
    
    // Default safe fallback if not set anywhere
    if (totalNew === null) totalNew = nameLower.includes('new') ? 10 : 0;
    if (totalRefill === null) totalRefill = nameLower.includes('refill') ? 3 : 0;

    return {
      displayName: `${serviceName} ${packageKey ? `(${packageKey})` : ''}`,
      totalNew,
      totalRefill,
      total
    };
  };

  return (
    <Drawer
      title={
        customer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Avatar
                src={customer.avatar || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
                  color: '#D4A84B',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
                  width: '48px',
                  height: '48px',
                  lineHeight: '48px',
                  fontSize: '20px',
                  flexShrink: 0
                }}
              />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {customer.name}
                  <span style={{ color: '#D4A84B', fontSize: '14px' }}>⭐⭐⭐⭐•</span>
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span><PhoneOutlined /> {customer.phone}</span>
                  <span>Mã KH: {customer.id}</span>
                  {customer.email && <span>Email: {customer.email}</span>}
                </div>
              </div>
            </div>
            {onBookAppointment && (
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                style={{
                  background: '#D4A84B',
                  borderColor: '#D4A84B',
                  fontWeight: 'bold'
                }}
                onClick={() => onBookAppointment(customer)}
              >
                Đặt Lịch Hẹn
              </Button>
            )}
          </div>
        )
      }
      placement="right"
      width={drawerWidth}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          background: themeMode === 'dark' ? '#0f172a' : '#f9fafb',
          padding: '24px'
        },
        header: {
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`
        }
      }}
    >
      {/* Drag handle for resizable drawer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '6px',
          cursor: 'ew-resize',
          zIndex: 10000,
          background: isDragging ? '#D4A84B' : 'transparent',
          borderLeft: isDragging ? '2px solid #D4A84B' : 'none',
          transition: 'background 0.2s',
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)'; }}
        onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.background = 'transparent'; }}
      />
      <Spin spinning={loading}>
        {customer && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
            
            {/* SIDEBAR: Info & Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* KPI Card */}
              <Card
                title={<span style={{ fontSize: '14px', fontWeight: 'bold' }}><RiseOutlined /> CHỈ SỐ TÍCH LUỸ</span>}
                size="small"
                styles={{ body: { padding: '16px' } }}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{
                    background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4A84B' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(stats?.totalSpent || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>LTV (Doanh thu)</div>
                  </div>

                  <div style={{
                    background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4A84B' }}>
                      {stats?.totalVisits || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Tổng đặt lịch</div>
                  </div>

                  <div 
                    onClick={() => setIsGemModalOpen(true)}
                    style={{
                      background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                      padding: '10px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.2)' : 'rgba(212, 168, 75, 0.3)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(212, 168, 75, 0.2)';
                      e.currentTarget.style.borderColor = '#fa8c16';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = themeMode === 'dark' ? 'rgba(212, 168, 75, 0.2)' : 'rgba(212, 168, 75, 0.3)';
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      💎 {stats?.gemBalance || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Kim cương còn lại</div>
                  </div>

                  <div style={{
                    background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.2)'}`
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                      {stats?.avgFrequency ? `${stats.avgFrequency}d` : 'N/A'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Tần suất (Avg)</div>
                  </div>
                </div>
              </Card>

              {/* Profile Details Card */}
              <Card
                title={<span style={{ fontSize: '14px', fontWeight: 'bold' }}><InfoCircleOutlined /> THÔNG TIN CÁ NHÂN</span>}
                size="small"
                styles={{ body: { padding: '16px' } }}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Giới tính:</span>
                    <span style={{ fontWeight: 'bold' }}>{customer.gender || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Ngày sinh:</span>
                    <span style={{ fontWeight: 'bold' }}>{customer.dob || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Nhóm phân loại:</span>
                    <Tag color="warning" style={{ margin: 0 }}>{customer.bucket}</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Số ngày chưa quay lại:</span>
                    <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{customer.daysSinceLastVisit || 0} ngày</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Thứ hay đi nhất:</span>
                    <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                      {getMostFrequentDay(bookings)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Phụ trách (OC):</span>
                    <span style={{ fontWeight: 'bold', color: themeMode === 'dark' ? '#38bdf8' : '#0284c7' }}>
                      {customer.onlineConsultant || 'Chưa phân bổ'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Combo Balances Card */}
              <Card
                title={<span style={{ fontSize: '14px', fontWeight: 'bold' }}><InboxOutlined /> GÓI DỊCH VỤ ĐANG CHẠY</span>}
                size="small"
                styles={{ body: { padding: '16px' } }}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb'
                }}
              >
                {comboBalances.filter((cb: any) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {comboBalances.filter((cb: any) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0).map((cb: any) => {
                      const info = getComboDisplayInfo(cb.serviceName, cb.normalCount, cb.retainCount, cb.packageNormalCount, cb.packageKey);
 
                      return (
                        <div 
                          key={cb.id} 
                          onClick={() => setIsComboModalOpen(true)}
                          style={{
                            background: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.05)' : '#fffbe6',
                            border: `1px solid ${themeMode === 'dark' ? 'rgba(250, 140, 22, 0.2)' : '#ffe58f'}`,
                            borderRadius: '8px',
                            padding: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#fa8c16';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(250, 140, 22, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = themeMode === 'dark' ? 'rgba(250, 140, 22, 0.2)' : '#ffe58f';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {/* Header row: Service Name + Package Key in Parentheses */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fa8c16', flex: 1 }}>
                              {cb.serviceName} {cb.packageKey ? `(${cb.packageKey})` : ''}
                            </div>
                            <span style={{ fontSize: '10px', color: '#fa8c16', textDecoration: 'underline' }}>Chi tiết</span>
                          </div>
                          
                          {/* Icons row matching legacy screenshot */}
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', marginTop: '6px', color: themeMode === 'dark' ? '#f1f5f9' : '#334155' }}>
                            <Space size={4}>
                              <SunOutlined style={{ color: '#fa8c16', fontSize: '13px' }} />
                              <strong>{cb.normalCount}</strong>
                            </Space>
                            
                            <Space size={4}>
                              <SyncOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                              <strong>{cb.retainCount}</strong>
                            </Space>
                            
                            {cb.dateExpired && (
                              <Space size={4} style={{ marginLeft: 'auto' }}>
                                <span style={{ fontSize: '12px' }}>💀</span>
                                <span style={{ fontSize: '11px', color: '#888' }}>
                                  {new Date(cb.dateExpired).toLocaleDateString('vi-VN')}
                                </span>
                              </Space>
                            )}
                          </div>
                          
                          {/* Detail list below for clear breakdown */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10.5px', marginTop: '6px', color: '#888', borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`, paddingTop: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>New (Nối mới):</span>
                              <span><strong>{cb.normalCount}</strong> / {info.totalNew} buổi</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Refill (Dặm):</span>
                              <span><strong>{cb.retainCount}</strong> / {info.totalRefill} buổi</span>
                            </div>
                            {cb.creatorStaffName && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                                <span>Người bán (CC):</span>
                                <strong style={{ color: themeMode === 'dark' ? '#fff' : '#555' }}>{cb.creatorStaffName}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: '12px', padding: '12px 0' }}>
                    Không có gói combo nào đang chạy.
                  </div>
                )}
              </Card>

              {/* Referral Card */}
              <Card
                title={<span style={{ fontSize: '14px', fontWeight: 'bold' }}><ShareAltOutlined /> GIỚI THIỆU KHÁCH HÀNG</span>}
                size="small"
                styles={{ body: { padding: '16px' } }}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
                  marginTop: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Referred By Section */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Được giới thiệu bởi
                    </div>
                    {data?.referrer ? (
                      <div style={{
                        padding: '10px',
                        background: themeMode === 'dark' ? 'rgba(82, 196, 26, 0.05)' : '#f6ffed',
                        border: `1px solid ${themeMode === 'dark' ? 'rgba(82, 196, 26, 0.2)' : '#b7eb8f'}`,
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 'bold', color: themeMode === 'dark' ? '#4ade80' : '#389e0d' }}>
                          {data.referrer.name}
                        </div>
                        <div style={{ color: '#888', marginTop: '2px' }}>
                          SĐT: {data.referrer.phone}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                        Tự đăng ký (Không có người giới thiệu)
                      </div>
                    )}
                  </div>

                  {/* Referred List Section */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Danh sách đã giới thiệu ({data?.referredUsers?.length || 0})
                    </div>
                    {data?.referredUsers && data.referredUsers.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.referredUsers.map((ru: any) => (
                          <div 
                            key={ru.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
                              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`,
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>
                                {ru.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                                {ru.phone} {ru.dateCreated ? `• ${new Date(ru.dateCreated).toLocaleDateString('vi-VN')}` : ''}
                              </div>
                            </div>
                            {ru.rewardDiamonds > 0 ? (
                              <Tag color="success" style={{ fontWeight: 'bold', margin: 0 }}>
                                +{ru.rewardDiamonds} 💎
                              </Tag>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#888' }}>Chưa nhận thưởng</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                        Chưa giới thiệu khách hàng nào.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* MAIN PANEL: Timelines & History */}
            <div style={{
              background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
              borderRadius: '8px',
              padding: '20px',
              minHeight: '600px'
            }}>
              <Tabs
                defaultActiveKey="bookings"
                items={[
                  {
                    key: 'bookings',
                    label: `Lịch sử đặt lịch (${bookings.length})`,
                    children: (
                      <div style={{
                        maxHeight: 'calc(100vh - 240px)',
                        overflowY: 'auto',
                        padding: '10px 4px 10px 10px'
                      }}>
                        {bookings.length > 0 ? (
                          <Timeline
                            items={bookings.map((b: any) => {
                              const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
                              
                              let formattedDate = 'N/A';
                              if (b.bookingDate) {
                                const d = new Date(b.bookingDate);
                                const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                const dayPrefix = dayPrefixes[d.getDay()];
                                formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;
                              }
                              
                              return {
                                key: b.id,
                                color: isCompleted ? 'green' : 'red',
                                children: (
                                  <div style={{
                                    background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9fafb',
                                    border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginTop: '-6px',
                                    marginBottom: '10px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                        {b.services && b.services.length > 0 ? b.services.join(', ') : 'Dịch vụ'}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#888' }}>{formattedDate}</span>
                                        <Tag color={isCompleted ? 'success' : 'error'}>
                                          {isCompleted ? 'Hoàn thành' : b.orderState}
                                        </Tag>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div>
                                        CN: <strong>{b.branchName}</strong> | CV: <strong>{b.technicianName}</strong>
                                      </div>
                                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', opacity: 0.85 }}>
                                        <span>CC IN: <strong>{b.ccInName || 'N/A'}</strong></span>
                                        <span>CC OUT: <strong>{b.ccOutName || 'N/A'}</strong></span>
                                        <span>BK: <strong>{b.bookerName || 'N/A'}</strong></span>
                                      </div>
                                    </div>
                                    {b.bookingNote && (
                                      <div style={{
                                        fontSize: '12.5px',
                                        fontStyle: 'italic',
                                        background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                                        borderLeft: '3px solid #D4A84B',
                                        padding: '6px 10px',
                                        marginTop: '8px',
                                        borderRadius: '0 4px 4px 0',
                                        color: themeMode === 'dark' ? '#d1d5db' : '#374151'
                                      }}>
                                        Ghi chú đặt lịch: {b.bookingNote}
                                      </div>
                                    )}
                                    {!isCompleted && b.orderState !== 'Cancelled' && (
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '8px' }}>
                                        <Popconfirm
                                          title="Xác nhận hủy lịch"
                                          description="Anh/chị có chắc chắn muốn hủy lịch hẹn này không?"
                                          okText="Có, Hủy lịch"
                                          cancelText="Không"
                                          onConfirm={() => handleCancelBooking(b.id)}
                                          okButtonProps={{ danger: true }}
                                        >
                                          <Button
                                            type="default"
                                            danger
                                            size="small"
                                            icon={<CloseCircleOutlined />}
                                            style={{ borderRadius: '4px', fontWeight: '600' }}
                                          >
                                            Hủy lịch
                                          </Button>
                                        </Popconfirm>
                                        <Button
                                          type="primary"
                                          size="small"
                                          icon={<CalendarOutlined />}
                                          style={{
                                            backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#D4A84B',
                                            borderColor: themeMode === 'dark' ? '#D4A84B' : '#D4A84B',
                                            color: themeMode === 'dark' ? '#000000' : '#000000',
                                            fontWeight: '600',
                                            borderRadius: '4px'
                                          }}
                                          onClick={() => {
                                            setSelectedBookingForReschedule({
                                              ...b,
                                              customerName: customer?.name || 'Khách Hàng',
                                              customerPhone: customer?.phone || ''
                                            });
                                            setRescheduleModalVisible(true);
                                          }}
                                        >
                                          Dời lịch hẹn
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              };
                            })}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
                            Không có lịch sử đặt lịch nào.
                          </div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'notes',
                    label: `Nhật ký ghi chú (${notes.length})`,
                    children: (
                      <div style={{
                        maxHeight: 'calc(100vh - 240px)',
                        overflowY: 'auto',
                        padding: '10px 4px 10px 10px'
                      }}>
                        {notes.length > 0 ? (
                          <Timeline
                            items={notes.map((n: any) => {
                              const isSticky = n.isSticky;
                              let formattedDate = 'N/A';
                              if (n.dateCreated) {
                                const d = new Date(n.dateCreated);
                                const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                const dayPrefix = dayPrefixes[d.getDay()];
                                formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;
                              }
                              
                              return {
                                key: n.id,
                                dot: isSticky ? <WarningOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} /> : <ClockCircleOutlined style={{ fontSize: '14px' }} />,
                                children: (
                                  <div style={{
                                    background: isSticky 
                                      ? (themeMode === 'dark' ? 'rgba(255, 77, 79, 0.05)' : '#fff1f0')
                                      : (themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9fafb'),
                                    border: `1px solid ${isSticky ? '#ffccc7' : (themeMode === 'dark' ? '#334155' : '#e5e7eb')}`,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginTop: '-6px',
                                    marginBottom: '10px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                      {isSticky && (
                                        <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                          <WarningOutlined /> Ghi chú quan trọng
                                        </span>
                                      )}
                                      {!isSticky && <span />}
                                      <span style={{ fontSize: '11.5px', color: '#888' }}>{formattedDate}</span>
                                    </div>
                                    <div style={{
                                      fontSize: '13.5px',
                                      marginTop: '6px',
                                      fontWeight: isSticky ? '500' : 'normal',
                                      color: themeMode === 'dark' ? '#e2e8f0' : '#1f2937',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {n.note}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#888', marginTop: '8px', borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`, paddingTop: '4px' }}>
                                      Tạo bởi: <strong>{n.staffName}</strong>
                                    </div>
                                  </div>
                                )
                              };
                            })}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
                            Không có nhật ký ghi chú nào.
                          </div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'calls',
                    label: `Lịch sử cuộc gọi (${calls.length})`,
                    children: (
                      <div style={{
                        maxHeight: 'calc(100vh - 240px)',
                        overflowY: 'auto',
                        padding: '10px 4px 10px 10px'
                      }}>
                        {calls.length > 0 ? (
                          <Timeline
                            items={calls.map((c: any) => {
                              const d = new Date(c.createdAt);
                              const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                              const dayPrefix = dayPrefixes[d.getDay()];
                              const formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;
                              
                              return {
                                key: c.id,
                                children: (
                                  <div style={{
                                    background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9fafb',
                                    border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginTop: '-6px',
                                    marginBottom: '10px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                      <Space>
                                        <Tag color={c.callType === 'OUTBOUND' ? 'blue' : 'purple'}>
                                          {c.callType === 'OUTBOUND' ? 'Gọi đi' : 'Gọi đến'}
                                        </Tag>
                                        <Tag color={
                                          c.callResult === 'ANSWERED' ? 'success' :
                                          c.callResult === 'NO_ANSWER' ? 'warning' : 'error'
                                        }>
                                          {c.callResult === 'ANSWERED' ? 'Đã nghe máy' :
                                           c.callResult === 'NO_ANSWER' ? 'Không nghe' : 'Bận/Bị chặn'}
                                        </Tag>
                                      </Space>
                                      <span style={{ fontSize: '11.5px', color: '#888' }}>{formattedDate}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', marginTop: '6px', color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563' }}>
                                      <strong>Nội dung cuộc gọi:</strong> {c.note || 'Không có ghi chú chi tiết'}
                                    </div>
                                    {c.outcome && (
                                      <div style={{ marginTop: '6px', fontSize: '12px' }}>
                                        Kết quả: <Tag color="cyan">{c.outcome}</Tag>
                                      </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`, paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Nhân viên cuộc gọi: <strong>{c.staffName}</strong></span>
                                      <span>Thời lượng: <strong>{c.durationSec ? `${c.durationSec}s` : '0s'}</strong></span>
                                    </div>
                                  </div>
                                )
                              };
                            })}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
                            Chưa có lịch sử cuộc gọi nào được ghi nhận.
                          </div>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </div>
            
          </div>
        )}
      </Spin>
      <RescheduleBookingModal
        open={rescheduleModalVisible}
        booking={selectedBookingForReschedule}
        onClose={() => {
          setRescheduleModalVisible(false);
          setSelectedBookingForReschedule(null);
        }}
        onSuccess={() => {
          fetchDetails();
        }}
      />

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            <span>💎 Lịch sử giao dịch Kim cương</span>
            {customer && <span style={{ fontSize: '13px', color: '#888', fontWeight: 'normal' }}>(Khách hàng: {customer.name})</span>}
          </div>
        }
        open={isGemModalOpen}
        onCancel={() => setIsGemModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsGemModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={gemModalWidth}
        styles={{
          body: { padding: '12px 0 0 0' }
        }}
        modalRender={(modal) => {
          if (React.isValidElement(modal)) {
            return React.cloneElement(modal as any, {
              style: {
                ...(modal.props as any)?.style,
                position: 'relative'
              },
              children: (
                <>
                  {(modal.props as any)?.children}
                  {/* Right edge drag handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: '-4px',
                      bottom: 0,
                      width: '8px',
                      cursor: 'ew-resize',
                      zIndex: 10000,
                      transition: 'background 0.2s'
                    }}
                    onMouseDown={(e) => handleGemModalDragStart(e, 'right')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  />
                  {/* Left edge drag handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '-4px',
                      bottom: 0,
                      width: '8px',
                      cursor: 'ew-resize',
                      zIndex: 10000,
                      transition: 'background 0.2s'
                    }}
                    onMouseDown={(e) => handleGemModalDragStart(e, 'left')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  />
                </>
              )
            });
          }
          return modal;
        }}
      >
        <Table
          dataSource={data?.gemTransactions || []}
          columns={gemColumns}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: 'Không có giao dịch kim cương nào.' }}
        />
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            <span>📦 Lịch sử mua Combo</span>
            {customer && <span style={{ fontSize: '13px', color: '#888', fontWeight: 'normal' }}>(Khách hàng: {customer.name})</span>}
          </div>
        }
        open={isComboModalOpen}
        onCancel={() => setIsComboModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsComboModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={modalWidth}
        styles={{
          body: { padding: '12px 0 0 0' }
        }}
        modalRender={(modal) => {
          if (React.isValidElement(modal)) {
            return React.cloneElement(modal as any, {
              style: {
                ...(modal.props as any)?.style,
                position: 'relative'
              },
              children: (
                <>
                  {(modal.props as any)?.children}
                  {/* Right edge drag handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: '-4px',
                      bottom: 0,
                      width: '8px',
                      cursor: 'ew-resize',
                      zIndex: 10000,
                      transition: 'background 0.2s'
                    }}
                    onMouseDown={(e) => handleModalDragStart(e, 'right')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  />
                  {/* Left edge drag handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '-4px',
                      bottom: 0,
                      width: '8px',
                      cursor: 'ew-resize',
                      zIndex: 10000,
                      transition: 'background 0.2s'
                    }}
                    onMouseDown={(e) => handleModalDragStart(e, 'left')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  />
                </>
              )
            });
          }
          return modal;
        }}
      >
        <Table
          dataSource={comboBalances}
          columns={comboHistoryColumns}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: 'Không có lịch sử mua combo nào.' }}
        />
      </Modal>
    </Drawer>
  );
};

export default CustomerDetailDrawer;
