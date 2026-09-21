import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BugReportSummary, RequestClassifierWorkerHealth } from '@mos-lab/shared';
import { InboxWorkerLiveBar } from './BugReportWorkerActivity';

afterEach(() => {
  cleanup();
});

describe('InboxWorkerLiveBar', () => {
  const mockOnOpen = vi.fn();
  const mockOnRefresh = vi.fn();

  const sampleReports = [
    {
      id: 5,
      requestType: 'BUG',
      title: 'Bug số 5 cần sửa',
      description: 'Mô tả bug 5',
      status: 'IN_PROGRESS',
      priority: 'P2',
      reporter: { id: 1, displayName: 'Danny', role: 'ADMIN', avatarUrl: null },
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      clarification: { status: 'READY', summary: null, clarifiedAt: null },
      agentProgress: { stage: 'IMPLEMENTING', note: null, updatedAt: '2026-09-20T00:00:00.000Z' },
    },
  ] as unknown as BugReportSummary[];

  it('renders both Antigravity (AG) and Codex IDE workers independently with their online states', () => {
    const healthWithDualWorkers = {
      state: 'ONLINE',
      lastHeartbeatAt: '2026-09-21T03:00:00.000Z',
      workers: {
        ag: {
          id: 'AG',
          name: 'Antigravity (AG)',
          isOnline: true,
          lastSeenAt: '2026-09-21T03:00:00.000Z',
          activeTask: {
            ticketId: 5,
            ticketKey: 'MOS-BUG-5',
            phase: 'DEPLOYING',
            startedAt: '2026-09-21T02:50:00.000Z',
            lastProgressAt: '2026-09-21T02:59:00.000Z',
          },
        },
        codex: {
          id: 'IDE',
          name: 'Codex IDE',
          isOnline: false,
          lastSeenAt: null,
          activeTask: null,
        },
      },
    } as unknown as RequestClassifierWorkerHealth;

    render(
      <InboxWorkerLiveBar
        reports={sampleReports}
        onOpen={mockOnOpen}
        liveWorker={null}
        health={healthWithDualWorkers}
        loading={false}
        error={null}
        onRefresh={mockOnRefresh}
      />
    );

    // Both worker names are displayed
    expect(screen.getByText('Antigravity (AG)')).toBeDefined();
    expect(screen.getByText('Codex IDE')).toBeDefined();

    // AG is Online, Codex is Offline
    expect(screen.getByText('Online')).toBeDefined();
    expect(screen.getByText('Offline')).toBeDefined();

    // AG active ticket MOS-BUG-5 is rendered and clickable
    const ticketButton = screen.getByText('MOS-BUG-5');
    expect(ticketButton).toBeDefined();
    fireEvent.click(ticketButton);
    expect(mockOnOpen).toHaveBeenCalledWith(5);

    // Codex is offline and shows Tạm dừng
    expect(screen.getByText('Tạm dừng')).toBeDefined();
  });

  it('renders idle ready message when worker is online without an active ticket', () => {
    const healthIdleOnline = {
      state: 'ONLINE',
      lastHeartbeatAt: '2026-09-21T03:00:00.000Z',
      workers: {
        ag: {
          id: 'AG',
          name: 'Antigravity (AG)',
          isOnline: true,
          lastSeenAt: '2026-09-21T03:00:00.000Z',
          activeTask: null,
        },
        codex: {
          id: 'IDE',
          name: 'Codex IDE',
          isOnline: true,
          lastSeenAt: '2026-09-21T03:00:00.000Z',
          activeTask: null,
        },
      },
    } as unknown as RequestClassifierWorkerHealth;

    render(
      <InboxWorkerLiveBar
        reports={sampleReports}
        onOpen={mockOnOpen}
        liveWorker={null}
        health={healthIdleOnline}
        loading={false}
        error={null}
        onRefresh={mockOnRefresh}
      />
    );

    const readyElements = screen.getAllByText('Sẵn sàng nhận ticket');
    expect(readyElements).toHaveLength(2);
  });

  it('handles refresh button clicks and displays errors', () => {
    render(
      <InboxWorkerLiveBar
        reports={[]}
        onOpen={mockOnOpen}
        liveWorker={null}
        health={null}
        loading={false}
        error="Network timeout"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Không thể tải sức khỏe worker.')).toBeDefined();
    const refreshBtn = screen.getByLabelText('Tải lại trạng thái worker');
    fireEvent.click(refreshBtn);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
});
