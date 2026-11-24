import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { resolveDmOmiCallTarget } from '../utils/resolveDmOmiCallTarget';
import { MosChatDesktopHeader, type MosChatDesktopHeaderProps } from '../components/MosChatDesktopHeader';
import { MosChatRichTextPure } from '../MosChatRichText';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

const mockOmiCallState = vi.hoisted(() => ({
  makeCall: vi.fn(),
  canAccessOmiCall: true,
  isAdmin: true,
}));

vi.mock('../../../context/OmiCallContext', () => ({
  useOmiCall: () => mockOmiCallState,
}));

vi.mock('../../notification-center/HeaderNotificationCenter', () => ({
  HeaderNotificationCenter: () => <div data-testid="mock-notif-center" />,
}));

vi.mock('../components/MosChatHeaderOverflowMenu', () => ({
  MosChatHeaderOverflowMenu: () => <div data-testid="mock-overflow-menu" />,
}));

const staffDirectory: MosChatStaffMember[] = [
  {
    id: 1,
    username: 'danhdo@gmail.com',
    displayName: 'Danny Do',
    role: 'super_admin',
    phone: '0901111222',
    phones: ['0901111222'],
    avatarUrl: 'https://cdn.wingslashes.com/danny.jpg',
  },
  {
    id: 13,
    username: 'han.huynh@wingslashes.com',
    displayName: 'Bảo Hân',
    role: 'admin',
    phone: '0702610128',
    phones: ['0702610128', '0989062401'],
    avatarUrl: 'https://cdn.wingslashes.com/han.jpg',
  },
  {
    id: 21,
    username: 'no.phone@wingslashes.com',
    displayName: 'No Phone Staff',
    role: 'cc',
    phone: null,
  },
  {
    id: 22,
    username: 'short.phone@wingslashes.com',
    displayName: 'Short Phone',
    role: 'cc',
    phone: '1234',
  },
];

const currentUser = { id: 1, username: 'danhdo@gmail.com', role: 'super_admin' };

describe('resolveDmOmiCallTarget', () => {
  it('resolves multiple peer phones by participantStaffId', () => {
    const conv: MosChatConversation = {
      id: 'dm-1-13',
      type: 'dm',
      name: 'Bảo Hân',
      color: '#10b981',
      participantStaffId: 13,
      messages: [],
      unreadCount: 0,
      updatedAt: '2026-11-24T10:00:00Z',
    };

    expect(resolveDmOmiCallTarget(conv, staffDirectory, currentUser)).toEqual({
      staffId: 13,
      displayName: 'Bảo Hân',
      phone: '0702610128',
      phones: ['0702610128', '0989062401'],
      avatarUrl: 'https://cdn.wingslashes.com/han.jpg',
    });
  });

  it('falls back to memberIds when participantStaffId is missing', () => {
    const conv: MosChatConversation = {
      id: 'dm-legacy-13',
      type: 'dm',
      name: 'Bảo Hân (Admin)',
      color: '#10b981',
      memberIds: [1, 13],
      messages: [],
      unreadCount: 0,
      updatedAt: '2026-11-24T10:00:00Z',
    };

    expect(resolveDmOmiCallTarget(conv, staffDirectory, currentUser)?.phones).toEqual(['0702610128', '0989062401']);
  });

  it('falls back to case-insensitive displayName or username match when IDs are missing', () => {
    const conv: MosChatConversation = {
      id: 'dm-name-only',
      type: 'dm',
      name: '  bảo hân ',
      color: '#10b981',
      messages: [],
      unreadCount: 0,
      updatedAt: '2026-11-24T10:00:00Z',
    };

    expect(resolveDmOmiCallTarget(conv, staffDirectory, currentUser)?.phone).toBe('0702610128');
  });

  it('returns null for spaces, AI Copilot, self-DMs, missing phone, or invalid short phone', () => {
    const baseConv = {
      color: '#10b981',
      messages: [],
      unreadCount: 0,
      updatedAt: '2026-11-24T10:00:00Z',
    };

    expect(
      resolveDmOmiCallTarget(
        { ...baseConv, id: 'space-core', type: 'space', name: 'Core' },
        staffDirectory,
        currentUser
      )
    ).toBeNull();

    expect(
      resolveDmOmiCallTarget(
        { ...baseConv, id: AI_COPILOT_CONV_ID, type: 'dm', name: 'MAI' },
        staffDirectory,
        currentUser
      )
    ).toBeNull();

    expect(
      resolveDmOmiCallTarget(
        { ...baseConv, id: 'dm-self-1', type: 'dm', name: 'Danny Do', isSelf: true, participantStaffId: 1 },
        staffDirectory,
        currentUser
      )
    ).toBeNull();

    expect(
      resolveDmOmiCallTarget(
        { ...baseConv, id: 'dm-1-21', type: 'dm', name: 'No Phone Staff', participantStaffId: 21 },
        staffDirectory,
        currentUser
      )
    ).toBeNull();

    expect(
      resolveDmOmiCallTarget(
        { ...baseConv, id: 'dm-1-22', type: 'dm', name: 'Short Phone', participantStaffId: 22 },
        staffDirectory,
        currentUser
      )
    ).toBeNull();
  });
});

