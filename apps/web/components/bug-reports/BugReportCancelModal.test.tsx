import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BugReportCancelModal } from './BugReportCancelModal';

describe('BugReportCancelModal', () => {
  const defaultProps = {
    open: true,
    reportKey: 'MOS-BUG-210',
    reportTitle: 'Báo lỗi tạo sai số liệu',
    submitting: false,
    onCancel: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  it('renders title, guidance, quick reasons, and submit button', () => {
    render(<BugReportCancelModal {...defaultProps} />);

    expect(screen.getByText(/Huỷ yêu cầu MOS-BUG-210/i)).toBeInTheDocument();
    expect(screen.getByText(/Báo lỗi tạo sai số liệu/i)).toBeInTheDocument();
    expect(screen.getByText(/Báo nhầm \/ Không phải lỗi/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã tự giải quyết được/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xác nhận huỷ/i })).toBeInTheDocument();
  });

  it('submits with selected quick reason and custom reason', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BugReportCancelModal {...defaultProps} onSubmit={onSubmit} />);

    const quickChip = screen.getByText(/Báo nhầm \/ Không phải lỗi/i);
    fireEvent.click(quickChip);

    const textarea = screen.getByPlaceholderText(/Nhập lý do cụ thể/i);
    fireEvent.change(textarea, { target: { value: 'Em bấm nhầm nút tạo báo cáo' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận huỷ/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Báo nhầm / Không phải lỗi - Em bấm nhầm nút tạo báo cáo');
    });
  });

  it('calls onCancel when clicking Giữ lại yêu cầu', () => {
    const onCancel = vi.fn();
    render(<BugReportCancelModal {...defaultProps} onCancel={onCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /Giữ lại yêu cầu/i });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
