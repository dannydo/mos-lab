'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';
import { Button, Input, message } from 'antd';
import { ArrowLeft, Pin, QrCode, RefreshCw, Search, Send, Trash2 } from 'lucide-react';
import type { InventoryOrderDto, InventoryOrderItemDto } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../../../components/ui';
import { apiClient } from '../../../../../../lib/api-client';
import { InventoryAdminHeader } from '../../../_components/InventoryAdminHeader';
import { formatVnd } from '../../../_components/InventoryItemsDrilldownDrawer';
import { useInventoryAdminContext } from '../../../_components/useInventoryAdminContext';
import { useInventorySse } from '../../../_components/useInventorySse';

export default function InventoryOrderAssignStationPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params?.orderId || 0);
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');

  const [order, setOrder] = useState<InventoryOrderDto | null>(null);
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<number | null>(null);
  const [recentAssignedItemId, setRecentAssignedItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [lotInput, setLotInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getOrderDetail(orderId, {
        mode: 'assign',
        keyword: appliedKeyword || undefined,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setOrder(res.order);
      setSelectedActiveOrderId(res.selected_order_id ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được trạm xuất kho');
    } finally {
      setLoading(false);
    }
  }, [orderId, appliedKeyword, ctx.previewRole, ctx.previewStoreId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const { connected } = useInventorySse({
    enabled: Boolean(orderId),
    previewRole: ctx.previewRole,
    previewStoreId: ctx.previewStoreId,
    onEvent: (evt) => {
      if (evt.type === 'output-assign' && Number(evt.payload?.orderId) === orderId) {
        const oiId = Number(evt.payload?.orderItemId || 0);
        if (oiId > 0) setRecentAssignedItemId(oiId);
        void loadOrder();
      }
    },
  });

  const handleScanCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || !orderId) return;
    try {
      const res = await apiClient.inventory.scanCode({
        scan_code: code,
        type: 'output-assign',
        inventory_warehouse_order_id: orderId,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      if (res.inventory_item.is_valid === '1') {
        message.success(res.inventory_item.message || 'Đã gán mã xuất kho');
        setScanInput('');
        if (res.inventory_item.id) setRecentAssignedItemId(res.inventory_item.id);
        void loadOrder();
      } else {
        message.warning(res.inventory_item.message || `Mã "${code}" không hợp lệ cho phiếu này`);
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Quét mã xuất kho thất bại');
    }
  };

  const handleLotLookupAndScan = async () => {
    const lotId = Number(lotInput.trim());
    if (!lotId) return;
    try {
      const res = await apiClient.inventory.lookupScanCodeByLotId(lotId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      if (!res.scan_code) {
        message.warning(`Không tìm thấy scan_code cho Lot #${lotId}`);
        return;
      }
      setLotInput('');
      await handleScanCode(res.scan_code);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Tra cứu Lot ID thất bại');
    }
  };

  const handleSelectActive = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      const res = await apiClient.inventory.selectActiveOrder(orderId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setSelectedActiveOrderId(res.selected_order_id);
      message.success(`Đã ghim Phiếu #${orderId} làm phiếu active cho máy quét iOS`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Ghim phiếu thất bại');
    } finally {
      setActing(false);
    }
  };

  const handleMarkAssigned = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await apiClient.inventory.assignOrder(orderId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã xác nhận Xuất Kho (Assigned) cho Phiếu #${orderId}`);
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Xác nhận xuất kho thất bại');
    } finally {
      setActing(false);
    }
  };

  const handleDeleteLine = async (orderItemId: number) => {
    try {
      await apiClient.inventory.deleteOrderItem({
        inventory_warehouse_order_item_id: orderItemId,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã xóa dòng #${orderItemId}`);
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Xóa dòng thất bại');
    }
  };

  const rawItems = order?.inventory_item || [];
  const sortedItems = recentAssignedItemId
    ? [
        ...rawItems.filter((it) => it.inventory_warehouse_order_item_id === recentAssignedItemId),
        ...rawItems.filter((it) => it.inventory_warehouse_order_item_id !== recentAssignedItemId),
      ]
    : rawItems;

  const columns: ColumnsType<InventoryOrderItemDto> = [
    {
      title: 'Dòng',
      dataIndex: 'inventory_warehouse_order_item_id',
      key: 'id',
      width: 95,
      render: (id: number) => (
        <span
          className={`font-mono tabular-nums ${id === recentAssignedItemId ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}`}
        >
          #{id}
        </span>
      ),
    },
    {
      title: 'Vật Tư / SKU',
      key: 'item',
      width: 240,
      render: (_, r) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.item.inventory_item_code} · {r.item.inventory_item_attribute || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Mã Vật Lý Xuất Kho',
      key: 'from_wh_item',
      width: 190,
      render: (_, r) =>
        r.from_inventory_warehouse_item_id ? (
          <StatusTag status="success" label={`Đã gán #${r.from_inventory_warehouse_item_id}`} />
        ) : (
          <StatusTag status="warning" label="Chờ quét xuất kho" />
        ),
    },
    ...(showPrice
      ? [
          {
            title: 'Đơn Giá',
            dataIndex: 'retail_price',
            key: 'retail_price',
            width: 120,
            align: 'right' as const,
            render: (val: number | undefined) => <span className="tabular-nums">{formatVnd(val)}</span>,
          },
        ]
      : []),
    {
      title: 'Xóa',
      key: 'actions',
      width: 85,
      fixed: 'right',
      render: (_, r) => (
        <Button
          size="small"
          danger
          icon={<AppIcon icon={Trash2} size={14} />}
          onClick={() => void handleDeleteLine(r.inventory_warehouse_order_item_id)}
        />
      ),
    },
  ];

  const isPinned = selectedActiveOrderId === orderId;

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
        title={`Trạm Quét Xuất Kho · Phiếu #${orderId}`}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={connected ? 'success' : 'default'} label={connected ? 'SSE Live' : 'SSE Offline'} />
            <Link href="/dashboard/inventory/orders">
              <Button icon={<AppIcon icon={ArrowLeft} size={14} />}>Quay lại</Button>
            </Link>
            <Button
              type={isPinned ? 'default' : 'primary'}
              disabled={isPinned}
              loading={acting}
              icon={<AppIcon icon={Pin} size={14} />}
              onClick={() => void handleSelectActive()}
            >
              {isPinned ? 'Đang Ghim Active (iOS)' : 'Chọn Active Cho Máy Quét iOS'}
            </Button>
            {order?.actions.canAssign && (
              <Button
                type="primary"
                loading={acting}
                icon={<AppIcon icon={Send} size={14} />}
                onClick={() => void handleMarkAssigned()}
              >
                Xác Nhận Xuất Kho (Assigned)
              </Button>
            )}
          </div>
        }
      >
        {loading && !order ? (
          <StatePanel kind="loading" title="Đang tải trạm xuất kho..." />
        ) : error ? (
          <StatePanel kind="error" title="Không tải được phiếu kho" description={error} />
        ) : !order ? (
          <StatePanel kind="empty" title="Không tìm thấy phiếu kho" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div>
                <span className="font-semibold">
                  {order.from_inventory_warehouse?.inventory_warehouse_name || 'Kho xuất'} →{' '}
                  {order.to_inventory_warehouse.inventory_warehouse_name}
                </span>
                <span className="ml-2 text-xs text-slate-500">({order.description})</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <StatusTag status="processing" label={`Trạng thái: ${order.order_state}`} />
                <StatusTag status="cyan" label={`Đã gán: ${order.total_quantity_exported} / ${order.total_quantity}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="flex gap-2">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onPressEnter={() => void handleScanCode(scanInput)}
                  placeholder="Quét QR vật tư xuất kho..."
                  prefix={<AppIcon icon={QrCode} size={14} />}
                />
                <Button type="primary" onClick={() => void handleScanCode(scanInput)}>
                  Quét
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={lotInput}
                  onChange={(e) => setLotInput(e.target.value)}
                  onPressEnter={() => void handleLotLookupAndScan()}
                  placeholder="Hoặc nhập #Lot ID..."
                />
                <Button onClick={() => void handleLotLookupAndScan()}>Xuất Lot</Button>
              </div>
              <div className="flex gap-2">
                <Input
                  allowClear
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onPressEnter={() => setAppliedKeyword(keyword.trim())}
                  placeholder="Lọc theo tên SKU..."
                  prefix={<AppIcon icon={Search} size={14} />}
                />
                <Button icon={<AppIcon icon={RefreshCw} size={14} />} onClick={() => void loadOrder()} />
              </div>
            </div>

            <DataTable<InventoryOrderItemDto>
              rowKey="inventory_warehouse_order_item_id"
              columns={columns}
              dataSource={sortedItems}
              loading={loading}
              scroll={{ x: showPrice ? 730 : 610 }}
              pagination={false}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
