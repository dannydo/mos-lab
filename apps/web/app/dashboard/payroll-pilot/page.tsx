'use client';

import { Alert, Button, Collapse, Descriptions, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { NativeCcPilotDashboardResponse } from '@mos-lab/shared';
import { RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppIcon, DataSection, DataTable, FeaturePage, MetricGrid, StatusTag } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

const { Text } = Typography;

type PilotRow = NativeCcPilotDashboardResponse['rows'][number];

function formatHalfDong(amountHalfDong: number): string {
  const amount = amountHalfDong / 2;
  return `${amount.toLocaleString('vi-VN', { minimumFractionDigits: amount % 1 ? 1 : 0 })} đ`;
}

function evidenceLabel(kind: PilotRow['evidence'][number]['kind']): string {
  if (kind === 'COMPLETED_SERVICE') return 'Dịch vụ hoàn thành';
  if (kind === 'DAILY_SALES_CLOSE') return 'Chốt doanh số ngày';
  return 'Cash Tip';
}

function componentLabel(component: string): string {
  if (component === 'CC_XOAY_CASH') return 'CC Xoay Cash';
  if (component === 'CC_DAILY_BONUS') return 'Daily Bonus';
  if (component === 'CC_TIP_CASH') return 'Cash Tip';
  if (component === 'CC_XOAY_CAP_HOLD') return 'HOLD vượt cap Xoay';
  if (component === 'CC_POLICY_FINALIZED') return 'Policy tháng đã chốt';
  return component;
}

export default function PayrollPilotPage() {
  const [dashboard, setDashboard] = useState<NativeCcPilotDashboardResponse | null>(null);
  const [periodKey, setPeriodKey] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPeriodKey?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.payrollLedger.ccPilotDashboard({ periodKey: nextPeriodKey });
      setDashboard(result);
      setPeriodKey(result.activePeriodKey || undefined);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không thể tải dashboard pilot CC.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<ColumnsType<PilotRow>>(
    () => [
      {
        title: 'CC pilot',
        key: 'staff',
        render: (_, row) => (
          <Space direction="vertical" size={2}>
            <Text strong>{row.displayName}</Text>
            <Text type="secondary" className="text-xs">
              {row.subjectKey}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Evidence mOS',
        key: 'evidence',
        render: (_, row) => <Text className="tabular-nums">{row.evidence.length} dòng</Text>,
      },
      {
        title: 'Ledger',
        key: 'ledger',
        render: (_, row) => <Text className="tabular-nums">{row.ledger.length} dòng</Text>,
      },
      {
        title: 'Policy tháng',
        key: 'finalized',
        render: (_, row) =>
          row.finalized ? (
            <StatusTag status="success" label="Đã finalize" />
          ) : (
            <StatusTag status="warning" label="Chờ evidence" />
          ),
      },
    ],
    []
  );

  const evidenceCount = dashboard?.summary.evidenceCount ?? 0;
  const hasPeriod = Boolean(dashboard?.activePeriodKey);

  return (
    <FeaturePage
      title="Pilot Payroll CC"
      subtitle="Theo dõi evidence mOS và ledger của bốn CC pilot. Màn này chỉ đọc, không import Legacy và không có payout."
      icon={<AppIcon icon={ShieldCheck} size="lg" />}
      tag={<StatusTag status="processing" label="PILOT · READ ONLY" />}
      toolbar={{
        primary: (
          <Select
            aria-label="Chọn kỳ payroll"
            className="min-w-56"
            placeholder="Chưa có kỳ payroll"
            value={periodKey}
            onChange={(value) => void load(value)}
            options={(dashboard?.periods || []).map((period) => ({
              value: period.periodKey,
              label: `${period.label} · ${period.status}`,
            }))}
            disabled={loading || !dashboard?.periods.length}
          />
        ),
        actions: (
          <Button
            icon={<AppIcon icon={RefreshCw} size="action" />}
            onClick={() => void load(periodKey)}
            loading={loading}
          >
            Tải lại
          </Button>
        ),
      }}
    >
      {error ? (
        <DataSection
          title="Không tải được pilot"
          state="error"
          stateTitle="Dashboard pilot chưa sẵn sàng"
          stateDescription={error}
        />
      ) : loading || !dashboard ? (
        <DataSection title="Đang tải pilot" state="loading" stateTitle="Đang đọc trạng thái pilot CC" />
      ) : (
        <Space direction="vertical" size={16} className="w-full">
          <Alert
            type="info"
            showIcon
            message="Ranh giới an toàn"
            description="Chỉ dữ liệu evidence do mOS tạo mới xuất hiện ở đây. Đối chiếu Legacy, fixture và debug local không được đưa lên production."
          />

          <MetricGrid
            items={[
              {
                key: 'cohort',
                title: 'CC trong pilot',
                value: dashboard.summary.cohortSize,
                icon: <AppIcon icon={UsersRound} size="md" />,
              },
              {
                key: 'evidence',
                title: 'Evidence mOS',
                value: evidenceCount,
                icon: <AppIcon icon={ShieldCheck} size="md" />,
              },
              {
                key: 'finalized',
                title: 'Đã finalize',
                value: dashboard.summary.finalizedSubjectCount,
                icon: <AppIcon icon={ShieldCheck} size="md" />,
              },
              {
                key: 'settlement',
                title: 'Settlement kỳ',
                value: dashboard.summary.settlementStatus || 'Chưa tạo',
                icon: <AppIcon icon={ShieldCheck} size="md" />,
              },
            ]}
          />

          <DataSection
            title={hasPeriod ? `Bốn CC pilot · ${dashboard.activePeriodKey}` : 'Bốn CC pilot đã được khóa cohort'}
          >
            <DataTable<PilotRow>
              columns={columns}
              dataSource={dashboard.rows}
              rowKey="subjectKey"
              pagination={false}
              columnPriority={{
                staff: 'primary',
                evidence: 'secondary',
                ledger: 'secondary',
                finalized: 'tertiary',
              }}
              mobileRecordKey={(row) => row.subjectKey}
              mobileRenderer={(row) => (
                <Space direction="vertical" size={4} className="w-full">
                  <Text strong>{row.displayName}</Text>
                  <Text type="secondary">
                    {row.evidence.length} evidence · {row.ledger.length} ledger
                  </Text>
                  {row.finalized ? (
                    <StatusTag status="success" label="Đã finalize" />
                  ) : (
                    <StatusTag status="warning" label="Chờ evidence" />
                  )}
                </Space>
              )}
            />
          </DataSection>

          {!hasPeriod ? (
            <DataSection
              title="Chưa có kỳ payroll mOS"
              state="empty"
              stateTitle="Pilot đã bật, đang chờ mở kỳ tháng"
              stateDescription="Bốn CC ở trên đã được khóa vào cohort. Khi một kỳ payroll mOS được mở, evidence sẽ xuất hiện ở đây để kiểm tra trước khi finalize và settlement."
            />
          ) : (
            <>
              <DataSection
                title="Trace theo người và kỳ"
                extra={<Text type="secondary">Nguồn · rule · số tiền · thời điểm</Text>}
              >
                <Collapse
                  items={dashboard.rows.map((row) => ({
                    key: row.subjectKey,
                    label: `${row.displayName} · ${row.evidence.length} evidence · ${row.finalized ? 'đã finalize' : 'chưa finalize'}`,
                    children: (
                      <Space direction="vertical" size={14} className="w-full">
                        <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
                          <Descriptions.Item label="Evidence mOS">{row.evidence.length} dòng</Descriptions.Item>
                          <Descriptions.Item label="Ledger">{row.ledger.length} dòng</Descriptions.Item>
                          <Descriptions.Item label="Policy tháng">
                            {row.finalized ? (
                              <StatusTag status="success" label="Đã finalize" />
                            ) : (
                              <StatusTag status="warning" label="Chờ evidence" />
                            )}
                          </Descriptions.Item>
                        </Descriptions>
                        <DataTable
                          size="small"
                          rowKey="evidenceKey"
                          dataSource={row.evidence}
                          pagination={false}
                          columns={[
                            { title: 'Nguồn mOS', dataIndex: 'sourceReference', key: 'sourceReference' },
                            { title: 'Loại', dataIndex: 'kind', key: 'kind', render: evidenceLabel },
                            { title: 'Khoản', dataIndex: 'component', key: 'component', render: componentLabel },
                            {
                              title: 'Số tiền',
                              dataIndex: 'amountHalfDong',
                              key: 'amountHalfDong',
                              render: formatHalfDong,
                            },
                            {
                              title: 'Rule',
                              dataIndex: 'policyVersion',
                              key: 'policyVersion',
                              render: (value) => value || '—',
                            },
                          ]}
                          columnPriority={{
                            sourceReference: 'primary',
                            kind: 'secondary',
                            component: 'secondary',
                            amountHalfDong: 'primary',
                            policyVersion: 'tertiary',
                          }}
                          mobileRecordKey={(item) => item.evidenceKey}
                          mobileRenderer={(item) => (
                            <Space direction="vertical" size={1} className="w-full">
                              <Text strong>
                                {componentLabel(item.component)} · {formatHalfDong(item.amountHalfDong)}
                              </Text>
                              <Text type="secondary">
                                {evidenceLabel(item.kind)} · {item.sourceReference}
                              </Text>
                            </Space>
                          )}
                        />
                      </Space>
                    ),
                  }))}
                />
              </DataSection>
            </>
          )}
        </Space>
      )}
    </FeaturePage>
  );
}
