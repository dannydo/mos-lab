'use client';

import React, { useEffect, useState } from 'react';
import { Input, Modal } from 'antd';
import { ShieldAlert } from 'lucide-react';

export const AI_AUDIT_REASON_MIN = 10;

export interface MosChatAiAuditReasonModalProps {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Admin / Super Admin opening someone else's private MAI session for a security review:
 * a written reason is mandatory, the view is read-only and the owner can see that it happened.
 */
export const MosChatAiAuditReasonModal: React.FC<MosChatAiAuditReasonModalProps> = ({
  open,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= AI_AUDIT_REASON_MIN;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={() => valid && onConfirm(trimmed)}
      okText="Mở để rà soát (chỉ xem)"
      cancelText="Hủy"
      okButtonProps={{ disabled: !valid, loading }}
      centered
      destroyOnHidden
      title={
        <span className="inline-flex items-center gap-2">
          <ShieldAlert size={16} />
          Rà soát bảo mật phiên MAI
        </span>
      }
    >
      <div className="flex flex-col gap-3" data-testid="mos-chat-ai-audit-modal">
        <p className="m-0 text-sm">
          Đây là phiên hội thoại riêng tư của nhân sự khác. Chỉ mở khi cần kiểm tra việc dùng MAI có xâm phạm hệ thống
          hay không. Bạn chỉ được xem, và lượt xem này được ghi lại để chủ phiên biết.
        </p>
        <Input.TextArea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          showCount
          placeholder="Lý do rà soát (tối thiểu 10 ký tự)"
          aria-label="Lý do rà soát bảo mật"
        />
      </div>
    </Modal>
  );
};

export default MosChatAiAuditReasonModal;
