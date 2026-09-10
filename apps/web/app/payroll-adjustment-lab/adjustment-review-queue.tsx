'use client';

import { Alert, Avatar, Card, Space, Statistic, Tag, Typography } from 'antd';
import type { PayrollAdjustmentLabCase } from '@mos-lab/shared';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

type QueueFilter = 'ALL' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'REJECTED';

function formatDong(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toLocaleString('en-US')} đ`;
}

function caseStatusColor(status: string) {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'READY_FOR_APPROVAL') return 'gold';
  return 'blue';
}

function recipientInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function AdjustmentReviewQueue({ cases }: { cases: readonly PayrollAdjustmentLabCase[] }) {
  const [filter, setFilter] = useState<QueueFilter>('ALL');
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  const visibleCases = useMemo(
    () => (filter === 'ALL' ? cases : cases.filter((adjustmentCase) => adjustmentCase.status === filter)),
    [cases, filter]
  );
  const selectedCase = useMemo(
    () => cases.find((adjustmentCase) => adjustmentCase.reference === selectedReference) || null,
    [cases, selectedReference]
  );

  useEffect(() => {
    if (selectedReference && cases.some((adjustmentCase) => adjustmentCase.reference === selectedReference)) return;
    setSelectedReference(cases[0]?.reference ?? null);
  }, [cases, selectedReference]);

  const chooseFilter = (value: QueueFilter) => {
    setFilter(value);
    const first = value === 'ALL' ? cases[0] : cases.find((adjustmentCase) => adjustmentCase.status === value);
    setSelectedReference(first?.reference ?? null);
  };

  const filters: ReadonlyArray<readonly [QueueFilter, string]> = [
    ['ALL', `Tất cả (${cases.length})`],
    [
      'READY_FOR_APPROVAL',
      `Chờ duyệt (${cases.filter((adjustmentCase) => adjustmentCase.status === 'READY_FOR_APPROVAL').length})`,
    ],
    ['APPROVED', `Đã duyệt (${cases.filter((adjustmentCase) => adjustmentCase.status === 'APPROVED').length})`],
    ['REJECTED', `Đã từ chối (${cases.filter((adjustmentCase) => adjustmentCase.status === 'REJECTED').length})`],
  ];

  return (
    <Card size="small" title="Adjustment Review Queue · local">
      <Space direction="vertical" size={12} className="w-full">
        <Alert
          type="info"
          showIcon
          message="Queue chỉ đọc, không có nút post tiền"
          description="Mỗi dòng là một case bất biến. Chọn một dòng để xem nguồn, người tạo, người duyệt, comment, audit và trạng thái posting."
        />
        <div className="flex flex-wrap items-center justify-start gap-2" aria-label="Lọc Adjustment Review Queue">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              className={
                filter === value
                  ? 'shrink-0 rounded-md border border-amber-300/50 bg-amber-300/70 px-3 py-2 text-left text-slate-950'
                  : 'shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-left text-slate-100 hover:border-slate-500'
              }
              onClick={() => chooseFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {visibleCases.length ? (
          <Space direction="vertical" size={8} className="w-full">
            {visibleCases.map((adjustmentCase) => {
              const recipient = adjustmentCase.lines[0]?.recipient;
              return (
                <button
                  key={adjustmentCase.reference}
                  type="button"
                  aria-pressed={adjustmentCase.reference === selectedReference}
                  className={
                    adjustmentCase.reference === selectedReference
                      ? 'w-full rounded-md border border-amber-300/50 bg-amber-300/70 px-3 py-3 text-left text-slate-950'
                      : 'w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-3 text-left text-slate-100 hover:border-slate-500'
                  }
                  onClick={() => setSelectedReference(adjustmentCase.reference)}
                >
                  <Space wrap size={8} className="flex! w-full! justify-start! text-left!">
                    {recipient ? (
                      <Avatar src={recipient.avatarUrl || undefined} size={36}>
                        {recipientInitials(recipient.displayName)}
                      </Avatar>
                    ) : null}
                    <Tag color={caseStatusColor(adjustmentCase.status)}>{adjustmentCase.status}</Tag>
                    <Text strong>
                      {adjustmentCase.sourceType} · {adjustmentCase.adjustmentType}
                    </Text>
                    <Text>{formatDong(adjustmentCase.deltaAmount)}</Text>
                    {recipient ? (
                      <Text>
                        {recipient.displayName} · {recipient.role} · {recipient.branchName}
                      </Text>
                    ) : null}
                    <Text type="secondary">
                      Tạo: {adjustmentCase.requestedBy || '—'} · Duyệt: {adjustmentCase.approvedBy || '—'}
                    </Text>
                  </Space>
                </button>
              );
            })}
          </Space>
        ) : (
          <Text type="secondary">Chưa có case nào trong filter này.</Text>
        )}
        {selectedCase ? (
          <Card type="inner" size="small" title="Chi tiết case đang chọn">
            <Space direction="vertical" size={8} className="w-full">
              <div>
                <Tag color={caseStatusColor(selectedCase.status)}>{selectedCase.status}</Tag>
                <Text className="ml-2">
                  {selectedCase.sourceType} · {selectedCase.adjustmentType}
                </Text>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Statistic
                  title={selectedCase.sourceType === 'HR' ? 'Số tiền' : 'Trước'}
                  value={formatDong(
                    selectedCase.sourceType === 'HR' ? selectedCase.deltaAmount : selectedCase.beforeAmount
                  )}
                />
                {selectedCase.sourceType === 'HR' ? (
                  <Statistic title="Kỳ nhận" value="OPEN" />
                ) : (
                  <Statistic title="Sau" value={formatDong(selectedCase.afterAmount)} />
                )}
                <Statistic title="Delta" value={formatDong(selectedCase.deltaAmount)} />
              </div>
              <Text type="secondary">Lý do / comment: {selectedCase.reason || '—'}</Text>
              {selectedCase.lines.map((line) => (
                <Card type="inner" size="small" key={`${line.component}-${line.recipient.legacyStaffId}`}>
                  <Space wrap size={10}>
                    <Avatar src={line.recipient.avatarUrl || undefined} size={44}>
                      {recipientInitials(line.recipient.displayName)}
                    </Avatar>
                    <div>
                      <Text strong>{line.recipient.displayName}</Text>
                      <div>
                        <Tag color="blue">{line.recipient.role}</Tag>
                        <Tag color="cyan">{line.recipient.branchName}</Tag>
                        <Tag color={line.recipient.snapshotState === 'STORED' ? 'green' : 'gold'}>
                          {line.recipient.snapshotState === 'STORED' ? 'Snapshot đã lưu' : 'Mẫu local trước contract'}
                        </Tag>
                        <Text>
                          {line.component} · {formatDong(line.deltaAmount)}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Card>
              ))}
              <Text type="secondary">
                Audit: {selectedCase.audit.map((entry) => `${entry.action} · ${entry.actorName}`).join(' → ')}
              </Text>
              <Text type="secondary">Posting: {selectedCase.lines.map((line) => line.postingState).join(', ')}</Text>
            </Space>
          </Card>
        ) : null}
      </Space>
    </Card>
  );
}
