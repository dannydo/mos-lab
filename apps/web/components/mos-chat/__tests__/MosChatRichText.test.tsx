import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MosChatRichText, decodeHtmlEntities } from '../MosChatRichText';

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

  it('renders markdown tables with column alignment and br tags inside cells', () => {
    const tableMd =
      '| Hạng Mục | Người Chịu Trách Nhiệm Chính | Vai Trò & Hành Động Cụ Thể |\n' +
      '| :--- | :---: | ---: |\n' +
      '| An toàn & Vận hành | Ban Giám Đốc | - Ban hành hướng dẫn.<br>- Phê duyệt kế hoạch.<br>- Thẩm định định kỳ. |';

    const { container } = render(<MosChatRichText content={tableMd} isDark={true} />);

    expect(screen.getByText('Hạng Mục')).toBeDefined();
    expect(screen.getByText('Người Chịu Trách Nhiệm Chính')).toBeDefined();
    expect(screen.getByText('Vai Trò & Hành Động Cụ Thể')).toBeDefined();
    expect(screen.getByText('An toàn & Vận hành')).toBeDefined();
    expect(screen.getByText('Ban Giám Đốc')).toBeDefined();

    // Check line breaks (<br>) rendered inside td
    const tdList = container.querySelectorAll('td');
    expect(tdList.length).toBe(3);
    const lastTd = tdList[2];
    const brTags = lastTd.querySelectorAll('br');
    expect(brTags.length).toBe(2);

    // Check text alignment classes
    const thList = container.querySelectorAll('th');
    expect(thList[0].className).toContain('text-left');
    expect(thList[1].className).toContain('text-center');
    expect(thList[2].className).toContain('text-right');
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

  it('renders multi-word Vietnamese staff names, emojis, @MAI, and avoids muddy color in isMe bubbles', () => {
    const md = 'Chào bạn @Bùi Sinh Nguyên, bạn @Tường Đoan 🪽, bạn @MAI';
    const { container } = render(<MosChatRichText content={md} isMe={true} isDark={true} />);

    expect(screen.getByText('Bùi Sinh Nguyên')).toBeDefined();
    expect(screen.getByText('Tường Đoan 🪽')).toBeDefined();
    expect(screen.getByText('MAI')).toBeDefined();

    // Check that mention tags do NOT have the muddy dark color bg-slate-950/20 text-slate-950
    const mentionSpans = container.querySelectorAll('span.inline-flex.items-center');
    expect(mentionSpans.length).toBeGreaterThanOrEqual(3);
    mentionSpans.forEach((span) => {
      expect(span.className).not.toContain('bg-slate-950/20');
      expect(span.className).not.toContain('text-slate-950');
    });
  });

  it('renders inline HTML tags: <b>, <strong>, <i>, <em>, <u>, <s>, <del>, <code>, <mark>, <a href="...">', () => {
    const htmlText =
      '<b>Bold HTML</b>, <strong>Strong HTML</strong>, <i>Italic HTML</i>, ' +
      '<em>Em HTML</em>, <u>Underline HTML</u>, <s>Strike HTML</s>, <del>Del HTML</del>, ' +
      '<code>code_snippet</code>, <mark>Highlight</mark>, và <a href="https://masteros.app">Trang chủ</a>.';

    const { container } = render(<MosChatRichText content={htmlText} isDark={true} />);

    expect(screen.getByText('Bold HTML')).toBeDefined();
    expect(screen.getByText('Strong HTML')).toBeDefined();
    expect(screen.getByText('Italic HTML')).toBeDefined();
    expect(screen.getByText('Em HTML')).toBeDefined();
    expect(screen.getByText('Underline HTML')).toBeDefined();
    expect(screen.getByText('Strike HTML')).toBeDefined();
    expect(screen.getByText('Del HTML')).toBeDefined();
    expect(screen.getByText('code_snippet')).toBeDefined();
    expect(screen.getByText('Highlight')).toBeDefined();

    const link = container.querySelector('a[href="https://masteros.app"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Trang chủ');
  });

  it('renders HTML tables properly', () => {
    const htmlTable =
      '<table>\n' +
      '  <thead><tr><th>Cột 1</th><th>Cột 2</th></tr></thead>\n' +
      '  <tbody><tr><td>Dữ liệu 1</td><td>Dữ liệu 2</td></tr></tbody>\n' +
      '</table>';

    render(<MosChatRichText content={htmlTable} isDark={true} />);

    expect(screen.getByText('Cột 1')).toBeDefined();
    expect(screen.getByText('Cột 2')).toBeDefined();
    expect(screen.getByText('Dữ liệu 1')).toBeDefined();
    expect(screen.getByText('Dữ liệu 2')).toBeDefined();
  });

  it('renders HTML lists (<ul>, <ol>, <li>) properly', () => {
    const htmlLists =
      '<ul><li>Mục danh sách A</li><li>Mục danh sách B</li></ul>\n' +
      '<ol><li>Bước số một</li><li>Bước số hai</li></ol>';

    render(<MosChatRichText content={htmlLists} isDark={true} />);

    expect(screen.getByText('Mục danh sách A')).toBeDefined();
    expect(screen.getByText('Mục danh sách B')).toBeDefined();
    expect(screen.getByText('Bước số một')).toBeDefined();
    expect(screen.getByText('Bước số hai')).toBeDefined();
  });

  it('renders HTML headings (<h1>, <h2>, <h3>) and blockquote', () => {
    const htmlBlocks = '<h2>Tiêu đề HTML H2</h2>\n' + '<blockquote>Lời khuyên quản trị viên</blockquote>\n' + '<hr>';

    const { container } = render(<MosChatRichText content={htmlBlocks} isDark={true} />);

    expect(screen.getByText('Tiêu đề HTML H2')).toBeDefined();
    expect(screen.getByText('Lời khuyên quản trị viên')).toBeDefined();
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('decodes HTML entities correctly', () => {
    const rawEntities = 'H&amp;M &lt;quy trình&gt; &quot;thành công&quot; &#39;chuẩn&#39; &nbsp; OK';
    render(<MosChatRichText content={rawEntities} isDark={true} />);

    expect(screen.getByText(/H&M <quy trình> "thành công" 'chuẩn'/)).toBeDefined();
    expect(decodeHtmlEntities('&lt;div&gt;&amp;&nbsp;')).toBe('<div>&\u00A0');
  });

  it('preserves raw HTML code inside markdown code blocks without executing it', () => {
    const codeBlock = '```html\n<div class="test"><span>Raw Code</span></div>\n```';
    const { container } = render(<MosChatRichText content={codeBlock} isDark={true} />);

    expect(screen.getByText(/Raw Code/)).toBeDefined();
    // It should not render an actual div with class "test"
    expect(container.querySelector('.test')).toBeNull();
  });

  it('renders bold text and bullets with high contrast and without black text in dark mode when isMe is true', () => {
    const text =
      '@All cả nhà giúp anh ra 1 kế hoạch số cho **tuần này** và **tháng 11** nhé.\n• cần hoàn tất trong hôm nay';
    const { container } = render(<MosChatRichText content={text} isMe={true} isDark={true} />);

    const boldEls = container.querySelectorAll('strong');
    expect(boldEls.length).toBe(2);
    boldEls.forEach((el) => {
      expect(el.className).not.toContain('text-slate-950');
      expect(el.className).toContain('text-amber-300');
    });

    const bullet = screen.getByText('•');
    expect(bullet.className).not.toContain('text-slate-950');
    expect(bullet.className).toContain('text-amber-400');
  });
});
