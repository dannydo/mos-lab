import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MyBugReportItem } from '@mos-lab/shared';
import { describe, expect, it, vi } from 'vitest';
import { MyBugReportsPanel } from './MyBugReportsPanel';

function makeReport(overrides?: Partial<MyBugReportItem>): MyBugReportItem {
  return {
    id: 250,
    key: 'MOS-BUG-250',
    requestType: 'BUG',
    title: 'Nút bấm trả lời Agent không hoạt động',
    description: 'Bấm nút trả lời Agent không mở khung trả lời.',
    sourcePath: '/dashboard/today',
    status: 'NEW',
    severity: 'MEDIUM',
    triageNote: null,
    featureRequest: null,
    clarification: {
      status: 'WAITING_REPORTER',
      summary: 'Cần bạn trả lời thêm',
      checkedAt: '2026-11-19T14:00:00.000Z',
      businessLogicRefs: [],
    },
    evidenceAttachments: [],
    comments: [
      {
        id: 847,
        authorType: 'AGENT',
        kind: 'CLARIFICATION_QUESTION',
        body: 'Bạn đang bấm nút ở màn hình nào?',
        attachments: [],
        createdAt: '2026-11-19T14:00:00.000Z',
        author: null,
      },
    ],
    resolution: null,
    reopen: null,
    agentProgress: { stage: 'CHECKING_BUSINESS_LOGIC', note: null, updatedAt: '2026-11-19T14:00:00.000Z' },
    implementation: null,
    nextAction: {
      actor: 'REPORTER',
      label: 'Trả lời câu hỏi',
      detail: 'Trả lời Agent để tiếp tục.',
      type: 'CLARIFY',
      waitingSince: '2026-11-19T14:00:00.000Z',
    },
    reporter: { id: 1, displayName: 'Danny', role: 'super_admin' },
    approvedAt: null,
    timeline: {
      submittedAt: '2026-11-19T13:55:00.000Z',
      clarifiedAt: null,
      approvedAt: null,
      fixedAt: null,
      closedAt: null,
    },
    reporterExperience: {
      state: 'WAITING_REPORTER',
      label: 'Cần bạn trả lời',
      summary: 'mOS đang chờ bạn trả lời câu hỏi làm rõ.',
      nextAction: { label: 'Trả lời câu hỏi', detail: 'Trả lời câu hỏi bên dưới.' },
      updates: [{ label: 'Agent đã hỏi làm rõ', occurredAt: '2026-11-19T14:00:00.000Z' }],
    },
    reviewUrl: '/dashboard/today?bugReview=MOS-BUG-250',
    canReview: false,
    canReopenUnchanged: false,
    canCancel: true,
    createdAt: '2026-11-19T13:55:00.000Z',
    updatedAt: '2026-11-19T14:00:00.000Z',
    ...overrides,
  } as MyBugReportItem;
}

describe('MyBugReportsPanel', () => {
  it('opens directly into detail view on mobile when selectedKey is pre-selected and allows replying', async () => {
    const onComment = vi.fn().mockResolvedValue({ report: {} as never, attachmentWarnings: [] });
    const report = makeReport();

    render(
      <MyBugReportsPanel
        reports={[report]}
        notifications={[]}
        selectedKey="MOS-BUG-250"
        loading={false}
        error={null}
        onSelect={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onReview={vi.fn().mockResolvedValue(undefined)}
        onComment={onComment}
      />
    );

    const detailSection = screen.getByRole('region', { name: 'Chi tiết MOS-BUG-250' });
    expect(detailSection.className).toContain('block');
    expect(detailSection.className).not.toContain('hidden lg:block');

    const replyBox = screen.getByPlaceholderText(/Trả lời câu hỏi của mOS/i);
    fireEvent.change(replyBox, { target: { value: 'Nút trên toast thông báo ở góc phải.' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi bình luận/i }));

    await waitFor(() => {
      expect(onComment).toHaveBeenCalledWith(250, {
        body: 'Nút trên toast thông báo ở góc phải.',
        attachments: [],
      });
    });

    // User can still switch back to list on mobile
    fireEvent.click(screen.getByRole('button', { name: /Danh sách yêu cầu/i }));
    expect(detailSection.className).toContain('hidden lg:block');
  });
});
