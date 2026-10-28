import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SopPreparationTabContent } from './SopPreparationTabContent';

describe('SopPreparationTabContent', () => {
  it('renders the SOP Preparation tab header, badge, and description', () => {
    render(<SopPreparationTabContent />);

    expect(screen.getByText('SOP Preparation – Chuẩn bị SOP')).toBeInTheDocument();
    expect(screen.getByText(/Giai đoạn 1 · Khởi tạo danh mục/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Chức năng phục vụ thu thập, kiểm chứng dữ liệu chuyên môn thực tế/i)
    ).toBeInTheDocument();
  });

  it('renders Hạng mục 1 with exact title, objective, owner Cô Giang Phạm, and initial status', () => {
    render(<SopPreparationTabContent />);

    expect(screen.getByTestId('sop-prep-category-1-title')).toHaveTextContent(
      'Hạng mục 1 – Kiểm tra & Đánh giá tình trạng mi thật'
    );

    expect(screen.getByTestId('sop-prep-category-1-objective')).toHaveTextContent(
      'Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.'
    );

    expect(screen.getByTestId('sop-prep-category-1-owner')).toHaveTextContent('Cô Giang Phạm');

    expect(screen.getByTestId('sop-prep-category-1-status')).toHaveTextContent('Chưa thu thập dữ liệu');
  });

  it('provides an access area "Chi tiết Hạng mục 1" button that opens detail modal', () => {
    render(<SopPreparationTabContent />);

    const detailBtn = screen.getByTestId('sop-prep-category-1-detail-btn');
    expect(detailBtn).toBeInTheDocument();
    expect(detailBtn).toHaveTextContent('Chi tiết Hạng mục 1');

    fireEvent.click(detailBtn);

    expect(
      screen.getByText(/Khu vực này đã được định vị và liên kết để phát triển chức năng biểu mẫu nhập liệu/i)
    ).toBeInTheDocument();
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden word "thợ")', () => {
    const { container } = render(<SopPreparationTabContent />);
    const textContent = container.textContent || '';
    expect(textContent.toLowerCase()).not.toMatch(/\bthợ\b/);
  });
});
