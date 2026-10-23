import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatMathBlock, MosChatMathInline, isMathValid } from '../MosChatMathBlock';

describe('isMathValid', () => {
  it('identifies valid LaTeX math expressions', () => {
    expect(isMathValid('\\rightarrow')).toBe(true);
    expect(isMathValid('\\ne')).toBe(true);
    expect(isMathValid('\\ge 20\\text{K}')).toBe(true);
    expect(
      isMathValid(
        '\\text{Tổng Thưởng Ngày} = \\text{Thưởng CC Xoay} + \\text{Thưởng Combo/SP} + \\text{Thưởng Tip (20\\%)} + \\text{Thưởng Minigame}'
      )
    ).toBe(true);
    expect(isMathValid('\\text{Thưởng CC Xoay} = \\text{Level CC} \\times 65\\text{đ} \\times \\text{Số lượt}')).toBe(
      true
    );
    expect(isMathValid('x + y = z')).toBe(true);
    expect(isMathValid('a^2 + b^2 = c^2')).toBe(true);
  });

  it('rejects regular currency or text with dollar signs', () => {
    expect(isMathValid('100 và 200')).toBe(false);
    expect(isMathValid('100')).toBe(false);
    expect(isMathValid('500000')).toBe(false);
    expect(isMathValid('')).toBe(false);
  });
});

describe('MosChatMathBlock', () => {
  const sampleMath =
    '\\text{Tổng Thưởng Ngày} = \\text{Thưởng CC Xoay} + \\text{Thưởng Combo/SP} + \\text{Thưởng Tip (20\\%)} + \\text{Thưởng Minigame}';

  it('renders Math block header and KaTeX equation visual', () => {
    const { container } = render(<MosChatMathBlock math={sampleMath} isDark={false} />);

    expect(screen.getByText('Công thức Toán học')).toBeDefined();
    // KaTeX renders .katex and .katex-display
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
  });

  it('strips wrapping $$ if provided in math prop', () => {
    const { container } = render(<MosChatMathBlock math={`$$${sampleMath}$$`} isDark={true} />);
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
  });

  it('allows toggling between rendered visual and LaTeX code view', () => {
    const { container } = render(<MosChatMathBlock math="E = mc^2" isDark={false} />);

    // Initially in rendered mode
    expect(container.querySelector('.katex')).not.toBeNull();

    // Click code button
    const codeBtn = screen.getByLabelText('Xem mã nguồn LaTeX');
    fireEvent.click(codeBtn);

    // Code view should show raw math
    expect(screen.getByText('E = mc^2')).toBeDefined();
  });

  it('provides copy button for LaTeX formula', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<MosChatMathBlock math="a^2 + b^2 = c^2" isDark={false} />);
    const copyBtn = screen.getByText('Sao chép');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('a^2 + b^2 = c^2');
  });
});

describe('MosChatMathInline', () => {
  it('renders inline math symbol successfully', () => {
    const { container } = render(<MosChatMathInline math="\\rightarrow" />);
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
  });

  it('renders inline inequality symbol correctly', () => {
    const { container } = render(<MosChatMathInline math="$\\ne$" />);
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
  });
});
