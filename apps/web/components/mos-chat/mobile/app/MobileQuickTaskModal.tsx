'use client';

import React from 'react';
import { Input, Modal, Select } from 'antd';
import type { MosChatStaffMember, MosChatTaskItem, MosChatTaskPriority, SafeAny } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { MosChatMobileDateTimePicker } from '../MosChatMobileDateTimePicker';
import type { MobileTaskAssigneeOption } from './useMobileTaskWorkflow';

interface MobileQuickTaskModalProps {
  open: boolean;
  editingTaskForModal: MosChatTaskItem | null;
  inThread: boolean;
  taskTitle: string;
  taskAssigneeId: string | undefined;
  taskDueAt: string | null;
  taskPriority: MosChatTaskPriority;
  assigneeOptions: MobileTaskAssigneeOption[];
  staffDirectory: MosChatStaffMember[];
  onCancel: () => void;
  onOk: () => void;
  onChangeTitle: (value: string) => void;
  onChangeAssignee: (value: string | undefined) => void;
  onChangeDueAt: (value: string | null) => void;
  onChangePriority: (value: MosChatTaskPriority) => void;
}

export const MobileQuickTaskModal: React.FC<MobileQuickTaskModalProps> = ({
  open,
  editingTaskForModal,
  inThread,
  taskTitle,
  taskAssigneeId,
  taskDueAt,
  taskPriority,
  assigneeOptions,
  staffDirectory,
  onCancel,
  onOk,
  onChangeTitle,
  onChangeAssignee,
  onChangeDueAt,
  onChangePriority,
}) => {
  return (
    <Modal
      open={open}
      zIndex={2500}
      onCancel={onCancel}
      onOk={onOk}
      title={editingTaskForModal ? 'Cập nhật Main Task' : inThread ? 'Giao việc cho Main Task' : 'Giao việc & Hạn chót'}
      okText={editingTaskForModal ? 'Lưu thay đổi' : 'Tạo công việc'}
      cancelText="Hủy"
      centered
      width="calc(100vw - 24px)"
      style={{ maxWidth: 440, margin: '0 auto' }}
      className="mos-mobile-task-modal"
    >
      <div className="space-y-3.5 py-2">
        <div>
          <label className="text-xs font-semibold text-[var(--mos-text-muted)] block mb-1">Nội dung công việc *</label>
          <Input.TextArea
            rows={3}
            value={taskTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Nhập chi tiết công việc cần giao..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--mos-text-muted)] block mb-1">Người thực hiện</label>
          <Select
            className="w-full"
            placeholder="Chọn người được giao (Mặc định: Chính tôi)"
            value={taskAssigneeId}
            onChange={(val) => onChangeAssignee(val)}
            allowClear
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={assigneeOptions}
            optionRender={(option) => {
              const data = option.data as SafeAny;
              const staffName = data?.displayName || String(option.label || '');
              return (
                <div className="flex items-center gap-2 py-0.5 min-w-0">
                  <MosChatAvatar
                    size="xs"
                    src={data?.avatarUrl}
                    name={staffName}
                    staffId={data?.staffId ?? option.value}
                    staffDirectory={staffDirectory}
                  />
                  <span className="truncate text-xs font-medium">{option.label}</span>
                </div>
              );
            }}
            labelRender={(props) => {
              const matched = assigneeOptions.find((o) => String(o.value) === String(props.value));
              const staffName = matched?.displayName || String(props.label || props.value || '');
              return (
                <span className="inline-flex items-center gap-2 min-w-0">
                  <MosChatAvatar
                    size="xs"
                    src={matched?.avatarUrl}
                    name={staffName}
                    staffId={matched?.staffId ?? (props.value as string | number)}
                    staffDirectory={staffDirectory}
                  />
                  <span className="truncate">{matched?.label || props.label || props.value}</span>
                </span>
              );
            }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--mos-text-muted)] block mb-1.5">
            Thời hạn hoàn thành (Deadline)
          </label>
          <MosChatMobileDateTimePicker
            value={taskDueAt}
            onChange={(d) => onChangeDueAt(d)}
            placeholder="Hoặc chọn ngày giờ cụ thể"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--mos-text-muted)] block mb-1">Mức độ ưu tiên</label>
          <Select
            className="w-full"
            value={taskPriority}
            onChange={(val) => onChangePriority(val)}
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
