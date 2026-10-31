'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../../components/ui/DataTable';
import { Calendar, TrendingUp } from 'lucide-react';
import { FinancialGoalDayBreakdown } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

interface FinancialGoalDailyTableProps {
  data: FinancialGoalDayBreakdown[];
  month: string;
}

export const FinancialGoalDailyTable: React.FC<FinancialGoalDailyTableProps> = ({ data, month }) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const formatCurrency = (amount: number): string => {
    if (!amount) return '0đ';
    return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
  };

  const columns: ColumnsType<FinancialGoalDayBreakdown> = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (val: string, record) => {
        const parts = val.split('-');
        const displayDate = `${parts[2]}/${parts[1]}`;
        const isWeekend = record.dayOfWeek === 'T7' || record.dayOfWeek === 'CN';
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isWeekend
                  ? isDark
                    ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {record.dayOfWeek}
            </span>
            <span className={`font-semibold tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              {displayDate}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Doanh Thu Combo',
      dataIndex: 'comboRevenue',
      key: 'comboRevenue',
      align: 'right',
      render: (val: number) => (
        <span
          className={`font-mono tabular-nums text-xs font-medium ${
            val > 0 ? (isDark ? 'text-purple-300' : 'text-purple-700') : isDark ? 'text-zinc-600' : 'text-slate-400'
          }`}
        >
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Doanh Thu Khách Lẻ',
      dataIndex: 'retailRevenue',
      key: 'retailRevenue',
      align: 'right',
      render: (val: number) => (
        <span
          className={`font-mono tabular-nums text-xs font-medium ${
            val > 0 ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : isDark ? 'text-zinc-600' : 'text-slate-400'
          }`}
        >
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Doanh Thu Sản Phẩm',
      dataIndex: 'productRevenue',
      key: 'productRevenue',
      align: 'right',
      render: (val: number) => (
        <span
          className={`font-mono tabular-nums text-xs font-medium ${
            val > 0 ? (isDark ? 'text-amber-300' : 'text-amber-700') : isDark ? 'text-zinc-600' : 'text-slate-400'
          }`}
        >
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Tổng Ngày',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right',
      render: (val: number) => (
        <span
          className={`font-mono tabular-nums text-xs font-bold ${
            val > 0 ? (isDark ? 'text-white' : 'text-slate-900') : isDark ? 'text-zinc-600' : 'text-slate-400'
          }`}
        >
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Lũy Kế Tháng',
      dataIndex: 'cumulativeTotal',
      key: 'cumulativeTotal',
      align: 'right',
      render: (val: number) => (
        <span
          className={`font-mono tabular-nums text-xs font-semibold ${
            isDark ? 'text-cyan-400/90' : 'text-cyan-700'
          }`}
        >
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Số Đơn',
      dataIndex: 'orderCount',
      key: 'orderCount',
      align: 'center',
      width: 90,
      render: (val: number) => (
        <span
          className={`font-mono tabular-nums text-xs px-2 py-0.5 rounded ${
            val > 0
              ? isDark
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-slate-100 text-slate-700 font-medium'
              : isDark
                ? 'text-zinc-600'
                : 'text-slate-400'
          }`}
        >
          {val} đơn
        </span>
      ),
    },
  ];

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
        isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
            Tiến Độ Doanh Thu Từng Ngày (Tháng {month})
          </h3>
        </div>
        <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
          {data.length} ngày trong kỳ
        </span>
      </div>

      <div className="overflow-x-auto">
        <DataTable
          dataSource={data}
          columns={columns}
          rowKey="date"
          size="small"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '31'],
            size: 'small',
          }}
          className={isDark ? 'dark-theme' : 'light-theme'}
        />
      </div>
    </div>
  );
};
