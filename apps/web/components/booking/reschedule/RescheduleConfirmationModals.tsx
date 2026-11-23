import React from 'react';
import { Button, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { BookingConfirmationTemplate } from '@mos-lab/shared';
import { AdaptiveModal } from '../../ui/AdaptiveOverlay';
import { BookingTemplateManagerModal } from '../BookingTemplateManagerModal';

interface RescheduleConfirmationModalsProps {
  themeMode: string;
  isManagerModalOpen: boolean;
  setIsManagerModalOpen: (open: boolean) => void;
  bookingTemplates: BookingConfirmationTemplate[];
  setBookingTemplates: (list: BookingConfirmationTemplate[]) => void;
  autoSelectTemplate: (list: BookingConfirmationTemplate[]) => void;
  isLateSlotModalOpen: boolean;
  setIsLateSlotModalOpen: (open: boolean) => void;
  pendingSlot: string | null;
  setPendingSlot: (slot: string | null) => void;
  setSelectedSlot: (slot: string | null) => void;
  submitError: string | null;
  setSubmitError: (err: string | null) => void;
}

export const RescheduleConfirmationModals: React.FC<RescheduleConfirmationModalsProps> = ({
  themeMode,
  isManagerModalOpen,
  setIsManagerModalOpen,
  bookingTemplates,
  setBookingTemplates,
  autoSelectTemplate,
  isLateSlotModalOpen,
  setIsLateSlotModalOpen,
  pendingSlot,
  setPendingSlot,
  setSelectedSlot,
  submitError,
  setSubmitError,
}) => {
  const handleCancelLateSlot = () => {
    setIsLateSlotModalOpen(false);
    setPendingSlot(null);
    message.warning('Vui lòng thông báo quy định 15 phút cho khách trước khi dời sang khung 20:00!');
  };

  return (
    <>
      <BookingTemplateManagerModal
        open={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        templates={bookingTemplates}
        onTemplatesUpdated={(newList) => {
          setBookingTemplates(newList);
          autoSelectTemplate(newList);
        }}
      />

      <AdaptiveModal
        intent="confirm"
        className="booking-late-slot-confirmation"
        open={isLateSlotModalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fa8c16', fontSize: '15px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '18px' }} />
            <span>⚠️ XÁC NHẬN THÔNG BÁO QUY ĐỊNH 20:15</span>
          </div>
        }
        onCancel={handleCancelLateSlot}
        footer={[
          <Button key="no" danger onClick={handleCancelLateSlot}>
            Chưa thông báo (Hủy chọn)
          </Button>,
          <Button
            key="yes"
            type="primary"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => {
              if (pendingSlot) {
                setSelectedSlot(pendingSlot);
              }
              setIsLateSlotModalOpen(false);
              setPendingSlot(null);
              message.success('Đã xác nhận thông báo quy định 20:15 với khách!');
            }}
          >
            Đã thông báo với khách
          </Button>,
        ]}
      >
        <div
          style={{
            padding: '12px 4px',
            fontSize: '14px',
            lineHeight: '1.6',
            color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
          }}
        >
          <p>
            Vì <strong>20:00</strong> là khung chốt ca cuối ngày, tiệm em chỉ giữ lịch và chờ khách tối đa 15 phút (đến{' '}
            <strong>20:15</strong>) để đảm bảo đủ thời gian làm mi đẹp nhất.
          </p>
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.15)' : '#fffbe6',
              border: `1px solid ${themeMode === 'dark' ? '#d97706' : '#ffe58f'}`,
              color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
              fontWeight: '600',
            }}
          >
            Bạn đã thông báo quy định 20:15 này cho khách hàng chưa?
          </div>
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        intent="confirm"
        className="booking-reschedule-error"
        open={Boolean(submitError)}
        zIndex={1500}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4f', fontSize: '16px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '19px' }} />
            <span>Không thể dời lịch</span>
          </div>
        }
        onCancel={() => setSubmitError(null)}
        footer={
          <Button type="primary" danger onClick={() => setSubmitError(null)}>
            Đã hiểu
          </Button>
        }
      >
        <div
          style={{
            padding: '8px 0',
            color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          {submitError}
        </div>
      </AdaptiveModal>
    </>
  );
};
