'use client';

import { Alert, Button, Collapse, Descriptions, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { NativeCcPilotDashboardResponse } from '@mos-lab/shared';
import { CalendarPlus, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppIcon, DataSection, DataTable, FeaturePage, MetricGrid, StatusTag } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

const { Text } = Typography;

type PilotRow = NativeCcPilotDashboardResponse['rows'][number];
type HistoryRow = NonNullable<
  NativeCcPilotDashboardResponse['historicalSnapshot']
>['subjects'][number]['months'][number] & {
  subjectKey: string;
  displayName: string;
};

function formatHalfDong(amountHalfDong: number): string {
  const amount = amountHalfDong / 2;
  return `${amount.toLocaleString('vi-VN', { minimumFractionDigits: amount % 1 ? 1 : 0 })} đ`;
}

function formatVnd(amountVnd: number): string {
  return `${amountVnd.toLocaleString('vi-VN')} đ`;
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
  const [openingPeriod, setOpeningPeriod] = useState(false);
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

  const historyRows = useMemo<HistoryRow[]>(
    () =>
      dashboard?.historicalSnapshot?.subjects.flatMap((subject) =>
        subject.months.map((month) => ({ ...month, subjectKey: subject.subjectKey, displayName: subject.displayName }))
      ) || [],
    [dashboard?.historicalSnapshot]
  );

  const historyColumns = useMemo<ColumnsType<HistoryRow>>(
    () => [
      { title: 'CC', dataIndex: 'displayName', key: 'displayName' },
      {
        title: 'Tháng',
        dataIndex: 'periodKey',
        key: 'periodKey',
        render: (value) => <Text className="tabular-nums">{value}</Text>,
      },
      {
        title: 'Xoay sau cap',
        dataIndex: 'effectiveXoayVnd',
        key: 'effectiveXoayVnd',
        render: formatVnd,
      },
      { title: 'Daily Bonus', dataIndex: 'dailyBonusVnd', key: 'dailyBonusVnd', render: formatVnd },
      { title: 'Cash Tip', dataIndex: 'cashTipVnd', key: 'cashTipVnd', render: formatVnd },
      { title: 'Tổng đối chiếu', dataIndex: 'componentTotalVnd', key: 'componentTotalVnd', render: formatVnd },
    ],
    []
  );

  const evidenceCount = dashboard?.summary.evidenceCount ?? 0;
  const hasPeriod = Boolean(dashboard?.activePeriodKey);

  const openCurrentMonth = useCallback(async () => {
    setOpeningPeriod(true);
    setError(null);
    try {
      const result = await apiClient.payrollLedger.openCurrentCcPilotPeriod();
      await load(result.period.periodKey);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không thể mở kỳ pilot tháng này.';
      setError(message);
    } finally {
      setOpeningPeriod(false);
    }
  }, [load]);

  return (
    <FeaturePage
      title="Pilot Payroll CC"
      subtitle="Theo dõi evidence mOS và ledger của bốn CC pilot. Chỉ Super Admin có thể mở kỳ tháng; không import Legacy và không có payout."
      icon={<AppIcon icon={ShieldCheck} size="lg" />}
      tag={<StatusTag status="processing" label="PILOT · KIỂM SOÁT" />}
      toolbar={{
        primary: hasPeriod ? (
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
        ) : (
          <Button
            type="primary"
            icon={<AppIcon icon={CalendarPlus} size="action" />}
            onClick={() => void openCurrentMonth()}
            loading={openingPeriod}
            disabled={loading}
          >
            Mở kỳ pilot tháng này
          </Button>
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
            description="Mở kỳ chỉ tạo biên nhận evidence tháng ở trạng thái OPEN. Evidence vận hành chỉ nhận từ mOS; snapshot lịch sử đã xác minh, nếu có, chỉ để đối chiếu và không được dùng để finalize, settlement hoặc payout."
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

          {dashboard.historicalSnapshot ? (
            <DataSection
              title="Lịch sử đối chiếu đã xác minh"
              extra={<Text type="secondary">Tháng 8–9 · chỉ đọc · không phải evidence mOS</Text>}
            >
              <DataTable<HistoryRow>
                columns={historyColumns}
                dataSource={historyRows}
                rowKey={(row) => `${row.subjectKey}:${row.periodKey}`}
                pagination={false}
                columnPriority={{
                  displayName: 'primary',
                  periodKey: 'primary',
                  effectiveXoayVnd: 'secondary',
                  dailyBonusVnd: 'tertiary',
                  cashTipVnd: 'secondary',
                  componentTotalVnd: 'primary',
                }}
                mobileRecordKey={(row) => `${row.subjectKey}:${row.periodKey}`}
                mobileRenderer={(row) => (
                  <Space direction="vertical" size={2} className="w-full">
                    <Text strong>
                      {row.displayName} · {row.periodKey}
                    </Text>
                    <Text className="tabular-nums">Tổng đối chiếu: {formatVnd(row.componentTotalVnd)}</Text>
                    <Text type="secondary">
                      Xoay sau cap {formatVnd(row.effectiveXoayVnd)} · Daily {formatVnd(row.dailyBonusVnd)} · Tip{' '}
                      {formatVnd(row.cashTipVnd)}
                    </Text>
                  </Space>
                )}
              />
            </DataSection>
          ) : (
            <DataSection
              title="Lịch sử đối chiếu"
              state="empty"
              stateTitle="Chưa phát hành snapshot tháng 8–9"
              stateDescription="Khi bản đối chiếu chỉ-đọc đã được xác minh và băm, nó sẽ hiện riêng tại đây; không trộn vào evidence mOS của kỳ pilot."
            />
          )}

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
              stateTitle="Pilot đã bật, sẵn sàng mở kỳ tháng"
              stateDescription="Bốn CC ở trên đã được khóa vào cohort. Super Admin mở kỳ hiện tại một lần; sau đó evidence mOS mới xuất hiện ở đây để kiểm tra trước khi finalize và settlement."
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
