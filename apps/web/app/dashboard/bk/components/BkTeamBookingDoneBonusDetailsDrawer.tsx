'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Typography } from 'antd';
import { Award, Download, Search } from 'lucide-react';
import type { BkGameTeamBookingDoneBonusSummary } from '@mos-lab/shared';
import dayjs from 'dayjs';
import { AdaptiveDrawer, AppIcon, DataTable, MetricGrid, StatusTag } from '~/components/ui';
import BkAvatar from './BkAvatar';

interface BkTeamBookingDoneBonusDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  gameTitle?: string;
  gameId?: number;
  summary: BkGameTeamBookingDoneBonusSummary | null | undefined;
  initialStaffId?: number | null;
  initialRewardDate?: string | null;
}

export default function BkTeamBookingDoneBonusDetailsDrawer({
  open,
  onClose,
  gameTitle,
  gameId,
  summary,
  initialStaffId,
  initialRewardDate,
}: BkTeamBookingDoneBonusDetailsDrawerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedStaffId(initialStaffId ? String(initialStaffId) : 'ALL');
      setSelectedDate(initialRewardDate || 'ALL');
      setSearchQuery('');
    }
  }, [open, initialStaffId, initialRewardDate]);

  const records = useMemo(() => summary?.records || [], [summary]);

  const staffOptions = useMemo(() => {
    const totals = summary?.staffTotals || [];
    return [
      { label: 'Tất cả nhân viên', value: 'ALL' },
      ...totals.map((s) => ({
        label: `${s.staffName} (${s.singleDoneCount} Done lẻ · +${s.totalBonus.toLocaleString('vi-VN')}đ)`,
        value: String(s.staffId),
      })),
    ];
  }, [summary]);

  const dateOptions = useMemo(() => {
    const days = summary?.dailyResults || [];
    return [
      { label: 'Tất cả ngày trong Game', value: 'ALL' },
      ...days
        .filter((d) => !d.isFuture || d.totalSingleDone > 0)
        .map((d) => ({
          label: `${d.dateLabel} · ${d.teamBookings} BK (${d.bonusPerDone.toLocaleString('vi-VN')}đ/Done)`,
          value: d.date,
        })),
    ];
  }, [summary]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedStaffId !== 'ALL' && String(r.staffId) !== selectedStaffId) return false;
      if (selectedDate !== 'ALL' && r.rewardDate !== selectedDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchOrderId = String(r.orderId).includes(q);
        const matchOrderKey = (r.orderKey || '').toLowerCase().includes(q);
        const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
        const matchStaff = (r.staffName || '').toLowerCase().includes(q);
        if (!matchOrderId && !matchOrderKey && !matchCustomer && !matchStaff) return false;
      }
      return true;
    });
  }, [records, selectedStaffId, selectedDate, searchQuery]);

  const filteredTotalBonus = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.bonusAmount, 0),
    [filteredRecords]
  );

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Mã Đơn',
      'Order ID',
      'Telesales',
      'Khách Hàng',
      'Ngày Tính Mốc',
      'Booking Team Ngày',
      'Mốc Đạt Được',
      'Mức Thưởng/Done',
      'Tổng Thưởng',
      'Thời Điểm Hoàn Tất',
    ];
    const rows = filteredRecords.map((r) => [
      `"${r.orderKey || `#${r.orderId}`}"`,
      r.orderId,
      `"${r.staffName || ''}"`,
      `"${r.customerName || ''}"`,
      r.rewardDate,
      r.teamBookings,
      `"${r.tierLabel}"`,
      r.bonusPerDone,
      r.bonusAmount,
      r.orderCompletedAt ? dayjs(r.orderCompletedAt).format('YYYY-MM-DD HH:mm:ss') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bk-team-booking-done-bonuses-game-${gameId || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Award} size="md" className="text-amber-500" />
          <div>
            <Typography.Title level={5} className="!mb-0 font-bold">
              Đối Soát Thưởng Done Khách Lẻ Theo Mốc Booking Team – {gameTitle || 'Game BK'}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-xs">
              Chỉ tính đơn Done khách lẻ hoàn thành cùng ngày Team đạt mốc (không tính khách Combo, mỗi Done thưởng 1 lần)
            </Typography.Text>
          </div>
        </div>
      }
      width={980}
      extra={
        <Button
          htmlType="button"
          size="small"
          icon={<AppIcon icon={Download} size="sm" />}
          onClick={handleExportCsv}
          disabled={filteredRecords.length === 0}
          className="text-xs font-medium"
        >
          Xuất CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <MetricGrid
          items={[
            {
              key: 'totalSingleDone',
              title: 'Đơn Done Khách Lẻ Được Thưởng',
              value: filteredRecords.length,
              format: 'number',
            },
            {
              key: 'totalBonus',
              title: 'Tổng Thưởng Mốc Booking Team',
              value: filteredTotalBonus,
              format: 'vnd',
            },
            {
              key: 'avgBonus',
              title: 'Mức Thưởng Trung Bình / Done',
              value: filteredRecords.length > 0 ? Math.round(filteredTotalBonus / filteredRecords.length) : 0,
              format: 'vnd',
            },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Select
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              options={staffOptions}
              className="min-w-[220px]"
              size="small"
              aria-label="Lọc theo nhân viên"
            />
            <Select
              value={selectedDate}
              onChange={setSelectedDate}
              options={dateOptions}
              className="min-w-[210px]"
              size="small"
              aria-label="Lọc theo ngày tính mốc"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, khách hàng..."
              prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
              size="small"
              allowClear
              className="max-w-[200px]"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{filteredRecords.length}</span> đơn
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <DataTable
            size="small"
            dataSource={filteredRecords}
            rowKey={(r) => `${r.gameId}-${r.orderId}`}
            pagination={{ pageSize: 15, showSizeChanger: true, size: 'small' }}
            locale={{
              emptyText: (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa có đơn Done khách lẻ nào được ghi nhận thưởng trong bộ lọc hiện tại.
                </div>
              ),
            }}
            columns={[
              {
                title: 'Mã đơn',
                dataIndex: 'orderKey',
                width: 100,
                render: (val, record) => (
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">
                    {val || `#${record.orderId}`}
                  </span>
                ),
              },
              {
                title: 'Telesales',
                dataIndex: 'staffName',
                width: 145,
                render: (name) => (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <BkAvatar name={name || 'BK'} size={22} />
                    <span className="text-xs font-medium truncate">{name || 'Chưa rõ'}</span>
                  </div>
                ),
              },
              {
                title: 'Khách hàng',
                dataIndex: 'customerName',
                width: 145,
                render: (val) => (
                  <span className="text-xs text-slate-700 dark:text-slate-200">{val || 'Khách lẻ'}</span>
                ),
              },
              {
                title: 'Ngày tính mốc',
                dataIndex: 'rewardDate',
                width: 100,
                render: (val) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {val ? dayjs(val).format('DD/MM/YYYY') : '-'}
                  </span>
                ),
              },
              {
                title: 'BK Team ngày',
                dataIndex: 'teamBookings',
                width: 95,
                align: 'right',
                render: (val) => (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap">
                    {val} BK
                  </span>
                ),
              },
              {
                title: 'Mốc đạt',
                dataIndex: 'tierLabel',
                width: 115,
                render: (val) => <StatusTag status="gold" label={val || 'Mặc định'} />,
              },
              {
                title: 'Thưởng',
                dataIndex: 'bonusAmount',
                width: 95,
                align: 'right',
                render: (val) => (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                    +{Number(val || 0).toLocaleString('vi-VN')} đ
                  </span>
                ),
              },
              {
                title: 'Hoàn tất',
                dataIndex: 'orderCompletedAt',
                width: 110,
                align: 'right',
                render: (val) => (
                  <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                    {val ? dayjs(val).format('DD/MM HH:mm') : '-'}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </AdaptiveDrawer>
  );
}
