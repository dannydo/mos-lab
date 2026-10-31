import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PilotAssessmentCertSopDetail } from './PilotAssessmentCertSopDetail';
import type { PilotSession } from '@mos-lab/shared';

const MOCK_SESSIONS: PilotSession[] = [
  {
    id: 18,
    pilotCode: 'DL-PILOT-018',
    branchCode: 'Q1',
    customerName: 'Khách Nguyệt',
    customerPhone: '0903123782',
    sessionDate: '2026-10-27',
    bookingTime: '10:00',
    bookingNote: null,
    technicianName: 'Chuyên Viên Cẩm Tiên',
    status: 'FEEDBACK_DONE',
    checkInAt: '2026-10-27T03:00:00.000Z',
    beforePhotoUrl: '/uploads/before-18.jpg',
    serviceDoneAt: '2026-10-27T04:15:00.000Z',
    afterPhotoUrl: '/uploads/after-18.jpg',
    feedbackRating: 5,
    feedbackNote: 'Mi uốn xong cong mềm tự nhiên lắm em ơi, mắt không bị cộm hay cay chút nào.',
    checkOutAt: '2026-10-27T04:30:00.000Z',
    totalDurationMinutes: 75,
    revenue: 450000,
    materialCost: 45000,
    technicianCost: 100000,
    commissionAmount: 50000,
    promoAmount: 0,
    refundAmount: 0,
    totalDirectCost: 145000,
    contributionMargin: 305000,
    followUp24hStatus: 'DONE',
    followUp72hStatus: 'DONE',
    csatScore: 5,
    issues: null,
    notes: 'Mi đạt C-curl chuẩn',
    source: 'HOTLINE',
    createdByStaffId: 1,
    createdAt: '2026-10-27T02:00:00.000Z',
    updatedAt: '2026-10-27T04:35:00.000Z',
  },
  {
    id: 15,
    pilotCode: 'DL-PILOT-015',
    branchCode: 'BT',
    customerName: 'Khách Thanh Tâm',
    customerPhone: '0918999445',
    sessionDate: '2026-10-25',
    bookingTime: '14:00',
    bookingNote: null,
    technicianName: 'Chuyên Viên Như Ý',
    status: 'FEEDBACK_DONE',
    checkInAt: '2026-10-25T07:00:00.000Z',
    beforePhotoUrl: null,
    serviceDoneAt: '2026-10-25T08:10:00.000Z',
    afterPhotoUrl: null,
    feedbackRating: 5,
    feedbackNote: 'Dịch vụ rất chu đáo. Chuyên Viên dặn kiêng nước 4 tiếng rất kỹ.',
    checkOutAt: '2026-10-25T08:20:00.000Z',
    totalDurationMinutes: 70,
    revenue: 450000,
    materialCost: 42000,
    technicianCost: 100000,
    commissionAmount: 50000,
    promoAmount: 0,
    refundAmount: 0,
    totalDirectCost: 142000,
    contributionMargin: 308000,
    followUp24hStatus: 'DONE',
    followUp72hStatus: 'DONE',
    csatScore: 5,
    issues: null,
    notes: null,
    source: 'APP',
    createdByStaffId: 1,
    createdAt: '2026-10-25T06:00:00.000Z',
    updatedAt: '2026-10-25T08:25:00.000Z',
  },
];

