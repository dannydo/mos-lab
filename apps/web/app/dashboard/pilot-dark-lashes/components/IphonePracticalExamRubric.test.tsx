import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { IphonePracticalExamRubric } from './IphonePracticalExamRubric';

describe('IphonePracticalExamRubric', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders iPhone sticky header, 70-min timer and candidate info', () => {
    render(<IphonePracticalExamRubric candidateName="Chuyên Viên Giang Hồ" examinerName="CEO Danny Đỗ" />);

    expect(screen.getByTestId('iphone-exam-rubric-view')).toBeInTheDocument();
    expect(screen.getByText('Chuyên Viên Giang Hồ')).toBeInTheDocument();
    expect(screen.getAllByText(/CEO Danny Đỗ/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('practical-exam-timer')).toBeInTheDocument();
    expect(screen.getByText('70:00')).toBeInTheDocument();
  });

  it('allows starting, pausing and resetting the 70-minute timer', () => {
    render(<IphonePracticalExamRubric />);

    const toggleBtn = screen.getByTestId('btn-toggle-timer');
    // Start timer
    fireEvent.click(toggleBtn);

    act(() => {
      vi.advanceTimersByTime(2000); // advance 2 seconds
    });
    expect(screen.getByText('69:58')).toBeInTheDocument();

    // Pause timer
    fireEvent.click(toggleBtn);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('69:58')).toBeInTheDocument();

    // Reset timer
    const resetBtn = screen.getByTestId('btn-reset-timer');
    fireEvent.click(resetBtn);
    expect(screen.getByText('70:00')).toBeInTheDocument();
  });

  it('calculates score across 4 stages with 1-tap buttons and updates bottom sticky score', () => {
    render(<IphonePracticalExamRubric />);

    // Default total is 10 + 25 + 35 + 30 = 100
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/ĐẠT KTV CHÍNH THỨC WINGS/i)).toBeInTheDocument();

    // Stage 1: Click Fail (0đ) -> Total becomes 90
    const stage1FailBtn = screen.getByTestId('btn-stage1-fail');
    fireEvent.click(stage1FailBtn);
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText(/ĐẠT TỐT NGHIỆP TAY NGHỀ/i)).toBeInTheDocument();

    // Stage 2: Click minor (15đ) -> Total becomes 80
    const stage2MinorBtn = screen.getByTestId('btn-stage2-minor');
    fireEvent.click(stage2MinorBtn);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText(/CHƯA ĐẠT CHUẨN/i)).toBeInTheDocument();

    // Reset back to perfect: Stage 1 pass (10) and Stage 2 perfect (25) -> Total 100
    fireEvent.click(screen.getByTestId('btn-stage1-pass'));
    fireEvent.click(screen.getByTestId('btn-stage2-perfect'));
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('allows CEO Danny to sign and approve certificate directly from iPhone view', () => {
    const handleApprove = vi.fn();
    render(<IphonePracticalExamRubric onApproveCert={handleApprove} />);

    // Click sign button on bottom bar
    const signBtn = screen.getByTestId('btn-iphone-sign-cert');
    fireEvent.click(signBtn);

    // Modal opens
    expect(screen.getByText('Xác Nhận Ký Duyệt Chuyên Môn')).toBeInTheDocument();
    expect(screen.getByText('WINGS-DL-2026-004-GH')).toBeInTheDocument();

    // Confirm sign
    const confirmBtn = screen.getByTestId('btn-confirm-sign');
    fireEvent.click(confirmBtn);

    expect(handleApprove).toHaveBeenCalledWith(100, expect.any(String));
    expect(screen.getByText(/ĐÃ CẤP CHỨNG CHỈ mOS/i)).toBeInTheDocument();
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden word "thợ")', () => {
    const { container } = render(<IphonePracticalExamRubric />);
    const text = container.textContent || '';
    expect(text).not.toMatch(/\bthợ\b/i);
    expect(text).not.toMatch(/thợ mi/i);
  });
});
