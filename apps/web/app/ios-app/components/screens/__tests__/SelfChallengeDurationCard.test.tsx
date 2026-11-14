import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IosSelfChallengeOption, IosSelfChallengeTierKey } from '@mos-lab/shared';
import { SelfChallengeDurationCard } from '../servicing/SelfChallengeDurationCard';
import { Screen06CvDashboardReceive } from '../Screen06CvDashboardReceive';
import { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

const sampleBooking: BookingItem = {
  id: 360999,
  orderNumber: 'ORD-360999',
  customerName: 'Thảo Vy',
  customerPhone: '0900000001',
  customerId: 360999,
  customerVisits: 5,
  customerNote: '',
  serviceDuration: 75,
  serviceName: 'HyperLight 770',
  serviceType: 'Normal',
  servicePrice: 770000,
  timeSlot: '10:00 - 11:15',
  time12h: '10:00 am',
  status: 'SERVICING',
  lashHistory: [],
  attributes: {
    material: 'HyperLight',
    style: 'Natural',
    volume: '4X',
    count: '70 fan',
    curl: 'C',
    length: '10-12 mm',
    thickness: '0.07 mm',
  },
  cvSelfSpeedHistory: {
    staffId: 51154,
    samples: [
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 58 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 60 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 62 },
    ],
    overallSpeedRatio: 1.0,
  },
};

function Harness({
  booking = sampleBooking,
  initialTier = null,
  initialDuration = null,
  initialSlowerReason = '',
  showReasonRequiredWarning = false,
}: {
  booking?: BookingItem;
  initialTier?: IosSelfChallengeTierKey | null;
  initialDuration?: number | null;
  initialSlowerReason?: string;
  showReasonRequiredWarning?: boolean;
}) {
  const [selectedTier, setSelectedTier] = useState<IosSelfChallengeTierKey | null>(initialTier);
  const [selectedDurationMin, setSelectedDurationMin] = useState<number | null>(initialDuration);
  const [slowerReason, setSlowerReason] = useState<string>(initialSlowerReason);

  return (
    <SelfChallengeDurationCard
      booking={booking}
      suggestedDurationMin={75}
      selectedTier={selectedTier}
      selectedDurationMin={selectedDurationMin}
      slowerReason={slowerReason}
      showTimeRequiredWarning={false}
      showReasonRequiredWarning={showReasonRequiredWarning}
      estimatedFinishTime={selectedDurationMin ? '11:00' : '—'}
      onSelectOption={(option: IosSelfChallengeOption) => {
        setSelectedTier(option.key);
        setSelectedDurationMin(option.minutes);
      }}
      onAdjustMinutes={(deltaMinutes: number) => {
        setSelectedDurationMin((prev) => {
          const base = prev ?? 60;
          return Math.max(20, Math.min(180, base + deltaMinutes));
        });
      }}
      onChangeSlowerReason={setSlowerReason}
    />
  );
}

