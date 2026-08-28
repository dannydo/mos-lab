'use client';

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
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
  type HolidayCandidateScore,
  type HolidayPayrollLedgerEntry,
  type HolidayRosterEntry,
  type StaffPerformanceEvent,
  isAdminOrSuperAdminRole,
  removeVietnameseTones,
} from '@mos-lab/shared';
import {
  AdaptiveDrawer,
  DataSection,
  DataTable,
  FeaturePage,
  MetricGrid,
  ResponsiveFormField,
  ResponsiveFormGrid,
  StatePanel,
} from '~/components/ui';
import { HolidayCalendarSection } from './components/HolidayCalendarSection';
import { useHolidayWork } from './hooks/useHolidayWork';

const { Text, Paragraph } = Typography;
const PAGE_STATE_KEY = 'mos_holiday_work_table_state_v1';
const ACTIVE_TAB_KEY = 'mos_holiday_work_active_tab_v1';
type TabKey = 'coverage' | 'candidates' | 'roster' | 'ledger' | 'feedback';
type DrawerMode = 'period' | 'coverage' | 'roster' | 'event' | 'adjustment' | null;
type PageState = Record<TabKey, { current: number; pageSize: number }>;
type HolidayBranchCoverageRow = {
  key: string;
  workDate: string;
  storeId: number | null;
  storeKey: string;
  shiftStart: string;
  shiftEnd: string;
  ccRequiredCount: number;
  cvRequiredCount: number;
  requiredCount: number;
  notes?: string;
};

const defaultPageState: PageState = {
  coverage: { current: 1, pageSize: 10 },
  candidates: { current: 1, pageSize: 20 },
  roster: { current: 1, pageSize: 20 },
  ledger: { current: 1, pageSize: 20 },
  feedback: { current: 1, pageSize: 20 },
};

