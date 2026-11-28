'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, Checkbox, DatePicker, Select, message } from 'antd';
import { Activity, Clock, Database, Eye, Play, RefreshCw, ShieldAlert, TestTube2 } from 'lucide-react';
import type {
  InventoryJobCategory,
  InventoryJobDefinitionDto,
  InventoryJobHistoryEntryDto,
  InventoryJobKey,
  InventoryJobRunResultDto,
  InventoryJobsStatusResponse,
} from '@mos-lab/shared';
import {
  AdaptiveModal,
  AppIcon,
  DataTable,
  SectionCard,
  StatCard,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';
import { useInventorySse } from '../_components/useInventorySse';

function categoryBadge(cat: InventoryJobCategory): { status: 'processing' | 'cyan' | 'warning'; label: string } {
  switch (cat) {
    case 'report':
      return { status: 'processing', label: 'Báo cáo' };
    case 'automation':
      return { status: 'cyan', label: 'Tự động hóa' };
    case 'notification':
      return { status: 'warning', label: 'Thông báo' };
  }
}

function runStatusBadge(status: InventoryJobRunResultDto['status']): {
  status: 'success' | 'warning' | 'error';
  label: string;
} {
  switch (status) {
    case 'completed':
      return { status: 'success', label: 'Hoàn tất' };
    case 'skipped':
      return { status: 'warning', label: 'Bỏ qua' };
    case 'failed':
      return { status: 'error', label: 'Lỗi' };
  }
}

export default function InventoryJobsPage() {
  const ctx = useInventoryAdminContext();
  const canManageJobs = ctx.hasPermission('edit-order-global');

  const [statusData, setStatusData] = useState<InventoryJobsStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetDate, setTargetDate] = useState<Dayjs>(dayjs());
  const [selectedWhId, setSelectedWhId] = useState<number | undefined>(undefined);
  const [chainDownstream, setChainDownstream] = useState(true);
  const [forceRun, setForceRun] = useState(false);

  const [executingKey, setExecutingKey] = useState<InventoryJobKey | null>(null);
  const [confirmJob, setConfirmJob] = useState<InventoryJobDefinitionDto | null>(null);
  const [detailEntry, setDetailEntry] = useState<InventoryJobHistoryEntryDto | null>(null);

  const loadStatus = useCallback(async () => {
    if (!canManageJobs) {
      setStatusData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getJobsStatus({
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setStatusData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được trạng thái Cron Jobs');
    } finally {
      setLoading(false);
    }
  }, [canManageJobs, ctx.previewRole, ctx.previewStoreId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useInventorySse({
    enabled: canManageJobs,
    previewRole: ctx.previewRole,
    previewStoreId: ctx.previewStoreId,
    onEvent: (evt) => {
      if (evt.type === 'job-completed') void loadStatus();
    },
  });

  const handleRunJob = async (job: InventoryJobDefinitionDto, dryRun: boolean) => {
    setExecutingKey(job.key);
    try {
      const res = await apiClient.inventory.runJob(job.key, {
        date: job.supportsDate ? targetDate.format('YYYY-MM-DD') : undefined,
        warehouseId: job.supportsWarehouse ? selectedWhId : undefined,
        chainDownstream: job.supportsChain ? chainDownstream : false,
        forceRun: job.key === 'process-end-of-month' ? forceRun : undefined,
        dryRun,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(res.result.summary);
      await loadStatus();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Chạy job thất bại');
    } finally {
      setExecutingKey(null);
    }
  };

  const jobs = statusData?.jobs || [];
  const history = statusData?.history || [];
  const runningKeys = new Set(statusData?.runningJobKeys || []);
  const lastByKey = new Map<InventoryJobKey, InventoryJobHistoryEntryDto>();
  for (const h of history) {
    if (!lastByKey.has(h.result.jobKey)) lastByKey.set(h.result.jobKey, h);
  }

  const jobColumns: ColumnsType<InventoryJobDefinitionDto> = [
    {
      title: 'Cron Job & Script Legacy',
      key: 'title',
      width: 340,
      fixed: 'left',
      render: (_, j) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{j.title}</div>
          <div className="font-mono text-xs text-sky-700 dark:text-sky-400">{j.legacyScript}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{j.description}</div>
        </div>
      ),
    },
    {
      title: 'Nhóm',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: InventoryJobCategory) => {
        const badge = categoryBadge(cat);
        return <StatusTag status={badge.status} label={badge.label} />;
      },
    },
    {
      title: 'Lịch Cron Legacy',
      dataIndex: 'schedule',
      key: 'schedule',
      width: 210,
      render: (val: string) => <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>,
    },
    {
      title: 'Lần Chạy Gần Nhất',
      key: 'lastRun',
      width: 270,
      render: (_, j) => {
        const latest = lastByKey.get(j.key);
        if (!latest) return <span className="text-xs text-slate-400">Chưa chạy trong phiên</span>;
        const badge = runStatusBadge(latest.result.status);
        return (
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
              <StatusTag status={badge.status} label={badge.label} />
              <StatusTag
                status={latest.result.dryRun ? 'default' : 'cyan'}
                label={latest.result.dryRun ? 'Dry-Run' : 'Thực thi'}
              />
              <span className="text-slate-500">{latest.result.durationMs} ms</span>
            </div>
            <div className="text-slate-600 dark:text-slate-300">{latest.result.summary}</div>
          </div>
        );
      },
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, j) => {
        const busy = executingKey === j.key || runningKeys.has(j.key);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="small"
              loading={busy}
              icon={<AppIcon icon={TestTube2} size={14} />}
              onClick={() => void handleRunJob(j, true)}
            >
              Chạy Thử
            </Button>
            <Button
              size="small"
              type="primary"
              loading={busy}
              icon={<AppIcon icon={Play} size={14} />}
              onClick={() => setConfirmJob(j)}
            >
              Chạy Thực
            </Button>
          </div>
        );
      },
    },
  ];

  const historyColumns: ColumnsType<InventoryJobHistoryEntryDto> = [
    {
      title: 'Thời Gian',
      key: 'time',
      width: 170,
      render: (_, h) => (
        <div className="space-y-0.5 text-xs tabular-nums">
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {dayjs(h.result.startedAt).format('DD/MM/YYYY HH:mm:ss')}
          </div>
          <div className="text-slate-500">
            {h.triggeredBy} · {h.triggerSource}
          </div>
        </div>
      ),
    },
    {
      title: 'Job / Script',
      key: 'job',
      width: 240,
      render: (_, h) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{h.result.jobKey}</div>
          <div className="font-mono text-slate-500">{h.result.legacyScript}</div>
        </div>
      ),
    },
    {
      title: 'Chế Độ & Ngày',
      key: 'mode',
      width: 150,
      render: (_, h) => (
        <div className="space-y-1 text-xs tabular-nums">
          <StatusTag status={h.result.dryRun ? 'default' : 'cyan'} label={h.result.dryRun ? 'Dry-Run' : 'Thực thi'} />
          <div className="text-slate-500">{h.result.targetDate}</div>
        </div>
      ),
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      width: 135,
      render: (_, h) => {
        const badge = runStatusBadge(h.result.status);
        return (
          <div className="space-y-0.5 text-xs tabular-nums">
            <StatusTag status={badge.status} label={badge.label} />
            <div className="text-slate-500">{h.result.durationMs} ms</div>
          </div>
        );
      },
    },
    {
      title: 'Tóm Tắt Kết Quả',
      key: 'summary',
      width: 340,
      render: (_, h) => <span className="text-xs text-slate-700 dark:text-slate-300">{h.result.summary}</span>,
    },
    {
      title: 'Chi Tiết',
      key: 'detail',
      width: 105,
      fixed: 'right',
      render: (_, h) => (
        <Button size="small" icon={<AppIcon icon={Eye} size={14} />} onClick={() => setDetailEntry(h)}>
          Metrics
        </Button>
      ),
    },
  ];

  const latestHistory = history[0];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <InventoryAdminHeader
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        stores={ctx.stores}
        permissionCount={ctx.permissionCount}
        onPreviewRoleChange={ctx.setPreviewRole}
        onPreviewStoreChange={ctx.setPreviewStoreId}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Legacy Cron Jobs"
          value={jobs.length || 7}
          icon={<AppIcon icon={Clock} size="sm" />}
          subValue="6 core + 1 order push"
          loading={loading && !statusData}
        />
        <StatCard
          title="Auto Scheduler"
          value={statusData?.cronEnabled ? 'Đang Bật' : 'Tắt (Opt-In)'}
          icon={<AppIcon icon={Database} size="sm" />}
          subValue={statusData ? `DB: ${statusData.database.name}` : 'INVENTORY_CRON_ENABLED'}
          loading={loading && !statusData}
        />
        <StatCard
          title="Đang Thực Thi"
          value={runningKeys.size}
          icon={<AppIcon icon={Activity} size="sm" />}
          subValue="Khóa chống chạy trùng"
          loading={loading && !statusData}
        />
        <StatCard
          title="Lần Chạy Gần Đây"
          value={history.length}
          icon={<AppIcon icon={RefreshCw} size="sm" />}
          subValue={latestHistory ? `${latestHistory.result.jobKey} · ${latestHistory.result.durationMs}ms` : 'Chưa có'}
          loading={loading && !statusData}
        />
      </div>

      {!canManageJobs ? (
        <SectionCard title="Điều Khiển Cron Jobs Kho">
          <StatePanel
            kind="empty"
            title="Chỉ Admin / Quyền Toàn Hệ Thống"
            description="Vai trò đang xem thử không có quyền xem hoặc kích hoạt Cron Jobs kho (UI-010 Zero-Trust)."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Tham Số Chạy Job & Tái Tạo Báo Cáo"
            extra={
              <Button icon={<AppIcon icon={RefreshCw} size={14} />} onClick={() => void loadStatus()}>
                Làm mới
              </Button>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Ngày mục tiêu:</span>
                <DatePicker
                  allowClear={false}
                  format="DD/MM/YYYY"
                  value={targetDate}
                  onChange={(d) => {
                    if (d) setTargetDate(d);
                  }}
                />
              </div>
              <Select
                allowClear
                placeholder="Tất cả kho hoạt động"
                className="min-w-60 sm:max-w-xs"
                value={selectedWhId}
                options={ctx.warehouses.map((w) => ({
                  value: w.inventory_warehouse_id,
                  label: w.inventory_warehouse_name,
                }))}
                onChange={(v) => setSelectedWhId(v ? Number(v) : undefined)}
              />
              <Checkbox checked={chainDownstream} onChange={(e) => setChainDownstream(e.target.checked)}>
                Chuỗi báo cáo liên hoàn (State → Item → Warehouse)
              </Checkbox>
              <Checkbox checked={forceRun} onChange={(e) => setForceRun(e.target.checked)}>
                Ép chạy EOM ngoài ngày nhắc
              </Checkbox>
            </div>
          </SectionCard>

          <SectionCard title="Danh Sách 7 Legacy Inventory Cron Jobs">
            {error ? (
              <StatePanel kind="error" title="Lỗi tải danh sách Cron Jobs" description={error} />
            ) : (
              <DataTable<InventoryJobDefinitionDto>
                rowKey="key"
                columns={jobColumns}
                dataSource={jobs}
                loading={loading}
                scroll={{ x: 1180 }}
                pagination={false}
              />
            )}
          </SectionCard>

          <SectionCard title="Nhật Ký Chạy Job Trong Phiên">
            <DataTable<InventoryJobHistoryEntryDto>
              rowKey="runId"
              columns={historyColumns}
              dataSource={history}
              loading={loading}
              scroll={{ x: 1130 }}
              pagination={{ pageSize: 10 }}
            />
          </SectionCard>
        </>
      )}

      <AdaptiveModal
        open={confirmJob !== null}
        onCancel={() => setConfirmJob(null)}
        intent="confirm"
        zIndex={1050}
        title="Xác Nhận Chạy Thực (Ghi Dữ Liệu DB Cô Lập)"
        footer={[
          <Button key="cancel" onClick={() => setConfirmJob(null)}>
            Hủy
          </Button>,
          <Button
            key="dry"
            onClick={() => {
              const j = confirmJob;
              setConfirmJob(null);
              if (j) void handleRunJob(j, true);
            }}
          >
            Chạy Thử (Dry-Run)
          </Button>,
          <Button
            key="exec"
            type="primary"
            danger
            onClick={() => {
              const j = confirmJob;
              setConfirmJob(null);
              if (j) void handleRunJob(j, false);
            }}
          >
            Thực Thi Ngay
          </Button>,
        ]}
      >
        <div className="space-y-2 py-2 text-sm">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <AppIcon icon={ShieldAlert} size={18} className="mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{confirmJob?.title}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Thao tác này sẽ ghi kết quả vào DB{' '}
                <span className="font-mono">{statusData?.database.name || 'management_inventory_win'}</span> cho ngày{' '}
                <span className="font-mono font-semibold">{targetDate.format('YYYY-MM-DD')}</span>
                {selectedWhId ? ` (Kho #${selectedWhId})` : ' (Tất cả kho đủ điều kiện)'}.
              </div>
            </div>
          </div>
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        open={detailEntry !== null}
        onCancel={() => setDetailEntry(null)}
        footer={null}
        intent="data"
        zIndex={1050}
        title={detailEntry ? `Chi Tiết Kết Quả · ${detailEntry.result.jobKey}` : 'Chi Tiết Job'}
      >
        {detailEntry && (
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(detailEntry.result.metrics).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <div className="text-slate-500">{k}</div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {v.toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
            {detailEntry.result.chainedResults && detailEntry.result.chainedResults.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Chuỗi Job Liên Hoàn:</div>
                {detailEntry.result.chainedResults.map((c) => (
                  <div key={c.jobKey} className="rounded border border-slate-200 px-2.5 py-1.5 dark:border-slate-700">
                    <span className="font-mono font-semibold">{c.jobKey}</span> · {c.durationMs}ms — {c.summary}
                  </div>
                ))}
              </div>
            )}
            {detailEntry.result.details && (
              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-[11px] dark:bg-slate-900">
                {JSON.stringify(detailEntry.result.details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </AdaptiveModal>
    </div>
  );
}
