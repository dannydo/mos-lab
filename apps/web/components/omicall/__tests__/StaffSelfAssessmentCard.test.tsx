import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffSelfAssessmentCard } from '../StaffSelfAssessmentCard';

const { submitSelfAssessmentMock, submitSelfAssessmentIntentMock } = vi.hoisted(() => ({
  submitSelfAssessmentMock: vi.fn(),
  submitSelfAssessmentIntentMock: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    omicall: {
      submitSelfAssessment: submitSelfAssessmentMock,
      submitSelfAssessmentIntent: submitSelfAssessmentIntentMock,
    },
  },
}));

describe('StaffSelfAssessmentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders blind-lock prompt when unrated, submits rating + note, and triggers onSubmitted', async () => {
    const onSubmitted = vi.fn();
    submitSelfAssessmentMock.mockResolvedValueOnce({
      success: true,
      log: {
        id: 754,
        staffSelfSatisfactionScore: 4,
        staffSelfNote: 'Khách hỏi kỹ bảng giá',
        customerSatisfactionScore: 5,
        staffAiCoachingFeedback: '• Độ khớp cao: Bạn tự đánh giá 4/5 sao.',
        aiLockedUntilSelfRated: false,
      },
    });

    render(
      <StaffSelfAssessmentCard
        logId={754}
        callUuid="uuid-754"
        phone="0989062401"
        aiLockedUntilSelfRated={true}
        isDark={true}
        onSubmitted={onSubmitted}
      />
    );

    expect(screen.getByText(/Tự đánh giá trước để mở khóa kết quả AI/)).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[3]);

    const noteInput = screen.getByPlaceholderText(/Cảm nhận nhanh của bạn/);
    fireEvent.change(noteInput, { target: { value: 'Khách hỏi kỹ bảng giá' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi & Mở khóa AI Coaching/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSelfAssessmentMock).toHaveBeenCalledWith(754, {
        score: 4,
        note: 'Khách hỏi kỹ bảng giá',
      });
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onSubmitted.mock.calls[0][0].aiLockedUntilSelfRated).toBe(false);
  });

  it('renders locked summary, mismatch badge, and AI Coaching feedback when already rated', () => {
    render(
      <StaffSelfAssessmentCard
        logId={755}
        staffSelfSatisfactionScore={5}
        staffSelfNote="Thấy khách khá vui"
        customerSatisfactionScore={2}
        staffAiCoachingFeedback="• Lưu ý chênh lệch góc nhìn: Bạn chấm 5/5 sao nhưng AI ghi nhận 2/5 sao."
        analysisStatus="DONE"
        isDark={false}
      />
    );

    expect(screen.getByText(/Nhân viên tự đánh giá: 5\/5/)).toBeInTheDocument();
    expect(screen.getByText('Đã khóa điểm')).toBeInTheDocument();
    expect(screen.getByText(/Lệch 3★ với AI/)).toBeInTheDocument();
    expect(screen.getByText(/Nhận xét AI Coaching đối chiếu/)).toBeInTheDocument();
    expect(screen.getByText(/Lưu ý chênh lệch góc nhìn/)).toBeInTheDocument();
  });
});
