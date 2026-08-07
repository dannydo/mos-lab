'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Drawer, Spin, Avatar, Tabs, theme, Space, Button, Popconfirm, Tooltip, Form, message } from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  DeleteOutlined,
  UndoOutlined,
  EditOutlined,
  FormOutlined,
  PushpinFilled,
  PushpinOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useTheme } from '../context/ThemeContext';
import { useOmiCall } from '../context/OmiCallContext';

const RescheduleBookingModal = dynamic(() => import('./RescheduleBookingModal').then((m) => m.RescheduleBookingModal), {
  ssr: false,
});
const BookingWizardDrawer = dynamic(() => import('./BookingWizardDrawer'), { ssr: false });
import CalendarPlusIcon from './icons/CalendarPlusIcon';
import { useCustomerDetail } from './customer-detail/hooks/useCustomerDetail';

// Sub-components
import { KpiStatsCard } from './customer-detail/components/KpiStatsCard';
import { ProfileDetailsCard } from './customer-detail/components/ProfileDetailsCard';
import { BookingHabitsCard } from './customer-detail/components/BookingHabitsCard';
import { ComboBalancesCard } from './customer-detail/components/ComboBalancesCard';
import { ReferralCard } from './customer-detail/components/ReferralCard';
import { BookingsTab } from './customer-detail/components/BookingsTab';
import { NotesTab } from './customer-detail/components/NotesTab';
import { CallsTab } from './customer-detail/components/CallsTab';
import { TimelineViewTab } from './customer-detail/components/TimelineViewTab';
import { CustomerAssignmentTimeline } from './customer-detail/components/CustomerAssignmentTimeline';

const GemHistoryModal = dynamic(
  () => import('./customer-detail/components/GemHistoryModal').then((m) => m.GemHistoryModal),
  { ssr: false }
);
const ComboHistoryModal = dynamic(
  () => import('./customer-detail/components/ComboHistoryModal').then((m) => m.ComboHistoryModal),
  { ssr: false }
);
const EditCustomerModal = dynamic(
  () => import('./customer-detail/components/EditCustomerModal').then((m) => m.EditCustomerModal),
  { ssr: false }
);
const CreateNoteModal = dynamic(
  () => import('./customer-detail/components/CreateNoteModal').then((m) => m.CreateNoteModal),
  { ssr: false }
);
const TipHistoryModal = dynamic(
  () => import('./customer-detail/components/TipHistoryModal').then((m) => m.TipHistoryModal),
  { ssr: false }
);
const RevenueHistoryModal = dynamic(
  () => import('./customer-detail/components/RevenueHistoryModal').then((m) => m.RevenueHistoryModal),
  { ssr: false }
);

interface CustomerDetailDrawerProps {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
  onBookAppointment?: (customer: SafeAny) => void;
  onDeleteSuccess?: () => void;
  onUpdate?: () => void;
}

