import React from 'react';
import { Button, Input, Select } from 'antd';
import { CopyOutlined, MessageOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { BOOKING_TEMPLATE_TAGS, BookingConfirmationTemplate, SafeAny } from '@mos-lab/shared';

const { TextArea } = Input;

interface RescheduleTemplateSectionProps {
  themeMode: string;
  booking: SafeAny;
  showTemplateSection: boolean;
  setShowTemplateSection: React.Dispatch<React.SetStateAction<boolean>>;
  bookingTemplates: BookingConfirmationTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  customMessage: string;
  setCustomMessage: React.Dispatch<React.SetStateAction<string>>;
  savingTemplate: boolean;
  loadingTemplates: boolean;
  setIsManagerModalOpen: (open: boolean) => void;
  evaluateBookingTemplate: (content: string) => string;
  handleSaveTemplate: () => void;
  handleCopyMessage: () => void;
}

export const RescheduleTemplateSection: React.FC<RescheduleTemplateSectionProps> = ({
  themeMode,
  booking,
  showTemplateSection,
  setShowTemplateSection,
  bookingTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  customMessage,
  setCustomMessage,
  savingTemplate,
  loadingTemplates,
  setIsManagerModalOpen,
  evaluateBookingTemplate,
  handleSaveTemplate,
  handleCopyMessage,
}) => {
  const labelColor = themeMode === 'dark' ? '#94a3b8' : '#64748b';
  const borderColor = themeMode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div
      style={{
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
      }}
    >
      <div
        onClick={() => setShowTemplateSection(!showTemplateSection)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
          borderBottom: showTemplateSection ? `1px solid ${borderColor}` : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
            color: '#D4A84B',
          }}
        >
          <MessageOutlined />
          <span>MẪU TIN NHẮN XÁC NHẬN GỬI KHÁCH (TÙY CHỌN XEM / SAO CHÉP)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: labelColor }}>{showTemplateSection ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
        </div>
      </div>

      {showTemplateSection && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Template selector */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: labelColor }}>MẪU TIN NHẮN HỆ THỐNG:</label>
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setIsManagerModalOpen(true)}
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
                setSelectedTemplateId(val);
                const chosen = bookingTemplates.find((t) => t.id === val);
                if (chosen) setCustomMessage(chosen.content);
              }}
              options={bookingTemplates.map((t) => ({
                label: t.title,
                value: t.id,
              }))}
            />
          </div>

          {/* Variable Insert Tags */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: labelColor,
                marginBottom: '8px',
              }}
            >
              CHÈN NHANH THẺ BIẾN ĐỘNG:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {BOOKING_TEMPLATE_TAGS.map((tagDef) => (
                <Button
                  key={tagDef.tag}
                  size="small"
                  type="dashed"
                  onClick={() => setCustomMessage((prev) => prev + tagDef.tag)}
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

          {/* Editable Custom Content */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: labelColor,
                marginBottom: '6px',
              }}
            >
              NỘI DUNG MẪU TÙY CHỈNH:
            </label>
            <TextArea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
              }}
            />
          </div>

          {/* Live Preview Box */}
          <div>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: '600',
                color: labelColor,
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                XEM TRƯỚC TIN NHẮN SẼ GỬI CHO{' '}
                <strong style={{ color: '#D4A84B' }}>
                  {booking?.customerName || booking?.customer?.name || 'KHÁCH HÀNG'}
                </strong>
                :
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                {evaluateBookingTemplate(customMessage).length} ký tự
              </span>
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                border: `1px solid ${borderColor}`,
                color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            >
              {evaluateBookingTemplate(customMessage)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button icon={<SaveOutlined />} loading={savingTemplate} onClick={handleSaveTemplate} size="small">
              Lưu Template Mẫu
            </Button>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyMessage}
              size="small"
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
            >
              Sao chép tin nhắn này
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
