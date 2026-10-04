'use client';

import React from 'react';
import { Button, Card, Tag, Tooltip, Row, Col, Select, Alert, Popconfirm, theme } from 'antd';
import {
  TeamOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ForwardOutlined,
  PlusOutlined,
  AlertOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FireOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { SharedPoolOverviewStats } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { SharedPoolStaffPerformanceCard } from './SharedPoolStaffPerformanceCard';

interface SharedPoolOverviewBannerProps {
  overview: SharedPoolOverviewStats | null;
  loading: boolean;
  isAdmin: boolean;
  onAdvanceBatch: () => Promise<void>;
  onTogglePause: (isPaused: boolean) => Promise<void>;
  onAddCustomers: () => void;
  onOpenHistoryRecovery?: () => void;
  onOpenExcludedDrawer?: () => void;
  selectedBatch: number | 'ALL';
  onSelectBatch: (batch: number | 'ALL') => void;
  selectedPoolStatus: string;
  onSelectPoolStatus: (status: string) => void;
  selectedStaffId?: string | number | null;
  onSelectStaff?: (staffId: string) => void;
}

export const SharedPoolOverviewBanner: React.FC<SharedPoolOverviewBannerProps> = ({
  overview,
  loading,
  isAdmin,
  onAdvanceBatch,
  onTogglePause,
  onAddCustomers,
  onOpenHistoryRecovery,
  onOpenExcludedDrawer,
  selectedBatch,
  onSelectBatch,
  selectedPoolStatus,
  onSelectPoolStatus,
  selectedStaffId,
  onSelectStaff,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  if (!overview) return null;

  const {
    activeBatchNumber,
    totalBatches,
    batchSize,
    isPaused,
    batchTotal,
    batchAvailable,
    batchClaimed,
    batchExploited,
    batchRecycling,
    batchBooked,
    batchExcluded,
    totalCustomers,
    totalExploited,
    totalRemaining,
    percentRemaining,
    warningLevel,
    warningMessage,
    burnRatePerHour,
    estimatedHoursRemaining,
  } = overview;

  // Render Alert Banner theo warning level
  const renderAlertBanner = () => {
    if (warningLevel === 'EXHAUSTED') {
      return (
        <Alert
          type="error"
          showIcon
          icon={<AlertOutlined className="text-red-500 animate-pulse text-lg" />}
          message={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-red-600 dark:text-red-400">
                🚨 CẠN KIỆT DATA: Không còn Data dự phòng trong Pool!
              </span>
              {isAdmin && (
                <Button
                  size="small"
                  type="primary"
                  danger
                  icon={<PlusOutlined />}
                  onClick={onAddCustomers}
                  className="font-semibold shadow-xs"
                >
                  Nạp thêm Data ngay
                </Button>
              )}
            </div>
          }
          description="Toàn bộ danh sách khách hàng trong chiến dịch đã được khai thác hoặc chốt kết quả. Vui lòng chuyển thêm data mới để đội ngũ tiếp tục hoạt động."
          className="mb-3 rounded-xl border-red-500/30"
        />
      );
    }

    if (warningLevel === 'CRITICAL') {
      return (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined className="text-rose-500 text-lg animate-bounce" />}
          message={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-rose-600 dark:text-rose-400">
                ⚠️ CẢNH BÁO NGUY CẤP: Data dự phòng sắp cạn kiệt (còn {percentRemaining}%)
              </span>
              {isAdmin && (
                <Button size="small" type="primary" danger icon={<PlusOutlined />} onClick={onAddCustomers}>
                  Bổ sung Data
                </Button>
              )}
            </div>
          }
          description={`Với tốc độ khai thác hiện tại (${burnRatePerHour} KH/giờ), dự kiến toàn bộ dữ liệu sẽ cạn kiệt trong khoảng ${
            estimatedHoursRemaining ?? 'N/A'
          } giờ tới.`}
          className="mb-3 rounded-xl border-rose-500/30"
        />
      );
    }

    if (warningLevel === 'WARNING') {
      return (
        <Alert
          type="warning"
          showIcon
          icon={<ThunderboltOutlined className="text-amber-500 text-lg" />}
          message={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-amber-600 dark:text-amber-400">
                ⚡ CẢNH BÁO SỚM: Lượng Data còn lại dưới 30% (còn {percentRemaining}%)
              </span>
              {isAdmin && (
                <Button size="small" icon={<PlusOutlined />} onClick={onAddCustomers}>
                  Nạp thêm Data
                </Button>
              )}
            </div>
          }
          description={`Chiến dịch còn ${totalRemaining} khách hàng chưa khai thác. Quản lý hãy chủ động chuẩn bị thêm tệp data mới.`}
          className="mb-3 rounded-xl border-amber-500/30"
        />
      );
    }

    return null;
  };

  const batchOptions = [
    { label: `Batch ${activeBatchNumber} (Đang mở)`, value: activeBatchNumber },
    { label: 'Tất cả các Batch', value: 'ALL' },
    ...Array.from({ length: totalBatches }, (_, i) => i + 1)
      .filter((b) => b !== activeBatchNumber)
      .map((b) => ({ label: `Batch ${b}`, value: b })),
  ];

  const poolStatusOptions = [
    { label: 'Tất cả trạng thái', value: 'ALL' },
    { label: '🟢 Sẵn sàng (Available)', value: 'AVAILABLE' },
    { label: '🟠 Đang giữ (Claimed)', value: 'CLAIMED' },
    { label: '🟣 Chờ quay lại (Recycling)', value: 'RECYCLING' },
    { label: '🔵 Đã chốt Booked', value: 'BOOKED' },
    { label: '📦 Tổng dự phòng còn (Remaining)', value: 'REMAINING' },
    { label: '🚫 Data loại trừ (Excluded)', value: 'EXCLUDED' },
  ];

  return (
    <div className="mb-4 space-y-3">
      {renderAlertBanner()}

      <Card
        className="rounded-2xl border shadow-md transition-all overflow-hidden"
        style={{
          background:
            themeMode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.75) 100%)'
              : 'linear-gradient(135deg, rgba(245, 243, 255, 0.95) 0%, rgba(255, 255, 255, 1) 100%)',
          borderColor: themeMode === 'dark' ? 'rgba(139, 92, 246, 0.3)' : '#ddd6fe',
        }}
        styles={{ body: { padding: '16px' } }}
      >
        {/* Header Bar: Status & Control Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-purple-200/50 dark:border-purple-900/30">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Tag
              color="purple"
              className="font-bold text-xs px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 m-0"
            >
              <TeamOutlined /> TEAMWORK / SHARED POOL
            </Tag>

            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <span>Đợt khai thác:</span>
              <span className="font-mono text-purple-600 dark:text-purple-400">Batch #{activeBatchNumber}</span>
              <span className="text-xs text-gray-400 font-normal">/ {totalBatches} đợt</span>
            </span>

            {isPaused ? (
              <Tag color="error" className="font-semibold text-xs inline-flex items-center gap-1 m-0">
                <PauseCircleOutlined /> ĐANG TẠM DỪNG
              </Tag>
            ) : (
              <Tag color="success" className="font-semibold text-xs inline-flex items-center gap-1 m-0">
                <PlayCircleOutlined /> ĐANG HOẠT ĐỘNG
              </Tag>
            )}

            <span className="text-xs text-gray-500 dark:text-gray-400">({batchSize} KH / batch)</span>

            {burnRatePerHour > 0 ? (
              <Tag
                color="orange"
                className="font-semibold text-xs inline-flex items-center gap-1.5 m-0 px-2 py-0.5 rounded-md"
              >
                <FireOutlined className="text-orange-500" />
                <span className="tabular-nums">{burnRatePerHour} KH/h</span>
                {estimatedHoursRemaining !== null && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                    (còn ~{estimatedHoursRemaining}h)
                  </span>
                )}
              </Tag>
            ) : null}
          </div>

          {/* Manager Action Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenExcludedDrawer && (
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  onClick={onOpenExcludedDrawer}
                  className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:border-rose-400 font-semibold shadow-xs"
                >
                  Data loại trừ ({selectedBatch === 'ALL' ? (overview.totalExcluded ?? batchExcluded) : batchExcluded})
                </Button>
              )}

              <Button
                size="small"
                icon={<HistoryOutlined />}
                onClick={onOpenHistoryRecovery}
                className="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:border-purple-400 font-semibold shadow-xs"
              >
                Lịch sử & Khôi phục
              </Button>

              <Popconfirm
                title={isPaused ? 'Tiếp tục khai thác Pool?' : 'Tạm dừng khai thác Pool?'}
                description={
                  isPaused
                    ? 'Nhân viên sẽ có thể tiếp tục claim và gọi khách hàng trong Batch.'
                    : 'Nhân viên sẽ tạm thời không thể nhận thêm khách hàng mới.'
                }
                onConfirm={() => onTogglePause(!isPaused)}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                  className={isPaused ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}
                >
                  {isPaused ? 'Tiếp tục khai thác' : 'Tạm dừng Pool'}
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Mở Batch tiếp theo ngay?"
                description={`Chuyển Batch khai thác từ Batch #${activeBatchNumber} sang Batch #${activeBatchNumber + 1}?`}
                onConfirm={onAdvanceBatch}
                okText="Mở Batch"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<ForwardOutlined />}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  Mở Batch tiếp theo
                </Button>
              </Popconfirm>

              <Button size="small" icon={<PlusOutlined />} onClick={onAddCustomers}>
                Nạp Data
              </Button>
            </div>
          )}
        </div>

        {/* Middle Stats Grid - 6 Clickable Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 pb-3">
          {/* Card 1: Sẵn sàng nhận (AVAILABLE) */}
          <div
            onClick={() => onSelectPoolStatus(selectedPoolStatus === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
              selectedPoolStatus === 'AVAILABLE'
                ? 'ring-2 ring-emerald-500 bg-emerald-500/15 border-emerald-500 shadow-md scale-[1.02]'
                : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-xs'
            }`}
          >
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span>SẴN SÀNG NHẬN</span>
              <span className="text-xs">🟢</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {batchAvailable}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">/ {batchTotal} KH</span>
            </div>
          </div>

          {/* Card 2: Đang xử lý (CLAIMED) */}
          <div
            onClick={() => onSelectPoolStatus(selectedPoolStatus === 'CLAIMED' ? 'ALL' : 'CLAIMED')}
            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
              selectedPoolStatus === 'CLAIMED'
                ? 'ring-2 ring-amber-500 bg-amber-500/15 border-amber-500 shadow-md scale-[1.02]'
                : 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50 hover:shadow-xs'
            }`}
          >
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>ĐANG XỬ LÝ (CLAIM)</span>
              <span className="text-xs">🟠</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {batchClaimed}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">KH</span>
            </div>
          </div>

          {/* Card 3: Chờ tái sinh (RECYCLING) */}
          <div
            onClick={() => onSelectPoolStatus(selectedPoolStatus === 'RECYCLING' ? 'ALL' : 'RECYCLING')}
            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
              selectedPoolStatus === 'RECYCLING'
                ? 'ring-2 ring-purple-500 bg-purple-500/15 border-purple-500 shadow-md scale-[1.02]'
                : 'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/50 hover:shadow-xs'
            }`}
          >
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-between">
              <span>CHỜ TÁI SINH (POOL)</span>
              <span className="text-xs">🟣</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {batchRecycling}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">KH</span>
            </div>
          </div>

          {/* Card 4: Đã Booking (BOOKED) */}
          <div
            onClick={() => onSelectPoolStatus(selectedPoolStatus === 'BOOKED' ? 'ALL' : 'BOOKED')}
            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
              selectedPoolStatus === 'BOOKED'
                ? 'ring-2 ring-sky-500 bg-sky-500/15 border-sky-500 shadow-md scale-[1.02]'
                : 'border-sky-500/20 bg-sky-500/5 hover:border-sky-500/50 hover:shadow-xs'
            }`}
          >
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 flex items-center justify-between">
              <span>ĐÃ BOOKING</span>
              <span className="text-xs">🔵</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {batchBooked}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">đơn</span>
            </div>
          </div>

          {/* Card 5: Tổng dự phòng còn (REMAINING) */}
          <div
            onClick={() => onSelectPoolStatus(selectedPoolStatus === 'REMAINING' ? 'ALL' : 'REMAINING')}
            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
              selectedPoolStatus === 'REMAINING'
                ? 'ring-2 ring-indigo-500 bg-indigo-500/15 border-indigo-500 shadow-md scale-[1.02]'
                : 'border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/50 hover:shadow-xs'
            }`}
          >
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>TỔNG DỰ PHÒNG CÒN</span>
              <DatabaseOutlined className="text-indigo-400" />
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {selectedBatch === 'ALL' ? totalRemaining : (batchAvailable + batchClaimed + batchRecycling)}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                {selectedBatch === 'ALL' ? `(${percentRemaining}%)` : `/ ${batchTotal} KH`}
              </span>
            </div>
          </div>

          {/* Card 6: Data loại trừ (EXCLUDED) */}
          <div
            onClick={() => onSelectPoolStatus(selectedPoolStatus === 'EXCLUDED' ? 'ALL' : 'EXCLUDED')}
            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all duration-200 flex flex-col justify-between ${
              selectedPoolStatus === 'EXCLUDED'
                ? 'ring-2 ring-rose-500 bg-rose-500/15 border-rose-500 shadow-md scale-[1.02]'
                : 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50 hover:shadow-xs'
            }`}
          >
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>DATA LOẠI TRỪ</span>
              <span className="text-xs">🚫</span>
            </span>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {selectedBatch === 'ALL' ? (overview.totalExcluded ?? batchExcluded) : batchExcluded}
                </span>
                <span className="text-[10px] text-gray-400 font-normal">KH</span>
              </div>
              {onOpenExcludedDrawer && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExcludedDrawer();
                  }}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline flex items-center gap-0.5 font-semibold bg-rose-100/60 dark:bg-rose-900/40 px-1.5 py-0.5 rounded"
                >
                  Kiểm duyệt ↗
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Toolbar: Filter Batch & Pool Status */}
        <div className="pt-2.5 border-t border-purple-200/50 dark:border-purple-900/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Xem Batch:</span>
              <Select
                size="small"
                value={selectedBatch}
                onChange={onSelectBatch}
                options={batchOptions}
                style={{ width: 180 }}
                className="font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Trạng thái Pool:</span>
              <Select
                size="small"
                value={selectedPoolStatus}
                onChange={onSelectPoolStatus}
                options={poolStatusOptions}
                style={{ width: 190 }}
                className="font-medium"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>
              Tổng KH chiến dịch:{' '}
              <strong className="tabular-nums font-bold text-slate-800 dark:text-slate-100">{totalCustomers}</strong>
            </span>
            <span>·</span>
            <span>
              Đã khai thác: <strong className="tabular-nums text-emerald-600">{totalExploited}</strong>
            </span>
          </div>
        </div>

        {/* Staff Performance Block (MOS-BUG-81) */}
        {overview.staffPerformance && (
          <SharedPoolStaffPerformanceCard
            performance={overview.staffPerformance}
            loading={loading}
            selectedStaffId={selectedStaffId}
            onSelectStaff={onSelectStaff}
          />
        )}
      </Card>
    </div>
  );
};
