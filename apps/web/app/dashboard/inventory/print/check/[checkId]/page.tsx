'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Switch } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
import type { InventoryCheckPrintResponse } from '@mos-lab/shared';
import { AppIcon, StatePanel } from '../../../../../../components/ui';
import { apiClient } from '../../../../../../lib/api-client';
import { useInventoryAdminContext } from '../../../_components/useInventoryAdminContext';
import printStyles from '../../print.module.css';

function formatNum(v?: number | null): string {
  return Math.round(Number(v || 0)).toLocaleString('vi-VN');
}

export default function InventoryCheckPrintPage() {
  const params = useParams<{ checkId: string }>();
  const checkId = Number(params?.checkId || 0);
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');

  const [isLostOnly, setIsLostOnly] = useState(false);
  const [data, setData] = useState<InventoryCheckPrintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCheckPrint = useCallback(async () => {
    if (!checkId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getCheckPrintData(checkId, {
        isLost: isLostOnly,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được biên bản kiểm kê');
    } finally {
      setLoading(false);
    }
  }, [checkId, isLostOnly, ctx.previewRole, ctx.previewStoreId]);

  useEffect(() => {
    void loadCheckPrint();
  }, [loadCheckPrint]);

  const check = data?.check;
  const company = data?.company;
  const items = data?.items || [];
  const dtStr = check?.date_updated || check?.date_created;
  const dt = dtStr ? new Date(dtStr.replace(' ', 'T')) : new Date();

  const summary = items.reduce(
    (acc, r) => ({
      qty: acc.qty + Number(r.total_quantity || 0),
      checked: acc.checked + Number(r.total_quantity_checked || 0),
      price: acc.price + Number(r.total_retail_price || 0),
      priceChecked: acc.priceChecked + Number(r.total_retail_price_checked || 0),
    }),
    { qty: 0, checked: 0, price: 0, priceChecked: 0 }
  );

  return (
    <div className="p-4">
      <div
        className={`${printStyles.noPrint} mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventory/items">
            <Button icon={<AppIcon icon={ArrowLeft} size={14} />}>Quay lại</Button>
          </Link>
          <span className="font-semibold text-slate-900 dark:text-slate-100">Biên Bản Kiểm Kê · Phiếu #{checkId}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={isLostOnly} onChange={setIsLostOnly} />
            <span>Chỉ in mục thiếu (Lost)</span>
          </div>
          <Button type="primary" icon={<AppIcon icon={Printer} size={14} />} onClick={() => window.print()}>
            In Biên Bản
          </Button>
        </div>
      </div>

      {loading ? (
        <StatePanel kind="loading" title="Đang tải biên bản kiểm kê..." />
      ) : error ? (
        <StatePanel kind="error" title="Không tải được biên bản" description={error} />
      ) : !check ? (
        <StatePanel kind="empty" title="Không tìm thấy phiếu kiểm kho" />
      ) : (
        <div className={printStyles.printContainer}>
          <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
            <div className="text-xs leading-5">
              <div className="font-bold">{company?.company_name}</div>
              <div>{company?.company_address}</div>
              <div>MST: {company?.company_tax_number}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HOÁ</div>
              <div className="text-xs tabular-nums">
                {String(dt.getHours()).padStart(2, '0')} Giờ, Ngày {String(dt.getDate()).padStart(2, '0')} Tháng{' '}
                {String(dt.getMonth() + 1).padStart(2, '0')}, Năm {dt.getFullYear()}
              </div>
            </div>
          </div>

          <div className="my-3 space-y-1 text-xs">
            <div>
              Kho kiểm kê: <b>{check.warehouse.inventory_warehouse_name}</b> ({check.item_state})
            </div>
            <div>
              Họ và tên: <b>{check.checked_staff?.full_name || '—'}</b>
              {check.checked_staff?.user_group_name && (
                <span className="ml-6">
                  Chức vụ: <b>{check.checked_staff.user_group_name}</b>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span>Đã kiểm kê kho có những mặt hàng dưới đây:</span>
              <span className="italic">Đơn vị tiền: VNĐ</span>
            </div>
          </div>

          <table className={printStyles.printTable}>
            <thead>
              <tr>
                <th rowSpan={2}>Số TT</th>
                <th rowSpan={2}>Tên SP</th>
                <th rowSpan={2}>Quy cách</th>
                <th rowSpan={2}>Đơn vị tính</th>
                <th colSpan={2}>Số lượng</th>
                <th colSpan={2}>Chênh lệch</th>
                {showPrice && <th rowSpan={2}>Thành tiền</th>}
                <th rowSpan={2}>Ghi chú</th>
              </tr>
              <tr>
                <th>Tồn cuối kỳ</th>
                <th>Kiểm kê</th>
                <th>Thừa</th>
                <th>Thiếu</th>
              </tr>
              <tr>
                {(showPrice ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map((n) => (
                  <th key={n}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {items.map((it, idx) => (
                <tr key={it.inventory_item_id}>
                  <td className="text-center">{idx + 1}</td>
                  <td>{it.item.inventory_item_name}</td>
                  <td>{it.item.inventory_item_attribute || ''}</td>
                  <td>{it.item.inventory_item_unit}</td>
                  <td className="text-right">{formatNum(it.total_quantity)}</td>
                  <td className="text-right">{formatNum(it.total_quantity_checked)}</td>
                  <td className="text-right">0</td>
                  <td className="text-right">{formatNum(it.total_quantity - it.total_quantity_checked)}</td>
                  {showPrice && (
                    <td className="text-right">
                      {formatNum((it.total_retail_price || 0) - (it.total_retail_price_checked || 0))}
                    </td>
                  )}
                  <td />
                </tr>
              ))}
              <tr>
                <th />
                <th className="text-left">Cộng</th>
                <th />
                <th />
                <th className="text-right">{formatNum(summary.qty)}</th>
                <th className="text-right">{formatNum(summary.checked)}</th>
                <th className="text-right">0</th>
                <th className="text-right">{formatNum(summary.qty - summary.checked)}</th>
                {showPrice && <th className="text-right">{formatNum(summary.price - summary.priceChecked)}</th>}
                <th />
              </tr>
            </tbody>
          </table>

          <div className="mt-10 grid grid-cols-4 gap-4 pb-16 text-center text-xs font-bold">
            <div>BAN KIỂM KÊ</div>
            <div>THỦ KHO</div>
            <div>KẾ TOÁN TRƯỞNG</div>
            <div>GIÁM ĐỐC</div>
          </div>
        </div>
      )}
    </div>
  );
}
