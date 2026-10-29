import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SopPreparationTabContent } from './SopPreparationTabContent';

// Mock apiClient to prevent network calls during testing
vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    pilot: {
      getSopPreparationCategory1: vi.fn().mockResolvedValue({
        categoryNumber: 1,
        categoryTitle: 'Hạng mục 1 – Kiểm tra & Đánh giá tình trạng mi thật',
        objective:
          'Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.',
        owner: 'Cô Giang Phạm',
        status: 'COLLECTING',
        statusLabel: 'Bản nháp – Chưa kiểm chứng',
        lastUpdatedBy: 'Cô Giang Phạm',
        lastUpdatedAt: '2026-10-28T09:00:00.000Z',
        criteria: [
          {
            id: 1,
            criterionKey: 'length',
            name: 'Độ dài mi',
            order: 1,
            expertiseKnowledge: 'Chiều dài sợi mi quyết định trực tiếp diện tích tiếp xúc...',
            practicalMethod: 'Đặt cữ thước đo mi chuyên dụng vuông góc...',
            evaluationGrounds: 'ĐẠT (PASS): Chiều dài mi đo được ≥ 8.0mm...',
            status: 'DRAFT_UNVERIFIED',
            statusLabel: 'Bản nháp – Chưa kiểm chứng',
            updatedBy: 'Cô Giang Phạm',
            updatedAt: '2026-10-28T09:00:00.000Z',
            evidenceFiles: [
              {
                id: 'ev-length-01',
                name: 'minh-chung-do-dai-mi-pilot-01.jpg',
                url: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
                fileType: 'image',
                mimeType: 'image/jpeg',
                sizeBytes: 245120,
                description: 'Ảnh thước đo mi hiển thị sợi mi khách hàng đạt 9.5mm.',
                sourceOrigin: 'Ca Pilot thực tế',
                pilotSessionCode: 'PILOT-001',
                uploadedBy: 'Cô Giang Phạm',
                uploadedAt: '2026-10-28T09:15:00.000Z',
              },
            ],
          },
          {
            id: 2,
            criterionKey: 'thickness',
            name: 'Độ dày sợi mi',
            order: 2,
            expertiseKnowledge: 'Độ dày sợi mi phản ánh mật độ keratin bó sợi...',
            practicalMethod: 'Soi cấu trúc sợi mi dưới kính lúp chuyên dụng...',
            evaluationGrounds: 'ĐẠT (PASS): Sợi mi có đường kính từ 0.07mm trở lên...',
            status: 'DRAFT_UNVERIFIED',
            statusLabel: 'Bản nháp – Chưa kiểm chứng',
            updatedBy: 'Cô Giang Phạm',
            updatedAt: '2026-10-28T09:00:00.000Z',
            evidenceFiles: [],
          },
          {
            id: 3,
            criterionKey: 'density',
            name: 'Mật độ mi',
            order: 3,
            expertiseKnowledge: 'Mật độ mi là tổng số lượng sợi mi phân bổ...',
            practicalMethod: 'Dùng cọ chải mi tơi xốp...',
            evaluationGrounds: 'ĐẠT (PASS): Mật độ phân bổ tương đối đồng đều...',
            status: 'DRAFT_UNVERIFIED',
            statusLabel: 'Bản nháp – Chưa kiểm chứng',
            updatedBy: 'Cô Giang Phạm',
            updatedAt: '2026-10-28T09:00:00.000Z',
            evidenceFiles: [],
          },
          {
            id: 4,
            criterionKey: 'condition',
            name: 'Tình trạng sợi mi',
            order: 4,
            expertiseKnowledge: 'Tình trạng sợi mi thể hiện sức khỏe sinh học...',
            practicalMethod: 'Quan sát ngọn mi dưới đèn kính lúp...',
            evaluationGrounds: 'ĐẠT (PASS): Thân mi nguyên bản khỏe mạnh...',
            status: 'DRAFT_UNVERIFIED',
            statusLabel: 'Bản nháp – Chưa kiểm chứng',
            updatedBy: 'Cô Giang Phạm',
            updatedAt: '2026-10-28T09:00:00.000Z',
            evidenceFiles: [],
          },
          {
            id: 5,
            criterionKey: 'form_capability',
            name: 'Khả năng tạo form',
            order: 5,
            expertiseKnowledge: 'Khả năng tạo form là độ đàn hồi và sức căng...',
            practicalMethod: 'Dùng que gạt gạt nhẹ một nhóm sợi mi...',
            evaluationGrounds: 'ĐẠT (PASS): Sợi mi có độ đàn hồi cao...',
            status: 'DRAFT_UNVERIFIED',
            statusLabel: 'Bản nháp – Chưa kiểm chứng',
            updatedBy: 'Cô Giang Phạm',
            updatedAt: '2026-10-28T09:00:00.000Z',
            evidenceFiles: [],
          },
        ],
      }),
      saveSopPreparationCategory1: vi.fn().mockResolvedValue({ success: true }),
      saveSopPreparationCriterion: vi.fn().mockResolvedValue({ success: true }),
      uploadSopPrepEvidence: vi.fn().mockResolvedValue({
        id: 'ev-new-01',
        name: 'test-evidence.png',
        url: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
        fileType: 'image',
        mimeType: 'image/png',
        sizeBytes: 102400,
        description: 'Ảnh test upload',
        sourceOrigin: 'Ca Pilot thực tế',
        uploadedBy: 'Cô Giang Phạm',
        uploadedAt: '2026-10-28T09:30:00.000Z',
      }),
      deleteSopPrepEvidence: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

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

  it('provides an access area "Chi tiết Hạng mục 1" button that opens detail modal with workspace action', () => {
    render(<SopPreparationTabContent />);

    const detailBtn = screen.getByTestId('sop-prep-category-1-detail-btn');
    expect(detailBtn).toBeInTheDocument();
    expect(detailBtn).toHaveTextContent('Chi tiết Hạng mục 1');

    fireEvent.click(detailBtn);

    expect(
      screen.getByText(/Khu vực này đã được định vị và liên kết để phát triển chức năng biểu mẫu nhập liệu/i)
    ).toBeInTheDocument();

    const openWorkspaceBtn = screen.getByTestId('open-workspace-from-modal');
    expect(openWorkspaceBtn).toBeInTheDocument();
  });

  it('opens 5-criteria editing workspace and allows navigating between 5 criteria (MOS-FEAT-176)', async () => {
    render(<SopPreparationTabContent />);

    const workspaceBtn = screen.getByTestId('sop-prep-open-workspace-btn');
    expect(workspaceBtn).toBeInTheDocument();
    expect(workspaceBtn).toHaveTextContent(/Nhập liệu & Minh chứng 5 tiêu chí/i);

    fireEvent.click(workspaceBtn);

    // Detail view is now displayed
    expect(screen.getByTestId('sop-prep-detail-view')).toBeInTheDocument();
    expect(screen.getByText(/Bản nháp – Chưa kiểm chứng/i)).toBeInTheDocument();
    expect(screen.getByText(/Không có AI can thiệp/i)).toBeInTheDocument();

    // Verify all 5 criteria tabs exist
    expect(screen.getByTestId('sop-prep-criterion-tab-1')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-criterion-tab-2')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-criterion-tab-3')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-criterion-tab-4')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-criterion-tab-5')).toBeInTheDocument();

    // Wait for data load and verify fields for Tiêu chí 1 (Độ dài mi)
    await waitFor(() => {
      expect(screen.getByTestId('sop-prep-field-knowledge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('sop-prep-field-practical')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-field-grounds')).toBeInTheDocument();

    // Evidence file item is rendered for Criterion 1
    await waitFor(() => {
      expect(screen.getByText(/minh-chung-do-dai-mi-pilot-01.jpg/i)).toBeInTheDocument();
    });

    // Switch to Tiêu chí 2 (Độ dày sợi mi)
    const tab2 = screen.getByTestId('sop-prep-criterion-tab-2');
    fireEvent.click(tab2);

    expect(screen.getByText(/Tiêu chí 2: Độ dày sợi mi/i)).toBeInTheDocument();

    // Back button returns to overview
    const backBtn = screen.getByTestId('sop-prep-back-btn');
    fireEvent.click(backBtn);

    expect(screen.getByTestId('sop-prep-category-1')).toBeInTheDocument();
  });

  it('allows saving criterion draft and uploading evidence in the workspace (MOS-FEAT-176)', async () => {
    render(<SopPreparationTabContent />);

    fireEvent.click(screen.getByTestId('sop-prep-open-workspace-btn'));

    // Wait for workspace to finish loading
    await waitFor(() => {
      expect(screen.getByTestId('sop-prep-field-knowledge')).toBeInTheDocument();
    });

    // Edit knowledge field
    const knowledgeField = screen.getByTestId('sop-prep-field-knowledge');
    fireEvent.change(knowledgeField, {
      target: { value: 'Nghiên cứu chuyên môn mới về chu kỳ sinh trưởng sợi mi.' },
    });

    // Save criterion draft
    const saveBtn = screen.getByTestId('sop-prep-save-criterion-btn');
    fireEvent.click(saveBtn);

    // Save all button exists and works
    const saveAllBtn = screen.getByTestId('sop-prep-save-all-btn');
    fireEvent.click(saveAllBtn);

    // Verify upload controls exist
    expect(screen.getByTestId('sop-prep-upload-desc-input')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-upload-session-input')).toBeInTheDocument();
    expect(screen.getByTestId('sop-prep-upload-submit-btn')).toBeInTheDocument();
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden word "thợ")', () => {
    const { container } = render(<SopPreparationTabContent />);
    const textContent = container.textContent || '';
    expect(textContent.toLowerCase()).not.toMatch(/\bthợ\b/);
  });
});
