import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TelesaleTvQuotesDrawer } from './TelesaleTvQuotesDrawer';
import { apiClient } from '../../../../lib/api-client';

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    telesaleTarget: {
      getCelebrationQuotes: vi.fn(),
      saveCelebrationQuotes: vi.fn(),
      resetCelebrationQuotes: vi.fn(),
    },
  },
}));

const mockQuotesData = {
  quotes: [
    {
      id: 'quote-1',
      personaKey: 'MC_HOI_CHO' as const,
      eventType: 'BOOK' as const,
      template: 'Vàooo! [Tên] vừa chốt Book thành công rực rỡ!',
      isActive: true,
      isCustom: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'quote-2',
      personaKey: 'DRAMA_QUEEN' as const,
      eventType: 'CHECKIN' as const,
      template: 'Ủa rồi khách của [Tên] tới chưa? Đã tới rồi nha cưng!',
      isActive: false,
      isCustom: true,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
  ],
  personas: [
    {
      key: 'MC_HOI_CHO' as const,
      name: 'MC Hội Chợ / BLV',
      badge: '🎪 MC HỘI CHỢ GÀO THÉT',
      icon: '🎪',
      voice: 'vi-VN-NamMinhNeural',
      rate: '+15%',
      pitch: '+6Hz',
      sfxType: 'vuvuzela_cheer',
      tagline: 'Gào thét cuồng nhiệt',
    },
  ],
  stats: {
    totalQuotes: 2,
    activeQuotes: 1,
    customQuotes: 1,
    byPersona: { MC_HOI_CHO: 1, DRAMA_QUEEN: 1, THAY_BOI: 0, GEN_Z: 0, TONG_TAI: 0 },
    byEvent: { BOOK: 1, CHECKIN: 1, COMBO: 0, TIP: 0, DONE: 0, STREAK: 0, MORNING: 0 },
  },
};

describe('TelesaleTvQuotesDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.telesaleTarget.getCelebrationQuotes).mockResolvedValue(mockQuotesData as any);
  });

  it('renders drawer header and loads quotes when open is true', async () => {
    render(<TelesaleTvQuotesDrawer open={true} onClose={vi.fn()} zIndex={100010} />);

    await waitFor(() => {
      expect(apiClient.telesaleTarget.getCelebrationQuotes).toHaveBeenCalled();
    });

    expect(screen.getByText('Quản Lý Thông Điệp Cổ Vũ TV')).toBeInTheDocument();
    expect(screen.getByText(/Vàooo!/)).toBeInTheDocument();
    expect(screen.getAllByText('[Tên]').length).toBeGreaterThan(0);
  });

  it('does not fetch quotes when closed', () => {
    render(<TelesaleTvQuotesDrawer open={false} onClose={vi.fn()} />);
    expect(apiClient.telesaleTarget.getCelebrationQuotes).not.toHaveBeenCalled();
  });

  it('triggers audio preview when clicking Nghe thử', async () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    const mockPause = vi.fn();

    class MockAudio {
      src = '';
      play = mockPlay;
      pause = mockPause;
      oncanplaythrough: (() => void) | null = null;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(src?: string) {
        this.src = src || '';
      }
    }
    vi.stubGlobal('Audio', MockAudio);

    const mockBlob = new Blob(['mock-audio'], { type: 'audio/mpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    } as any);

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-audio-url');
    global.URL.revokeObjectURL = vi.fn();

    render(<TelesaleTvQuotesDrawer open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(apiClient.telesaleTarget.getCelebrationQuotes).toHaveBeenCalled();
    });

    const previewButtons = screen.getAllByText('Nghe thử');
    expect(previewButtons.length).toBeGreaterThan(0);
    previewButtons[0].click();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/kpi/telesale-target/live-celebration-audio'),
        expect.objectContaining({ mode: 'cors' })
      );
      expect(mockPlay).toHaveBeenCalled();
    });

    vi.unstubAllGlobals();
  });
});
