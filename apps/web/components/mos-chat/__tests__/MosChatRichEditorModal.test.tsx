import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MosChatRichEditorModal,
  detectActiveFormatsAtCursor,
  handleSmartListEnterKey,
} from '../MosChatRichEditorModal';
import { MosChatRichText } from '../MosChatRichText';

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

  it('switches between view modes (compact, edit, split, preview)', () => {
    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue="## Tiêu đề thử nghiệm"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const compactButton = screen.getByRole('button', { name: /bản gọn/i });
    fireEvent.click(compactButton);
    expect(
      screen.getByPlaceholderText(/Gõ nhanh nội dung... \(Bấm • để tạo danh sách/i)
    ).toBeInTheDocument();

    const previewButton = screen.getByRole('button', { name: /xem trước$/i });
    fireEvent.click(previewButton);
    expect(screen.getByText('Xem trước trực quan (Live Render)')).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: /soạn thảo/i });
    fireEvent.click(editButton);
    expect(screen.getByText(/Khung soạn thảo/i)).toBeInTheDocument();
  });

  it('supports compact quick-type bullet toggle and auto-continues bullet on Enter', () => {
    const handleSend = vi.fn();
    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue=""
        initialMode="compact"
        onApply={vi.fn()}
        onSend={handleSend}
      />
    );

    const bulletBtn = screen.getByRole('button', { name: /Danh sách dấu đầu dòng/i });
    fireEvent.click(bulletBtn);

    const textarea = screen.getByPlaceholderText(/Gõ nhanh nội dung/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('• ');

    // Simulate typing item 1 and pressing Enter
    fireEvent.change(textarea, { target: { value: '• Ý thứ nhất', selectionStart: 12, selectionEnd: 12 } });
    textarea.setSelectionRange(12, 12);
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(textarea.value).toBe('• Ý thứ nhất\n• ');
  });

  it('detects active formats and handles smart list Enter continuation cleanly', () => {
    const formats = detectActiveFormatsAtCursor('• Mục đang gõ', 5);
    expect(formats.bullet).toBe(true);
    expect(formats.number).toBe(false);

    // Continue numbered list
    const cont = handleSmartListEnterKey('1. Bước đầu', 11, 11);
    expect(cont.handled).toBe(true);
    expect(cont.nextText).toBe('1. Bước đầu\n2. ');

    // Exit empty bullet list on Enter
    const exitEmpty = handleSmartListEnterKey('• Ý 1\n• ', 8, 8);
    expect(exitEmpty.handled).toBe(true);
    expect(exitEmpty.nextText).toBe('• Ý 1\n');
  });

  it('renders colored text and markdown links in MosChatRichText', () => {
    render(
      <MosChatRichText
        content={'<span style="color:#ef4444">Chữ đỏ nổi bật</span> và [Tài liệu chuẩn](https://wingslashes.com)'}
      />
    );

    const coloredSpan = screen.getByText('Chữ đỏ nổi bật');
    expect(coloredSpan).toBeInTheDocument();
    expect(coloredSpan).toHaveStyle({ color: 'rgb(239, 68, 68)' });

    const linkEl = screen.getByText('Tài liệu chuẩn').closest('a');
    expect(linkEl).toHaveAttribute('href', 'https://wingslashes.com');
  });
});
