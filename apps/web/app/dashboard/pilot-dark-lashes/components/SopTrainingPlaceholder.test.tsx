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
      screen.getByText(/Quy Trình Chuẩn \(SOP\) & Khung Đào Tạo Chuyên Viên Kỹ Thuật/i)
    ).toBeInTheDocument();
  });

  it('renders all 5 core training modules with titles', () => {
    render(<SopTrainingPlaceholder />);

    expect(screen.getByText('Tiêu chuẩn đánh giá & Phân loại dáng mi')).toBeInTheDocument();
    expect(screen.getByText('SOP kỹ thuật 7 bước uốn mi bóng tối')).toBeInTheDocument();
    expect(screen.getByText('Định mức & Bảo quản vật tư tiêu hao')).toBeInTheDocument();
    expect(screen.getByText('Giao tiếp & Tư vấn chăm sóc sau uốn (Aftercare)')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra tay nghề & Đánh giá năng lực KTV')).toBeInTheDocument();

    expect(screen.getByText('Hạng mục 01')).toBeInTheDocument();
    expect(screen.getByText('Hạng mục 05')).toBeInTheDocument();
  });

  it('triggers preview callbacks when action buttons are clicked', () => {
    const handleOpenSop = vi.fn();
    const handleOpenCriteria = vi.fn();

    render(
      <SopTrainingPlaceholder onOpenSopModal={handleOpenSop} onOpenCriteriaModal={handleOpenCriteria} />
    );

    const criteriaBtn = screen.getByRole('button', { name: /Tiêu chí mi/i });
    fireEvent.click(criteriaBtn);
    expect(handleOpenCriteria).toHaveBeenCalledTimes(1);

    const sopBtn = screen.getByRole('button', { name: /^SOP 7 bước$/i });
    fireEvent.click(sopBtn);
    expect(handleOpenSop).toHaveBeenCalledTimes(1);
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

  it('triggers onViewSopDetail callback when clicking detail button for Module 2', () => {
    const handleViewDetail = vi.fn();
    render(<SopTrainingPlaceholder onViewSopDetail={handleViewDetail} />);

    const detailBannerBtn = screen.getByRole('button', { name: /Chi tiết Hạng mục 2/i });
    fireEvent.click(detailBannerBtn);
    expect(handleViewDetail).toHaveBeenCalledTimes(1);

    const cardDetailBtn = screen.getByTestId('view-technical-sop-btn');
    fireEvent.click(cardDetailBtn);
    expect(handleViewDetail).toHaveBeenCalledTimes(2);
  });
});
