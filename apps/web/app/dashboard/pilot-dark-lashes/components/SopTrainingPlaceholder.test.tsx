import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SopTrainingPlaceholder } from './SopTrainingPlaceholder';

describe('SopTrainingPlaceholder', () => {
  it('renders the placeholder container and banner correctly', () => {
    render(<SopTrainingPlaceholder />);

    expect(screen.getByTestId('sop-training-placeholder')).toBeInTheDocument();
    expect(screen.getByText('SOP & Đào tạo KTV')).toBeInTheDocument();
    expect(screen.getByText('Khung Đào Tạo & Chuẩn Hóa Tay Nghề Chuyên Viên Kỹ Thuật')).toBeInTheDocument();
    expect(
      screen.getByText(/Khu vực SOP & Đào tạo KTV đang được phát triển/i, { selector: 'p' })
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
    const handleOpenMaterials = vi.fn();

    render(
      <SopTrainingPlaceholder
        onOpenSopModal={handleOpenSop}
        onOpenCriteriaModal={handleOpenCriteria}
        onOpenMaterialsSop={handleOpenMaterials}
      />
    );

    const sopBtn = screen.getByRole('button', { name: /Xem trước SOP 7 bước/i });
    fireEvent.click(sopBtn);
    expect(handleOpenSop).toHaveBeenCalledTimes(1);

    const criteriaBtn = screen.getByRole('button', { name: /Xem tiêu chí mi/i });
    fireEvent.click(criteriaBtn);
    expect(handleOpenCriteria).toHaveBeenCalledTimes(1);

    const materialsHeaderBtn = screen.getByRole('button', { name: /Hạng mục 3: Định mức vật tư/i });
    fireEvent.click(materialsHeaderBtn);
    expect(handleOpenMaterials).toHaveBeenCalledTimes(1);

    const materialsCardBtn = screen.getByRole('button', { name: /Mở chi tiết & Nhập liệu SOP/i });
    fireEvent.click(materialsCardBtn);
    expect(handleOpenMaterials).toHaveBeenCalledTimes(2);
  });
});
