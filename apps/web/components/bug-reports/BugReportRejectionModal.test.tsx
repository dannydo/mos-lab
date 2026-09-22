import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BugReportRejectionModal } from './BugReportRejectionModal';

describe('BugReportRejectionModal', () => {
  const defaultProps = {
    open: true,
    reportKey: 'MOS-BUG-44',
    reportTitle: 'Cấu hình điều kiện game theo Booking Channel GB',
    submitting: false,
    onCancel: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  it('renders title, guidance, and input fields', () => {
    render(<BugReportRejectionModal {...defaultProps} />);

    expect(screen.getByText(/Phản hồi điểm chưa đúng — MOS-BUG-44/i)).toBeInTheDocument();
    expect(screen.getByText(/Cấu hình điều kiện game theo Booking Channel GB/i)).toBeInTheDocument();
    expect(screen.getByText(/Mô tả điểm chưa đúng hoặc hành vi thực tế trên máy bạn:/i)).toBeInTheDocument();
    expect(screen.getByText(/Triệu chứng vẫn hoàn toàn như cũ ban đầu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi phản hồi & Yêu cầu sửa lại/i })).toBeInTheDocument();
  });

  it('submits detailed feedback when note is entered', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BugReportRejectionModal {...defaultProps} onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText(
      /Ví dụ: Em bấm vào tạo game mới thì không có ô chọn Booking Channel GB/i
    );
    fireEvent.change(textarea, { target: { value: 'Nút chọn channel GB vẫn không thấy xuất hiện trên giao diện.' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi phản hồi & Yêu cầu sửa lại/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        note: 'Nút chọn channel GB vẫn không thấy xuất hiện trên giao diện.',
        reopenIntent: 'DETAILS',
        attachments: [],
      });
    });
  });

  it('submits UNCHANGED intent when unchanged checkbox is checked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BugReportRejectionModal {...defaultProps} onSubmit={onSubmit} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: /Gửi phản hồi & Yêu cầu sửa lại/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        note: undefined,
        reopenIntent: 'UNCHANGED',
        attachments: [],
      });
    });
  });
});
