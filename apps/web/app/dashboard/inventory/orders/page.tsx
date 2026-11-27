'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, DatePicker, Input, Select, Tabs, message } from 'antd';
import {
  CheckSquare,
  Edit3,
  Eye,
  Forward,
  Merge,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import type { InventoryOrderDto, InventoryOrderState } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { formatVnd } from '../_components/InventoryItemsDrilldownDrawer';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';
import { OrderEditorModal, type OrderEditorMode } from './_components/OrderEditorModal';
import { OrderItemsModal } from './_components/OrderItemsModal';

function orderStateStatus(
  state: InventoryOrderState
): 'warning' | 'processing' | 'cyan' | 'success' | 'error' | 'default' {
  switch (state) {
    case 'New':
      return 'warning';
    case 'Approved':
      return 'processing';
    case 'Assigned':
      return 'cyan';
    case 'Imported':
      return 'success';
    case 'Rejected':
    case 'Cancelled':
      return 'error';
  }
}

export default function InventoryOrdersPage() {
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');
  const canMerge = ctx.hasPermission('merge-order');

  const [tab, setTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [selectedWhIds, setSelectedWhIds] = useState<number[]>([]);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [rows, setRows] = useState<InventoryOrderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  const [editorState, setEditorState] = useState<{
    open: boolean;
    mode: OrderEditorMode;
    order: InventoryOrderDto | null;
  }>({ open: false, mode: 'create', order: null });
  const [itemsModalOrderId, setItemsModalOrderId] = useState<number | null>(null);

  const dateFrom = dateRange[0].format('YYYY-MM-DD');
  const dateTo = dateRange[1].format('YYYY-MM-DD');

  const loadOrders = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getOrders({
          tab,
          warehouseIds: selectedWhIds.length > 0 ? selectedWhIds : undefined,
          dateFrom,
          dateTo,
          keyword: appliedKeyword || undefined,
          page: targetPage,
          limit: targetLimit,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        });
        setRows(res.data || []);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách phiếu kho');
      } finally {
        setLoading(false);
      }
    },
    [tab, selectedWhIds, dateFrom, dateTo, appliedKeyword, ctx.previewRole, ctx.previewStoreId]
  );

  useEffect(() => {
    setPage(1);
    void loadOrders(1, limit);
  }, [loadOrders, limit]);

  const handleCancelOrder = async (orderId: number) => {
    try {
      await apiClient.inventory.cancelOrder(orderId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã hủy phiếu #${orderId}`);
      void loadOrders(page, limit);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Hủy phiếu thất bại');
    }
  };

  const columns: ColumnsType<InventoryOrderDto> = [
    {
      title: 'Mã Phiếu',
      dataIndex: 'inventory_warehouse_order_id',
      key: 'id',
      width: 120,
      fixed: 'left',
      render: (id: number, r) => (
        <div className="space-y-1 tabular-nums">
          <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">#{id}</div>
          <StatusTag status={orderStateStatus(r.order_state)} label={r.order_state} />
        </div>
      ),
    },
    {
      title: 'Kho Xuất → Kho Nhận',
      key: 'warehouses',
      width: 240,
      render: (_, r) => (
        <div className="space-y-0.5 text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {r.from_inventory_warehouse?.inventory_warehouse_name || (r.is_internal ? 'Nội bộ' : 'Nhà cung cấp')} →{' '}
            {r.to_inventory_warehouse.inventory_warehouse_name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{r.description || '—'}</div>
          {r.reject_reason && (
            <div className="text-xs text-rose-600 dark:text-rose-400">Từ chối: {r.reject_reason}</div>
          )}
        </div>
      ),
    },
    {
      title: 'SL (Đặt / Xuất / Nhập)',
      key: 'qty',
      width: 165,
      align: 'right',
      render: (_, r) => (
        <div className="tabular-nums text-xs">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {r.total_quantity} / {r.total_quantity_exported} / {r.total_quantity_imported}
          </div>
          {showPrice && <div className="text-slate-500 dark:text-slate-400">{formatVnd(r.total_retail_price)}</div>}
        </div>
      ),
    },
    {
      title: 'Người Tạo & Thời Gian',
      key: 'audit',
      width: 200,
      render: (_, r) => (
        <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <div>Tạo: {r.created_staff?.full_name || '(Auto)'}</div>
          <div>{r.date_created}</div>
          {r.approved_staff && <div>Duyệt: {r.approved_staff.full_name}</div>}
        </div>
      ),
    },
    {
      title: 'Thao Tác Phiếu',
      key: 'actions',
      width: 340,
      fixed: 'right',
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="small"
            icon={<AppIcon icon={Eye} size={14} />}
            onClick={() => setItemsModalOrderId(r.inventory_warehouse_order_id)}
          >
            Chi tiết
          </Button>
          {r.actions.canEdit && (
            <Button
              size="small"
              icon={<AppIcon icon={Edit3} size={14} />}
              onClick={() => setEditorState({ open: true, mode: 'edit', order: r })}
            >
              Sửa
            </Button>
          )}
          {r.actions.canApprove && (
            <Button
              size="small"
              type="primary"
              icon={<AppIcon icon={CheckSquare} size={14} />}
              onClick={() => setEditorState({ open: true, mode: 'review', order: r })}
            >
              Duyệt
            </Button>
          )}
          {r.actions.canAssign && (
            <Link href={`/dashboard/inventory/orders/${r.inventory_warehouse_order_id}/assign`}>
              <Button size="small" type="primary" icon={<AppIcon icon={Send} size={14} />}>
                Xuất Kho
              </Button>
            </Link>
          )}
          {r.actions.canCheck && (
            <Link href={`/dashboard/inventory/orders/${r.inventory_warehouse_order_id}/scan`}>
              <Button size="small" type="primary" icon={<AppIcon icon={ScanLine} size={14} />}>
                Kiểm / Nhập
              </Button>
            </Link>
          )}
          {r.actions.canForward && (
            <Button
              size="small"
              icon={<AppIcon icon={Forward} size={14} />}
              onClick={() => setEditorState({ open: true, mode: 'forward', order: r })}
            >
              Chuyển tiếp
            </Button>
          )}
          {r.actions.canOrderMissing && r.total_quantity_imported < r.total_quantity && (
            <Button size="small" onClick={() => setEditorState({ open: true, mode: 'missing', order: r })}>
              Bù thiếu
            </Button>
          )}
          <Link href={`/dashboard/inventory/print/order/${r.inventory_warehouse_order_id}`} target="_blank">
            <Button size="small" icon={<AppIcon icon={Printer} size={14} />}>
              In Phiếu
            </Button>
          </Link>
          <Link href={`/dashboard/inventory/print/order/${r.inventory_warehouse_order_id}/labels`} target="_blank">
            <Button size="small" icon={<AppIcon icon={QrCode} size={14} />}>
              In Tem
            </Button>
          </Link>
          {r.actions.canCancel && (
            <Button
              size="small"
              danger
              icon={<AppIcon icon={XCircle} size={14} />}
              onClick={() => void handleCancelOrder(r.inventory_warehouse_order_id)}
            >
              Hủy
            </Button>
          )}
        </div>
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

      <SectionCard
        title="Quản Lý Phiếu Xuất / Nhập & Luân Chuyển Kho"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            {canMerge && selectedOrderIds.length >= 2 && (
              <Button
                icon={<AppIcon icon={Merge} size={14} />}
                onClick={() => setEditorState({ open: true, mode: 'merge', order: null })}
              >
                Gộp {selectedOrderIds.length} Phiếu
              </Button>
            )}
            <Button
              type="primary"
              icon={<AppIcon icon={Plus} size={14} />}
              onClick={() => setEditorState({ open: true, mode: 'create', order: null })}
            >
              Tạo Phiếu Mới
            </Button>
            <Button icon={<AppIcon icon={RefreshCw} size={14} />} onClick={() => void loadOrders(page, limit)}>
              Làm mới
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Tabs
            size="small"
            activeKey={tab}
            onChange={(key) => {
              setTab(key as 'pending' | 'completed' | 'all');
              setSelectedOrderIds([]);
              setPage(1);
            }}
            items={[
              { key: 'pending', label: 'Đang Xử Lý (New / Approved / Assigned)' },
              { key: 'completed', label: 'Đã Hoàn Tất / Đóng' },
              { key: 'all', label: 'Tất Cả' },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <DatePicker.RangePicker
              value={dateRange}
              allowClear={false}
              format="DD/MM/YYYY"
              onChange={(vals) => {
                if (vals && vals[0] && vals[1]) setDateRange([vals[0], vals[1]]);
              }}
            />
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Lọc theo kho"
              className="min-w-56 flex-1 sm:max-w-sm"
              value={selectedWhIds}
              options={ctx.warehouses.map((w) => ({
                value: w.inventory_warehouse_id,
                label: w.inventory_warehouse_name,
              }))}
              onChange={(vals) => setSelectedWhIds(vals.map(Number))}
            />
            <Input
              allowClear
              className="w-60"
              placeholder="Tìm mã phiếu # / lý do..."
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
            <StatePanel kind="error" title="Không tải được danh sách phiếu kho" description={error} />
          ) : (
            <DataTable<InventoryOrderDto>
              rowKey="inventory_warehouse_order_id"
              columns={columns}
              dataSource={rows}
              loading={loading}
              rowSelection={
                canMerge
                  ? {
                      selectedRowKeys: selectedOrderIds,
                      onChange: (keys) => setSelectedOrderIds(keys.map(Number)),
                    }
                  : undefined
              }
              scroll={{ x: 1120 }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setPage(nextPage);
                  setLimit(nextLimit);
                  void loadOrders(nextPage, nextLimit);
                },
              }}
            />
          )}
        </div>
      </SectionCard>

      <OrderEditorModal
        open={editorState.open}
        mode={editorState.mode}
        selectedOrder={editorState.order}
        mergeOrderIds={selectedOrderIds}
        warehouses={ctx.warehouses}
        showPrice={showPrice}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        onClose={() => setEditorState((prev) => ({ ...prev, open: false }))}
        onSaved={() => void loadOrders(page, limit)}
      />

      <OrderItemsModal
        open={itemsModalOrderId !== null}
        orderId={itemsModalOrderId}
        showPrice={showPrice}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        onClose={() => setItemsModalOrderId(null)}
      />
    </div>
  );
}
