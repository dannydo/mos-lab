import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PilotDarkLashesPage from './page';

const apiMocks = vi.hoisted(() => ({
  listSessions: vi.fn(),
  listMaterials: vi.fn(),
  listSopSteps: vi.fn(),
  listAssessmentCriteria: vi.fn(),
}));

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    pilot: {
      listSessions: apiMocks.listSessions,
      listMaterials: apiMocks.listMaterials,
      listSopSteps: apiMocks.listSopSteps,
      listAssessmentCriteria: apiMocks.listAssessmentCriteria,
    },
  },
  resolveMediaUrl: (url: string) => url,
}));

describe('PilotDarkLashesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listSessions.mockResolvedValue({
      sessions: [],
      metrics: {
        totalSessions: 0,
        totalRevenue: 0,
        avgCsat: 5.0,
        pendingFollowUp24hCount: 0,
        pendingFollowUp72hCount: 0,
      },
    });
    apiMocks.listMaterials.mockResolvedValue([]);
    apiMocks.listSopSteps.mockResolvedValue([]);
    apiMocks.listAssessmentCriteria.mockResolvedValue([]);
  });

  it('renders all three navigation tabs: Ca dịch vụ & Hiệu quả, SOP & Đào tạo KTV, and SOP Preparation – Chuẩn bị SOP', async () => {
    render(<PilotDarkLashesPage />);

    await waitFor(() => {
      expect(screen.getByText('Ca dịch vụ & Hiệu quả')).toBeInTheDocument();
      expect(screen.getByText('SOP & Đào tạo KTV')).toBeInTheDocument();
      expect(screen.getByText('SOP Preparation – Chuẩn bị SOP')).toBeInTheDocument();
    });
  });

  it('switches to SOP & Đào tạo KTV tab when clicked and displays placeholder', async () => {
    render(<PilotDarkLashesPage />);

    const sopTab = screen.getByTestId('sop-training-tab-header');
    fireEvent.click(sopTab);

    await waitFor(() => {
      expect(screen.getByTestId('sop-training-placeholder')).toBeInTheDocument();
      expect(screen.getByText(/Khung Đào Tạo.*Chuyên Viên Kỹ Thuật/i)).toBeInTheDocument();
    });
  });

  it('switches to SOP Preparation – Chuẩn bị SOP tab when clicked and displays Hạng mục 1 content', async () => {
    render(<PilotDarkLashesPage />);

    const prepTab = screen.getByTestId('sop-preparation-tab-header');
    fireEvent.click(prepTab);

    await waitFor(() => {
      expect(screen.getByTestId('sop-preparation-tab-content')).toBeInTheDocument();
      expect(screen.getByTestId('sop-prep-category-1-title')).toHaveTextContent(
        'Hạng mục 1 – Kiểm tra & Đánh giá tình trạng mi thật'
      );
      expect(screen.getByTestId('sop-prep-category-1-objective')).toHaveTextContent(
        'Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.'
      );
      expect(screen.getByTestId('sop-prep-category-1-owner')).toHaveTextContent('Cô Giang Phạm');
      expect(screen.getByTestId('sop-prep-category-1-status')).toHaveTextContent('Chưa thu thập dữ liệu');
      expect(screen.getByTestId('sop-prep-category-1-detail-btn')).toBeInTheDocument();
    });
  });
});
