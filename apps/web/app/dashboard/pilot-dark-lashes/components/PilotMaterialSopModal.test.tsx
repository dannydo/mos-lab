import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PilotMaterialSopModal } from './PilotMaterialSopModal';
import { apiClient } from '../../../../lib/api-client';

const mockDoc = {
  pilotCode: 'DARK_LASHES',
  overallStatus: 'DRAFT',
  isPublished: false,
  expertReviewer: 'Cô Giang Đàm',
  projectOwner: 'Danny Do',
  approvalNote: 'Bản dự thảo SOP Hạng mục 3 chờ Cô Giang Đàm thẩm định.',
  reviewedAt: null,
  approvedAt: null,
  updatedAt: '2026-10-27T10:00:00.000Z',
  solutionNorms: [
    {
      id: 'norm-solution-1',
      materialId: 1,
      materialName: 'Thuốc số 1 (Perming Cream)',
      unit: 'ml',
      costPerUnit: 30000,
      standardDosagePerSession: 0.8,
      costPerSession: 24000,
      usageInstructions: 'Ủ mềm nang mi 10-15 phút.',
      technicalNotes: 'Kiểm tra độ giãn nở sau 8 phút.',
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
  ],
  glueRodStandards: [
    {
      id: 'std-rod-c',
      category: 'SILICON_ROD',
      title: 'Trục Silicon Form C',
      materialRef: 'Trục Form C',
      selectionCriteria: 'Phù hợp mắt tròn.',
      standardOperation: 'Đặt cách chân mi 0.5mm.',
      technicalNotes: 'Vệ sinh vô trùng trước khi đặt.',
      commonMistakesToAvoid: 'Tránh đặt đè bờ mi.',
      illustrationImageUrl: null,
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
  ],
  sanitizationProcedures: [
    {
      id: 'sanit-1',
      toolName: 'Trục silicon y tế',
      classification: 'REUSABLE',
      procedure: 'Ngâm cồn 70 độ 15 phút, tiệt trùng UV 20 phút.',
      criticalSafetyPoint: 'Kiểm tra bề mặt không rách.',
      checklistSteps: ['Ngâm cồn 70°', 'Tiệt trùng UV'],
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'sanit-2',
      toolName: 'Eye Pad mi dưới',
      classification: 'DISPOSABLE',
      procedure: 'Vật tư dùng 1 lần, hủy ngay sau ca.',
      criticalSafetyPoint: 'Cấm tái sử dụng.',
      checklistSteps: ['Bóc seal', 'Hủy sau ca'],
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
  ],
  summary: {
    totalNormCostPerSession: 24000,
    totalItemsCount: 4,
    pendingReviewCount: 4,
    verifiedCount: 0,
  },
};

describe('PilotMaterialSopModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient.pilot, 'getMaterialSop').mockResolvedValue(mockDoc as any);
    vi.spyOn(apiClient.pilot, 'saveMaterialSop').mockResolvedValue(mockDoc as any);
    vi.spyOn(apiClient.pilot, 'reviewMaterialSop').mockResolvedValue({
      ...mockDoc,
      overallStatus: 'REVIEWED_BY_EXPERT',
      summary: { ...mockDoc.summary, verifiedCount: 4, pendingReviewCount: 0 },
    } as any);
  });

  it('renders modal with title, tabs, and solution norms list', async () => {
    render(<PilotMaterialSopModal open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Hạng Mục 3 – Định Mức & Kiểm Soát Vật Tư Tiêu Hao/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Phần 1 – Định Mức Thuốc & Dung Dịch')).toBeInTheDocument();
    expect(screen.getByText('Phần 2 – Quy Chuẩn Keo & Trục Silicon')).toBeInTheDocument();
    expect(screen.getByText('Phần 3 – Khử Khuẩn & Vệ Sinh Dụng Cụ')).toBeInTheDocument();
    expect(screen.getByText('Bản Dự Thảo Trình CEO & Thẩm Định')).toBeInTheDocument();

    expect(screen.getByText('Thuốc số 1 (Perming Cream)')).toBeInTheDocument();
    expect(screen.getByText('0.8 ml')).toBeInTheDocument();
    expect(screen.getAllByText(/24.000/).length).toBeGreaterThan(0);
  });

  it('switches to Part 2 (Quy chuẩn Keo & Trục) tab and displays cards', async () => {
    render(<PilotMaterialSopModal open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('sop-tab-glue-rods')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sop-tab-glue-rods'));

    await waitFor(() => {
      expect(screen.getByText('Trục Silicon Form C')).toBeInTheDocument();
      expect(screen.getByText(/Phù hợp mắt tròn/i)).toBeInTheDocument();
      expect(screen.getByText(/Đặt cách chân mi 0.5mm/i)).toBeInTheDocument();
    });
  });

  it('switches to Part 3 (Khử khuẩn & Vệ sinh) tab and displays REUSABLE & DISPOSABLE classification', async () => {
    render(<PilotMaterialSopModal open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('sop-tab-sanitization')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sop-tab-sanitization'));

    await waitFor(() => {
      expect(screen.getByText('Trục silicon y tế')).toBeInTheDocument();
      expect(screen.getByText('Eye Pad mi dưới')).toBeInTheDocument();
      expect(screen.getAllByText(/Dụng cụ tái sử dụng/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Vật tư dùng 1 lần/i).length).toBeGreaterThan(0);
    });
  });

  it('switches to Draft Review tab and triggers endorsement modal', async () => {
    render(<PilotMaterialSopModal open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('sop-tab-draft')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sop-tab-draft'));

    await waitFor(() => {
      expect(screen.getByText(/BẢN DỰ THẢO ĐỊNH MỨC/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Cô Giang Đàm/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Không tự ý ban hành khi chưa duyệt/i)).toBeInTheDocument();
    });
  });
});
