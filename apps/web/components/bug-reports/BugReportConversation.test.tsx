import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BugReportClarification, BugReportComment, BugReportStatus } from '@mos-lab/shared';
import { BugReportConversation } from './BugReportConversation';

describe('BugReportConversation', () => {
  const defaultClarification: BugReportClarification = {
    status: 'READY',
    summary: 'Đã đủ thông tin để triage',
    clarifiedAt: '2026-11-15T12:00:00Z',
  };

  const sampleComments: BugReportComment[] = [
    {
      id: 1,
      authorType: 'AGENT',
      kind: 'COMMENT',
      body: 'Agent đã bắt đầu phân tích nhiệm vụ.',
      attachments: [],
      createdAt: '2026-11-15T13:00:00Z',
      author: null,
    },
  ];

  it('renders comments and allows sending comments while agent is working (IN_PROGRESS)', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      report: {} as never,
      attachmentWarnings: [],
    });

    render(
      <BugReportConversation
        reportId={232}
        requestType="FEATURE"
        status="IN_PROGRESS"
        clarification={defaultClarification}
        comments={sampleComments}
        reporterMode={true}
        onSubmit={onSubmit}
      />
    );

    // Shows the agent-working banner in reporter mode
    expect(screen.getByText(/mOS và Agent đang xử lý yêu cầu/i)).toBeInTheDocument();
    expect(screen.getByText(/Agent đã bắt đầu phân tích nhiệm vụ/i)).toBeInTheDocument();

    // Input is available and placeholder invites extra feedback for agent
    const textarea = screen.getByPlaceholderText(/Góp ý hoặc nhắn thêm cho Agent trong quá trình xử lý/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Bổ sung thêm lưu ý về quyền hạn người dùng' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi bình luận/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        body: 'Bổ sung thêm lưu ý về quyền hạn người dùng',
        attachments: [],
      });
    });
  });

  it('locks conversation when ticket is CANCELLED', () => {
    const onSubmit = vi.fn().mockResolvedValue({
      report: {} as never,
      attachmentWarnings: [],
    });

    render(
      <BugReportConversation
        reportId={232}
        requestType="FEATURE"
        status="CANCELLED"
        clarification={defaultClarification}
        comments={sampleComments}
        reporterMode={true}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText(/Ticket đã kết thúc; hội thoại đang ở chế độ chỉ đọc/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Góp ý hoặc nhắn thêm/i)).not.toBeInTheDocument();
  });

  it('locks conversation when ticket is CLOSED', () => {
    const onSubmit = vi.fn().mockResolvedValue({
      report: {} as never,
      attachmentWarnings: [],
    });

    render(
      <BugReportConversation
        reportId={232}
        requestType="BUG"
        status="CLOSED"
        clarification={defaultClarification}
        comments={sampleComments}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText(/Ticket đã kết thúc; hội thoại đang ở chế độ chỉ đọc/i)).toBeInTheDocument();
  });
});
