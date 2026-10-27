import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PilotSafetyRiskSopDetail } from './PilotSafetyRiskSopDetail';
import type { PilotSession } from '@mos-lab/shared';

const MOCK_SESSIONS: Partial<PilotSession>[] = [
  {
    id: 11,
    sessionDate: '2026-10-07',
    customerName: 'Yến Vy',
    customerPhone: '093***',
    technicianName: 'Cô Đẫm (KTV)',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
  },
  {
    id: 18,
    sessionDate: '2026-10-27',
    customerName: 'Nguyệt',
    customerPhone: '090***',
    technicianName: 'Cô Đẫm (KTV)',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
  },
];

describe('PilotSafetyRiskSopDetail', () => {
  it('renders header, approval badge and 3 pillars correctly', () => {
    render(<PilotSafetyRiskSopDetail />);

    expect(screen.getByTestId('pilot-safety-risk-sop-detail')).toBeInTheDocument();
    expect(
      screen.getByText('SOP Quản Trị An Toàn Giác Mạc, Phòng Ngừa Rủi Ro & Xử Lý Sự Cố')
    ).toBeInTheDocument();
    expect(screen.getByTestId('expert-approval-status-badge')).toBeInTheDocument();
    expect(screen.getAllByText(/Chờ Cô Giang Đàm thẩm định/i).length).toBeGreaterThan(0);

    // 3 pillars
    expect(screen.getAllByText('Phần 1: Bảo vệ niêm mạc mắt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phần 2: Nhận diện & Xử lý rủi ro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phần 3: Biên bản sự cố & Chăm sóc').length).toBeGreaterThan(0);
  });

  it('renders Part 1 with 3 stages and 6 safety control points (SCP)', () => {
    render(<PilotSafetyRiskSopDetail />);

    // 3 stages
    expect(screen.getByText('Trước dịch vụ (Tiền thao tác)')).toBeInTheDocument();
    expect(screen.getByText('Trong dịch vụ (Trong thao tác)')).toBeInTheDocument();
    expect(screen.getByText('Sau dịch vụ (Hậu thao tác)')).toBeInTheDocument();

    // 6 SCP items
    expect(screen.getByTestId('scp-item-SCP-01')).toBeInTheDocument();
    expect(screen.getByTestId('scp-item-SCP-02')).toBeInTheDocument();
    expect(screen.getByTestId('scp-item-SCP-03')).toBeInTheDocument();
    expect(screen.getByTestId('scp-item-SCP-04')).toBeInTheDocument();
    expect(screen.getByTestId('scp-item-SCP-05')).toBeInTheDocument();
    expect(screen.getByTestId('scp-item-SCP-06')).toBeInTheDocument();

    // Check toggle SCP
    const scp1 = screen.getByTestId('scp-item-SCP-01');
    fireEvent.click(scp1);
    expect(scp1).toBeInTheDocument();
  });

  it('renders Part 2 with 3 sensitivity levels and emergency medical escalation protocol', () => {
    render(<PilotSafetyRiskSopDetail />);

    // 3 cases
    expect(screen.getByTestId('sensitive-case-card-mild')).toBeInTheDocument();
    expect(screen.getByTestId('sensitive-case-card-moderate')).toBeInTheDocument();
    expect(screen.getByTestId('sensitive-case-card-severe')).toBeInTheDocument();

    // Escalation protocol
    expect(screen.getByText(/Quy Trình Khẩn Cấp: Dừng Dịch Vụ & Chuyển Cơ Sở Y Tế/i)).toBeInTheDocument();
    expect(screen.getByText(/Chuyển BV Mắt TP.HCM/i)).toBeInTheDocument();
    expect(screen.getByText(/Hotline Y Tế: 1900 8198/i)).toBeInTheDocument();
  });

  it('renders Part 3 with 0 incidents empty state conforming to Pilot zero-incident rule', () => {
    render(<PilotSafetyRiskSopDetail sessions={MOCK_SESSIONS as PilotSession[]} />);

    expect(screen.getByTestId('incidents-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Chưa Ghi Nhận Sự Cố Kỹ Thuật Nào')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('can open incident report modal and create a new incident', () => {
    render(<PilotSafetyRiskSopDetail sessions={MOCK_SESSIONS as PilotSession[]} />);

    const createBtn = screen.getByTestId('create-incident-btn');
    fireEvent.click(createBtn);

    expect(screen.getByText('Biểu Mẫu Ghi Nhận Sự Cố & Kế Hoạch Chăm Sóc Bổ Sung')).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ tên Khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mô tả chi tiết tình trạng/i)).toBeInTheDocument();
  });

  it('can toggle expert approval status between Chờ thẩm định and Đã thẩm định', () => {
    render(<PilotSafetyRiskSopDetail />);

    const toggleBtn = screen.getByTestId('toggle-approval-btn');
    expect(screen.getByText('Xác nhận thẩm định chuyên môn')).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText('Đã thẩm định chuyên môn')).toBeInTheDocument();
    expect(screen.getAllByText(/Đã được Cô Giang Đàm thẩm định/i).length).toBeGreaterThan(0);
  });

  it('triggers onBack callback when clicking back button', () => {
    const handleBack = vi.fn();
    render(<PilotSafetyRiskSopDetail onBack={handleBack} />);

    const backBtn = screen.getByTestId('sop-safety-back-button');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