const rosterStatus: Record<string, { label: string; color: string }> = {
  NOMINATED: { label: 'Đề cử', color: 'blue' },
  SCHEDULED: { label: 'Đi làm', color: 'green' },
  HOLIDAY_OFF: { label: 'Nghỉ lễ', color: 'default' },
  BOOKED_OFF: { label: 'Book off', color: 'orange' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
  PAYROLL_EXCEPTION: { label: 'Ngoại lệ', color: 'red' },
};
const attendanceSourceLabel: Record<HolidayPayrollLedgerEntry['attendanceSource'], string> = {
  REPORT_STAFF_WORKING_MINUTE: 'report_staff.working_minute',
  STAFF_DAY_OFF_APPROVED: 'Leave đã duyệt',
  HOLIDAY_ROSTER_POLICY: 'Roster / chính sách lễ',
};

const money = (value: number) => `${Math.round(value || 0).toLocaleString('vi-VN')} đ`;
const normalizedIncludes = (value: unknown, search: string) =>
  removeVietnameseTones(String(value || '')).includes(removeVietnameseTones(search));

function CompactRecord({
  title,
  meta,
  tag,
  detail,
}: {
  title: string;
  meta: string;
  tag?: ReactNode;
  detail?: string;
}) {
  return (
    <Card size="small" className="w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{title}</div>
          <Text type="secondary" className="text-xs tabular-nums">
            {meta}
          </Text>
        </div>
        {tag}
      </div>
      {detail ? (
        <Paragraph className="mb-0 mt-2 text-xs" ellipsis={{ rows: 2 }}>
          {detail}
        </Paragraph>
      ) : null}
    </Card>
  );
}

export default function HolidayWorkPage() {
  const [messageApi, messageContext] = message.useMessage();
  const [form] = Form.useForm();
  const holiday = useHolidayWork({
    onSuccess: (text) => messageApi.success(text),
    onError: (text) => messageApi.error(text),
  });
  const [activeTab, setActiveTab] = useState<TabKey>('roster');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editingCoverage, setEditingCoverage] = useState<HolidayBranchCoverageRow | null>(null);
  const [editingRoster, setEditingRoster] = useState<HolidayRosterEntry | null>(null);
  const [editingLedger, setEditingLedger] = useState<HolidayPayrollLedgerEntry | null>(null);
  const [pageState, setPageState] = useState<PageState>(defaultPageState);

  useEffect(() => {
    const savedTab = window.localStorage.getItem(ACTIVE_TAB_KEY) as TabKey | null;
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
      ? rows.filter((row) => fields.some((field) => normalizedIncludes(row[field], deferredSearch)))
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

  const pagination = (key: TabKey, total: number): TablePaginationConfig => ({
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

  const candidateColumns: ColumnsType<HolidayCandidateScore> = [
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
              {row.teamCode} · {row.storeKey}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Điểm',
      dataIndex: 'totalScore',
      key: 'totalScore',
      align: 'right',
      sorter: (a, b) => (a.totalScore || 0) - (b.totalScore || 0),
      render: (value, row) =>
        row.dataSufficient ? (
          <Tooltip title={row.explanation.join(' ')}>
            <b className="tabular-nums">{Number(value).toFixed(2)}</b>
          </Tooltip>
        ) : (
          <Tag color="gold">Dữ liệu chưa đủ</Tag>
        ),
    },
    {
      title: 'Feedback / Fix',
      key: 'quality',
      render: (_, row) => (
        <span className="tabular-nums">
          {row.metrics.verifiedNegativeFeedbackCount} / {row.metrics.fixCount}
        </span>
      ),
    },
    {
      title: 'Tip',
      dataIndex: ['metrics', 'tipRate'],
      key: 'tip',
      render: (_, row) =>
        row.metrics.tipRate === null ? (
          '-'
        ) : (
          <span className="tabular-nums">{(row.metrics.tipRate * 100).toFixed(1)}%</span>
        ),
    },
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
      render: (value) => <Tag color={rosterStatus[value]?.color}>{rosterStatus[value]?.label || value}</Tag>,
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
    { title: 'Đơn giá', dataIndex: 'hourlyRate', key: 'hourlyRate', align: 'right', render: money },
    { title: 'Lễ 1x', dataIndex: 'baseHolidayAmount', key: 'baseHolidayAmount', align: 'right', render: money },
    {
      title: 'Phụ cấp x3',
      dataIndex: 'holidayPremiumAmount',
      key: 'holidayPremiumAmount',
      align: 'right',
      render: money,
    },
    {
      title: 'Cộng payroll',
      dataIndex: 'payrollAdditionAmount',
      key: 'payrollAdditionAmount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{money(value)}</b>,
    },
    {
      title: 'Adjustment',
      key: 'adjustment',
      align: 'right',
      render: (_, row) => <span className="tabular-nums">{money(adjustmentByLedger.get(row.id) || 0)}</span>,
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
                  <Tabs
                    activeKey={activeTab}
                    onChange={(key) => setActiveTab(key as TabKey)}
                    items={[
                      {
                        key: 'coverage',
                        label: `Nhu cầu (${coverageRows.length})`,
                        children: (
                          <DataTable
                            rowKey="key"
                            columns={coverageColumns}
                            dataSource={coverageRows}
                            pagination={pagination('coverage', coverageRows.length)}
                            mobileRenderer={(row) => (
                              <CompactRecord
                                title={row.storeKey}
                                meta={`${dayjs(row.workDate).format('DD/MM')} · ${row.shiftStart}–${row.shiftEnd}`}
                                tag={
                                  <Tag>
                                    CC {row.ccRequiredCount} · CV {row.cvRequiredCount}
                                  </Tag>
                                }
                                detail={row.notes || undefined}
                              />
                            )}
                          />
                        ),
                      },
                      {
                        key: 'candidates',
                        label: `Đề cử (${candidateRows.length})`,
                        children: (
                          <DataTable
                            rowKey="id"
                            columns={candidateColumns}
                            dataSource={candidateRows}
                            pagination={pagination('candidates', candidateRows.length)}
                            mobileRenderer={(row) => (
                              <CompactRecord
                                title={row.displayName}
                                meta={`${row.teamCode} · ${row.storeKey} · ${dayjs(row.workDate).format('DD/MM')}`}
                                tag={
                                  row.dataSufficient ? (
                                    <Tag color="blue">{row.totalScore?.toFixed(2)}</Tag>
                                  ) : (
                                    <Tag color="gold">Chưa đủ mẫu</Tag>
                                  )
                                }
                                detail={row.explanation.join(' ')}
                              />
                            )}
                          />
                        ),
                      },
                      {
                        key: 'roster',
                        label: `Roster (${rosterRows.length})`,
                        children: (
                          <DataTable
                            rowKey="id"
                            columns={rosterColumns}
                            dataSource={rosterRows}
                            pagination={pagination('roster', rosterRows.length)}
                            mobileRenderer={(row) => (
                              <CompactRecord
                                title={row.displayName}
                                meta={`${row.teamCode} · ${row.storeKey} · ${dayjs(row.workDate).format('DD/MM')}`}
                                tag={
                                  <Tag color={rosterStatus[row.status]?.color}>{rosterStatus[row.status]?.label}</Tag>
                                }
                                detail={row.decisionReason || row.nominationReason || undefined}
                              />
                            )}
                          />
                        ),
                      },
                      ...(canManage
                        ? [
                            {
                              key: 'ledger',
                              label: `Ledger (${ledgerRows.length})`,
                              children: (
                                <DataTable
                                  rowKey="id"
                                  columns={ledgerColumns}
                                  dataSource={ledgerRows}
                                  pagination={pagination('ledger', ledgerRows.length)}
                                  scroll={{ x: 1100 }}
                                  mobileRenderer={(row: HolidayPayrollLedgerEntry) => (
                                    <CompactRecord
                                      title={row.displayName}
                                      meta={`${dayjs(row.workDate).format('DD/MM')} · ${row.actualHours.toFixed(2)}h`}
                                      tag={
                                        <Tag color={row.ledgerStatus === 'EXCEPTION' ? 'red' : 'green'}>
                                          {row.ledgerStatus}
                                        </Tag>
                                      }
                                      detail={`1x ${money(row.baseHolidayAmount)} · x3 ${money(row.holidayPremiumAmount)} · Cộng ${money(row.payrollAdditionAmount)}`}
                                    />
                                  )}
                                />
                              ),
                            },
                          ]
                        : []),
                      {
                        key: 'feedback',
                        label: `Hiệu suất (${eventRows.length})`,
                        children: (
                          <DataTable
                            rowKey="id"
                            columns={eventColumns}
                            dataSource={eventRows}
                            pagination={pagination('feedback', eventRows.length)}
                            mobileRenderer={(row) => (
                              <CompactRecord
                                title={row.displayName}
                                meta={`${dayjs(row.occurredAt).format('DD/MM/YYYY')} · ${row.source}`}
                                tag={<Tag color={row.status === 'VERIFIED' ? 'green' : 'gold'}>{row.status}</Tag>}
                                detail={row.note}
                              />
                            )}
                          />
                        ),
                      },
                    ]}
                  />
                </DataSection>
              </Space>
            )
          ) : null}
        </Space>
      </FeaturePage>

      <AdaptiveDrawer
        open={Boolean(drawerMode)}
        intent="form"
        title={
          drawerMode === 'period'
            ? 'Tạo kỳ lễ'
            : drawerMode === 'coverage'
              ? 'Nhu cầu theo chi nhánh'
              : drawerMode === 'roster'
                ? 'Roster ngày lễ'
                : drawerMode === 'adjustment'
                  ? 'Adjustment sau khóa lương'
                  : 'Sự kiện hiệu suất'
        }
        onClose={closeDrawer}
        destroyOnHidden
        extra={
          <Button type="primary" loading={holiday.submitting} onClick={() => void submitDrawer()}>
            Lưu
          </Button>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {drawerMode === 'period' ? (
            <>
              <Form.Item name="code" label="Mã kỳ" rules={[{ required: true }]}>
                <Input placeholder="QUOC_KHANH_2026" />
              </Form.Item>
              <Form.Item name="name" label="Tên kỳ lễ" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="dates" label="Thời gian" rules={[{ required: true }]}>
                <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
              <Space wrap className="w-full" align="start">
                <Form.Item name="standardShiftHours" label="Giờ/ca">
                  <InputNumber min={1} max={24} />
                </Form.Item>
                <Form.Item name="workPremiumMultiplier" label="Phụ cấp đi làm (x)">
                  <InputNumber min={0} />
                </Form.Item>
                <Form.Item name="paidLeaveMultiplier" label="Nghỉ lễ (x)">
                  <InputNumber min={0} />
                </Form.Item>
                <Form.Item name="monthlyStandardDays" label="Ngày chuẩn/tháng">
                  <InputNumber min={1} />
                </Form.Item>
                <Form.Item name="monthlyStandardHours" label="Giờ chuẩn/tháng">
                  <InputNumber min={1} />
                </Form.Item>
                <Form.Item name="selectionWindowDays" label="Cửa sổ đánh giá">
                  <InputNumber min={1} max={365} addonAfter="ngày" />
                </Form.Item>
              </Space>
              <Text strong>Trọng số đề cử (%)</Text>
              <Space wrap className="mt-3" align="start">
                {['feedback', 'fix', 'tip', 'speed', 'attendance'].map((key) => (
                  <Form.Item key={key} name={key} label={key}>
                    <InputNumber min={0} max={100} />
                  </Form.Item>
                ))}
              </Space>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : drawerMode === 'coverage' ? (
            <>
              <Alert
                showIcon
                type="info"
                className="mb-4"
                message="Thiết lập một lần cho cả chi nhánh"
                description="Nhập số CC và CV cần có mặt trong cùng ngày và khung giờ. Hệ thống sẽ lưu hai nhu cầu riêng để đối chiếu roster."
              />
              <ResponsiveFormGrid columns={2}>
                <ResponsiveFormField>
                  <Form.Item name="workDate" label="Ngày" rules={[{ required: true }]}>
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </ResponsiveFormField>
                <ResponsiveFormField>
                  <Form.Item name="storeId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh.' }]}>
                    <Select
                      showSearch
                      placeholder="Chọn chi nhánh"
                      filterOption={(input, option) => normalizedIncludes(option?.label, input)}
                      options={holiday.branches.map((branch) => ({
                        value: branch.id,
                        label:
                          branch.name.trim().toUpperCase() === branch.code.trim().toUpperCase()
                            ? branch.name
                            : `${branch.name} (${branch.code})`,
                      }))}
                    />
                  </Form.Item>
                </ResponsiveFormField>
                <ResponsiveFormField>
                  <Form.Item name="shiftStart" label="Bắt đầu" rules={[{ required: true }]}>
                    <Input placeholder="09:00" />
                  </Form.Item>
                </ResponsiveFormField>
                <ResponsiveFormField>
                  <Form.Item name="shiftEnd" label="Kết thúc" rules={[{ required: true }]}>
                    <Input placeholder="18:00" />
                  </Form.Item>
                </ResponsiveFormField>
                <ResponsiveFormField>
                  <Form.Item
                    name="ccRequiredCount"
                    label="Số CC cần"
                    rules={[{ required: true, message: 'Nhập số CC cần.' }]}
                  >
                    <InputNumber className="w-full" min={0} precision={0} />
                  </Form.Item>
                </ResponsiveFormField>
                <ResponsiveFormField>
                  <Form.Item
                    name="cvRequiredCount"
                    label="Số CV cần"
                    dependencies={['ccRequiredCount']}
                    rules={[
                      { required: true, message: 'Nhập số CV cần.' },
                      ({ getFieldValue }) => ({
                        validator: () =>
                          Number(getFieldValue('ccRequiredCount') || 0) +
                            Number(getFieldValue('cvRequiredCount') || 0) >
                          0
                            ? Promise.resolve()
                            : Promise.reject(new Error('Cần ít nhất 1 CC hoặc CV.')),
                      }),
                    ]}
                  >
                    <InputNumber className="w-full" min={0} precision={0} />
                  </Form.Item>
                </ResponsiveFormField>
              </ResponsiveFormGrid>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : drawerMode === 'roster' ? (
            <>
              <Form.Item name="workDate" label="Ngày" rules={[{ required: true }]}>
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
              {!editingRoster ? (
                <Form.Item name="legacyStaffId" label="Nhân sự từ bảng xếp hạng" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    filterOption={(input, option) => normalizedIncludes(option?.label, input)}
                    options={candidateOptions.map((row) => ({
                      value: row.legacyStaffId,
                      label: `${row.displayName} · ${row.teamCode} · ${row.storeKey}`,
                    }))}
                  />
                </Form.Item>
              ) : !editingRoster.legacyStaffId ? (
                <Form.Item
                  name="legacyStaffId"
                  label="Gắn với hồ sơ nhân sự"
                  rules={[{ required: true, message: 'Chọn hồ sơ đúng để xử lý ngoại lệ tên.' }]}
                >
                  <Select
                    showSearch
                    filterOption={(input, option) => normalizedIncludes(option?.label, input)}
                    options={performanceStaffOptions.map((row) => ({
                      value: row.legacyStaffId as number,
                      label: `${row.displayName} · ${row.role}`,
                    }))}
                  />
                </Form.Item>
              ) : (
                <Alert
                  showIcon
                  message={editingRoster.displayName}
                  description={`${editingRoster.teamCode} · ${editingRoster.storeKey}`}
                  className="mb-4"
                />
              )}
              <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select
                  disabled={!canManage}
                  options={(canManage ? Object.keys(rosterStatus) : ['NOMINATED']).map((value) => ({
                    value,
                    label: rosterStatus[value].label,
                  }))}
                />
              </Form.Item>
              <Space className="w-full" align="start">
                <Form.Item name="shiftStart" label="Bắt đầu" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="shiftEnd" label="Kết thúc" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Space>
              <Form.Item name="nominationReason" label="Lý do đề cử" rules={canManage ? [] : [{ required: true }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
              {canManage ? (
                <Form.Item
                  name="decisionReason"
                  label="Lý do quyết định / ngoại lệ"
                  rules={
                    editingRoster?.status === 'PAYROLL_EXCEPTION'
                      ? [{ required: true, message: 'Ghi lý do xử lý ngoại lệ để lưu audit.' }]
                      : []
                  }
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
              ) : null}
            </>
          ) : drawerMode === 'event' ? (
            <>
              <Form.Item name="legacyStaffId" label="Nhân sự liên quan" rules={[{ required: true }]}>
                <Select
                  showSearch
                  filterOption={(input, option) => normalizedIncludes(option?.label, input)}
                  options={performanceStaffOptions.map((row) => ({
                    value: row.legacyStaffId as number,
                    label: `${row.displayName} · ${row.role}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="eventType" label="Loại sự kiện" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'NEGATIVE_FEEDBACK', label: 'Feedback tiêu cực' },
                    { value: 'UNAPPROVED_OFF', label: 'Off không duyệt' },
                    { value: 'LATE', label: 'Đi trễ' },
                    { value: 'EARLY_LEAVE', label: 'Về sớm' },
                    { value: 'TIME_ISSUE', label: 'Vấn đề thời gian' },
                  ]}
                />
              </Form.Item>
              <Space className="w-full" align="start">
                <Form.Item name="source" label="Nguồn" rules={[{ required: true }]}>
                  <Select options={['COUNTER', 'CS', 'HR', 'SYSTEM'].map((value) => ({ value }))} />
                </Form.Item>
                <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
                  <Select options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => ({ value }))} />
                </Form.Item>
              </Space>
              <Form.Item name="occurredAt" label="Thời điểm" rules={[{ required: true }]}>
                <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
              </Form.Item>
              <Space className="w-full" align="start">
                <Form.Item name="relatedOrderId" label="Order ID">
                  <InputNumber min={1} />
                </Form.Item>
                <Form.Item name="relatedTicketId" label="Ticket ID">
                  <InputNumber min={1} />
                </Form.Item>
              </Space>
              <Form.Item name="evidenceUrl" label="Link chứng cứ">
                <Input />
              </Form.Item>
              <Form.Item name="note" label="Nội dung" rules={[{ required: true }]}>
                <Input.TextArea rows={5} />
              </Form.Item>
            </>
          ) : drawerMode === 'adjustment' && editingLedger ? (
            <>
              <Alert
                showIcon
                type="warning"
                message={`${editingLedger.displayName} · ${dayjs(editingLedger.workDate).format('DD/MM/YYYY')}`}
                description={`Ledger gốc ${money(editingLedger.payrollAdditionAmount)} sẽ không bị ghi đè. Adjustment hiện tại: ${money(adjustmentByLedger.get(editingLedger.id) || 0)}.`}
                className="mb-4"
              />
              <Form.Item name="amount" label="Số tiền điều chỉnh (+/- VND)" rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={0} addonAfter="đ" />
              </Form.Item>
              <Form.Item name="reason" label="Lý do kiểm toán" rules={[{ required: true, min: 5 }]}>
                <Input.TextArea rows={5} placeholder="Nêu rõ căn cứ và người xác nhận…" />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </AdaptiveDrawer>
    </>
  );
}
