'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, List, Select, Space, Spin, Tag, Typography } from 'antd';
import type {
  ExperienceJournalFingerprint,
  ExperienceJournalListResponse,
  ExperienceJournalTriageStatus,
} from '@mos-lab/shared';
import { Activity, RefreshCw, ShieldAlert } from 'lucide-react';
import { AdaptiveDrawer, AppIcon } from '../../../../components/ui';

const { Text, Paragraph } = Typography;

const triageLabels: Record<ExperienceJournalTriageStatus, string> = {
  OPEN: 'Chưa triage',
  ACKNOWLEDGED: 'Đang theo dõi',
  RESOLVED: 'Đã xử lý',
};

function severityColor(severity: ExperienceJournalFingerprint['severity']) {
  return severity === 'CRITICAL' || severity === 'ERROR' ? 'error' : severity === 'WARNING' ? 'warning' : 'processing';
}

export function ExperienceJournalDrawer({
  open,
  onClose,
  list,
  triage,
}: {
  open: boolean;
  onClose: () => void;
  list: () => Promise<ExperienceJournalListResponse>;
  triage: (fingerprint: string, status: ExperienceJournalTriageStatus) => Promise<ExperienceJournalFingerprint>;
}) {
  const [data, setData] = useState<ExperienceJournalListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await list());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải Journal.');
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const updateTriage = useCallback(
    async (row: ExperienceJournalFingerprint, status: ExperienceJournalTriageStatus) => {
      const updated = await triage(row.fingerprint, status);
      setData((current) =>
        current
          ? {
              ...current,
              data: current.data.map((item) => (item.fingerprint === updated.fingerprint ? updated : item)),
            }
          : current
      );
    },
    [triage]
  );

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      destroyOnHidden
      intent="data"
      title="Nhật ký Experience & Reliability"
    >
      <Space direction="vertical" size="middle" className="w-full">
        <Alert
          type="info"
          showIcon
          icon={<AppIcon icon={ShieldAlert} size="sm" />}
          message="Chỉ dành cho vận hành"
          description="Dữ liệu ở đây được lọc trước khi lưu. Người báo không thấy retry, log nội bộ hoặc chi tiết hạ tầng."
          action={
            <Button icon={<AppIcon icon={RefreshCw} size="sm" />} loading={loading} onClick={() => void refresh()}>
              Tải lại
            </Button>
          }
        />
        {loading && !data ? (
          <div className="py-16 text-center">
            <Spin />
          </div>
        ) : null}
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {data ? (
          <>
            <Text type="secondary">
              {data.total.toLocaleString('vi-VN')} nhóm lỗi · event gốc append-only, tự hết hạn sau 90 ngày
            </Text>
            <List
              dataSource={data.data}
              locale={{ emptyText: 'Chưa có sự cố nào được ghi nhận.' }}
              renderItem={(row) => (
                <List.Item key={row.fingerprint} className="!items-start">
                  <Space direction="vertical" size={4} className="min-w-0 flex-1">
                    <Space wrap size={6}>
                      <Tag color={severityColor(row.severity)}>{row.severity}</Tag>
                      <Tag>{row.category}</Tag>
                      <Text strong>
                        {row.component} · {row.code}
                      </Text>
                      <Text type="secondary" className="tabular-nums">
                        {row.occurrenceCount} lần
                      </Text>
                    </Space>
                    <Paragraph className="!mb-0" ellipsis={{ rows: 2, expandable: 'collapsible' }}>
                      {row.summary}
                    </Paragraph>
                    <Text type="secondary" className="tabular-nums">
                      Gần nhất {new Date(row.lastOccurredAt).toLocaleString('vi-VN')}
                    </Text>
                  </Space>
                  <Select
                    value={row.triageStatus}
                    className="min-w-36"
                    options={(Object.keys(triageLabels) as ExperienceJournalTriageStatus[]).map((value) => ({
                      value,
                      label: triageLabels[value],
                    }))}
                    onChange={(value) => void updateTriage(row, value as ExperienceJournalTriageStatus)}
                  />
                </List.Item>
              )}
            />
            {data.recentEvents.length ? (
              <List
                size="small"
                header={
                  <Text strong>
                    <AppIcon icon={Activity} size="sm" /> Sự kiện mới nhất
                  </Text>
                }
                dataSource={data.recentEvents.slice(0, 5)}
                renderItem={(event) => (
                  <List.Item>
                    <Text type="secondary">
                      {event.component} · {event.code} · {new Date(event.occurredAt).toLocaleString('vi-VN')}
                    </Text>
                  </List.Item>
                )}
              />
            ) : null}
          </>
        ) : null}
      </Space>
    </AdaptiveDrawer>
  );
}
