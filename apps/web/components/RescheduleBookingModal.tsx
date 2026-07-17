'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Steps, Button, Select, DatePicker, Input, theme, message, Card, Tag } from 'antd';
import { FormOutlined, HomeOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';

// Shared modules
import { STORES } from './booking/constants';
import { checkAndAppendLowerLashNote } from './booking/comboUtils';
import { useBookingStaff } from './booking/useBookingStaff';
import { useSlotMatrix } from './booking/useSlotMatrix';
import { useCustomerInsights } from './booking/useCustomerInsights';
import { TechnicianSelector } from './booking/TechnicianSelector';
import { SlotMatrixGrid } from './booking/SlotMatrixGrid';

const { TextArea } = Input;

interface RescheduleBookingModalProps {
  open: boolean;
  booking: SafeAny; // Contains id, bookingDate, bookingTime, branchName, technicianName, technicianId, bookingNote
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  open,
  booking,
  onClose,
  onSuccess,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields State
  const [selectedCN, setSelectedCN] = useState<SafeAny>(null); // Branch/Store
  const [selectedCV, setSelectedCV] = useState<SafeAny>(null); // KTV
  const [bookingNote, setBookingNote] = useState('');

  // Dropdown data options
  const [services, setServices] = useState<SafeAny[]>([]);
  const [selectedService, setSelectedService] = useState<SafeAny>(null);

  // Re-use Customer details hook (simulating a selected customer)
  const selectedCustomer = booking?.customerId ? { id: booking.customerId } : null;
  const { favoriteTechs, comboBalances, suggestedServices, suggestedBranch } = useCustomerInsights(
    selectedCustomer,
    selectedCN,
    setSelectedCN
  );

  // Re-use Booking Staff hook
  const { loadingStaff, fetchStaff, getGroupedKTVs, getFavoriteKTVs, setStaffList, setLoadingStaff } = useBookingStaff(
    null,
    favoriteTechs
  );

  // Re-use Slot Matrix hook
  const {
    bookingDate,
    setBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    fetchSlots,
    getNextAvailableDate,
    getCategorizedSlots,
  } = useSlotMatrix(selectedCN, selectedCV);

  const { morning, afternoon, night } = getCategorizedSlots();

  // Load Services
  const fetchServices = async () => {
    try {
      const list = (await apiClient.customers.getServices()) || [];
      setServices(list);

      if (booking?.services && booking.services.length > 0) {
        const currentSrvName = booking.services[0];
        const matched = list.find((s: SafeAny) => s.name.toLowerCase() === currentSrvName.toLowerCase());
        if (matched) {
          setSelectedService(matched);
        } else {
          setSelectedService({ id: 0, name: currentSrvName, price: 0, duration: 90 });
        }
      }
    } catch (err) {
      console.error('[Reschedule] Failed to fetch services:', err);
    }
  };

  // Initialize fields on open
  useEffect(() => {
    if (open && booking) {
      setCurrentStep(0);
      setSelectedCV(null);
      fetchServices();

      // Map branch name to store object
      const matchedStore =
        STORES.find((s) => s.name === booking.branchName || booking.branchName?.includes(s.name)) || STORES[0];
      setSelectedCN(matchedStore);

      // Set date & note & slot
      setBookingDate(booking.bookingDate ? dayjs(booking.bookingDate) : dayjs().add(1, 'day'));
      setBookingNote(booking.bookingNote || '');
      setSelectedSlot(booking.bookingTime || null);

      // Fetch staff directory
      const dateStr = booking.bookingDate
        ? dayjs(booking.bookingDate).format('YYYY-MM-DD')
        : dayjs().add(1, 'day').format('YYYY-MM-DD');

      setLoadingStaff(true);
      apiClient.customers
        .getStaff({ date: dateStr })
        .then((staff) => {
          const list = staff || [];
          setStaffList(list);
          if (booking.technicianId) {
            const found = list.find((s: SafeAny) => Number(s.id) === Number(booking.technicianId));
            if (found) {
              setSelectedCV(found);
            } else {
              setSelectedCV({ id: booking.technicianId, displayName: booking.technicianName || 'KTV cũ' });
            }
          }
        })
        .catch((err) => console.error('[Reschedule] Fetch staff failed:', err))
        .finally(() => setLoadingStaff(false));
    }
  }, [open, booking]);

  // Fetch slot matrix when dependencies change
  useEffect(() => {
    if (open && selectedCN && currentStep === 1) {
      fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open, currentStep]);

  // Re-fetch staff directory when booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  const selectCVOption = (cv: SafeAny) => {
    setSelectedCV(cv);
    // Auto map branch/store if KTV belongs to a store
    if (cv && cv.notes) {
      const matchedStore = STORES.find((s) => s.name === cv.notes) || STORES[0];
      setSelectedCN(matchedStore);
    }
    // Auto adjust booking date if current date is specialist's off day
    if (cv && cv.offDays && cv.offDays.length > 0) {
      const dayOfWeek = bookingDate.day();
      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      if (cv.offDays.includes(dbDayStr)) {
        const adjustedDate = getNextAvailableDate(bookingDate, cv);
        setBookingDate(adjustedDate);
        message.info(
          `Đã tự động chuyển ngày sang ngày làm việc tiếp theo của chuyên viên: ${adjustedDate.format('DD/MM/YYYY')}`
        );
      }
    }
    setCurrentStep(1);
  };

  const handleReschedule = async () => {
    if (!selectedCN) {
      message.error('Vui lòng chọn chi nhánh');
      return;
    }
    if (!selectedSlot) {
      message.error('Vui lòng chọn khung giờ trống');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        storeId: selectedCN.id,
        storeName: selectedCN.name,
        technicianId: selectedCV?.id || null,
        technicianName: selectedCV?.displayName || 'Chuyên viên tự do',
        bookingDate: bookingDate.format('YYYY-MM-DD'),
        bookingTime: selectedSlot,
        bookingNote: checkAndAppendLowerLashNote(bookingNote, comboBalances),
        serviceId: selectedService?.id || null,
      };

      await apiClient.customers.updateBooking(booking.id, payload);
      message.success('Dời lịch hẹn thành công!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[Reschedule] Submit failed:', err);
      message.error((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi dời lịch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D4A84B' }}>
          <FormOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>QUY TRÌNH DỜI LỊCH HẸN KHÁCH HÀNG</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={560}
      destroyOnClose
      styles={{
        body: {
          padding: '24px',
          background: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
        },
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <Steps
          size="small"
          current={currentStep}
          onChange={(step) => setCurrentStep(step)}
          items={[{ title: 'Chuyên viên' }, { title: 'Dịch vụ & KH & Khung giờ' }, { title: 'Xác nhận' }]}
          style={{ marginBottom: '24px' }}
        />
      </div>

      {/* STEP 0: SPECIALIST SELECT */}
      {currentStep === 0 && (
        <TechnicianSelector
          selectedCV={selectedCV}
          onSelectCVOption={selectCVOption}
          favoriteTechs={favoriteTechs}
          getFavoriteKTVs={getFavoriteKTVs}
          getGroupedKTVs={getGroupedKTVs}
          loadingStaff={loadingStaff}
          themeMode={themeMode}
        />
      )}

      {/* STEP 1: SERVICE & SLOT SELECT */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Store select */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <HomeOutlined /> CHI NHÁNH ĐẶT LỊCH (CN)
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STORES.map((s) => {
                const isSelected = selectedCN?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedCN(s)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      background: isSelected ? '#D4A84B' : themeMode === 'dark' ? '#1e293b' : '#f3f4f6',
                      border: `1px solid ${isSelected ? '#D4A84B' : themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                      color: isSelected ? '#fff' : themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{s.name}</span>
                    {suggestedBranch?.id === s.id && (
                      <Tag
                        color={isSelected ? 'magenta' : 'orange'}
                        style={{
                          marginLeft: '6px',
                          marginRight: 0,
                          fontSize: '10px',
                          padding: '0 6px',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        💖 Hay đi
                      </Tag>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedCV && (
              <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '6px' }}>
                * Đang gợi ý chi nhánh làm việc chính của <strong>{selectedCV.displayName}</strong>.
              </div>
            )}
          </div>

          {/* Customer Information (Read-only Card) */}
          <Card
            title={<span style={{ fontSize: '13px', color: '#888' }}>THÔNG TIN KHÁCH HÀNG</span>}
            size="small"
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
          >
            <div style={{ fontSize: '13px', color: token.colorText }}>
              <span style={{ fontWeight: 'bold' }}>{booking?.customerName || 'Khách hàng'}</span> -{' '}
              {booking?.customerPhone || 'Không có SĐT'}
            </div>
          </Card>

          {/* Service Selector */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <InboxOutlined /> DỊCH VỤ (SERVICE)
            </h4>
            <Select
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              style={{ width: '100%' }}
              placeholder="Chọn hoặc tìm dịch vụ..."
              value={selectedService?.id}
              onChange={(val) => {
                const srv = services.find((s) => s.id === val);
                setSelectedService(srv);
              }}
              options={services.map((s) => ({
                value: s.id,
                label:
                  s.id === 0
                    ? `${s.name} (${s.duration} phút)`
                    : `${s.name} - ${s.price.toLocaleString('vi-VN')}đ (${s.duration} phút)`,
              }))}
            />

            {/* Favorite Service Suggestion */}
            {suggestedServices.filter((sName) =>
              services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
            ).length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>⭐ Dòng mi khách hay đi nhất: </span>
                {suggestedServices
                  .filter((sName) =>
                    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
                  )
                  .map((sName) => (
                    <span
                      key={sName}
                      style={{
                        color: themeMode === 'dark' ? '#ffa940' : '#d87a16',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginLeft: '4px',
                      }}
                      onClick={() => {
                        const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                        if (matchedSrv) {
                          setSelectedService(matchedSrv);
                          message.success(`Đã chọn dòng mi hay dùng: ${matchedSrv.name}`);
                        }
                      }}
                    >
                      {sName}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '6px 0' }} />

          {/* Date & Slot select matrix */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>Ngày đặt:</span>
                <DatePicker
                  style={{ marginLeft: '8px' }}
                  value={bookingDate}
                  onChange={(val) => {
                    if (val) setBookingDate(val);
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabledDate={(current) => {
                    if (current && current.isBefore(dayjs().startOf('day'))) {
                      return true;
                    }
                    if (selectedCV && selectedCV.offDays && selectedCV.offDays.length > 0) {
                      const dayOfWeek = current.day();
                      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
                      if (selectedCV.offDays.includes(dbDayStr)) {
                        return true;
                      }
                    }
                    return false;
                  }}
                />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {bookingDate.format('dddd (DD/MM/YYYY)')}
              </div>
            </div>

            <SlotMatrixGrid
              slotMatrix={slotMatrix}
              loadingSlots={loadingSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              selectedCN={selectedCN}
              morning={morning}
              afternoon={afternoon}
              night={night}
              themeMode={themeMode}
            />
          </div>

          <Button
            type="primary"
            onClick={() => setCurrentStep(2)}
            disabled={!selectedCN || !selectedSlot || !selectedService}
            style={{ marginTop: '10px', width: '100%' }}
          >
            Tiếp tục: Nhập ghi chú & Xác nhận
          </Button>
        </div>
      )}

      {/* STEP 2: CONFIRM & BOOK */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card
            title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>TỔNG HỢP THÔNG TIN DỜI LỊCH HẸN</span>}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: '#888' }}>Khách hàng:</span> <strong>{booking?.customerName}</strong> (
                {booking?.customerPhone})
              </div>
              <div>
                <span style={{ color: '#888' }}>Chi nhánh mới:</span> <strong>{selectedCN?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Chuyên viên:</span>{' '}
                <strong>{selectedCV ? selectedCV.displayName : 'Chuyên viên tự do'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Dịch vụ:</span> <strong>{selectedService?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Giờ hẹn mới:</span> <strong>{selectedSlot}</strong> ngày{' '}
                <strong>{bookingDate.format('DD/MM/YYYY')}</strong>
              </div>
            </div>
          </Card>

          {/* Booking note */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>GHI CHÚ ĐẶT LỊCH (BOOKING NOTE)</h4>
            <TextArea
              rows={4}
              placeholder="Nhập các ghi chú đặc biệt từ khách hàng..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <Button style={{ flex: 1 }} onClick={() => setCurrentStep(1)}>
              Quay lại
            </Button>
            <Button
              type="primary"
              loading={submitting}
              style={{ flex: 2, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleReschedule}
            >
              Xác nhận Dời Lịch
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
export default RescheduleBookingModal;