describe('MosChatDesktopHeader universal OmiCall dialer popover', () => {
  const dmConv: MosChatConversation = {
    id: 'dm-1-13',
    type: 'dm',
    name: 'Bảo Hân',
    color: '#10b981',
    participantStaffId: 13,
    messages: [],
    unreadCount: 0,
    updatedAt: '2026-11-24T10:00:00Z',
  };

  function buildHeaderProps(overrides: Partial<MosChatDesktopHeaderProps> = {}): MosChatDesktopHeaderProps {
    return {
      isDark: true,
      isMobile: false,
      standalone: false,
      token: { colorText: '#fff', colorTextSecondary: '#94a3b8' } as MosChatDesktopHeaderProps['token'],
      antdMessage: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
      surfaceBg: '#111827',
      surfaceRaised: '#1f2937',
      borderColor: '#374151',
      currentUser,
      staffDirectory,
      isDannyAccount: true,
      activeConversation: dmConv,
      activeSubtab: 'chat',
      setActiveSubtab: vi.fn(),
      setMobileActiveView: vi.fn(),
      uniqueTasks: [],
      workspaceSharedItemsCount: 0,
      userPrefs: {
        pinnedIds: [],
        mutedIds: [],
        hiddenIds: [],
        manualUnreadIds: [],
        collapsedSections: {},
        unreadOnlySections: {},
        sectionOrder: [],
        customSections: [],
        conversationOrder: {},
      },
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      maiVoiceAnnounceEnabled: false,
      ttsSpeed: 1,
      aiSessionId: null,
      isAiSessionReadOnly: false,
      aiSessionAccess: null,
      handleToggleMaiVoiceAnnounce: vi.fn(),
      togglePinConversation: vi.fn(),
      toggleManualUnreadConversation: vi.fn(),
      handlePopOutToMiniDock: vi.fn(),
      setAiSessionsModalOpen: vi.fn(),
      handleCopyAiSessionPermalink: vi.fn(),
      handleToggleAiSessionSharing: vi.fn(),
      handleClearAiChat: vi.fn(),
      setAccessConfigTab: vi.fn(),
      setAccessConfigModalOpen: vi.fn(),
      renderUserAvatarNode: () => <div />,
      isConversationParticipantOnline: () => true,
      setSpaceConfigModalOpen: vi.fn(),
      setSpaceMembersModalOpen: vi.fn(),
      voiceCallCurrentCallId: null,
      voiceCallIsConnecting: false,
      startOrJoinVoiceCall: vi.fn(),
      searchModalOpen: false,
      setSearchModalOpen: vi.fn(),
      ensurePortalOpen: vi.fn(),
      navigateToMessageRef: { current: vi.fn() },
      setNotifSettingsModalOpen: vi.fn(),
      threadOpen: false,
      setThreadOpen: vi.fn(),
      activeThreadMsgId: null,
      setActiveThreadMsgId: vi.fn(),
      maximized: false,
      maximizedRef: { current: false },
      setMaximized: vi.fn(),
      persistPersonalLayout: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
  }

  beforeEach(() => {
    mockOmiCallState.makeCall.mockReset();
    mockOmiCallState.canAccessOmiCall = true;
    mockOmiCallState.isAdmin = true;
  });

  it('lists all phones for Bảo Hân in DM popover and calls the selected number', async () => {
    render(<MosChatDesktopHeader {...buildHeaderProps()} />);

    const btn = screen.getByTestId('mos-chat-header-omicall-btn');
    fireEvent.click(btn);

    expect(await screen.findByText('0702610128')).toBeTruthy();
    expect(screen.getByText('0989062401')).toBeTruthy();

    const dialButtons = screen.getAllByTestId('mos-chat-omicall-number-btn');
    expect(dialButtons.length).toBe(2);

    fireEvent.click(dialButtons[1]);
    expect(mockOmiCallState.makeCall).toHaveBeenCalledTimes(1);
    expect(mockOmiCallState.makeCall).toHaveBeenCalledWith(
      '0989062401',
      'Bảo Hân',
      undefined,
      'https://cdn.wingslashes.com/han.jpg',
      undefined,
      { autoEnableAdmin: true }
    );
  });

  it('allows dialing any custom phone number from a Space room', async () => {
    const spaceConv: MosChatConversation = {
      id: 'space-core-team',
      type: 'space',
      name: 'core-team',
      color: '#d4a84b',
      messages: [],
      unreadCount: 0,
      updatedAt: '2026-11-24T10:00:00Z',
    };

    render(<MosChatDesktopHeader {...buildHeaderProps({ activeConversation: spaceConv })} />);

    fireEvent.click(screen.getByTestId('mos-chat-header-omicall-btn'));

    const customInput = await screen.findByTestId('mos-chat-omicall-custom-input');
    fireEvent.change(customInput, { target: { value: '0989 062 401' } });
    fireEvent.click(screen.getByTestId('mos-chat-omicall-custom-dial-btn'));

    expect(mockOmiCallState.makeCall).toHaveBeenCalledTimes(1);
    expect(mockOmiCallState.makeCall).toHaveBeenCalledWith(
      '0989062401',
      '0989062401',
      undefined,
      undefined,
      undefined,
      { autoEnableAdmin: true }
    );
  });

  it('does not render OmiCall button when canAccessOmiCall or isAdmin is false', () => {
    mockOmiCallState.canAccessOmiCall = false;
    const { rerender } = render(<MosChatDesktopHeader {...buildHeaderProps()} />);
    expect(screen.queryByTestId('mos-chat-header-omicall-btn')).toBeNull();

    mockOmiCallState.canAccessOmiCall = true;
    mockOmiCallState.isAdmin = false;
    rerender(<MosChatDesktopHeader {...buildHeaderProps()} />);
    expect(screen.queryByTestId('mos-chat-header-omicall-btn')).toBeNull();
  });
});

describe('MosChatRichTextPure inline clickable phone numbers', () => {
  it('renders clickable OmiCall button for Vietnamese phone numbers when onOmiCallPhone is passed', () => {
    const onOmiCallPhone = vi.fn();
    render(
      <MosChatRichTextPure
        content="Số mới của Bảo Hân là 0989062401 nhé"
        isDark={true}
        onOmiCallPhone={onOmiCallPhone}
      />
    );

    const inlinePhoneBtn = screen.getByTestId('mos-chat-inline-phone-call');
    expect(inlinePhoneBtn.textContent).toContain('0989062401');

    fireEvent.click(inlinePhoneBtn);
    expect(onOmiCallPhone).toHaveBeenCalledTimes(1);
    expect(onOmiCallPhone).toHaveBeenCalledWith('0989062401');
  });

  it('leaves plain phone numbers unchanged when onOmiCallPhone is omitted', () => {
    render(<MosChatRichTextPure content="Số mới của Bảo Hân là 0989062401 nhé" isDark={true} />);
    expect(screen.queryByTestId('mos-chat-inline-phone-call')).toBeNull();
    expect(screen.getByText(/0989062401/)).toBeTruthy();
  });
});
