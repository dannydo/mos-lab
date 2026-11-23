'use client';

import { Card, Col, Row, Select, Space } from 'antd';
import { Store } from 'lucide-react';
import { ToolbarToggle } from '~/components/ui';
import type { ShopCCData, ShopCVData } from '../hooks/useTodayData';
import TodayStaffAttendance from './TodayStaffAttendance';

export interface TodayShopAttendanceCardProps {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  shopBranch: 'detham' | 'estella' | 'all';
  onChangeShopBranch: (val: 'detham' | 'estella' | 'all') => void;
  showTax: boolean;
  onToggleShowTax: (checked: boolean) => void;
  activeShopData: {
    revLe: number;
    revCombo: number;
    revProduct: number;
    cc: ShopCCData[];
    cv: ShopCVData[];
  };
  activeShopTotalRevenue: number;
}

export function TodayShopAttendanceCard({
  themeMode,
  token,
  shopBranch,
  onChangeShopBranch,
  showTax,
  onToggleShowTax,
  activeShopData,
  activeShopTotalRevenue,
}: TodayShopAttendanceCardProps) {
  return (
    <Card
      title={
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-500" />
            <span className="text-[15px] font-bold">Tình hình nhân sự & Thực tế phục vụ tại cửa hàng</span>
          </div>

          <Space size="middle">
            <Select
              aria-label="Chi nhánh theo dõi"
              value={shopBranch}
              onChange={onChangeShopBranch}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'detham', label: 'Đề Thám' },
                { value: 'estella', label: 'Estella Place' },
              ]}
              className="w-[200px]"
            />

            <ToolbarToggle
              className="today-vat-toggle"
              label="VAT"
              aria-label="Hiển thị doanh thu sau thuế VAT"
              checked={showTax}
              onChange={onToggleShowTax}
            />
          </Space>
        </div>
      }
      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm [&_.ant-card-body]:p-4"
    >
      <div>
        <div className="font-bold text-[13px] text-slate-600 dark:text-slate-300 mb-3">
          Phân Phối Doanh Thu Hôm Nay (Revenue Breakdown)
        </div>
        <Row gutter={[12, 12]} className="mb-6">
          <Col xs={12} sm={12} md={6}>
            <Card
              size="small"
              className="bg-neutral-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Doanh Thu Single</span>
              <div className="tabular-nums font-mono text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {activeShopData.revLe.toLocaleString('vi-VN')}&nbsp;đ
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card
              size="small"
              className="bg-neutral-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <span className="text-[11px] text-amber-700 dark:text-amber-400">Doanh Thu Combo</span>
              <div className="tabular-nums font-mono text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                {activeShopData.revCombo.toLocaleString('vi-VN')}&nbsp;đ
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card
              size="small"
              className="bg-neutral-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Doanh Thu Sản Phẩm</span>
              <div className="tabular-nums font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {activeShopData.revProduct.toLocaleString('vi-VN')}&nbsp;đ
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card
              size="small"
              className="bg-neutral-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">∑ Doanh Thu</span>
              <div className="tabular-nums font-mono text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                {activeShopTotalRevenue.toLocaleString('vi-VN')}&nbsp;đ
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* CC & CV Table split */}
      <TodayStaffAttendance themeMode={themeMode} token={token} ccList={activeShopData.cc} cvList={activeShopData.cv} />
    </Card>
  );
}
