import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  bookingRequiresUnderLashRound,
  isPureUnderLashServiceName,
  resolveActiveServicingRound,
  splitUpperAndUnderTargetDuration,
} from '@mos-lab/shared';
import { Screen07bLashProgressCleaned } from '../Screen07bLashProgressCleaned';
import { Screen09LashProgressAfter } from '../Screen09LashProgressAfter';
import { Screen10CustomerSurvey } from '../Screen10CustomerSurvey';
import { Screen02LashHistorySheet } from '../Screen02LashHistorySheet';
import { AddUnderMinkSheet } from '../../modals/booking/AddUnderMinkSheet';
import { BookingItem, LashHistoryItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('../../../state/offlineSync', () => ({
  saveLocalProgressSnapshot: vi.fn(),
  getLocalProgressSnapshot: vi.fn(() => ({})),
  getLocalProgressSnapshotAsync: vi.fn(() => Promise.resolve({})),
}));

const BASE_ATTRS = {
  style: 'Natural',
  curl: 'C',
  length: '10-12mm',
  thickness: '0.07mm',
  hasUnderMink: true,
  underMinkServiceType: 'Retain' as const,
  isNewClientDiagnosticDone: true,
};

function makeDualBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 999801,
    orderNumber: 'ORD-999801',
    customerName: 'Chị Thảo',
    customerPhone: '0909.111.222',
    customerId: 26988,
    customerVisits: 4,
    customerNote: '',
    serviceDuration: 85,
    serviceName: 'Volume 2D + Under Mink',
    serviceType: 'Normal',
    servicePrice: 960000,
    timeSlot: '14:00 - 15:25',
    time12h: '02:00 pm',
    status: 'SERVICING',
    attributes: BASE_ATTRS,
    progress: {
      elapsedSeconds: 0,
      timerRunning: false,
      activeServiceRound: 'UPPER',
    },
    ...overrides,
  };
}

