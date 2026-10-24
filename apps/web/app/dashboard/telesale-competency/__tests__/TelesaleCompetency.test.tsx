import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TelesaleTeamMatrixTab } from '../components/TelesaleTeamMatrixTab';
import { TelesaleLadderModal } from '../components/TelesaleLadderModal';
import { TelesaleActionModal } from '../components/TelesaleActionModal';
import { TelesaleConfigTab } from '../components/TelesaleConfigTab';
import { TelesaleCompetencyMatrixRow } from '@mos-lab/shared';

describe('TelesaleCompetency Web Components', () => {
  const mockMatrix: TelesaleCompetencyMatrixRow[] = [
    {
      staffId: 101,
      legacyStaffId: 50670,
      staffName: 'Phượng Telesales',
      currentTier: 'JUNIOR',
      tenureMonths: 4,
      month: '2026-10',
      scoreA: 38,
      scoreB: 22,
      scoreC: 18,
      scoreD: 14,
      totalScore: 92,
      isPassed: true,
      consecutivePassMonths: 3,
      consecutiveFailMonths: 0,
      ruleEngineStatus: 'PROMOTION_READY',
      hasEvaluated: true,
    },
    {
      staffId: 102,
      legacyStaffId: 52648,
      staffName: 'Kiều Telesales',
      currentTier: 'FRESHER',
      tenureMonths: 1,
      month: '2026-10',
      scoreA: 30,
      scoreB: 18,
      scoreC: 15,
      scoreD: 12,
      totalScore: 75,
      isPassed: true,
      consecutivePassMonths: 1,
      consecutiveFailMonths: 0,
      ruleEngineStatus: 'NORMAL',
      hasEvaluated: true,
    },
  ];

  it('renders TelesaleTeamMatrixTab with staff names and scores', () => {
    const handleSelect = vi.fn();
    render(
      <TelesaleTeamMatrixTab
        teamMatrix={mockMatrix}
        loading={false}
        onSelectStaff={handleSelect}
      />
    );

    expect(screen.getByText('Phượng Telesales')).toBeDefined();
    expect(screen.getByText('Kiều Telesales')).toBeDefined();
    expect(screen.getByText('Bảng Tổng Hợp Khung Năng Lực Đội Telesales')).toBeDefined();
  });

  it('renders TelesaleLadderModal when open', () => {
    const handleClose = vi.fn();
    render(<TelesaleLadderModal open={true} onClose={handleClose} />);

    expect(screen.getByText('Quy Chuẩn Khung Năng Lực & Thăng Giáng Bậc (Telesale / Booking)')).toBeDefined();
    expect(screen.getByText('Fresher Booker')).toBeDefined();
    expect(screen.getByText('Senior Booker')).toBeDefined();
  });

  it('renders TelesaleActionModal with promotion mode', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();
    render(
      <TelesaleActionModal
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        actionType="PROMOTED"
        targetTier="MID_LEVEL"
        onTargetTierChange={vi.fn()}
        actionReason="Đạt điểm chuẩn 3 tháng liên tiếp"
        onActionReasonChange={vi.fn()}
        staffName="Phượng Telesales"
        currentTier="JUNIOR"
        saving={false}
      />
    );

    expect(screen.getByText('Xác Nhận Phê Duyệt Thăng Bậc')).toBeDefined();
    expect(screen.getByText(/Phượng Telesales đã đủ điều kiện thăng cấp/i)).toBeDefined();
  });

  it('renders TelesaleConfigTab with version controls and level table (MOS-FEAT-142)', () => {
    render(<TelesaleConfigTab currentMonth="2026-10" />);

    expect(screen.getByText('Phiên bản cấu hình:')).toBeDefined();
    expect(screen.getByText('Thông Tin Phiên Bản')).toBeDefined();
    expect(screen.getByText('Trọng Số 4 Trụ Cột')).toBeDefined();
    expect(screen.getByText('5 Chỉ Số Trụ Cột A & Điểm Tối Đa')).toBeDefined();
    expect(screen.getByText('Quy Chuẩn Thăng/Giáng Bậc & Quy Tắc Fresher')).toBeDefined();
    expect(screen.getByText('Kiểm Tra Tính Hợp Lệ')).toBeDefined();
    expect(screen.getByText('Xem Trước Điểm Kỳ Này')).toBeDefined();
  });
});
