import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  BUG_REPORT_WORKFLOW_VISIBILITY_EVENT,
  BugReportWorkflowGuide,
  BugReportWorkflowModal,
} from './BugReportWorkflowGuide';

describe('BugReportWorkflowGuide', () => {
  it('keeps the feature workflow focused on the three staff actions', () => {
    render(<BugReportWorkflowGuide />);

    expect(screen.getByRole('tab', { name: 'Thêm chức năng mới' })).toBeInTheDocument();
    const featurePanel = screen.getByRole('tabpanel', { name: 'Thêm chức năng mới' });
    expect(within(featurePanel).getByText('Nói cho mOS biết bạn muốn cải thiện gì')).toBeInTheDocument();
    expect(within(featurePanel).getByText('Trả lời mOS nếu được hỏi')).toBeInTheDocument();
    expect(within(featurePanel).getByText('Kiểm tra kết quả')).toBeInTheDocument();
    expect(screen.queryByText(/Danny/)).not.toBeInTheDocument();
    expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
  });

  it('uses a short bug label and keeps the same three staff actions', () => {
    render(<BugReportWorkflowGuide />);

    fireEvent.click(screen.getByRole('tab', { name: 'Báo lỗi' }));

    const bugPanel = screen.getByRole('tabpanel', { name: 'Báo lỗi' });
    expect(within(bugPanel).getByText('Nói cho mOS biết chuyện gì xảy ra')).toBeInTheDocument();
    expect(within(bugPanel).getByText('Trả lời mOS nếu được hỏi')).toBeInTheDocument();
    expect(within(bugPanel).getByText('Kiểm tra kết quả')).toBeInTheDocument();
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
