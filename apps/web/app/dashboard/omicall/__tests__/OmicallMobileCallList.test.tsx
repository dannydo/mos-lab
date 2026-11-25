import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OmicallMobileCallList } from '../omicall-page-modules/OmicallMobileCallList';
import type { OmicallLogRow } from '../omicall-page-modules/omicallPageTypes';

describe('OmicallMobileCallList', () => {
  const sampleLogs: OmicallLogRow[] = [
    {
      id: 754,
      callUuid: 'uuid-754',
      direction: 'outbound',
      createdAt: '2026-11-24T14:47:00.000Z',
      staffId: 4,
      staffName: 'Tâm Nguyễn',
      customerName: 'Bảo Hân',
      storeName: 'Đề Thám',
      destinationNumber: '0989062401',
      duration: 133,
      billSec: 133,
      recordingUrl: 'https://cdn.example.com/754.mp3',
      status: 'ANSWER',
      analysisStatus: 'DONE',
      laughCount: 2,
      customerSatisfactionScore: 3,
      happyCallStatus: 'APPROVED',
      qaTags: ['CSKH'],
      staffSelfSatisfactionScore: 5,
    },
    {
      id: 750,
      callUuid: 'uuid-750',
      direction: 'outbound',
      createdAt: '2026-11-24T12:15:00.000Z',
      customerName: 'Quang Khải',
      storeName: 'Đề Thám',
      destinationNumber: '0355175680',
      duration: 3,
      billSec: 0,
      recordingUrl: null,
      status: 'NOANSWER',
      analysisStatus: 'SKIPPED',
      laughCount: 0,
      happyCallStatus: 'NONE',
    },
  ];

  it('renders Happy Call hero card with inline play (without opening drawer) and compact dimmed NOANSWER line', () => {
    const onTogglePlay = vi.fn();
    const onOpenQaDrawer = vi.fn();

    render(
      <OmicallMobileCallList
        logs={sampleLogs}
        loading={false}
        dateMode="day"
        playingLogId={null}
        currentPage={1}
        pageSize={20}
        totalLogs={2}
        onTogglePlay={onTogglePlay}
        onOpenQaDrawer={onOpenQaDrawer}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Bảo Hân')).toBeInTheDocument();
    expect(screen.getByText('Happy Call')).toBeInTheDocument();
    expect(screen.getByText('3★')).toBeInTheDocument();
    expect(screen.getByText('5★')).toBeInTheDocument();
    expect(screen.getByText('Quang Khải')).toBeInTheDocument();

    const playBtn = screen.getByRole('button', { name: 'Nghe ghi âm' });
    fireEvent.click(playBtn);
    expect(onTogglePlay).toHaveBeenCalledWith(754);
    expect(onOpenQaDrawer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Quang Khải'));
    expect(onOpenQaDrawer).toHaveBeenCalledWith(750);
  });
});
