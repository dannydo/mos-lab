import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  TodaySandboxProvider,
  useTodaySandbox,
} from '../context/SandboxModeContext';
import {
  getTrainingMockBranchesData,
  getTrainingMockBookings,
  getSalesMockBranchesData,
  getSalesMockBookings,
} from '../hooks/mockTodayData';
import TodayStaffAttendance from '../components/TodayStaffAttendance';
import { RevenueDetailModal } from '../components/RevenueDetailModal';

// Mock ant design message
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

describe('mOS Dashboard Today — Sandbox Modes (MOS-FEAT-236)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('SandboxModeContext', () => {
    it('defaults to live mode with isSandbox=false', () => {
      const { result } = renderHook(() => useTodaySandbox(), {
        wrapper: ({ children }) => <TodaySandboxProvider>{children}</TodaySandboxProvider>,
      });

      expect(result.current.mode).toBe('live');
      expect(result.current.isSandbox).toBe(false);
    });

    it('switches between live, training, and sales modes', () => {
      const { result } = renderHook(() => useTodaySandbox(), {
        wrapper: ({ children }) => <TodaySandboxProvider>{children}</TodaySandboxProvider>,
      });

      act(() => {
        result.current.setMode('training');
      });
      expect(result.current.mode).toBe('training');
      expect(result.current.isSandbox).toBe(true);

      act(() => {
        result.current.setMode('sales');
      });
      expect(result.current.mode).toBe('sales');
      expect(result.current.isSandbox).toBe(true);

      act(() => {
        result.current.setMode('live');
      });
      expect(result.current.mode).toBe('live');
      expect(result.current.isSandbox).toBe(false);
    });

    it('simulates staff check-in, start timer, and check-out in training mode', () => {
      const { result } = renderHook(() => useTodaySandbox(), {
        wrapper: ({ children }) => <TodaySandboxProvider>{children}</TodaySandboxProvider>,
      });

      act(() => {
        result.current.setMode('training');
      });

      // Initially CV Thu Thảo is not checked in
      expect(result.current.staffOverrides['CV Thu Thảo']?.attendance).toBe('none');

      // Check-in CV Thu Thảo
      act(() => {
        result.current.simulateStaffCheckIn('CV Thu Thảo', 'CV');
      });
      expect(result.current.staffOverrides['CV Thu Thảo']?.attendance).toBe('checked_in');
      expect(result.current.staffOverrides['CV Thu Thảo']?.status).toBe('available');

      // Start timer for CV Thu Thảo
      act(() => {
        result.current.simulateStaffStartTimer('CV Thu Thảo', 'Nối Mi Classic Thiết Kế (60p)', 60);
      });
      expect(result.current.staffOverrides['CV Thu Thảo']?.status).toBe('busy');
      expect(result.current.staffOverrides['CV Thu Thảo']?.timerStartedAt).toBeTypeOf('number');

      // Stop timer / complete service
      act(() => {
        result.current.simulateStaffStopTimer('CV Thu Thảo');
      });
      expect(result.current.staffOverrides['CV Thu Thảo']?.status).toBe('available');

      // Check-out end of shift
      act(() => {
        result.current.simulateStaffCheckOut('CV Thu Thảo', 'CV');
      });
      expect(result.current.staffOverrides['CV Thu Thảo']?.attendance).toBe('checked_out');
    });

    it('simulates batch check-in and timer start across all staff', () => {
      const { result } = renderHook(() => useTodaySandbox(), {
        wrapper: ({ children }) => <TodaySandboxProvider>{children}</TodaySandboxProvider>,
      });

      act(() => {
        result.current.setMode('training');
        result.current.simulateBatchCheckInAll('ALL');
      });

      expect(result.current.staffOverrides['CV Thu Thảo']?.attendance).toBe('checked_in');
      expect(result.current.staffOverrides['CC Diệu Nhi']?.attendance).toBe('checked_in');

      act(() => {
        result.current.simulateBatchStartAllTimers();
      });

      expect(result.current.staffOverrides['CV Mai Phương']?.status).toBe('busy');
      expect(result.current.staffOverrides['CV Thu Thảo']?.status).toBe('busy');
    });

    it('simulates closing combo packages, adding products and gifts in sales mode', () => {
      const { result } = renderHook(() => useTodaySandbox(), {
        wrapper: ({ children }) => <TodaySandboxProvider>{children}</TodaySandboxProvider>,
      });

      act(() => {
        result.current.setMode('sales');
      });

      const initialComboCount = result.current.simulatedCombos.length;
      const initialRev = result.current.totalSimulatedRevenue;

      // Add Combo 10 tặng 6
      act(() => {
        result.current.simulateAddCombo({
          name: 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)',
          price: 2_500_000,
          customerName: 'Chị Diễm Quỳnh',
        });
      });

      expect(result.current.simulatedCombos.length).toBe(initialComboCount + 1);
      expect(result.current.totalSimulatedComboRevenue).toBeGreaterThanOrEqual(2_500_000);
      expect(result.current.totalSimulatedRevenue).toBe(initialRev + 2_500_000);

      // Add product
      act(() => {
        result.current.simulateAddProduct({
          name: 'Serum Dưỡng Mi FKN',
          price: 350_000,
        });
      });

      expect(result.current.totalSimulatedProductRevenue).toBeGreaterThanOrEqual(350_000);

      // Add gift
      act(() => {
        result.current.simulateAddGift({
          name: 'Cọ chải mi pha lê Wings',
          estimatedValue: 120_000,
        });
      });
      expect(result.current.simulatedGifts.length).toBeGreaterThanOrEqual(1);

      // Reset
      act(() => {
        result.current.resetSalesState();
      });
      expect(result.current.simulatedCombos.length).toBe(1);
    });
  });

  describe('Mock Data Generators', () => {
    it('generates training mock branches and bookings with overridden staff state', () => {
      const overrides = {
        'CV Lan Anh': {
          attendance: 'checked_in' as const,
          status: 'busy' as const,
          doing: 'Đang làm mi Classic 60p',
        },
      };

      const branches = getTrainingMockBranchesData(overrides);
      expect(branches.detham).toBeDefined();
      expect(branches.detham.cv.length).toBeGreaterThan(0);
      const lanAnh = branches.detham.cv.find((c) => c.name === 'CV Lan Anh');
      expect(lanAnh?.status).toBe('busy');

      const bookings = getTrainingMockBookings();
      expect(bookings.combo.length).toBeGreaterThan(0);
      expect(bookings.other.length).toBeGreaterThan(0);
    });

    it('generates sales mock branches and bookings factoring in simulated combos', () => {
      const simulatedCombos = [
        {
          id: 'combo-1',
          name: 'Combo 10 Tặng 6',
          price: 2_500_000,
          customerName: 'Chị Lan',
          ccName: 'CC Thảo My',
          cvName: 'CV Lan Anh',
          time: '14:30',
        },
      ];

      const branches = getSalesMockBranchesData(simulatedCombos, []);
      expect(branches.detham.revCombo).toBe(5_000_000 + 2_500_000);

      const bookings = getSalesMockBookings(simulatedCombos, []);
      expect(bookings.combo.some((b) => b.customer.includes('Chị Lan'))).toBe(true);
    });
  });

  describe('TodayStaffAttendance Component (Training Mode)', () => {
    it('renders training simulation toolbar and actions when in training mode', () => {
      const mockToken = {
        colorPrimary: '#D4A84B',
        colorTextDescription: '#8c8c8c',
      };

      const cvList = [
        {
          id: 101,
          name: 'CV Lan Anh',
          branchName: 'Đề Thám',
          doing: 'Đang làm mi',
          clients: 2,
          bookedCount: 3,
          doneCount: 1,
          shift: 'sáng' as const,
          attendance: 'checked_in' as const,
          status: 'available' as const,
        },
        {
          id: 102,
          name: 'CV Thu Thảo',
          branchName: 'Đề Thám',
          doing: 'Chưa check-in',
          clients: 0,
          bookedCount: 1,
          doneCount: 0,
          shift: 'chiều' as const,
          attendance: 'none' as const,
          status: 'available' as const,
        },
        {
          id: 103,
          name: 'CV Mai Phương',
          branchName: 'Đề Thám',
          doing: 'Sẵn sàng nhận khách',
          clients: 1,
          bookedCount: 2,
          doneCount: 1,
          shift: 'full' as const,
          attendance: 'checked_in' as const,
          status: 'available' as const,
        },
      ];

      const ccList = [
        {
          name: 'CC Thảo My',
          doing: 'Đang tiếp đón',
          clients: 3,
          combos: 1,
          revenue: 2500000,
          shift: 'full' as const,
          attendance: 'checked_in' as const,
        },
      ];

      // Render within Provider set to training mode
      const TestWrapper = () => {
        const sandbox = useTodaySandbox();
        React.useEffect(() => {
          sandbox.setMode('training');
        }, []);
        return (
          <TodayStaffAttendance
            themeMode="light"
            token={mockToken}
            cvList={cvList}
            ccList={ccList}
          />
        );
      };

      render(
        <TodaySandboxProvider>
          <TestWrapper />
        </TodaySandboxProvider>
      );

      // Verify Training Sandbox toolbar is visible
      expect(screen.getByText(/Phòng Tập Chấm Công & Bấm Giờ Phục Vụ/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Check-in toàn bộ ca/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bấm giờ đồng loạt/i })).toBeInTheDocument();

      // Verify specific training actions exist for staff
      expect(screen.getByRole('button', { name: /Giả lập check-in cho CV Thu Thảo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hoàn tất phục vụ cho CV Lan Anh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bấm giờ phục vụ cho CV Mai Phương/i })).toBeInTheDocument();
    });
  });

  describe('RevenueDetailModal Component (Sales Simulation)', () => {
    it('renders sales simulation controls and simulated transactions when in sales mode', () => {
      const mockToken = {
        colorPrimary: '#D4A84B',
        colorTextSecondary: '#8c8c8c',
      };

      const TestWrapper = () => {
        const sandbox = useTodaySandbox();
        React.useEffect(() => {
          sandbox.setMode('sales');
        }, []);
        return (
          <RevenueDetailModal
            themeMode="light"
            token={mockToken}
            open={true}
            onClose={vi.fn()}
            context={{ hour: '14:00', branchKey: 'detham', branchName: 'Đề Thám' }}
            dateFrom="2026-11-18"
            dateTo="2026-11-18"
            openCustomerDrawer={vi.fn()}
          />
        );
      };

      render(
        <TodaySandboxProvider>
          <TestWrapper />
        </TodaySandboxProvider>
      );

      // Verify Sales Simulation banner and quick action buttons
      expect(screen.getByText(/Giả Lập Bán Hàng & Chốt Gói \(Sales Simulation\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Giả lập chốt Combo 10 tặng 6/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Giả lập chốt Combo Mi Dưỡng/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Giả lập thêm Serum dưỡng mi/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Giả lập tặng quà VIP/i })).toBeInTheDocument();

      // Click button to add Combo 10 tặng 6
      const addComboBtn = screen.getByRole('button', { name: /Giả lập chốt Combo 10 tặng 6/i });
      fireEvent.click(addComboBtn);

      // Verify modal updates with transactions (both button and table cells match)
      expect(screen.getAllByText(/Combo 10 Tặng 6/i).length).toBeGreaterThanOrEqual(2);
    });
  });
});
