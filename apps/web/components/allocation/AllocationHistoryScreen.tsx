'use client';

import { StandardPagination, TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Button, Tooltip, Spin, Badge } from 'antd';
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
import { AdaptiveModal } from '../ui/AdaptiveOverlay';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

export const AllocationHistoryScreen: React.FC = () => {
  const { themeMode } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isCompact = responsiveTier === 'mobile' || responsiveTier === 'tablet';
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

  // Detail Modal Pagination state with localStorage persistence
  const [detailPageSize, setDetailPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('allocation_history_detail_page_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 5;
  });
  const [detailCurrentPage, setDetailCurrentPage] = useState<number>(1);

  // Resizable Detail Modal Width state with localStorage persistence
  const [detailModalWidth, setDetailModalWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('allocation_history_detail_modal_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 1600) return parsed;
      }
    }
    return 750;
  });

  const handleDetailPageSizeChange = (current: number, size: number) => {
    setDetailPageSize(size);
    setDetailCurrentPage(current);
    if (typeof window !== 'undefined') {
      localStorage.setItem('allocation_history_detail_page_size', size.toString());
    }
  };

  const handleDetailWidthChange = (newWidth: number) => {
    const clamped = Math.min(1600, Math.max(500, newWidth));
    setDetailModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('allocation_history_detail_modal_width', clamped.toString());
    }
  };

  // Reset detail page to 1 when selected batch changes
  useEffect(() => {
    setDetailCurrentPage(1);
  }, [selectedBatch]);

  // Mouse drag handler for custom right edge resizing
  const startDetailResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = detailModalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const calculatedWidth = startWidth + deltaX * 2;
      const clamped = Math.min(1600, Math.max(500, calculatedWidth));
      setDetailModalWidth(clamped);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (typeof window !== 'undefined') {
        setDetailModalWidth((currentW) => {
          localStorage.setItem('allocation_history_detail_modal_width', currentW.toString());
          return currentW;
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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
              <span className="allocation-history-countdown tabular-nums">
                <ClockCircleOutlined aria-hidden />
                <span>{countdownText}</span>
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
        <div className="allocation-history-batch-code">
          <div className="allocation-history-code font-mono">{code}</div>
          <div className="allocation-history-meta">Tạo lúc: {new Date(record.createdAt).toLocaleString('vi-VN')}</div>
        </div>
      ),
    },
    {
      title: 'Người phân bổ',
      dataIndex: 'assignerName',
      key: 'assignerName',
      render: (name: string) => <span className="allocation-history-primary">{name}</span>,
    },
    {
      title: 'Booker nhận',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (name: string) => <span className="allocation-history-primary">{name}</span>,
    },
    {
      title: 'Số KH',
      dataIndex: 'totalCount',
      key: 'totalCount',
      align: 'center' as const,
      render: (count: number) => <span className="allocation-history-total tabular-nums">{count} KH</span>,
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
      render: (reason: string | null) => <span className="allocation-history-muted line-clamp-2">{reason || '-'}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: CustomerAllocationBatch) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          className="allocation-history-action"
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
      title: <TableIndexHeader />,
      key: 'idx',
      width: 60,
      render: (_: any, __: any, index: number) => (detailCurrentPage - 1) * detailPageSize + index + 1,
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
      <Card
        size="small"
        className="allocation-history-table-card border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <Table
          dataSource={batches}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          className="allocation-history-table tabular-nums"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="allocation-history-muted">
            Hiển thị {batches.length} / tổng số {total} đợt phân bổ
          </span>
          <StandardPagination
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
      <AdaptiveModal
        intent="data"
        title={
          <div className="flex flex-wrap items-center justify-between pr-8 gap-2">
            <div className="flex items-center gap-2">
              <span>🔍</span>
              <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
                Chi Tiết Đợt Phân Bổ {selectedBatch?.batchCode}
              </span>
            </div>

            {/* Quick Detail Modal Width Presets */}
            <div className="flex items-center gap-1.5 text-xs font-normal">
              <span className="text-slate-400 font-medium">Khung xem:</span>
              {[750, 950, 1200].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleDetailWidthChange(w)}
                  className={`px-2 py-0.5 rounded text-xs transition-all ${
                    detailModalWidth === w
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={isCompact ? undefined : detailModalWidth}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        className={`allocation-history-detail-modal ${themeMode === 'dark' ? 'dark-theme-modal' : ''}`}
      >
        <div className="relative">
          {/* Right-edge drag handle for modal width resizing */}
          {!isCompact && (
            <div
              onMouseDown={startDetailResizing}
              title="Kéo để chỉnh rộng / hẹp modal"
              className="absolute -top-4 -right-4 -bottom-4 w-4 cursor-ew-resize hover:bg-indigo-400/20 flex items-center justify-center transition-colors rounded-r group z-50"
            >
              <div className="w-1 h-10 bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>
          )}

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
                pagination={{
                  current: detailCurrentPage,
                  pageSize: detailPageSize,
                  onChange: (p, sz) => {
                    setDetailCurrentPage(p);
                    if (sz !== detailPageSize) {
                      handleDetailPageSizeChange(p, sz);
                    }
                  },
                  onShowSizeChange: (p, sz) => handleDetailPageSizeChange(p, sz),
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50', '100'],
                  showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} khách hàng`,
                }}
                size="small"
              />
            </div>
          )}
        </div>
      </AdaptiveModal>
    </div>
  );
};
