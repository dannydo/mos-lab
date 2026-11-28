'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
import type { InventoryCompanyInfoDto, InventoryOrderDto } from '@mos-lab/shared';
import { AppIcon, StatePanel } from '../../../../../../components/ui';
import { apiClient } from '../../../../../../lib/api-client';
import { useInventoryAdminContext } from '../../../_components/useInventoryAdminContext';
import printStyles from '../../print.module.css';

function formatNum(v?: number | null): string {
  return Math.round(Number(v || 0)).toLocaleString('vi-VN');
}

export default function InventoryOrderPrintPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params?.orderId || 0);
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');

  const [order, setOrder] = useState<InventoryOrderDto | null>(null);
  const [company, setCompany] = useState<InventoryCompanyInfoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getOrderDetail(orderId, {
        mode: 'print-invoice',
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setOrder(res.order);
      setCompany(res.company || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được phiếu in');
    } finally {
      setLoading(false);
    }
  }, [orderId, ctx.previewRole, ctx.previewStoreId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dateObj = order?.date_created ? new Date(order.date_created.replace(' ', 'T')) : new Date();
  const items = order?.inventory_item || [];

  return (
    <div className="p-4">
      <div
        className={`${printStyles.noPrint} mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventory/orders">
            <Button icon={<AppIcon icon={ArrowLeft} size={14} />}>Quay lại</Button>
          </Link>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            In Giấy Đề Nghị Cung Ứng · Phiếu #{orderId}
          </span>
        </div>
        <Button type="primary" icon={<AppIcon icon={Printer} size={14} />} onClick={() => window.print()}>
          In Phiếu (Print)
        </Button>
      </div>

      {loading ? (
        <StatePanel kind="loading" title="Đang tải dữ liệu phiếu in..." />
      ) : error ? (
        <StatePanel kind="error" title="Không tải được phiếu in" description={error} />
      ) : !order ? (
        <StatePanel kind="empty" title="Không tìm thấy phiếu kho" />
      ) : (
        <div className={printStyles.printContainer}>
          <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
            <div className="text-xs leading-5">
              <div className="font-bold">{company?.company_name}</div>
              <div>{company?.company_address}</div>
              <div>MST: {company?.company_tax_number}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">GIẤY ĐỀ NGHỊ CUNG ỨNG VẬT TƯ HÀNG HOÁ</div>
              <div className="text-xs tabular-nums">
                Ngày {String(dateObj.getDate()).padStart(2, '0')} Tháng{' '}
                {String(dateObj.getMonth() + 1).padStart(2, '0')}, Năm {dateObj.getFullYear()} · Phiếu #
                {order.inventory_warehouse_order_id}
              </div>
            </div>
          </div>

          <div className="my-3 space-y-1 text-xs">
            <div>
              Họ và tên: <b>{order.created_staff?.full_name || '(Đơn hàng tự động)'}</b>
            </div>
            <div>
              Đơn vị nhận: <b>{order.to_inventory_warehouse.inventory_warehouse_name}</b>
              {order.from_inventory_warehouse && (
                <span className="ml-4">
                  Từ kho: <b>{order.from_inventory_warehouse.inventory_warehouse_name}</b>
                </span>
              )}
            </div>
            <div>
              Lý do xuất vật tư, hàng hoá: <b>{order.description}</b>
            </div>
            <div className="text-right italic">Đơn vị tiền: VNĐ</div>
          </div>

          {!order.is_internal && showPrice ? (
            <table className={printStyles.printTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>Số TT</th>
                  <th rowSpan={2}>Tên SP</th>
                  <th rowSpan={2}>Quy cách</th>
                  <th rowSpan={2}>Đơn vị tính</th>
                  <th colSpan={2}>Đặt hàng</th>
                  <th colSpan={2}>Giao hàng</th>
                  <th colSpan={2}>Nhập hàng</th>
                  <th rowSpan={2}>Ghi chú</th>
                </tr>
                <tr>
                  <th>SL</th>
                  <th>Thành tiền</th>
                  <th>SL</th>
                  <th>Thành tiền</th>
                  <th>SL</th>
                  <th>Thành tiền</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
                    <th key={n}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {items.map((it, idx) => (
                  <tr key={`${it.inventory_item_id}-${idx}`}>
                    <td className="text-center">{idx + 1}</td>
                    <td>{it.item.inventory_item_name}</td>
                    <td>{it.item.inventory_item_attribute || ''}</td>
                    <td>{it.item.inventory_item_unit}</td>
                    <td className="text-right">{formatNum(it.total_quantity)}</td>
                    <td className="text-right">{formatNum(it.total_retail_price)}</td>
                    <td className="text-right">{formatNum(it.total_quantity_exported)}</td>
                    <td className="text-right">{formatNum(it.total_retail_price_exported)}</td>
                    <td className="text-right">{formatNum(it.total_quantity_imported)}</td>
                    <td className="text-right">{formatNum(it.total_retail_price_imported)}</td>
                    <td />
                  </tr>
                ))}
                <tr>
                  <th />
                  <th className="text-left">Cộng</th>
                  <th />
                  <th />
                  <th className="text-right">{formatNum(order.total_quantity)}</th>
                  <th className="text-right">{formatNum(order.total_retail_price)}</th>
                  <th className="text-right">{formatNum(order.total_quantity_exported)}</th>
                  <th className="text-right">{formatNum(order.total_retail_price_exported)}</th>
                  <th className="text-right">{formatNum(order.total_quantity_imported)}</th>
                  <th className="text-right">{formatNum(order.total_retail_price_imported)}</th>
                  <th />
                </tr>
              </tbody>
            </table>
          ) : (
            <table className={printStyles.printTable}>
              <thead>
                <tr>
                  <th>Số TT</th>
                  <th>Tên SP</th>
                  <th>Quy cách</th>
                  <th>Đơn vị tính</th>
                  <th>Đặt hàng</th>
                  <th>Giao hàng</th>
                  <th>Nhập hàng</th>
                  <th>Ghi chú</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <th key={n}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {items.map((it, idx) => (
                  <tr key={`${it.inventory_item_id}-${idx}`}>
                    <td className="text-center">{idx + 1}</td>
                    <td>{it.item.inventory_item_name}</td>
                    <td>{it.item.inventory_item_attribute || ''}</td>
                    <td>{it.item.inventory_item_unit}</td>
                    <td className="text-right">{formatNum(it.total_quantity)}</td>
                    <td className="text-right">{formatNum(it.total_quantity_exported)}</td>
                    <td className="text-right">{formatNum(it.total_quantity_imported)}</td>
                    <td />
                  </tr>
                ))}
                <tr>
                  <th />
                  <th className="text-left">Cộng</th>
                  <th />
                  <th />
                  <th className="text-right">{formatNum(order.total_quantity)}</th>
                  <th className="text-right">{formatNum(order.total_quantity_exported)}</th>
                  <th className="text-right">{formatNum(order.total_quantity_imported)}</th>
                  <th />
                </tr>
              </tbody>
            </table>
          )}

          <div className="mt-10 grid grid-cols-4 gap-4 pb-16 text-center text-xs font-bold">
            <div>NGƯỜI ĐỀ NGHỊ</div>
            <div>THỦ KHO</div>
            <div>KẾ TOÁN TRƯỞNG</div>
            <div>GIÁM ĐỐC</div>
          </div>
        </div>
      )}
    </div>
  );
}
