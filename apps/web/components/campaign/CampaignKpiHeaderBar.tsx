'use client';

import React from 'react';
import { Button, Tag, Tooltip, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EditOutlined,
  FieldTimeOutlined,
  GiftOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CampaignPromotion, CampaignStatsResponse } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';

const { Title } = Typography;

export interface CampaignKpiHeaderBarProps {
  campaign: {
    name: string;
    slug: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  };
  stats: CampaignStatsResponse | null;
  customersCount: number;
  promotions: CampaignPromotion[];
  themeMode: string;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export const CampaignKpiHeaderBar: React.FC<CampaignKpiHeaderBarProps> = ({
  campaign,
  stats,
  customersCount,
  promotions,
  themeMode,
  isAdmin,
  onBack,
  onEdit,
}) => {
  return (
    <div
      className={`p-3 rounded-2xl mb-3 flex flex-wrap items-center justify-between gap-3 border shadow-sm transition-all ${
        themeMode === 'dark'
          ? 'bg-gradient-to-r from-[#141a29]/90 via-[#111827]/95 to-[#192238]/90 border-amber-500/20 shadow-lg shadow-black/40'
          : 'bg-gradient-to-r from-white via-amber-50/30 to-slate-50 border-amber-200/60'
      }`}
    >
      {/* Left: Navigation & Campaign Title & Status */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="text-xs font-medium opacity-80 hover:opacity-100"
        >
          Danh sách
        </Button>
        <Title level={4} style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>
          {campaign.name}
        </Title>
        <Tag color="gold" className="font-mono text-[11px] m-0">
          slug: {campaign.slug}
        </Tag>
        {campaign.status === 'ACTIVE' ? (
          <Tag color="success" className="font-bold m-0 text-[11px]">
            HOẠT ĐỘNG
          </Tag>
        ) : (
          <Tag color="default" className="m-0 text-[11px]">
            {campaign.status}
          </Tag>
        )}
      </div>

      {/* Center: Minimalist Icon + Tooltip 5 KPI Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* KPI 1: Total Customers */}
        <Tooltip title={`Tổng số: ${stats?.totalCustomers ?? customersCount} khách hàng`}>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark'
                ? 'bg-white/5 border-white/10 text-slate-200'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <UserOutlined className="text-slate-400" />
            <span className="tabular-nums">{stats?.totalCustomers ?? customersCount}</span>
            <span className="text-[10px] text-slate-400 font-normal">KH</span>
          </div>
        </Tooltip>

        {/* KPI 2: Booked Rate */}
        <Tooltip title={`Tỷ lệ đặt lịch: ${stats?.bookedRate ?? 0}% (${stats?.bookedCount ?? 0} đơn)`}>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <CheckCircleOutlined className="text-emerald-500" />
            <span className="tabular-nums">{stats?.bookedRate ?? 0}%</span>
          </div>
        </Tooltip>

        {/* KPI 3: Touchpoint Progress */}
        <Tooltip title={`Tiến độ điểm chạm: ${stats?.totalTouchpointLogs ?? 0} lượt hoàn thành`}>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark'
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}
          >
            <FieldTimeOutlined className="text-purple-400" />
            <span className="tabular-nums">{stats?.totalTouchpointLogs ?? 0}</span>
            <span className="text-[10px] text-slate-400 font-normal">lượt</span>
          </div>
        </Tooltip>

        {/* KPI 4: Calls Today */}
        <Tooltip title={`Cuộc gọi hôm nay: ${stats?.totalCallsToday ?? 0} cuộc`}>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <PhoneOutlined className="text-blue-400" />
            <span className="tabular-nums">{stats?.totalCallsToday ?? 0}</span>
          </div>
        </Tooltip>

        {/* KPI 5: Campaign Revenue */}
        <Tooltip title={`Doanh thu chiến dịch: ${formatVND(stats?.campaignRevenue ?? 0)}`}>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            <DollarOutlined style={{ color: themeMode === 'dark' ? '#D4A84B' : '#87640a' }} />
            <span className="tabular-nums">{formatVND(stats?.campaignRevenue ?? 0)}</span>
          </div>
        </Tooltip>
      </div>

      {/* Right: Date Range, Promotions & Edit Button */}
      <div className="flex items-center gap-2.5 text-xs flex-wrap">
        <Tooltip
          title={`Thời gian: ${campaign.startDate ? dayjs(campaign.startDate).format('DD/MM/YYYY') : 'Tùy chỉnh'} - ${campaign.endDate ? dayjs(campaign.endDate).format('DD/MM/YYYY') : 'Không giới hạn'}`}
        >
          <span className="tabular-nums text-slate-400 flex items-center gap-1 text-xs">
            <CalendarOutlined className="text-amber-500" />
            <span>
              {campaign.startDate ? dayjs(campaign.startDate).format('DD/MM') : ''}-
              {campaign.endDate ? dayjs(campaign.endDate).format('DD/MM/YYYY') : ''}
            </span>
          </span>
        </Tooltip>

        {promotions.length > 0 && (
          <Tooltip
            title={promotions
              .map(
                (p) =>
                  `${p.name}: ${p.type === 'PERCENT_DISCOUNT' ? `${p.value}%` : p.type === 'FIXED_FINAL_PRICE' ? `Đồng giá ${formatVND(p.value)}` : formatVND(p.value)}`
              )
              .join(', ')}
          >
            <div className="flex items-center gap-1">
              <GiftOutlined className="text-purple-400" />
              {promotions.map((p) => (
                <Tag key={p.id} color="purple" className="m-0 text-[10px] font-medium">
                  {p.name} (
                  {p.type === 'PERCENT_DISCOUNT'
                    ? `${p.value}%`
                    : p.type === 'FIXED_FINAL_PRICE'
                      ? `Đồng giá ${formatVND(p.value)}`
                      : formatVND(p.value)}
                  )
                </Tag>
              ))}
            </div>
          </Tooltip>
        )}

        {isAdmin && (
          <Tooltip title="Chỉnh sửa chiến dịch">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              style={{
                backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
              }}
              onClick={onEdit}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};
