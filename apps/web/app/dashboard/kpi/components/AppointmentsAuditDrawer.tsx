'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { AdaptiveDrawer, AppIcon, StatePanel } from '~/components/ui';
import {
  AUDIT_PAGE_BATCH_SIZE,
  computeAuditDrilldownTotals,
  computeLiveTotalSalary,
  filterBookerAppointments,
  type AppointmentsAuditDrawerProps,
  type AppointmentsAuditFilters,
  type AppointmentsAuditServiceFilter,
  type AppointmentsAuditStatusFilter,
  type AppointmentsAuditTotals,
  type BookerAppointmentItem,
} from './appointments-audit-drawer/appointmentsAuditTypes';
import { AppointmentsAuditTable } from './appointments-audit-drawer/AppointmentsAuditTable';
import { AuditFilterBar } from './appointments-audit-drawer/AuditFilterBar';
import { AuditPaystubSummaryCards } from './appointments-audit-drawer/AuditPaystubSummaryCards';
import { useAppointmentsAudit } from './appointments-audit-drawer/useAppointmentsAudit';

export {
  AUDIT_PAGE_BATCH_SIZE,
  computeAuditDrilldownTotals,
  computeLiveTotalSalary,
  filterBookerAppointments,
  AppointmentsAuditTable,
  AuditFilterBar,
  AuditPaystubSummaryCards,
  useAppointmentsAudit,
};
export type {
  AppointmentsAuditDrawerProps,
  AppointmentsAuditFilters,
  AppointmentsAuditServiceFilter,
  AppointmentsAuditStatusFilter,
  AppointmentsAuditTotals,
  BookerAppointmentItem,
};

export default function AppointmentsAuditDrawer({
  open,
  onClose,
  selectedBookerId,
  selectedBookerName,
  selectedStaffRecord,
  dateRange,
  themeMode,
}: AppointmentsAuditDrawerProps) {
  const {
    bookerAppointments,
    filteredAppointments,
    visibleAppointments,
    loading,
    drillSearchText,
    setDrillSearchText,
    drillStatusFilter,
    setDrillStatusFilter,
    drillServiceFilter,
    setDrillServiceFilter,
    visibleCount,
    loadMoreRef,
    drilldownTotals,
    liveTotalSalary,
  } = useAppointmentsAudit({
    open,
    selectedBookerId,
    selectedStaffRecord,
    dateRange,
  });

  return (
    <AdaptiveDrawer
      title={
        <span className="inline-flex items-center gap-2">
          <AppIcon icon={Calendar} size="sm" className="text-[var(--mos-accent)]" />
          <span>
            Danh sách Khách hàng đặt lịch của Online Consultant: <strong>{selectedBookerName}</strong>
          </span>
        </span>
      }
      intent="data"
      placement="right"
      width="95vw"
      onClose={onClose}
      open={open}
    >
      {loading ? (
        <StatePanel kind="loading" title="Đang tải danh sách..." minHeight={220} surface={false} />
      ) : (
        <div className="flex w-full flex-col gap-4">
          <AuditFilterBar
            searchText={drillSearchText}
            onSearchChange={setDrillSearchText}
            statusFilter={drillStatusFilter}
            onStatusFilterChange={setDrillStatusFilter}
            serviceFilter={drillServiceFilter}
            onServiceFilterChange={setDrillServiceFilter}
            filteredCount={filteredAppointments.length}
            totalCount={bookerAppointments.length}
          />

          <AuditPaystubSummaryCards
            drilldownTotals={drilldownTotals}
            selectedStaffRecord={selectedStaffRecord}
            liveTotalSalary={liveTotalSalary}
            themeMode={themeMode}
          />

          <AppointmentsAuditTable
            visibleAppointments={visibleAppointments}
            filteredCount={filteredAppointments.length}
            visibleCount={visibleCount}
            drilldownTotals={drilldownTotals}
            themeMode={themeMode}
            loadMoreRef={loadMoreRef}
          />
        </div>
      )}
    </AdaptiveDrawer>
  );
}
