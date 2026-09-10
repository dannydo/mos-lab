'use client';

import { Alert, Button, Card, Input, Segmented, Space, Statistic, Tag, Typography } from 'antd';
import type { PayrollAdjustmentLabCaseResponse, PayrollAdjustmentLabHrCustomResponse } from '@mos-lab/shared';

const { Text } = Typography;

type TargetPeriodStatus = 'OPEN' | 'REVIEWING';

type HrCustomAdjustmentCardProps = {
  amount: string;
  comment: string;
  targetStatus: TargetPeriodStatus;
  result: PayrollAdjustmentLabHrCustomResponse | null;
  error: string | null;
  loading: boolean;
  adjustmentCase: PayrollAdjustmentLabCaseResponse['adjustmentCase'] | null;
  onAmountChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onTargetStatusChange: (value: TargetPeriodStatus) => void;
  onValidate: () => void;
  onCreateDraft: () => void;
  onDecision: (decision: 'APPROVE' | 'REJECT') => void;
  formatAmountInput: (value: string) => string;
  parseWholeDong: (value: string) => number | null;
  formatDong: (value: number | null | undefined) => string;
};

export function HrCustomAdjustmentCard({
  amount,
  comment,
  targetStatus,
  result,
  error,
  loading,
  adjustmentCase,
  onAmountChange,
  onCommentChange,
  onTargetStatusChange,
  onValidate,
  onCreateDraft,
  onDecision,
  formatAmountInput,
  parseWholeDong,
  formatDong,
}: HrCustomAdjustmentCardProps) {
  const isLocked = adjustmentCase !== null;
  const canCreate =
    parseWholeDong(amount) !== null &&
    parseWholeDong(amount) !== 0 &&
    Boolean(comment.trim()) &&
    targetStatus === 'OPEN';

  return (
    <Card title="HR Custom Adjustment · không cần reference kỳ cũ" bordered>
      <Space direction="vertical" size={16} className="w-full">
        <Alert
          type="warning"
          showIcon
          message="Custom không dùng snapshot Trước/Sau"
          description="Đây là quyết định HR mới. Reference của nó là chính case kiểm toán: số tiền VND nguyên, comment, người tạo, người duyệt và kỳ nhận. Chưa có quyền tạo case hoặc post."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <Text strong>Số tiền · VND</Text>
            <Input
              value={amount}
              onChange={(event) => onAmountChange(formatAmountInput(event.target.value))}
              inputMode="numeric"
              disabled={isLocked}
            />
          </label>
          <label className="block">
            <Text strong>Comment bắt buộc</Text>
            <Input value={comment} onChange={(event) => onCommentChange(event.target.value)} disabled={isLocked} />
          </label>
        </div>
        <div>
          <Text strong>Kỳ nhận của HR Custom</Text>
          <Segmented<TargetPeriodStatus>
            className="mt-2 w-full"
            options={[
              { label: 'OPEN', value: 'OPEN' },
              { label: 'REVIEWING', value: 'REVIEWING' },
            ]}
            value={targetStatus}
            onChange={onTargetStatusChange}
            disabled={isLocked}
          />
        </div>
        <Button type="default" loading={loading} disabled={isLocked} onClick={onValidate}>
          Kiểm tra HR Custom local
        </Button>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {adjustmentCase ? (
          <Space direction="vertical" size={8} className="w-full">
            <Alert
              type={
                adjustmentCase.status === 'APPROVED'
                  ? 'success'
                  : adjustmentCase.status === 'REJECTED'
                    ? 'warning'
                    : 'info'
              }
              showIcon
              message="Custom case đã khóa theo audit riêng"
              description="Không có reference kỳ cũ. Reference kiểm toán là số tiền, comment, người tạo, người duyệt và kỳ nhận đang mở của chính case này."
            />
            <div>
              <Tag
                color={
                  adjustmentCase.status === 'APPROVED' ? 'green' : adjustmentCase.status === 'REJECTED' ? 'red' : 'gold'
                }
              >
                {adjustmentCase.status}
              </Tag>
              <Text className="ml-2">
                Người tạo: {adjustmentCase.requestedBy || '—'} · Người duyệt: {adjustmentCase.approvedBy || '—'}
              </Text>
            </div>
            <Statistic title="HR Custom Adjustment" value={formatDong(adjustmentCase.deltaAmount)} />
            <Text type="secondary">Comment: {adjustmentCase.reason || '—'}</Text>
            <Text type="secondary">
              Audit: {adjustmentCase.audit.map((entry) => `${entry.action} · ${entry.actorName}`).join(' → ')}
            </Text>
            <Text type="secondary">Posting: {adjustmentCase.lines.map((line) => line.postingState).join(', ')}</Text>
            {adjustmentCase.status === 'READY_FOR_APPROVAL' ? (
              <Space wrap>
                <Button type="primary" loading={loading} onClick={() => onDecision('APPROVE')}>
                  Duyệt HR Custom local
                </Button>
                <Button danger loading={loading} onClick={() => onDecision('REJECT')}>
                  Từ chối HR Custom local
                </Button>
              </Space>
            ) : null}
          </Space>
        ) : result ? (
          <Alert
            type="success"
            showIcon
            message={`Hợp lệ để tạo draft review: ${formatDong(result.draft.amount)}`}
            description="Lab chỉ xác thực contract. Bước tiếp theo sẽ tạo một HR Custom case local riêng, có audit và không có payout."
          />
        ) : null}
        {!adjustmentCase ? (
          <Button type="primary" loading={loading} disabled={!canCreate} onClick={onCreateDraft}>
            Tạo HR Custom draft local
          </Button>
        ) : null}
      </Space>
    </Card>
  );
}
