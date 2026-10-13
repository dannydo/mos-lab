'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Typography, Space } from 'antd';
import { Gift, Search, Download, Filter, CheckCircle2 } from 'lucide-react';
import type { BkGameDoneBonusRecord, BkGameDetailResponse } from '@mos-lab/shared';
import dayjs from 'dayjs';
import { AdaptiveDrawer, AppIcon, DataTable, MetricGrid, StatusTag } from '~/components/ui';
import BkAvatar from './BkAvatar';

interface BkDoneBonusDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  gameDetail: BkGameDetailResponse | null;
  initialStaffId?: number | null;
}

export default function BkDoneBonusDetailsDrawer({
  open,
  onClose,
  gameDetail,
  initialStaffId,
}: BkDoneBonusDetailsDrawerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (initialStaffId) {
        setSelectedStaffId(String(initialStaffId));
      } else {
        setSelectedStaffId('ALL');
      }
    }
  }, [open, initialStaffId]);

  const records = useMemo(() => {
    return gameDetail?.doneBonuses || [];
  }, [gameDetail]);

  const summary = gameDetail?.doneBonusesSummary;

  const staffOptions = useMemo(() => {
    const list = summary?.staffBonuses || [];
    return [
      { label: 'Tất cả nhân viên', value: 'ALL' },
      ...list.map((s) => ({
        label: `${s.staffName} (${s.doneCount} đơn - ${s.totalBonus.toLocaleString('vi-VN')}đ)`,
        value: String(s.staffId),
      })),
    ];
  }, [summary]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedStaffId !== 'ALL' && String(r.staffId) !== selectedStaffId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = String(r.orderId).includes(q);
        const matchSvc = (r.serviceName || '').toLowerCase().includes(q);
        const matchStaff = (r.staffName || '').toLowerCase().includes(q);
        if (!matchId && !matchSvc && !matchStaff) return false;
      }
      return true;
    });
  }, [records, selectedStaffId, searchQuery]);

  const filteredTotalBonus = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.bonusAmount, 0);
  }, [filteredRecords]);

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'ID',
      'Mã Đơn',
      'Nhân Viên',
      'Dịch Vụ',
      'Giá Gốc',
      'Thực Trả',
      'Điều Kiện Áp Dụng',
      'Mức Bonus',
      'Ngày Hoàn Tất',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.orderId,
      `"${r.staffName || ''}"`,
      `"${r.serviceName || ''}"`,
      r.originalPrice,
      r.actualPaid,
      `"${r.conditionApplied || ''}"`,
      r.bonusAmount,
      r.orderCompletedAt ? dayjs(r.orderCompletedAt).format('YYYY-MM-DD HH:mm:ss') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bk-done-bonuses-game-${gameDetail?.game.id || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Gift} size="md" className="text-amber-500" />
          <div>
            <Typography.Title level={5} className="!mb-0 font-bold">
              Chi Tiết Thưởng Bonus / Done – {gameDetail?.game.title || 'Game BK'}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-xs">
              Đối soát danh sách từng đơn hàng hoàn tất được tính thưởng
            </Typography.Text>
          </div>
        </div>
      }
      width={860}
      extra={
        <Button
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
        {/* Metric Summary Grid */}
        <MetricGrid
          items={[
            {
              key: 'totalDone',
              title: 'Tổng Đơn Done Được Thưởng',
              value: filteredRecords.length,
              format: 'number',
            },
            {
              key: 'totalBonus',
              title: 'Tổng Tiền Thưởng Bonus/Done',
              value: filteredTotalBonus,
              format: 'vnd',
            },
            {
              key: 'avgBonus',
              title: 'Thưởng Trung Bình / Đơn',
              value:
                filteredRecords.length > 0
                  ? Math.round(filteredTotalBonus / filteredRecords.length)
                  : 0,
              format: 'vnd',
            },
          ]}
        />

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Select
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              options={staffOptions}
              className="min-w-[220px]"
              size="small"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, dịch vụ..."
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

        {/* Table of Records */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <DataTable
            size="small"
            dataSource={filteredRecords}
            rowKey="id"
            pagination={{ pageSize: 15, showSizeChanger: true, size: 'small' }}
            locale={{
              emptyText: (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa có đơn hàng nào khớp với điều kiện lọc thưởng Bonus/Done.
                </div>
              ),
            }}
            columns={[
              {
                title: 'Mã đơn',
                dataIndex: 'orderId',
                width: 90,
                render: (val) => (
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    #{val}
                  </span>
                ),
              },
              {
                title: 'Telesales',
                dataIndex: 'staffName',
                width: 150,
                render: (name) => (
                  <div className="flex items-center gap-1.5 truncate">
                    <BkAvatar name={name || 'BK'} size={22} />
                    <span className="text-xs font-medium truncate">{name || 'Chưa rõ'}</span>
                  </div>
                ),
              },
              {
                title: 'Dịch vụ',
                dataIndex: 'serviceName',
                render: (val) => <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{val}</span>,
              },
              {
                title: 'Giá gốc',
                dataIndex: 'originalPrice',
                width: 105,
                align: 'right',
                render: (val) => (
                  <span className="text-xs text-slate-500 tabular-nums">
                    {val > 0 ? `${val.toLocaleString('vi-VN')}đ` : '-'}
                  </span>
                ),
              },
              {
                title: 'Thực trả',
                dataIndex: 'actualPaid',
                width: 110,
                align: 'right',
                render: (val) => (
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {val.toLocaleString('vi-VN')}đ
                  </span>
                ),
              },
              {
                title: 'Điều kiện áp dụng',
                dataIndex: 'conditionApplied',
                width: 180,
                render: (val) => (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block truncate max-w-[170px]" title={val}>
                    {val || 'Mặc định'}
                  </span>
                ),
              },
              {
                title: 'Mức Bonus',
                dataIndex: 'bonusAmount',
                width: 115,
                align: 'right',
                render: (val) => (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    +{val.toLocaleString('vi-VN')}đ
                  </span>
                ),
              },
              {
                title: 'Ngày hoàn tất',
                dataIndex: 'orderCompletedAt',
                width: 130,
                align: 'right',
                render: (val) => (
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {val ? dayjs(val).format('DD/MM/YY HH:mm') : '-'}
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
