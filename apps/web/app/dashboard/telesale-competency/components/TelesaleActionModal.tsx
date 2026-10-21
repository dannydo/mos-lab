'use client';

import React from 'react';
import { Select, Input, Alert } from 'antd';
import { TelesaleTier, TELESALE_TIER_CONFIG } from '@mos-lab/shared';
import { AdaptiveModal } from '../../../../components/ui';

interface TelesaleActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: 'PROMOTED' | 'DEMOTED';
  targetTier: TelesaleTier;
  onTargetTierChange: (tier: TelesaleTier) => void;
  actionReason: string;
  onActionReasonChange: (reason: string) => void;
  staffName?: string;
  currentTier?: TelesaleTier;
  saving: boolean;
}

export const TelesaleActionModal: React.FC<TelesaleActionModalProps> = ({
  open,
  onClose,
  onConfirm,
  actionType,
  targetTier,
  onTargetTierChange,
  actionReason,
  onActionReasonChange,
  staffName,
  currentTier,
  saving,
}) => {
  return (
    <AdaptiveModal
      title={
        actionType === 'PROMOTED'
          ? 'Xác Nhận Phê Duyệt Thăng Bậc'
          : 'Xem Xét Quyết Định Giáng Bậc'
      }
      open={open}
      onCancel={onClose}
      onOk={onConfirm}
      confirmLoading={saving}
      okText={actionType === 'PROMOTED' ? 'Duyệt Thăng Bậc' : 'Xác Nhận Giáng Bậc'}
      okButtonProps={{ danger: actionType === 'DEMOTED' }}
    >
      <div className="space-y-4 py-2">
        <Alert
          message={
            actionType === 'PROMOTED'
              ? `Nhân sự ${staffName || ''} đã đủ điều kiện thăng cấp từ ${currentTier || ''} lên ${targetTier}!`
              : `Cảnh báo: Nhân sự ${staffName || ''} không đạt điểm chuẩn trong 2 tháng liên tiếp.`
          }
          type={actionType === 'PROMOTED' ? 'success' : 'warning'}
          showIcon
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
            Cấp bậc mới:
          </label>
          <Select
            value={targetTier}
            onChange={onTargetTierChange}
            className="w-full"
            options={(Object.keys(TELESALE_TIER_CONFIG) as TelesaleTier[]).map((t) => ({
              value: t,
              label: TELESALE_TIER_CONFIG[t].label,
            }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
            Lý do / Căn cứ phê duyệt:
          </label>
          <Input.TextArea
            rows={3}
            value={actionReason}
            onChange={(e) => onActionReasonChange(e.target.value)}
            placeholder="Nhập lý do phê duyệt thăng/giáng bậc..."
          />
        </div>
      </div>
    </AdaptiveModal>
  );
};
