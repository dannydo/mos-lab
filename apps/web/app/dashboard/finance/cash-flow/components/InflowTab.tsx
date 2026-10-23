'use client';

import React from 'react';
import { Button, Card, Col, Popconfirm, Row, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TrendingUp,
  Plus,
  GraduationCap,
  Briefcase,
  Wallet,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { DataTable, SectionCard, AppIcon } from '../../../../../components/ui';
import type { CashFlowEntry, CashFlowInflowBreakdown, CashFlowStatus } from '@mos-lab/shared';

interface InflowTabProps {
  inflowItems: CashFlowEntry[];
  entriesLoading: boolean;
  inflowBreakdown?: CashFlowInflowBreakdown;
  onUpdateStatus: (id: number, status: CashFlowStatus) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  onOpenIncomeModal: (presetCategory?: string) => void;
  categoryNames: Record<string, string>;
  statusMeta: Record<CashFlowStatus, { label: string; badgeClass: string }>;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');

export function InflowTab({
  inflowItems,
  entriesLoading,
  inflowBreakdown,
  onUpdateStatus,
  onDeleteEntry,
  onOpenIncomeModal,
  categoryNames,
  statusMeta,
}: InflowTabProps) {
  const breakdown: CashFlowInflowBreakdown = inflowBreakdown || {
    wingsLashesAchieved: 0,
    wingsLashesProjectedAdditional: 0,
    wingsLashesTotalProjected: 0,
    academyExpectedInflow: 0,
    otherProjectsExpectedInflow: 0,
    totalExpectedInflow: 0,
  };

  const columns: ColumnsType<CashFlowEntry> = [
    {
      title: 'Khoản thu & Dự án',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div className="flex items-center gap-2">
            {record.projectName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {record.projectName}
              </span>
            )}
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">{title}</span>
          </div>
          {record.description && <div className="text-xs text-neutral-400 mt-0.5">{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Nguồn thu',
      dataIndex: 'category',
      key: 'category',
      width: 170,
      render: (cat: string) => {
        const isAcademy = cat === 'REVENUE_ACADEMY';
        const isOther = cat === 'REVENUE_OTHER';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAcademy
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : isOther
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}
          >
            {categoryNames[cat] || cat}
          </span>
        );
      },
    },
    {
      title: 'Số tiền dự kiến',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 160,
      align: 'right',
      render: (val: number) => (
        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
          +{val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Ngày dự kiến',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 130,
      render: (date: string) => <span className="tabular-nums text-xs text-neutral-600 dark:text-neutral-300">{date}</span>,
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'storeId',
      key: 'storeId',
      width: 150,
      render: (storeId: number | null) => {
        if (storeId === 6) return <span className="text-xs">Đề Thám</span>;
        if (storeId === 16) return <span className="text-xs">Estella Place</span>;
        return <span className="text-xs text-neutral-400">Toàn hệ thống</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: CashFlowStatus) => {
        const item = statusMeta[s] || { label: s, badgeClass: 'bg-neutral-100 text-neutral-600' };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.badgeClass}`}>
            {item.label}
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'COLLECTED' && (
            <Button
              size="small"
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-500 border-none text-xs"
              onClick={() => onUpdateStatus(record.id, 'COLLECTED')}
            >
              Đã thu
            </Button>
          )}
          <Popconfirm
            title="Xác nhận hủy khoản thu này?"
            onConfirm={() => onDeleteEntry(record.id)}
            okText="Hủy"
            cancelText="Đóng"
          >
            <Button size="small" danger type="text" className="text-xs">
              ✕
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Nhóm Thẻ Số Liệu Dòng Tiền Thu Tinh Gọn (Data Metric Cards) */}
      <Row gutter={[16, 16]}>
        {/* Thẻ 1: Wings Lashes */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <AppIcon icon={Sparkles} size="sm" className="text-amber-500" />
                Wings Lashes
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Live MOS
              </span>
            </div>

            <div className="space-y-2 mt-2">
              <div>
                <div className="text-xs text-neutral-400">Doanh thu đã đạt:</div>
                <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">
                  {fmt(breakdown.wingsLashesAchieved)}đ
                </div>
              </div>

              <div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Dự kiến phát sinh thêm:
                </div>
                <div className="text-base font-bold text-emerald-500 tabular-nums">
                  +{fmt(breakdown.wingsLashesProjectedAdditional)}đ
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                <span className="text-neutral-400">Tổng dự kiến cuối kỳ:</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-200 tabular-nums">
                  {fmt(breakdown.wingsLashesTotalProjected)}đ
                </span>
              </div>
            </div>
          </Card>
        </Col>

        {/* Thẻ 2: Wings Academy */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <AppIcon icon={GraduationCap} size="sm" className="text-blue-500" />
                Wings Academy
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                Nhập thủ công
              </span>
            </div>

            <div className="space-y-3 mt-2">
              <div>
                <div className="text-xs text-neutral-400">Khoản thu dự kiến:</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  +{fmt(breakdown.academyExpectedInflow)}đ
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="small"
                  type="dashed"
                  icon={<Plus size={13} />}
                  className="w-full text-xs text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-800"
                  onClick={() => onOpenIncomeModal('REVENUE_ACADEMY')}
                >
                  Nhập dự kiến Academy
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* Thẻ 3: Dự án khác */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <AppIcon icon={Briefcase} size="sm" className="text-amber-500" />
                Dự án khác
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Nhập thủ công
              </span>
            </div>

            <div className="space-y-3 mt-2">
              <div>
                <div className="text-xs text-neutral-400">Khoản thu dự kiến:</div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  +{fmt(breakdown.otherProjectsExpectedInflow)}đ
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="small"
                  type="dashed"
                  icon={<Plus size={13} />}
                  className="w-full text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800"
                  onClick={() => onOpenIncomeModal('REVENUE_OTHER')}
                >
                  Nhập dự kiến Dự án
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* Thẻ 4: Tổng dự kiến Thu */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <AppIcon icon={Wallet} size="sm" className="text-emerald-600" />
                Tổng dự kiến Thu
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white leading-none">
                FORECAST
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{fmt(breakdown.totalExpectedInflow)}đ
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 leading-snug">
                = Dự kiến thêm Lashes + Academy + Dự án khác
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-1 leading-snug">
                * Chỉ tính phần dự kiến phát sinh từ hiện tại đến cuối kỳ, không cộng doanh thu đã đạt.
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2. Bảng Danh sách Khoản thu Dự kiến Thủ công (Wings Academy & Dự án khác) */}
      <SectionCard
        title="Kế hoạch Thu Thủ Công (Wings Academy & Dự án khác)"
        extra={
          <Button
            type="primary"
            icon={<Plus size={14} />}
            className="bg-emerald-600 hover:bg-emerald-500 border-none"
            onClick={() => onOpenIncomeModal()}
          >
            Thêm khoản thu dự kiến
          </Button>
        }
      >
        <DataTable
          columns={columns}
          dataSource={inflowItems}
          rowKey="id"
          loading={entriesLoading}
          pagination={{ pageSize: 15 }}
        />
      </SectionCard>
    </div>
  );
}
