'use client';

import React from 'react';
import { Button, Input, Modal, Typography, Space, theme } from 'antd';
import { AlertCircle, Ban } from 'lucide-react';
import { AppIcon } from '../ui';
import { BUG_REPORT_Z_INDEX } from '@mos-lab/shared';

const { Text, Paragraph } = Typography;

const QUICK_REASONS = [
  'Báo nhầm / Không phải lỗi',
  'Đã tự giải quyết được',
  'Không còn cần thiết',
  'Thông tin báo lên chưa chính xác',
];

export interface BugReportCancelModalProps {
  open: boolean;
  reportKey: string;
  reportTitle?: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function BugReportCancelModal({
  open,
  reportKey,
  reportTitle,
  submitting,
  onCancel,
  onSubmit,
}: BugReportCancelModalProps) {
  const { token } = theme.useToken();
  const [selectedQuickReason, setSelectedQuickReason] = React.useState<string | null>(null);
  const [customReason, setCustomReason] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setSelectedQuickReason(null);
      setCustomReason('');
    }
  }, [open]);

  const effectiveReason = selectedQuickReason
    ? customReason.trim()
      ? `${selectedQuickReason} - ${customReason.trim()}`
      : selectedQuickReason
    : customReason.trim();

  const handleConfirm = async () => {
    await onSubmit(effectiveReason);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: token.colorErrorBg, color: token.colorError }}
          >
            <AppIcon icon={Ban} size="sm" />
          </div>
          <span>Huỷ yêu cầu {reportKey}</span>
        </div>
      }
      zIndex={BUG_REPORT_Z_INDEX.REJECTION_MODAL}
      footer={[
        <Button key="cancel" disabled={submitting} onClick={onCancel}>
          Giữ lại yêu cầu
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          loading={submitting}
          icon={<AppIcon icon={Ban} size="sm" />}
          onClick={() => void handleConfirm()}
        >
          Xác nhận huỷ
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="space-y-4 py-2">
        {reportTitle ? (
          <Paragraph ellipsis={{ rows: 2 }} className="text-sm font-medium" style={{ color: token.colorTextHeading }}>
            {reportTitle}
          </Paragraph>
        ) : null}

        <div
          className="rounded-xl border p-3.5 text-xs leading-relaxed"
          style={{
            borderColor: token.colorWarningBorder,
            background: token.colorWarningBg,
            color: token.colorTextSecondary,
          }}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0" style={{ color: token.colorWarning }}>
              <AppIcon icon={AlertCircle} size="sm" />
            </div>
            <div>
              <Text strong style={{ color: token.colorWarningText }}>
                Lưu ý:
              </Text>{' '}
              Sau khi huỷ, mOS và Agent sẽ ngừng xử lý yêu cầu này. Yêu cầu sẽ được chuyển sang trạng thái{' '}
              <Text strong>Đã huỷ</Text>.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Text strong className="text-xs">
            Chọn nhanh lý do huỷ:
          </Text>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((reason) => {
              const isSelected = selectedQuickReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedQuickReason(isSelected ? null : reason)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    borderColor: isSelected ? token.colorError : token.colorBorderSecondary,
                    background: isSelected ? token.colorErrorBg : token.colorFillQuaternary,
                    color: isSelected ? token.colorError : token.colorText,
                  }}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Text strong className="text-xs">
            Chi tiết thêm (không bắt buộc):
          </Text>
          <Input.TextArea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Nhập lý do cụ thể nếu cần giải thích thêm..."
            rows={3}
            maxLength={1000}
            showCount
          />
        </div>
      </div>
    </Modal>
  );
}
