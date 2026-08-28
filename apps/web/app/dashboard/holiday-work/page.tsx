'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
  type HolidayPayrollLedgerEntry,
  type HolidayRosterEntry,
  type StaffPerformanceEvent,
  isAdminOrSuperAdminRole,
} from '@mos-lab/shared';
import { DataSection, FeaturePage, MetricGrid, StatePanel } from '~/components/ui';
import { HolidayCalendarSection } from './components/HolidayCalendarSection';
import { holidayCandidateColumns } from './components/holidayCandidateColumns';
import { HolidayWorkDrawer, type HolidayWorkDrawerMode } from './components/HolidayWorkDrawer';
import { HolidayWorkspaceTabs } from './components/HolidayWorkspaceTabs';
import {
  formatHolidayMoney,
  holidayNormalizedIncludes,
  HOLIDAY_ROSTER_STATUS_META,
  type HolidayBranchCoverageRow,
  type HolidayWorkTabKey,
} from './components/holidayWorkPresentation';
import { useHolidayWork } from './hooks/useHolidayWork';

const { Text } = Typography;
const PAGE_STATE_KEY = 'mos_holiday_work_table_state_v1';
const ACTIVE_TAB_KEY = 'mos_holiday_work_active_tab_v1';
type PageState = Record<HolidayWorkTabKey, { current: number; pageSize: number }>;

const defaultPageState: PageState = {
  coverage: { current: 1, pageSize: 10 },
  candidates: { current: 1, pageSize: 20 },
  roster: { current: 1, pageSize: 20 },
  ledger: { current: 1, pageSize: 20 },
  feedback: { current: 1, pageSize: 20 },
};

const attendanceSourceLabel: Record<HolidayPayrollLedgerEntry['attendanceSource'], string> = {
  REPORT_STAFF_WORKING_MINUTE: 'report_staff.working_minute',
  STAFF_DAY_OFF_APPROVED: 'Leave đã duyệt',
  HOLIDAY_ROSTER_POLICY: 'Roster / chính sách lễ',
};

