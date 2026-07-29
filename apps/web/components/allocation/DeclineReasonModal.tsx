'use client';

import React, { useState } from 'react';
import { Modal, Select, Input, Button, message } from 'antd';
import { PRESET_DECLINE_REASONS } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';

interface DeclineReasonModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (reasonCategory: string, reasonNote?: string) => Promise<void>;
  loading?: boolean;
}

export const DeclineReasonModal: React.FC<DeclineReasonModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const { themeMode } = useTheme();
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const isOther = category === 'Khác (Nhập lý do)';
  const isValid = category.length > 0 && (!isOther || note.trim().length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await onSubmit(category, note.trim() || undefined);
      setCategory('');
      setNote('');
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi từ chối đợt phân bổ');
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-lg">
          <span>⚠️</span>
          <span>Xác nhận Từ chối Phân bổ Data</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Hủy bỏ
        </Button>,
        <Button key="submit" type="primary" danger loading={loading} disabled={!isValid} onClick={handleSubmit}>
          Xác nhận Từ chối
        </Button>,
      ]}
      className={themeMode === 'dark' ? 'dark-theme-modal' : ''}
    >
      <div className="py-2 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vui lòng chọn lý do từ chối đợt phân bổ này. Data sẽ được trả về danh sách pool chung để quản lý điều phối
          lại.
        </p>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Lý do chính <span className="text-rose-500">*</span>
          </label>
          <Select
            placeholder="-- Chọn lý do từ chối --"
            value={category || undefined}
            onChange={(val) => setCategory(val)}
            className="w-full"
            options={PRESET_DECLINE_REASONS.map((reason) => ({
              label: reason,
              value: reason,
            }))}
          />
        </div>

        {(isOther || category) && (
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú chi tiết {isOther && <span className="text-rose-500">*</span>}
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Nhập thêm chi tiết hoặc diễn giải lý do từ chối..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              showCount
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
