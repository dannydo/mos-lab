import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatProvider, useMosChat } from '../context/MosChatContext';
import { MosChatMobileThreadSheet } from '../mobile/MosChatMobileThreadSheet';
import { apiClient } from '../../../lib/api-client';
import type { MosChatMissionSummary } from '@mos-lab/shared';

// Mock apiClient.chat
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn(),
      missionAction: vi.fn().mockResolvedValue({ success: true }),
      sendThreadReply: vi.fn().mockResolvedValue({ success: true }),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      deleteMessage: vi.fn().mockResolvedValue({ success: true }),
    },
    ai: {
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MosChatMobileThreadSheet - Subthread Gate Approval on iPhone', () => {
  const mockCurrentUser = {
    id: 1,
    username: 'dannydo',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const mockMissionGate1: MosChatMissionSummary = {
    reportId: 138,
    key: 'MOS-FEAT-138',
    missionKey: 'MOS-FEAT-138',
    missionCode: 'MSN-138',
    requestType: 'FEATURE',
    title: 'khung chat nên bổ sung thêm dạng ckeditor hoặc các editor để soạn thảo thân thiện hơn',
    status: 'NEW',
    clarificationStatus: 'READY',
    stage: 'RECEIVED' as const,
    stepIndex: 1 as const,
    humanBadge: '🟣 Có yêu cầu nâng cấp · Chờ anh Danny duyệt',
    stageLabel: '🟣 Có yêu cầu nâng cấp · Chờ anh Danny duyệt',
    humanSummary: 'Đã ghi nhận yêu cầu nâng cấp / chỉnh sửa bổ sung trong luồng chat.',
    humanStatusSummary:
      'Đã ghi nhận yêu cầu nâng cấp / chỉnh sửa bổ sung trong luồng chat. Đang chờ anh Danny bấm duyệt.',
    canSuperAdminApproveCommit: false,
    canSuperAdminApproveDeploy: false,
    canReporterAccept: false,
    updatedAt: '2026-10-24T08:00:00.000Z',
    superAdminActions: {
      canApproveImplementation: true,
      canApproveCommit: false,
      canApproveDeploy: false,
      canConfirmClose: false,
      activeJobId: null,
      executionPhase: null,
      changedFilesCount: 0,
      diffStat: null,
      agentSummary: null,
    },
    reporterActions: {
      canAcceptOrReopen: false,
    },
  };

  const mockMessageWithMission = {
    id: 'msg-101454cb',
    conversationId: 'dm-pair-1-6',
    senderId: '6',
    senderName: 'Nguyễn Quang Khải',
    senderRole: 'Admin',
    text: 'khung chat nên bổ sung thêm dạng ckeditor hoặc các editor để soạn thảo thân thiện hơn',
    timeLabel: '17:37',
    createdAt: new Date().toISOString(),
    reactions: {},
    attachments: [],
    mission: mockMissionGate1,
    thread: [
      {
        id: 'th-msn-rw-138',
        senderId: 'mos-mission-bot',
        senderName: '🚀 mOS Mission',
        senderRole: 'Trợ lý Kỹ thuật',
        text: '🔄 Ghi nhận yêu cầu nâng cấp / chỉnh sửa bổ sung (#MSN-138)\n• Nội dung yêu cầu: "tôi cần 1 bản gọn để type nhanh nữa"',
        timeLabel: '14:12',
        createdAt: new Date().toISOString(),
        isMissionMilestone: true,
        missionStage: 'RECEIVED' as const,
        missionId: 138,
      },
    ],
  };

  const mockBootstrapData = {
    conversations: [
      {
        id: 'dm-pair-1-6',
        type: 'dm',
        name: 'Nguyễn Quang Khải',
        subtitle: 'Admin',
        memberCount: 2,
        memberIds: [1, 6],
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
        messages: [mockMessageWithMission],
      },
    ],
    tasks: [],
    staffDirectory: [{ id: 1, displayName: 'Danny Do', role: 'Super Admin' }],
    accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
    canAccessChat: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.chat.bootstrap as any).mockResolvedValue(mockBootstrapData);
  });

  it('renders Pinned mOS Mission Card at the top of the Subthread with Gate 1 approval button', async () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileThreadSheet />
      </MosChatProvider>
    );

    // Initial state before thread is selected shows empty state
    expect(screen.getByText('Chưa chọn luồng thảo luận nào')).toBeTruthy();
  });

  it('handles Gate 1 (APPROVE_IMPLEMENTATION) single-tap click and invokes apiClient.chat.missionAction', async () => {
    (apiClient.chat.missionAction as any).mockResolvedValue({
      success: true,
      mission: { ...mockMissionGate1, stage: 'BUILDING' },
    });

    const TestComponent: React.FC = () => {
      const { executeMissionAction } = useMosChat();
      return (
        <button
          data-testid="test-approve-gate1"
          onClick={() => executeMissionAction(mockMissionGate1, 'APPROVE_IMPLEMENTATION')}
        >
          Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)
        </button>
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestComponent />
      </MosChatProvider>
    );

    const btn = screen.getByTestId('test-approve-gate1');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(apiClient.chat.missionAction).toHaveBeenCalledWith(
        138,
        expect.objectContaining({
          action: 'APPROVE_IMPLEMENTATION',
        })
      );
    });
  });

  it('handles Gate 2 (APPROVE_COMMIT) single-tap click and invokes apiClient.chat.missionAction', async () => {
    (apiClient.chat.missionAction as any).mockResolvedValue({
      success: true,
      mission: { ...mockMissionGate1, stage: 'AWAITING_RELEASE' },
    });

    const TestComponent: React.FC = () => {
      const { executeMissionAction } = useMosChat();
      return (
        <button
          data-testid="test-approve-gate2"
          onClick={() => executeMissionAction(mockMissionGate1, 'APPROVE_COMMIT')}
        >
          ✅ Duyệt Commit (Cổng 2)
        </button>
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestComponent />
      </MosChatProvider>
    );

    const btn = screen.getByTestId('test-approve-gate2');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(apiClient.chat.missionAction).toHaveBeenCalledWith(
        138,
        expect.objectContaining({
          action: 'APPROVE_COMMIT',
        })
      );
    });
  });

  it('handles Gate 3 (APPROVE_DEPLOY) single-tap click and invokes apiClient.chat.missionAction', async () => {
    (apiClient.chat.missionAction as any).mockResolvedValue({
      success: true,
      mission: { ...mockMissionGate1, stage: 'READY_FOR_REVIEW' },
    });

    const TestComponent: React.FC = () => {
      const { executeMissionAction } = useMosChat();
      return (
        <button
          data-testid="test-approve-gate3"
          onClick={() => executeMissionAction(mockMissionGate1, 'APPROVE_DEPLOY')}
        >
          🚀 Duyệt Deploy lên Web (Cổng 3)
        </button>
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestComponent />
      </MosChatProvider>
    );

    const btn = screen.getByTestId('test-approve-gate3');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(apiClient.chat.missionAction).toHaveBeenCalledWith(
        138,
        expect.objectContaining({
          action: 'APPROVE_DEPLOY',
        })
      );
    });
  });

  it('triggers MAI copilot when tagging @MAI in subthread reply on iPhone', async () => {
    (apiClient.chat.bootstrap as any).mockResolvedValue({
      conversations: [
        {
          id: 'dm-pair-1-6',
          messages: [
            {
              id: 'msg-parent-1',
              senderName: 'Nguyễn Quang Khải',
              text: 'Estella phòng đầu tay trái hư quạt nối mi',
              thread: [],
            },
          ],
        },
      ],
    });

    const TestComponent = () => {
      const { sendThreadReply, isAiThinking, setActiveThreadMsg, conversations } = useMosChat();
      React.useEffect(() => {
        const msg = conversations[0]?.messages?.[0];
        if (msg) setActiveThreadMsg(msg);
      }, [conversations, setActiveThreadMsg]);

      return (
        <div>
          <button
            data-testid="send-mai-reply"
            onClick={() => sendThreadReply('@MAI mình xây qui trình báo lỗi shop cho đội hardware nhé')}
          >
            Gửi @MAI
          </button>
          {isAiThinking && <div data-testid="mai-thinking">MAI đang suy nghĩ...</div>}
        </div>
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestComponent />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('send-mai-reply')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('send-mai-reply'));

    await waitFor(() => {
      expect(apiClient.chat.sendThreadReply).toHaveBeenCalled();
      expect(apiClient.ai.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: expect.stringContaining('mos-chat-thread:dm-pair-1-6:'),
          message: expect.stringContaining('mình xây qui trình báo lỗi shop cho đội hardware nhé'),
        })
      );
    });
  });

  it('renders interactive Main Task card when linkedTask exists in subthread', async () => {
    const mockTask = {
      id: 'task-test-1',
      conversationId: 'dm-pair-1-6',
      conversationName: 'Nguyễn Quang Khải',
      sourceMessageId: 'msg-parent-task',
      title: 'Xây dựng tính năng tạo task từ subthread',
      assigneeName: 'Danny Do',
      assigneeId: 1,
      creatorName: 'Danny Do',
      priority: 'HIGH' as const,
      done: false,
      createdAt: new Date().toISOString(),
      remindAt: new Date().toISOString(),
    };

    const mockMsgWithTask = {
      id: 'msg-parent-task',
      conversationId: 'dm-pair-1-6',
      senderId: '1',
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Thảo luận phương án tạo task trong subthread',
      timeLabel: '10:00',
      createdAt: new Date().toISOString(),
      taskId: 'task-test-1',
      reactions: {},
      attachments: [],
      thread: [
        {
          id: 'reply-1',
          senderId: '6',
          senderName: 'Khải',
          senderRole: 'Admin',
          text: 'Thống nhất cập nhật trực tiếp vào Main Task',
          timeLabel: '10:05',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      conversations: [
        {
          id: 'dm-pair-1-6',
          type: 'dm',
          name: 'Nguyễn Quang Khải',
          messages: [mockMsgWithTask],
        },
      ],
      tasks: [mockTask],
      staffDirectory: [{ id: 1, displayName: 'Danny Do', role: 'Super Admin' }],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    const TestHost: React.FC = () => {
      const { setActiveThreadMsg, setMobileView } = useMosChat();
      React.useEffect(() => {
        setActiveThreadMsg(mockMsgWithTask as any);
        setMobileView('thread');
      }, [setActiveThreadMsg, setMobileView]);

      return <MosChatMobileThreadSheet />;
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestHost />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Main Task')).toBeTruthy();
      expect(screen.getByText('Xây dựng tính năng tạo task từ subthread')).toBeTruthy();
      expect(screen.getAllByText(/Danny Do/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "+ Giao việc cho tin nhắn này" when no linkedTask exists', async () => {
    const mockMsgWithoutTask = {
      id: 'msg-parent-no-task',
      conversationId: 'dm-pair-1-6',
      senderId: '1',
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Tin nhắn chưa có task nào',
      timeLabel: '11:00',
      createdAt: new Date().toISOString(),
      reactions: {},
      attachments: [],
      thread: [],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      conversations: [
        {
          id: 'dm-pair-1-6',
          type: 'dm',
          name: 'Nguyễn Quang Khải',
          messages: [mockMsgWithoutTask],
        },
      ],
      tasks: [],
      staffDirectory: [{ id: 1, displayName: 'Danny Do', role: 'Super Admin' }],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    const mockOnOpenTaskModal = vi.fn();

    const TestHost: React.FC = () => {
      const { setActiveThreadMsg, setMobileView } = useMosChat();
      React.useEffect(() => {
        setActiveThreadMsg(mockMsgWithoutTask as any);
        setMobileView('thread');
      }, [setActiveThreadMsg, setMobileView]);

      return <MosChatMobileThreadSheet onOpenTaskModal={mockOnOpenTaskModal} />;
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestHost />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Giao việc cho tin nhắn này')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('+ Giao việc cho tin nhắn này'));

    expect(mockOnOpenTaskModal).toHaveBeenCalledWith(
      expect.objectContaining({
        initialTitle: 'Tin nhắn chưa có task nào',
        existingTask: null,
      })
    );
  });

  it('allows deleting a thread reply on iPhone via action sheet and renders soft-deleted indicator (MOS-BUG-149)', async () => {
    const mockReply = {
      id: 'reply-del-1',
      senderId: '1',
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Phản hồi cần xoá trong thread',
      timeLabel: '11:05',
      createdAt: new Date().toISOString(),
      reactions: {},
      attachments: [],
    };
    const mockParentMsgWithReply = {
      id: 'msg-parent-del',
      conversationId: 'dm-pair-1-6',
      senderId: '1',
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      text: 'Tin nhắn gốc có reply',
      timeLabel: '11:00',
      createdAt: new Date().toISOString(),
      reactions: {},
      attachments: [],
      thread: [mockReply],
    };

    (apiClient.chat.bootstrap as any).mockResolvedValue({
      conversations: [
        {
          id: 'dm-pair-1-6',
          type: 'dm',
          name: 'Nguyễn Quang Khải',
          messages: [mockParentMsgWithReply],
        },
      ],
      tasks: [],
      staffDirectory: [{ id: 1, displayName: 'Danny Do', role: 'Super Admin' }],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    });

    const TestHost: React.FC = () => {
      const { setActiveThreadMsg, setMobileView } = useMosChat();
      React.useEffect(() => {
        setActiveThreadMsg(mockParentMsgWithReply as any);
        setMobileView('thread');
      }, [setActiveThreadMsg, setMobileView]);

      return <MosChatMobileThreadSheet />;
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <TestHost />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Phản hồi cần xoá trong thread')).toBeTruthy();
    });

    const replyEl = screen.getByText('Phản hồi cần xoá trong thread');
    const replyContainer = replyEl.closest('.relative') as HTMLElement;
    expect(replyContainer).toBeTruthy();

    // Trigger context menu on reply
    fireEvent.contextMenu(replyContainer);

    // Wait for long-press action sheet
    await waitFor(() => {
      expect(screen.getByText('Xóa phản hồi')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Xóa phản hồi'));

    await waitFor(() => {
      expect(apiClient.chat.deleteMessage).toHaveBeenCalledWith('msg-parent-del', {
        conversationId: 'dm-pair-1-6',
        replyId: 'reply-del-1',
      });
      expect(screen.getByText(/Phản hồi này đã bị xoá/i)).toBeTruthy();
    });
  });
});
