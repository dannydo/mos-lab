'use client';

import { Button, Input, Space, Typography } from 'antd';
import { AdaptiveModal } from '../../../../components/ui';

const { Text, Paragraph } = Typography;

export const DEFER_QUICK_REASONS = [
  'Chưa có kế hoạch trong vài tháng tới',
  'Chờ hoàn thiện hạ tầng / quy trình liên quan',
  'Ưu tiên các mục tiêu cấp bách khác',
];

export interface BugReportDeferModalProps {
  open: boolean;
  saving: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function BugReportDeferModal({
  open,
  saving,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: BugReportDeferModalProps) {
  return (
    <AdaptiveModal
      title="Tạm hoãn triển khai ticket?"
      open={open}
      onCancel={() => !saving && onCancel()}
      okText="Xác nhận tạm hoãn"
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{ disabled: reason.trim().length < 5 || saving }}
      onOk={onConfirm}
    >
      <Paragraph>
        Ticket sẽ được đưa vào kho lưu trữ tạm hoãn (Won&apos;t Do Now) và không làm nhiễu danh sách xử lý hàng ngày.
        Toàn bộ bối cảnh và thảo luận vẫn được lưu giữ nguyên vẹn để mở lại bất kỳ lúc nào.
      </Paragraph>
      <div className="mb-3 space-y-1">
        <Text type="secondary" className="text-xs">
          Gợi ý lý do nhanh:
        </Text>
        <Space wrap size={[0, 8]}>
          {DEFER_QUICK_REASONS.map((quickReason) => (
            <Button key={quickReason} size="small" onClick={() => onReasonChange(quickReason)}>
              {quickReason}
            </Button>
          ))}
        </Space>
      </div>
      <Input.TextArea
        aria-label="Lý do tạm hoãn"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        maxLength={2000}
        showCount
        rows={4}
        placeholder="Nêu lý do tạm hoãn triển khai (tối thiểu 5 ký tự)..."
      />
    </AdaptiveModal>
  );
}
