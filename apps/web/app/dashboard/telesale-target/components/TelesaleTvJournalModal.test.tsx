import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TelesaleTvJournalModal } from './TelesaleTvJournalModal';
import { apiClient } from '../../../../lib/api-client';
import { TelesaleTvJournalOverview } from '@mos-lab/shared';

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    telesaleTarget: {
      getTvJournal: vi.fn(),
      syncTvJournal: vi.fn(),
    },
  },
}));

const mockJournalData: TelesaleTvJournalOverview = {
  totalEvents: 3,
  voiceSuccess: 2,
  voiceError: 1,
  overlaySuccess: 3,
  overlayError: 0,
  latestEventTime: '2026-10-06T14:35:20Z',
  events: [
    {
      id: 'book-1',
      timestamp: '2026-10-06T14:35:20Z',
      type: 'BOOK',
      staffId: 50670,
      staffName: 'Bích Phượng',
      orderId: 1001,
      changeResult: 'Book 6 → 7',
      eventReceived: true,
      voiceTriggered: true,
      overlayTriggered: true,
      status: 'SUCCESS',
    },
    {
      id: 'done-1',
      timestamp: '2026-10-06T11:20:10Z',
      type: 'DONE',
      staffId: 52648,
      staffName: 'Thuý Kiều',
      orderId: 1002,
      changeResult: 'Done 2 → 3',
      eventReceived: true,
      voiceTriggered: false,
      voiceErrorReason: 'Tắt âm thanh trong cài đặt TV',
      overlayTriggered: true,
      status: 'ERROR',
      errorMessage: 'Tắt âm thanh trong cài đặt TV',
    },
    {
      id: 'milestone-1',
      timestamp: '2026-10-06T10:00:00Z',
      type: 'MILESTONE',
      staffId: 0,
      staffName: 'Toàn team Telesales',
      changeResult: 'Cán mốc 10 Book',
      eventReceived: true,
      voiceTriggered: true,
      overlayTriggered: true,
      status: 'SUCCESS',
    },
  ],
};

const mockStaffList = [
  { legacyStaffId: 50670, name: 'Bích Phượng' },
  { legacyStaffId: 52648, name: 'Thuý Kiều' },
];

describe('TelesaleTvJournalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (apiClient.telesaleTarget.getTvJournal as any).mockResolvedValue(mockJournalData);
  });

  it('renders modal with 4 overview cards and event table when open', async () => {
    render(<TelesaleTvJournalModal open={true} onClose={vi.fn()} staffList={mockStaffList} />);

    // Check modal title
    expect(screen.getByText(/NHẬT KÝ TV MONITOR · GIÁM SÁT LIVE EVENTS/i)).toBeInTheDocument();

    // Wait for API call and cards to render
    await waitFor(() => {
      expect(apiClient.telesaleTarget.getTvJournal).toHaveBeenCalled();
    });

    // 4 Stat Cards
    expect(await screen.findByText('Tổng Live Events')).toBeInTheDocument();
    expect(screen.getByText('Loa / Voice TTS')).toBeInTheDocument();
    expect(screen.getByText('Celebration Overlay')).toBeInTheDocument();
    expect(screen.getByText('Sự kiện gần nhất')).toBeInTheDocument();

    // Table entries
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();
    expect(screen.getByText('Book 6 → 7')).toBeInTheDocument();
    expect(screen.getByText('Thuý Kiều')).toBeInTheDocument();
    expect(screen.getByText('Done 2 → 3')).toBeInTheDocument();
    expect(screen.getByText('Toàn team')).toBeInTheDocument();
    expect(screen.getByText('Cán mốc 10 Book')).toBeInTheDocument();

    // Error reason displayed for failed voice
    expect(screen.getByText('Tắt âm thanh trong cài đặt TV')).toBeInTheDocument();
  });

  it('does not render modal content when open is false', () => {
    const { queryByText } = render(
      <TelesaleTvJournalModal open={false} onClose={vi.fn()} staffList={mockStaffList} />
    );
    expect(queryByText(/NHẬT KÝ TV MONITOR · GIÁM SÁT LIVE EVENTS/i)).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    render(<TelesaleTvJournalModal open={true} onClose={handleClose} staffList={mockStaffList} />);

    await waitFor(() => {
      expect(apiClient.telesaleTarget.getTvJournal).toHaveBeenCalled();
    });

    const closeButton = screen.getByRole('button', { name: /^Đóng$/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger audio playback or voice synthesis when opened', async () => {
    const speakSpy = vi.fn();
    (window as any).speechSynthesis = {
      speak: speakSpy,
      cancel: vi.fn(),
    };
    const audioPlaySpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());

    render(<TelesaleTvJournalModal open={true} onClose={vi.fn()} staffList={mockStaffList} />);

    await waitFor(() => {
      expect(apiClient.telesaleTarget.getTvJournal).toHaveBeenCalled();
    });

    // Verification of invariant: NO audio playback triggered when viewing journal
    expect(speakSpy).not.toHaveBeenCalled();
    expect(audioPlaySpy).not.toHaveBeenCalled();

    audioPlaySpy.mockRestore();
  });
});
