import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MosChatVoiceCallSession } from '@mos-lab/shared';
import { MosChatVoiceCallWidget, MosChatActiveCallRoomBanner } from '../components/MosChatVoiceCallWidget';
import { formatVoiceCallTimer } from '../utils/useMosChatVoiceCall';

describe('MosChatVoiceCallWidget & Voice Call UI Invariants', () => {
  const mockIncomingCall: MosChatVoiceCallSession = {
    callId: 'call-101',
    conversationId: 'dm-1-4',
    conversationName: 'Tâm Nguyễn',
    conversationType: 'dm',
    status: 'RINGING',
    initiatorId: '4',
    initiatorName: 'Tâm Nguyễn',
    initiatorRole: 'Admin',
    targetStaffIds: ['1'],
    participants: [
      {
        staffId: '4',
        name: 'Tâm Nguyễn',
        role: 'Admin',
        isMuted: false,
        joinedAt: '2026-11-09T12:00:00.000Z',
      },
    ],
    declinedStaffIds: [],
    startedAt: '2026-11-09T12:00:00.000Z',
  };

  const mockActiveCall: MosChatVoiceCallSession = {
    ...mockIncomingCall,
    status: 'ACTIVE',
    connectedAt: '2026-11-09T12:00:05.000Z',
    participants: [
      ...mockIncomingCall.participants,
      {
        staffId: '1',
        name: 'Danny Do',
        role: 'Super Admin',
        isMuted: false,
        joinedAt: '2026-11-09T12:00:05.000Z',
      },
    ],
  };

  it('formats call timer with zero-padded minutes and seconds', () => {
    expect(formatVoiceCallTimer(0)).toBe('00:00');
    expect(formatVoiceCallTimer(65)).toBe('01:05');
    expect(formatVoiceCallTimer(3661)).toBe('01:01:01');
  });

  it('renders incoming call banner and triggers accept/decline handlers', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <MosChatVoiceCallWidget
        currentCall={null}
        incomingCall={mockIncomingCall}
        isMuted={false}
        isSpeakerMuted={false}
        durationSec={0}
        speakingStaffIds={[]}
        onAcceptIncoming={onAccept}
        onDeclineIncoming={onDecline}
        onToggleMute={vi.fn()}
        onToggleSpeakerMute={vi.fn()}
        onEndCall={vi.fn()}
      />
    );

    expect(screen.getByTestId('mos-chat-incoming-call-banner')).toBeTruthy();
    expect(screen.getByText('Tâm Nguyễn')).toBeTruthy();
    expect(screen.getByText('Cuộc gọi thoại nội bộ đến')).toBeTruthy();

    fireEvent.click(screen.getByTestId('mos-chat-accept-call-btn'));
    expect(onAccept).toHaveBeenCalledWith('call-101');

    fireEvent.click(screen.getByTestId('mos-chat-decline-call-btn'));
    expect(onDecline).toHaveBeenCalledWith('call-101');
  });

  it('renders active call overlay with tabular-nums timer and controls', () => {
    const onToggleMute = vi.fn();
    const onEndCall = vi.fn();

    render(
      <MosChatVoiceCallWidget
        currentCall={mockActiveCall}
        incomingCall={null}
        isMuted={false}
        isSpeakerMuted={false}
        durationSec={125}
        speakingStaffIds={['4']}
        onAcceptIncoming={vi.fn()}
        onDeclineIncoming={vi.fn()}
        onToggleMute={onToggleMute}
        onToggleSpeakerMute={vi.fn()}
        onEndCall={onEndCall}
      />
    );

    expect(screen.getByTestId('mos-chat-active-call-overlay')).toBeTruthy();
    const timerEl = screen.getByTestId('mos-chat-call-timer');
    expect(timerEl.textContent).toBe('02:05');
    expect(timerEl.className).toContain('tabular-nums');

    fireEvent.click(screen.getByTestId('mos-chat-toggle-mute-btn'));
    expect(onToggleMute).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('mos-chat-end-call-btn'));
    expect(onEndCall).toHaveBeenCalledTimes(1);
  });

  it('renders room call banner when a space has an active call and allows joining', () => {
    const onJoin = vi.fn();
    render(<MosChatActiveCallRoomBanner call={mockActiveCall} currentCallId={null} onJoinCall={onJoin} />);

    expect(screen.getByTestId('mos-chat-room-call-banner')).toBeTruthy();
    expect(screen.getByText('2 người')).toBeTruthy();
    fireEvent.click(screen.getByText('Tham gia ngay'));
    expect(onJoin).toHaveBeenCalledWith('dm-1-4');
  });
});
