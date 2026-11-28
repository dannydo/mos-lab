'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';
import { Button, Input, InputNumber, message } from 'antd';
import {
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  Eye,
  PackageCheck,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import type { InventoryOrderDto, InventoryOrderItemDto } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../../../components/ui';
import { apiClient } from '../../../../../../lib/api-client';
import { InventoryAdminHeader } from '../../../_components/InventoryAdminHeader';
import { formatVnd } from '../../../_components/InventoryItemsDrilldownDrawer';
import { useInventoryAdminContext } from '../../../_components/useInventoryAdminContext';
import { useInventorySse } from '../../../_components/useInventorySse';
import { OrderItemsModal } from '../../_components/OrderItemsModal';

export default function InventoryOrderScanStationPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params?.orderId || 0);
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');
  const canCheck = ctx.hasPermission('order-check-global') || ctx.hasPermission('order-check');
  const canEditOrder = ctx.hasPermission('edit-order-global');

  const [order, setOrder] = useState<InventoryOrderDto | null>(null);
  const [recentSkuId, setRecentSkuId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [lotInput, setLotInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [detailSkuId, setDetailSkuId] = useState<number | undefined>(undefined);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addQtyModal, setAddQtyModal] = useState<{
    open: boolean;
    orderItemId: number | null;
    name: string;
    qty: number;
  }>({
    open: false,
    orderItemId: null,
    name: '',
    qty: 1,
  });

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getOrderDetail(orderId, {
        mode: 'check',
        keyword: appliedKeyword || undefined,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setOrder(res.order);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được trạm kiểm & nhập kho');
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
      if (evt.type === 'check-update' && Number(evt.payload?.orderId) === orderId) {
        void loadOrder();
      }
    },
  });

  const handleScanInputCheck = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || !orderId) return;
    try {
      const res = await apiClient.inventory.scanCode({
        scan_code: code,
        type: 'input-check',
        inventory_warehouse_order_id: orderId,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      if (res.inventory_item.is_valid === '1') {
        message.success(res.inventory_item.message || 'Đã kiểm nhận hàng');
        setScanInput('');
        void loadOrder();
      } else {
        message.warning(res.inventory_item.message || `Mã "${code}" không thuộc phiếu hoặc không hợp lệ`);
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Quét kiểm hàng thất bại');
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
      await handleScanInputCheck(res.scan_code);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Tra cứu Lot ID thất bại');
    }
  };

  const handleCheckAll = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await apiClient.inventory.checkAllOrderItems(orderId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success('Đã đánh dấu kiểm tất cả mặt hàng');
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Kiểm tất cả thất bại');
    } finally {
      setActing(false);
    }
  };

  const handleImportChecked = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await apiClient.inventory.importOrderItems(orderId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success('Đã nhập kho tất cả mặt hàng đã kiểm');
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Nhập kho thất bại');
    } finally {
      setActing(false);
    }
  };

  const handleFinishOrder = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await apiClient.inventory.finishOrder(orderId, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã hoàn tất Phiếu #${orderId} (Imported)`);
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Hoàn tất phiếu thất bại');
    } finally {
      setActing(false);
    }
  };

  const handleDeleteSkuGroup = async (row: InventoryOrderItemDto) => {
    try {
      await apiClient.inventory.deleteOrderItem({
        inventory_warehouse_order_id: orderId,
        inventory_item_id: row.inventory_item_id,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã xóa nhóm ${row.item.inventory_item_name}`);
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Xóa dòng thất bại');
    }
  };

  const handleConfirmAddQty = async () => {
    if (!addQtyModal.orderItemId || addQtyModal.qty <= 0) return;
    setActing(true);
    try {
      await apiClient.inventory.addOrderItemQuantity({
        inventory_warehouse_order_item_id: addQtyModal.orderItemId,
        quantity: addQtyModal.qty,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã thêm +${addQtyModal.qty} cho ${addQtyModal.name}`);
      setAddQtyModal({ open: false, orderItemId: null, name: '', qty: 1 });
      void loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Thêm số lượng thất bại');
    } finally {
      setActing(false);
    }
  };

  const rawItems = order?.inventory_item || [];
  const items = recentSkuId
    ? [
        ...rawItems.filter((i) => i.inventory_item_id === recentSkuId),
        ...rawItems.filter((i) => i.inventory_item_id !== recentSkuId),
      ]
    : rawItems;

  const totalChecked = items.reduce((s, r) => s + Number(r.total_quantity_checked || 0), 0);
  const totalImported = items.reduce((s, r) => s + Number(r.total_quantity_imported || 0), 0);
  const canEditLines = order && order.order_state !== 'Rejected' && (order.order_state === 'New' || canEditOrder);

  const columns: ColumnsType<InventoryOrderItemDto> = [
    {
      title: 'SKU / Vật Tư',
      key: 'item',
      width: 250,
      render: (_, r) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.item.inventory_item_code} · {r.item.inventory_item_unit}
            {r.item.inventory_item_attribute ? ` · ${r.item.inventory_item_attribute}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Đặt / Kiểm / Nhập',
      key: 'counts',
      width: 170,
      align: 'right',
      render: (_, r) => (
        <span className="tabular-nums font-semibold">
          {r.total_quantity ?? 1} /{' '}
          <span className="text-sky-600 dark:text-sky-400">{r.total_quantity_checked ?? 0}</span> /{' '}
          <span className="text-emerald-600 dark:text-emerald-400">{r.total_quantity_imported ?? 0}</span>
        </span>
      ),
    },
    ...(showPrice
      ? [
          {
            title: 'Thành Tiền / Ước Tính',
            key: 'price',
            width: 155,
            align: 'right' as const,
            render: (_: unknown, r: InventoryOrderItemDto) => (
              <div className="tabular-nums text-xs">
                <div className="font-medium">{formatVnd(r.total_retail_price)}</div>
                <div className="text-slate-400">Ước: {formatVnd(r.total_retail_price_estimated)}</div>
              </div>
            ),
          },
        ]
      : []),
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="small"
            icon={<AppIcon icon={Eye} size={14} />}
            onClick={() => {
              setDetailSkuId(r.inventory_item_id);
              setDetailModalOpen(true);
            }}
          >
            Chi tiết
          </Button>
          <Link
            href={`/dashboard/inventory/print/order/${orderId}/labels?itemId=${r.inventory_item_id}`}
            target="_blank"
          >
            <Button size="small" icon={<AppIcon icon={Printer} size={14} />}>
              In Tem SKU
            </Button>
          </Link>
          {canEditLines && (
            <>
              <Button
                size="small"
                icon={<AppIcon icon={Plus} size={14} />}
                onClick={() => {
                  setRecentSkuId(r.inventory_item_id);
                  setAddQtyModal({
                    open: true,
                    orderItemId: r.inventory_warehouse_order_item_id,
                    name: r.item.inventory_item_name,
                    qty: 1,
                  });
                }}
              >
                +SL
              </Button>
              <Button
                size="small"
                danger
                icon={<AppIcon icon={Trash2} size={14} />}
                onClick={() => void handleDeleteSkuGroup(r)}
              />
            </>
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
        title={`Trạm Kiểm Hàng & Nhập Kho · Phiếu #${orderId}`}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={connected ? 'success' : 'default'} label={connected ? 'SSE Live' : 'SSE Offline'} />
            <Link href="/dashboard/inventory/orders">
              <Button icon={<AppIcon icon={ArrowLeft} size={14} />}>Quay lại</Button>
            </Link>
            {canCheck && order?.order_state === 'Assigned' && (
              <>
                <Button
                  loading={acting}
                  icon={<AppIcon icon={CheckCheck} size={14} />}
                  onClick={() => void handleCheckAll()}
                >
                  Kiểm Tất Cả
                </Button>
                <Button
                  type="primary"
                  loading={acting}
                  icon={<AppIcon icon={PackageCheck} size={14} />}
                  onClick={() => void handleImportChecked()}
                >
                  Nhập Kho Các Mục Đã Kiểm
                </Button>
                <Button
                  type="primary"
                  loading={acting}
                  icon={<AppIcon icon={CheckCircle2} size={14} />}
                  onClick={() => void handleFinishOrder()}
                >
                  Hoàn Tất Phiếu (Imported)
                </Button>
              </>
            )}
          </div>
        }
      >
        {loading && !order ? (
          <StatePanel kind="loading" title="Đang tải trạm kiểm nhập..." />
        ) : error ? (
          <StatePanel kind="error" title="Không tải được phiếu kho" description={error} />
        ) : !order ? (
          <StatePanel kind="empty" title="Không tìm thấy phiếu kho" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div>
                <span className="font-semibold">
                  {order.from_inventory_warehouse?.inventory_warehouse_name || 'Nhà cung cấp'} →{' '}
                  {order.to_inventory_warehouse.inventory_warehouse_name}
                </span>
                <span className="ml-2 text-xs text-slate-500">({order.description})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 tabular-nums">
                <StatusTag status="processing" label={`Trạng thái: ${order.order_state}`} />
                <StatusTag status="warning" label={`Đã kiểm: ${totalChecked} / ${order.total_quantity}`} />
                <StatusTag status="success" label={`Đã nhập kho: ${totalImported} / ${order.total_quantity}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="flex gap-2">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onPressEnter={() => void handleScanInputCheck(scanInput)}
                  placeholder="Quét QR kiểm nhận hàng..."
                  prefix={<AppIcon icon={QrCode} size={14} />}
                />
                <Button type="primary" onClick={() => void handleScanInputCheck(scanInput)}>
                  Kiểm
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={lotInput}
                  onChange={(e) => setLotInput(e.target.value)}
                  onPressEnter={() => void handleLotLookupAndScan()}
                  placeholder="Hoặc nhập #Lot ID..."
                />
                <Button onClick={() => void handleLotLookupAndScan()}>Kiểm Lot</Button>
              </div>
              <div className="flex gap-2">
                <Input
                  allowClear
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onPressEnter={() => setAppliedKeyword(keyword.trim())}
                  placeholder="Tìm theo tên SKU..."
                  prefix={<AppIcon icon={Search} size={14} />}
                />
                <Button icon={<AppIcon icon={RefreshCw} size={14} />} onClick={() => void loadOrder()} />
              </div>
            </div>

            <DataTable<InventoryOrderItemDto>
              rowKey={(r) => `${r.inventory_item_id}-${r.inventory_warehouse_order_item_id}`}
              columns={columns}
              dataSource={items}
              loading={loading}
              scroll={{ x: showPrice ? 875 : 720 }}
              pagination={false}
            />
          </div>
        )}
      </SectionCard>

      <OrderItemsModal
        open={detailModalOpen}
        orderId={orderId}
        inventoryItemId={detailSkuId}
        showPrice={showPrice}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        onClose={() => setDetailModalOpen(false)}
      />

      <AdaptiveModal
        open={addQtyModal.open}
        onCancel={() => setAddQtyModal({ open: false, orderItemId: null, name: '', qty: 1 })}
        intent="confirm"
        zIndex={1050}
        confirmLoading={acting}
        title={`Thêm Số Lượng · ${addQtyModal.name}`}
        okText="Thêm"
        cancelText="Đóng"
        onOk={() => void handleConfirmAddQty()}
      >
        <div className="space-y-2 pt-2">
          <label className="block text-xs text-slate-600 dark:text-slate-300">
            Số lượng thêm (sinh mã QR tự động):
          </label>
          <InputNumber
            min={1}
            max={500}
            className="w-full"
            value={addQtyModal.qty}
            onChange={(v) => setAddQtyModal((prev) => ({ ...prev, qty: Math.max(1, Number(v || 1)) }))}
          />
        </div>
      </AdaptiveModal>
    </div>
  );
}