describe('Under Lash 2-Round Sequential Servicing', () => {
  it('splits single commitment time cleanly and keeps completed 3-photo legacy orders non-blocking', () => {
    const splitNormal = splitUpperAndUnderTargetDuration(90, true, 'Normal');
    expect(splitNormal).toEqual({ totalMinutes: 90, upperMinutes: 65, underMinutes: 25 });

    const splitRetain = splitUpperAndUnderTargetDuration(80, true, 'Retain');
    expect(splitRetain).toEqual({ totalMinutes: 80, upperMinutes: 60, underMinutes: 20 });

    const completedHistorical = makeDualBooking({
      status: 'DONE',
      orderState: 'Completed',
      progress: { elapsedSeconds: 3600, timerRunning: false, afterPhotoUrl: 'https://cdn.test/a.jpg' },
    });
    expect(resolveActiveServicingRound(completedHistorical)).toBe('UPPER');

    const handedOffRound2 = makeDualBooking({
      progress: { elapsedSeconds: 0, timerRunning: false, upperCompleted: true },
    });
    expect(resolveActiveServicingRound(handedOffRound2)).toBe('UNDER');
  });

  it('toggles Retain lash counter independently per round in Screen07bLashProgressCleaned', () => {
    const onSaveUpperNormalUnderRetain = vi.fn();
    const round2UnderRetain = makeDualBooking({
      serviceType: 'Normal',
      attributes: { ...BASE_ATTRS, underMinkServiceType: 'Retain' },
      progress: { elapsedSeconds: 0, timerRunning: true, upperCompleted: true, activeServiceRound: 'UNDER' },
    });

    const { rerender } = render(
      <Screen07bLashProgressCleaned
        booking={round2UnderRetain}
        onBack={vi.fn()}
        onSavePhoto={onSaveUpperNormalUnderRetain}
      />
    );
    expect(screen.getByText(/VÒNG 2\/2 · MI DƯỚI/i)).toBeInTheDocument();
    expect(screen.getByText(/Số Lượng Sợi mi Còn lại/i)).toBeInTheDocument();

    const chips20 = screen.getAllByRole('button', { name: '20' });
    fireEvent.click(chips20[0]);
    fireEvent.click(chips20[1]);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /BẮT ĐẦU NỐI MI & BẤM GIỜ/i }));
    expect(onSaveUpperNormalUnderRetain).toHaveBeenCalledWith('DECLINED:Khách nhạy cảm riêng tư', {
      left: 20,
      right: 20,
    });

    // Test Upper Retain (Round 1 -> checked decline) transitioning into Under Normal (Round 2 -> resets & hides counter)
    const upperRetainRound1 = makeDualBooking({
      id: 999802,
      serviceType: 'Retain',
      serviceName: 'Dặm Classic + Under Mink (Normal)',
      attributes: { ...BASE_ATTRS, underMinkServiceType: 'Normal' },
      progress: { elapsedSeconds: 0, timerRunning: true, activeServiceRound: 'UPPER' },
    });
    const onSaveUnderNormal = vi.fn();
    rerender(
      <Screen07bLashProgressCleaned booking={upperRetainRound1} onBack={vi.fn()} onSavePhoto={onSaveUnderNormal} />
    );
    expect(screen.getByText(/Số Lượng Sợi mi Còn lại/i)).toBeInTheDocument();

    const round2UnderNormal = makeDualBooking({
      id: 999802,
      serviceType: 'Retain',
      serviceName: 'Dặm Classic + Under Mink (Normal)',
      attributes: { ...BASE_ATTRS, underMinkServiceType: 'Normal' },
      progress: { elapsedSeconds: 0, timerRunning: true, upperCompleted: true, activeServiceRound: 'UNDER' },
    });
    rerender(
      <Screen07bLashProgressCleaned booking={round2UnderNormal} onBack={vi.fn()} onSavePhoto={onSaveUnderNormal} />
    );
    expect(screen.queryByText(/Số Lượng Sợi mi Còn lại/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /BẮT ĐẦU NỐI MI & BẤM GIỜ/i }));
    expect(onSaveUnderNormal).toHaveBeenCalledWith('DECLINED:Khách nhạy cảm riêng tư');
  });

  it('shows Next CTA on Round 1 After and Done CTA on Round 2 After in Screen09LashProgressAfter', () => {
    const round1Booking = makeDualBooking({
      progress: {
        elapsedSeconds: 3600,
        timerRunning: false,
        activeServiceRound: 'UPPER',
        afterPhotoUrl: 'https://cdn.test/upper-after.jpg',
      },
    });
    const { rerender } = render(
      <Screen09LashProgressAfter booking={round1Booking} onBack={vi.fn()} onSavePhoto={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /LƯU AFTER MI TRÊN & SANG VÒNG 2 \(MI DƯỚI\)/i })).toBeInTheDocument();

    const round2Booking = makeDualBooking({
      progress: {
        elapsedSeconds: 1200,
        timerRunning: false,
        upperCompleted: true,
        activeServiceRound: 'UNDER',
        underAfterPhotoUrl: 'https://cdn.test/under-after.jpg',
      },
    });
    rerender(<Screen09LashProgressAfter booking={round2Booking} onBack={vi.fn()} onSavePhoto={vi.fn()} />);
    expect(screen.getByRole('button', { name: /LƯU AFTER MI DƯỚI & TIẾP TỤC/i })).toBeInTheDocument();
  });

  it('renders both 3-photo Upper and Under groups in Screen02LashHistorySheet when underPhotos present', () => {
    const dualVisit: LashHistoryItem = {
      orderId: 145501,
      date: '16/11/2026',
      serviceName: 'Volume 2D + Under Mink',
      underServiceName: 'Under Mink Normal',
      staffName: 'Thảo Ly',
      photos: [
        { type: 'before', label: 'Trước nối', url: 'https://cdn.test/u1.jpg' },
        { type: 'cleaned', label: 'Sau vệ sinh', url: 'https://cdn.test/u2.jpg' },
        { type: 'after', label: 'Hoàn thành', url: 'https://cdn.test/u3.jpg' },
      ],
      underPhotos: [
        { type: 'before', label: 'Trước nối', url: 'https://cdn.test/d1.jpg' },
        { type: 'cleaned', label: 'Sau vệ sinh', url: 'https://cdn.test/d2.jpg' },
        { type: 'after', label: 'Hoàn thành', url: 'https://cdn.test/d3.jpg' },
      ],
    };

    const { rerender } = render(
      <Screen02LashHistorySheet item={dualVisit} isOpen={true} onClose={vi.fn()} onApplySpecs={vi.fn()} />
    );
    expect(screen.getByText(/VÒNG 1 · MI TRÊN/i)).toBeInTheDocument();
    expect(screen.getByText(/VÒNG 2 · UNDER MINK NORMAL/i)).toBeInTheDocument();

    const legacySingleVisit: LashHistoryItem = {
      date: '01/11/2026',
      serviceName: 'Classic 1D',
      staffName: 'Thảo Ly',
    };
    rerender(
      <Screen02LashHistorySheet item={legacySingleVisit} isOpen={true} onClose={vi.fn()} onApplySpecs={vi.fn()} />
    );
    expect(screen.getByText(/3 TẤM HÌNH BẮT BUỘC/i)).toBeInTheDocument();
    expect(screen.queryByText(/VÒNG 2/i)).not.toBeInTheDocument();
  });

  it('treats pure Under Lash services as 1 round while supporting mid-shift AddUnderMink CTAs & Sheet', async () => {
    const pureUnderBooking = makeDualBooking({
      serviceName: 'Flawless Under Mink 390K (Mi Dưới Mới)',
      attributes: { style: 'Tự nhiên', thickness: '0.07mm', curl: 'B', length: '7mm', hasUnderMink: false },
      progress: { elapsedSeconds: 0, timerRunning: false },
    });
    expect(isPureUnderLashServiceName(pureUnderBooking.serviceName)).toBe(true);
    expect(bookingRequiresUnderLashRound(pureUnderBooking)).toBe(false);

    const upperOnlyBooking = makeDualBooking({
      serviceName: 'HyperLight 4X',
      servicePrice: 770000,
      attributes: { ...BASE_ATTRS, hasUnderMink: false, underMinkServiceType: undefined },
      progress: { elapsedSeconds: 3000, timerRunning: false, afterPhotoUrl: 'https://cdn.test/u.jpg' },
    });

    const onOpenAfterCta = vi.fn();
    render(
      <Screen09LashProgressAfter
        booking={upperOnlyBooking}
        onBack={vi.fn()}
        onSavePhoto={vi.fn()}
        onOpenAddUnderMink={onOpenAfterCta}
      />
    );
    const afterCta = screen.getByTestId('add-under-mink-cta-after');
    fireEvent.click(afterCta);
    expect(onOpenAfterCta).toHaveBeenCalledWith('https://cdn.test/u.jpg');

    const onOpenSurveyCta = vi.fn();
    render(
      <Screen10CustomerSurvey
        booking={upperOnlyBooking}
        onBack={vi.fn()}
        onComplete={vi.fn()}
        onOpenAddUnderMink={onOpenSurveyCta}
      />
    );
    fireEvent.click(screen.getByTestId('add-under-mink-cta-survey'));
    expect(onOpenSurveyCta).toHaveBeenCalledTimes(1);

    const onConfirmAddRound = vi.fn();
    const onConfirmCreateNew = vi.fn();
    const { rerender } = render(
      <AddUnderMinkSheet
        isOpen={true}
        onClose={vi.fn()}
        booking={upperOnlyBooking}
        initialMode="ADD_TO_CURRENT_ORDER"
        pendingAfterPhotoUrl="https://cdn.test/u.jpg"
        onConfirmAddRound={onConfirmAddRound}
        onConfirmCreateNewBooking={onConfirmCreateNew}
      />
    );
    expect(screen.getByText(/Book Thêm Mi Dưới \(Vòng 2\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('under-lash-type-retain'));
    fireEvent.click(screen.getByTestId('confirm-add-under-lash-btn'));
    await waitFor(() => {
      expect(onConfirmAddRound).toHaveBeenCalledWith(
        expect.objectContaining({
          underMinkServiceType: 'Retain',
          underMinkCurl: 'B',
          afterPhotoUrl: 'https://cdn.test/u.jpg',
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('confirm-add-under-lash-btn')).not.toBeDisabled();
    });

    // Settled order forces CREATE_NEW_BOOKING mode
    const settledBooking = makeDualBooking({
      id: 999809,
      status: 'DONE',
      orderState: 'Completed',
      attributes: { ...BASE_ATTRS, hasUnderMink: false, underMinkServiceType: undefined },
      billing: {
        subtotal: 770000,
        serviceTotal: 770000,
        productTotal: 0,
        grandTotal: 770000,
        paymentMethod: 'CASH',
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        settlementStatus: 'SETTLED_COMPLETED',
      },
    });
    rerender(
      <AddUnderMinkSheet
        isOpen={true}
        onClose={vi.fn()}
        booking={settledBooking}
        initialMode="ADD_TO_CURRENT_ORDER"
        onConfirmAddRound={onConfirmAddRound}
        onConfirmCreateNewBooking={onConfirmCreateNew}
      />
    );
    expect(screen.getByText(/Book Ca Mi Dưới Mới/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-add-under-lash-btn'));
    await waitFor(() => {
      expect(onConfirmCreateNew).toHaveBeenCalledWith(
        expect.objectContaining({
          underMinkServiceType: 'Normal',
        })
      );
    });
  });
});
