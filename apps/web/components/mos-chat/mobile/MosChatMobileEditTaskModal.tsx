'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { MosChatTaskItem, MosChatTaskPriority, SafeAny } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { DEADLINE_PRESETS } from '../constants/chat-constants';

export interface MosChatMobileEditTaskModalProps {
  task: MosChatTaskItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    taskId: string,
    updates: {
      title: string;
      assigneeId?: string;
      assigneeName?: string;
      dueAt?: string | null;
      priority: MosChatTaskPriority;
    }
  ) => Promise<void>;
}

export const MosChatMobileEditTaskModal: React.FC<MosChatMobileEditTaskModalProps> = ({
  task,
  open,
  onClose,
  onSave,
}) => {
  const { staffDirectory, currentUser } = useMosChat();
  const [title, setTitle] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [priority, setPriority] = useState<MosChatTaskPriority>('NORMAL');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setAssigneeId(task.assigneeId ? String(task.assigneeId) : undefined);
      setDueAt(task.dueAt || task.deadline || null);
      setPriority(task.priority || 'NORMAL');
    }
  }, [task, open]);

  // Match current user in staff directory
  const currentStaff = useMemo(() => {
    if (!currentUser) return undefined;
    const cid = Number(currentUser.id);
    const cUser = String(currentUser.username || '').toLowerCase();
    const cName = String(currentUser.fullName || currentUser.name || currentUser.displayName || '').toLowerCase();
    return staffDirectory.find(
      (s) =>
        (cid > 0 && Number(s.id) === cid) ||
        (cUser && String(s.username || '').toLowerCase() === cUser) ||
        (cName && String(s.displayName || '').toLowerCase() === cName)
    );
  }, [currentUser, staffDirectory]);

  // Assignee options with self at the top
  const assigneeOptions = useMemo(() => {
    const list = [...staffDirectory];
    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    const myName =
      currentStaff?.displayName ||
      currentStaff?.username ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      'Danny Do';

    const hasMeInList = myId > 0 && list.some((s) => s.id === myId);

    list.sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      const nameA = a.displayName || a.username || '';
      const nameB = b.displayName || b.username || '';
      return nameA.localeCompare(nameB, 'vi');
    });

    const opts = list.map((s) => {
      const isMe = s.id === myId;
      const roleStr = s.role ? ` (${s.role})` : '';
      const name = s.displayName || s.username;
      const emailHint = s.username && s.displayName && s.username !== s.displayName ? ` · ${s.username}` : '';
      return {
        value: String(s.id),
        label: isMe ? `⭐ Chính tôi (${name})` : `${name}${emailHint}${roleStr}`,
      };
    });

    if (!hasMeInList && myId > 0) {
      opts.unshift({
        value: String(myId),
        label: `⭐ Chính tôi (${myName})`,
      });
    }

    return opts;
  }, [staffDirectory, currentStaff, currentUser]);

  const handleConfirm = async () => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const selectedStaff = staffDirectory.find((s) => String(s.id) === String(assigneeId));
      const resolvedName =
        selectedStaff?.displayName || selectedStaff?.username || (assigneeId ? task.assigneeName : undefined);

      await onSave(task.id, {
        title: trimmed,
        assigneeId,
        assigneeName: resolvedName,
        dueAt,
        priority,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      zIndex={2600}
      onCancel={onClose}
      onOk={handleConfirm}
      confirmLoading={saving}
      title="Chỉnh sửa công việc"
      okText="Lưu thay đổi"
      cancelText="Hủy"
      centered
    >
      <div className="space-y-3 py-2">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Nội dung công việc *</label>
          <Input.TextArea
            rows={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập chi tiết công việc..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Người thực hiện</label>
          <Select
            className="w-full"
            placeholder="Chọn người được giao"
            value={assigneeId}
            onChange={(val) => setAssigneeId(val)}
            allowClear
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={assigneeOptions}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Thời hạn hoàn thành (Deadline)</label>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {DEADLINE_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const d = p.getDate();
                  setDueAt(d ? d.toISOString() : null);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-transform"
              >
                {p.label}
              </button>
            ))}
          </div>
          <DatePicker
            showTime
            format="HH:mm DD/MM/YYYY"
            className="w-full"
            value={dueAt ? dayjs(dueAt) : null}
            onChange={(d) => setDueAt(d ? d.toISOString() : null)}
            placeholder="Hoặc chọn ngày giờ cụ thể"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Mức độ ưu tiên</label>
          <Select
            className="w-full"
            value={priority}
            onChange={(val) => setPriority(val)}
            options={[
              { value: 'NORMAL', label: 'P2 · Bình thường' },
              { value: 'HIGH', label: 'P1 · Ưu tiên cao' },
              { value: 'URGENT', label: 'P0 · Khẩn cấp' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};
