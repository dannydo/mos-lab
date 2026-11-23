import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook, fireEvent, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { TodayControlToolbar } from '../components/TodayControlToolbar';
import { useTodayFetching } from '../hooks/use-today-data/useTodayFetching';
import { CreateNoteModal } from '../../../../components/customer-detail/components/CreateNoteModal';

const apiMocks = vi.hoisted(() => ({
  getToday: vi.fn(),
  getRevenueHourly: vi.fn(),
  createNote: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    dashboard: {
      getToday: apiMocks.getToday,
      getRevenueHourly: apiMocks.getRevenueHourly,
    },
    customers: {
      createNote: apiMocks.createNote,
    },
  },
}));

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    dashboard: {
      getToday: apiMocks.getToday,
      getRevenueHourly: apiMocks.getRevenueHourly,
    },
    customers: {
      createNote: apiMocks.createNote,
    },
  },
}));

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'light',
  }),
}));

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    message: {
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('MOS-BUG-251: /dashboard/today stability & note draft protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    apiMocks.getToday.mockResolvedValue({
      branchesData: {
        detham: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
        pxl: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
        estella: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
      },
      bookingsCombo: [],
      bookingsOc: [],
      bookingsOther: [],
    });
    apiMocks.getRevenueHourly.mockResolvedValue({ summary: {}, hourlyBreakdown: [], branchHourlyMatrix: [] });
    apiMocks.createNote.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('TodayControlToolbar AutoRefreshCountdown', () => {
    it('pauses countdown and skips visibilitychange refresh while an overlay is open', () => {
      vi.useFakeTimers();
      const onTriggerSilentRefresh = vi.fn();

      const baseProps = {
        selectedDate: dayjs(),
        dateRangeMode: 'day' as const,
        periodLabel: dayjs().format('DD/MM/YYYY'),
        loading: false,
        silentLoading: false,
        autoRefresh: true,
        refreshInterval: 15,
        refreshResetSignal: 0,
        pauseAutoRefresh: true,
        mainViewMode: 'operations' as const,
        sandboxMode: 'live' as const,
        isSandbox: false,
        onDateRangeModeChange: vi.fn(),
        onPrevDate: vi.fn(),
        onNextDate: vi.fn(),
        onSelectDate: vi.fn(),
        onRefresh: vi.fn(),
        onToggleAutoRefresh: vi.fn(),
        onChangeRefreshInterval: vi.fn(),
        onTriggerSilentRefresh,
        onChangeMainViewMode: vi.fn(),
        onChangeSandboxMode: vi.fn(),
        onResetTrainingState: vi.fn(),
        onResetSalesState: vi.fn(),
      };

      const { rerender } = render(<TodayControlToolbar {...baseProps} />);

      act(() => {
        vi.advanceTimersByTime(20_000);
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(onTriggerSilentRefresh).not.toHaveBeenCalled();

      // Resume when overlay closes and advance full interval
      rerender(<TodayControlToolbar {...baseProps} pauseAutoRefresh={false} />);
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      expect(onTriggerSilentRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('useTodayFetching live mode transition guard', () => {
    it('does not double-fetch on mount or re-fetch dashboard when revenue filters change in live mode', async () => {
      const selectedDate = dayjs('2026-11-23');
      const optionsRef = { current: {} };
      const sandboxBase = {
        mode: 'live' as const,
        setMode: vi.fn(),
        isSandbox: false,
        staffOverrides: {},
        nowTickMs: 0,
        formatStaffTimerMMSS: () => '00:00',
        simulateStaffCheckIn: vi.fn(),
        simulateStaffCheckOut: vi.fn(),
        simulateStaffStartTimer: vi.fn(),
        simulateStaffStopTimer: vi.fn(),
        simulateBatchCheckInAll: vi.fn(),
        simulateBatchStartAllTimers: vi.fn(),
        resetTrainingState: vi.fn(),
        designPlanItems: [],
        materialsChecklist: [],
        materialReadyCount: 0,
        designPlanTotals: { completed: 0, target: 0 },
        updateDesignPlanTarget: vi.fn(),
        incrementDesignPlanDone: vi.fn(),
        resetDesignPlan: vi.fn(),
        toggleMaterialCheck: vi.fn(),
        cycleMaterialStatus: vi.fn(),
        resetMaterialsChecklist: vi.fn(),
        simulatedCombos: [],
        simulatedProducts: [],
        simulatedGifts: [],
        totalSimulatedRevenue: 0,
        totalSimulatedComboRevenue: 0,
        totalSimulatedProductRevenue: 0,
        baselineClosingRate: 0,
        closingRate: 0,
        closingUpliftPercent: 0,
        simulateAddCombo: vi.fn(),
        simulateAddProduct: vi.fn(),
        simulateAddGift: vi.fn(),
        resetSalesState: vi.fn(),
        presets: [],
        activePresetId: 'pa-1',
        applyPreset: vi.fn(),
        saveCurrentAsPreset: vi.fn(),
        simulatedActions: [],
        clearActionLog: vi.fn(),
        resetAllSandbox: vi.fn(),
      };

      const { rerender } = renderHook(
        ({ bookingBranch, showRevenueView, sandboxMode }: { bookingBranch: 'all' | 'detham'; showRevenueView: boolean; sandboxMode: 'live' | 'training' }) =>
          useTodayFetching({
            sandbox: { ...sandboxBase, mode: sandboxMode, isSandbox: sandboxMode !== 'live' },
            selectedDate,
            dateRangeMode: 'day',
            previousPeriod: null,
            bookingBranch,
            selectedBooker: null,
            showRevenueView,
            optionsRef,
          }),
        { initialProps: { bookingBranch: 'all', showRevenueView: false, sandboxMode: 'live' } }
      );

      await waitFor(() => {
        expect(apiMocks.getToday).toHaveBeenCalledTimes(1);
      });

      // Changing bookingBranch or showRevenueView must NOT re-trigger getToday
      rerender({ bookingBranch: 'detham', showRevenueView: true, sandboxMode: 'live' });
      await waitFor(() => {
        expect(apiMocks.getRevenueHourly).toHaveBeenCalledTimes(1);
      });
      expect(apiMocks.getToday).toHaveBeenCalledTimes(1);

      // Switching from training -> live SHOULD trigger a fresh getToday
      rerender({ bookingBranch: 'detham', showRevenueView: false, sandboxMode: 'training' });
      rerender({ bookingBranch: 'detham', showRevenueView: false, sandboxMode: 'live' });
      await waitFor(() => {
        expect(apiMocks.getToday).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('CreateNoteModal unsaved draft persistence', () => {
    it('preserves unsaved note draft across unexpected unmount/close and clears after save', async () => {
      const onCancel = vi.fn();
      const onSuccess = vi.fn();

      const { unmount } = render(
        <CreateNoteModal open={true} customerId={777} onCancel={onCancel} onSuccess={onSuccess} />
      );

      const textarea = screen.getByPlaceholderText(/Nhập nội dung ghi chú ở đây/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Khách dặn gọi lại lúc 16h' } });

      // Simulate unexpected unmount / page reset before saving
      unmount();

      // Reopen for the same customer -> draft must be restored
      render(<CreateNoteModal open={true} customerId={777} onCancel={onCancel} onSuccess={onSuccess} />);
      const restoredTextarea = screen.getByPlaceholderText(/Nhập nội dung ghi chú ở đây/i) as HTMLTextAreaElement;
      expect(restoredTextarea.value).toBe('Khách dặn gọi lại lúc 16h');
      expect(screen.getByText(/Đã khôi phục ghi chú nháp chưa lưu/i)).toBeInTheDocument();

      // Submit note -> clears draft
      fireEvent.click(screen.getByRole('button', { name: /Thêm ghi chú/i }));
      await waitFor(() => {
        expect(apiMocks.createNote).toHaveBeenCalledWith(777, {
          note: 'Khách dặn gọi lại lúc 16h',
          noteFieldKey: 'note',
          isSticky: false,
        });
      });
      expect(sessionStorage.getItem('mos_customer_note_draft:777')).toBeNull();
    });
  });
});
