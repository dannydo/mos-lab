import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerOmicallRecordingsSection } from '../CustomerOmicallRecordingsSection';

const apiMocks = vi.hoisted(() => ({
  listLogs: vi.fn(),
  reanalyzeLog: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    omicall: {
      listLogs: apiMocks.listLogs,
      reanalyzeLog: apiMocks.reanalyzeLog,
    },
  },
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockQAPlayerDrawer({ open, omicallLogId }: { open: boolean; omicallLogId: number | null }) {
      return open ? <div data-testid="mock-qa-player-drawer">QA Log #{omicallLogId}</div> : null;
    };
  },
}));

describe('CustomerOmicallRecordingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listLogs.mockResolvedValue({
      total: 1,
      logs: [
        {
          id: 754,
          callUuid: '8a343772-f035-44b2-a99b-5f59d0224c0f',
          direction: 'outbound',
          status: 'ANSWER',
          sourceNumber: '02866810755',
          destinationNumber: '0989062401',
          duration: 132,
          billSec: 133,
          recordingUrl: 'https://cdn.example.com/rec-754.mp3',
          staffId: 1,
          staffName: 'Danny Do',
          analysisStatus: 'DONE',
          happyCallStatus: 'APPROVED',
          laughCount: 1,
          customerSatisfactionScore: 5,
          customerSentiment: 'HAPPY',
          satisfactionAnalysis: 'Cuộc gọi CSKH thân thiện, khách hài lòng.',
          qaTags: ['CSKH', 'Xuất sắc'],
          createdAt: '2026-11-24T14:49:43.000Z',
        },
      ],
    });
    apiMocks.reanalyzeLog.mockResolvedValue({ success: true, logId: 754 });
  });

  it('fetches customer OmiCall logs, renders deep-link, inline player toggle, reanalyze, and QA drawer', async () => {
    render(<CustomerOmicallRecordingsSection customerId={43554} customerName="Bảo Hân" themeMode="dark" />);

    await waitFor(() => {
      expect(apiMocks.listLogs).toHaveBeenCalledWith({
        legacyUserId: 43554,
        page: 1,
        limit: 20,
      });
    });

    expect(await screen.findByText(/Danny Do/)).toBeInTheDocument();
    expect(screen.getByText('CSKH')).toBeInTheDocument();
    expect(screen.getByText(/★ 5\/5/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Mở trang OmiCall/i });
    expect(link).toHaveAttribute('href', '/dashboard/omicall?legacyUserId=43554&customerName=B%E1%BA%A3o%20H%C3%A2n');

    // Toggle inline audio player
    fireEvent.click(screen.getByRole('button', { name: /Nghe ghi âm/i }));
    const audioEl = document.querySelector('audio');
    expect(audioEl).not.toBeNull();
    expect(audioEl?.getAttribute('src')).toBe('https://cdn.example.com/rec-754.mp3');

    // Open QA Player Drawer
    fireEvent.click(screen.getByRole('button', { name: /Xem AI & QA/i }));
    expect(screen.getByTestId('mock-qa-player-drawer')).toHaveTextContent('QA Log #754');

    // Trigger re-analyze
    fireEvent.click(screen.getByRole('button', { name: /Phân tích AI/i }));
    await waitFor(() => {
      expect(apiMocks.reanalyzeLog).toHaveBeenCalledWith(754);
    });
  });
});
