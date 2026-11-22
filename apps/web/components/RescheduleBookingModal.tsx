'use client';
// Mandatory Customer Phone Number Display Enforced

import React from 'react';
import { Button, Select, Input, theme, message, Card, Tag } from 'antd';
import {
  HomeOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { vietnameseSearchFilter, SafeAny } from '@mos-lab/shared';
import { useTheme } from '../context/ThemeContext';
import { CvDatePicker } from './booking/CvDatePicker';
import { STORES, isStaffOffOnDate, formatOrGenerateCustomerPhone } from './booking/constants';
import { SlotMatrixGrid } from './booking/SlotMatrixGrid';
import { AdaptiveDrawer } from './ui/AdaptiveOverlay';
import { CopyPhoneButton } from './ui';
import CalendarRescheduleIcon from './icons/CalendarRescheduleIcon';
import { useResponsiveTier } from '../hooks/useResponsiveTier';
import { useRescheduleBookingForm } from './booking/reschedule/useRescheduleBookingForm';
import { RescheduleTemplateSection } from './booking/reschedule/RescheduleTemplateSection';
import { RescheduleConfirmationModals } from './booking/reschedule/RescheduleConfirmationModals';

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
  const responsiveTier = useResponsiveTier();
  const isCompact = responsiveTier === 'mobile' || responsiveTier === 'tablet';

  const form = useRescheduleBookingForm({ open, booking, onClose, onSuccess });
  const {
    submitting,
    submitError,
    setSubmitError,
    selectedCN,
    setSelectedCN,
    selectedCV,
    setSelectedCV,
    bookingNote,
    setBookingNote,
    services,
    selectedService,
    setSelectedService,
    selectedPromotionSelection,
    setSelectedPromotionSelection,
    visiblePromotionOptions,
    favoriteTechs,
    suggestedServices,
    suggestedBranch,
    staffList,
    loadingStaff,
    favoriteKTVs,
    bookingDate,
    setBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    morning,
    afternoon,
    night,
    isLateSlotModalOpen,
    setIsLateSlotModalOpen,
    pendingSlot,
    setPendingSlot,
    isOffDayWarningOpen,
    setIsOffDayWarningOpen,
    offDayStaffInfo,
    checkAndHandleOffDay,
    handleSelectSlot,
    selectCVOption,
    handleReschedule,
    templates,
  } = form;

  return (
    <AdaptiveDrawer
      intent="form"
      className="booking-reschedule-overlay"
      width={isCompact ? '100%' : 720}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D4A84B' }}>
          <CalendarRescheduleIcon fontSize={18} />
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>ĐỔI LỊCH & CẬP NHẬT LỊCH HẸN</span>
          {booking?.orderKey && (
            <Tag color="gold" style={{ fontWeight: 600, margin: 0 }} className="tabular-nums">
              #{booking.orderKey}
            </Tag>
          )}
          <span
            id="off-day-modal-debug-tag"
            data-is-open={String(isOffDayWarningOpen)}
            data-staff={offDayStaffInfo?.staffName}
          />
        </div>
      }
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        body: {
          padding: isCompact ? '16px' : '20px 24px',
          background: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
        },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <Button onClick={onClose}>Đóng</Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              icon={<CopyOutlined />}
              onClick={templates.handleCopyMessage}
              style={{ color: '#D4A84B', borderColor: '#D4A84B' }}
            >
              Sao chép tin nhắn
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={submitting}
              onClick={handleReschedule}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 'bold' }}
            >
              Hoàn tất & Lưu
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Customer Information (Read-only Card) */}
        <Card
          size="small"
          style={{
            backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
            borderColor: themeMode === 'dark' ? '#334155' : '#e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '13px', color: token.colorText }} className="flex items-center gap-1.5">
              <span style={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>Khách hàng:</span>
              <strong style={{ fontSize: '14px' }}>{booking?.customerName || 'Khách hàng'}</strong>
              <span>-</span>
              <span style={{ fontWeight: 600 }}>{formatOrGenerateCustomerPhone(booking)}</span>
              <CopyPhoneButton phone={formatOrGenerateCustomerPhone(booking)} size="xs" />
            </div>
            {bookingDate && (
              <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                Lịch hiện tại:{' '}
                <strong className="tabular-nums">
                  {bookingDate.format('DD/MM/YYYY')} {selectedSlot || ''}
                </strong>{' '}
                ({selectedCN?.name || booking?.branchName || ''})
              </div>
            )}
          </div>
        </Card>

        {/* Interactive Off-Day Warning Banner */}
        {isOffDayWarningOpen && (
          <div
            id="off-day-warning-banner"
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: themeMode === 'dark' ? 'rgba(250, 84, 28, 0.15)' : '#fff2e8',
              border: `1px solid ${themeMode === 'dark' ? '#ff7a45' : '#ffbb96'}`,
              color: themeMode === 'dark' ? '#ff7a45' : '#d4380d',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '6px',
                color: '#fa541c',
              }}
            >
              <ExclamationCircleOutlined style={{ fontSize: '16px' }} />
              <span>⚠️ CẢNH BÁO LỊCH NGHỈ TUẦN CHUYÊN VIÊN</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.5' }}>
              Lịch hẹn dời sang ngày <strong>{offDayStaffInfo?.dateStr || bookingDate.format('DD/MM/YYYY')}</strong>{' '}
              trùng với ngày nghỉ tuần (<code>Off</code>) của{' '}
              <strong style={{ color: '#fa541c' }}>
                {offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'}
              </strong>
              .
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <Button
                size="small"
                onClick={() => {
                  const targetNext = offDayStaffInfo?.nextWorkingDate || bookingDate.clone().add(1, 'day');
                  setBookingDate(targetNext);
                  message.info(
                    `Đã đổi lịch sang ngày ${targetNext.format('DD/MM/YYYY')} (${
                      offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'
                    } đi làm)`
                  );
                  setIsOffDayWarningOpen(false);
                }}
              >
                Dời sang ngày{' '}
                {offDayStaffInfo?.nextWorkingDate && dayjs.isDayjs(offDayStaffInfo.nextWorkingDate)
                  ? offDayStaffInfo.nextWorkingDate.format('DD/MM')
                  : bookingDate.clone().add(1, 'day').format('DD/MM')}{' '}
                ({offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'} đi làm)
              </Button>
              <Button
                size="small"
                type="primary"
                style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B' }}
                onClick={() => {
                  setSelectedCV(null);
                  setIsOffDayWarningOpen(false);
                  message.info(
                    `Đã chuyển đơn sang Chuyên viên Tự Do do CV ${
                      offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'
                    } nghỉ tuần`
                  );
                }}
              >
                Chuyển thành CV Tự Do
              </Button>
            </div>
          </div>
        )}

        {/* SECTION 1: CHI NHÁNH & CHUYÊN VIÊN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Store selection */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
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
          </div>

          {/* Technician Selection */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <UserOutlined /> CHUYÊN VIÊN THỰC HIỆN (CV)
            </h4>
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ width: '100%' }}
              loading={loadingStaff}
              placeholder="Chọn chuyên viên (hoặc Chuyên viên tự do)..."
              value={selectedCV ? selectedCV.id : 0}
              onChange={(val) => {
                if (!val || val === 0) {
                  setSelectedCV(null);
                  setIsOffDayWarningOpen(false);
                } else {
                  const found = (staffList || []).find((s: SafeAny) => Number(s.id) === Number(val));
                  if (found) {
                    selectCVOption(found);
                  }
                }
              }}
              options={[
                {
                  value: 0,
                  label: '✨ Không chỉ định chuyên viên (Chuyên viên Tự Do)',
                },
                ...(staffList || []).map((st: SafeAny) => {
                  const isFav = favoriteTechs.some(
                    (ft) => ft.toLowerCase() === (st.displayName || st.name || '').toLowerCase()
                  );
                  const isOff = isStaffOffOnDate(st, bookingDate);
                  return {
                    value: st.id,
                    label: `${st.displayName || st.name}${st.notes ? ` (${st.notes})` : ''}${isOff ? ' ⚠️ [Nghỉ ngày này]' : ''}${isFav ? ' 💖 [Hay đi]' : ''}`,
                  };
                }),
              ]}
            />

            {/* Favorite Stylist Suggestion Chips */}
            {favoriteKTVs.length > 0 && (
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#D4A84B', fontWeight: 'bold' }}>💖 Chuyên viên khách hay đi:</span>
                {favoriteKTVs.map((ktv: SafeAny) => (
                  <Tag
                    key={ktv.id}
                    color={selectedCV?.id === ktv.id ? 'gold' : 'default'}
                    style={{ cursor: 'pointer', margin: 0 }}
                    onClick={() => selectCVOption(ktv)}
                  >
                    {ktv.displayName || ktv.name}
                  </Tag>
                ))}
              </div>
            )}
            {selectedCV && (
              <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '4px' }}>
                * Đang chỉ định <strong>{selectedCV.displayName || selectedCV.name}</strong>.
              </div>
            )}
          </div>

          {/* Service Selector */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <InboxOutlined /> DỊCH VỤ (SERVICE)
            </h4>
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ width: '100%' }}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
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

          {/* Promotion Options (if applicable) */}
          {visiblePromotionOptions.length > 0 && (
            <div>
              <h4
                style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}
              >
                <GiftOutlined /> CHƯƠNG TRÌNH KHUYẾN MÃI
              </h4>
              <Select
                placeholder="Chọn chương trình khuyến mãi (hoặc để trống)..."
                allowClear
                style={{ width: '100%' }}
                value={selectedPromotionSelection}
                onChange={(val) => setSelectedPromotionSelection(val)}
                options={visiblePromotionOptions.map((promotion) => ({
                  value: `${promotion.source}:${promotion.id}`,
                  label: promotion.label || promotion.name,
                }))}
              />
            </div>
          )}

          {/* Booking Note Section */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              GHI CHÚ ĐẶT LỊCH (BOOKING NOTE / LƯU Ý KHÁCH HÀNG)
            </h4>
            <TextArea
              rows={3}
              placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt từ khách hàng (dáng mi, yêu cầu chuyên viên, tình trạng mắt...)..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              style={{
                borderRadius: '8px',
                backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
                borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
              }}
            />
          </div>

          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '4px 0' }} />

          {/* Date & Slot select matrix */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>Ngày đặt:</span>
                <CvDatePicker
                  key={`${selectedCV ? selectedCV.id : 'no-cv'}-${(staffList || []).length}`}
                  style={{ marginLeft: '8px' }}
                  value={bookingDate}
                  onChange={(val) => {
                    if (val) {
                      setBookingDate(val);
                      if (selectedCV && isStaffOffOnDate(selectedCV, val)) {
                        checkAndHandleOffDay(selectedCV, val);
                      }
                    }
                  }}
                  selectedCV={selectedCV}
                  staffList={staffList}
                  themeMode={themeMode}
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
              setSelectedSlot={handleSelectSlot}
              selectedCN={selectedCN}
              morning={morning}
              afternoon={afternoon}
              night={night}
              themeMode={themeMode}
              selectedCV={selectedCV}
            />
          </div>

          <RescheduleTemplateSection
            themeMode={themeMode}
            booking={booking}
            showTemplateSection={templates.showTemplateSection}
            setShowTemplateSection={templates.setShowTemplateSection}
            bookingTemplates={templates.bookingTemplates}
            selectedTemplateId={templates.selectedTemplateId}
            setSelectedTemplateId={templates.setSelectedTemplateId}
            customMessage={templates.customMessage}
            setCustomMessage={templates.setCustomMessage}
            savingTemplate={templates.savingTemplate}
            loadingTemplates={templates.loadingTemplates}
            setIsManagerModalOpen={templates.setIsManagerModalOpen}
            evaluateBookingTemplate={templates.evaluateBookingTemplate}
            handleSaveTemplate={templates.handleSaveTemplate}
            handleCopyMessage={templates.handleCopyMessage}
          />
        </div>
      </div>

      <RescheduleConfirmationModals
        themeMode={themeMode}
        isManagerModalOpen={templates.isManagerModalOpen}
        setIsManagerModalOpen={templates.setIsManagerModalOpen}
        bookingTemplates={templates.bookingTemplates}
        setBookingTemplates={templates.setBookingTemplates}
        autoSelectTemplate={templates.autoSelectTemplate}
        isLateSlotModalOpen={isLateSlotModalOpen}
        setIsLateSlotModalOpen={setIsLateSlotModalOpen}
        pendingSlot={pendingSlot}
        setPendingSlot={setPendingSlot}
        setSelectedSlot={setSelectedSlot}
        submitError={submitError}
        setSubmitError={setSubmitError}
      />
    </AdaptiveDrawer>
  );
};

export default RescheduleBookingModal;
