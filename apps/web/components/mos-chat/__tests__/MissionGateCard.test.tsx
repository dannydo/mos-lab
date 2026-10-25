import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MosChatMissionSummary } from '@mos-lab/shared';
import { MissionGateCard } from '../shared/missions/MissionGateCard';
import {
  applyRealtimeEventToConversations,
  mergeDeltaConversations,
  mergeDeltaTasks,
} from '../store/useChatRealtimeSync';
import { resolveTaskPeopleFlow } from '../utils/chat-helpers';

describe('Universal 3-Gate MissionGateCard & Enterprise Realtime Sync', () => {
  const baseMission: MosChatMissionSummary = {
    reportId: 301,
    key: 'MOS-FEAT-301',
    missionKey: 'MOS-FEAT-301',
    missionCode: 'MSN-301',
    requestType: 'FEATURE',
    executionTrack: 'PROCESS_CANON',
    artifactPreview: {
      track: 'PROCESS_CANON',
      trackLabel: 'Quy trình & Kinh Thánh mOS',
      gate1Label: 'Cổng 1: Duyệt Phương Án Quy Trình',
      gate2Label: 'Cổng 2: Duyệt Bản Thảo Điều Răn',
      gate3Label: 'Cổng 3: Áp Dụng Quy Trình Mới',
      processDiff: {
        canonRuleCode: 'CC-006',
        beforeSummary: 'Quy chuẩn cũ',
        afterSummary: 'Cập nhật điều răn mới cho Chuyên Viên Tư Vấn',
      },
    },
    title: 'Bổ sung điều răn quy trình mới',
    status: 'NEW',
    clarificationStatus: 'READY',
    stage: 'RECEIVED',
    stepIndex: 1,
    humanBadge: '🟣 Đã tiếp nhận nhiệm vụ',
    stageLabel: '🟣 Đã tiếp nhận nhiệm vụ',
    humanSummary: 'Đang chờ duyệt Cổng 1.',
    humanStatusSummary: 'Đang chờ duyệt Cổng 1.',
    updatedAt: '2026-10-25T04:00:00.000Z',
    superAdminActions: {
      canApproveImplementation: true,
      canApproveCommit: false,
      canApproveDeploy: false,
      canConfirmClose: false,
    },
  };

  it('renders PROCESS_CANON track badge, process preview, and triggers Gate 1 action for Super Admin', () => {
    const onExecuteAction = vi.fn();
    render(
      <MissionGateCard mission={baseMission} isDark={false} isSuperAdmin={true} onExecuteAction={onExecuteAction} />
    );

    expect(screen.getByText('Quy trình & Kinh Thánh mOS')).toBeTruthy();
    expect(screen.getByText(/Cập nhật điều răn mới cho Chuyên Viên Tư Vấn/)).toBeTruthy();

    const gate1Btn = screen.getByRole('button', { name: /Cổng 1: Duyệt Phương Án Quy Trình/i });
    fireEvent.click(gate1Btn);
    expect(onExecuteAction).toHaveBeenCalledWith(baseMission, 'APPROVE_IMPLEMENTATION');
  });

  it('renders DATA_DECISION dry-run preview and allows Reporter to submit rework feedback', async () => {
    const onExecuteAction = vi.fn();
    const dataMission: MosChatMissionSummary = {
      ...baseMission,
      reportId: 302,
      missionCode: 'MSN-302',
      executionTrack: 'DATA_DECISION',
      stage: 'READY_FOR_REVIEW',
      stepIndex: 3,
      artifactPreview: {
        track: 'DATA_DECISION',
        trackLabel: 'Xử lý Dữ liệu & Ra Quyết Định',
        gate1Label: 'Cổng 1',
        gate2Label: 'Cổng 2',
        gate3Label: 'Cổng 3',
        dataDryRun: {
          targetTable: 'staff_tip',
          affectedRows: 8,
          impactSummary: 'Điều chỉnh đối soát tip 8 hóa đơn',
          rollbackReady: true,
        },
      },
      superAdminActions: {
        canApproveImplementation: false,
        canApproveCommit: false,
        canApproveDeploy: false,
        canConfirmClose: true,
      },
      reporterActions: {
        canAcceptOrReopen: true,
      },
    };

    render(
      <MissionGateCard
        mission={dataMission}
        isDark={true}
        isSuperAdmin={false}
        canReporterAct={true}
        onExecuteAction={onExecuteAction}
      />
    );

    expect(screen.getByText(/Dry-Run Safe · Rollback Ready/i)).toBeTruthy();
    expect(screen.getByText(/Điều chỉnh đối soát tip 8 hóa đơn/i)).toBeTruthy();

    const reworkToggle = screen.getByRole('button', { name: /Cần chỉnh thêm/i });
    fireEvent.click(reworkToggle);

    const input = screen.getByPlaceholderText(/Nhập nội dung cần chỉnh thêm/i);
    fireEvent.change(input, { target: { value: 'Bổ sung thêm hóa đơn số 9 giúp em' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi đề xuất/i });
    fireEvent.click(submitBtn);

    expect(onExecuteAction).toHaveBeenCalledWith(dataMission, 'REQUEST_REWORK', 'Bổ sung thêm hóa đơn số 9 giúp em');
  });

  it('merges delta conversations, messages, tasks, and realtime SSE events without duplicating records', () => {
    const initialConvs = [
      {
        id: 'space-core',
        type: 'space' as const,
        name: 'Core',
        color: '#722ed1',
        unreadCount: 0,
        updatedAt: '2026-10-25T03:00:00.000Z',
        messages: [
          {
            id: 'msg-1',
            conversationId: 'space-core',
            senderId: 1,
            senderName: 'Danny',
            senderRole: 'Super Admin',
            text: 'First message',
            timeLabel: '10:00',
            createdAt: '2026-10-25T03:00:00.000Z',
            missionId: 301,
          },
        ],
      },
    ];

    const merged = mergeDeltaConversations(
      initialConvs,
      [],
      [
        {
          id: 'msg-2',
          conversationId: 'space-core',
          senderId: 2,
          senderName: 'Bảo Hân',
          senderRole: 'Staff',
          text: 'Second message via delta',
          timeLabel: '10:05',
          createdAt: '2026-10-25T03:05:00.000Z',
        },
      ],
      [baseMission]
    );

    expect(merged[0].messages).toHaveLength(2);
    expect(merged[0].messages[0].mission?.missionCode).toBe('MSN-301');

    const afterSse = applyRealtimeEventToConversations(merged, {
      id: 'evt-1',
      type: 'THREAD_REPLY_CREATED',
      conversationId: 'space-core',
      timestamp: '2026-10-25T03:06:00.000Z',
      payload: {
        messageId: 'msg-1',
        reply: {
          id: 'th-1',
          senderId: 2,
          senderName: 'Bảo Hân',
          senderRole: 'Staff',
          text: 'Thread reply via SSE',
          timeLabel: '10:06',
          createdAt: '2026-10-25T03:06:00.000Z',
        },
      },
    });

    expect(afterSse[0].messages[0].thread).toHaveLength(1);
    expect(afterSse[0].messages[0].thread?.[0].text).toBe('Thread reply via SSE');

    const tasks = mergeDeltaTasks(
      [
        {
          id: 'task-1',
          conversationId: 'space-core',
          conversationName: 'Core',
          title: 'Kiểm tra quy trình',
          assigneeName: 'Bảo Hân',
          creatorName: 'Danny',
          priority: 'HIGH',
          remindAt: '2026-10-25T05:00:00.000Z',
          done: false,
          createdAt: '2026-10-25T03:00:00.000Z',
          missionId: 301,
        },
      ],
      [],
      [baseMission]
    );
    expect(tasks[0].mission?.missionCode).toBe('MSN-301');
  });

  it('resolveTaskPeopleFlow resolves assigner, assignee, and distinct source creator participant', () => {
    const flow = resolveTaskPeopleFlow(
      {
        sourceAuthorName: 'Thúy Kiều',
        assignerName: 'Danny Do',
        assigneeName: 'Bảo Hân',
      },
      [
        {
          id: 1,
          displayName: 'Danny Do',
          username: 'danny',
          role: 'Super Admin',
          avatarUrl: 'https://cdn.wingslashes.com/danny.jpg',
        },
      ]
    );

    expect(flow.assigner.name).toBe('Danny Do');
    expect(flow.assignee.name).toBe('Bảo Hân');
    expect(flow.participants).toHaveLength(1);
    expect(flow.participants[0].name).toBe('Thúy Kiều');
  });
});
