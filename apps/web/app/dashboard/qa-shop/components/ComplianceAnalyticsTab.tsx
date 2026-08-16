'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Progress, Tag, Table, Space, Button, Spin, Divider } from 'antd';
import {
  TrophyOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ShopOutlined,
  ReloadOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { QaComplianceStats } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

interface ComplianceAnalyticsTabProps {
  themeMode: string;
}

export const ComplianceAnalyticsTab: React.FC<ComplianceAnalyticsTabProps> = ({ themeMode }) => {
  const [stats, setStats] = useState<QaComplianceStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.qaShop.getAnalytics();
      setStats(res);
    } catch (err) {
      console.error('Fetch QA analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !stats) {
    return (
      <Card className="text-center py-12">
        <Spin size="large" tip="Đang tải dữ liệu báo cáo tuân thủ..." />
      </Card>
    );
  }

  const resolvedRate =
    stats.totalFailedItems > 0 ? Math.round((stats.resolvedTicketsCount / stats.totalFailedItems) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Tỷ lệ Tuân thủ Trung bình */}
        <div
          className={`p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 shadow-none ${
            themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Tỷ lệ Tuân thủ Trung bình
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight mt-0.5">
                {stats.averageComplianceRate}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
              <RiseOutlined className="text-base" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-0">
            Tính trên tất cả các ca đi audit chi nhánh
          </p>
        </div>

        {/* Stat 2: Số Phiếu Audit Đã Thực Hiện */}
        <div
          className={`p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 shadow-none ${
            themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Số Phiếu Audit Đã Thực Hiện
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums tracking-tight mt-0.5">
                {stats.totalAudits}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center shrink-0">
              <BarChartOutlined className="text-base" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-0">Ghi nhận đầy đủ lịch sử kiểm tra</p>
        </div>

        {/* Stat 3: Sự Cố Đã Phát Hiện (Fail) */}
        <div
          className={`p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 shadow-none ${
            themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Sự Cố Đã Phát Hiện (Fail)
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums tracking-tight mt-0.5">
                {stats.totalFailedItems}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50 flex items-center justify-center shrink-0">
              <WarningOutlined className="text-base" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-0">{stats.openTicketsCount} chưa xong</p>
        </div>

        {/* Stat 4: Tỷ lệ Khắc phục Sự cố */}
        <div
          className={`p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 shadow-none ${
            themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Tỷ lệ Khắc phục Sự cố
              </span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums tracking-tight mt-0.5">
                {resolvedRate}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center shrink-0">
              <CheckCircleOutlined className="text-base" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-0">
            {stats.resolvedTicketsCount} đã nghiệm thu
          </p>
        </div>
      </div>

      {/* COMPARISON & SECTION BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BRANCH COMPARISON */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <ShopOutlined className="text-blue-500" />
              <span className="font-bold text-sm">So Sánh Điểm Tuân Thủ Chi Nhánh (DT vs EP)</span>
            </div>
          }
          className={`shadow-sm border ${
            themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            {stats.branchComparison.map((b) => (
              <div
                key={b.branchCode}
                className="space-y-1.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold flex items-center gap-2">
                    <Tag color={b.branchCode === 'DT' ? 'blue' : 'purple'}>{b.branchCode}</Tag>
                    <span>{b.branchName}</span>
                  </div>
                  <div className="tabular-nums font-black text-sm text-emerald-600">{b.avgScore}%</div>
                </div>
                <Progress
                  percent={b.avgScore}
                  strokeColor={b.branchCode === 'DT' ? '#3b82f6' : '#a855f7'}
                  showInfo={false}
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{b.auditCount} lượt audit</span>
                  <span className="text-rose-500">{b.failedCount} lỗi phát hiện</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SECTION BREAKDOWN */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <BarChartOutlined className="text-emerald-500" />
              <span className="font-bold text-sm">Tỷ Lệ Đạt Theo Phân Khu (Section Compliance)</span>
            </div>
          }
          className={`shadow-sm border ${
            themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            {stats.sectionBreakdown.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{sec.sectionTitle}</span>
                  <span className="tabular-nums font-bold text-xs">{sec.passRate}%</span>
                </div>
                <Progress
                  percent={sec.passRate}
                  strokeColor={sec.passRate >= 95 ? '#10b981' : sec.passRate >= 90 ? '#3b82f6' : '#f59e0b'}
                  size="small"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* SHOP RANKING LEADERBOARD */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500" />
            <span className="font-bold text-sm">Bảng Xếp Hạng Chất Lượng Shop (QA Leaderboard)</span>
          </div>
        }
        className={`shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <Table
          dataSource={stats.branchComparison}
          rowKey="branchCode"
          pagination={false}
          columns={[
            {
              title: 'Hạng',
              key: 'rank',
              render: (_: any, __: any, index: number) => (
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                  #{index + 1}
                </div>
              ),
            },
            {
              title: 'Chi Nhánh',
              dataIndex: 'branchName',
              key: 'branchName',
              render: (name: string, record: any) => (
                <div>
                  <Tag color={record.branchCode === 'DT' ? 'blue' : 'purple'}>{record.branchCode}</Tag>
                  <span className="font-bold text-xs">{name}</span>
                </div>
              ),
            },
            {
              title: 'Số Lần Audit',
              dataIndex: 'auditCount',
              key: 'auditCount',
              render: (cnt: number) => <span className="tabular-nums text-xs">{cnt} ca</span>,
            },
            {
              title: 'Sự Cố Vi Phạm',
              dataIndex: 'failedCount',
              key: 'failedCount',
              render: (cnt: number) => <Tag color={cnt === 0 ? 'success' : 'error'}>{cnt} lỗi</Tag>,
            },
            {
              title: 'Điểm Tuân Thủ',
              dataIndex: 'avgScore',
              key: 'avgScore',
              render: (score: number) => (
                <span className="tabular-nums font-black text-emerald-600 text-base">{score}%</span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
