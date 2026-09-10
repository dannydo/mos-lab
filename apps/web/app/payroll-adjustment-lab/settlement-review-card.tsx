'use client';

import { Button, Card, Space, Tag, Typography } from 'antd';
import type { PayrollAdjustmentLabSettlementReviewResponse } from '@mos-lab/shared';

const { Text } = Typography;

export function SettlementReviewCard({
  review,
  locking,
  canLock,
  onLock,
}: {
  review: PayrollAdjustmentLabSettlementReviewResponse | null;
  locking: boolean;
  canLock: boolean;
  onLock: () => void;
}) {
  const money = (amount: number | null) => (amount == null ? '—' : `${amount.toLocaleString('en-US')} đ`);
  return (
    <Card size="small" title="Nghi thức chốt kỳ · local">
      {review ? (
        <Space direction="vertical" size={8} className="w-full">
          <Text strong>
            {review.period.label} · {review.period.status}
          </Text>
          <Text type="secondary">
            Event đã bị chốt đầu vào ngay khi review được tạo. Chỉ đọc; chưa có nút post tiền.
          </Text>
          {review.subjects.map((subject) => (
            <div key={subject.subjectKey} className="rounded border border-slate-700 px-3 py-2">
              <Text strong>{subject.subjectKey}</Text>
              <br />
              <Text type="secondary">
                {subject.input.policy.policyReference} · {subject.input.policy.policyVersion}
              </Text>
              <br />
              <Text>
                Nhận {money(subject.result.receivedAmount)} · Hold {money(subject.result.holdAmount)} ·{' '}
                {subject.result.grossAmount.toLocaleString('en-US')} đ tổng
              </Text>
            </div>
          ))}
          {review.period.status === 'REVIEWING' ? (
            <Button type="primary" loading={locking} disabled={!canLock} onClick={onLock}>
              Khóa settlement local
            </Button>
          ) : (
            <Tag color="green">Settlement đã LOCKED · sẵn sàng xuất snapshot</Tag>
          )}
        </Space>
      ) : (
        <Text type="secondary">Đang chuẩn bị review local…</Text>
      )}
    </Card>
  );
}
