import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CallAiAnalysisPanel } from '../CallAiAnalysisPanel';

describe('CallAiAnalysisPanel', () => {
  it('renders Happy Call badge, CSKH classification, complaint alert, and audio player when DONE', () => {
    const audioRef = createRef<HTMLAudioElement>();
    render(
      <CallAiAnalysisPanel
        callDuration={46}
        isDark={true}
        audioRef={audioRef}
        resolvedLog={{
          id: 752,
          analysisStatus: 'DONE',
          billSec: 34,
          happyCallStatus: 'APPROVED',
          happyCallReason: 'auto_laughter_30s',
          callType: 'CSKH',
          hasComplaint: true,
          qaTags: ['CSKH', 'Khiếu nại'],
          customerSatisfactionScore: 4,
          customerSentiment: 'SATISFIED',
          satisfactionAnalysis: 'Khách hài lòng nhưng góp ý nhẹ về thời gian chờ.',
          laughCountCustomer: 1,
          laughCountAgent: 1,
          laughTimestamps: [{ speaker: 'customer', start: 18 }],
          recordingUrl: 'https://cdn.example.com/call-752.mp3',
        }}
      />
    );

    expect(screen.getByText(/Đạt Happy Call/)).toBeInTheDocument();
    expect(screen.getByText('CSKH')).toBeInTheDocument();
    expect(screen.getByText(/Phát hiện phản ánh \/ khiếu nại/)).toBeInTheDocument();
    expect(screen.getByText(/Đàm thoại: 00:34/)).toBeInTheDocument();
    expect(screen.getByText(/KH: 18s/)).toBeInTheDocument();
    const audioEl = document.querySelector('audio');
    expect(audioEl).not.toBeNull();
    expect(audioEl?.getAttribute('src')).toBe('https://cdn.example.com/call-752.mp3');
  });

  it('stops spinner and renders clear notice when analysisStatus is SKIPPED', () => {
    const audioRef = createRef<HTMLAudioElement>();
    render(
      <CallAiAnalysisPanel
        callDuration={0}
        isDark={false}
        audioRef={audioRef}
        resolvedLog={{
          id: 753,
          analysisStatus: 'SKIPPED',
        }}
      />
    );

    expect(screen.queryByText(/AI đang phân tích cuộc gọi ngầm/)).not.toBeInTheDocument();
    expect(screen.getByText(/Cuộc gọi chưa kết nối hoặc chưa có file ghi âm/)).toBeInTheDocument();
  });

  it('stops spinner and renders timeout warning when analysisStatus is TIMEOUT', () => {
    const audioRef = createRef<HTMLAudioElement>();
    render(
      <CallAiAnalysisPanel
        callDuration={34}
        isDark={true}
        audioRef={audioRef}
        resolvedLog={{
          analysisStatus: 'TIMEOUT',
          analysisError: 'Chưa nhận được kết quả phân tích từ OmiCall/AI (quá 90 giây).',
        }}
      />
    );

    expect(screen.queryByText(/AI đang phân tích cuộc gọi ngầm/)).not.toBeInTheDocument();
    expect(screen.getByText(/quá 90 giây/)).toBeInTheDocument();
  });
});
