'use client';

import React from 'react';
import { Alert, Button, DatePicker } from 'antd';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import dayjs from 'dayjs';
import type { TelesaleConfigValidationResult } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';

interface ValidationResultModalProps {
  open: boolean;
  validationResult: TelesaleConfigValidationResult | null;
  onClose: () => void;
}

export function ValidationResultModal({ open, validationResult, onClose }: ValidationResultModalProps) {
  return (
    <AdaptiveModal
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
          {validationResult?.valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          )}
          <span>Kết Quả Kiểm Tra Tính Hợp Lệ</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {validationResult ? (
        <div className="space-y-4 py-2">
          {validationResult.valid ? (
            <Alert
              type="success"
              showIcon
              message="Cấu hình hợp lệ 100%"
              description="Toàn bộ trọng số các trụ cột, mục tiêu các Level và công thức điểm đều đạt tiêu chuẩn kỹ thuật của Wings Lashes. Bạn có thể tự tin ban hành chính thức."
            />
          ) : (
            <div className="space-y-2">
              <Alert
                type="error"
                showIcon
                message="Phát hiện lỗi cần điều chỉnh trước khi ban hành:"
                description={
                  <ul className="list-disc pl-5 text-xs space-y-1 mt-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                }
              />
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="Lưu ý:"
              description={
                <ul className="list-disc pl-5 text-xs space-y-1 mt-1">
                  {validationResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}
        </div>
      ) : null}
    </AdaptiveModal>
  );
}

interface DeleteDraftModalProps {
  open: boolean;
  configName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteDraftModal({ open, configName, onCancel, onConfirm }: DeleteDraftModalProps) {
  return (
    <AdaptiveModal
      title="Xác nhận xóa bản nháp"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Xóa bản nháp"
      okButtonProps={{ danger: true }}
      cancelText="Hủy"
    >
      <p className="text-sm text-slate-600 dark:text-zinc-300 py-2">
        Bạn có chắc chắn muốn xóa bản nháp &quot;{configName}&quot;? Thao tác này sẽ xóa vĩnh viễn và không thể khôi
        phục.
      </p>
    </AdaptiveModal>
  );
}

interface PublishConfigModalProps {
  open: boolean;
  configName: string;
  publishEffectiveMonth: string;
  publishing: boolean;
  onChangeEffectiveMonth: (month: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PublishConfigModal({
  open,
  configName,
  publishEffectiveMonth,
  publishing,
  onChangeEffectiveMonth,
  onCancel,
  onConfirm,
}: PublishConfigModalProps) {
  return (
    <AdaptiveModal
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
          <Send className="w-5 h-5 text-emerald-500" />
          <span>Xác Nhận Ban Hành Cấu Hình Chính Thức</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      confirmLoading={publishing}
      okText="Ban Hành Ngay"
      okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700' }}
      cancelText="Hủy"
    >
      <div className="space-y-4 py-2 text-sm text-slate-700 dark:text-zinc-300">
        <p>
          Bạn đang chuẩn bị ban hành phiên bản{' '}
          <b className="text-slate-900 dark:text-zinc-100">&quot;{configName}&quot;</b> làm tiêu chuẩn chính thức của
          Wings Lashes.
        </p>

        <div>
          <label className="text-xs font-semibold block mb-1">Áp dụng hiệu lực từ kỳ tháng:</label>
          <DatePicker
            picker="month"
            value={dayjs(publishEffectiveMonth)}
            onChange={(d) => d && onChangeEffectiveMonth(d.format('YYYY-MM'))}
            className="w-full"
          />
        </div>

        <Alert
          type="info"
          showIcon
          message="Nguyên tắc không hồi tố (Non-retroactivity)"
          description="Các kỳ đánh giá trong quá khứ trước kỳ hiệu lực sẽ giữ nguyên cấu hình đã lưu, không bị ảnh hưởng hay thay đổi điểm số cũ."
          className="text-xs"
        />
      </div>
    </AdaptiveModal>
  );
}
