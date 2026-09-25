import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RichTextViewer } from '../RichTextViewer';
import { RichTextEditor } from '../RichTextEditor';
import { useState } from 'react';

describe('RichTextViewer', () => {
  it('renders nothing when content is empty or null', () => {
    const { container } = render(<RichTextViewer content="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders single-line paragraph concisely', () => {
    render(
      <RichTextViewer content="Controlled non-sensitive plan verification." className="![font-size:var(--text-base)]" />
    );
    const textEl = screen.getByText('Controlled non-sensitive plan verification.');
    expect(textEl).toBeInTheDocument();
  });

  it('renders headings and lists with proper HTML elements', () => {
    const md = `### Hướng dẫn kiểm tra
1. Kiểm tra mi
2. Làm mềm

- Bullet point`;
    render(<RichTextViewer content={md} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Hướng dẫn kiểm tra');
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(screen.getByText('Kiểm tra mi')).toBeInTheDocument();
    expect(screen.getByText('Làm mềm')).toBeInTheDocument();
    expect(screen.getByText('Bullet point')).toBeInTheDocument();
  });

  it('renders formatted bold and italic text', () => {
    render(<RichTextViewer content="**In đậm** và *in nghiêng*" />);
    expect(screen.getByText('In đậm')).toBeInTheDocument();
    expect(screen.getByText('in nghiêng')).toBeInTheDocument();
  });
});

describe('RichTextEditor', () => {
  function TestWrapper({ initial = 'Initial text' }: { initial?: string }) {
    const [val, setVal] = useState(initial);
    return <RichTextEditor value={val} onChange={setVal} placeholder="Nhập văn bản..." />;
  }

  it('renders the textarea with initial value', () => {
    render(<TestWrapper />);
    const textarea = screen.getByPlaceholderText('Nhập văn bản...');
    expect(textarea).toHaveValue('Initial text');
  });

  it('switches between edit and preview tabs', () => {
    render(<TestWrapper />);
    const previewTab = screen.getByRole('button', { name: /Xem trước/i });
    fireEvent.click(previewTab);
    expect(screen.getByText('Initial text')).toBeInTheDocument();

    const editTab = screen.getByRole('button', { name: /Soạn thảo/i });
    fireEvent.click(editTab);
    expect(screen.getByPlaceholderText('Nhập văn bản...')).toBeInTheDocument();
  });

  it('inserts bold formatting when clicking bold button', () => {
    render(<TestWrapper initial="" />);
    const boldBtn = screen.getByTitle(/In đậm/i);
    fireEvent.click(boldBtn);
    const textarea = screen.getByPlaceholderText('Nhập văn bản...');
    expect(textarea).toHaveValue('**in đậm**');
  });
});
