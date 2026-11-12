import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Screen03ConsultationMatrix } from '../Screen03ConsultationMatrix';
import { Screen02CheckInProfile } from '../Screen02CheckInProfile';
import { Screen06CvDashboardReceive } from '../Screen06CvDashboardReceive';
import { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

function fillAll7NaturalLashFields() {
  fireEvent.change(screen.getByRole('slider', { name: 'Dài tối thiểu' }), { target: { value: '8' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Dày tối thiểu' }), { target: { value: '0.07' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Số sợi tối thiểu' }), { target: { value: '80' } });
  fireEvent.click(screen.getByTitle('Chúc xuống'));
  fireEvent.click(screen.getByRole('button', { name: /Mí lót \/ Sụp mí/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Mới lần đầu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bình thường' }));
}

describe('Screen03ConsultationMatrix - Zero Defaults & Mandatory 7/7 Natural Lash Check (OPS-003)', () => {
  const newClientBooking: BookingItem = {
    id: 360069,
    orderNumber: 'ORD-360069',
    customerName: 'Nhàn',
    customerPhone: '360069',
    customerId: 360069,
    customerVisits: 1,
    customerNote: '11/11 dxn',
    serviceDuration: 60,
    serviceName: 'Hyperlight 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    timeSlot: '10:00 - 11:00',
    time12h: '10:00 am',
    status: 'CHECKED_IN',
    lashHistory: [],
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '2X',
      count: '70 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
      isNewClientDiagnosticDone: false,
      notes: '11/11 dxn',
    },
  };

  const returningClientBooking: BookingItem = {
    ...newClientBooking,
    id: 360070,
    customerName: 'Chị Trang',
    customerVisits: 4,
    lashHistory: [
      {
        date: '25/10/2026',
        serviceName: 'HyperLight 2X Natural 70 fan',
        staffName: 'Thảo Ly',
      },
    ],
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '2X',
      count: '70 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
      notes: '11/11 dxn',
    },
  };

  it('starts with zero defaults across all 7 natural lash fields (0/7) and locks confirmation & design controls', () => {
    const onSave = vi.fn();
    render(<Screen03ConsultationMatrix booking={newClientBooking} onBack={vi.fn()} onSave={onSave} />);

    // 1. All 3 measurement sliders start unset with aria-valuetext="Chưa đo"
    expect(screen.getByRole('slider', { name: 'Dài tối thiểu' })).toHaveAttribute('aria-valuetext', 'Chưa đo');
    expect(screen.getByRole('slider', { name: 'Dày tối thiểu' })).toHaveAttribute('aria-valuetext', 'Chưa đo');
    expect(screen.getByRole('slider', { name: 'Số sợi tối thiểu' })).toHaveAttribute('aria-valuetext', 'Chưa đo');
    expect(screen.getAllByText('Chưa đo')).toHaveLength(3);

    // 2. None of the 4 categorical groups (Hướng, Dáng mắt, Nang mi, Độ nhạy cảm) have any pre-selected option
    expect(screen.getByTitle('Chúc xuống')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Mí lót \/ Sụp mí/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Mới lần đầu' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Bình thường' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByText(/Chưa chọn/i)).toHaveLength(4);

    // 3. Bottom confirmation CTA is locked at 0/7
    const confirmBtn = screen.getByRole('button', {
      name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI \(0\/7\)/i,
    });
    expect(confirmBtn).toHaveAttribute('aria-disabled', 'true');

    // 4. Profile tab is active; Design tab is locked; direct final save CTA is hidden; top save status shows auto-save indicator
    const profileTab = screen.getByRole('tab', { name: /Kiểm Tra Mi Thật/i });
    const specsTab = screen.getByRole('tab', { name: /Thiết Kế Trên Mi Thật/i });
    const topSaveBtn = screen.getByRole('button', { name: /Trạng thái tự động lưu|Đã lưu|Đang lưu/i });
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(specsTab).toHaveAttribute('aria-selected', 'false');
    expect(specsTab).toHaveAttribute('aria-disabled', 'true');
    expect(topSaveBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /LƯU TƯ VẤN & BẮT ĐẦU LÀM MI/i })).not.toBeInTheDocument();
  });

  it('blocks confirmation, recommendation apply, tab switch, and top Save when 0/7 or partially filled (3/7)', () => {
    const onSave = vi.fn();
    render(<Screen03ConsultationMatrix booking={newClientBooking} onBack={vi.fn()} onSave={onSave} />);

    const profileTab = screen.getByRole('tab', { name: /Kiểm Tra Mi Thật/i });
    const specsTab = screen.getByRole('tab', { name: /Thiết Kế Trên Mi Thật/i });
    const topSaveBtn = screen.getByRole('button', { name: /Trạng thái tự động lưu|Đã lưu|Đang lưu/i });
    const confirmBtn0 = screen.getByRole('button', {
      name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI \(0\/7\)/i,
    });

    // Premature click on confirm at 0/7 stays on PROFILE and announces missing fields alert
    fireEvent.click(confirmBtn0);
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/BẮT BUỘC ĐO & CHỌN ĐỦ 7 THÔNG SỐ MI THẬT!/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/Còn thiếu 7\/7 mục/i);

    // Fill only 3 of 7 fields -> updates progress to 3/7, still locked
    fireEvent.change(screen.getByRole('slider', { name: 'Dài tối thiểu' }), { target: { value: '8' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Dày tối thiểu' }), { target: { value: '0.07' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Số sợi tối thiểu' }), { target: { value: '80' } });

    const confirmBtn3 = screen.getByRole('button', {
      name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI \(3\/7\)/i,
    });
    expect(confirmBtn3).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(specsTab);
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/Còn thiếu 4\/7 mục/i);

    // Clicking top save saves draft, does not execute final checkout onSave
    fireEvent.click(topSaveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('unlocks Thiết Kế Trên Mi Thật after setting all 7/7 fields and saves all 7 measured values with isNewClientDiagnosticDone: true', () => {
    const onSave = vi.fn();
    render(<Screen03ConsultationMatrix booking={newClientBooking} onBack={vi.fn()} onSave={onSave} />);

    fillAll7NaturalLashFields();

    const confirmBtn = screen.getByRole('button', {
      name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI →/i,
    });
    expect(confirmBtn).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(confirmBtn);

    // Switches to Thiết Kế Trên Mi Thật and unlocks controls
    const specsTab = screen.getByRole('tab', { name: /Thiết Kế Trên Mi Thật/i });
    const topSaveBtn = screen.getByRole('button', { name: /Trạng thái tự động lưu|Đã lưu|Đang lưu/i });
    expect(specsTab).toHaveAttribute('aria-selected', 'true');
    expect(specsTab).toHaveAttribute('aria-disabled', 'false');
    expect(topSaveBtn).toBeInTheDocument();
    expect(screen.getByText(/ĐÃ KIỂM TRA MI THẬT · ĐỦ ĐIỀU KIỆN THIẾT KẾ/i)).toBeInTheDocument();

    // Final save CTA saves all 7 natural lash fields + isNewClientDiagnosticDone: true & Normal serviceType
    const finalSaveBtn = screen.getByRole('button', { name: /LƯU TƯ VẤN & BẮT ĐẦU LÀM MI/i });
    fireEvent.click(finalSaveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const [savedAttributes, , savedPricing] = onSave.mock.calls[0];
    expect(savedAttributes.isNewClientDiagnosticDone).toBe(true);
    expect(savedAttributes.naturalLashLength).toBeTruthy();
    expect(savedAttributes.naturalLashThickness).toBeTruthy();
    expect(savedAttributes.naturalLashCount).toBeTruthy();
    expect(savedAttributes.lashTrail).toBe('Chúc xuống (Downwards)');
    expect(savedAttributes.eyeShape).toBe('Mí lót / Sụp mí (Hooded)');
    expect(savedAttributes.lashHealth).toBe('Khách mới lần đầu nối mi (Virgin Lashes)');
    expect(savedAttributes.medicalProblem).toBe('Bình thường (Good)');
    expect(savedPricing.serviceType).toBe('Normal');
  });

  it('shows golden ratio recommendation and automatically applies it when confirming 7/7 natural lash check', () => {
    const onSave = vi.fn();
    render(<Screen03ConsultationMatrix booking={newClientBooking} onBack={vi.fn()} onSave={onSave} />);

    fillAll7NaturalLashFields();

    expect(screen.getByText(/GỢI Ý TỶ LỆ VÀNG WINGS/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', {
      name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI/i,
    });
    expect(confirmBtn).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(confirmBtn);

    const specsTab = screen.getByRole('tab', { name: /Thiết Kế Trên Mi Thật/i });
    expect(specsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /LƯU TƯ VẤN & BẮT ĐẦU LÀM MI/i })).toBeInTheDocument();
  });

  it('enforces mandatory 7/7 natural lash check on unmeasured returning clients (e.g. Lần 10 CHƯA ĐO) while preserving their chosen design', () => {
    const onSave = vi.fn();
    const unmeasuredReturningHa: BookingItem = {
      ...returningClientBooking,
      id: 339319,
      customerName: 'Hà',
      customerVisits: 10,
      attributes: {
        material: 'HyperLight',
        style: 'Doll',
        volume: '4X',
        count: '70 fan',
        curl: 'C',
        length: '10-12 mm',
        thickness: '0.05 mm',
        notes: '11/11 chi tham gia Friday',
      },
    };
    render(<Screen03ConsultationMatrix booking={unmeasuredReturningHa} onBack={vi.fn()} onSave={onSave} />);

    // Opens on PROFILE (Kiểm Tra Mi Thật) and locks SPECS (Thiết Kế Trên Mi Thật) when CHƯA ĐO (0/7)
    const profileTab = screen.getByRole('tab', { name: /Kiểm Tra Mi Thật/i });
    const specsTab = screen.getByRole('tab', { name: /Thiết Kế Trên Mi Thật/i });
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(specsTab).toHaveAttribute('aria-selected', 'false');
    expect(specsTab).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/CHƯA CÓ HỒ SƠ MI THẬT · BẮT BUỘC KIỂM TRA ĐỦ 7 MỤC/i)).toBeInTheDocument();

    // Attempt to click SPECS before measuring triggers alert
    fireEvent.click(specsTab);
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/Còn thiếu 7\/7 mục/i);

    // Measure & confirm all 7/7 fields -> unlocks SPECS while preserving returning client's Doll style!
    fillAll7NaturalLashFields();
    fireEvent.click(screen.getByRole('button', { name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI →/i }));
    expect(specsTab).toHaveAttribute('aria-selected', 'true');
    expect(specsTab).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(screen.getByRole('button', { name: /LƯU TƯ VẤN & BẮT ĐẦU LÀM MI/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [savedAttributes] = onSave.mock.calls[0];
    expect(savedAttributes.style).toBe('Doll');
    expect(savedAttributes.isNewClientDiagnosticDone).toBe(true);
    expect(savedAttributes.naturalLashLength).toBeTruthy();
  });

  it('opens directly on Thiết Kế Trên Mi Thật unlocked when a returning client already has a saved 7/7 natural lash profile', () => {
    const onSave = vi.fn();
    const measuredReturningClient: BookingItem = {
      ...returningClientBooking,
      customerVisits: 10,
      attributes: {
        ...returningClientBooking.attributes!,
        isNewClientDiagnosticDone: true,
        naturalLashLength: '9 - 10mm',
        naturalLashThickness: '0.10 - 0.12mm',
        naturalLashCount: '90 - 110',
        lashTrail: 'Thẳng (Straight)',
        eyeShape: 'Hai mí chuẩn (Almond)',
        lashHealth: 'Khỏe mạnh (Healthy)',
        medicalProblem: 'Bình thường (Good)',
      },
    };
    render(<Screen03ConsultationMatrix booking={measuredReturningClient} onBack={vi.fn()} onSave={onSave} />);

    const specsTab = screen.getByRole('tab', { name: /Thiết Kế Trên Mi Thật/i });
    expect(specsTab).toHaveAttribute('aria-selected', 'true');
    expect(specsTab).toHaveAttribute('aria-disabled', 'false');
    expect(screen.getByText(/ĐÃ KIỂM TRA MI THẬT · ĐỦ ĐIỀU KIỆN THIẾT KẾ/i)).toBeInTheDocument();
  });

  it('blocks Quick Check-In bypass on Screen02CheckInProfile for new clients even with an active Combo', () => {
    const onCheckIn = vi.fn();
    const onQuickCheckIn = vi.fn();
    const newComboClient: BookingItem = {
      ...newClientBooking,
      comboLiveStatus: {
        isComboLive: true,
        comboName: 'Combo 4+1 HyperLight 770',
        remainingSessions: 5,
        normalRemaining: 2,
        retainRemaining: 3,
        upsellOpportunity: false,
      },
    };

    render(
      <Screen02CheckInProfile
        booking={newComboClient}
        onBack={vi.fn()}
        onCheckIn={onCheckIn}
        onQuickCheckIn={onQuickCheckIn}
      />
    );

    const checkInCta = screen.getByRole('button', { name: /Check-in & Kiểm Tra Mi Thật Trước/i });
    fireEvent.click(checkInCta);

    expect(onQuickCheckIn).not.toHaveBeenCalled();
    expect(onCheckIn).toHaveBeenCalledWith(newComboClient.id);
  });

  it('redirects Screen06CvDashboardReceive back to consultation if any client (new or Lần 10 returning) lacks all 7/7 natural lash fields', () => {
    const onStartTask = vi.fn();
    const onEditService = vi.fn();

    render(
      <Screen06CvDashboardReceive
        booking={{
          ...returningClientBooking,
          id: 339319,
          customerName: 'Hà',
          customerVisits: 10,
          status: 'SERVICING',
          attributes: {
            ...returningClientBooking.attributes!,
          },
        }}
        onStartTask={onStartTask}
        onEditService={onEditService}
      />
    );

    expect(screen.getByText(/CHƯA KIỂM TRA MI THẬT · BẮT BUỘC ĐO ĐỦ 7\/7 MỤC/i)).toBeInTheDocument();
    const requiredCheckBtn = screen.getByRole('button', { name: /KIỂM TRA MI THẬT TRƯỚC KHI BẮT ĐẦU/i });
    fireEvent.click(requiredCheckBtn);

    expect(onStartTask).not.toHaveBeenCalled();
    expect(onEditService).toHaveBeenCalledTimes(1);
  });

  it('automatically triggers autosave with animated status icon when editing any field and supports manual immediate save', async () => {
    vi.useFakeTimers();
    const onAutoSaveDraft = vi.fn().mockResolvedValue(true);

    render(
      <Screen03ConsultationMatrix
        booking={newClientBooking}
        onBack={vi.fn()}
        onSave={vi.fn()}
        onAutoSaveDraft={onAutoSaveDraft}
      />
    );

    // Initial state: shows "Đã lưu" with Save/Check indicator
    const saveIndicator = screen.getByRole('button', { name: /Trạng thái tự động lưu/i });
    expect(saveIndicator).toHaveTextContent(/Đã lưu/i);

    // Edit a field: e.g. move slider
    fireEvent.change(screen.getByRole('slider', { name: 'Dài tối thiểu' }), { target: { value: '8' } });

    // Status transitions to "Đang lưu"
    expect(saveIndicator).toHaveTextContent(/Đang lưu/i);

    // Fast-forward debounce timer (450ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // onAutoSaveDraft is triggered with updated attributes
    expect(onAutoSaveDraft).toHaveBeenCalled();
    const [savedDraftAttrs] = onAutoSaveDraft.mock.calls[0];
    expect(savedDraftAttrs.naturalLashLength).toBe('8mm');

    // Status returns to "Đã lưu"
    expect(saveIndicator).toHaveTextContent(/Đã lưu/i);

    // Clicking top save button triggers immediate save without waiting
    await act(async () => {
      fireEvent.click(saveIndicator);
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(saveIndicator).toHaveTextContent(/Đã lưu/i);

    vi.useRealTimers();
  });
});
