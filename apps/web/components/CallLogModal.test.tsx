import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CallLogModal, { QUICK_NOTE_PRESETS } from './CallLogModal';

const apiMocks = vi.hoisted(() => ({
  createCall: vi.fn(),
  listCustomers: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  apiClient: {
    calls: {
      create: apiMocks.createCall,
    },
    customers: {
      list: apiMocks.listCustomers,
    },
  },
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
  }),
}));

vi.mock('../context/OmiCallContext', () => ({
  useOmiCall: () => ({
    isCallLogModalOpen: false,
    callLogCustomerInfo: null,
    closeCallLogModal: vi.fn(),
    currentCall: null,
    activeCall: null,
    callDuration: 0,
    resolvedLog: null,
  }),
}));

describe('CallLogModal - Anti-Rage-Click & Quick Presets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.createCall.mockResolvedValue({ id: 999, success: true });
    apiMocks.listCustomers.mockResolvedValue({ data: [{ id: 1001, fullName: 'Nguyễn Văn Test' }] });
  });

  it('exports valid QUICK_NOTE_PRESETS with all required quick tags', () => {
    expect(QUICK_NOTE_PRESETS).toBeDefined();
    const labels = QUICK_NOTE_PRESETS.map((p) => p.label);
    expect(labels).toContain('Gọi nhỡ');
    expect(labels).toContain('24h nt');
    expect(labels).toContain('Máy bận');
    expect(labels).toContain('Thuê bao');
    expect(labels).toContain('Hẹn gọi lại');
    expect(labels).toContain('Sai số');
    expect(labels).toContain('Không nhu cầu');

    const note24h = QUICK_NOTE_PRESETS.find((p) => p.label === '24h nt');
    expect(note24h?.text).toBe('24h nt');
    expect(note24h?.result).toBe('NO_ANSWER');
  });

  it('renders modal with customer name, quick action buttons, and preset tags', async () => {
    render(
      <CallLogModal
        visible={true}
        customerName="Chị Lan Thảo"
        legacyUserId={1001}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Chị Lan Thảo/)).toBeInTheDocument();
    expect(screen.getByText(/GHI NHANH & LƯU NGAY \(1-CLICK\)/)).toBeInTheDocument();
    expect(screen.getByText('Gọi Nhỡ (Lưu ngay)')).toBeInTheDocument();
    expect(screen.getByText('24h NT (Lưu ngay)')).toBeInTheDocument();
    expect(screen.getByText('Máy Bận (Lưu ngay)')).toBeInTheDocument();
    expect(screen.getByText('Hẹn Gọi Lại')).toBeInTheDocument();
    expect(screen.getByText('Đã Book Lịch')).toBeInTheDocument();

    // Check presence of preset tags
    expect(screen.getByText('+ Gọi nhỡ')).toBeInTheDocument();
    expect(screen.getByText('+ 24h nt')).toBeInTheDocument();
    expect(screen.getByText('+ Máy bận')).toBeInTheDocument();
    expect(screen.getByText('+ Thuê bao')).toBeInTheDocument();
  });

  it('populates textarea when clicking a quick preset tag', async () => {
    render(
      <CallLogModal
        visible={true}
        customerName="Khách Test"
        legacyUserId={1001}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const tag24h = screen.getByText('+ 24h nt');
    fireEvent.click(tag24h);

    const textarea = screen.getByPlaceholderText(/Nhập ghi chú chi tiết về cuộc hội thoại/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toBe('24h nt');
    });
  });

  it('saves immediately when 1-click "24h NT (Lưu ngay)" is pressed and prevents duplicate calls', async () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    // Make API call take a brief moment to simulate network latency
    let resolveCall: (val: any) => void;
    apiMocks.createCall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        })
    );

    render(
      <CallLogModal
        visible={true}
        customerName="Khách Test 24h"
        legacyUserId={1001}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    );

    const btn24h = screen.getByText('24h NT (Lưu ngay)');

    // Simulate rage click / double-clicking rapidly 3 times
    fireEvent.click(btn24h);
    fireEvent.click(btn24h);
    fireEvent.click(btn24h);

    // Concurrency lock should restrict to exactly 1 in-flight call
    await waitFor(() => {
      expect(apiMocks.createCall).toHaveBeenCalledTimes(1);
    });
    expect(apiMocks.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        legacyUserId: 1001,
        callResult: 'NO_ANSWER',
        outcome: 'PENDING',
        note: '24h nt',
      })
    );

    // Additional click while still loading should be ignored
    fireEvent.click(btn24h);
    expect(apiMocks.createCall).toHaveBeenCalledTimes(1);

    // Resolve API promise
    resolveCall!({ id: 1, success: true });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it('triggers form submit when Ctrl + Enter is pressed inside the note textarea', async () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    render(
      <CallLogModal
        visible={true}
        customerName="Khách Shortcut"
        legacyUserId={1001}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/Nhập ghi chú chi tiết về cuộc hội thoại/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Khách yêu cầu gọi lại chiều mai' } });

    // Press Ctrl + Enter
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(apiMocks.createCall).toHaveBeenCalledTimes(1);
      expect(apiMocks.createCall).toHaveBeenCalledWith(
        expect.objectContaining({
          legacyUserId: 1001,
          note: 'Khách yêu cầu gọi lại chiều mai',
        })
      );
    });
  });
});
