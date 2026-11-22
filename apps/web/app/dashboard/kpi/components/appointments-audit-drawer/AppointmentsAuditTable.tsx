'use client';

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { AppIcon, DataTable } from '~/components/ui';
import {
  formatAuditCurrency,
  type AppointmentsAuditTotals,
  type BookerAppointmentItem,
} from './appointmentsAuditTypes';
import { buildAppointmentsAuditColumns } from './auditTableColumns';

export interface AppointmentsAuditTableProps {
  visibleAppointments: BookerAppointmentItem[];
  filteredCount: number;
  visibleCount: number;
  drilldownTotals: AppointmentsAuditTotals;
  themeMode: string;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export function AppointmentsAuditTable({
  visibleAppointments,
  filteredCount,
  visibleCount,
  drilldownTotals,
  themeMode,
  loadMoreRef,
}: AppointmentsAuditTableProps) {
  const columns = useMemo(() => buildAppointmentsAuditColumns(), []);
  const isDark = themeMode === 'dark';

  const summaryRowClass = isDark ? 'bg-neutral-900 font-bold' : 'bg-neutral-50 font-bold dark:bg-neutral-900';

  return (
    <>
      <DataTable<BookerAppointmentItem>
        dataSource={visibleAppointments}
        size="small"
        columns={columns}
        rowKey="id"
        pagination={false}
        bordered
        locale={{ emptyText: 'Không tìm thấy kết quả nào phù hợp với bộ lọc.' }}
        summary={() => (
          <tr className={summaryRowClass}>
            <td colSpan={4} className="ant-table-cell text-[var(--mos-text)]">
              Tổng cộng (Kết quả lọc)
            </td>
            <td className="ant-table-cell text-right tabular-nums text-[var(--mos-text)]">
              {formatAuditCurrency(drilldownTotals.totalNetRevenue)}
              {'\u00A0'}đ
            </td>
            <td className="ant-table-cell text-right tabular-nums text-[var(--mos-text)]">
              {formatAuditCurrency(drilldownTotals.totalTips)}
              {'\u00A0'}đ
            </td>
            <td className="ant-table-cell text-right tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatAuditCurrency(drilldownTotals.totalBookingBonus)}
              {'\u00A0'}đ
            </td>
            <td className="ant-table-cell tabular-nums text-[var(--mos-text-muted)]">
              {drilldownTotals.checkinCount} / {drilldownTotals.totalCount} Check-in
            </td>
          </tr>
        )}
      />

      {/* Lazy loading detector trigger div */}
      <div ref={loadMoreRef}>
        {visibleCount < filteredCount ? (
          <div className="flex flex-col items-center justify-center gap-2 p-5 text-center">
            <AppIcon icon={Loader2} size="action" className="animate-spin text-[var(--mos-accent)]" />
            <span className="text-[13px] text-[var(--mos-text-muted)]">Đang tải thêm khách hàng...</span>
          </div>
        ) : (
          filteredCount > 0 && (
            <div className="p-5 text-center text-[13px] tabular-nums text-[var(--mos-text-muted)]">
              Đã hiển thị toàn bộ <strong>{filteredCount}</strong> khách hàng
            </div>
          )
        )}
      </div>
    </>
  );
}
