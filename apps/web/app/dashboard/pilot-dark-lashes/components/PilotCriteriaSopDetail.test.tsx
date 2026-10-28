import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PilotCriteriaSopDetail } from './PilotCriteriaSopDetail';
import type { PilotSession } from '@mos-lab/shared';

const MOCK_SESSIONS: Partial<PilotSession>[] = [
  {
    id: 10,
    sessionDate: '2026-10-05',
    customerName: 'Khách Tâm',
    customerPhone: '098***',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Mi quá ngắn không lên được trục uốn để uốn. Mi bị trụi trống thưa nhiều chỗ.',
    assessmentNotes:
      'Hiện khách muốn về dưỡng mi chứ không muốn nối nữa. Dưỡng 1-2 tuần rồi khách sẽ quay lại để kiểm tra sức khỏe uốn mi tiếp',
    beforePhotoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: false },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: false },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: false },
      { criterionId: 5, name: 'Khả năng tạo form', passed: false },
    ],
  },
  {
    id: 5,
    sessionDate: '2026-09-26',
    customerName: 'Phương Thảo',
    customerPhone: '091***',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Mi ngắn dưới 8mm và mi thưa mỏng',
    assessmentNotes: 'Chuyển qua nối mi hyper có độ che phủ',
    beforePhotoUrl: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: false },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: false },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: false },
    ],
  },
  {
    id: 18,
    sessionDate: '2026-10-27',
    customerName: 'Nguyệt',
    customerPhone: '090***',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi dài 8-9mm, gốc khỏe thuốc 1 ủ 15 phút, trục cá heo R3',
    beforePhotoUrl: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
    afterPhotoUrl: '/api/pilot/media/5c3fcdfa-0d01-4ed4-81aa-e19033e1d445.jpg',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
];

