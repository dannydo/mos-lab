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

  it('collapses Mentor Mentee selector into a single minimalist pill popover without rendering a second header row', () => {
    const onSelectMentee = vi.fn();

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
        onSelectMentee={onSelectMentee}
        activeBooking={SAMPLE_BOOKING}
        currentStep={7}
        onOpenCreateBooking={vi.fn()}
        onOpenHistory={vi.fn()}
        onRevertConsultation={vi.fn()}
        onResetToIncoming={vi.fn()}
        onExitSimulation={vi.fn()}
      />
    );

    // No static second sub-row "Xem bài tập:" in the bar
    expect(screen.queryByText('Xem bài tập:')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Chọn bài tập mô phỏng' })).toBeNull();

    const selectorPill = screen.getByRole('button', { name: 'Chọn bài tập mô phỏng' });
    expect(selectorPill.textContent).toContain('Sandbox của tôi');

    fireEvent.click(selectorPill);

    const dialog = screen.getByRole('dialog', { name: 'Chọn bài tập mô phỏng' });
    expect(dialog.parentElement).toBe(document.body);
    fireEvent.click(screen.getByText('Thảo Vy'));
    expect(onSelectMentee).toHaveBeenCalledWith(46272);
    expect(screen.queryByRole('dialog', { name: 'Chọn bài tập mô phỏng' })).toBeNull();
  });

  it('renders a 1px bright pink pointer-events-none screen border when simulation mode is enabled and removes it when disabled', () => {
    const { rerender } = render(
      <IosSimulationWorkspaceBar
        isSimulationMode={true}
        isReadOnlyMentorView={false}
        menteesList={[]}
        activeBooking={SAMPLE_BOOKING}
        currentStep={1}
        onOpenCreateBooking={vi.fn()}
        onOpenHistory={vi.fn()}
        onRevertConsultation={vi.fn()}
        onResetToIncoming={vi.fn()}
        onExitSimulation={vi.fn()}
      />
    );

    const borderOverlay = screen.getByTestId('simulation-screen-border');
    expect(borderOverlay.parentElement).toBe(document.body);
    expect(borderOverlay.className).toContain('pointer-events-none');
    expect(borderOverlay.className).toContain('fixed inset-0');
    const frame = borderOverlay.firstElementChild as HTMLElement;
    expect(frame.className).toContain('border');
    expect(frame.className).toContain('border-pink-400');

    rerender(
      <IosSimulationWorkspaceBar
        isSimulationMode={false}
        isReadOnlyMentorView={false}
        menteesList={[]}
        activeBooking={SAMPLE_BOOKING}
        currentStep={1}
        onOpenCreateBooking={vi.fn()}
        onOpenHistory={vi.fn()}
        onRevertConsultation={vi.fn()}
        onResetToIncoming={vi.fn()}
        onExitSimulation={vi.fn()}
      />
    );

    expect(screen.queryByTestId('simulation-screen-border')).toBeNull();
  });

  it('omits + Lịch button and uses icon-only buttons for Revert and Exit (X) in header', () => {
    const onExitSimulation = vi.fn();

    render(
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
        onExitSimulation={onExitSimulation}
      />
    );

    expect(screen.queryByText('Lịch')).toBeNull();
    expect(screen.queryByText('Đặt lịch')).toBeNull();
    expect(screen.queryByText('Revert')).toBeNull();
    expect(screen.queryByText('Thoát')).toBeNull();

    const revertBtn = screen.getByRole('button', { name: 'Revert kịch bản mô phỏng' });
    expect(revertBtn.textContent?.trim()).toBe('');

    const historyBtn = screen.getByRole('button', { name: 'Lịch sử phương án mô phỏng' });
    const exitBtn = screen.getByRole('button', { name: 'Thoát chế độ Mô phỏng' });
    expect(exitBtn.textContent?.trim()).toBe('');

    const allButtons = screen.getAllByRole('button');
    expect(allButtons.indexOf(revertBtn)).toBeLessThan(allButtons.indexOf(historyBtn));
    expect(allButtons.indexOf(historyBtn)).toBeLessThan(allButtons.indexOf(exitBtn));

    fireEvent.click(exitBtn);
    expect(onExitSimulation).toHaveBeenCalledTimes(1);
  });

  it('opens Multi-Mode Sandbox selector modal (z-[80]) allowing mode switches, step jumps, and material checklist toggles', () => {
    const onSelectSimPresetMode = vi.fn();
    const onSimJumpToStep = vi.fn();
    const onToggleSimMaterial = vi.fn();

    render(
      <IosSimulationWorkspaceBar
        isSimulationMode={true}
        isReadOnlyMentorView={false}
        menteesList={[]}
        activeBooking={SAMPLE_BOOKING}
        currentStep={3}
        simPresetMode="training"
        onSelectSimPresetMode={onSelectSimPresetMode}
        onSimJumpToStep={onSimJumpToStep}
        simMaterialsChecklist={[
          { id: 'glue', label: 'Keo nối mi Wings Ultra-Bond', stockNote: 'Đủ ca', checked: true },
          { id: 'fans', label: 'Khay mi Fan UltraLight', stockNote: 'Còn 4 hộp', checked: false },
        ]}
        onToggleSimMaterial={onToggleSimMaterial}
        onOpenHistory={vi.fn()}
        onRevertConsultation={vi.fn()}
        onResetToIncoming={vi.fn()}
        onExitSimulation={vi.fn()}
      />
    );

    const modePill = screen.getByRole('button', { name: 'Chọn mode giả lập Sandbox' });
    expect(modePill.textContent).toContain('Training Ca');

    fireEvent.click(modePill);

    const modeDialog = screen.getByRole('dialog', { name: 'Chọn mode giả lập Sandbox' });
    expect(modeDialog.parentElement).toBe(document.body);
    expect(modeDialog.className).toContain('z-[80]');

    fireEvent.click(screen.getByText(/Sales Chốt Combo · Sản Phẩm · Quà Tặng/i));
    expect(onSelectSimPresetMode).toHaveBeenCalledWith('sales');

    fireEvent.click(screen.getByText(/Khay mi Fan UltraLight/i));
    expect(onToggleSimMaterial).toHaveBeenCalledWith('fans');

    fireEvent.click(screen.getByText(/Bấm giờ \(B9\)/i));
    expect(onSimJumpToStep).toHaveBeenCalledWith(9, 771121);
    expect(screen.queryByRole('dialog', { name: 'Chọn mode giả lập Sandbox' })).toBeNull();
  });
});
