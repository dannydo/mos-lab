'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Tag, message, Spin, Card } from 'antd';
import { CustomerAllocationBatch, CustomerAllocationItem } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { DeclineReasonModal } from './DeclineReasonModal';
import { useTheme } from '../../context/ThemeContext';

interface PendingAllocationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

export const PendingAllocationModal: React.FC<PendingAllocationModalProps> = ({ open, onClose, onSuccessRefresh }) => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [batches, setBatches] = useState<CustomerAllocationBatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);

  // Live countdown state (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  const fetchPendingBatches = async () => {
    setLoading(true);
    try {
      const data = await apiClient.allocation.getPendingBatches();
      setBatches(data || []);
      setCurrentIndex(0);
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

  const columns = [
    {
      title: 'STT',
      key: 'idx',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
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
  ];

  return (
    <>
      <Modal
        title={
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
                Xác Nhận Đợt Phân Bổ Data Mới
              </span>
              {batches.length > 1 && (
                <Tag color="blue" className="ml-2">
                  Đợt {currentIndex + 1} / {batches.length}
                </Tag>
              )}
            </div>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={750}
        footer={null}
        className={themeMode === 'dark' ? 'dark-theme-modal' : ''}
      >
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

            {/* Customer List Preview Table */}
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
                pagination={{ pageSize: 5, showSizeChanger: false }}
                size="small"
              />
            </Card>

            {/* Pagination Controls if Multiple Batches */}
            {batches.length > 1 && (
              <div className="flex items-center justify-between px-2 text-sm text-slate-500">
                <Button size="small" disabled={currentIndex === 0} onClick={() => setCurrentIndex((prev) => prev - 1)}>
                  ← Đợt trước
                </Button>
                <span>
                  Đang xem đợt {currentIndex + 1} trên {batches.length} đợt chờ
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
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
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
      </Modal>

      <DeclineReasonModal
        open={showDeclineModal}
        onCancel={() => setShowDeclineModal(false)}
        onSubmit={handleDeclineSubmit}
        loading={actionLoading}
      />
    </>
  );
};
