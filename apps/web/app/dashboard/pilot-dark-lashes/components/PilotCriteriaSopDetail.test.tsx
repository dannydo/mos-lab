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
    assessmentNotes: 'Hiện khách muốn về dưỡng mi chứ không muốn nối nữa. Dưỡng 1-2 tuần rồi khách sẽ quay lại để kiểm tra sức khỏe uốn mi tiếp',
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

  it('renders all 5 core criteria checklists by Cô Giang Đàm', () => {
    render(<PilotCriteriaSopDetail />);

    expect(screen.getByText(/Tiêu chí 1: Độ dài mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 2: Độ dày sợi mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 3: Mật độ mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 4: Tình trạng sợi mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chí 5: Khả năng tạo form/i)).toBeInTheDocument();
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

  it('filters evidence cases by ALL, FAIL, and PASS', () => {
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
