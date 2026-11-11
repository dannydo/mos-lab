import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Screen07bLashProgressCleaned } from '../Screen07bLashProgressCleaned';
import { BookingItem } from '../../../state/mockData';

// Mock ThemeContext
vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

// Mock offlineSync
vi.mock('../../../state/offlineSync', () => ({
  saveLocalProgressSnapshot: vi.fn(),
  getLocalProgressSnapshot: vi.fn(() => ({})),
  getLocalProgressSnapshotAsync: vi.fn(() => Promise.resolve({})),
}));

describe('Screen07bLashProgressCleaned - Retain Lash Count for Dặm', () => {
  const refillBooking: BookingItem = {
    id: 999901,
    orderNumber: 'ORD-999901',
    customerName: 'Chị Tuyết',
    customerPhone: '0988.665.432',
    customerId: 26902,
    customerVisits: 3,
    customerNote: 'Khách dặm mi',
    serviceDuration: 50,
    serviceName: 'Dặm New Classic 1D (70 sợi)',
    serviceType: 'Retain',
    servicePrice: 280000,
    timeSlot: '17:00 - 18:30',
    time12h: '05:00 pm',
    status: 'SERVICING',
    progress: {
      elapsedSeconds: 0,
      timerRunning: false,
    },
  };

  it('renders retain lash count section when service is Dặm (Retain)', () => {
    const onSave = vi.fn();
    render(<Screen07bLashProgressCleaned booking={refillBooking} onBack={vi.fn()} onSavePhoto={onSave} />);

    expect(screen.getByText(/Số Lượng Sợi mi Còn lại/i)).toBeInTheDocument();
    expect(screen.getByText(/Mắt trái/i)).toBeInTheDocument();
    expect(screen.getByText(/Mắt phải/i)).toBeInTheDocument();
    expect(screen.queryByText('#17')).not.toBeInTheDocument();
    expect(screen.queryByText('#18')).not.toBeInTheDocument();
  });

  it('blocks saving if lash count left and right are not entered for Dặm', () => {
    const onSave = vi.fn();
    render(<Screen07bLashProgressCleaned booking={refillBooking} onBack={vi.fn()} onSavePhoto={onSave} />);

    // Since default is blank '', the CTA button is locked with 'BẮT BUỘC CHỌN SỐ LƯỢNG MI ĐỂ TIẾP TỤC'
    const ctaButton = screen.getByRole('button', { name: /BẮT BUỘC CHỌN SỐ LƯỢNG MI ĐỂ TIẾP TỤC/i });
    expect(ctaButton).toBeDisabled();

    fireEvent.click(ctaButton);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Bắt buộc chọn hoặc nhập số lượng mi còn lại của cả 2 mắt/i)).toBeInTheDocument();
  });

  it('allows stepping and saves retainLashes when valid numbers are provided via quick chips (0, 20, 40, 60) and photo or decline reason is selected', () => {
    const onSave = vi.fn();
    render(<Screen07bLashProgressCleaned booking={refillBooking} onBack={vi.fn()} onSavePhoto={onSave} />);

    // Click quick chips: 20 for left, 40 for right
    const chips20 = screen.getAllByRole('button', { name: '20' });
    const chips40 = screen.getAllByRole('button', { name: '40' });

    fireEvent.click(chips20[0]); // Left eye chip 20
    fireEvent.click(chips40[1]); // Right eye chip 40

    expect(screen.getByText(/Tổng mi còn lại:/i)).toBeInTheDocument();
    expect(screen.getByText(/60 sợi/i)).toBeInTheDocument();
    expect(screen.getByText(/Rụng ~/i)).toBeInTheDocument();

    // Without photo or decline reason, CTA is still blocked by photo gate
    const blockedBtn = screen.getByRole('button', { name: /BẮT BUỘC CHỤP ẢNH VỆ SINH HOẶC CHỌN LÝ DO/i });
    expect(blockedBtn).toBeDisabled();

    // Check "Khách từ chối chụp ảnh (Có lý do)"
    const declineCheckbox = screen.getByRole('checkbox');
    fireEvent.click(declineCheckbox);

    const ctaButton = screen.getByRole('button', { name: /BẮT ĐẦU NỐI MI & BẤM GIỜ/i });
    expect(ctaButton).not.toBeDisabled();
    fireEvent.click(ctaButton);

    expect(onSave).toHaveBeenCalledWith(
      'DECLINED:Khách nhạy cảm riêng tư',
      expect.objectContaining({ left: 20, right: 40 })
    );
  });

  it('increases and decreases lash count by 1 with plus/minus buttons', () => {
    const onSave = vi.fn();
    render(<Screen07bLashProgressCleaned booking={refillBooking} onBack={vi.fn()} onSavePhoto={onSave} />);

    // Select 20 for left, 20 for right first
    const chips20 = screen.getAllByRole('button', { name: '20' });
    fireEvent.click(chips20[0]);
    fireEvent.click(chips20[1]);

    const plusButtons = screen.getAllByRole('button', { name: 'Tăng 1' });
    const minusButtons = screen.getAllByRole('button', { name: 'Giảm 1' });

    // Click + for left eye (20 -> 21)
    fireEvent.click(plusButtons[0]);
    // Click - for right eye (20 -> 19)
    fireEvent.click(minusButtons[1]);

    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(inputs[0].value).toBe('21');
    expect(inputs[1].value).toBe('19');
  });
});
