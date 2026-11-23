'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
  type HolidayPayrollLedgerEntry,
  type HolidayRosterEntry,
  isAdminOrSuperAdminRole,
} from '@mos-lab/shared';
import type { HolidayWorkDrawerMode } from '../components/HolidayWorkDrawer';
import type { HolidayBranchCoverageRow, HolidayWorkTabKey } from '../components/holidayWorkPresentation';
import { useHolidayWork } from '../hooks/useHolidayWork';
import {
  ACTIVE_TAB_KEY,
  buildAdjustmentByLedger,
  DEFAULT_HOLIDAY_PAGE_STATE,
  filterHolidayRows,
  getUnresolvedHolidayExceptionCount,
  groupHolidayBranchCoverage,
  type HolidayConfirmAction,
  type HolidayWorkPageState,
  PAGE_STATE_KEY,
} from './holidayWorkPageHelpers';

export function useHolidayWorkPage() {
  const [messageApi, messageContext] = message.useMessage();
  const [form] = Form.useForm();
  const holiday = useHolidayWork({
    onSuccess: (text) => messageApi.success(text),
    onError: (text) => messageApi.error(text),
  });
  const [activeTab, setActiveTab] = useState<HolidayWorkTabKey>('roster');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [drawerMode, setDrawerMode] = useState<HolidayWorkDrawerMode>(null);
  const [editingCoverage, setEditingCoverage] = useState<HolidayBranchCoverageRow | null>(null);
  const [editingRoster, setEditingRoster] = useState<HolidayRosterEntry | null>(null);
  const [editingLedger, setEditingLedger] = useState<HolidayPayrollLedgerEntry | null>(null);
  const [pageState, setPageState] = useState<HolidayWorkPageState>(DEFAULT_HOLIDAY_PAGE_STATE);
  const [confirmAction, setConfirmAction] = useState<HolidayConfirmAction>(null);

  useEffect(() => {
    const savedTab = window.localStorage.getItem(ACTIVE_TAB_KEY) as HolidayWorkTabKey | null;
    if (savedTab && Object.prototype.hasOwnProperty.call(DEFAULT_HOLIDAY_PAGE_STATE, savedTab)) {
      setActiveTab(savedTab);
    }
    try {
      const savedState = JSON.parse(
        window.localStorage.getItem(PAGE_STATE_KEY) || 'null'
      ) as Partial<HolidayWorkPageState> | null;
      if (savedState) setPageState((current) => ({ ...current, ...savedState }));
    } catch {
      window.localStorage.removeItem(PAGE_STATE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    window.localStorage.setItem(PAGE_STATE_KEY, JSON.stringify(pageState));
  }, [activeTab, pageState]);

  useEffect(() => {
    setPageState((current) => ({ ...current, [activeTab]: { ...current[activeTab], current: 1 } }));
  }, [search, activeTab]);

  const workspace = holiday.workspace;
  const canManage = Boolean(workspace?.canManage);
  const canNominate = Boolean(workspace?.canNominate);
  const activePeriod = holiday.periods.find((period) => period.id === holiday.activePeriodId) || workspace?.period;
  const canAccessWorkspace =
    isAdminOrSuperAdminRole(holiday.currentUser?.role) || holiday.currentUser?.role === 'manager';

  const candidateOptions = useMemo(() => {
    const seen = new Set<number>();
    return (workspace?.candidates || []).filter((candidate) => {
      if (seen.has(candidate.legacyStaffId)) return false;
      seen.add(candidate.legacyStaffId);
      return true;
    });
  }, [workspace?.candidates]);

  const performanceStaffOptions = useMemo(
    () => holiday.staff.filter((staff) => staff.isActive && Boolean(staff.legacyStaffId)),
    [holiday.staff]
  );

  const adjustmentByLedger = useMemo(
    () => buildAdjustmentByLedger(workspace?.adjustments || []),
    [workspace?.adjustments]
  );

  const branchCoverage = useMemo(() => groupHolidayBranchCoverage(workspace?.coverage || []), [workspace?.coverage]);

  const coverageRows = filterHolidayRows(branchCoverage, ['workDate', 'storeKey'], deferredSearch);
  const candidateRows = filterHolidayRows(
    workspace?.candidates || [],
    ['displayName', 'teamCode', 'storeKey'],
    deferredSearch
  );
  const rosterRows = filterHolidayRows(
    workspace?.roster || [],
    ['displayName', 'teamCode', 'storeKey', 'status'],
    deferredSearch
  );
  const ledgerRows = filterHolidayRows(
    workspace?.ledger || [],
    ['displayName', 'teamCode', 'storeKey', 'ledgerStatus'],
    deferredSearch
  );
  const eventRows = filterHolidayRows(holiday.events, ['displayName', 'eventType', 'source', 'status'], deferredSearch);

  const unresolvedExceptionCount = getUnresolvedHolidayExceptionCount(
    activePeriod?.summary,
    workspace?.roster || [],
    workspace?.ledger || []
  );

  const pagination = (key: HolidayWorkTabKey, total: number): TablePaginationConfig => ({
    current: pageState[key].current,
    pageSize: pageState[key].pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (count) => `${count.toLocaleString('vi-VN')} dòng`,
    onChange: (current, pageSize) => setPageState((value) => ({ ...value, [key]: { current, pageSize } })),
  });

  const openPeriod = () => {
    setDrawerMode('period');
    form.resetFields();
    form.setFieldsValue({
      dates: [dayjs(), dayjs()],
      standardShiftHours: 9,
      workPremiumMultiplier: 3,
      paidLeaveMultiplier: 1,
      monthlyStandardDays: 26,
      monthlyStandardHours: 234,
      selectionWindowDays: 90,
      ...DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
    });
  };

  const openCoverage = (row?: HolidayBranchCoverageRow) => {
    setEditingCoverage(row || null);
    setDrawerMode('coverage');
    form.resetFields();
    const matchingBranch = row
      ? holiday.branches.find(
          (branch) => branch.id === row.storeId || branch.code.toUpperCase() === row.storeKey.toUpperCase()
        )
      : holiday.branches[0];
    form.setFieldsValue(
      row
        ? {
            ...row,
            workDate: dayjs(row.workDate),
            storeId: matchingBranch?.id,
          }
        : {
            workDate: dayjs(activePeriod?.startDate),
            storeId: matchingBranch?.id,
            shiftStart: '09:00',
            shiftEnd: '18:00',
            ccRequiredCount: 2,
            cvRequiredCount: 5,
          }
    );
  };

  const openRoster = (row?: HolidayRosterEntry) => {
    setEditingRoster(row || null);
    setDrawerMode('roster');
    form.resetFields();
    form.setFieldsValue(
      row
        ? {
            ...row,
            workDate: dayjs(row.workDate),
            decisionReason: row.status === 'PAYROLL_EXCEPTION' ? '' : row.decisionReason,
          }
        : {
            workDate: dayjs(activePeriod?.startDate),
            status: canManage ? 'SCHEDULED' : 'NOMINATED',
            shiftStart: '09:00',
            shiftEnd: '18:00',
          }
    );
  };

  const openEvent = () => {
    setDrawerMode('event');
    form.resetFields();
    form.setFieldsValue({ eventType: 'NEGATIVE_FEEDBACK', source: 'CS', severity: 'MEDIUM', occurredAt: dayjs() });
  };

  const openAdjustment = (row: HolidayPayrollLedgerEntry) => {
    setEditingLedger(row);
    setDrawerMode('adjustment');
    form.resetFields();
    form.setFieldsValue({ amount: 0 });
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setEditingCoverage(null);
    setEditingRoster(null);
    setEditingLedger(null);
    form.resetFields();
  };

  const submitDrawer = async () => {
    const values = await form.validateFields();
    if (drawerMode === 'period') {
      const dates = values.dates as [Dayjs, Dayjs];
      await holiday.createPeriod({
        code: String(values.code).trim().toUpperCase(),
        name: values.name,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
        standardShiftHours: values.standardShiftHours,
        workPremiumMultiplier: values.workPremiumMultiplier,
        paidLeaveMultiplier: values.paidLeaveMultiplier,
        monthlyStandardDays: values.monthlyStandardDays,
        monthlyStandardHours: values.monthlyStandardHours,
        selectionWindowDays: values.selectionWindowDays,
        selectionWeights: {
          feedback: values.feedback,
          fix: values.fix,
          tip: values.tip,
          speed: values.speed,
          attendance: values.attendance,
        },
        notes: values.notes || null,
      });
    } else if (drawerMode === 'coverage') {
      const branch = holiday.branches.find((item) => item.id === values.storeId);
      if (!branch) {
        messageApi.error('Chi nhánh đã chọn không còn hoạt động.');
        return;
      }
      await holiday.saveBranchCoverage({
        workDate: values.workDate.format('YYYY-MM-DD'),
        storeId: branch.id,
        storeKey: branch.code,
        shiftStart: values.shiftStart,
        shiftEnd: values.shiftEnd,
        requiredByTeam: {
          CC: Number(values.ccRequiredCount || 0),
          CV: Number(values.cvRequiredCount || 0),
        },
        notes: values.notes || null,
        source: editingCoverage
          ? {
              workDate: editingCoverage.workDate,
              storeKey: editingCoverage.storeKey,
              shiftStart: editingCoverage.shiftStart,
              shiftEnd: editingCoverage.shiftEnd,
            }
          : null,
      });
    } else if (drawerMode === 'roster') {
      const candidate = candidateOptions.find((item) => item.legacyStaffId === values.legacyStaffId);
      const staffMatch = performanceStaffOptions.find((item) => item.legacyStaffId === values.legacyStaffId);
      await holiday.saveRoster(
        {
          workDate: values.workDate.format('YYYY-MM-DD'),
          crmStaffId: candidate?.crmStaffId || staffMatch?.id || editingRoster?.crmStaffId || null,
          legacyStaffId: values.legacyStaffId || editingRoster?.legacyStaffId || null,
          importedName: editingRoster?.importedName || null,
          displayName:
            candidate?.displayName || staffMatch?.displayName || editingRoster?.displayName || values.displayName,
          teamCode: candidate?.teamCode || editingRoster?.teamCode || values.teamCode,
          storeId: candidate?.storeId || editingRoster?.storeId || null,
          storeKey: candidate?.storeKey || editingRoster?.storeKey || values.storeKey || 'UNASSIGNED',
          shiftStart: values.shiftStart,
          shiftEnd: values.shiftEnd,
          status: canManage ? values.status : 'NOMINATED',
          nominationReason: values.nominationReason || null,
          decisionReason: values.decisionReason || null,
        },
        editingRoster?.id
      );
    } else if (drawerMode === 'event') {
      const candidate = candidateOptions.find((item) => item.legacyStaffId === values.legacyStaffId);
      const staff = performanceStaffOptions.find((item) => item.legacyStaffId === values.legacyStaffId);
      await holiday.saveEvent({
        legacyStaffId: values.legacyStaffId,
        crmStaffId: candidate?.crmStaffId || staff?.id || null,
        displayName: candidate?.displayName || staff?.displayName || values.displayName,
        eventType: values.eventType,
        source: values.source,
        severity: values.severity,
        occurredAt: values.occurredAt.toISOString(),
        storeId: candidate?.storeId || null,
        storeKey: candidate?.storeKey || null,
        relatedOrderId: values.relatedOrderId || null,
        relatedTicketId: values.relatedTicketId || null,
        evidenceUrl: values.evidenceUrl || null,
        note: values.note,
      });
    } else if (drawerMode === 'adjustment' && editingLedger) {
      await holiday.createPayrollAdjustment(editingLedger.id, values.amount, values.reason);
    }
    closeDrawer();
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction === 'publish') await holiday.publish();
      else await holiday.lockPayroll();
      setConfirmAction(null);
    } catch {
      // Error feedback is handled by useHolidayWork callbacks.
    }
  };

  return {
    messageContext,
    form,
    holiday,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    drawerMode,
    editingRoster,
    editingLedger,
    confirmAction,
    setConfirmAction,
    executeConfirmAction,
    workspace,
    canManage,
    canNominate,
    activePeriod,
    canAccessWorkspace,
    candidateOptions,
    performanceStaffOptions,
    adjustmentByLedger,
    coverageRows,
    candidateRows,
    rosterRows,
    ledgerRows,
    eventRows,
    unresolvedExceptionCount,
    pagination,
    openPeriod,
    openCoverage,
    openRoster,
    openEvent,
    openAdjustment,
    closeDrawer,
    submitDrawer,
  };
}
