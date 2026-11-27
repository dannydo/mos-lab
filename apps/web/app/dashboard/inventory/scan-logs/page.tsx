'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, DatePicker, Input, Select } from 'antd';
import { Camera, Search } from 'lucide-react';
import type { InventoryScanLogRowDto } from '@mos-lab/shared';

type ScanMethod = 'Camera' | 'Keyboard';
import { AdaptiveModal, AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';

const METHOD_OPTIONS: Array<{ value: ScanMethod; label: string }> = [
  { value: 'Camera', label: 'Camera' },
  { value: 'Keyboard', label: 'Keyboard' },
];

export default function InventoryScanLogsPage() {
  const ctx = useInventoryAdminContext();
  const canViewLogs = ctx.hasPermission('view-scan-code') || ctx.hasPermission('edit-order-global');

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [method, setMethod] = useState<ScanMethod | undefined>(undefined);
  const [clientStoreId, setClientStoreId] = useState<number | undefined>(undefined);
  const [isValidFilter, setIsValidFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [rows, setRows] = useState<InventoryScanLogRowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [previewPhotoRow, setPreviewPhotoRow] = useState<InventoryScanLogRowDto | null>(null);

  const dateFrom = dateRange[0].format('YYYY-MM-DD');
  const dateTo = dateRange[1].format('YYYY-MM-DD');

  const loadLogs = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getScanLogs({
          dateFrom,
          dateTo,
          method,
          clientStoreId,
          isValid: isValidFilter === 'all' ? undefined : isValidFilter === 'valid',
          keyword: appliedKeyword || undefined,
          page: targetPage,
          limit: targetLimit,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        });
        setRows(res.data || []);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được lịch sử quét QR');
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo, method, clientStoreId, isValidFilter, appliedKeyword, ctx.previewRole, ctx.previewStoreId]
  );

  useEffect(() => {
    setPage(1);
    void loadLogs(1, limit);
  }, [loadLogs, limit]);

  const columns: ColumnsType<InventoryScanLogRowDto> = [
    {
      title: 'ID',
      dataIndex: 'user_scan_code_id',
      key: 'id',
      width: 90,
      render: (id: number) => <span className="font-semibold tabular-nums">#{id}</span>,
    },
    {
      title: 'Thời Gian',
      dataIndex: 'date_created',
      key: 'date_created',
      width: 165,
      render: (dt: string) => <span className="tabular-nums text-xs">{dt}</span>,
    },
    {
      title: 'Nhân Sự & Chi Nhánh',
      key: 'user',
      width: 210,
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.user?.full_name || '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.client_store?.store_name || 'Kho / Toàn hệ thống'}
          </div>
        </div>
      ),
    },
    {
      title: 'Phương Thức / Mode',
      key: 'method_type',
      width: 190,
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusTag status={r.method === 'Camera' ? 'cyan' : 'default'} label={r.method} />
          <StatusTag status="processing" label={r.type} />
        </div>
      ),
    },
    {
      title: 'Mã QR Đã Quét',
      dataIndex: 'scan_code',
      key: 'scan_code',
      width: 240,
      render: (code: string) => (
        <span className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">{code}</span>
      ),
    },
    {
      title: 'Hợp Lệ',
      dataIndex: 'is_valid',
      key: 'is_valid',
      width: 110,
      render: (valid: boolean) => (
        <StatusTag status={valid ? 'success' : 'error'} label={valid ? 'Hợp lệ' : 'Không hợp lệ'} />
      ),
    },
    {
      title: 'Ảnh Bằng Chứng',
      key: 'image',
      width: 130,
      fixed: 'right',
      render: (_, r) =>
        r.has_image ? (
          <Button size="small" icon={<AppIcon icon={Camera} size={14} />} onClick={() => setPreviewPhotoRow(r)}>
            Xem ảnh
          </Button>
        ) : (
          <span className="text-xs text-slate-400">Không có ảnh</span>
        ),
    },
  ];

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

      <SectionCard title="Nhật Ký Quét Mã QR & Ảnh Chụp Bằng Chứng (user_scan_code)">
        {!canViewLogs ? (
          <StatePanel
            kind="error"
            title="Không có quyền xem nhật ký quét mã"
            description="Quyền `view-scan-code` đang tắt ở vai trò preview hiện tại."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker.RangePicker
                value={dateRange}
                allowClear={false}
                format="DD/MM/YYYY"
                onChange={(vals) => {
                  if (vals && vals[0] && vals[1]) {
                    setDateRange([vals[0], vals[1]]);
                  }
                }}
              />
              <Select
                allowClear
                placeholder="Phương thức"
                className="w-36"
                value={method}
                options={METHOD_OPTIONS}
                onChange={(val) => setMethod(val as ScanMethod | undefined)}
              />
              <Select
                allowClear
                placeholder="Chi nhánh"
                className="w-44"
                value={clientStoreId}
                options={ctx.stores.map((s) => ({
                  value: s.client_store_id,
                  label: s.store_name,
                }))}
                onChange={(val) => setClientStoreId(val ? Number(val) : undefined)}
              />
              <Select
                className="w-36"
                value={isValidFilter}
                options={[
                  { value: 'all', label: 'Tất cả kết quả' },
                  { value: 'valid', label: 'Hợp lệ' },
                  { value: 'invalid', label: 'Không hợp lệ' },
                ]}
                onChange={(val) => setIsValidFilter(val as 'all' | 'valid' | 'invalid')}
              />
              <Input
                allowClear
                className="w-56"
                placeholder="Tìm mã QR / nhân viên..."
                prefix={<AppIcon icon={Search} size={14} className="text-slate-400" />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={() => setAppliedKeyword(keyword.trim())}
              />
              <Button type="primary" onClick={() => setAppliedKeyword(keyword.trim())}>
                Lọc
              </Button>
            </div>

            {error ? (
              <StatePanel kind="error" title="Không tải được nhật ký quét mã" description={error} />
            ) : (
              <DataTable<InventoryScanLogRowDto>
                rowKey="user_scan_code_id"
                columns={columns}
                dataSource={rows}
                loading={loading}
                scroll={{ x: 1125 }}
                pagination={{
                  current: page,
                  pageSize: limit,
                  total,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50, 100],
                  onChange: (nextPage, nextLimit) => {
                    setPage(nextPage);
                    setLimit(nextLimit);
                    void loadLogs(nextPage, nextLimit);
                  },
                }}
              />
            )}
          </div>
        )}
      </SectionCard>

      <AdaptiveModal
        open={previewPhotoRow !== null}
        onCancel={() => setPreviewPhotoRow(null)}
        footer={null}
        intent="detail"
        zIndex={1050}
        title={
          previewPhotoRow
            ? `Ảnh quét QR #${previewPhotoRow.user_scan_code_id} (${previewPhotoRow.date_created})`
            : 'Ảnh quét QR'
        }
      >
        {previewPhotoRow && (
          <div className="space-y-3 pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              NV: {previewPhotoRow.user?.full_name || '—'} · Mode: {previewPhotoRow.type} · Code:{' '}
              <span className="font-mono">{previewPhotoRow.scan_code}</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <img
                src={apiClient.inventory.getScanMediaUrl(previewPhotoRow.user_scan_code_id)}
                alt={`Scan ${previewPhotoRow.user_scan_code_id}`}
                className="max-h-[70vh] w-full object-contain bg-slate-950"
              />
            </div>
          </div>
        )}
      </AdaptiveModal>
    </div>
  );
}
