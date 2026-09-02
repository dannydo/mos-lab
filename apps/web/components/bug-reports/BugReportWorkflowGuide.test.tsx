import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  BUG_REPORT_WORKFLOW_VISIBILITY_EVENT,
  BugReportWorkflowGuide,
  BugReportWorkflowModal,
} from './BugReportWorkflowGuide';

describe('BugReportWorkflowGuide', () => {
  it('explains the canonical feature handoff and audited admin exception', () => {
    render(<BugReportWorkflowGuide />);

    expect(screen.getByText(/Mỗi ticket chỉ có một người cần hành động tiếp/)).toBeInTheDocument();
    expect(screen.getByText('Danny · Quyết định')).toBeInTheDocument();
    expect(screen.getByText('Người yêu cầu · Nghiệm thu')).toBeInTheDocument();
    expect(screen.getByText('AI Agent · Xử lý phản hồi reopen')).toBeInTheDocument();
    expect(screen.getByText(/Admin chỉ đóng ngoại lệ/)).toBeInTheDocument();
    expect(screen.getByText(/cột/).closest('span')).toHaveTextContent('Bước tiếp theo');
  });

  it('keeps reporter review as the normal close path for bugs', () => {
    render(<BugReportWorkflowGuide />);

    fireEvent.click(screen.getByRole('tab', { name: 'Báo lỗi' }));

    expect(screen.getByText('Nghiệm thu hoặc reopen')).toBeInTheDocument();
    expect(screen.getByText('Người báo · Nghiệm thu')).toBeInTheDocument();
    expect(screen.queryByText('Người báo / Admin')).not.toBeInTheDocument();
  });

  it('broadcasts modal visibility so floating launchers cannot overlap it', async () => {
    const handleVisibility = vi.fn();
    window.addEventListener(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, handleVisibility);

    try {
      const { rerender } = render(<BugReportWorkflowModal open onClose={() => undefined} />);

      await waitFor(() => expect(handleVisibility).toHaveBeenCalled());
      expect((handleVisibility.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({ open: true });

      rerender(<BugReportWorkflowModal open={false} onClose={() => undefined} />);

      await waitFor(() => {
        expect((handleVisibility.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({ open: false });
      });
    } finally {
      window.removeEventListener(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, handleVisibility);
    }
  });
});
