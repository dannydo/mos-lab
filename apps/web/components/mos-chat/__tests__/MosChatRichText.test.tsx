import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MosChatRichText } from '../MosChatRichText';

// Mock mermaid module to prevent canvas / DOM exceptions in jsdom
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mock-mermaid-svg"></svg>' }),
  },
}));

describe('MosChatRichText', () => {
  it('renders null if content is empty or undefined', () => {
    const { container } = render(<MosChatRichText content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders bold, italic, strikethrough, and inline code formatting', () => {
    const text = 'Chào **Danny Do**, đây là *italic* và ~~gạch ngang~~ cùng `inline_code`.';
    const { container } = render(<MosChatRichText content={text} isDark={true} />);

    expect(screen.getByText('Danny Do')).toBeDefined();
    expect(screen.getByText('italic')).toBeDefined();
    expect(screen.getByText('gạch ngang')).toBeDefined();
    expect(screen.getByText('inline_code')).toBeDefined();

    // Bold should have strong tag
    const strongEl = container.querySelector('strong');
    expect(strongEl).not.toBeNull();
    expect(strongEl?.textContent).toBe('Danny Do');
  });

  it('renders headings (#, ##, ###) properly', () => {
    const md = '### 🔍 4 NGUYÊN NHÂN KHOA HỌC GÂY LỆCH SỐ LIỆU';
    render(<MosChatRichText content={md} isDark={true} />);

    expect(screen.getByText(/4 NGUYÊN NHÂN KHOA HỌC GÂY LỆCH SỐ LIỆU/)).toBeDefined();
  });

  it('renders horizontal divider (---)', () => {
    const md = 'Đoạn trên\n\n---\n\nĐoạn dưới';
    const { container } = render(<MosChatRichText content={md} isDark={true} />);

    const hrEl = container.querySelector('hr');
    expect(hrEl).not.toBeNull();
  });

  it('renders mermaid diagram block when code block has mermaid tag', () => {
    const md = '```mermaid\nflowchart TD\n  A["Lệch Số"] --> B["Nguyên nhân"]\n```';
    render(<MosChatRichText content={md} isDark={true} />);

    expect(screen.getByText('Sơ đồ luồng (Mermaid)')).toBeDefined();
  });

  it('renders standard code block with language header and copy button', () => {
    const md = '```typescript\nconst x = 100;\n```';
    render(<MosChatRichText content={md} isDark={true} />);

    expect(screen.getByText(/typescript/i)).toBeDefined();
    expect(screen.getByText('Sao chép')).toBeDefined();
    expect(screen.getByText('const x = 100;')).toBeDefined();
  });

  it('renders markdown tables with headers and rows', () => {
    const md = '| Chỉ số | Giá trị |\n|---|---|\n| Daily Bonus | 150.000đ |';
    render(<MosChatRichText content={md} isDark={true} />);

    expect(screen.getByText('Chỉ số')).toBeDefined();
    expect(screen.getByText('Giá trị')).toBeDefined();
    expect(screen.getByText('Daily Bonus')).toBeDefined();
    expect(screen.getByText('150.000đ')).toBeDefined();
  });

  it('renders checklist items (- [ ] and - [x])', () => {
    const md = '- [ ] Việc cần làm\n- [x] Việc đã xong';
    render(<MosChatRichText content={md} isDark={true} />);

    expect(screen.getByText('Việc cần làm')).toBeDefined();
    expect(screen.getByText('Việc đã xong')).toBeDefined();
  });

  it('renders blockquote (> text)', () => {
    const md = '> Trích dẫn quan trọng từ chuyên gia';
    const { container } = render(<MosChatRichText content={md} isDark={true} />);

    const bq = container.querySelector('blockquote');
    expect(bq).not.toBeNull();
    expect(bq?.textContent).toContain('Trích dẫn quan trọng');
  });

  it('renders @mentions for AI and staff', () => {
    const md = 'Nhờ @AI kiểm tra giúp @Danny Do nhé!';
    render(<MosChatRichText content={md} isDark={true} />);

    expect(screen.getByText('AI')).toBeDefined();
    expect(screen.getByText('Danny Do')).toBeDefined();
  });
});
