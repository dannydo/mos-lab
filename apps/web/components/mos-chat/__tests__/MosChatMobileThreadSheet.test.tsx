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
});
