'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dayjs, { type Dayjs } from 'dayjs';
import { Button, DatePicker, Select, Tabs } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
import {
  INVENTORY_ITEM_TYPES,
  type InventoryItemType,
  type InventoryLifecycleCounters,
  type InventoryLifecycleRowDto,
  type InventoryWarehouseReportPrintResponse,
  type InventoryWarehouseReportRowDto,
} from '@mos-lab/shared';
import { AppIcon, StatePanel } from '../../../../../components/ui';
import { apiClient } from '../../../../../lib/api-client';
import { useInventoryAdminContext } from '../../_components/useInventoryAdminContext';
import printStyles from '../print.module.css';

function fmt(v?: number | null): string {
  return Math.round(Number(v || 0)).toLocaleString('vi-VN');
}

const TYPE_TABS: Array<{ key: 'ALL' | InventoryItemType; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  ...INVENTORY_ITEM_TYPES.map((t) => ({ key: t, label: t })),
];

export default function InventoryWarehouseReportPrintPage() {
  const searchParams = useSearchParams();
  const initialWh = searchParams?.get('warehouseId') ? Number(searchParams.get('warehouseId')) : undefined;
  const initialType = (searchParams?.get('inventoryItemType') as InventoryItemType | null) || 'ALL';
  const initFrom = searchParams?.get('dateFrom');
  const initTo = searchParams?.get('dateTo');

  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');

  const [warehouseId, setWarehouseId] = useState<number | undefined>(initialWh);
  const [itemType, setItemType] = useState<'ALL' | InventoryItemType>(initialType);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    initFrom ? dayjs(initFrom) : dayjs().startOf('month'),
    initTo ? dayjs(initTo) : dayjs().endOf('month'),
  ]);

  const [report, setReport] = useState<InventoryWarehouseReportPrintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFrom = dateRange[0].format('YYYY-MM-DD');
  const dateTo = dateRange[1].format('YYYY-MM-DD');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getWarehouseReportPrint({
        warehouseId,
        inventoryItemType: itemType === 'ALL' ? undefined : itemType,
        dateFrom,
        dateTo,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setReport(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được báo cáo xuất nhập tồn');
    } finally {
      setLoading(false);
    }
  }, [warehouseId, itemType, dateFrom, dateTo, ctx.previewRole, ctx.previewStoreId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const renderQtyAndPriceCols = (c: InventoryLifecycleCounters, isMainTable: boolean, isSummary = false) => {
    const Cell = isSummary ? 'th' : 'td';
    const col1Qty = isMainTable
      ? Number(c.total_quantity_input_supplier || 0)
      : Number(c.total_quantity_input_main || 0);
    const col1Price = isMainTable
      ? Number(c.total_retail_price_input_supplier || 0)
      : Number(c.total_retail_price_input_main || 0);
    const col2Qty = isMainTable
      ? Number(c.total_quantity_input_main || 0) + Number(c.total_quantity_input_other || 0)
      : Number(c.total_quantity_input_supplier || 0) + Number(c.total_quantity_input_other || 0);
    const col2Price = isMainTable
      ? Number(c.total_retail_price_input_main || 0) + Number(c.total_retail_price_input_other || 0)
      : Number(c.total_retail_price_input_supplier || 0) + Number(c.total_retail_price_input_other || 0);
    const col3Qty = isMainTable
      ? Number(c.total_quantity_output_other || 0) +
        Number(c.total_quantity_used || 0) +
        Number(c.total_quantity_lost || 0) +
        Number(c.total_quantity_broken || 0)
      : Number(c.total_quantity_used || 0) + Number(c.total_quantity_lost || 0) + Number(c.total_quantity_broken || 0);
    const col3Price = isMainTable
      ? Number(c.total_retail_price_output_other || 0) +
        Number(c.total_retail_price_used || 0) +
        Number(c.total_retail_price_lost || 0) +
        Number(c.total_retail_price_broken || 0)
      : Number(c.total_retail_price_used || 0) +
        Number(c.total_retail_price_lost || 0) +
        Number(c.total_retail_price_broken || 0);
    const col4Qty = isMainTable
      ? Number(c.total_quantity_output_destroy || 0)
      : Number(c.total_quantity_output_other || 0);
    const col4Price = isMainTable
      ? Number(c.total_retail_price_output_destroy || 0)
      : Number(c.total_retail_price_output_other || 0);
    const col5Qty = isMainTable
      ? Number(c.total_quantity_output_return || 0)
      : Number(c.total_quantity_output_main || 0);
    const col5Price = isMainTable
      ? Number(c.total_retail_price_output_return || 0)
      : Number(c.total_retail_price_output_main || 0);

    const pairs = [
      [c.total_quantity_start, c.total_retail_price_start],
      [col1Qty, col1Price],
      [col2Qty, col2Price],
      [col3Qty, col3Price],
      [col4Qty, col4Price],
      [col5Qty, col5Price],
      [c.total_quantity_end, c.total_retail_price_end],
    ];
    return pairs.map(([q, p], i) => (
      <React.Fragment key={i}>
        <Cell className="text-right">{fmt(q)}</Cell>
        {showPrice && <Cell className="text-right">{fmt(p)}</Cell>}
      </React.Fragment>
    ));
  };

  const selectedWh = report?.selectedWarehouse || null;
  const isMain = selectedWh?.inventory_warehouse_type === 'Main';
  const colCount = showPrice ? (selectedWh ? 18 : 17) : selectedWh ? 11 : 10;

  return (
    <div className="p-4">
      <div
        className={`${printStyles.noPrint} mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/inventory/items">
              <Button icon={<AppIcon icon={ArrowLeft} size={14} />}>Quay lại</Button>
            </Link>
            <span className="font-semibold text-slate-900 dark:text-slate-100">In Bảng Tổng Hợp Xuất Nhập Tồn Kho</span>
          </div>
          <Button type="primary" icon={<AppIcon icon={Printer} size={14} />} onClick={() => window.print()}>
            In Báo Cáo
          </Button>
        </div>

        <Tabs
          size="small"
          activeKey={itemType}
          onChange={(k) => setItemType(k as 'ALL' | InventoryItemType)}
          items={TYPE_TABS.map((t) => ({ key: t.key, label: t.label }))}
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
            allowClear
            placeholder="Tất cả kho (Bảng tổng hợp toàn hệ thống)"
            className="w-72"
            value={warehouseId}
            options={ctx.warehouses.map((w) => ({
              value: w.inventory_warehouse_id,
              label: `${w.inventory_warehouse_name} (${w.inventory_warehouse_type})`,
            }))}
            onChange={(v) => setWarehouseId(v ? Number(v) : undefined)}
          />
        </div>
      </div>

      {loading ? (
        <StatePanel kind="loading" title="Đang tổng hợp báo cáo in..." />
      ) : error ? (
        <StatePanel kind="error" title="Không tải được báo cáo" description={error} />
      ) : !report ? (
        <StatePanel kind="empty" title="Không có dữ liệu báo cáo" />
      ) : (
        <div className={printStyles.printContainer}>
          <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
            <div className="text-xs leading-5">
              <div className="font-bold">{report.company.company_name}</div>
              <div>{report.company.company_address}</div>
              <div>MST: {report.company.company_tax_number}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">BẢNG TỔNG HỢP XUẤT NHẬP TỒN KHO</div>
              <div className="text-xs tabular-nums">
                Tháng {dateRange[0].format('MM')}, Năm {dateRange[0].format('YYYY')} ({dateFrom} → {dateTo})
              </div>
              <div className="text-xs">NHÓM HÀNG: {itemType === 'ALL' ? 'Tất cả' : itemType}</div>
            </div>
          </div>

          <div className="my-2 flex items-center justify-between text-xs font-semibold">
            <div>KHO: {selectedWh ? selectedWh.inventory_warehouse_name : 'Tất cả'}</div>
            <div className="italic font-normal">Đơn vị tiền: VNĐ</div>
          </div>

          <table className={printStyles.printTable}>
            <thead>
              <tr>
                <th rowSpan={3}>Số TT</th>
                <th rowSpan={3}>{selectedWh ? 'Tên SP' : 'Kho'}</th>
                <th rowSpan={3}>{selectedWh ? 'Quy cách' : 'Địa chỉ'}</th>
                {selectedWh && <th rowSpan={3}>Đơn vị tính</th>}
                <th colSpan={showPrice ? 2 : 1} rowSpan={2}>
                  Tồn đầu kỳ
                </th>
                <th colSpan={showPrice ? 4 : 2}>Nhập trong kỳ</th>
                <th colSpan={showPrice ? 6 : 3}>Xuất trong kỳ</th>
                <th colSpan={showPrice ? 2 : 1} rowSpan={2}>
                  Tồn cuối kỳ
                </th>
              </tr>
              <tr>
                {selectedWh && isMain ? (
                  <>
                    <th colSpan={showPrice ? 2 : 1}>Mua hàng trong kỳ</th>
                    <th colSpan={showPrice ? 2 : 1}>Luân chuyển nội bộ</th>
                    <th colSpan={showPrice ? 2 : 1}>Xuất kho</th>
                    <th colSpan={showPrice ? 2 : 1}>Huỷ hàng</th>
                    <th colSpan={showPrice ? 2 : 1}>Trả hàng</th>
                  </>
                ) : (
                  <>
                    <th colSpan={showPrice ? 2 : 1}>Nhập từ HQ</th>
                    <th colSpan={showPrice ? 2 : 1}>Nhập từ kho khác</th>
                    <th colSpan={showPrice ? 2 : 1}>Sử dụng trong kỳ</th>
                    <th colSpan={showPrice ? 2 : 1}>Xuất sang kho khác</th>
                    <th colSpan={showPrice ? 2 : 1}>Trả về kho HQ</th>
                  </>
                )}
              </tr>
              <tr>
                {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                  <React.Fragment key={idx}>
                    <th>SL</th>
                    {showPrice && <th>Thành tiền</th>}
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                {Array.from({ length: colCount }, (_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {selectedWh
                ? (report.items as unknown as InventoryLifecycleRowDto[]).map((it, idx) => (
                    <tr key={`${it.inventory_item_id}-${idx}`}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{it.item.inventory_item_name}</td>
                      <td>{it.item.inventory_item_attribute || ''}</td>
                      <td>{it.item.inventory_item_unit}</td>
                      {renderQtyAndPriceCols(it, isMain)}
                    </tr>
                  ))
                : (report.items as InventoryWarehouseReportRowDto[]).map((wRow, idx) => (
                    <tr key={`${wRow.warehouse.inventory_warehouse_id}-${idx}`}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{wRow.warehouse.inventory_warehouse_name}</td>
                      <td>{wRow.warehouse.inventory_warehouse_address || ''}</td>
                      {renderQtyAndPriceCols(wRow, false)}
                    </tr>
                  ))}
              <tr>
                <th />
                <th className="text-left">Cộng</th>
                <th />
                {selectedWh && <th />}
                {renderQtyAndPriceCols(report.summary, isMain, true)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
