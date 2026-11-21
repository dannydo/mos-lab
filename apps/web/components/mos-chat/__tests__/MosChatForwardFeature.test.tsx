import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { MosChatConversation, MosChatMessage, MosChatStaffMember } from '@mos-lab/shared';
import { MosChatForwardModal } from '../components/MosChatForwardModal';
import { MosChatForwardedHeader } from '../components/MosChatForwardedHeader';
import { MosChatMessageFeed, type MosChatMessageFeedProps } from '../components/MosChatMessageFeed';

describe('mOS Chat Forward Message & Full Subthread Feature', () => {
  const currentUser = {
    id: 1,
    username: 'danny',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
    { id: 2, username: 'khai', displayName: 'Nguyễn Quang Khải', role: 'admin' },
    { id: 3, username: 'baohan', displayName: 'Bảo Hân', role: 'cs' },
    { id: 4, username: 'ngocvy', displayName: 'Ngọc Vy', role: 'cvl' },
  ];

  const sourceConversation: MosChatConversation = {
    id: 'dm-pair-1-2',
    type: 'dm',
    name: 'Nguyễn Quang Khải',
    color: '#10b981',
    participantStaffId: 2,
    memberIds: [1, 2],
    unreadCount: 0,
    updatedAt: '2026-11-21T10:00:00.000Z',
    messages: [],
  };

  const targetSpace: MosChatConversation = {
    id: 'space-core-team',
    type: 'space',
    name: 'core-team',
    subtitle: 'Ban điều hành',
    color: '#f59e0b',
    memberCount: 5,
    unreadCount: 0,
    updatedAt: '2026-11-21T11:00:00.000Z',
    messages: [],
  };

  const existingDmConv: MosChatConversation = {
    id: 'dm-pair-1-3',
    type: 'dm',
    name: 'Bảo Hân',
    color: '#3b82f6',
    participantStaffId: 3,
    memberIds: [1, 3],
    unreadCount: 0,
    updatedAt: '2026-11-21T09:00:00.000Z',
    messages: [],
  };

  const sourceMessageWithThread: MosChatMessage = {
    id: 'msg-src-101',
    conversationId: sourceConversation.id,
    senderId: 2,
    senderName: 'Nguyễn Quang Khải',
    senderRole: 'Admin',
    text: 'Chị Vân tip 100k, hưởng 90%, app nhảy 80K',
    timeLabel: '20:46',
    createdAt: '2026-11-21T13:46:00.000Z',
    thread: [
      {
        id: 'th-1',
        senderId: 2,
        senderName: 'Nguyễn Quang Khải',
        senderRole: 'Admin',
        text: 'Em kiểm tra log hóa đơn xong rồi ạ',
        timeLabel: '20:47',
        createdAt: '2026-11-21T13:47:00.000Z',
      },
      {
        id: 'th-deleted',
        senderId: 1,
        senderName: 'Danny Do',
        senderRole: 'Super Admin',
        text: 'Tin đã xóa',
        timeLabel: '20:48',
        createdAt: '2026-11-21T13:48:00.000Z',
        isDeleted: true,
      },
      {
        id: 'th-2',
        senderId: 1,
        senderName: 'Danny Do',
        senderRole: 'Super Admin',
        text: 'Ok chuyển sang Core Team xử lý luôn nhé',
        timeLabel: '20:49',
        createdAt: '2026-11-21T13:49:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults includeThread switch to ON when message has active replies and forwards to Space + DM + new staff colleague', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      success: true,
      results: [{ conversationId: 'space-core-team', forwardedThreadCount: 2 }],
      updatedConversations: [],
    });
    const onClose = vi.fn();

    render(
      <MosChatForwardModal
        open={true}
        onClose={onClose}
        sourceConversation={sourceConversation}
        sourceMessage={sourceMessageWithThread}
        conversations={[sourceConversation, targetSpace, existingDmConv]}
        staffDirectory={staffDirectory}
        currentUser={currentUser}
        pinnedIds={[targetSpace.id]}
        isDark={true}
        onSubmit={onSubmit}
      />
    );

    // 1. Active subthread toggle must show active reply count (2, excluding deleted) and default to checked
    expect(screen.getByText(/Chuyển tiếp kèm toàn bộ luồng trả lời phụ \(2 phản hồi\)/i)).toBeTruthy();
    const threadSwitch = screen.getByRole('switch', {
      name: /Chuyển tiếp kèm toàn bộ luồng trả lời phụ/i,
    });
    expect(threadSwitch.getAttribute('aria-checked')).toBe('true');

    // 2. New staff colleague without existing DM appears with "Tạo DM mới" badge
    expect(screen.getByText('Ngọc Vy')).toBeTruthy();
    expect(screen.getByText('Tạo DM mới')).toBeTruthy();

    // 3. Vietnamese accent-insensitive search filters targets cleanly
    const searchInput = screen.getByLabelText('Tìm nơi nhận chuyển tiếp');
    fireEvent.change(searchInput, { target: { value: 'ngoc vy' } });
    expect(screen.getByText('Ngọc Vy')).toBeTruthy();
    expect(screen.queryByText('#core-team')).toBeNull();

    // Select Ngọc Vy (new DM targetStaffId = 4)
    fireEvent.click(screen.getByText('Ngọc Vy'));

    // Clear search and also select #core-team (Space) & Bảo Hân (existing DM)
    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('#core-team'));
    fireEvent.click(screen.getByText('Bảo Hân'));

    // Enter optional note
    const noteInput = screen.getByPlaceholderText(/Thêm lời nhắn đi kèm/i);
    fireEvent.change(noteInput, { target: { value: 'Nhờ mọi người kiểm tra ca này' } });

    // Submit forward button shows count (3)
    const submitBtn = screen.getByRole('button', { name: /Chuyển tiếp \(3\)/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      sourceConversationId: 'dm-pair-1-2',
      sourceMessageId: 'msg-src-101',
      sourceReplyId: null,
      includeThread: true,
      targetConversationIds: ['space-core-team', 'dm-pair-1-3'],
      targetStaffIds: [4],
      note: 'Nhờ mọi người kiểm tra ca này',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('allows toggling includeThread OFF before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      success: true,
      results: [{ conversationId: 'space-core-team', forwardedThreadCount: 0 }],
      updatedConversations: [],
    });

    render(
      <MosChatForwardModal
        open={true}
        onClose={vi.fn()}
        sourceConversation={sourceConversation}
        sourceMessage={sourceMessageWithThread}
        conversations={[sourceConversation, targetSpace]}
        staffDirectory={staffDirectory}
        currentUser={currentUser}
        isDark={false}
        onSubmit={onSubmit}
      />
    );

    const threadSwitch = screen.getByRole('switch', {
      name: /Chuyển tiếp kèm toàn bộ luồng trả lời phụ/i,
    });
    fireEvent.click(threadSwitch);
    expect(threadSwitch.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByText('#core-team'));
    fireEvent.click(screen.getByRole('button', { name: /Chuyển tiếp \(1\)/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          includeThread: false,
          targetConversationIds: ['space-core-team'],
        })
      );
    });
  });

  it('renders MosChatForwardedHeader with note, attribution, thread count, and jump-to-source action', () => {
    const onJumpToSource = vi.fn();

    render(
      <MosChatForwardedHeader
        isDark={false}
        canJumpToSource={true}
        onJumpToSource={onJumpToSource}
        forwardedFrom={{
          sourceConversationId: 'space-estella',
          sourceConversationName: '#estella-store',
          sourceConversationType: 'space',
          sourceMessageId: 'msg-orig-55',
          originalSenderId: 2,
          originalSenderName: 'Nguyễn Quang Khải',
          originalCreatedAt: '2026-11-21T10:00:00.000Z',
          forwardedByStaffId: 1,
          forwardedByName: 'Danny Do',
          forwardedAt: '2026-11-21T12:00:00.000Z',
          forwardedThreadCount: 3,
          note: 'Xem gấp nhé team',
        }}
      />
    );

    expect(screen.getByText('Xem gấp nhé team')).toBeTruthy();
    expect(screen.getByText(/Nguyễn Quang Khải/)).toBeTruthy();
    expect(screen.getByText(/#estella-store/)).toBeTruthy();
    expect(screen.getByText('kèm 3 phản hồi')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Đã chuyển tiếp từ/i }));
    expect(onJumpToSource).toHaveBeenCalledWith('space-estella', 'msg-orig-55');
  });

  it('renders Forward button and Forwarded header (including media-only messages) inside MosChatMessageFeed', () => {
    const handleOpenForwardModal = vi.fn();
    const mediaOnlyForwardedMsg: MosChatMessage = {
      id: 'msg-fwd-media-1',
      conversationId: 'space-core-team',
      senderId: 1,
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: '',
      timeLabel: '21:00',
      createdAt: '2026-11-21T14:00:00.000Z',
      attachments: [
        {
          id: 'att-1',
          url: '/api/chat/media/12345678-1234-1234-1234-123456789012.png',
          name: 'screenshot.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
        },
      ],
      forwardedFrom: {
        sourceConversationId: 'dm-pair-1-2',
        sourceConversationName: 'Tin nhắn riêng (DM)',
        sourceConversationType: 'dm',
        sourceMessageId: 'msg-orig-9',
        originalSenderId: 2,
        originalSenderName: 'Nguyễn Quang Khải',
        originalCreatedAt: '2026-11-21T13:00:00.000Z',
        forwardedByStaffId: 1,
        forwardedByName: 'Danny Do',
        forwardedAt: '2026-11-21T14:00:00.000Z',
        forwardedThreadCount: 1,
      },
      thread: [
        {
          id: 'th-fwd-1',
          senderId: 2,
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'Admin',
          text: 'Ảnh bill đính kèm',
          timeLabel: '20:05',
          createdAt: '2026-11-21T13:05:00.000Z',
        },
      ],
    };

    const feedProps: MosChatMessageFeedProps = {
      isMobile: false,
      activeConversation: {
        ...targetSpace,
        messages: [mediaOnlyForwardedMsg],
      },
      currentUser,
      isDark: true,
      token: { colorTextSecondary: '#94a3b8', colorText: '#f8fafc' },
      surfaceRaised: '#1e293b',
      borderColor: '#334155',
      borderStrong: '#475569',
      accentSoftBg: 'rgba(212, 168, 75, 0.1)',
      accentBorder: '#d4a84b',
      pinnedMessages: [],
      pinnedBannerIndex: 0,
      setPinnedBannerIndex: vi.fn(),
      navigateToMessage: vi.fn(),
      setActiveSubtab: vi.fn(),
      handleTogglePin: vi.fn(),
      formatMoveTargetSnippet: () => '',
      mainMessagesContainerRef: { current: null },
      messagesEndRef: { current: null },
      uniqueTasks: [],
      isMessageFromCurrentUser: () => true,
      getMessageReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
      stoppedReadersByMsgId: {},
      canManageChatThreads: true,
      AI_COPILOT_CONV_ID: 'ai-copilot',
      draggingRootMsgId: null,
      setDraggingRootMsgId: vi.fn(),
      dragOverTargetMsgId: null,
      setDragOverTargetMsgId: vi.fn(),
      setDragOverThreadPane: vi.fn(),
      handleMoveThreadItem: vi.fn(),
      highlightedMsgId: null,
      getMemberNickname: () => undefined,
      renderReadStatusCheckmark: () => null,
      renderUserAvatarNode: () => null,
      expandedThinkingIds: {},
      setExpandedThinkingIds: vi.fn(),
      editingMessageId: null,
      editingReplyId: null,
      editingText: '',
      setEditingText: vi.fn(),
      handleCancelEdit: vi.fn(),
      handleSaveEdit: vi.fn(),
      isSavingEdit: false,
      isComposingRef: { current: false },
      lastCompositionEndMsRef: { current: 0 },
      setHistoryModalMessage: vi.fn(),
      setHistoryModalOpen: vi.fn(),
      isDannyAccount: true,
      handleRestoreMessage: vi.fn(),
      handleMessageTap: vi.fn(),
      heartFlyMsgId: null,
      renderRichTextMessage: (t) => t,
      appliedActionIds: {},
      handleExecuteAiAction: vi.fn(),
      speakingMsgId: null,
      ttsSpeed: 1,
      handleSpeakAiMessage: vi.fn(),
      handleSetTtsSpeed: vi.fn(),
      hasUserReacted: () => false,
      handleToggleReaction: vi.fn(),
      mobileActiveMsgId: null,
      openMovePopoverKey: null,
      setOpenMovePopoverKey: vi.fn(),
      openStickerPopoverKey: null,
      setOpenStickerPopoverKey: vi.fn(),
      renderReactionPickerContent: () => null,
      handleOpenThread: vi.fn(),
      openTaskModalFromMessage: vi.fn(),
      isStrictDannySuperAdmin: true,
      openMissionModalFromChat: vi.fn(),
      handleBuzzMessage: vi.fn(),
      handleStartEdit: vi.fn(),
      handleDeleteMessage: vi.fn(),
      renderMiniSeenAvatarStack: () => null,
      aiThinkingActive: false,
      aiElapsedSec: 0,
      getThreadReplyReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
      renderTaskCard: () => null,
      renderLiveMissionCard: () => null,
      workflowInstances: [],
      setWorkflowInstances: vi.fn(),
      currentUserStaffMember: null,
      fetchBootstrap: vi.fn() as any,
      setLightboxImage: vi.fn(),
      movingThreadItemKey: null,
      threadOpen: false,
      activeThreadMessage: null,
      isDraggingOver: false,
      antdMessage: { success: vi.fn(), error: vi.fn() },
      renderMessageAttachments: (atts) => <div data-testid="mock-atts">{atts?.length || 0} file</div>,
      openCustomerDetail: vi.fn(),
      handleOpenForwardModal,
    };

    render(<MosChatMessageFeed {...feedProps} />);

    // Media-only message must still render forwarded header
    expect(screen.getByTestId('mos-chat-forwarded-header')).toBeTruthy();
    expect(screen.getByText('kèm 1 phản hồi')).toBeTruthy();
    expect(screen.getByTestId('mock-atts')).toBeTruthy();

    // Forward action button works
    const fwdBtn = screen.getByRole('button', { name: 'Chuyển tiếp tin nhắn' });
    fireEvent.click(fwdBtn);
    expect(handleOpenForwardModal).toHaveBeenCalledWith(mediaOnlyForwardedMsg);
  });

  it('keeps message hover bar compact with overflow menu (⋯) and requires 2-step confirmation for delete', async () => {
    const handleDeleteMessage = vi.fn();
    const handleTogglePin = vi.fn();
    const openMissionModalFromChat = vi.fn();

    const feedProps: MosChatMessageFeedProps = {
      isMobile: false,
      activeConversation: {
        ...targetSpace,
        messages: [
          {
            id: 'msg-compact-1',
            conversationId: 'space-core-team',
            senderId: 1,
            senderName: 'Danny Do',
            senderRole: 'Super Admin',
            text: 'Tin nhắn test toolbar gọn',
            timeLabel: '21:30',
            createdAt: '2026-11-21T14:30:00.000Z',
            reactions: {},
            thread: [],
          },
          {
            id: 'msg-compact-2',
            conversationId: 'space-core-team',
            senderId: 2,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'Admin',
            text: 'Tin nhắn số 2',
            timeLabel: '21:31',
            createdAt: '2026-11-21T14:31:00.000Z',
            reactions: {},
            thread: [],
          },
        ],
      },
      currentUser,
      isDark: true,
      token: { colorTextSecondary: '#94a3b8', colorText: '#f8fafc' },
      surfaceRaised: '#1e293b',
      borderColor: '#334155',
      borderStrong: '#475569',
      accentSoftBg: 'rgba(212, 168, 75, 0.1)',
      accentBorder: '#d4a84b',
      pinnedMessages: [],
      pinnedBannerIndex: 0,
      setPinnedBannerIndex: vi.fn(),
      navigateToMessage: vi.fn(),
      setActiveSubtab: vi.fn(),
      handleTogglePin,
      formatMoveTargetSnippet: () => '',
      mainMessagesContainerRef: { current: null },
      messagesEndRef: { current: null },
      uniqueTasks: [],
      isMessageFromCurrentUser: (msg) => msg.id === 'msg-compact-1',
      getMessageReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
      stoppedReadersByMsgId: {},
      canManageChatThreads: true,
      AI_COPILOT_CONV_ID: 'ai-copilot',
      draggingRootMsgId: null,
      setDraggingRootMsgId: vi.fn(),
      dragOverTargetMsgId: null,
      setDragOverTargetMsgId: vi.fn(),
      setDragOverThreadPane: vi.fn(),
      handleMoveThreadItem: vi.fn(),
      highlightedMsgId: null,
      getMemberNickname: () => undefined,
      renderReadStatusCheckmark: () => null,
      renderUserAvatarNode: () => null,
      expandedThinkingIds: {},
      setExpandedThinkingIds: vi.fn(),
      editingMessageId: null,
      editingReplyId: null,
      editingText: '',
      setEditingText: vi.fn(),
      handleCancelEdit: vi.fn(),
      handleSaveEdit: vi.fn(),
      isSavingEdit: false,
      isComposingRef: { current: false },
      lastCompositionEndMsRef: { current: 0 },
      setHistoryModalMessage: vi.fn(),
      setHistoryModalOpen: vi.fn(),
      isDannyAccount: true,
      handleRestoreMessage: vi.fn(),
      handleMessageTap: vi.fn(),
      heartFlyMsgId: null,
      renderRichTextMessage: (t) => t,
      appliedActionIds: {},
      handleExecuteAiAction: vi.fn(),
      speakingMsgId: null,
      ttsSpeed: 1,
      handleSpeakAiMessage: vi.fn(),
      handleSetTtsSpeed: vi.fn(),
      hasUserReacted: () => false,
      handleToggleReaction: vi.fn(),
      mobileActiveMsgId: null,
      openMovePopoverKey: null,
      setOpenMovePopoverKey: vi.fn(),
      openStickerPopoverKey: null,
      setOpenStickerPopoverKey: vi.fn(),
      renderReactionPickerContent: () => null,
      handleOpenThread: vi.fn(),
      openTaskModalFromMessage: vi.fn(),
      isStrictDannySuperAdmin: true,
      openMissionModalFromChat,
      handleBuzzMessage: vi.fn(),
      handleStartEdit: vi.fn(),
      handleDeleteMessage,
      renderMiniSeenAvatarStack: () => null,
      aiThinkingActive: false,
      aiElapsedSec: 0,
      getThreadReplyReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
      renderTaskCard: () => null,
      renderLiveMissionCard: () => null,
      workflowInstances: [],
      setWorkflowInstances: vi.fn(),
      currentUserStaffMember: null,
      fetchBootstrap: vi.fn() as any,
      setLightboxImage: vi.fn(),
      movingThreadItemKey: null,
      threadOpen: false,
      activeThreadMessage: null,
      isDraggingOver: false,
      antdMessage: { success: vi.fn(), error: vi.fn() },
      renderMessageAttachments: () => null,
      openCustomerDetail: vi.fn(),
      handleOpenForwardModal: vi.fn(),
    };

    render(<MosChatMessageFeed {...feedProps} />);

    // Secondary actions must NOT clutter the inline toolbar before opening ⋯
    expect(screen.queryByRole('button', { name: 'Ghim tin nhắn' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sao chép tin nhắn' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buzz / Bump tin nhắn khẩn cấp' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa tin nhắn' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá tin nhắn' })).toBeNull();

    // Primary buttons + overflow button are present
    const moreButtons = screen.getAllByRole('button', { name: 'Thêm thao tác tin nhắn' });
    expect(moreButtons.length).toBe(2);

    // Open ⋯ on the first message (owned by Danny)
    fireEvent.click(moreButtons[0]);

    expect(await screen.findByRole('button', { name: 'Sao chép tin nhắn' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ghim tin nhắn' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buzz / Bump tin nhắn khẩn cấp' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chuyển vào mOS Mission' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chỉnh sửa tin nhắn' })).toBeTruthy();

    // Clicking "Xoá tin nhắn" transitions into confirm view without calling handleDeleteMessage yet
    const deleteMenuItem = screen.getByRole('button', { name: 'Xoá tin nhắn' });
    fireEvent.click(deleteMenuItem);
    expect(handleDeleteMessage).not.toHaveBeenCalled();

    // Confirm delete inside the popover
    const confirmDeleteBtn = await screen.findByRole('button', { name: 'Xoá' });
    fireEvent.click(confirmDeleteBtn);
    expect(handleDeleteMessage).toHaveBeenCalledWith('msg-compact-1');
  });
});
