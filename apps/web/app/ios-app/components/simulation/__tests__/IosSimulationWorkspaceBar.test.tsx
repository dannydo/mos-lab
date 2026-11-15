import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { IosBookingItem } from '@mos-lab/shared';
import { IosSimulationWorkspaceBar } from '../IosSimulationWorkspaceBar';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
    themeId: 'luxury-gold',
    coreThemeId: 'luxury-gold',
    toggleTheme: vi.fn(),
    availableCoreThemes: [],
    setCoreThemeId: vi.fn(),
  }),
}));

const SAMPLE_BOOKING: IosBookingItem = {
  id: 771121,
  orderNumber: '771121',
  customerName: 'Ngọc Phạm',
  customerPhone: '0933...207',
  customerId: 50021,
  customerVisits: 21,
  customerNote: '7/11 c book',
  timeSlot: '11:00 (90m)',
  serviceName: 'Classic 1D',
  servicePrice: 550000,
  serviceDuration: 90,
  assignedStaffId: 46272,
  status: 'SERVICING',
  simulationAttemptCount: 1,
};

describe('IosSimulationWorkspaceBar Overlay & Stacking Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses z-[45] on workspace bar root so underlying z-40 navigation headers never cover simulation chrome', () => {
    const { container } = render(
      <IosSimulationWorkspaceBar
        isSimulationMode={true}
        isReadOnlyMentorView={false}
        menteesList={[]}
        activeBooking={SAMPLE_BOOKING}
        currentStep={7}
        onOpenCreateBooking={vi.fn()}
        onOpenHistory={vi.fn()}
        onRevertConsultation={vi.fn()}
        onResetToIncoming={vi.fn()}
        onExitSimulation={vi.fn()}
      />
    );

    const rootEl = container.firstElementChild as HTMLElement;
    expect(rootEl).not.toBeNull();
    expect(rootEl.className).toContain('z-[45]');
  });

  it('portals Revert popover to document.body at z-[80] with visible header, triggers, and backdrop dismissal', () => {
    const onRevertConsultation = vi.fn();
    const onResetToIncoming = vi.fn();

    render(
      <IosSimulationWorkspaceBar
        isSimulationMode={true}
        isReadOnlyMentorView={false}
        menteesList={[]}
        activeBooking={SAMPLE_BOOKING}
        currentStep={7}
        onOpenCreateBooking={vi.fn()}
        onOpenHistory={vi.fn()}
        onRevertConsultation={onRevertConsultation}
        onResetToIncoming={onResetToIncoming}
        onExitSimulation={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog', { name: 'Hoàn tác kịch bản mô phỏng' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Revert/i }));

    const dialog = screen.getByRole('dialog', { name: 'Hoàn tác kịch bản mô phỏng' });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('z-[80]');
    expect(screen.getByText(/Làm lại ca · Ngọc Phạm/i)).toBeTruthy();
    expect(screen.getByText('↺ Thử lại Tư vấn (Giữ đo mi 7/7)')).toBeTruthy();
    expect(screen.getByText('⟲ Reset toàn bộ về Chờ đón')).toBeTruthy();

    fireEvent.click(screen.getByTestId('sim-revert-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Hoàn tác kịch bản mô phỏng' })).toBeNull();

    // Verify callbacks dispatch cleanly
    fireEvent.click(screen.getByRole('button', { name: /Revert/i }));
    fireEvent.click(screen.getByText('↺ Thử lại Tư vấn (Giữ đo mi 7/7)'));
    expect(onRevertConsultation).toHaveBeenCalledWith(771121);
  });

  it('renders Mentor Mentee selector cleanly in its dedicated sub-row without crushing top actions', () => {
    render(
      <IosSimulationWorkspaceBar
        isSimulationMode={true}
        isReadOnlyMentorView={false}
        menteesList={[
          {
            menteeStaffId: 46272,
            menteeName: 'Thảo Vy',
            mentorStaffId: 1001,
            mentorName: 'Ngọc Châu',
            startDate: '2026-11-01',
            endDate: '2026-11-30',
          },
        ]}
        selectedMenteeStaffId={undefined}
        onSelectMentee={vi.fn()}
        activeBooking={SAMPLE_BOOKING}
        currentStep={7}
        onOpenCreateBooking={vi.fn()}
        onOpenHistory={vi.fn()}
        onRevertConsultation={vi.fn()}
        onResetToIncoming={vi.fn()}
        onExitSimulation={vi.fn()}
      />
    );

    expect(screen.getByText('Xem bài tập:')).toBeTruthy();
    expect(screen.getByLabelText('Chọn Chuyên Viên cần xem bài tập luyện')).toBeTruthy();
    expect(screen.getByText('Sandbox của tôi')).toBeTruthy();
  });
});
