'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Button, Modal, Tooltip, Pagination, Spin, Badge } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { CustomerAllocationBatch, CustomerAllocationItem, AllocationBatchStatus } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

export const AllocationHistoryScreen: React.FC = () => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [batches, setBatches] = useState<CustomerAllocationBatch[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Batch Detail Modal State
  const [selectedBatch, setSelectedBatch] = useState<CustomerAllocationBatch | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.allocation.get30DayHistory({
        page,
        limit,
        status: statusFilter as AllocationBatchStatus | 'ALL',
        search: search.trim() || undefined,
      });
      setBatches(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch allocation history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, limit, statusFilter]);

  const handleSearchSubmit = () => {
    setPage(1);
    fetchHistory();
  };

  const calculateRetentionCountdown = (retentionExpiresAt?: string | null) => {
    if (!retentionExpiresAt) return null;
    const target = new Date(retentionExpiresAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    if (diff === 0) return 'Đã hết hạn';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    return `Còn ${days}d ${hours}h lưu giữ`;
  };

  const renderStatusTag = (record: CustomerAllocationBatch) => {
    switch (record.status) {
      case 'PENDING_ACCEPT':
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />}>
            Chờ xác nhận 24h
          </Tag>
        );
      case 'ACCEPTED': {
        const countdownText = calculateRetentionCountdown(record.retentionExpiresAt);
        return (
          <div className="flex flex-col gap-1 items-start">
            <Tag color="emerald" icon={<CheckCircleOutlined />}>
              Đã chấp nhận
            </Tag>
            {countdownText && (
              <span
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums"
                style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
              >
                ⏱️ {countdownText}
              </span>
            )}
          </div>
        );
      }
      case 'DECLINED':
        return (
          <Tooltip title={record.declineReason || 'Lý do chưa cập nhật'}>
            <Tag color="volcano" icon={<CloseCircleOutlined />}>
              Đã từ chối
            </Tag>
          </Tooltip>
        );
      case 'EXPIRED':
        return (
          <Tag color="purple" icon={<ExclamationCircleOutlined />}>
            Hết hạn phân bổ
          </Tag>
        );
      case 'RECALLED':
        return (
          <Tooltip title={record.declineReason || 'Đã thu hồi bởi Quản lý'}>
            <Tag color="default" icon={<ReloadOutlined />}>
              Đã thu hồi
            </Tag>
          </Tooltip>
        );
      default:
        return <Tag>{record.status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã đợt phân bổ',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (code: string, record: CustomerAllocationBatch) => (
        <div>
          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</div>
          <div className="text-xs text-slate-400">Tạo lúc: {new Date(record.createdAt).toLocaleString('vi-VN')}</div>
        </div>
      ),
    },
    {
      title: 'Người phân bổ',
      dataIndex: 'assignerName',
      key: 'assignerName',
      render: (name: string) => <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>,
    },
    {
      title: 'Booker nhận',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (name: string) => <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>,
    },
    {
      title: 'Số KH',
      dataIndex: 'totalCount',
      key: 'totalCount',
      align: 'center' as const,
      render: (count: number) => (
        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tabular-nums">{count} KH</span>
      ),
    },
    {
      title: 'Trạng thái & Countdown 30 ngày',
      key: 'status',
      render: (_: any, record: CustomerAllocationBatch) => renderStatusTag(record),
    },
    {
      title: 'Lý do / Phản hồi',
      dataIndex: 'declineReason',
      key: 'declineReason',
      render: (reason: string | null) => <span className="text-xs text-slate-500 line-clamp-2">{reason || '-'}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: CustomerAllocationBatch) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedBatch(record);
            setDetailModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const detailColumns = [
    {
      title: 'STT',
      key: 'idx',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'ID Khách hàng',
      dataIndex: 'customerId',
      key: 'customerId',
      render: (id: number) => <span className="font-mono text-sm">#{id}</span>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => <span className="font-medium">{name || '-'}</span>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (phone: string) => <span className="font-mono">{phone || '-'}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => <Tag>{st}</Tag>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header & Filter Card */}
      <Card size="small" className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>📅</span>
              <span>Lịch Sử Phân Bổ Data (30 Ngày)</span>
            </h2>
            <Badge count={total} overflowCount={999} showZero color="blue" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              style={{ width: 170 }}
              options={[
                { label: 'Tất cả trạng thái', value: 'ALL' },
                { label: 'Chờ xác nhận (24h)', value: 'PENDING_ACCEPT' },
                { label: 'Đã chấp nhận', value: 'ACCEPTED' },
                { label: 'Đã từ chối', value: 'DECLINED' },
                { label: 'Hết hạn', value: 'EXPIRED' },
                { label: 'Đã thu hồi', value: 'RECALLED' },
              ]}
            />

            <Input
              placeholder="Tìm theo mã đợt, tên Booker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearchSubmit}
              style={{ width: 220 }}
              prefix={<SearchOutlined className="text-slate-400" />}
              allowClear
            />

            <Button icon={<ReloadOutlined />} onClick={fetchHistory} loading={loading}>
              Làm mới
            </Button>
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card size="small" className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <Table dataSource={batches} columns={columns} rowKey="id" loading={loading} pagination={false} size="middle" />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hiển thị {batches.length} / tổng số {total} đợt phân bổ
          </span>
          <Pagination
            current={page}
            pageSize={limit}
            total={total}
            onChange={(p, sz) => {
              setPage(p);
              setLimit(sz);
            }}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      </Card>

      {/* Batch Customer Detail Preview Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>Chi Tiết Đợt Phân Bổ {selectedBatch?.batchCode}</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        className={themeMode === 'dark' ? 'dark-theme-modal' : ''}
      >
        {selectedBatch && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
              <div>
                <span className="text-slate-500">Người phân bổ:</span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedBatch.assignerName}</span>
              </div>
              <div>
                <span className="text-slate-500">Booker nhận:</span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedBatch.bookerName}</span>
              </div>
              <div>
                <span className="text-slate-500">Thời gian tạo:</span>{' '}
                <span>{new Date(selectedBatch.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <div>
                <span className="text-slate-500">Tổng số KH:</span>{' '}
                <span className="font-bold">{selectedBatch.totalCount} KH</span>
              </div>
              {selectedBatch.declineReason && (
                <div className="col-span-2 text-rose-600 dark:text-rose-400 font-medium">
                  Lý do / Phản hồi: {selectedBatch.declineReason}
                </div>
              )}
            </div>

            <Table
              dataSource={selectedBatch.items || []}
              columns={detailColumns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