const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  open,
  customerId,
  onClose,
  onBookAppointment,
  onDeleteSuccess,
  onUpdate,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();

  const [editForm] = Form.useForm();

  const {
    activeTab,
    tabDataMap,
    handleTabChange: hookTabChange,
    fetchTabData,
    counts,
    loading,
    data,
    rescheduleModalVisible,
    selectedBookingForReschedule,
    isGemModalOpen,
    isComboModalOpen,
    bookingWizardOpen,
    deleteLoading,
    isEditModalOpen,
    saveLoading,
    restoreLoading,
    forbiddenError,
    drawerWidth,
    isDragging,
    modalWidth,
    gemModalWidth,
    isTipModalOpen,
    tipModalWidth,
    isRevenueModalOpen,
    revenueModalWidth,
    // data items

    customer,
    stats,
    comboBalances,
    bookings,
    notes,
    calls,
    // handlers
    setRescheduleModalVisible,
    setSelectedBookingForReschedule,
    setIsGemModalOpen,
    setIsComboModalOpen,
    setBookingWizardOpen,
    setIsEditModalOpen,
    setIsTipModalOpen,
    setIsRevenueModalOpen,
    fetchDetails,
    refetchTabData,
    refreshAllDetails,
    handleMouseDown,

    handleModalDragStart,
    handleGemModalDragStart,
    handleTipModalDragStart,
    handleRevenueModalDragStart,
    handleOpenEditModal,

    handleSaveEdit,
    handleDeleteCustomer,
    handleRestoreCustomer,
    handleCancelBooking,
    handleUnpinNote,
    handlePinToggle,
    unpinLoading,
    // helpers
    getMostFrequentDay,
    getFavoriteTechnicians,
    getComboDisplayInfo,
    getFavoriteBranch,
    getRecentTechnician,
    getFavoriteTimeSlot,
    getRecentVisitTime,
  } = useCustomerDetail({
    open,
    customerId,
    onClose,
    onDeleteSuccess,
    onUpdate,
    editForm,
  });

  const currentUser = useMemo(() => {
    if (typeof window !== 'undefined') {
      const userStr =
        localStorage.getItem('mos_user') || localStorage.getItem('user') || localStorage.getItem('crm_user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          // ignore
        }
      }
    }
    return null;
  }, []);

  const isManagerOrAdmin = useMemo(() => {
    const role = currentUser?.role?.toLowerCase();
    return role === 'admin' || role === 'manager';
  }, [currentUser]);

  const [activeTabKey, setActiveTabKey] = useState<string>('bookings');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const hookTabChangeRef = useRef(hookTabChange);
  hookTabChangeRef.current = hookTabChange;

  const prevOpenRef = useRef(false);
  // Sync tab with localStorage on mount & open changes
  useEffect(() => {
    if (open && !prevOpenRef.current && typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_detail_active_tab') || 'bookings';
      setActiveTabKey(saved);
      if (saved !== 'bookings') {
        hookTabChangeRef.current?.(saved);
      }
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    hookTabChange(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('customer_detail_active_tab', key);
    }
  };

  const timelineCount = useMemo(() => {
    const bookingIdsWithNotes = new Set<string>();

    bookings.forEach((b: SafeAny) => {
      if (b.bookingNote && b.bookingNote.trim() !== '') {
        bookingIdsWithNotes.add(String(b.id));
      }
    });

    const findClosestBooking = (dateStr: string | null) => {
      if (!dateStr || bookings.length === 0) return null;
      const targetTime = new Date(dateStr).getTime();
      let closestBooking: SafeAny = null;
      let minDiff = Infinity;

      bookings.forEach((b: SafeAny) => {
        if (!b.bookingDate) return;
        const diff = Math.abs(new Date(b.bookingDate).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestBooking = b;
        }
      });

      if (minDiff <= 432000000) {
        return closestBooking;
      }
      return null;
    };

    if (notes.length === 0 && calls.length === 0) {
      return bookingIdsWithNotes.size;
    }

    let hasGeneralNotes = false;

    notes.forEach((n: SafeAny) => {
      let targetBookingId = n.orderId ? String(n.orderId) : null;
      if (!targetBookingId) {
        const closest = findClosestBooking(n.dateCreated);
        if (closest) targetBookingId = String(closest.id);
      }
      if (targetBookingId) {
        bookingIdsWithNotes.add(targetBookingId);
      } else {
        hasGeneralNotes = true;
      }
    });

    calls.forEach((c: SafeAny) => {
      if (!c.note || c.note.trim() === '') return;
      const closest = findClosestBooking(c.createdAt);
      const targetBookingId = closest ? String(closest.id) : null;
      if (targetBookingId) {
        bookingIdsWithNotes.add(targetBookingId);
      } else {
        hasGeneralNotes = true;
      }
    });

    return bookingIdsWithNotes.size + (hasGeneralNotes ? 1 : 0);
  }, [bookings, notes, calls]);

  const activePhone = useMemo(() => {
    if (!customer) return '';
    if (customer.phones && customer.phones.length > 0) {
      const enabled = customer.phones.find((p: SafeAny) => !p.is_disabled);
      if (enabled && enabled.phone_number) return enabled.phone_number;
      if (customer.phones[0] && customer.phones[0].phone_number) return customer.phones[0].phone_number;
    }
    return customer.phone || '';
  }, [customer]);

  const getLegacyDomain = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
        return 'http://localhost';
      }
    }
    return 'https://wingslashes.com';
  };

  const domain = getLegacyDomain();
  const phoneToUse = activePhone || customer?.phone || '';
  const legacyProfileUrl = phoneToUse
    ? `${domain}/admin/customer-support/user/customer?phone=${encodeURIComponent(phoneToUse)}`
    : `${domain}/admin/customer-support/user/customer?id=${customer?.id || ''}`;

  const activeBookings = useMemo(() => {
    return tabDataMap['bookings']?.items || bookings || [];
  }, [tabDataMap, bookings]);

  return (
    <Drawer
      title={
        customer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingRight: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar
                size={40}
                src={customer.avatar || undefined}
                icon={!customer.avatar && <UserOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#334155' : '#D4A84B',
                  border: `2px solid ${themeMode === 'dark' ? '#475569' : '#ffffff'}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: themeMode === 'dark' ? '#ffffff' : '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {customer.name}
                  <span style={{ color: '#D4A84B', fontSize: '14px' }}>⭐⭐⭐⭐•</span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#888',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {customer.phones && customer.phones.length > 0 ? (
                      customer.phones.map((phoneObj: SafeAny) => (
                        <span
                          key={phoneObj.id}
                          className={`inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text ${phoneObj.is_disabled ? 'opacity-50 line-through' : ''}`}
                          onClick={() =>
                            !phoneObj.is_disabled &&
                            makeCall(phoneObj.phone_number, customer.name, customer.id, customer.avatar || undefined)
                          }
                          style={{
                            fontSize: '12px',
                            color: phoneObj.is_disabled ? token.colorTextDisabled : token.colorText,
                            fontWeight: phoneObj.is_disabled ? 'normal' : '600',
                          }}
                        >
                          <PhoneOutlined style={{ color: phoneObj.is_disabled ? '#bbb' : '#D4A84B' }} />
                          <span>
                            {phoneObj.phone_number} {phoneObj.is_disabled && '(Vô hiệu hóa)'}
                          </span>
                        </span>
                      ))
                    ) : customer.phone ? (
                      <span
                        className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
                        onClick={() =>
                          makeCall(customer.phone, customer.name, customer.id, customer.avatar || undefined)
                        }
                        style={{ fontSize: '12px', color: token.colorText, fontWeight: '600' }}
                      >
                        <PhoneOutlined style={{ color: '#D4A84B' }} />
                        <span>{customer.phone}</span>
                      </span>
                    ) : (
                      <span>
                        <PhoneOutlined /> -
                      </span>
                    )}
                  </div>
                  <Tooltip title="Mở hồ sơ trên hệ thống Legacy">
                    <a
                      href={legacyProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: themeMode === 'dark' ? '#60a5fa' : '#2563eb',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: themeMode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
                        border: `1px solid ${themeMode === 'dark' ? 'rgba(96, 165, 250, 0.3)' : '#bfdbfe'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <ExportOutlined style={{ fontSize: '12px' }} />
                    </a>
                  </Tooltip>
                  {customer.email && <span>Email: {customer.email}</span>}
                  {customer.dob && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🎂 {dayjs(customer.dob).format('DD/MM/YYYY')}
                      {customer.age !== undefined && customer.age !== null && (
                        <span
                          style={{
                            background: themeMode === 'dark' ? '#262626' : '#e6f7ff',
                            color: themeMode === 'dark' ? '#1890ff' : '#096dd9',
                            padding: '0 6px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {customer.age} tuổi
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Space>
              {isManagerOrAdmin &&
                (customer.isDeleted ? (
                  <Popconfirm
                    title="Khôi phục khách hàng"
                    description="Bạn có chắc chắn muốn khôi phục khách hàng này?"
                    onConfirm={handleRestoreCustomer}
                    okText="Khôi phục"
                    cancelText="Hủy"
                    okButtonProps={{ loading: restoreLoading }}
                  >
                    <Tooltip title="Khôi Phục Khách Hàng">
                      <Button
                        type="primary"
                        icon={<UndoOutlined />}
                        style={{ fontWeight: 'bold', background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                      />
                    </Tooltip>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title="Xóa khách hàng"
                    description="Bạn có chắc chắn muốn xóa khách hàng này không? Khách hàng sẽ bị chuyển vào thùng rác."
                    onConfirm={handleDeleteCustomer}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, loading: deleteLoading }}
                  >
                    <Tooltip title="Xóa Khách Hàng">
                      <Button danger type="dashed" icon={<DeleteOutlined />} style={{ fontWeight: 'bold' }} />
                    </Tooltip>
                  </Popconfirm>
                ))}
              <Tooltip title="Sửa Thông Tin">
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  style={{
                    fontWeight: 'bold',
                    borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
                    color: themeMode === 'dark' ? '#fff' : '#1f2937',
                  }}
                  onClick={handleOpenEditModal}
                />
              </Tooltip>
              <Tooltip title="Thêm Ghi Chú">
                <Button
                  type="default"
                  icon={<FormOutlined />}
                  style={{
                    fontWeight: 'bold',
                    borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
                    color: themeMode === 'dark' ? '#fff' : '#1f2937',
                  }}
                  onClick={() => setIsNoteModalOpen(true)}
                />
              </Tooltip>
              <Tooltip title="Đặt Lịch Hẹn">
                <Button
                  type="primary"
                  icon={<CalendarPlusIcon fontSize={18} />}
                  style={{
                    background: '#D4A84B',
                    borderColor: '#D4A84B',
                    height: '36px',
                    width: '36px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(212, 168, 75, 0.3)',
                  }}
                  onClick={() => {
                    if (onBookAppointment) {
                      onBookAppointment(customer);
                    } else {
                      setBookingWizardOpen(true);
                    }
                  }}
                />
              </Tooltip>
            </Space>
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
          padding: '24px',
        },
        header: {
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
        },
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
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(212, 168, 75, 0.3)';
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.background = 'transparent';
        }}
      />
      <Spin spinning={loading}>
        {forbiddenError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              padding: '40px 20px',
              textAlign: 'center',
              background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
              borderRadius: '12px',
              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#fff' : '#1f2937',
                marginBottom: '8px',
              }}
            >
              Quyền Truy Cập Bị Hạn Chế
            </h3>
            <p style={{ fontSize: '14px', color: '#888', maxWidth: '400px', marginBottom: '24px', lineHeight: '1.5' }}>
              {forbiddenError}
            </p>
            <Button
              type="primary"
              onClick={onClose}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', fontWeight: 'bold', borderRadius: '6px' }}
            >
              Đóng cửa sổ
            </Button>
          </div>
        ) : (
          customer && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
              {/* SIDEBAR: Info & Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <KpiStatsCard
                  stats={stats}
                  themeMode={themeMode}
                  onOpenGemModal={() => setIsGemModalOpen(true)}
                  onOpenTipModal={() => setIsTipModalOpen(true)}
                  onOpenRevenueModal={() => setIsRevenueModalOpen(true)}
                />

                <ProfileDetailsCard customer={customer} themeMode={themeMode} />

                <BookingHabitsCard
                  themeMode={themeMode}
                  bookings={activeBookings}
                  getFavoriteBranch={getFavoriteBranch}
                  getFavoriteTechnicians={getFavoriteTechnicians}
                  getRecentTechnician={getRecentTechnician}
                  getMostFrequentDay={getMostFrequentDay}
                  getFavoriteTimeSlot={getFavoriteTimeSlot}
                  getRecentVisitTime={getRecentVisitTime}
                />

                <ComboBalancesCard
                  comboBalances={comboBalances}
                  customerName={customer?.name || ''}
                  themeMode={themeMode}
                  getComboDisplayInfo={getComboDisplayInfo}
                  onOpenComboModal={() => setIsComboModalOpen(true)}
                />

                <ReferralCard data={data} themeMode={themeMode} />
              </div>

              {/* MAIN PANEL: Timelines & History */}
              <div
                style={{
                  background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                  border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  minHeight: '600px',
                }}
              >
                {/* Pinned / Sticky Notes Alert Box */}
                {notes && notes.some((n: SafeAny) => n.isSticky) && (
                  <div
                    style={{
                      background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : '#fff1f0',
                      border: `1px solid ${themeMode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#ffccc7'}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <PushpinFilled style={{ color: '#ff4d4f', fontSize: '15px' }} />
                      <strong
                        style={{
                          color: themeMode === 'dark' ? '#f87171' : '#cf1322',
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Ghi chú quan trọng
                      </strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {notes
                        .filter((n: SafeAny) => n.isSticky)
                        .map((n: SafeAny) => {
                          let formattedDate = '';
                          if (n.dateCreated) {
                            const d = new Date(n.dateCreated);
                            formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                          }
                          return (
                            <div
                              key={n.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '12px',
                                borderLeft: `2px solid ${themeMode === 'dark' ? 'rgba(239, 68, 68, 0.4)' : '#ffa39e'}`,
                                paddingLeft: '10px',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    whiteSpace: 'pre-wrap',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: themeMode === 'dark' ? '#cbd5e1' : '#3f3f46',
                                    lineHeight: '1.5',
                                  }}
                                >
                                  {n.note}
                                </div>
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                  Bởi: <strong>{n.staffName}</strong> ({formattedDate})
                                </div>
                              </div>
                              {isManagerOrAdmin && (
                                <Tooltip title="Bỏ ghim ghi chú">
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<PushpinOutlined style={{ fontSize: '14px' }} />}
                                    loading={unpinLoading}
                                    onClick={() => handleUnpinNote(n.id)}
                                    style={{
                                      padding: '0 4px',
                                      height: '22px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                {(() => {
                  const activeBookings = tabDataMap['bookings']?.items || bookings || [];
                  const activeNotes = tabDataMap['notes']?.items || notes || [];
                  const activeCalls = tabDataMap['calls']?.items || calls || [];

                  const bCount = Math.max(counts?.bookingCount ?? 0, activeBookings.length);
                  const nCount = Math.max(counts?.noteCount ?? 0, activeNotes.length);
                  const cCount = Math.max(counts?.callCount ?? 0, activeCalls.length);

                  return (
                    <Tabs
                      activeKey={activeTabKey}
                      onChange={handleTabChange}
                      items={[
                        {
                          key: 'bookings',
                          label: `Lịch sử đặt lịch (${bCount})`,
                          children: (
                            <BookingsTab
                              bookings={activeBookings}
                              notes={activeNotes}
                              themeMode={themeMode}
                              customer={customer}
                              handleCancelBooking={handleCancelBooking}
                              setSelectedBookingForReschedule={setSelectedBookingForReschedule}
                              setRescheduleModalVisible={setRescheduleModalVisible}
                              loading={tabDataMap['bookings']?.loading}
                              hasMore={tabDataMap['bookings']?.hasMore}
                              onLoadMore={() => fetchTabData('bookings', (tabDataMap['bookings']?.page || 1) + 1, true)}
                              onRefreshDetails={refreshAllDetails}
                            />
                          ),
                        },
                        {
                          key: 'timeline',
                          label: `Tổng hợp ghi chú (${nCount})`,
                          children: (
                            <TimelineViewTab
                              bookings={activeBookings}
                              notes={activeNotes}
                              calls={activeCalls}
                              themeMode={themeMode}
                            />
                          ),
                        },
                        {
                          key: 'notes',
                          label: `Nhật ký ghi chú (${nCount})`,
                          children: (
                            <NotesTab
                              notes={activeNotes}
                              themeMode={themeMode}
                              currentUser={currentUser}
                              onPinToggle={handlePinToggle}
                              unpinLoading={unpinLoading}
                              loading={tabDataMap['notes']?.loading}
                              hasMore={tabDataMap['notes']?.hasMore}
                              onLoadMore={() => fetchTabData('notes', (tabDataMap['notes']?.page || 1) + 1, true)}
                            />
                          ),
                        },
                        {
                          key: 'calls',
                          label: `Lịch sử cuộc gọi (${cCount})`,
                          children: (
                            <CallsTab
                              calls={activeCalls}
                              themeMode={themeMode}
                              loading={tabDataMap['calls']?.loading}
                              hasMore={tabDataMap['calls']?.hasMore}
                              onLoadMore={() => fetchTabData('calls', (tabDataMap['calls']?.page || 1) + 1, true)}
                            />
                          ),
                        },
                        {
                          key: 'assignment-timeline',
                          label: `Lịch sử Phân bổ`,
                          children: <CustomerAssignmentTimeline customerId={customer.id} />,
                        },
                      ]}
                    />
                  );
                })()}
              </div>
            </div>
          )
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
          refreshAllDetails();
        }}
      />

      <GemHistoryModal
        open={isGemModalOpen}
        onCancel={() => setIsGemModalOpen(false)}
        customer={customer}
        gemTransactions={data?.gemTransactions || []}
        gemModalWidth={gemModalWidth}
        handleGemModalDragStart={handleGemModalDragStart}
      />

      <TipHistoryModal
        open={isTipModalOpen}
        onCancel={() => setIsTipModalOpen(false)}
        customer={customer}
        tipTransactions={data?.tipTransactions || []}
        modalWidth={tipModalWidth}
        handleModalDragStart={handleTipModalDragStart}
      />

      <RevenueHistoryModal
        open={isRevenueModalOpen}
        onCancel={() => setIsRevenueModalOpen(false)}
        customer={customer}
        revenueTransactions={data?.revenueTransactions || []}
        modalWidth={revenueModalWidth}
        handleModalDragStart={handleRevenueModalDragStart}
      />

      <ComboHistoryModal
        open={isComboModalOpen}
        onCancel={() => setIsComboModalOpen(false)}
        customer={customer}
        comboBalances={comboBalances}
        modalWidth={modalWidth}
        handleModalDragStart={handleModalDragStart}
      />

      <EditCustomerModal
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleSaveEdit}
        confirmLoading={saveLoading}
        form={editForm}
      />

      <CreateNoteModal
        open={isNoteModalOpen}
        customerId={customer ? customer.id : null}
        onCancel={() => setIsNoteModalOpen(false)}
        onSuccess={() => {
          setIsNoteModalOpen(false);
          refreshAllDetails();
        }}
      />

      {bookingWizardOpen && (
        <BookingWizardDrawer
          open={bookingWizardOpen}
          onClose={() => setBookingWizardOpen(false)}
          onSuccess={() => {
            setBookingWizardOpen(false);
            refreshAllDetails();
          }}
          initialCustomer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            bucket: customer.bucket,
            lastVisit: customer.lastVisit,
            lastCompletedVisit: (customer as SafeAny)?.lastCompletedVisit || customer.lastVisit,
          }}
        />
      )}
    </Drawer>
  );
};

export default CustomerDetailDrawer;
