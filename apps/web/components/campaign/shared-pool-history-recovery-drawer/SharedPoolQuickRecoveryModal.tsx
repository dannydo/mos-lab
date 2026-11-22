'use client';

import React from 'react';
import { Input, Select } from 'antd';
import { Zap } from 'lucide-react';
import type { SharedPoolRecoveryAction } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { POOL_STATUS_SELECT_OPTIONS, QUICK_RECOVERY_ACTION_OPTIONS } from './sharedPoolHistoryTypes';

export interface SharedPoolQuickRecoveryModalProps {
  open: boolean;
  loading: boolean;
  customerId: string;
  action: SharedPoolRecoveryAction;
  targetStatus: string;
  reason: string;
  onCancel: () => void;
  onSubmit: () => void;
  onChangeCustomerId: (value: string) => void;
  onChangeAction: (action: SharedPoolRecoveryAction) => void;
  onChangeTargetStatus: (status: string) => void;
  onChangeReason: (reason: string) => void;
}

export const SharedPoolQuickRecoveryModal: React.FC<SharedPoolQuickRecoveryModalProps> = ({
  open,
  loading,
  customerId,
  action,
  targetStatus,
  reason,
  onCancel,
  onSubmit,
  onChangeCustomerId,
  onChangeAction,
  onChangeTargetStatus,
  onChangeReason,
}) => (
  <AdaptiveModal
    intent="form"
    title={
      <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
        <Zap size={18} className="text-amber-500 shrink-0" />
        <span>Khôi Phục Nhanh Khách Hàng (Quick Data Recovery)</span>
      </div>
    }
    open={open}
    onCancel={onCancel}
    onOk={onSubmit}
    confirmLoading={loading}
    okText="Thực hiện khôi phục"
    cancelText="Hủy bỏ"
    okButtonProps={{
      disabled: !customerId.trim() || !reason.trim(),
      className: 'bg-purple-600 hover:bg-purple-500 font-semibold',
    }}
    destroyOnHidden
    width={500}
  >
    <div className="space-y-4 pt-2">
      <div>
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          ID khách hàng trong chiến dịch / Mã User <span className="text-red-500">*</span>
        </div>
        <Input
          placeholder="Nhập User ID (VD: 20043 hoặc Campaign Customer ID)"
          value={customerId}
          onChange={(e) => onChangeCustomerId(e.target.value)}
          className="text-xs"
        />
      </div>

      <div>
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hành động khôi phục</div>
        <Select
          className="w-full"
          value={action}
          onChange={(val) => onChangeAction(val as SharedPoolRecoveryAction)}
          options={[...QUICK_RECOVERY_ACTION_OPTIONS]}
        />
      </div>

      {action === 'RESET_POOL_STATUS' && (
        <div>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái mục tiêu</div>
          <Select
            className="w-full"
            value={targetStatus}
            onChange={onChangeTargetStatus}
            options={[...POOL_STATUS_SELECT_OPTIONS]}
          />
        </div>
      )}

      <div>
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
          <span>
            Lý do khôi phục <span className="text-red-500">*</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">(Bắt buộc)</span>
        </div>
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do quản lý thực hiện khôi phục..."
          value={reason}
          onChange={(e) => onChangeReason(e.target.value)}
          className="text-xs"
        />
      </div>
    </div>
  </AdaptiveModal>
);
