'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Tag, Progress, Button, DatePicker, Select, Input, message, Tooltip, Spin } from 'antd';
import {
  ReloadOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { AllocationAuditStatsResponse, CustomerAllocationBatch } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';
import dayjs from 'dayjs';
import { AdaptiveModal } from '../ui/AdaptiveOverlay';

export const AllocationAuditDashboard: React.FC = () => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<AllocationAuditStatsResponse | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedBookerId, setSelectedBookerId] = useState<number | undefined>(undefined);

  // Recall Batch Modal state
  const [recallModalOpen, setRecallModalOpen] = useState<boolean>(false);
  const [recallBatchIdInput, setRecallBatchIdInput] = useState<string>('');
  const [recallReason, setRecallReason] = useState<string>('');
  const [recallLoading, setRecallLoading] = useState<boolean>(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange[0] ? dateRange[0].format('YYYY-MM-DD 00:00:00') : undefined;
      const dateTo = dateRange[1] ? dateRange[1].format('YYYY-MM-DD 23:59:59') : undefined;

      const res = await apiClient.allocation.getAuditStats({
        dateFrom,
        dateTo,
        bookerId: selectedBookerId,
      });
      setStats(res);
    } catch (err: any) {
      console.error('Failed to fetch allocation audit stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedBookerId]);

  const handleRecallSubmit = async () => {
    const batchId = parseInt(recallBatchIdInput, 10);
    if (isNaN(batchId)) {
      message.error('Vui lòng nhập ID đợt phân bổ hợp lệ');
      return;
    }
    if (!recallReason.trim()) {
      message.error('Vui lòng nhập lý do thu hồi đợt phân bổ');
      return;
    }

    setRecallLoading(true);
    try {
      const res = await apiClient.allocation.recallBatch(batchId, {
        reason: recallReason.trim(),
      });
      message.success(res.message || 'Thu hồi đợt phân bổ thành công!');
      setRecallModalOpen(false);
      setRecallBatchIdInput('');
      setRecallReason('');
      fetchStats();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi thu hồi đợt phân bổ');
    } finally {
      setRecallLoading(false);
    }
  };

  const bookerColumns = [
    {
      title: 'Tên Booker',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (name: string, record: any) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <UserOutlined className="text-indigo-500" />
            <span>{name}</span>
          </div>
          {record.username && <div className="text-xs text-slate-400">@{record.username}</div>}
        </div>
      ),
    },
    {
      title: 'Tổng đợt / KH',
      key: 'totals',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <span className="font-semibold text-sm tabular-nums">
          {record.totalBatches} đợt ({record.totalCustomers} KH)
        </span>
      ),
    },
    {
      title: 'Đã chấp nhận',
      dataIndex: 'acceptedCount',
      key: 'acceptedCount',
      align: 'center' as const,
      render: (val: number, record: any) => (
        <div className="text-center">
          <Tag color="emerald" className="font-bold">
            {val} đợt
          </Tag>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {record.acceptanceRate}%
          </div>
        </div>
      ),
    },
    {
      title: 'Đã từ chối',
      dataIndex: 'declinedCount',
      key: 'declinedCount',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="volcano" className="font-bold">
          {val} đợt
        </Tag>
      ),
    },
    {
      title: 'Trôi 24h (Hết hạn)',
      dataIndex: 'expiredCount',
      key: 'expiredCount',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="purple" className="font-bold">
          {val} đợt
        </Tag>
      ),
    },
    {
      title: 'Đang chờ 24h',
      dataIndex: 'pendingCount',
      key: 'pendingCount',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="gold" className="font-bold">
          {val} đợt
        </Tag>
      ),
    },
    {
      title: 'Thời gian phản hồi TB',
      dataIndex: 'avgResponseMinutes',
      key: 'avgResponseMinutes',
      align: 'center' as const,
      render: (mins: number) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
          ⏱️ {mins} phút
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <Card size="small" className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Dashboard Audit Phân Bổ Data Khách Hàng
              </h2>
              <p className="text-xs text-slate-500">
                Giám sát tỷ lệ chấp nhận 24h, từ chối, trôi data và lý do theo Booker
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
              format="DD/MM/YYYY"
              allowClear
            />

            <Button danger icon={<UndoOutlined />} onClick={() => setRecallModalOpen(true)}>
              Thu hồi Batch (Recall)
            </Button>

            <Button icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>
              Cập nhật
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Overview Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            className="border border-slate-200 dark:border-slate-800 shadow-sm bg-indigo-50/50 dark:bg-slate-800"
          >
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
              ∑ Phân Bổ (Batch & KH)
            </div>
            <div className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-2 tabular-nums">
              {stats?.summary.totalBatches || 0} <span className="text-sm font-normal text-slate-500">đợt</span>
            </div>
            <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
              Chứa tổng cộng {stats?.summary.totalCustomers || 0} khách hàng
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            className="border border-slate-200 dark:border-slate-800 shadow-sm bg-emerald-50/50 dark:bg-slate-800"
          >
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center justify-between">
              <span>Tỷ Lệ Chấp Nhận</span>
              <CheckCircleOutlined className="text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-2 tabular-nums">
              {stats?.summary.acceptedRate || 0}%
            </div>
            <Progress
              percent={stats?.summary.acceptedRate || 0}
              strokeColor="#10B981"
              showInfo={false}
              size="small"
              className="mt-2"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            className="border border-slate-200 dark:border-slate-800 shadow-sm bg-rose-50/50 dark:bg-slate-800"
          >
            <div className="text-xs font-medium text-rose-700 dark:text-rose-300 uppercase tracking-wide flex items-center justify-between">
              <span>Tỷ Lệ Từ Chối</span>
              <CloseCircleOutlined className="text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-900 dark:text-rose-100 mt-2 tabular-nums">
              {stats?.summary.declinedRate || 0}%
            </div>
            <Progress
              percent={stats?.summary.declinedRate || 0}
              strokeColor="#F43F5E"
              showInfo={false}
              size="small"
              className="mt-2"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            className="border border-slate-200 dark:border-slate-800 shadow-sm bg-purple-50/50 dark:bg-slate-800"
          >
            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center justify-between">
              <span>Trôi Data / Hết Hạn 24h</span>
              <ExclamationCircleOutlined className="text-purple-500" />
            </div>
            <div className="text-2xl font-extrabold text-purple-900 dark:text-purple-100 mt-2 tabular-nums">
              {stats?.summary.expiredRate || 0}%
            </div>
            <Progress
              percent={stats?.summary.expiredRate || 0}
              strokeColor="#A855F7"
              showInfo={false}
              size="small"
              className="mt-2"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Breakdown Section */}
      <Row gutter={[16, 16]}>
        {/* Per-Booker Performance Table */}
        <Col xs={24} lg={16}>
          <Card
            size="small"
            title={
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Bảng Theo Dõi Hiệu Suất Xác Nhận Theo Booker
              </span>
            }
            className="border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <Table
              dataSource={stats?.bookerBreakdown || []}
              columns={bookerColumns}
              rowKey="bookerId"
              loading={loading}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* Decline Reason Breakdown */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            title={<span className="font-bold text-slate-800 dark:text-slate-100">Phân Phối Lý Do Từ Chối Data</span>}
            className="border border-slate-200 dark:border-slate-800 shadow-sm h-full"
          >
            {loading ? (
              <div className="py-12 text-center">
                <Spin tip="Đang phân tích..." />
              </div>
            ) : !stats?.declineReasonBreakdown || stats.declineReasonBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Không có dữ liệu từ chối trong kỳ được chọn.
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {stats.declineReasonBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {item.count} lượt ({item.percentage}%)
                      </span>
                    </div>
                    <Progress
                      percent={item.percentage}
                      strokeColor={idx % 2 === 0 ? '#F43F5E' : '#D97706'}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recall Batch Action Modal */}
      <AdaptiveModal
        intent="confirm"
        title={
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
            <span>⚠️</span>
            <span>Thu Hồi Đợt Phân Bổ (Recall Batch)</span>
          </div>
        }
        open={recallModalOpen}
        onCancel={() => setRecallModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRecallModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" danger loading={recallLoading} onClick={handleRecallSubmit}>
            Xác nhận Thu hồi
          </Button>,
        ]}
        className={`allocation-recall-modal ${themeMode === 'dark' ? 'dark-theme-modal' : ''}`}
      >
        <div className="space-y-4 py-2 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            Quản lý có quyền thu hồi khẩn cấp đợt phân bổ data ở trạng thái <strong>Chờ xác nhận (24h)</strong> hoặc{' '}
            <strong>Đã chấp nhận</strong>. Data thu hồi sẽ được thu lại về pool chung ngay lập tức.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ID Đợt Phân Bổ (Batch ID) <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Nhập ID số đợt phân bổ (ví dụ: 1, 2, 15...)"
              value={recallBatchIdInput}
              onChange={(e) => setRecallBatchIdInput(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do thu hồi đợt phân bổ <span className="text-rose-500">*</span>
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Nhập diễn giải lý do quản lý thu hồi data..."
              value={recallReason}
              onChange={(e) => setRecallReason(e.target.value)}
            />
          </div>
        </div>
      </AdaptiveModal>
    </div>
  );
};
