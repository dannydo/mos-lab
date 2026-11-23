'use client';

import type React from 'react';
import { useMemo } from 'react';
import { Button, Card, Col, Row, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Calendar, Clock, DollarSign, LogIn, LogOut } from 'lucide-react';
import type { CvPaystubRecord, CvWorkLogDetailRecord } from '@mos-lab/shared';
import { AdaptiveModal, DataTable, StatusTag } from '~/components/ui';
import { formatHoursToHoursMinutes, type CvWorkLogSummary } from './cvThuNhapUtils';

interface CvWorkLogModalProps {
  open: boolean;
  onClose: () => void;
  workLogRecord: CvPaystubRecord | null;
  workLogLoading: boolean;
  workLogs: CvWorkLogDetailRecord[];
  workLogSummary: CvWorkLogSummary;
  modalWidth: number;
  isResizing: boolean;
  updateModalWidth: (width: number) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/** Resizable modal displaying daily IN/OUT attendance logs and hourly wage breakdown for a CV. */
export function CvWorkLogModal({
  open,
  onClose,
  workLogRecord,
  workLogLoading,
  workLogs,
  workLogSummary,
  modalWidth,
  isResizing,
  updateModalWidth,
  handleMouseDown,
}: CvWorkLogModalProps) {
  const columns = useMemo<ColumnsType<CvWorkLogDetailRecord>>(
    () => [
      {
        title: 'Ngày Làm Việc',
        dataIndex: 'date',
        key: 'date',
        width: 130,
        render: (val: string) => (
          <Space size={4}>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="tabular-nums font-semibold">{val}</span>
          </Space>
        ),
      },
      {
        title: 'Cơ Sở',
        dataIndex: 'store',
        key: 'store',
        width: 100,
        render: (text: string) => <StatusTag status="processing" label={text} />,
      },
      {
        title: 'Check-in Đầu (IN)',
        dataIndex: 'checkInTime',
        key: 'checkInTime',
        width: 140,
        align: 'center' as const,
        render: (val: string) => (
          <StatusTag
            status="success"
            icon={<LogIn className="w-3 h-3" />}
            label={val}
            className="tabular-nums font-mono"
          />
        ),
      },
      {
        title: 'Check-out Cuối (OUT)',
        dataIndex: 'checkOutTime',
        key: 'checkOutTime',
        width: 140,
        align: 'center' as const,
        render: (val: string) => (
          <StatusTag
            status="orange"
            icon={<LogOut className="w-3 h-3" />}
            label={val}
            className="tabular-nums font-mono"
          />
        ),
      },
      {
        title: 'Số Giờ Tính Lương',
        dataIndex: 'workHours',
        key: 'workHours',
        align: 'right' as const,
        width: 130,
        render: (val: number) => (
          <span className="tabular-nums font-bold text-blue-500">{formatHoursToHoursMinutes(val)}</span>
        ),
      },
      {
        title: 'Lương Giờ Trong Ngày',
        dataIndex: 'dailyWage',
        key: 'dailyWage',
        align: 'right' as const,
        width: 170,
        render: (val: number, record: CvWorkLogDetailRecord) => (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
              +{Math.round(val || 0).toLocaleString('vi-VN')}đ
            </span>
            {record.notes && (
              <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-1 rounded border border-orange-100 dark:border-orange-900/30 mt-0.5 inline-block">
                {record.notes}
              </span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  if (!workLogRecord) return null;

  return (
    <AdaptiveModal
      intent="data"
      open={open}
      onCancel={onClose}
      width={modalWidth}
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6 select-none">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500 shrink-0" />
            <span className="font-bold text-base sm:text-lg">
              Báo Cáo Ca Làm Việc &amp; Lương Giờ (IN/OUT) - CV: {workLogRecord.staffName}
            </span>
            <StatusTag
              status={workLogRecord.store === 'PXL' ? 'processing' : 'purple'}
              label={`CN: ${workLogRecord.store}`}
            />
          </div>

          {/* QUICK WIDTH PRESETS */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Kích thước:</span>
            <Button
              size="small"
              type={modalWidth === 800 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(800)}
              className="text-xs"
            >
              Vừa (800px)
            </Button>
            <Button
              size="small"
              type={modalWidth === 1100 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(1100)}
              className="text-xs"
            >
              Rộng (1100px)
            </Button>
            <Button
              size="small"
              type={modalWidth === 1400 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(1400)}
              className="text-xs"
            >
              Tối đa (1400px)
            </Button>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <span className="text-xs italic text-slate-500 dark:text-slate-400 hidden sm:inline">
            💡 Kéo mép phải để chỉnh rộng / hẹp ({modalWidth}px) — Tự động ghi nhớ khi F5
          </span>
          <Button
            type="primary"
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 border-amber-500 text-slate-950 font-semibold ml-auto"
          >
            Đóng Báo Cáo Ca Làm
          </Button>
        </div>
      }
    >
      {/* DRAG RESIZE HANDLE ON RIGHT EDGE */}
      <div
        onMouseDown={handleMouseDown}
        className={`hidden md:flex absolute top-0 right-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 items-center justify-center ${
          isResizing ? 'bg-blue-500/40' : ''
        }`}
        title="Kéo sang ngang để thay đổi chiều rộng Popup (Nhớ kích thước khi F5)"
      >
        <div className="w-1 h-8 bg-gray-400/50 rounded-full" />
      </div>

      {workLogLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {/* Top Stat summary for Work Log Modal */}
          <Row gutter={[12, 12]} className="my-4">
            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">∑ Ngày Đi Làm</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{workLogSummary.totalWorkDays}</span>
                  <span className="text-xs font-medium text-slate-500">ngày</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">∑ Số Giờ Làm</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-purple-600 dark:text-purple-400">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{formatHoursToHoursMinutes(workLogSummary.totalWorkHours)}</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Đơn Giá Lương Giờ</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>{workLogSummary.hourlyRate.toLocaleString('vi-VN')}</span>
                  <span className="text-xs font-medium text-slate-500">đ/h</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined" className="border-blue-500/80 dark:border-blue-400">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">∑ Lương Giờ Nhận</div>
                <div className="flex items-center gap-1 text-[15px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  <span>{Math.round(workLogSummary.totalWage).toLocaleString('vi-VN')}</span>
                  <span className="text-xs font-semibold">đ</span>
                </div>
              </Card>
            </Col>
          </Row>

          <DataTable<CvWorkLogDetailRecord>
            dataSource={workLogs}
            rowKey={(r, idx) => `${r.date}-${r.checkInTime}-${idx}`}
            bordered
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            size="small"
            columns={columns}
          />
        </div>
      )}
    </AdaptiveModal>
  );
}
