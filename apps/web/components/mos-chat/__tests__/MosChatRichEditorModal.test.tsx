import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
    expect(screen.getByPlaceholderText(/Gõ nhanh nội dung... \(Bấm • để tạo danh sách/i)).toBeInTheDocument();

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

  it('supports custom zIndex to ensure modal renders above mobile chat drawer (MOS-BUG-222)', () => {
    const { container } = render(
      <MosChatRichEditorModal
        open={true}
        zIndex={2000}
        onClose={vi.fn()}
        initialValue="Test zIndex"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    // Ant Design Modal wraps in a root portal with zIndex
    const modalWrap = document.querySelector('.ant-modal-wrap');
    expect(modalWrap).toBeTruthy();
  });

  it('handles mobile touch formatting without losing selected text (MOS-FEAT-225)', () => {
    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue="Khuyến mãi mùa hè Wings"
        initialMode="compact"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Gõ nhanh nội dung/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Khuyến mãi mùa hè Wings');

    // Simulate mobile touch selection: user highlights "Khuyến mãi" (indices 0..10)
    textarea.setSelectionRange(0, 10);
    fireEvent.select(textarea);
    fireEvent.touchEnd(textarea);

    // Tap Bold button with onPointerDown
    const boldBtn = screen.getByRole('button', { name: /In đậm/i });
    fireEvent.pointerDown(boldBtn);
    fireEvent.click(boldBtn);

    // Should wrap "Khuyến mãi" in **Khuyến mãi**
    expect(textarea.value).toBe('**Khuyến mãi** mùa hè Wings');
  });

  it('exposes headings H1, H2, H3 and Table in toolbar in compact/mobile mode (MOS-FEAT-225)', () => {
    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue="Thông báo quan trọng"
        initialMode="compact"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    // Verify H1, H2, H3, Table, and Divider are present in the toolbar
    const h1Btn = screen.getByRole('button', { name: /Tiêu đề H1/i });
    const h2Btn = screen.getByRole('button', { name: /Tiêu đề H2/i });
    const h3Btn = screen.getByRole('button', { name: /Tiêu đề H3/i });
    const tableBtn = screen.getByRole('button', { name: /Chèn bảng/i });
    const dividerBtn = screen.getByRole('button', { name: /Đường kẻ phân cách/i });

    expect(h1Btn).toBeInTheDocument();
    expect(h2Btn).toBeInTheDocument();
    expect(h3Btn).toBeInTheDocument();
    expect(tableBtn).toBeInTheDocument();
    expect(dividerBtn).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Gõ nhanh nội dung/i) as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 0);

    fireEvent.click(h1Btn);
    expect(textarea.value).toBe('# Thông báo quan trọng');
  });

  it('renders responsive mobile footer with fully visible and clickable buttons (MOS-FEAT-225)', () => {
    const handleApply = vi.fn();
    const handleSend = vi.fn();
    const handleClose = vi.fn();

    render(
      <MosChatRichEditorModal
        open={true}
        onClose={handleClose}
        initialValue="Nội dung cần lưu"
        initialMode="compact"
        onApply={handleApply}
        onSend={handleSend}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Áp dụng vào chat/i });
    const sendBtn = screen.getByRole('button', { name: /Gửi tin nhắn ngay/i });
    const cancelBtn = screen.getByRole('button', { name: /Hủy/i });

    expect(applyBtn).toBeInTheDocument();
    expect(sendBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(applyBtn);
    expect(handleApply).toHaveBeenCalledWith('Nội dung cần lưu');
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not preventDefault on pointerdown so iOS WebKit tap fires click and restores caret after blur (MOS-FEAT-225)', () => {
    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue={'Dòng một\nDòng hai'}
        initialMode="compact"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Gõ nhanh nội dung/i) as HTMLTextAreaElement;
    textarea.focus();
    // Place caret on the second line ("Dòng hai", index 11)
    textarea.setSelectionRange(11, 11);
    fireEvent.select(textarea);

    const h1Btn = screen.getByRole('button', { name: /Tiêu đề H1/i });
    const pdEvent = new Event('pointerdown', { bubbles: true, cancelable: true });
    h1Btn.dispatchEvent(pdEvent);
    // Critical for iOS Safari/WebKit: pointerdown MUST NOT be defaultPrevented
    expect(pdEvent.defaultPrevented).toBe(false);

    // Simulate mobile browser blurring textarea and resetting selectionStart to 0 before click
    textarea.blur();
    textarea.setSelectionRange(0, 0);
    fireEvent.click(h1Btn);

    expect(textarea.value).toBe('Dòng một\n# Dòng hai');
  });

  it('renders mobile-optimized layout with safe-area clearance and horizontal scroll toolbar (MOS-BUG-222)', () => {
    // Set mobile window width (iPhone 14 / 15 / 16 standard viewport)
    const originalInnerWidth = window.innerWidth;
    window.innerWidth = 390;

    render(
      <MosChatRichEditorModal
        open={true}
        onClose={vi.fn()}
        initialValue="Tin nhắn mobile"
        initialMode="compact"
        onApply={vi.fn()}
        onSend={vi.fn()}
      />
    );

    // Verify modal is in document with mobile header structure
    expect(screen.getByText('Soạn thảo phong phú (CKEditor)')).toBeInTheDocument();
    expect(screen.getByText('CKEditor Mode')).toBeInTheDocument();

    // Verify all 3 footer action buttons are present and visible on mobile
    const cancelBtn = screen.getByRole('button', { name: /Hủy/i });
    const applyBtn = screen.getByRole('button', { name: /Áp dụng vào chat/i });
    const sendBtn = screen.getByRole('button', { name: /Gửi tin nhắn ngay/i });

    expect(cancelBtn).toBeInTheDocument();
    expect(applyBtn).toBeInTheDocument();
    expect(sendBtn).toBeInTheDocument();

    // Verify formatting toolbar container has no-scrollbar and overflow-x-auto classes
    const boldBtn = screen.getByRole('button', { name: /In đậm/i });
    const toolbar = boldBtn.closest('.overflow-x-auto');
    expect(toolbar).toBeTruthy();
    expect(toolbar?.className).toContain('no-scrollbar');
    expect(toolbar?.className).toContain('touch-pan-x');

    // Restore innerWidth
    window.innerWidth = originalInnerWidth;
  });

  it('positions mobile modal as visualViewport-aware bottom sheet without overlapping iOS status bar when keyboard opens (MOS-FEAT-225)', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    const originalVisualViewport = window.visualViewport;

    const listeners: Record<string, Array<() => void>> = { resize: [], scroll: [] };
    const mockVisualViewport = {
      height: 844,
      width: 390,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: () => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((fn) => fn !== cb);
        }
      }),
    };

    window.innerWidth = 390;
    window.innerHeight = 844;
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: mockVisualViewport,
    });

    try {
      render(
        <MosChatRichEditorModal
          open={true}
          onClose={vi.fn()}
          initialValue="Tin nhắn kiểm tra bàn phím iOS"
          initialMode="compact"
          onApply={vi.fn()}
          onSend={vi.fn()}
        />
      );

      const modalWrap = document.querySelector('.ant-modal-wrap') as HTMLElement;
      const modalDialog = document.querySelector('.ant-modal') as HTMLElement;
      const modalContent = document.querySelector('.ant-modal-content') as HTMLElement;

      expect(modalWrap).toBeTruthy();
      expect(modalWrap.className).toContain('mos-rich-editor-mobile-wrap');
      expect(modalWrap.style.top).toBe('0px');
      expect(modalWrap.style.height).toBe('844px');

      expect(modalDialog.className).toContain('adaptive-overlay');
      expect(modalDialog.className).toContain('mos-rich-editor-mobile-modal');
      // Must NOT use legacy top: 12px that collides with iOS status bar
      expect(modalDialog.style.top).toBe('0px');
      expect(modalContent.style.maxHeight).toBe('788px');

      // Simulate iOS virtual keyboard opening + visualViewport scrolling down (offsetTop > 0)
      mockVisualViewport.height = 460;
      mockVisualViewport.offsetTop = 64;
      act(() => {
        listeners.resize.forEach((cb) => cb());
      });

      expect(modalWrap.style.top).toBe('64px');
      expect(modalWrap.style.height).toBe('460px');
      expect(modalDialog.style.top).toBe('0px');
      expect(modalContent.style.maxHeight).toBe('404px');
    } finally {
      window.innerWidth = originalInnerWidth;
      window.innerHeight = originalInnerHeight;
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        writable: true,
        value: originalVisualViewport,
      });
    }
  });
});
