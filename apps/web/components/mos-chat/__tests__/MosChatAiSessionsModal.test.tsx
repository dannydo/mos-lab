import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const listSessions = vi.fn();

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    ai: {
      listSessions: (...args: unknown[]) => listSessions(...args),
    },
  },
}));

import {
  MosChatAiSessionsModal,
  parseSessionIdFromInput,
  summarizeSessionPrivacy,
} from '../components/MosChatAiSessionsModal';

const SESSION_A = '3f2b8c1e-9d4a-4e0b-8a57-1c2d3e4f5a6b';
const SESSION_B = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

describe('parseSessionIdFromInput', () => {
  it('accepts a raw id and any permalink form', () => {
    expect(parseSessionIdFromInput(SESSION_A)).toBe(SESSION_A);
    expect(
      parseSessionIdFromInput(`https://lab.masteros.app/chat?convId=dm-wings-ai-copilot&sessionId=${SESSION_A}`)
    ).toBe(SESSION_A);
    expect(parseSessionIdFromInput(`/dashboard?chatConvId=dm-wings-ai-copilot&chatSessionId=${SESSION_B}`)).toBe(
      SESSION_B
    );
  });

  it('rejects empty or unsafe input', () => {
    expect(parseSessionIdFromInput('')).toBeUndefined();
    expect(parseSessionIdFromInput('   ')).toBeUndefined();
    expect(parseSessionIdFromInput('/chat?sessionId=../../x')).toBeUndefined();
    expect(parseSessionIdFromInput('hello world')).toBeUndefined();
  });
});

describe('summarizeSessionPrivacy', () => {
  it('reads the sharing flag and the Admin / Super Admin view log from metadata', () => {
    expect(summarizeSessionPrivacy(null)).toEqual({ shared: false, adminViews: 0 });
    expect(
      summarizeSessionPrivacy({
        sharing: { enabled: true },
        accessLog: [
          { viewerName: 'A', mode: 'audit', at: '2026-11-20T01:00:00.000Z' },
          { viewerName: 'Danny', mode: 'mission', at: '2026-11-21T01:00:00.000Z' },
        ],
      })
    ).toEqual({
      shared: true,
      adminViews: 2,
      lastView: { name: 'Danny', mode: 'mission', at: '2026-11-21T01:00:00.000Z' },
    });
  });
});

describe('MosChatAiSessionsModal', () => {
  beforeEach(() => {
    listSessions.mockReset();
    listSessions.mockResolvedValue({
      sessions: [
        {
          id: SESSION_A,
          staffId: 1,
          title: 'Ticket 255 - perm link',
          scope: 'mos-chat-private',
          createdAt: '2026-11-21T10:00:00.000Z',
          updatedAt: '2026-11-21T11:00:00.000Z',
          lastMessage: 'Đã nâng cấp mOS Chat',
          messageCount: 4,
          metadata: {
            sharing: { enabled: true },
            accessLog: [{ viewerName: 'Danny Do', mode: 'mission', at: '2026-11-21T11:30:00.000Z' }],
          },
        },
        {
          id: SESSION_B,
          staffId: 1,
          title: 'Phiên khác',
          scope: 'mos-chat-private',
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-20T11:00:00.000Z',
          messageCount: 2,
        },
      ],
    });
  });

  it('lists sessions of the private MAI scope and opens the chosen one', async () => {
    const onSelect = vi.fn();
    render(<MosChatAiSessionsModal open onClose={() => {}} activeSessionId={SESSION_B} onSelectSession={onSelect} />);

    await waitFor(() => expect(screen.getByText('Ticket 255 - perm link')).toBeDefined());
    expect(listSessions).toHaveBeenCalledWith({ scope: 'mos-chat-private' });
    expect(screen.getByText('Đang mở')).toBeDefined();
    // Owner transparency: sharing state + Admin/Super Admin views are visible
    expect(screen.getByText('Đang chia sẻ')).toBeDefined();
    expect(screen.getByText(/Quản trị đã xem 1 lần/).textContent).toContain('liên quan mOS Mission');

    fireEvent.click(screen.getByLabelText('Mở phiên Ticket 255 - perm link'));
    expect(onSelect).toHaveBeenCalledWith(SESSION_A);
  });

  it('copies the permanent link of a session', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<MosChatAiSessionsModal open onClose={() => {}} activeSessionId={null} onSelectSession={() => {}} />);
    await waitFor(() => expect(screen.getByText('Phiên khác')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Sao chép liên kết phiên Phiên khác'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain(`/chat?convId=dm-wings-ai-copilot&sessionId=${SESSION_B}`);
  });

  it('opens a session pasted as a permalink', async () => {
    const onSelect = vi.fn();
    render(<MosChatAiSessionsModal open onClose={() => {}} activeSessionId={null} onSelectSession={onSelect} />);
    await waitFor(() => expect(screen.getByText('Phiên khác')).toBeDefined());

    const input = screen.getByLabelText('Dán liên kết hoặc mã phiên');
    fireEvent.change(input, { target: { value: `https://x/chat?convId=dm-wings-ai-copilot&sessionId=${SESSION_A}` } });
    fireEvent.click(screen.getByText('Mở phiên'));
    expect(onSelect).toHaveBeenCalledWith(SESSION_A);
  });
});
