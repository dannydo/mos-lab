'use client';

import { useMemo } from 'react';
import { Card, Col, Row, Tabs } from 'antd';
import { Calendar, CheckCircle2, Clock, DollarSign, History, Info } from 'lucide-react';
import type {
  BkPaystubRecord,
  BkWorkLogRecord,
  BkWorkLogResponse,
  TelesalesAttendanceExceptionAuditLog,
} from '@mos-lab/shared';
import { AdaptiveModal, DataTable, StatusTag } from '~/components/ui';
import { formatBkIncomeCurrency } from './bkThuNhapUtils';
import {
  buildBkWorkLogAuditColumns,
  buildBkWorkLogStandardColumns,
  buildBkWorkLogTelesalesColumns,
} from './bkWorkLogColumns';

interface BkWorkLogModalProps {
  open: boolean;
  loading: boolean;
  workLogRecord: BkPaystubRecord | null;
  workLogData: BkWorkLogResponse | null;
  activeDrawerTab: 'attendance' | 'audit';
  onTabChange: (tab: 'attendance' | 'audit') => void;
  onClose: () => void;
  onOpenExceptionModal: (row: BkWorkLogRecord) => void;
}

/** Displays detailed daily IN/OUT attendance logs, salary calculations, and Telesales exception audit history. */
export function BkWorkLogModal({
  open,
  loading,
  workLogRecord,
  workLogData,
  activeDrawerTab,
  onTabChange,
  onClose,
  onOpenExceptionModal,
}: BkWorkLogModalProps) {
  const canManageExceptions = Boolean(workLogData?.canManageExceptions);

  const telesalesColumns = useMemo(
    () =>
      buildBkWorkLogTelesalesColumns({
        canManageExceptions,
        onOpenExceptionModal,
      }),
    [canManageExceptions, onOpenExceptionModal]
  );

  const standardColumns = useMemo(() => buildBkWorkLogStandardColumns(), []);
  const auditColumns = useMemo(() => buildBkWorkLogAuditColumns(), []);

  if (!workLogRecord) return null;

  const checkInSuffix =
    workLogData && workLogData.workDaysAdjustment > 0
      ? `(+${workLogData.workDaysAdjustment} duyệt)`
      : workLogData && workLogData.workDaysAdjustment < 0
        ? `(${workLogData.workDaysAdjustment} duyệt)`
        : 'ngày';

  return (
    <AdaptiveModal
      intent="data"
      title={
        <div className="flex flex-wrap items-center gap-2 pr-6">
          <Clock className="w-5 h-5 text-blue-500 shrink-0" />
          <span>
            Báo Cáo Chi Tiết Chấm Công (IN/OUT) - Booker:{' '}
            <strong className="text-blue-600 dark:text-blue-400">{workLogRecord.staffName}</strong>
          </span>
          <StatusTag
            status={workLogRecord.store === 'PXL' ? 'processing' : 'purple'}
            label={workLogRecord.store}
            className="ml-1 font-mono"
          />
          {workLogData?.isTelesalesExecutive && (
            <StatusTag status="cyan" label="Vai trò: Telesales Executive" className="font-semibold text-xs py-0.5" />
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnHidden
    >
      {loading ? (
        <div className="py-12 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Đang tải dữ liệu quẹt thẻ...</span>
        </div>
      ) : workLogData ? (
        <div className="space-y-4 py-2">
          {/* Summary Stats */}
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
              >
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">∑ Ngày Đi Làm</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>
                    {workLogData.actualWorkDays} / {workLogData.standardWorkDays}
                  </span>
                  <span className="text-xs font-medium text-slate-500">ngày</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
              >
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">∑ Quẹt Thẻ Máy</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{workLogData.actualCheckInDays}</span>
                  <span className="text-xs font-medium text-slate-500">{checkInSuffix}</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
              >
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">∑ Giờ Làm Việc</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-purple-600 dark:text-purple-400">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{workLogData.summary.totalWorkingHours}</span>
                  <span className="text-xs font-medium text-slate-500">giờ</span>
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
              >
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">∑ Lương Cứng Nhận</div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span className="truncate">{formatBkIncomeCurrency(workLogData.calculatedBaseSalary)}</span>
                </div>
              </Card>
            </Col>
          </Row>

          {workLogData.isTelesalesExecutive && (
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  Hệ thống áp dụng <strong>Ngoại lệ chấm công</strong> theo ngày cho Telesales Executive. Giờ
                  check-in/out thực tế của máy luôn được lưu trữ toàn vẹn để đối soát.
                </span>
              </div>
              {(workLogData.summary.totalExceptionDays || 0) > 0 && (
                <StatusTag
                  status="orange"
                  label={`${workLogData.summary.totalExceptionDays} ngày đã duyệt ngoại lệ`}
                  className="font-bold tabular-nums"
                />
              )}
            </div>
          )}

          {workLogData.isTelesalesExecutive ? (
            <Tabs
              activeKey={activeDrawerTab}
              onChange={(key) => onTabChange(key as 'attendance' | 'audit')}
              items={[
                {
                  key: 'attendance',
                  label: (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Ca làm việc &amp; Chấm công
                    </span>
                  ),
                  children: (
                    <DataTable<BkWorkLogRecord>
                      dataSource={workLogData.data}
                      rowKey="workDate"
                      size="small"
                      pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '31', '50'] }}
                      bordered
                      columns={telesalesColumns}
                    />
                  ),
                },
                {
                  key: 'audit',
                  label: (
                    <span className="flex items-center gap-1.5 font-medium">
                      <History className="w-3.5 h-3.5" /> Lịch sử Audit Log ({workLogData.auditLogs?.length || 0})
                    </span>
                  ),
                  children: (
                    <DataTable<TelesalesAttendanceExceptionAuditLog>
                      dataSource={workLogData.auditLogs || []}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 10 }}
                      bordered
                      locale={{ emptyText: 'Chưa có lịch sử điều chỉnh ngoại lệ chấm công' }}
                      columns={auditColumns}
                    />
                  ),
                },
              ]}
            />
          ) : (
            <DataTable<BkWorkLogRecord>
              dataSource={workLogData.data}
              rowKey="workDate"
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '31', '50'] }}
              bordered
              columns={standardColumns}
            />
          )}
        </div>
      ) : null}
    </AdaptiveModal>
  );
}
