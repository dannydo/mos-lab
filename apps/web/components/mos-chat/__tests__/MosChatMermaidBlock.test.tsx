import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatMermaidBlock } from '../MosChatMermaidBlock';

// Mock mermaid module
vi.mock('mermaid', () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn().mockImplementation(async (id: string, text: string) => {
        if (text.includes('INVALID_SYNTAX')) {
          throw new Error('Parse error on line 1');
        }
        return { svg: `<svg data-testid="mock-mermaid-svg" viewBox="0 0 600 400"><text>${text}</text></svg>` };
      }),
    },
  };
});

describe('MosChatMermaidBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Mermaid diagram successfully with clean SVG', async () => {
    const code = `
flowchart TD
    A[Khách hàng] --> B[MAI Tiếp nhận]
    B --> C[Phản hồi]
`;

    render(<MosChatMermaidBlock code={code} isDark={false} />);

    // Shows header with title
    expect(screen.getByText('Sơ đồ luồng (Mermaid)')).toBeDefined();

    // Renders the SVG
    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });

    // View toggle buttons are present (icon-only with aria-label)
    expect(screen.getByRole('button', { name: /Xem sơ đồ/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Xem mã nguồn/i })).toBeDefined();
  });

  it('allows toggling between diagram view and code view', async () => {
    const code = 'graph LR\n  Start --> Stop';
    const { container } = render(<MosChatMermaidBlock code={code} isDark={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });

    // Switch to code view
    const codeBtn = screen.getByRole('button', { name: /Xem mã nguồn/i });
    fireEvent.click(codeBtn);

    // Should display the raw code in a code tag
    expect(container.querySelector('code')?.textContent?.trim()).toBe('graph LR\n  Start --> Stop');

    // Switch back to diagram
    const diagramBtn = screen.getByRole('button', { name: /Xem sơ đồ/i });
    fireEvent.click(diagramBtn);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });
  });

  it('strips leading and trailing markdown code block markers', async () => {
    const code = '```mermaid\nsequenceDiagram\n  Alice->>Bob: Hello\n```';
    const { container } = render(<MosChatMermaidBlock code={code} isDark={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });

    // Click code mode to see cleaned code
    fireEvent.click(screen.getByRole('button', { name: /Xem mã nguồn/i }));
    expect(container.querySelector('code')?.textContent?.trim()).toBe('sequenceDiagram\n  Alice->>Bob: Hello');
  });

  it('falls back gracefully to code view when mermaid syntax has error', async () => {
    const invalidCode = 'INVALID_SYNTAX_CODE';
    const { container } = render(<MosChatMermaidBlock code={invalidCode} isDark={false} />);

    await waitFor(() => {
      expect(screen.getByText('Lỗi cú pháp')).toBeDefined();
      expect(screen.getByText(/Không thể kết xuất sơ đồ dạng đồ họa/)).toBeDefined();
    });

    // Code is still displayed
    expect(container.querySelector('code')?.textContent?.trim()).toBe('INVALID_SYNTAX_CODE');
  });

  it('opens interactive zoom & pan modal and handles zoom controls', async () => {
    const code = 'graph TD\n  StepA --> StepB';
    render(<MosChatMermaidBlock code={code} isDark={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });

    // Click fullscreen / zoom button
    const expandBtn = screen.getByRole('button', { name: /Xem toàn màn hình/i });
    fireEvent.click(expandBtn);

    // Modal title should appear
    await waitFor(() => {
      expect(screen.getByText(/Sơ đồ quy trình \(Toàn màn hình & Phóng to\)/i)).toBeDefined();
    });

    // Zoom In button works
    const zoomInBtn = screen.getByRole('button', { name: /Phóng to sơ đồ/i });
    fireEvent.click(zoomInBtn);

    // Zoom Out button works
    const zoomOutBtn = screen.getByRole('button', { name: /Thu nhỏ sơ đồ/i });
    fireEvent.click(zoomOutBtn);

    // Fit screen button works
    const fitBtn = screen.getByRole('button', { name: /Vừa khung hình/i });
    fireEvent.click(fitBtn);
  });
});