describe('PilotCriteriaSopDetail', () => {
  it('renders SOP header, version and expert sign-off status badge', () => {
    render(<PilotCriteriaSopDetail />);

    expect(screen.getByTestId('pilot-criteria-sop-detail')).toBeInTheDocument();
    expect(
      screen.getByText('SOP Đánh Giá & Phân Loại Dáng Mi Trước Dịch Vụ')
    ).toBeInTheDocument();
    expect(screen.getByTestId('expert-approval-status-badge')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Chờ Cô Giang Đàm thẩm định/i).length
    ).toBeGreaterThan(0);
  });

  it('renders all 5 core criteria checklists by Cô Giang Đàm with collapsible controls', () => {
    render(<PilotCriteriaSopDetail />);

    expect(screen.getByText(/Tiêu chí 1: Độ dài mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 2: Độ dày sợi mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 3: Mật độ mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 4: Tình trạng sợi mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 5: Khả năng tạo form/i)).toBeInTheDocument();

    // Test collapse all
    const collapseAllBtn = screen.getByTestId('collapse-all-criteria-button');
    fireEvent.click(collapseAllBtn);

    // After collapsing all, detail section for Criterion 1 should not be visible
    expect(screen.queryByText('1. Mục đích kiểm tra:')).not.toBeInTheDocument();

    // Test expand all
    const expandAllBtn = screen.getByTestId('expand-all-criteria-button');
    fireEvent.click(expandAllBtn);
    expect(screen.getAllByText('1. Mục đích kiểm tra:').length).toBe(5);

    // Test individual toggle
    const crit1Header = screen.getByTestId('sop-criterion-header-1');
    fireEvent.click(crit1Header);
    expect(screen.getAllByText('1. Mục đích kiểm tra:').length).toBe(4);
  });

  it('renders 5-step presentation order within each criterion: purpose, inspection, standards, evidence, deep-dive', () => {
    render(<PilotCriteriaSopDetail />);

    // 1. Purpose
    expect(screen.getAllByText(/1. Mục đích kiểm tra:/i).length).toBeGreaterThan(0);
    // 2. Inspection method
    expect(screen.getAllByText(/2. Cách kiểm tra thực tế:/i).length).toBeGreaterThan(0);
    // 3. Standards
    expect(screen.getAllByText(/3. Tiêu chuẩn ĐẠT \/ KHÔNG ĐẠT:/i).length).toBeGreaterThan(0);
    // 4. Pilot evidence
    expect(screen.getAllByText(/4. Minh chứng thực tế từ 17 ca Pilot Đề Thám:/i).length).toBeGreaterThan(0);
    // 5. Expert notes & deep-dive toggle
    expect(screen.getAllByText(/Lưu ý chuyên môn:/i).length).toBeGreaterThan(0);
  });

  it('toggles KTV deep-dive technical specifications', () => {
    render(<PilotCriteriaSopDetail />);

    const deepDiveBtn = screen.getByTestId('toggle-deep-dive-1');
    expect(screen.queryByText(/Chiều dài 8.0 – 9.0mm: Chọn trục Silicon Size S/i)).not.toBeInTheDocument();

    fireEvent.click(deepDiveBtn);
    expect(screen.getByText(/Chiều dài 8.0 – 9.0mm: Chọn trục Silicon Size S/i)).toBeInTheDocument();
  });

  it('toggles technical glossary explaining complex terms in simple words', () => {
    render(<PilotCriteriaSopDetail />);

    expect(screen.queryByTestId('sop-glossary-section')).not.toBeInTheDocument();

    const glossaryBtn = screen.getByTestId('toggle-glossary-button');
    fireEvent.click(glossaryBtn);

    const glossarySection = screen.getByTestId('sop-glossary-section');
    expect(glossarySection).toBeInTheDocument();
    expect(within(glossarySection).getByText(/Liên kết Disulfide \(S-S\)/i)).toBeInTheDocument();
    expect(within(glossarySection).getByText(/Lớp biểu bì Keratin/i)).toBeInTheDocument();
    expect(within(glossarySection).getByText(/Trục Cá Heo R3 & Trục Silicon/i)).toBeInTheDocument();
  });

  it('renders 30-second quick decision flow for CEO and new staff', () => {
    render(<PilotCriteriaSopDetail />);

    expect(screen.getByText(/Sơ Đồ Ra Quyết Định Nhanh Trong 30 Giây/i)).toBeInTheDocument();
    expect(screen.getByText(/Quy Trình 5 Cửa Kiểm Soát PASS\/FAIL/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyên tắc vàng:/i)).toBeInTheDocument();
  });

  it('renders decision matrix for all 3 cases: PASS, FAIL technical, and Service chuyển đổi', () => {
    render(<PilotCriteriaSopDetail />);

    expect(screen.getByText('Đủ Điều Kiện Uốn Mi Bóng Tối')).toBeInTheDocument();
    expect(screen.getByText('Mi Quá Ngắn / Trụi Trống / Hư Tổn')).toBeInTheDocument();
    expect(screen.getByText('Nhu Cầu Khác Hoặc Cần Độ Che Phủ')).toBeInTheDocument();
  });

  it('displays Case Study #10 as prominent FAIL example with reasons and action notes', () => {
    render(<PilotCriteriaSopDetail sessions={MOCK_SESSIONS as PilotSession[]} />);

    expect(screen.getByText('Điển hình FAIL Case Study')).toBeInTheDocument();
    expect(screen.getAllByText('Khách Tâm').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Mi quá ngắn không lên được trục uốn để uốn/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Hiện khách muốn về dưỡng mi chứ không muốn nối nữa/i)
    ).toBeInTheDocument();
  });

  it('filters evidence cases by ALL, FAIL, PASS, and HAS_PHOTO', () => {
    render(<PilotCriteriaSopDetail sessions={MOCK_SESSIONS as PilotSession[]} />);

    const evidenceSection = screen.getByTestId('sop-evidence-section');

    const failBtn = screen.getByRole('button', { name: /Chỉ ca FAIL/i });
    fireEvent.click(failBtn);
    expect(within(evidenceSection).getByText('Khách Tâm')).toBeInTheDocument();
    expect(within(evidenceSection).getByText('Phương Thảo')).toBeInTheDocument();
    expect(within(evidenceSection).queryByText('Nguyệt')).not.toBeInTheDocument();

    const passBtn = screen.getByRole('button', { name: /Chỉ ca PASS/i });
    fireEvent.click(passBtn);
    expect(within(evidenceSection).getByText('Nguyệt')).toBeInTheDocument();
    expect(within(evidenceSection).queryByText('Khách Tâm')).not.toBeInTheDocument();

    const photoBtn = screen.getByRole('button', { name: /Có ảnh/i });
    fireEvent.click(photoBtn);
    expect(within(evidenceSection).getByText('Khách Tâm')).toBeInTheDocument();
    expect(within(evidenceSection).getByText('Nguyệt')).toBeInTheDocument();
    expect(within(evidenceSection).queryByText('Phương Thảo')).not.toBeInTheDocument();
  });

  it('searches evidence cases by customer name or reason query', () => {
    render(<PilotCriteriaSopDetail sessions={MOCK_SESSIONS as PilotSession[]} />);

    const searchInput = screen.getByTestId('search-evidence-input');
    fireEvent.change(searchInput, { target: { value: 'Nguyệt' } });

    const evidenceSection = screen.getByTestId('sop-evidence-section');
    expect(within(evidenceSection).getByText('Nguyệt')).toBeInTheDocument();
    expect(within(evidenceSection).queryByText('Khách Tâm')).not.toBeInTheDocument();
  });

  it('triggers onOpenSessionFlow when clicking "Xem ca gốc" button', () => {
    const handleOpenFlow = vi.fn();
    render(
      <PilotCriteriaSopDetail
        sessions={MOCK_SESSIONS as PilotSession[]}
        onOpenSessionFlow={handleOpenFlow}
      />
    );

    const viewCase10Btn = screen.getByTestId('view-session-flow-10');
    fireEvent.click(viewCase10Btn);
    expect(handleOpenFlow).toHaveBeenCalledTimes(1);
    expect(handleOpenFlow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, customerName: 'Khách Tâm' })
    );
  });

  it('triggers onBack when clicking back button', () => {
    const handleBack = vi.fn();
    render(<PilotCriteriaSopDetail onBack={handleBack} />);

    const backBtn = screen.getByTestId('sop-detail-back-button');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
