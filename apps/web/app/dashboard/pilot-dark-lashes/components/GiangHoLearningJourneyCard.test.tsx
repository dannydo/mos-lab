import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GiangHoLearningJourneyCard, GIANG_HO_PRACTICE_SESSIONS } from './GiangHoLearningJourneyCard';

describe('GiangHoLearningJourneyCard', () => {
  it('renders learner profile, master trainer and examiner information', () => {
    render(<GiangHoLearningJourneyCard />);

    expect(screen.getByTestId('giang-ho-learning-journey-card')).toBeInTheDocument();
    expect(screen.getByText('Chuyên Viên Giang Hồ')).toBeInTheDocument();
    expect(screen.getByText(/Học Viên Uốn Mi Wings Academy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cô Giang Đàm/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CEO Danny Đỗ/i).length).toBeGreaterThan(0);
  });

  it('renders all 5 practice sessions including 4 preparation days and exam day', () => {
    render(<GiangHoLearningJourneyCard />);

    expect(GIANG_HO_PRACTICE_SESSIONS).toHaveLength(5);
    expect(screen.getByText('26/10/2026')).toBeInTheDocument();
    expect(screen.getByText('28/10/2026')).toBeInTheDocument();
    expect(screen.getByText('29/10/2026')).toBeInTheDocument();
    expect(screen.getByText('30/10/2026')).toBeInTheDocument();
    expect(screen.getByText('31/10/2026')).toBeInTheDocument();

    // Verify error reduction from 3 errors to 0 errors
    expect(screen.getByText('3 lỗi')).toBeInTheDocument();
    expect(screen.getByText('2 lỗi')).toBeInTheDocument();
    expect(screen.getByText('1 lỗi')).toBeInTheDocument();
    expect(screen.getAllByText(/0 lỗi/i).length).toBeGreaterThan(0);

    // Verify time reduction from 75 to 64 minutes
    expect(screen.getByText('75\'')).toBeInTheDocument();
    expect(screen.getByText('64\'')).toBeInTheDocument();
  });

  it('triggers quick action buttons to open exam rubric and theory quiz', () => {
    const handleRubric = vi.fn();
    const handleTheory = vi.fn();
    render(
      <GiangHoLearningJourneyCard
        onOpenExamRubric={handleRubric}
        onOpenTheoryQuiz={handleTheory}
      />
    );

    const rubricBtn = screen.getByTestId('btn-open-iphone-rubric-quick');
    fireEvent.click(rubricBtn);
    expect(handleRubric).toHaveBeenCalledTimes(1);

    const theoryBtn = screen.getByTestId('btn-open-theory-quiz-quick');
    fireEvent.click(theoryBtn);
    expect(handleTheory).toHaveBeenCalledTimes(1);
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden word "thợ")', () => {
    const { container } = render(<GiangHoLearningJourneyCard />);
    const text = container.textContent || '';
    expect(text).not.toMatch(/\bthợ\b/i);
    expect(text).not.toMatch(/thợ mi/i);
    expect(text).not.toMatch(/tay nghề thợ/i);
  });
});