export default function HolidayWorkPage() {
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
  const [pageState, setPageState] = useState<PageState>(defaultPageState);

  useEffect(() => {
    const savedTab = window.localStorage.getItem(ACTIVE_TAB_KEY) as HolidayWorkTabKey | null;
    if (savedTab && Object.prototype.hasOwnProperty.call(defaultPageState, savedTab)) setActiveTab(savedTab);
    try {
      const savedState = JSON.parse(window.localStorage.getItem(PAGE_STATE_KEY) || 'null') as Partial<PageState> | null;
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
  const adjustmentByLedger = useMemo(() => {
    const result = new Map<number, number>();
    (workspace?.adjustments || []).forEach((item) =>
      result.set(item.ledgerId, (result.get(item.ledgerId) || 0) + item.amount)
    );
    return result;
  }, [workspace?.adjustments]);

  const filterRows = <T extends object>(rows: T[], fields: Array<keyof T>) =>
    deferredSearch
      ? rows.filter((row) => fields.some((field) => holidayNormalizedIncludes(row[field], deferredSearch)))
      : rows;

  const branchCoverage = useMemo(() => {
    const grouped = new Map<string, HolidayBranchCoverageRow>();
    (workspace?.coverage || []).forEach((row) => {
      if (row.teamCode !== 'CC' && row.teamCode !== 'CV') return;
      const key = [row.workDate, row.storeKey, row.shiftStart, row.shiftEnd].join('|');
      const current = grouped.get(key) || {
        key,
        workDate: row.workDate,
        storeId: row.storeId || null,
        storeKey: row.storeKey,
        shiftStart: row.shiftStart,
        shiftEnd: row.shiftEnd,
        ccRequiredCount: 0,
        cvRequiredCount: 0,
        requiredCount: 0,
        notes: row.notes || undefined,
      };
      if (row.teamCode === 'CC') current.ccRequiredCount = row.requiredCount;
      if (row.teamCode === 'CV') current.cvRequiredCount = row.requiredCount;
      current.requiredCount = current.ccRequiredCount + current.cvRequiredCount;
      current.notes ||= row.notes || undefined;
      grouped.set(key, current);
    });
    return [...grouped.values()];
  }, [workspace?.coverage]);
  const coverageRows = filterRows(branchCoverage, ['workDate', 'storeKey']);
  const candidateRows = filterRows(workspace?.candidates || [], ['displayName', 'teamCode', 'storeKey']);
  const rosterRows = filterRows(workspace?.roster || [], ['displayName', 'teamCode', 'storeKey', 'status']);
  const ledgerRows = filterRows(workspace?.ledger || [], ['displayName', 'teamCode', 'storeKey', 'ledgerStatus']);
  const eventRows = filterRows(holiday.events, ['displayName', 'eventType', 'source', 'status']);

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

  const coverageColumns: ColumnsType<HolidayBranchCoverageRow> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM/YYYY')}</span>,
    },
    { title: 'Chi nhánh', dataIndex: 'storeKey', key: 'storeKey' },
    {
      title: 'Khung giờ',
      key: 'shift',
      render: (_, row) => (
        <span className="tabular-nums">
          {row.shiftStart}–{row.shiftEnd}
        </span>
      ),
    },
    {
      title: 'CC cần',
      dataIndex: 'ccRequiredCount',
      key: 'ccRequiredCount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{value}</b>,
    },
    {
      title: 'CV cần',
      dataIndex: 'cvRequiredCount',
      key: 'cvRequiredCount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{value}</b>,
    },
    {
      title: 'Tổng',
      dataIndex: 'requiredCount',
      key: 'requiredCount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{value}</b>,
    },
    ...(canManage
      ? [
          {
            title: '',
            key: 'action',
            width: 48,
            render: (_: unknown, row: HolidayBranchCoverageRow) => (
              <Button
                aria-label="Sửa nhu cầu chi nhánh"
                type="text"
                icon={<EditOutlined />}
                onClick={() => openCoverage(row)}
              />
            ),
          },
        ]
      : []),
  ];

  const rosterColumns: ColumnsType<HolidayRosterEntry> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM')}</span>,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (value, row) => (
        <div>
          <b>{value}</b>
          {row.importedName && row.importedName !== value ? (
            <div>
              <Text type="secondary" className="text-xs">
                Ảnh: {row.importedName}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    { title: 'Đội / Chi nhánh', key: 'team', render: (_, row) => `${row.teamCode} · ${row.storeKey}` },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value) => (
        <Tag color={HOLIDAY_ROSTER_STATUS_META[value]?.color}>{HOLIDAY_ROSTER_STATUS_META[value]?.label || value}</Tag>
      ),
    },
    {
      title: 'Lý do / ghi chú',
      key: 'reason',
      ellipsis: true,
      render: (_, row) => row.decisionReason || row.nominationReason || '-',
    },
    ...(canNominate
      ? [
          {
            title: '',
            key: 'action',
            width: 48,
            render: (_: unknown, row: HolidayRosterEntry) => (
              <Button aria-label="Sửa roster" type="text" icon={<EditOutlined />} onClick={() => openRoster(row)} />
            ),
          },
        ]
      : []),
  ];

  const ledgerColumns: ColumnsType<HolidayPayrollLedgerEntry> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM')}</span>,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (value, row) => (
        <div>
          <b>{value}</b>
          <div>
            <Text type="secondary" className="text-xs">
              {row.payBasis || 'Thiếu pay basis'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'attendanceSource',
      key: 'attendanceSource',
      render: (value: HolidayPayrollLedgerEntry['attendanceSource']) => (
        <Text type="secondary" className="text-xs">
          {attendanceSourceLabel[value]}
        </Text>
      ),
    },
    {
      title: 'Giờ thực tế',
      dataIndex: 'actualHours',
      key: 'actualHours',
      align: 'right',
      render: (value) => <span className="tabular-nums">{Number(value).toFixed(2)}h</span>,
    },
    { title: 'Đơn giá', dataIndex: 'hourlyRate', key: 'hourlyRate', align: 'right', render: formatHolidayMoney },
    {
      title: 'Lễ 1x',
      dataIndex: 'baseHolidayAmount',
      key: 'baseHolidayAmount',
      align: 'right',
      render: formatHolidayMoney,
    },
    {
      title: 'Phụ cấp x3',
      dataIndex: 'holidayPremiumAmount',
      key: 'holidayPremiumAmount',
      align: 'right',
      render: formatHolidayMoney,
    },
    {
      title: 'Cộng payroll',
      dataIndex: 'payrollAdditionAmount',
      key: 'payrollAdditionAmount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{formatHolidayMoney(value)}</b>,
    },
    {
      title: 'Adjustment',
      key: 'adjustment',
      align: 'right',
      render: (_, row) => (
        <span className="tabular-nums">{formatHolidayMoney(adjustmentByLedger.get(row.id) || 0)}</span>
      ),
    },
    {
      title: 'Ledger',
      dataIndex: 'ledgerStatus',
      key: 'ledgerStatus',
      render: (value, row) => (
        <Tooltip title={row.exceptionMessage}>
          <Tag color={value === 'EXCEPTION' ? 'red' : value === 'LOCKED' ? 'green' : 'blue'}>{value}</Tag>
        </Tooltip>
      ),
    },
    ...(canManage && activePeriod?.status === 'PAYROLL_LOCKED'
      ? [
          {
            title: '',
            key: 'action',
            width: 48,
            render: (_: unknown, row: HolidayPayrollLedgerEntry) => (
              <Button
                aria-label="Tạo adjustment"
                type="text"
                icon={<EditOutlined />}
                onClick={() => openAdjustment(row)}
              />
            ),
          },
        ]
      : []),
  ];

  const eventColumns: ColumnsType<StaffPerformanceEvent> = [
    {
      title: 'Ngày',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM/YYYY')}</span>,
    },
    { title: 'Nhân sự', dataIndex: 'displayName', key: 'displayName', render: (value) => <b>{value}</b> },
    {
      title: 'Loại / nguồn',
      key: 'type',
      render: (_, row) => (
        <div>
          {row.eventType}
          <div>
            <Text type="secondary" className="text-xs">
              {row.source} · {row.severity}
            </Text>
          </div>
        </div>
      ),
    },
    { title: 'Nội dung', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value) => (
        <Tag color={value === 'VERIFIED' ? 'green' : value === 'REJECTED' ? 'red' : 'gold'}>{value}</Tag>
      ),
    },
    ...(canManage
      ? [
          {
            title: '',
            key: 'action',
            width: 92,
            render: (_: unknown, row: StaffPerformanceEvent) =>
              row.status === 'PENDING' ? (
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => void holiday.reviewEvent(row.id, 'VERIFIED')}
                >
                  Duyệt
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  const summary = activePeriod?.summary;
  const unresolvedExceptionCount =
    summary?.payrollExceptions ??
    (workspace?.roster.filter((row) => row.status === 'PAYROLL_EXCEPTION').length || 0) +
      (workspace?.ledger.filter((row) => row.ledgerStatus === 'EXCEPTION').length || 0);
  const metrics = [
    {
      key: 'coverage',
      title: 'Nhu cầu',
      value: summary?.coverageRequired || workspace?.coverage.reduce((sum, row) => sum + row.requiredCount, 0) || 0,
      icon: <TeamOutlined />,
    },
    {
      key: 'scheduled',
      title: 'Đã xếp đi làm',
      value: summary?.scheduled || workspace?.roster.filter((row) => row.status === 'SCHEDULED').length || 0,
      icon: <CalendarOutlined />,
    },
    {
      key: 'exception',
      title: 'Ngoại lệ payroll',
      value: unresolvedExceptionCount,
      icon: <SafetyCertificateOutlined />,
    },
    {
      key: 'payroll',
      title: 'Cộng lương lễ',
      value:
        summary?.totalPayrollAddition ||
        workspace?.ledger.reduce((sum, row) => sum + row.payrollAdditionAmount, 0) ||
        0,
      format: 'vnd' as const,
      icon: <DollarOutlined />,
    },
  ];

  if (holiday.loading) return <StatePanel kind="loading" title="Đang tải hệ thống ngày lễ…" minHeight={520} />;

  return (
    <>
      {messageContext}
      <FeaturePage
        title="Lịch nghỉ lễ & đi làm ngày lễ"
        subtitle="Nhân sự xem lịch để chủ động kế hoạch; Manager và Admin quản lý roster, chấm công và lương lễ."
        icon={<CalendarOutlined />}
        tag={
          canAccessWorkspace && activePeriod ? (
            <Tag
              color={activePeriod.status === 'DRAFT' ? 'gold' : activePeriod.status === 'PUBLISHED' ? 'blue' : 'green'}
            >
              {activePeriod.status}
            </Tag>
          ) : holiday.calendar ? (
            <Tag color="blue">Năm {holiday.calendar.year}</Tag>
          ) : null
        }
        headerActions={
          canManage ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openPeriod}>
              Tạo kỳ lễ
            </Button>
          ) : null
        }
        toolbar={
          canAccessWorkspace
            ? {
                primary: (
                  <Select
                    value={holiday.activePeriodId || undefined}
                    placeholder="Chọn kỳ lễ"
                    style={{ minWidth: 260 }}
                    options={holiday.periods.map((period) => ({
                      value: period.id,
                      label: `${period.name} · ${dayjs(period.startDate).format('DD/MM/YYYY')}`,
                    }))}
                    onChange={(value) => void holiday.selectPeriod(value)}
                  />
                ),
                filters: (
                  <Input.Search
                    allowClear
                    value={search}
                    placeholder="Tìm nhân sự, đội, chi nhánh…"
                    onChange={(event) => setSearch(event.target.value)}
                    style={{ width: 280 }}
                  />
                ),
                actions: (
                  <Button
                    icon={<ReloadOutlined />}
                    loading={holiday.workspaceLoading}
                    onClick={() => void holiday.refreshWorkspace()}
                  >
                    Làm mới
                  </Button>
                ),
                activeFilterCount: search ? 1 : 0,
                filterTitle: 'Tìm trong workspace',
              }
            : undefined
        }
      >
        <Space direction="vertical" size={20} className="w-full">
          <HolidayCalendarSection
            data={holiday.calendar}
            loading={holiday.loading}
            error={holiday.calendarError}
            onRetry={() => void holiday.reload()}
          />
          {canAccessWorkspace ? (
            !activePeriod ? (
              <StatePanel
                kind="empty"
                title="Chưa có kỳ lễ nội bộ"
                description="Admin tạo kỳ lễ để bắt đầu thiết lập nhu cầu và roster Wings."
                extra={
                  canManage ? (
                    <Button type="primary" onClick={openPeriod}>
                      Tạo kỳ lễ
                    </Button>
                  ) : null
                }
              />
            ) : holiday.error ? (
              <StatePanel
                kind="error"
                title="Không thể tải workspace quản trị"
                description={holiday.error}
                extra={<Button onClick={() => void holiday.reload()}>Thử lại</Button>}
              />
            ) : (
              <Space direction="vertical" size={16} className="w-full">
                <Alert
                  showIcon
                  type="info"
                  message="Chính sách đang áp dụng"
                  description={`Đi làm có roster + chấm công: 1x thực tế + ${activePeriod.workPremiumMultiplier}x phụ cấp. Nghỉ lễ: ${activePeriod.paidLeaveMultiplier}x ca ${activePeriod.standardShiftHours} giờ. Lương tháng dùng đơn giá lương cứng ÷ ${activePeriod.monthlyStandardHours} giờ.`}
                />
                <MetricGrid items={metrics} columns={4} className="holiday-work-metric-grid" />
                <DataSection
                  title="Workspace kỳ lễ"
                  state={holiday.workspaceLoading ? 'loading' : undefined}
                  extra={
                    <Space wrap>
                      {activeTab === 'coverage' && canManage ? (
                        <Button icon={<PlusOutlined />} onClick={() => openCoverage()}>
                          Cấu hình chi nhánh
                        </Button>
                      ) : null}
                      {activeTab === 'roster' && canNominate ? (
                        <Button icon={<PlusOutlined />} onClick={() => openRoster()}>
                          Thêm roster
                        </Button>
                      ) : null}
                      {activeTab === 'feedback' ? (
                        <Button icon={<PlusOutlined />} onClick={openEvent}>
                          Ghi nhận sự kiện
                        </Button>
                      ) : null}
                      {activeTab === 'candidates' && canNominate ? (
                        <Button
                          icon={<AuditOutlined />}
                          loading={holiday.submitting}
                          onClick={() => void holiday.generateCandidates()}
                        >
                          Chấm điểm
                        </Button>
                      ) : null}
                      {activeTab === 'ledger' && canManage ? (
                        <Button
                          icon={<DollarOutlined />}
                          loading={holiday.submitting}
                          onClick={() => void holiday.recalculatePayroll()}
                        >
                          Tính lại lương
                        </Button>
                      ) : null}
                      {canManage && activePeriod.status === 'DRAFT' ? (
                        <Tooltip
                          title={
                            unresolvedExceptionCount > 0
                              ? `Còn ${unresolvedExceptionCount} ngoại lệ cần HR xử lý trước khi publish.`
                              : undefined
                          }
                        >
                          <Button
                            type="primary"
                            disabled={unresolvedExceptionCount > 0}
                            onClick={() =>
                              Modal.confirm({
                                title: 'Publish roster?',
                                content: 'Hệ thống sẽ kiểm tra coverage và tất cả ngoại lệ tên trước khi publish.',
                                onOk: () => holiday.publish(),
                              })
                            }
                          >
                            Publish roster
                          </Button>
                        </Tooltip>
                      ) : null}
                      {canManage && activePeriod.status === 'PUBLISHED' ? (
                        <Button
                          danger
                          icon={<LockOutlined />}
                          onClick={() =>
                            Modal.confirm({
                              title: 'Khóa kỳ lương lễ?',
                              content: 'Mọi ngoại lệ phải được xử lý. Sau khi khóa, ledger không thể ghi đè.',
                              onOk: () => holiday.lockPayroll(),
                            })
                          }
                        >
                          Khóa lương
                        </Button>
                      ) : null}
                    </Space>
                  }
                >
                  <HolidayWorkspaceTabs
                    activeTab={activeTab}
                    canManage={canManage}
                    coverageRows={coverageRows}
                    candidateRows={candidateRows}
                    rosterRows={rosterRows}
                    ledgerRows={ledgerRows}
                    eventRows={eventRows}
                    coverageColumns={coverageColumns}
                    candidateColumns={holidayCandidateColumns}
                    rosterColumns={rosterColumns}
                    ledgerColumns={ledgerColumns}
                    eventColumns={eventColumns}
                    pagination={pagination}
                    onTabChange={setActiveTab}
                  />
                </DataSection>
              </Space>
            )
          ) : null}
        </Space>
      </FeaturePage>

      <HolidayWorkDrawer
        form={form}
        mode={drawerMode}
        canManage={canManage}
        branches={holiday.branches}
        candidateOptions={candidateOptions}
        staffOptions={performanceStaffOptions}
        editingRoster={editingRoster}
        editingLedger={editingLedger}
        adjustmentTotal={editingLedger ? adjustmentByLedger.get(editingLedger.id) || 0 : 0}
        submitting={holiday.submitting}
        onClose={closeDrawer}
        onSubmit={submitDrawer}
      />
    </>
  );
}
