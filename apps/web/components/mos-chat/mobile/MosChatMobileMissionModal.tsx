'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Input, Radio } from 'antd';
import { Rocket, Bug, Sparkles, AlertCircle } from 'lucide-react';
import type { MosChatTaskItem } from '@mos-lab/shared';
import { useTheme } from '../../../context/ThemeContext';

export interface MosChatMobileMissionModalProps {
  task: MosChatTaskItem | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    task: MosChatTaskItem,
    missionData: { title: string; type: 'BUG' | 'FEATURE'; note: string }
  ) => Promise<void>;
}

export const MosChatMobileMissionModal: React.FC<MosChatMobileMissionModalProps> = ({
  task,
  open,
  onClose,
  onSubmit,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const [title, setTitle] = useState<string>('');
  const [type, setType] = useState<'BUG' | 'FEATURE'>('FEATURE');
  const [note, setNote] = useState<string>('');
  const [dispatching, setDispatching] = useState<boolean>(false);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      const lower = (task.title || '').toLowerCase();
      const isBug = /(lỗi|sai|hư|không bấm|không chạy|trắng trang|crash|500|404)/i.test(lower);
      setType(isBug ? 'BUG' : 'FEATURE');
      setNote('');
    }
  }, [task, open]);

  const handleConfirm = async () => {
    if (!task) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setDispatching(true);
    try {
      await onSubmit(task, {
        title: cleanTitle,
        type,
        note: note.trim(),
      });
      onClose();
    } finally {
      setDispatching(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      open={open}
      zIndex={2600}
      onCancel={onClose}
      onOk={handleConfirm}
      confirmLoading={dispatching}
      title={
        <div className={`flex items-center gap-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
          <Rocket className="w-5 h-5 shrink-0" />
          <span>Chuyển vào mOS Mission (Gate 1)</span>
        </div>
      }
      okText="Chuyển Mission"
      cancelText="Hủy"
      centered
    >
      <div className="space-y-3.5 py-2">
        <div>
          <label className="text-xs font-semibold text-[var(--mos-text)] block mb-1">Tiêu đề nhiệm vụ mOS Mission *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề nhiệm vụ..." />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--mos-text)] block mb-1.5">Phân loại nhiệm vụ</label>
          <Radio.Group value={type} onChange={(e) => setType(e.target.value)} className="w-full grid grid-cols-2 gap-2">
            <Radio.Button value="FEATURE" className="!flex items-center justify-center gap-1.5 !h-9 text-xs">
              <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <span>Tính năng (Feature)</span>
            </Radio.Button>
            <Radio.Button value="BUG" className="!flex items-center justify-center gap-1.5 !h-9 text-xs">
              <Bug className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
              <span>Sửa lỗi (Bugfix)</span>
            </Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--mos-text)] block mb-1">Ghi chú / Yêu cầu bổ sung</label>
          <Input.TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm về bối cảnh, kỳ vọng hoặc hướng giải quyết..."
          />
        </div>

        <div
          className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] leading-relaxed ${
            isDark
              ? 'bg-purple-500/10 border-purple-500/20 text-purple-300/90'
              : 'bg-purple-50 border-purple-200 text-purple-800'
          }`}
        >
          <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <span>
            Nhiệm vụ sẽ được tạo trực tiếp trên mOS Mission với quyền Super Admin Danny, sẵn sàng cho luồng Cổng 1
            (Handshake IDE).
          </span>
        </div>
      </div>
    </Modal>
  );
};
