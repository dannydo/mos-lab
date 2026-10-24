'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Input, DatePicker, message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import { Handshake, Clock, AlertCircle } from 'lucide-react';
import type { MosChatTaskItem } from '@mos-lab/shared';

export interface MosChatMobileNegotiateTaskModalProps {
  task: MosChatTaskItem | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (task: MosChatTaskItem, proposedDeadline: string, reason: string) => Promise<void>;
}

export const MosChatMobileNegotiateTaskModal: React.FC<MosChatMobileNegotiateTaskModalProps> = ({
  task,
  open,
  onClose,
  onSubmit,
}) => {
  const [proposedDeadline, setProposedDeadline] = useState<dayjs.Dayjs | null>(null);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (task && open) {
      const baseDate = task.dueAt || task.deadline;
      const initial = task.negotiatedDeadline
        ? dayjs(task.negotiatedDeadline)
        : baseDate
          ? dayjs(baseDate).add(2, 'hour')
          : dayjs().add(2, 'hour');

      setProposedDeadline(initial);
      setReason(task.negotiationNote || '');
    }
  }, [task, open]);

  const handleQuickAdd = (hours: number) => {
    const base = proposedDeadline && proposedDeadline.isValid() ? proposedDeadline : dayjs();
    setProposedDeadline(base.add(hours, 'hour'));
  };

  const handleSetEndOfDay = () => {
    setProposedDeadline(dayjs().hour(18).minute(0).second(0));
  };

  const handleSetTomorrow = () => {
    setProposedDeadline(dayjs().add(1, 'day').hour(12).minute(0).second(0));
  };

  const handleConfirm = async () => {
    if (!task) return;
    if (!proposedDeadline || !proposedDeadline.isValid()) {
      antdMessage.warning('Vui lòng chọn thời hạn bạn đề xuất dời sang');
      return;
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      antdMessage.warning('Vui lòng nhập lý do / giải trình dời hạn');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(task, proposedDeadline.toISOString(), cleanReason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!task) return null;

  const currentDeadline = task.dueAt || task.deadline;

  return (
    <Modal
      open={open}
      zIndex={2600}
      onCancel={onClose}
      onOk={handleConfirm}
      confirmLoading={submitting}
      title={
        <div className="flex items-center gap-2 text-amber-400">
          <Handshake className="w-5 h-5 shrink-0" />
          <span>Thương lượng dời hạn chót</span>
        </div>
      }
      okText="Gửi đề xuất dời hạn"
      cancelText="Hủy"
      centered
    >
      <div className="space-y-3.5 py-2">
        {/* Task summary */}
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 text-xs">
          <p className="font-bold text-white leading-snug">{task.title}</p>
          <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-700/50">
            <span>
              Giao bởi: <strong className="text-slate-200">{task.creatorName || 'Hệ thống'}</strong>
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{currentDeadline ? dayjs(currentDeadline).format('HH:mm DD/MM') : 'Không hạn'}</span>
            </span>
          </div>
        </div>

        {/* Proposed Deadline */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Thời hạn bạn muốn đề xuất dời sang *
          </label>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => handleQuickAdd(2)}
              className="px-2 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-transform"
            >
              +2 giờ
            </button>
            <button
              type="button"
              onClick={handleSetEndOfDay}
              className="px-2 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-transform"
            >
              18:00 Hôm nay
            </button>
            <button
              type="button"
              onClick={handleSetTomorrow}
              className="px-2 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-transform"
            >
              12:00 Ngày mai
            </button>
          </div>
          <DatePicker
            showTime
            format="HH:mm DD/MM/YYYY"
            className="w-full"
            value={proposedDeadline}
            onChange={(d) => setProposedDeadline(d)}
            placeholder="Chọn ngày giờ đề xuất"
          />
        </div>

        {/* Reason / note */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Lý do / Giải trình đề xuất dời hạn *
          </label>
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Em đang ưu tiên hỗ trợ khách tại quầy, xin phép dời sang chiều nay để hoàn tất kỹ hơn ạ..."
          />
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            Sau khi gửi, người giao việc ({task.creatorName || 'người tạo'}) sẽ nhận được thông báo để duyệt hoặc từ
            chối đề xuất dời hạn này.
          </span>
        </div>
      </div>
    </Modal>
  );
};
