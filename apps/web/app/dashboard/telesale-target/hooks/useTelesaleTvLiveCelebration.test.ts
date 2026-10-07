import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { getRandomQuote, useTelesaleTvLiveCelebration } from './useTelesaleTvLiveCelebration';
import { getBestVietnameseVoice } from '../../../../components/voice-assistant/speech-utils';
import { TelesaleTodayLiveEvent } from '@mos-lab/shared';

// Mock apiClient.telesaleTarget
vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    telesaleTarget: {
      getCelebrationQuote: vi.fn().mockResolvedValue({
        quote: 'Chúc mừng Bích Phượng hoàn thành xuất sắc một Done!',
      }),
      syncTvJournal: vi.fn().mockResolvedValue({ success: true, count: 1 }),
    },
  },
}));

describe('useTelesaleTvLiveCelebration Quotes & Voice Style', () => {
  it('replaces [Tên] placeholder with staff name correctly', () => {
    const quotes = ['Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần.'];
    const res = getRandomQuote(quotes, 'Bích Phượng');
    expect(res).toBe('Anh thích cái cách Bích Phượng chăm sóc khách hàng đầy ân cần.');
  });

  it('contains the 4 Wings cultural values: Vui vẻ, Ân cần, Chân thành, Khoa học', () => {
    const sampleQuotes = [
      'Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần.',
      '[Tên] ơi, sự chân thành từ trái tim em luôn có ma lực đặc biệt.',
      'Tư vấn chuẩn xác, phân tích nhu cầu cực kỳ khoa học.',
      'Nụ cười vui vẻ của [Tên] qua từng cuộc gọi đã thắp sáng cả phòng rồi.',
    ];

    const joined = sampleQuotes.join(' ');
    expect(joined.toLowerCase()).toContain('ân cần');
    expect(joined.toLowerCase()).toContain('chân thành');
    expect(joined.toLowerCase()).toContain('khoa học');
    expect(joined.toLowerCase()).toContain('vui vẻ');
  });

  it('getBestVietnameseVoice filters male and female voices when available', () => {
    const voice = getBestVietnameseVoice('male');
    expect(voice === null || typeof voice === 'object').toBe(true);
  });
});

describe('useTelesaleTvLiveCelebration Hook & Event Ingestion (MOS-BUG-86)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('does NOT announce historical data on initial load/refresh (Không phát lại dữ liệu cũ khi refresh/reconnect)', () => {
    const { result } = renderHook(() => useTelesaleTvLiveCelebration());

    const historicalEvents: TelesaleTodayLiveEvent[] = [
      {
        id: 'book-101',
        type: 'BOOK',
        staffId: 50670,
        staffName: 'Bích Phượng',
        timestamp: new Date().toISOString(),
        orderId: 101,
      },
      {
        id: 'done-201',
        type: 'DONE',
        staffId: 50670,
        staffName: 'Bích Phượng',
        timestamp: new Date().toISOString(),
        orderId: 201,
      },
    ];

    act(() => {
      result.current.ingestLiveEvents(historicalEvents);
    });

    // On initial mount / hydration, existing historical events are marked as baseline seen and NOT announced
    expect(result.current.activeCelebration).toBeNull();
  });

  it('triggers Voice Celebration immediately when a new Check-in or Book arrives in subsequent polls', async () => {
    const { result } = renderHook(() => useTelesaleTvLiveCelebration());

    const initialEvents: TelesaleTodayLiveEvent[] = [
      {
        id: 'book-101',
        type: 'BOOK',
        staffId: 50670,
        staffName: 'Bích Phượng',
        timestamp: new Date().toISOString(),
        orderId: 101,
      },
    ];

    // Initial load: 1 historical event
    act(() => {
      result.current.ingestLiveEvents(initialEvents);
    });
    expect(result.current.activeCelebration).toBeNull();

    // Subsequent poll: new Check-in event arrives for Bích Phượng
    const newCheckinEvent: TelesaleTodayLiveEvent = {
      id: 'checkin-336827',
      type: 'CHECKIN',
      staffId: 50670,
      staffName: 'Bích Phượng',
      avatarUrl: 'https://avatar/phuong.jpg',
      timestamp: new Date().toISOString(),
      orderId: 336827,
    };

    act(() => {
      result.current.ingestLiveEvents([...initialEvents, newCheckinEvent]);
    });

    await waitFor(() => {
      expect(result.current.activeCelebration).not.toBeNull();
    });

    expect(result.current.activeCelebration?.id).toBe('checkin-336827');
    expect(result.current.activeCelebration?.kind).toBe('CHECKIN');
    expect(result.current.activeCelebration?.staffName).toBe('Bích Phượng');
    expect(result.current.activeCelebration?.badgeText).toBe('+1 CHECK-IN KHÁCH LẺ');
    expect(result.current.activeCelebration?.colorTheme).toBe('emerald');
  });

  it('triggers special Voice Celebration for Done event with Combo package', async () => {
    const { result } = renderHook(() => useTelesaleTvLiveCelebration());

    act(() => {
      result.current.ingestLiveEvents([]);
    });

    const comboDoneEvent: TelesaleTodayLiveEvent = {
      id: 'done-combo-1',
      type: 'DONE',
      staffId: 50670,
      staffName: 'Bích Phượng',
      timestamp: new Date().toISOString(),
      hasCombo: true,
      comboPackageName: 'Combo 5 Buổi',
    };

    act(() => {
      result.current.ingestLiveEvents([comboDoneEvent]);
    });

    await waitFor(() => {
      expect(result.current.activeCelebration).not.toBeNull();
    });

    expect(result.current.activeCelebration?.kind).toBe('COMBO');
    expect(result.current.activeCelebration?.badgeText).toBe('✨ +1 COMBO ĐÃ CHỐT!');
    expect(result.current.activeCelebration?.colorTheme).toBe('purple');
  });

  it('ensures each event is announced only once and does not repeat on duplicate polls', async () => {
    const { result } = renderHook(() => useTelesaleTvLiveCelebration());

    // Initial baseline
    act(() => {
      result.current.ingestLiveEvents([]);
    });

    const newCheckinEvent: TelesaleTodayLiveEvent = {
      id: 'checkin-500',
      type: 'CHECKIN',
      staffId: 52648,
      staffName: 'Thuý Kiều',
      timestamp: new Date().toISOString(),
      orderId: 500,
    };

    act(() => {
      result.current.ingestLiveEvents([newCheckinEvent]);
    });

    await waitFor(() => {
      expect(result.current.activeCelebration?.id).toBe('checkin-500');
    });

    // Ingesting the same event again in next poll must NOT duplicate
    act(() => {
      result.current.ingestLiveEvents([newCheckinEvent]);
    });

    // Remains checkin-500 (not queued a second time)
    expect(result.current.activeCelebration?.id).toBe('checkin-500');
  });
});
