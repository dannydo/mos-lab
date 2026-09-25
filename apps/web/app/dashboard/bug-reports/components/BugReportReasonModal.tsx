'use client';

import { Input, Typography } from 'antd';
import { AdaptiveModal } from '../../../../components/ui';

const { Paragraph } = Typography;

export interface BugReportReasonModalProps {
  open: boolean;
  title: string;
  description: string;
  placeholder: string;
  ariaLabel: string;
  okText: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  confirmLoading: boolean;
  minChars?: number;
  disabled?: boolean;
}

export function BugReportReasonModal({
  open,
  title,
  description,
  placeholder,
  ariaLabel,
  okText,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  confirmLoading,
  minChars = 10,
  disabled = false,
}: BugReportReasonModalProps) {
  const isOkDisabled = disabled || confirmLoading || reason.trim().length < minChars;

  return (
    <AdaptiveModal
      title={title}
      open={open}
      onCancel={() => !confirmLoading && onCancel()}
      okText={okText}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: isOkDisabled }}
      onOk={onConfirm}
    >
      <Paragraph>{description}</Paragraph>
      <Input.TextArea
        aria-label={ariaLabel}
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        maxLength={2000}
        showCount
        rows={5}
        placeholder={placeholder}
      />
    </AdaptiveModal>
  );
}
