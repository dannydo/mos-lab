'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnnualHolidayCalendarResponse,
  CreateStaffPerformanceEventRequest,
  CrmBranch,
  HolidayPeriod,
  HolidayRosterEntry,
  HolidayWorkspaceResponse,
  Staff,
  StaffPerformanceEvent,
  UpsertHolidayBranchCoverageRequest,
  UpsertHolidayPeriodRequest,
  UpsertHolidayRosterRequest,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';

const ACTIVE_PERIOD_KEY = 'mos_holiday_work_active_period_v1';

export function useHolidayWork(callbacks?: {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const callbacksRef = useRef(callbacks);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [calendar, setCalendar] = useState<AnnualHolidayCalendarResponse | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<CrmBranch[]>([]);
  const [periods, setPeriods] = useState<HolidayPeriod[]>([]);
  const [activePeriodId, setActivePeriodIdState] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<HolidayWorkspaceResponse | null>(null);
  const [events, setEvents] = useState<StaffPerformanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const setActivePeriodId = useCallback((id: number | null) => {
    setActivePeriodIdState(id);
    if (id) window.localStorage.setItem(ACTIVE_PERIOD_KEY, String(id));
    else window.localStorage.removeItem(ACTIVE_PERIOD_KEY);
  }, []);

  const loadWorkspace = useCallback(async (holidayId: number) => {
    setWorkspaceLoading(true);
    setError(null);
    try {
      const [nextWorkspace, eventResponse] = await Promise.all([
        apiClient.holidayWork.getWorkspace(holidayId),
        apiClient.holidayWork.listPerformanceEvents({ page: 1, limit: 100, status: 'ALL' }),
      ]);
      setWorkspace(nextWorkspace);
      setEvents(eventResponse.data);
    } catch (requestError) {
      const message = (requestError as SafeAny)?.response?.data?.message || 'Không thể tải workspace ngày lễ.';
      setError(message);
      callbacksRef.current?.onError?.(message);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCalendarError(null);
    try {
      const currentYear = Number(
        new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date())
      );
      const [user, annualCalendar] = await Promise.all([
        apiClient.auth.me(),
        apiClient.holidayWork.getAnnualCalendar({ year: currentYear }),
      ]);
      setCurrentUser(user);
      setCalendar(annualCalendar);
      const canAccessWorkspace = isAdminOrSuperAdminRole(user.role) || user.role === 'manager';
      if (!canAccessWorkspace) {
        setStaff([]);
        setBranches([]);
        setPeriods([]);
        setActivePeriodId(null);
        setWorkspace(null);
        setEvents([]);
        return;
      }
      const [periodResponse, staffRows, branchResponse] = await Promise.all([
        apiClient.holidayWork.listPeriods({ page: 1, limit: 100, status: 'ALL' }),
        apiClient.staff.list({ isActive: true }),
        apiClient.catalog.branches.list({ page: 1, pageSize: 100, isActive: true }),
      ]);
      setStaff(staffRows.filter((row) => row.isActive));
      setBranches(branchResponse.data.filter((branch) => branch.isActive && branch.storeType === 'SALON'));
      setPeriods(periodResponse.data);
      const storedId = Number(window.localStorage.getItem(ACTIVE_PERIOD_KEY));
      const nextId = periodResponse.data.some((period) => period.id === storedId)
        ? storedId
        : periodResponse.data[0]?.id || null;
      setActivePeriodId(nextId);
      if (nextId) await loadWorkspace(nextId);
      else setWorkspace(null);
    } catch (requestError) {
      const message = (requestError as SafeAny)?.response?.data?.message || 'Không thể tải lịch nghỉ lễ.';
      setError(message);
      setCalendarError(message);
      callbacksRef.current?.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [loadWorkspace, setActivePeriodId]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const selectPeriod = useCallback(
    async (holidayId: number) => {
      setActivePeriodId(holidayId);
      await loadWorkspace(holidayId);
    },
    [loadWorkspace, setActivePeriodId]
  );

  const runAction = useCallback(
    async <T>(action: () => Promise<T>, successMessage: string, refreshPeriods = false) => {
      setSubmitting(true);
      try {
        const result = await action();
        callbacksRef.current?.onSuccess?.(successMessage);
        if (refreshPeriods) await loadPeriods();
        else if (activePeriodId) await loadWorkspace(activePeriodId);
        return result;
      } catch (requestError) {
        const message = (requestError as SafeAny)?.response?.data?.message || 'Không thể hoàn tất thao tác.';
        callbacksRef.current?.onError?.(message);
        throw requestError;
      } finally {
        setSubmitting(false);
      }
    },
    [activePeriodId, loadPeriods, loadWorkspace]
  );

  const createPeriod = useCallback(
    (input: UpsertHolidayPeriodRequest) =>
      runAction(() => apiClient.holidayWork.createPeriod(input), 'Đã tạo kỳ lễ.', true),
    [runAction]
  );
  const saveBranchCoverage = useCallback(
    (input: UpsertHolidayBranchCoverageRequest) => {
      if (!activePeriodId) return Promise.reject(new Error('Missing active holiday period'));
      return runAction(
        () => apiClient.holidayWork.upsertBranchCoverage(activePeriodId, input),
        'Đã lưu nhu cầu CC/CV theo chi nhánh.'
      );
    },
    [activePeriodId, runAction]
  );
  const saveRoster = useCallback(
    (input: UpsertHolidayRosterRequest, rosterId?: number) => {
      if (!activePeriodId) return Promise.reject(new Error('Missing active holiday period'));
      return runAction(
        () =>
          rosterId
            ? apiClient.holidayWork.updateRoster(activePeriodId, rosterId, input)
            : apiClient.holidayWork.createRoster(activePeriodId, input),
        rosterId ? 'Đã cập nhật roster.' : 'Đã thêm nhân sự vào roster.'
      );
    },
    [activePeriodId, runAction]
  );
  const saveEvent = useCallback(
    (input: CreateStaffPerformanceEventRequest) =>
      runAction(() => apiClient.holidayWork.createPerformanceEvent(input), 'Đã ghi nhận sự kiện; chờ xác thực.'),
    [runAction]
  );
  const reviewEvent = useCallback(
    (eventId: number, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) =>
      runAction(
        () => apiClient.holidayWork.reviewPerformanceEvent(eventId, { status, rejectionReason }),
        status === 'VERIFIED' ? 'Đã xác thực sự kiện.' : 'Đã từ chối sự kiện.'
      ),
    [runAction]
  );

  return {
    currentUser,
    calendar,
    calendarError,
    staff,
    branches,
    periods,
    activePeriodId,
    workspace,
    events,
    loading,
    workspaceLoading,
    submitting,
    error,
    selectPeriod,
    reload: loadPeriods,
    refreshWorkspace: () => (activePeriodId ? loadWorkspace(activePeriodId) : Promise.resolve()),
    createPeriod,
    saveBranchCoverage,
    saveRoster,
    saveEvent,
    reviewEvent,
    createPayrollAdjustment: (ledgerId: number, amount: number, reason: string) =>
      activePeriodId
        ? runAction(
            () => apiClient.holidayWork.createPayrollAdjustment(activePeriodId, { ledgerId, amount, reason }),
            'Đã tạo adjustment; ledger gốc vẫn được giữ nguyên.'
          )
        : Promise.reject(new Error('Missing active holiday period')),
    generateCandidates: () =>
      activePeriodId
        ? runAction(() => apiClient.holidayWork.generateCandidates(activePeriodId), 'Đã chụp snapshot điểm đề cử.')
        : Promise.reject(new Error('Missing active holiday period')),
    recalculatePayroll: () =>
      activePeriodId
        ? runAction(() => apiClient.holidayWork.recalculatePayroll(activePeriodId), 'Đã tính lại ledger lương lễ.')
        : Promise.reject(new Error('Missing active holiday period')),
    publish: () =>
      activePeriodId
        ? runAction(() => apiClient.holidayWork.publish(activePeriodId), 'Đã publish roster.', true)
        : Promise.reject(new Error('Missing active holiday period')),
    lockPayroll: () =>
      activePeriodId
        ? runAction(() => apiClient.holidayWork.lockPayroll(activePeriodId), 'Đã khóa kỳ lương lễ.', true)
        : Promise.reject(new Error('Missing active holiday period')),
  };
}

export type HolidayRosterSelection = HolidayRosterEntry | null;
