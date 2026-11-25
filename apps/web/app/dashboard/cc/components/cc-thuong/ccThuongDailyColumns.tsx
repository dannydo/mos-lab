import React from 'react';
import { Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DailySalesBonusConsultantRecord } from '@mos-lab/shared';
import { formatStoreCode } from '~/lib/format-utils';
import { StatusTag } from '~/components/ui';
import CcAvatar from '../CcAvatar';

export function buildCcThuongDailyColumns(): ColumnsType<DailySalesBonusConsultantRecord> {
  return [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (val: string) => (
        <span className="tabular-nums font-medium text-xs text-slate-600 dark:text-slate-400">{val}</span>
      ),
    },
    {
      title: 'CC',
      dataIndex: 'consultant_name',
      key: 'consultant_name',
      width: 170,
      render: (val: string, record: DailySalesBonusConsultantRecord) => (
        <Space size={6} align="center" className="whitespace-nowrap">
          <CcAvatar name={val} src={record.avatar} size={24} />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-medium text-xs whitespace-nowrap">{val}</span>
            {record.store_code && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                · {formatStoreCode(record.store_code)}
              </span>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Doanh Số Combo',
      dataIndex: 'combo_sales',
      key: 'combo_sales',
      align: 'right',
      render: (val: number, record: DailySalesBonusConsultantRecord) => {
        const greenVisits = record.green_visits || 0;
        const comboCount = record.combo_count || 0;
        const dailyComboRate = greenVisits > 0 ? Math.min(100, Math.round((comboCount / greenVisits) * 100)) : null;

        return (
          <div>
            <span className="tabular-nums font-semibold text-xs text-blue-600 dark:text-blue-400">
              {Math.round(val || 0).toLocaleString('vi-VN')}&nbsp;đ
            </span>
            {comboCount > 0 || dailyComboRate !== null ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                ({comboCount} combo
                {dailyComboRate !== null ? (
                  <>
                    {' '}
                    · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{dailyComboRate}% VX</span>
                  </>
                ) : null}
                )
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Doanh Số SP',
      dataIndex: 'product_sales',
      key: 'product_sales',
      align: 'right',
      render: (val: number, record: DailySalesBonusConsultantRecord) => (
        <div>
          <span className="tabular-nums font-semibold text-xs text-purple-600 dark:text-purple-400">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
          {record.product_count ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              ({record.product_count} SP)
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Doanh Số Single',
      dataIndex: 'single_sales',
      key: 'single_sales',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thu Nợ',
      dataIndex: 'debt_collected',
      key: 'debt_collected',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '-VAT',
      dataIndex: 'vat',
      key: 'vat',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums text-xs text-rose-600 dark:text-rose-400/80">
          -{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '-Debt',
      dataIndex: 'debt',
      key: 'debt',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums text-xs text-orange-600 dark:text-orange-400/80">
          -{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '∑ Doanh Số Tính Thưởng',
      dataIndex: 'total_sales',
      key: 'total_sales',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-amber-600 dark:text-amber-400">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '% Thưởng',
      dataIndex: 'commission_rate_percent',
      key: 'commission_rate_percent',
      align: 'right',
      width: 110,
      render: (val: number) => (
        <StatusTag
          status={val >= 2 ? 'success' : val >= 1 ? 'gold' : 'processing'}
          label={`${val.toFixed(1)}%`}
          className="tabular-nums font-bold text-xs py-0 px-1.5"
        />
      ),
    },
    {
      title: 'Daily Bonus',
      dataIndex: 'daily_bonus',
      key: 'daily_bonus',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-emerald-600 dark:text-emerald-400">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];
}
