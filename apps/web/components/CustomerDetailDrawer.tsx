'use client';

import React, { useMemo } from 'react';
import { Drawer, Spin, Avatar, Tag, Tabs, theme, Space, Button, Popconfirm, Tooltip, Form, message } from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  DeleteOutlined,
  UndoOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useTheme } from '../context/ThemeContext';
import { useOmiCall } from '../context/OmiCallContext';

const RescheduleBookingModal = dynamic(() => import('./RescheduleBookingModal').then((m) => m.RescheduleBookingModal), {
  ssr: false,
});
const BookingWizardDrawer = dynamic(() => import('./BookingWizardDrawer'), { ssr: false });
import { useCustomerDetail } from './customer-detail/hooks/useCustomerDetail';

// Sub-components
import { KpiStatsCard } from './customer-detail/components/KpiStatsCard';
import { ProfileDetailsCard } from './customer-detail/components/ProfileDetailsCard';
import { ComboBalancesCard } from './customer-detail/components/ComboBalancesCard';
import { ReferralCard } from './customer-detail/components/ReferralCard';
import { BookingsTab } from './customer-detail/components/BookingsTab';
import { NotesTab } from './customer-detail/components/NotesTab';
import { CallsTab } from './customer-detail/components/CallsTab';

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

interface CustomerDetailDrawerProps {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
  onBookAppointment?: (customer: SafeAny) => void;
  onDeleteSuccess?: () => void;
}

const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  open,
  customerId,
  onClose,
  onBookAppointment,
  onDeleteSuccess,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();

  const [editForm] = Form.useForm();

  const {
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
    fetchDetails,
    handleMouseDown,
    handleModalDragStart,
    handleGemModalDragStart,
    handleOpenEditModal,
    handleSaveEdit,
    handleDeleteCustomer,
    handleRestoreCustomer,
    handleCancelBooking,
    // helpers
    getMostFrequentDay,
    getFavoriteTechnicians,
    getComboDisplayInfo,
  } = useCustomerDetail({
    open,
    customerId,
    onClose,
    onDeleteSuccess,
    editForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const currentUser = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  }, []);

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
                  <span>Mã KH: {customer.id}</span>
                  {customer.email && <span>Email: {customer.email}</span>}
                </div>
              </div>
            </div>
            <Space>
              {currentUser?.role === 'admin' &&
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
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                style={{
                  background: '#D4A84B',
                  borderColor: '#D4A84B',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  if (onBookAppointment) {
                    onBookAppointment(customer);
                  } else {
                    setBookingWizardOpen(true);
                  }
                }}
              >
                Đặt Lịch Hẹn
              </Button>
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
                <KpiStatsCard stats={stats} themeMode={themeMode} onOpenGemModal={() => setIsGemModalOpen(true)} />

                <ProfileDetailsCard
                  customer={customer}
                  themeMode={themeMode}
                  bookings={bookings}
                  getMostFrequentDay={getMostFrequentDay}
                  getFavoriteTechnicians={getFavoriteTechnicians}
                />

                <ComboBalancesCard
                  comboBalances={comboBalances}
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
                <Tabs
                  defaultActiveKey="bookings"
                  items={[
                    {
                      key: 'bookings',
                      label: `Lịch sử đặt lịch (${bookings.length})`,
                      children: (
                        <BookingsTab
                          bookings={bookings}
                          themeMode={themeMode}
                          customer={customer}
                          handleCancelBooking={handleCancelBooking}
                          setSelectedBookingForReschedule={setSelectedBookingForReschedule}
                          setRescheduleModalVisible={setRescheduleModalVisible}
                        />
                      ),
                    },
                    {
                      key: 'notes',
                      label: `Nhật ký ghi chú (${notes.length})`,
                      children: <NotesTab notes={notes} themeMode={themeMode} />,
                    },
                    {
                      key: 'calls',
                      label: `Lịch sử cuộc gọi (${calls.length})`,
                      children: <CallsTab calls={calls} themeMode={themeMode} />,
                    },
                  ]}
                />
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
          fetchDetails();
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

      {bookingWizardOpen && (
        <BookingWizardDrawer
          open={bookingWizardOpen}
          onClose={() => setBookingWizardOpen(false)}
          onSuccess={() => {
            setBookingWizardOpen(false);
            fetchDetails();
          }}
          initialCustomer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            bucket: customer.bucket,
          }}
        />
      )}
    </Drawer>
  );
};

export default CustomerDetailDrawer;
