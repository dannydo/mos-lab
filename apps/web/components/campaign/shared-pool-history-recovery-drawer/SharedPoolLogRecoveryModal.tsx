'use client';

import React from 'react';
import { Alert, Input, Radio, Select } from 'antd';
import { AlertTriangle, Undo2 } from 'lucide-react';
import type { CampaignSharedPoolDetailedLog, SharedPoolRecoveryAction } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { SharedPoolStatusBadge } from './SharedPoolBadges';
import { POOL_STATUS_SELECT_OPTIONS, type DriftConfirmationState } from './sharedPoolHistoryTypes';

export interface SharedPoolLogRecoveryModalProps {
  open: boolean;
  loading: boolean;
  selectedLog: CampaignSharedPoolDetailedLog | null;
  recoveryAction: SharedPoolRecoveryAction;
  targetPoolStatus: string;
  recoveryReason: string;
  driftConfirm: DriftConfirmationState | null;
  driftConfirmLoading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onChangeRecoveryAction: (action: SharedPoolRecoveryAction) => void;
  onChangeTargetPoolStatus: (status: string) => void;
  onChangeRecoveryReason: (reason: string) => void;
  onConfirmDrift: () => void;
  onCancelDrift: () => void;
}

export const SharedPoolLogRecoveryModal: React.FC<SharedPoolLogRecoveryModalProps> = ({
  open,
  loading,
  selectedLog,
  recoveryAction,
  targetPoolStatus,
  recoveryReason,
  driftConfirm,
  driftConfirmLoading,
  onCancel,
  onSubmit,
  onChangeRecoveryAction,
  onChangeTargetPoolStatus,
  onChangeRecoveryReason,
  onConfirmDrift,
  onCancelDrift,
}) => (
  <>
    <AdaptiveModal
      intent="form"
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <Undo2 size={18} className="text-purple-600 dark:text-purple-400" />
          <span>Khôi Phục Trạng Thái Khách Hàng (Manager Override)</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={loading}
      okText="Xác nhận khôi phục"
      cancelText="Hủy bỏ"
      okButtonProps={{
        disabled: !recoveryReason.trim(),
        className: 'bg-purple-600 hover:bg-purple-500 font-semibold',
      }}
      destroyOnHidden
      width={560}
    >
      {selectedLog && (
        <div className="space-y-4 pt-2">
          {/* Customer Summary */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs">
            <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>{selectedLog.customerName || `Khách hàng #${selectedLog.legacyUserId}`}</span>
              <span className="font-mono text-purple-600 dark:text-purple-400">
                {selectedLog.customerPhone || `#${selectedLog.legacyUserId}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                Trạng thái hiện tại: <SharedPoolStatusBadge status={selectedLog.currentPoolStatus} />
              </span>
              <span>·</span>
              <span>
                Log được chọn:{' '}
                <strong className="tabular-nums">
                  #{selectedLog.id} ({selectedLog.actionLabel})
                </strong>
              </span>
            </div>
          </div>

          {/* Warning if data drifted */}
          {selectedLog.isDrifted && (
            <Alert
              type="warning"
              showIcon
              icon={<AlertTriangle size={16} className="text-amber-500" />}
              message={
                <span className="font-bold text-amber-800 dark:text-amber-200">
                  Cảnh báo: Dữ liệu đã thay đổi sau log này!
                </span>
              }
              description={`Trạng thái của khách hàng hiện tại ("${selectedLog.currentPoolStatus}") đã khác với kết quả của log được chọn. Thao tác khôi phục sẽ cưỡng chế đưa trạng thái về lựa chọn bên dưới.`}
              className="rounded-xl border-amber-300 dark:border-amber-800"
            />
          )}

          {/* Recovery Action Radio Options */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Chọn phương thức khôi phục:</div>
            <Radio.Group
              value={recoveryAction}
              onChange={(e) => onChangeRecoveryAction(e.target.value as SharedPoolRecoveryAction)}
              className="w-full space-y-2"
            >
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                <Radio value="ROLLBACK_TO_LOG">
                  <span className="font-semibold text-xs">Khôi phục về trạng thái trước bản ghi này</span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-6">
                    Hoàn tác trạng thái về <strong>{selectedLog.previousPoolStatus || 'SẴN SÀNG (AVAILABLE)'}</strong>.
                  </div>
                </Radio>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                <Radio value="FORCE_UNLOCK">
                  <span className="font-semibold text-xs">Cưỡng chế giải phóng Lock / Claim (Force Unlock)</span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-6">
                    Xóa lock đang kẹt, đưa khách hàng ngay về SẴN SÀNG (AVAILABLE).
                  </div>
                </Radio>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                <Radio value="RESTORE_EXCLUDED">
                  <span className="font-semibold text-xs">Khôi phục khách hàng từ ĐÃ LOẠI → SẴN SÀNG</span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-6">
                    Hủy bỏ trạng thái loại khỏi pool, cho phép đội ngũ tiếp tục khai thác.
                  </div>
                </Radio>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                <Radio value="RESET_RECYCLE">
                  <span className="font-semibold text-xs">Reset hàng đợi Recycle (Chờ quay lại)</span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-6">
                    Bỏ qua thời gian chờ hẹn gọi lại, đưa ngay về Pool sẵn sàng nhận.
                  </div>
                </Radio>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                <Radio value="RESET_POOL_STATUS">
                  <span className="font-semibold text-xs">Chuyển sang trạng thái Pool tùy chỉnh</span>
                  {recoveryAction === 'RESET_POOL_STATUS' && (
                    <div className="mt-2 ml-6">
                      <Select
                        size="small"
                        value={targetPoolStatus}
                        onChange={onChangeTargetPoolStatus}
                        className="w-[220px]"
                        options={[...POOL_STATUS_SELECT_OPTIONS]}
                      />
                    </div>
                  )}
                </Radio>
              </div>
            </Radio.Group>
          </div>

          {/* Mandatory Reason Input */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>
                Lý do khôi phục <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                (Bắt buộc theo nguyên tắc an toàn mOS)
              </span>
            </div>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do cụ thể (VD: Telesales kẹt mạng không nhả được claim / Loại nhầm khách hẹn gọi lại...)"
              value={recoveryReason}
              onChange={(e) => onChangeRecoveryReason(e.target.value)}
              className="rounded-lg text-xs"
            />
          </div>
        </div>
      )}
    </AdaptiveModal>

    {/* State Drift Confirmation Modal */}
    <AdaptiveModal
      intent="confirm"
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <span>Cảnh báo dữ liệu đã thay đổi (State Drift)</span>
        </div>
      }
      open={Boolean(driftConfirm)}
      onCancel={onCancelDrift}
      onOk={onConfirmDrift}
      confirmLoading={driftConfirmLoading}
      okText="Tôi hiểu, vẫn khôi phục"
      okType="danger"
      cancelText="Hủy bỏ"
      destroyOnHidden
    >
      {driftConfirm && (
        <div className="space-y-2 mt-2 text-sm text-slate-700 dark:text-slate-200">
          <p>{driftConfirm.message}</p>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
            <div>
              Trạng thái hiện tại: <strong>{driftConfirm.currentStatus}</strong>
            </div>
            <div>
              Trạng thái dự kiến khôi phục: <strong>{driftConfirm.targetPreviousStatus}</strong>
            </div>
          </div>
        </div>
      )}
    </AdaptiveModal>
  </>
);
