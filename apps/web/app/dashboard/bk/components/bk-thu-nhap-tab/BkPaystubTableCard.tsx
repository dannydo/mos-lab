'use client';

import { useMemo } from 'react';
import { Button, Card, Tooltip, Typography } from 'antd';
import { BookOpenCheck, Eye, Maximize2, Minimize2, Wallet } from 'lucide-react';
import type { BkPaystubRecord } from '@mos-lab/shared';
import { DataTable, MobileRecordList } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import BkAvatar from '../BkAvatar';
import { buildBkPaystubColumns } from './bkThuNhapColumns';
import {
  formatBkIncomeCurrency,
  formatStoreCode,
  type BkIncomeForecastMeta,
  type BkProjectedRecord,
} from './bkThuNhapUtils';

const { Text } = Typography;

interface BkPaystubTableCardProps {
  paystubs: BkPaystubRecord[];
  loading: boolean;
  isMobile: boolean;
  isCompact: boolean;
  onToggleCompact: () => void;
  forecastMeta: BkIncomeForecastMeta;
  getProjectedRecord: (record: BkPaystubRecord) => BkProjectedRecord;
  onOpenWorkLogs: (record: BkPaystubRecord) => void;
  onOpenBreakdownModal: (record: BkPaystubRecord) => void;
}

/** Renders the Live Paystub Booker table card with mobile list view, density toggle, and BK-006 bible shortcut. */
export function BkPaystubTableCard({
  paystubs,
  loading,
  isMobile,
  isCompact,
  onToggleCompact,
  forecastMeta,
  getProjectedRecord,
  onOpenWorkLogs,
  onOpenBreakdownModal,
}: BkPaystubTableCardProps) {
  const { isDayMode, isPastPeriod } = forecastMeta;

  const columns = useMemo(
    () =>
      buildBkPaystubColumns({
        forecastMeta,
        getProjectedRecord,
        onOpenWorkLogs,
        onOpenBreakdownModal,
      }),
    [forecastMeta, getProjectedRecord, onOpenWorkLogs, onOpenBreakdownModal]
  );

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold m-0 text-slate-900 dark:text-slate-100">Bảng Lương Live Paystub Booker</h3>
            <Text type="secondary" className="text-xs">
              Tổng hợp thu nhập tự động cho Booker trong tháng / chu kỳ lọc
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<BookOpenCheck size={14} className="mr-1 text-amber-500" />}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('open-mos-bible', {
                    detail: { commandmentId: 'BK-006' },
                  })
                );
              }
            }}
            className="text-xs font-semibold rounded-lg flex items-center bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/40 hover:border-amber-500 shadow-sm"
          >
            Kinh Thánh Lương BK-006 &amp; Giả Lập
          </Button>
          <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
            <Button
              icon={isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              size="small"
              onClick={onToggleCompact}
              className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
            />
          </Tooltip>
        </div>
      </div>

      {isMobile ? (
        <div className="p-3">
          <MobileRecordList
            records={paystubs}
            loading={loading}
            getKey={(record) => String(record.staffId)}
            emptyDescription="Chưa có dữ liệu thu nhập Booker"
            renderRecord={(record, index) => {
              const proj = getProjectedRecord(record);
              return (
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                      #{index + 1}
                    </span>
                    <BkAvatar name={record.staffName} src={record.avatar} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {record.staffName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatStoreCode(record.store)} · {record.actualWorkDays}/{record.standardWorkDays} ngày
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Lương cứng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-400">
                        {formatBkIncomeCurrency(record.calculatedBaseSalary || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (proj.projectedBaseSalary || 0) > 0 && (
                        <div className="text-[10px] text-sky-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(proj.projectedBaseSalary)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thưởng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                        +
                        {formatBkIncomeCurrency(
                          (record.doneBonus || 0) + (record.tipBonus || 0) + (record.revenueBonus || 0)
                        )}
                      </dd>
                      <div className="text-[10px] text-slate-400 font-medium tabular-nums truncate">
                        Rev: {formatCompactVND(record.totalRevenue || 0)}
                      </div>
                      {!isDayMode && !isPastPeriod && (
                        <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                          🔮 ~
                          {formatCompactVND(
                            (proj.projectedDoneBonus || 0) +
                              (proj.projectedTipBonus || 0) +
                              (proj.projectedRevenueBonus || 0)
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Phụ cấp lễ x3</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-rose-400">
                        +{formatBkIncomeCurrency(record.holidayPremiumPay || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (proj.projectedHolidayPay || 0) > 0 && (
                        <div className="text-[10px] text-rose-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(proj.projectedHolidayPay)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thu nhập</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-amber-400">
                        {formatBkIncomeCurrency(record.totalIncome || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (
                        <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(proj.projectedTotalIncome)}
                        </div>
                      )}
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="small"
                      icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
                      onClick={() => onOpenBreakdownModal(record)}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      ) : (
        <DataTable<BkPaystubRecord>
          dataSource={paystubs}
          columns={columns}
          rowKey="staffId"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          className={isCompact ? 'compact-table' : ''}
        />
      )}
    </Card>
  );
}