describe('PilotAssessmentCertSopDetail', () => {
  it('renders the main header, 2-round control principle and 3 main tabs', () => {
    const handleBack = vi.fn();
    render(<PilotAssessmentCertSopDetail onBack={handleBack} sessions={MOCK_SESSIONS} />);

    expect(screen.getByTestId('pilot-assessment-sop-detail')).toBeInTheDocument();
    expect(
      screen.getByText('Sát Hạch Năng Lực Chuyên Môn, Thẩm Định CSAT & Cấp Chứng Chỉ Vận Hành')
    ).toBeInTheDocument();

    // Check 2-round governance principle
    expect(
      screen.getByText(/Nguyên Tắc Bắt Buộc: Kiểm Soát Độc Lập 2 Vòng Giữa Đào Tạo & Sát Hạch/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Cô Giang Đàm/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CEO Danny Đỗ/i).length).toBeGreaterThan(0);

    // Check 3 navigation tabs
    expect(screen.getByTestId('tab-btn-exam')).toBeInTheDocument();
    expect(screen.getByTestId('tab-btn-csat')).toBeInTheDocument();
    expect(screen.getByTestId('tab-btn-cert')).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByTestId('sop-assessment-back-button');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders exam management tab with theory structure, 5 practical criteria and technician list', () => {
    render(<PilotAssessmentCertSopDetail sessions={MOCK_SESSIONS} />);

    // In default exam tab
    expect(screen.getByTestId('section-exam-management')).toBeInTheDocument();
    expect(screen.getByText('Cấu Trúc Đề Thi Lý Thuyết & Thực Hành')).toBeInTheDocument();
    expect(screen.getByText('5 Tiêu Chuẩn Chấm Điểm Thực Hành (CEO Danny trực tiếp chấm)')).toBeInTheDocument();

    // Elimination criterion
    expect(screen.getByText('Tiêu chí loại trực tiếp')).toBeInTheDocument();
    expect(screen.getAllByText(/An toàn giác mạc & Vệ sinh vô trùng/i).length).toBeGreaterThan(0);

    // Results table
    expect(screen.getByTestId('table-technician-exam-results')).toBeInTheDocument();
    expect(screen.getAllByText(/Chuyên Viên Cẩm Tiên/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Chuyên Viên Như Ý/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Chuyên Viên Minh Thư/i).length).toBeGreaterThan(0);
  });

  it('allows CEO Danny to select technician, adjust score and save assessment result', () => {
    render(<PilotAssessmentCertSopDetail sessions={MOCK_SESSIONS} />);

    // Select input for technician
    const selectTech = screen.getByTestId('select-technician-to-grade');
    fireEvent.change(selectTech, { target: { value: 'tech-03' } });

    // Theory score input
    const theoryInput = screen.getByTestId('input-theory-score');
    fireEvent.change(theoryInput, { target: { value: 85 } });

    // Change examiner notes
    const notesInput = screen.getByTestId('input-examiner-notes');
    fireEvent.change(notesInput, { target: { value: 'Đã tiến bộ rõ rệt ở kỹ thuật vuốt keo định hình.' } });

    // Click save button
    const saveBtn = screen.getByTestId('btn-save-exam-result');
    fireEvent.click(saveBtn);

    expect(screen.getByText('CEO Danny Lưu Kết Quả Sát Hạch')).toBeInTheDocument();
  });

  it('switches to CSAT audit tab and displays metrics benchmarked against >= 4.8 stars', () => {
    render(<PilotAssessmentCertSopDetail sessions={MOCK_SESSIONS} />);

    // Switch to CSAT tab
    const csatTabBtn = screen.getByTestId('tab-btn-csat');
    fireEvent.click(csatTabBtn);

    expect(screen.getByTestId('section-csat-audit')).toBeInTheDocument();
    expect(screen.getByText('Điểm CSAT Trung Bình')).toBeInTheDocument();
    expect(screen.getByText(/Đối chiếu mục tiêu: ≥ 4.8 sao \(ĐẠT\)/i)).toBeInTheDocument();
    expect(screen.getByText('ĐẠT CHUẨN PILOT')).toBeInTheDocument();

    // Customer reviews from pilot
    expect(screen.getByText(/Khách Nguyệt/i)).toBeInTheDocument();
    expect(screen.getByText(/Khách Thanh Tâm/i)).toBeInTheDocument();
  });

  it('switches to Certificate tab, approves pending technician and opens certificate preview modal', () => {
    render(<PilotAssessmentCertSopDetail sessions={MOCK_SESSIONS} />);

    // Switch to Certificate tab
    const certTabBtn = screen.getByTestId('tab-btn-cert');
    fireEvent.click(certTabBtn);

    expect(screen.getByTestId('section-certificate-management')).toBeInTheDocument();

    // Approve pending certificate for tech-02 (Chuyên Viên Như Ý)
    const approveBtn = screen.getByTestId('btn-approve-cert-tech-02');
    fireEvent.click(approveBtn);

    // After approval, button to preview certificate should be available
    const previewBtn = screen.getByTestId('btn-preview-cert-tech-02');
    fireEvent.click(previewBtn);

    // Modal preview certificate
    expect(screen.getByTestId('certificate-preview-container')).toBeInTheDocument();
    expect(screen.getByText('GIẤY CHỨNG NHẬN CHUYÊN MÔN')).toBeInTheDocument();
    expect(screen.getByText('DARK LASHES SPECIALIST CERTIFICATE')).toBeInTheDocument();
    expect(screen.getByText('WINGS NAILS & LASHES ACADEMY')).toBeInTheDocument();
  });

  it('renders Chuyên Viên Giang Hồ learning journey and opens iPhone rubric and theory quiz modals (MOS-BUG-182)', () => {
    render(<PilotAssessmentCertSopDetail sessions={MOCK_SESSIONS} />);

    // Giang Hồ journey card
    expect(screen.getByTestId('giang-ho-learning-journey-card')).toBeInTheDocument();
    expect(screen.getAllByText(/Chuyên Viên Giang Hồ/i).length).toBeGreaterThan(0);

    // Click to open iPhone rubric
    const openRubricBtn = screen.getByTestId('btn-open-iphone-rubric-quick');
    fireEvent.click(openRubricBtn);
    expect(screen.getByTestId('iphone-exam-rubric-view')).toBeInTheDocument();

    // Click to open theory quiz
    const openTheoryBtn = screen.getByTestId('btn-open-theory-quiz-quick');
    fireEvent.click(openTheoryBtn);
    expect(screen.getByText(/Bài Thi Lý Thuyết Kỹ Thuật Uốn Mi/i)).toBeInTheDocument();
  });
});
