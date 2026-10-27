import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SopTrainingPlaceholder } from './SopTrainingPlaceholder';

describe('SopTrainingPlaceholder', () => {
  it('renders the placeholder container and banner correctly', () => {
    render(<SopTrainingPlaceholder />);

    expect(screen.getByTestId('sop-training-placeholder')).toBeInTheDocument();
    expect(screen.getByText('SOP & Đào tạo KTV')).toBeInTheDocument();
    expect(
      screen.getByText('Khung Đào Tạo & Chuẩn Hóa Tay Nghề Chuyên Viên Kỹ Thuật')
    ).toBeInTheDocument();
  });

  it('renders all 5 core training modules with titles', () => {
    render(<SopTrainingPlaceholder />);

    expect(screen.getByText('Tiêu chuẩn đánh giá & Phân loại dáng mi')).toBeInTheDocument();
    expect(screen.getByText('Quy trình kỹ thuật 7 bước uốn mi bóng tối')).toBeInTheDocument();
    expect(screen.getByText('Định mức & Kiểm soát vật tư tiêu hao')).toBeInTheDocument();
    expect(screen.getByText('Quản trị an toàn, rủi ro & Kỹ thuật xử lý sự cố')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá tay nghề, thẩm định CSAT & Chứng chỉ vận hành')).toBeInTheDocument();

    expect(screen.getByText('Hạng mục 1')).toBeInTheDocument();
    expect(screen.getByText('Hạng mục 5')).toBeInTheDocument();
  });

  it('triggers preview callbacks when action buttons are clicked', () => {
    const handleOpenSop = vi.fn();
    const handleOpenCriteria = vi.fn();

    render(
      <SopTrainingPlaceholder onOpenSopModal={handleOpenSop} onOpenCriteriaModal={handleOpenCriteria} />
    );

    const sopBtn = screen.getByRole('button', { name: /Xem trước SOP 7 bước/i });
    fireEvent.click(sopBtn);
    expect(handleOpenSop).toHaveBeenCalledTimes(1);

    const criteriaBtn = screen.getByRole('button', { name: /Xem tiêu chí mi/i });
    fireEvent.click(criteriaBtn);
    expect(handleOpenCriteria).toHaveBeenCalledTimes(1);
  });

  it('navigates to Hạng mục 1 SOP Detail when clicking "Xem chi tiết SOP" or card and navigates back', () => {
    render(<SopTrainingPlaceholder />);

    // Click "Xem chi tiết SOP" button on Hạng mục 1
    const viewDetailBtn = screen.getByTestId('view-criteria-sop-btn');
    fireEvent.click(viewDetailBtn);

    // Should now show PilotCriteriaSopDetail
    expect(screen.getByTestId('pilot-criteria-sop-detail')).toBeInTheDocument();
    expect(
      screen.getByText('SOP Đánh Giá & Phân Loại Dáng Mi Trước Dịch Vụ')
    ).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByTestId('sop-detail-back-button');
    fireEvent.click(backBtn);

    // Should return to overview
    expect(screen.getByTestId('sop-training-placeholder')).toBeInTheDocument();
  });

  it('navigates to Hạng mục 5 SOP Detail when clicking "Xem chi tiết SOP" or card and navigates back', () => {
    render(<SopTrainingPlaceholder />);

    // Click "Xem chi tiết SOP" button on Hạng mục 5
    const viewAssessmentBtn = screen.getByTestId('view-assessment-sop-btn');
    fireEvent.click(viewAssessmentBtn);

    // Should now show PilotAssessmentCertSopDetail
    expect(screen.getByTestId('pilot-assessment-sop-detail')).toBeInTheDocument();
    expect(
      screen.getByText('Sát Hạch Năng Lực Chuyên Môn, Thẩm Định CSAT & Cấp Chứng Chỉ Vận Hành')
    ).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByTestId('sop-assessment-back-button');
    fireEvent.click(backBtn);

    // Should return to overview
    expect(screen.getByTestId('sop-training-placeholder')).toBeInTheDocument();
  });
});
