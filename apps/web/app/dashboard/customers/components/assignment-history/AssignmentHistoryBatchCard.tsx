'use client';

import type { ReactNode } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { AlertCircle, Calendar, ChevronDown, ChevronUp, Clock, Filter, Undo2, UserMinus, Users } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import { getAssignmentActionBadge } from './assignment-history-utils';

const { Text } = Typography;

interface AssignmentHistoryBatchCardProps {
  batch: SafeAny;
  isExpanded: boolean;
  nowTimestamp: number;
  undoingBatchId: string | null;
  revokingBatchId?: string | null;
  onClose: () => void;
  applyFilterFromJson: (jsonStr: string, batchId?: string) => void;
  onToggleExpand: () => void;
  onOpenRevokeBatchModal?: (batchId: string, customerCount: number) => void;
  onOpenUndoModal: (batchId: string, customerCount: number) => void;
  expandedContent?: ReactNode;
}

export function AssignmentHistoryBatchCard({
  batch,
  isExpanded,
  nowTimestamp,
  undoingBatchId,
  revokingBatchId,
  onClose,
  applyFilterFromJson,
  onToggleExpand,
  onOpenRevokeBatchModal,
  onOpenUndoModal,
  expandedContent,
}: AssignmentHistoryBatchCardProps) {
  const formattedDate = new Date(batch.assignedAt).toLocaleString('vi-VN');
  const formattedExpire = batch.expiresAt ? new Date(batch.expiresAt).toLocaleString('vi-VN') : null;
  const isUndone = batch.isUndone;
  const badge = getAssignmentActionBadge(batch);
  const isExpired = batch.expiresAt && new Date(batch.expiresAt).getTime() < nowTimestamp;

  return (
    <div
      className={`rounded-[10px] border border-neutral-200 border-l-4 bg-white px-[18px] py-3.5 shadow-sm transition-all dark:border-neutral-800 dark:bg-neutral-900 ${badge.borderLeftClass} ${
        isUndone ? 'opacity-75' : 'opacity-100'
      }`}
    >
      {/* CARD HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 font-bold text-amber-600 dark:bg-neutral-800 dark:text-amber-400">
            <AppIcon icon={Users} size={15} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold text-neutral-900 dark:text-neutral-100">
                {batch.newStaffName
                  ? `Phân bổ cho ${batch.newStaffName}`
                  : batch.prevStaffName
                    ? `Thu hồi từ ${batch.prevStaffName}`
                    : 'Gỡ Booker'}
              </span>

              <StatusTag status={badge.status} label={badge.label} className="rounded-xl px-2 py-0.5 font-semibold" />
            </div>

            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Thực hiện bởi:{' '}
              <strong className="text-neutral-900 dark:text-neutral-100">{batch.assignedBy || 'Hệ thống'}</strong>
            </div>
          </div>
        </div>

        {/* COUNT BADGE */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-[3px] dark:border-amber-500/30 dark:bg-amber-500/15">
          <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">Số lượng:</Text>
          <span className="tabular-nums text-sm font-extrabold text-amber-600 dark:text-amber-400">
            {batch.customerCount} KH
          </span>
        </div>
      </div>

      {/* FILTER FORMULA RE-USE TAG */}
      {batch.sourceFilterSummary && (
        <div className="mt-2.5">
          <Tooltip
            title={
              batch.sourceFilterJson
                ? 'Bấm vào đây để TÁI SỬ DỤNG ngay công thức & bộ lọc này cho danh sách khách hàng!'
                : 'Công thức phân bổ'
            }
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                applyFilterFromJson(batch.sourceFilterJson || '{}', batch.batchId);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition-all hover:scale-[1.01] hover:shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400 ${
                batch.sourceFilterJson ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <AppIcon icon={Filter} size={12} className="text-blue-500" />
              <span>🎯 {batch.sourceFilterSummary}</span>
              {batch.sourceFilterJson && (
                <span className="ml-1 text-[11px] underline opacity-85">(Bấm để lọc lại)</span>
              )}
            </div>
          </Tooltip>
        </div>
      )}

      {/* METADATA BAR (ASSIGNED AT & EXPIRES AT) */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-950/60">
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <AppIcon icon={Clock} size={13} />
          <span>Thời gian: {formattedDate}</span>
        </div>

        {formattedExpire && (
          <div
            className={`tabular-nums flex items-center gap-1.5 font-semibold ${
              isExpired ? 'text-rose-500' : 'text-amber-500'
            }`}
          >
            <AppIcon icon={Calendar} size={13} />
            <span>
              {isExpired ? 'Đã hết hạn: ' : 'Hết hạn: '}
              {formattedExpire}
            </span>
          </div>
        )}
      </div>

      {/* REASON ALERT */}
      {batch.reason && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-500 dark:border-rose-900/60 dark:bg-rose-950/40">
          <AppIcon icon={AlertCircle} size={13} />
          <span>
            <strong>Lý do:</strong> {batch.reason}
          </span>
        </div>
      )}

      {/* ACTION FOOTER */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          size="small"
          icon={<AppIcon icon={isExpanded ? ChevronUp : ChevronDown} size={13} />}
          onClick={onToggleExpand}
          className="rounded-md"
        >
          {isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết KH'}
        </Button>

        {!isUndone && (
          <>
            {onOpenRevokeBatchModal && (
              <Button
                danger
                size="small"
                icon={<AppIcon icon={UserMinus} size={13} />}
                loading={revokingBatchId === batch.batchId}
                onClick={() => {
                  onOpenRevokeBatchModal(batch.batchId, batch.customerCount);
                }}
                className="rounded-md font-semibold"
              >
                Thu hồi data
              </Button>
            )}

            <Button
              size="small"
              type="primary"
              icon={<AppIcon icon={Undo2} size={13} />}
              loading={undoingBatchId === batch.batchId}
              onClick={() => {
                onOpenUndoModal(batch.batchId, batch.customerCount);
              }}
              className="rounded-md font-semibold"
            >
              Hoàn tác đợt này
            </Button>
          </>
        )}
      </div>

      {/* EXPANDED CUSTOMER DETAILS TABLE */}
      {isExpanded && expandedContent}
    </div>
  );
}
