'use client';

import React from 'react';
import { Modal, Input, Select } from 'antd';
import type { MosChatMissionExecutionTrack } from '@mos-lab/shared';

export interface MissionProposalModalProps {
  open: boolean;
  isDark: boolean;
  title: string;
  onChangeTitle: (value: string) => void;
  requestType: 'BUG' | 'FEATURE';
  onChangeRequestType: (value: 'BUG' | 'FEATURE') => void;
  executionTrack: MosChatMissionExecutionTrack;
  onChangeExecutionTrack: (value: MosChatMissionExecutionTrack) => void;
  note: string;
  onChangeNote: (value: string) => void;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}

const EXECUTION_TRACK_OPTIONS: Array<{
  value: MosChatMissionExecutionTrack;
  label: string;
  description: string;
}> = [
  {
    value: 'CODE_ENGINEERING',
    label: '⚙️ Kỹ thuật & Mã nguồn (Code / UI / API)',
    description: 'Cổng 1: Phương án → Cổng 2: Duyệt Commit & Test → Cổng 3: Deploy Production',
  },
  {
    value: 'PROCESS_CANON',
    label: '📖 Quy trình & Kinh Thánh mOS (Canon / Workflow / Policy)',
    description: 'Cổng 1: Phương án → Cổng 2: Duyệt Bản Thảo Điều Răn → Cổng 3: Áp Dụng Quy Trình',
  },
  {
    value: 'DATA_DECISION',
    label: '📊 Xử lý Dữ liệu & Ra Quyết Định (Ledger / Allocation / Batch)',
    description: 'Cổng 1: Phương án → Cổng 2: Duyệt Dry-Run Preview → Cổng 3: Thực Thi Dữ Liệu',
  },
];

export const MissionProposalModal: React.FC<MissionProposalModalProps> = ({
  open,
  isDark,
  title,
  onChangeTitle,
  requestType,
  onChangeRequestType,
  executionTrack,
  onChangeExecutionTrack,
  note,
  onChangeNote,
  submitting = false,
  onCancel,
  onSubmit,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={submitting}
      title="🚀 Nâng cấp thành Nhiệm vụ mOS Mission (Universal 3-Gate AI)"
      okText="Giao sang mOS Mission"
      cancelText="Hủy"
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tiêu đề Nhiệm vụ (Mission)</div>
          <Input
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Nhập tiêu đề nhiệm vụ rõ ràng..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Phân loại yêu cầu</div>
            <Select
              style={{ width: '100%' }}
              value={requestType}
              onChange={onChangeRequestType}
              options={[
                { value: 'FEATURE', label: '✨ Cải tiến / Nâng cấp (FEATURE)' },
                { value: 'BUG', label: '🐞 Sửa lỗi / Sự cố (BUG)' },
              ]}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Chế độ thực thi AI (3 Cổng)</div>
            <Select
              style={{ width: '100%' }}
              value={executionTrack}
              onChange={onChangeExecutionTrack}
              options={EXECUTION_TRACK_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
          </div>
        </div>

        <div
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 11.5,
            background: isDark ? 'rgba(139, 92, 246, 0.1)' : '#f5f3ff',
            border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.25)' : '#ddd6fe'}`,
            color: isDark ? '#ddd6fe' : '#5b21b6',
          }}
        >
          {EXECUTION_TRACK_OPTIONS.find((o) => o.value === executionTrack)?.description}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            Ghi chú chỉ đạo / Ngữ cảnh bổ sung cho AI
          </div>
          <Input.TextArea
            rows={3}
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder="Mô tả kỳ vọng kết quả, phạm vi áp dụng hoặc lưu ý đặc biệt..."
          />
        </div>
      </div>
    </Modal>
  );
};
