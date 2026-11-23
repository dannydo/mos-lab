'use client';

import React from 'react';
import { Button, Card, Input, Select } from 'antd';
import {
  CopyOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { BOOKING_TEMPLATE_TAGS, BookingConfirmationTemplate } from '@mos-lab/shared';
import { AdaptiveModal } from '../../ui/AdaptiveOverlay';

const { TextArea } = Input;

interface BookingWizardConfirmationCardProps {
  themeMode: 'light' | 'dark';
  showMessagePreview: boolean;
  onToggleMessagePreview: () => void;
  bookingTemplates: BookingConfirmationTemplate[];
  selectedTemplateId: string;
  loadingTemplates: boolean;
  savingTemplate: boolean;
  customMessage: string;
  previewMessage: string;
  customerDisplayName: string;
  onChangeTemplateId: (id: string, content?: string) => void;
  onChangeCustomMessage: (next: string) => void;
  onAppendTag: (tag: string) => void;
  onOpenManagerModal: () => void;
  onSaveTemplate: () => void;
  onCopyMessage: () => void;
}

export const BookingWizardConfirmationCard: React.FC<BookingWizardConfirmationCardProps> = ({
  themeMode,
  showMessagePreview,
  onToggleMessagePreview,
  bookingTemplates,
  selectedTemplateId,
  loadingTemplates,
  savingTemplate,
  customMessage,
  previewMessage,
  customerDisplayName,
  onChangeTemplateId,
  onChangeCustomMessage,
  onAppendTag,
  onOpenManagerModal,
  onSaveTemplate,
  onCopyMessage,
}) => {
  return (
    <Card
      size="small"
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={onToggleMessagePreview}
        >
          <span style={{ color: '#D4A84B', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageOutlined /> TIN NHẮN MẪU XÁC NHẬN ĐẶT LỊCH
          </span>
          <Button size="small" type="link" style={{ padding: 0 }}>
            {showMessagePreview ? 'Thu gọn ▲' : 'Mở rộng / Tùy chỉnh mẫu ▼'}
          </Button>
        </div>
      }
      style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
    >
      {showMessagePreview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label
                style={{
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                }}
              >
                MẪU TIN NHẮN HỆ THỐNG:
              </label>
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={onOpenManagerModal}
                style={{ color: '#D4A84B', padding: 0 }}
              >
                ⚙️ Quản lý Mẫu
              </Button>
            </div>
            <Select
              style={{ width: '100%' }}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              value={selectedTemplateId}
              loading={loadingTemplates}
              onChange={(val) => {
                const chosen = bookingTemplates.find((t) => t.id === val);
                onChangeTemplateId(val, chosen?.content);
              }}
              options={bookingTemplates.map((t) => ({
                label: t.title,
                value: t.id,
              }))}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                marginBottom: '8px',
              }}
            >
              CHÈN NHANH THẺ BIẾN ĐỘNG (NHẤP ĐỂ CHÈN):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {BOOKING_TEMPLATE_TAGS.map((tagDef) => (
                <Button
                  key={tagDef.tag}
                  size="small"
                  type="dashed"
                  onClick={() => onAppendTag(tagDef.tag)}
                  style={{
                    fontSize: '12px',
                    borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
                    color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
                  }}
                >
                  + {tagDef.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                marginBottom: '6px',
              }}
            >
              NỘI DUNG MẪU TÙY CHỈNH:
            </label>
            <TextArea
              rows={4}
              value={customMessage}
              onChange={(e) => onChangeCustomMessage(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: '600',
                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                XEM TRƯỚC TIN NHẮN SẼ GỬI CHO <strong style={{ color: '#D4A84B' }}>{customerDisplayName}</strong>:
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                {previewMessage.length} ký tự
              </span>
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            >
              {previewMessage}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button icon={<SaveOutlined />} size="small" loading={savingTemplate} onClick={onSaveTemplate}>
              Lưu Template Mẫu
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<CopyOutlined />}
              onClick={onCopyMessage}
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
            >
              Sao chép tin nhắn
            </Button>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: '12.5px',
            color: themeMode === 'dark' ? '#cbd5e1' : '#475569',
            whiteSpace: 'pre-wrap',
          }}
        >
          {previewMessage}
        </div>
      )}
    </Card>
  );
};

interface BookingWizardLateSlotModalProps {
  themeMode: 'light' | 'dark';
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const BookingWizardLateSlotModal: React.FC<BookingWizardLateSlotModalProps> = ({
  themeMode,
  open,
  onCancel,
  onConfirm,
}) => {
  return (
    <AdaptiveModal
      intent="confirm"
      className="booking-late-slot-confirmation"
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fa8c16', fontSize: '15px' }}>
          <ExclamationCircleOutlined style={{ fontSize: '18px' }} />
          <span>⚠️ XÁC NHẬN THÔNG BÁO QUY ĐỊNH 20:15</span>
        </div>
      }
      onCancel={onCancel}
      footer={[
        <Button key="no" danger onClick={onCancel}>
          Chưa thông báo (Hủy chọn)
        </Button>,
        <Button
          key="yes"
          type="primary"
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          onClick={onConfirm}
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
  );
};