describe('SelfChallengeDurationCard — Vượt Lên Chính Mình', () => {
  it('renders header, 4 minute + +/-X% options in 1 row (no 1-4 prefix or wordy text), and hides +/-5p stepper initially', () => {
    render(<Harness />);

    expect(screen.getByText(/Vượt Lên Chính Mình/i)).toBeInTheDocument();

    const optionsRow = screen.getByTestId('self-challenge-options-row');
    expect(optionsRow.className).toContain('grid-cols-4');

    expect(screen.getByRole('button', { name: /66p.*\+10%/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /60p.*0%/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /57p.*-5%/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /54p.*-10%/i })).toBeInTheDocument();

    expect(screen.queryByText(/Chậm hơn/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nhanh hơn/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/3 lần TB vừa rồi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1 ·/)).not.toBeInTheDocument();

    expect(screen.queryByTestId('self-challenge-stepper-row')).not.toBeInTheDocument();
  });

  it('reveals center-aligned +/-5p stepper after tapping an option and updates duration cleanly', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /60p/i }));

    const stepperRow = screen.getByTestId('self-challenge-stepper-row');
    expect(stepperRow).toBeInTheDocument();
    expect(stepperRow.className).toContain('items-center');
    expect(stepperRow.className).toContain('justify-center');
    expect(stepperRow).toHaveTextContent('60 phút');

    const plusBtn = screen.getByRole('button', { name: 'Tăng 5 phút' });
    const minusBtn = screen.getByRole('button', { name: 'Giảm 5 phút' });

    fireEvent.click(plusBtn);
    expect(stepperRow).toHaveTextContent('65 phút');

    fireEvent.click(minusBtn);
    fireEvent.click(minusBtn);
    expect(stepperRow).toHaveTextContent('55 phút');

    // Switch to another option (54p)
    fireEvent.click(screen.getByRole('button', { name: /54p/i }));
    expect(stepperRow).toHaveTextContent('54 phút');
  });

  it('clamps +/-5p adjustments strictly within [20p, 180p]', () => {
    render(<Harness initialTier="AVG_RECENT" initialDuration={22} />);

    const stepperRow = screen.getByTestId('self-challenge-stepper-row');
    const minusBtn = screen.getByRole('button', { name: 'Giảm 5 phút' });
    const plusBtn = screen.getByRole('button', { name: 'Tăng 5 phút' });

    fireEvent.click(minusBtn);
    expect(stepperRow).toHaveTextContent('20 phút');

    // Click +5p many times to reach 180p cap
    for (let i = 0; i < 40; i++) {
      fireEvent.click(plusBtn);
    }
    expect(stepperRow).toHaveTextContent('180 phút');
  });

  it('requires a reasonable reason whenever duration is slower than personal average (> baselineMinutes)', () => {
    render(<Harness />);

    // 60p (0%) and 54p (-10%) must NOT ask for a slower reason
    fireEvent.click(screen.getByRole('button', { name: /60p/i }));
    expect(screen.queryByTestId('self-challenge-slower-reason-section')).not.toBeInTheDocument();

    // Stepping +5p above 60p -> 65p (> baseline 60p) MUST reveal slower reason input
    fireEvent.click(screen.getByRole('button', { name: 'Tăng 5 phút' }));
    expect(screen.getByTestId('self-challenge-slower-reason-section')).toBeInTheDocument();
    expect(screen.getByText(/để hệ thống hỗ trợ bạn tốt hơn/i)).toBeInTheDocument();

    // Stepping back down to 60p hides it again; tapping 66p (+10%) reveals it
    fireEvent.click(screen.getByRole('button', { name: 'Giảm 5 phút' }));
    expect(screen.queryByTestId('self-challenge-slower-reason-section')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /66p/i }));
    expect(screen.getByTestId('self-challenge-slower-reason-section')).toBeInTheDocument();
    expect(screen.getByText('Cần điền lý do')).toBeInTheDocument();

    const reasonInput = screen.getByLabelText('Lý do chọn chậm hơn trung bình');
    fireEvent.change(reasonInput, { target: { value: 'khó' } });
    expect(screen.getByText(/Lý do còn quá ngắn/i)).toBeInTheDocument();
    expect(screen.queryByText('Đã chọn: 66p')).not.toBeInTheDocument();

    fireEvent.change(reasonInput, { target: { value: 'Mi cũ keo dày cần vệ sinh kỹ' } });
    expect(screen.getByText(/Đã ghi nhận lý do hợp lý/i)).toBeInTheDocument();
    expect(screen.getByText('Đã chọn: 66p')).toBeInTheDocument();
  });

  it('blocks Screen06CvDashboardReceive start CTA when +10% is chosen without a reasonable reason, then submits slowerReason', () => {
    const onStartTask = vi.fn();
    const bookingWithComplete7 = {
      ...sampleBooking,
      attributes: {
        ...sampleBooking.attributes!,
        naturalLashLength: '9-10mm',
        naturalLashThickness: '0.10-0.12mm',
        naturalLashCount: '90-110',
        lashTrail: 'Thẳng (Straight)',
        eyeShape: 'Hai mí chuẩn (Almond)',
        lashHealth: 'Khỏe mạnh (Healthy)',
        medicalProblem: 'Bình thường (Good)',
        isNewClientDiagnosticDone: true,
      },
    };

    render(<Screen06CvDashboardReceive booking={bookingWithComplete7} onStartTask={onStartTask} />);

    fireEvent.click(screen.getByRole('button', { name: /66p/i }));
    fireEvent.click(screen.getByRole('button', { name: /MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM/i }));

    expect(onStartTask).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /BẮT BUỘC ĐIỀN LÝ DO HỢP LÝ TRƯỚC KHI BẮT ĐẦU/i })).toBeInTheDocument();

    const reasonInput = screen.getByLabelText('Lý do chọn chậm hơn trung bình');
    fireEvent.change(reasonInput, { target: { value: 'Mắt khách nhạy cảm dễ chảy nước mắt' } });

    fireEvent.click(screen.getByRole('button', { name: /MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM/i }));
    expect(onStartTask).toHaveBeenCalledTimes(1);
    expect(onStartTask).toHaveBeenCalledWith(
      66,
      expect.objectContaining({
        tierKey: 'SLOWER_10',
        committedMinutes: 66,
        baselineMinutes: 60,
        slowerReason: 'Mắt khách nhạy cảm dễ chảy nước mắt',
      })
    );
  });
});
