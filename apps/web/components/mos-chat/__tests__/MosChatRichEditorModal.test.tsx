import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatRichEditorModal } from '../MosChatRichEditorModal';

describe('MosChatRichEditorModal', () => {
  it('renders modal with title, badges and textarea when open', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    const handleSend = vi.fn();

    render(
      <MosChatRichEditorModal
        open={true}
        onClose={handleClose}
        initialValue="Xin chào **Wings**"
        onApply={handleApply}
        onSend={handleSend}
      />
    );

    expect(screen.getByText('Soạn thảo phong phú (CKEditor)')).toBeInTheDocument();
    expect(screen.getByText('CKEditor Mode')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Xin chào **Wings**')).toBeInTheDocument();
  });

  it('updates text and calls onApply with updated content', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    const handleSend = vi.fn();

    render(
      <MosChatRichEditorModal
        open={true}
        onClose={handleClose}
        initialValue="Nội dung ban đầu"
        onApply={handleApply}
        onSend={handleSend}
      />
    );

    const textarea = screen.getByDisplayValue('Nội dung ban đầu');
    fireEvent.change(textarea, { target: { value: 'Nội dung đã chỉnh sửa' } });

    const applyButton = screen.getByText('Áp dụng vào chat');
    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledWith('Nội dung đã chỉnh sửa');
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onSend when user clicks send button', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();
    const handleSend = vi.fn();

    render(
      <MosChatRichEditorModal
        open={true}
        onClose={handleClose}
        initialValue="Tin nhắn cần gửi"
        onApply={handleApply}
        onSend={handleSend}
      />
    );

    const sendButton = screen.getByText('Gửi tin nhắn ngay');
    fireEvent.click(sendButton);

    expect(handleSend).toHaveBeenCalledWith('Tin nhắn cần gửi');
    expect(handleClose).toHaveBeenCalled();
  });

  it('switches between view modes (edit, split, preview)', () => {
    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue="## Tiêu đề thử nghiệm"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const previewButton = screen.getByRole('button', { name: /xem trước/i });
    fireEvent.click(previewButton);
    expect(screen.getByText('Xem trước trực quan (Live Render)')).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: /soạn thảo/i });
    fireEvent.click(editButton);
    expect(screen.getByText(/Khung soạn thảo/i)).toBeInTheDocument();
  });
});
