'use client';

import { TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Tag, message, Spin, Card } from 'antd';
import { CustomerAllocationBatch, CustomerAllocationItem } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { DeclineReasonModal } from './DeclineReasonModal';
import { useTheme } from '../../context/ThemeContext';
import { AdaptiveModal } from '../ui/AdaptiveOverlay';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

interface PendingAllocationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

export const PendingAllocationModal: React.FC<PendingAllocationModalProps> = ({ open, onClose, onSuccessRefresh }) => {
  const { themeMode } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isCompact = responsiveTier === 'mobile' || responsiveTier === 'tablet';
  const [loading, setLoading] = useState<boolean>(false);
  const [batches, setBatches] = useState<CustomerAllocationBatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);

  // Pagination state with localStorage persistence
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('allocation_pending_modal_page_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 5;
  });
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Resizable Modal Width state with localStorage persistence
  const [modalWidth, setModalWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('allocation_pending_modal_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 1600) return parsed;
      }
    }
    return 750;
  });

  const handlePageSizeChange = (current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(current);
    if (typeof window !== 'undefined') {
      localStorage.setItem('allocation_pending_modal_page_size', size.toString());
    }
  };

  const handleWidthChange = (newWidth: number) => {
    const clamped = Math.min(1600, Math.max(500, newWidth));
    setModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('allocation_pending_modal_width', clamped.toString());
    }
  };

  // Mouse drag handler for custom right edge resizing
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = modalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const calculatedWidth = startWidth + deltaX * 2;
      const clamped = Math.min(1600, Math.max(500, calculatedWidth));
      setModalWidth(clamped);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (typeof window !== 'undefined') {
        setModalWidth((currentW) => {
          localStorage.setItem('allocation_pending_modal_width', currentW.toString());
          return currentW;
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Live countdown state (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  const fetchPendingBatches = async () => {
    setLoading(true);
    try {
      const data = await apiClient.allocation.getPendingBatches();
      setBatches(data || []);
      setCurrentIndex(0);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to fetch pending allocation batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPendingBatches();
    }
  }, [open]);

  const currentBatch = batches[currentIndex];

  // Reset page to 1 when batch changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentIndex]);

  // 24h Countdown timer ticker
  useEffect(() => {
    if (!currentBatch || !currentBatch.expiresAt) {
      setSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const targetTime = new Date(currentBatch.expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [currentBatch]);

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAccept = async () => {
    if (!currentBatch) return;
    setActionLoading(true);
    try {
      const res = await apiClient.allocation.acceptBatch(currentBatch.id);
      message.success(res.message || `Đã chấp nhận thành công ${currentBatch.totalCount} khách hàng!`);

      // Refresh pending batches list
      const updated = batches.filter((b) => b.id !== currentBatch.id);
      setBatches(updated);
      if (updated.length === 0) {
        onClose();
      } else {
        setCurrentIndex(Math.min(currentIndex, updated.length - 1));
      }

      if (onSuccessRefresh) onSuccessRefresh();
    } catch (err: any) {
      message.error(err.message || 'Chấp nhận phân bổ thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async (reasonCategory: string, reasonNote?: string) => {
    if (!currentBatch) return;
    setActionLoading(true);
    try {
      const res = await apiClient.allocation.declineBatch(currentBatch.id, {
        reasonCategory,
        reasonNote,
      });
      message.info(res.message || 'Đã từ chối đợt phân bổ');
      setShowDeclineModal(false);

      const updated = batches.filter((b) => b.id !== currentBatch.id);
      setBatches(updated);
      if (updated.length === 0) {
        onClose();
      } else {
        setCurrentIndex(Math.min(currentIndex, updated.length - 1));
      }

      if (onSuccessRefresh) onSuccessRefresh();
    } catch (err: any) {
      message.error(err.message || 'Từ chối phân bổ thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  // The countdown updates once per second. Stable columns keep the preview
  // table from rebuilding its cells for a state change that does not affect rows.
  const columns = useMemo(
    () => [
      {
        title: <TableIndexHeader />,
        key: 'idx',
        width: 60,
        render: (_: unknown, __: unknown, index: number) => (currentPage - 1) * pageSize + index + 1,
      },
      {
        title: 'Họ và tên khách hàng',
        dataIndex: 'customerName',
        key: 'customerName',
        render: (text: string, record: CustomerAllocationItem) => (
          <div>
            <div className="font-medium text-slate-800 dark:text-slate-100">
              {text || `Khách hàng #${record.customerId}`}
            </div>
            <div className="text-xs text-slate-400">ID: {record.customerId}</div>
          </div>
        ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'customerPhone',
        key: 'customerPhone',
        render: (phone: string) => (
          <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{phone || 'Chưa cập nhật'}</span>
        ),
      },
      {
        title: 'Trạng thái đợt',
        dataIndex: 'status',
        key: 'status',
        render: () => <Tag color="gold">Chờ xác nhận</Tag>,
      },
    ],
    [currentPage, pageSize]
  );

  return (
    <>
      <AdaptiveModal
        intent="data"
        title={
          <div className="flex flex-wrap items-center justify-between pr-8 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
                Xác Nhận Đợt Phân Bổ Data Mới
              </span>
              {batches.length > 1 && (
                <Tag color="blue" className="ml-1">
                  Đợt {currentIndex + 1} / {batches.length}
                </Tag>
              )}
            </div>

            {/* Quick Modal Width Presets */}
            <div className="allocation-size-presets flex items-center gap-1.5 text-xs font-normal">
              <span className="text-slate-400 font-medium">Khung xem:</span>
              {[750, 950, 1200].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleWidthChange(w)}
                  className={`px-2 py-0.5 rounded text-xs transition-all ${
                    modalWidth === w
                      ? 'bg-amber-500 text-white font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={isCompact ? undefined : modalWidth}
        footer={null}
        className={`allocation-pending-modal ${themeMode === 'dark' ? 'dark-theme-modal' : ''}`}
      >
        <div className="relative">
          {/* Right-edge drag handle for modal width resizing */}
          {!isCompact && (
            <div
              onMouseDown={startResizing}
              title="Kéo để chỉnh rộng / hẹp modal"
              className="absolute -top-4 -right-4 -bottom-4 w-4 cursor-ew-resize hover:bg-amber-400/20 flex items-center justify-center transition-colors rounded-r group z-50"
            >
              <div className="w-1 h-10 bg-slate-300 dark:bg-slate-600 group-hover:bg-amber-500 rounded-full transition-colors" />
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <Spin size="large" tip="Đang tải đợt phân bổ data..." />
            </div>
          ) : !currentBatch ? (
            <div className="py-8 text-center text-slate-500">Không có đợt phân bổ data nào đang chờ xác nhận.</div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Header info bar with Tabular Nums 24h Countdown */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border border-amber-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    Người phân bổ: <span className="font-bold">{currentBatch.assignerName}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                    Mã đợt:{' '}
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{currentBatch.batchCode}</span> (
                    {currentBatch.totalCount} Khách hàng)
                  </div>
                </div>

                {/* 24h Live Countdown Tag */}
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Thời gian phản hồi còn lại:</div>
                  <div
                    className={`text-xl font-extrabold font-mono tracking-tight tabular-nums ${
                      secondsRemaining < 7200
                        ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                    style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                  >
                    ⏳ {formatCountdown(secondsRemaining)}
                  </div>
                </div>
              </div>

              {/* Customer List Preview Table with Standard Controlled & Persistent Pagination */}
              <Card
                size="small"
                title={
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Danh sách xem trước ({currentBatch.items?.length || 0} KH)
                  </span>
                }
                className="border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <Table
                  dataSource={currentBatch.items || []}
                  columns={columns}
                  rowKey="id"
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      if (size !== pageSize) {
                        handlePageSizeChange(page, size);
                      }
                    },
                    onShowSizeChange: (current, size) => handlePageSizeChange(current, size),
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50', '100'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} khách hàng`,
                  }}
                  size="small"
                />
              </Card>

              {/* Pagination Controls if Multiple Batches */}
              {batches.length > 1 && (
                <div className="flex items-center justify-between px-2 text-sm text-slate-500">
                  <Button
                    size="small"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                  >
                    ← Đợt trước
                  </Button>
                  <span>
                    Đang xem đợt {currentIndex + 1} trên {batches.length} đợt chờ
                  </span>
                  <Button
                    size="small"
                    disabled={currentIndex === batches.length - 1}
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                  >
                    Đợt sau →
                  </Button>
                </div>
              )}

              {/* Action Bar */}
              <div className="allocation-pending-actions pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button danger size="large" loading={actionLoading} onClick={() => setShowDeclineModal(true)}>
                  Từ chối toàn bộ
                </Button>
                <Button
                  type="primary"
                  size="large"
                  loading={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 border-none"
                  onClick={handleAccept}
                >
                  Chấp nhận toàn bộ (+{currentBatch.totalCount} KH)
                </Button>
              </div>
            </div>
          )}
        </div>
      </AdaptiveModal>

      <DeclineReasonModal
        open={showDeclineModal}
        onCancel={() => setShowDeclineModal(false)}
        onSubmit={handleDeclineSubmit}
        loading={actionLoading}
      />
    </>
  );
};
