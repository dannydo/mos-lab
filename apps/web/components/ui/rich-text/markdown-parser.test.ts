import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown-parser';

describe('markdown-parser', () => {
  it('parses empty or whitespace-only strings gracefully', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n\n  ')).toEqual([]);
    expect(parseInline('')).toEqual([]);
  });

  it('parses inline formatting (bold, italic, bold_italic, strikethrough, code, link)', () => {
    const tokens = parseInline(
      'Hello **bold** and *italic* and ***both*** and ~~strike~~ and `code` and [link](https://mos.app)'
    );
    expect(tokens).toEqual([
      { type: 'text', content: 'Hello ' },
      { type: 'bold', content: 'bold' },
      { type: 'text', content: ' and ' },
      { type: 'italic', content: 'italic' },
      { type: 'text', content: ' and ' },
      { type: 'bold_italic', content: 'both' },
      { type: 'text', content: ' and ' },
      { type: 'strikethrough', content: 'strike' },
      { type: 'text', content: ' and ' },
      { type: 'code', content: 'code' },
      { type: 'text', content: ' and ' },
      { type: 'link', text: 'link', href: 'https://mos.app' },
    ]);
  });

  it('parses headings correctly', () => {
    const md = '# Title 1\n## Subtitle 2\n### Section 3';
    const blocks = parseMarkdown(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ type: 'heading', level: 2 });
    expect(blocks[2]).toMatchObject({ type: 'heading', level: 3 });
  });

  it('parses ordered and unordered lists, including task lists', () => {
    const md = `
1. Bước một
2. Bước hai
3. Bước ba

- Bullet A
- Bullet B

- [ ] Task chưa làm
- [x] Task đã làm
`;
    const blocks = parseMarkdown(md);
    expect(blocks).toHaveLength(3);

    // Ordered list
    expect(blocks[0].type).toBe('list');
    if (blocks[0].type === 'list') {
      expect(blocks[0].ordered).toBe(true);
      expect(blocks[0].items).toHaveLength(3);
      expect(blocks[0].items[0].tokens[0]).toEqual({ type: 'text', content: 'Bước một' });
    }

    // Unordered list
    expect(blocks[1].type).toBe('list');
    if (blocks[1].type === 'list') {
      expect(blocks[1].ordered).toBe(false);
      expect(blocks[1].items).toHaveLength(2);
    }

    // Task list
    expect(blocks[2].type).toBe('list');
    if (blocks[2].type === 'list') {
      expect(blocks[2].items[0].checked).toBe(false);
      expect(blocks[2].items[1].checked).toBe(true);
    }
  });

  it('parses code blocks with language', () => {
    const md = '```ts\nconst x = 42;\nconsole.log(x);\n```';
    const blocks = parseMarkdown(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: 'code_block',
      language: 'ts',
      code: 'const x = 42;\nconsole.log(x);',
    });
  });

  it('parses blockquotes and callout alerts', () => {
    const md = '> [!NOTE]\n> Đây là một lưu ý quan trọng.';
    const blocks = parseMarkdown(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('blockquote');
    if (blocks[0].type === 'blockquote') {
      expect(blocks[0].alertType).toBe('note');
    }
  });

  it('parses sample feature ticket from real user prompt', () => {
    const md = `Tôi muốn bổ sung tính năng timer theo từng bước kỹ thuật của 1 ca Uốn Mi Bóng Tối.
Hiện tại SOP mặc định gồm:
1. Kiểm tra & làm sạch mi
2. Làm mềm
3. Tạo form độ cong

Với mỗi bước cần có:
- Start
- Finish
- Tự ghi Start Time`;

    const blocks = parseMarkdown(md);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[1].type).toBe('list');
    if (blocks[1].type === 'list') {
      expect(blocks[1].ordered).toBe(true);
      expect(blocks[1].items).toHaveLength(3);
    }
    expect(blocks[2].type).toBe('paragraph');
    expect(blocks[3].type).toBe('list');
    if (blocks[3].type === 'list') {
      expect(blocks[3].ordered).toBe(false);
      expect(blocks[3].items).toHaveLength(3);
    }
  });
});
