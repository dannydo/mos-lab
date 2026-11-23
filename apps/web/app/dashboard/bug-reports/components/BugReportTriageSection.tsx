'use client';

import { Button, Input, Select, Typography } from 'antd';
import type { BugPriority, BugReportDetail, BugReportStatus } from '@mos-lab/shared';
import { SectionCard } from '../../../../components/ui';
import { RichTextEditor } from '../../../../components/ui/rich-text';
import { STATUS_LABELS, TRANSITIONS } from '../bug-report-presenters';

const { Text } = Typography;

export type BugReportTriageSectionProps = {
  detail: BugReportDetail;
  isDeferred: boolean;
  status: BugReportStatus;
  onStatusChange: (value: BugReportStatus) => void;
  priority: BugPriority | null;
  onPriorityChange: (value: BugPriority | null) => void;
  businessContext: string;
  onBusinessContextChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  duplicateKey: string;
  onDuplicateKeyChange: (value: string) => void;
  saving: boolean;
  onSave: () => void;
};

export function BugReportTriageSection({
  detail,
  isDeferred,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  businessContext,
  onBusinessContextChange,
  note,
  onNoteChange,
  duplicateKey,
  onDuplicateKeyChange,
  saving,
  onSave,
}: BugReportTriageSectionProps) {
  return (
    <SectionCard title={detail.requestType === 'FEATURE' ? 'Danny quyết định sản phẩm' : 'Danny triage'}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <Text strong>Trạng thái</Text>
          <Select
            value={status}
            onChange={onStatusChange}
            options={TRANSITIONS[detail.status].map((item) => ({
              value: item,
              label: item === 'REJECTED' && isDeferred ? 'Tạm hoãn' : STATUS_LABELS[item],
            }))}
            getPopupContainer={(node) => node.parentElement || document.body}
            className="w-full"
          />
        </label>
        <label className="space-y-1">
          <Text strong>Ưu tiên</Text>
          <Select
            allowClear
            placeholder="Chọn P0–P3"
            value={priority}
            onChange={(value) => onPriorityChange(value ?? null)}
            options={(['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((item) => ({
              value: item,
              label: item,
            }))}
            getPopupContainer={(node) => node.parentElement || document.body}
            className="w-full"
          />
        </label>
      </div>
      <label className="mt-4 block space-y-1">
        <Text strong>
          {detail.requestType === 'FEATURE' ? 'Phạm vi / acceptance criteria' : 'Biz logic / kết quả đúng'}
        </Text>
        <RichTextEditor
          value={businessContext}
          onChange={(val) => onBusinessContextChange(val)}
          placeholder={
            detail.requestType === 'FEATURE'
              ? 'Ghi phạm vi đã chốt, điều kiện được xem là đạt và giới hạn nếu có'
              : 'Bổ sung điều Agent cần hiểu về nghiệp vụ hoặc kết quả đúng mong muốn'
          }
          maxLength={4000}
          rows={4}
        />
      </label>
      <label className="mt-4 block space-y-1">
        <Text strong>Ghi chú xử lý</Text>
        <Input.TextArea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Bắt buộc khi Fixed, Rejected, mở lại hoặc dùng Đóng ngoại lệ"
          maxLength={2000}
          autoSize={{ minRows: 2, maxRows: 6 }}
          showCount
        />
      </label>
      {status === 'DUPLICATE' && (
        <label className="mt-4 block space-y-1">
          <Text strong>Ticket gốc</Text>
          <Input
            value={duplicateKey}
            onChange={(event) => onDuplicateKeyChange(event.target.value)}
            placeholder="MOS-BUG-123 hoặc MOS-FEAT-123"
          />
        </label>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="primary" loading={saving} onClick={onSave}>
          Lưu triage
        </Button>
      </div>
    </SectionCard>
  );
}
