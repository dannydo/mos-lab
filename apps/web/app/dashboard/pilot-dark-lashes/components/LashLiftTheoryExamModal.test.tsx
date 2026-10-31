import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LashLiftTheoryExamModal, THEORY_QUESTIONS } from './LashLiftTheoryExamModal';

describe('LashLiftTheoryExamModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all 17 multiple choice questions and 3 essay questions', () => {
    render(<LashLiftTheoryExamModal open={true} onClose={vi.fn()} />);

    expect(THEORY_QUESTIONS).toHaveLength(17);
    expect(screen.getByText(/Bài Thi Lý Thuyết Kỹ Thuật Uốn Mi/i)).toBeInTheDocument();
    expect(screen.getByText('Câu 1.')).toBeInTheDocument();
    expect(screen.getByText('Câu 17.')).toBeInTheDocument();

    // Essay questions
    expect(screen.getByText(/Câu 18 \(10đ\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Câu 19 \(12đ\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Câu 20 \(10đ\)/i)).toBeInTheDocument();
  });

  it('allows candidate to answer questions and submit exam to calculate score', () => {
    const handleSubmitScore = vi.fn();
    render(<LashLiftTheoryExamModal open={true} onClose={vi.fn()} onSubmitScore={handleSubmitScore} />);

    // Click submit button
    const submitBtn = screen.getByTestId('btn-submit-theory-exam');
    fireEvent.click(submitBtn);

    // Score callback should have been called
    expect(handleSubmitScore).toHaveBeenCalledWith(expect.any(Number), expect.any(String));

    // Button changes to toggle explanations
    expect(screen.getByText(/Ẩn Lời Giải/i)).toBeInTheDocument();
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden word "thợ")', () => {
    const { container } = render(<LashLiftTheoryExamModal open={true} onClose={vi.fn()} />);
    const text = container.textContent || '';
    expect(text).not.toMatch(/\bthợ\b/i);
    expect(text).not.toMatch(/thợ mi/i);
  });
});
