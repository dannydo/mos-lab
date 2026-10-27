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

  it('renders both navigation tabs: Ca dịch vụ & Hiệu quả and SOP & Đào tạo KTV', async () => {
    render(<PilotDarkLashesPage />);

    await waitFor(() => {
      expect(screen.getByText('Ca dịch vụ & Hiệu quả')).toBeInTheDocument();
      expect(screen.getByText('SOP & Đào tạo KTV')).toBeInTheDocument();
    });
  });

  it('switches to SOP & Đào tạo KTV tab when clicked and displays placeholder', async () => {
    render(<PilotDarkLashesPage />);

    const sopTab = screen.getByTestId('sop-training-tab-header');
    fireEvent.click(sopTab);

    await waitFor(() => {
      expect(screen.getByTestId('sop-training-placeholder')).toBeInTheDocument();
      expect(screen.getByText('Khung Đào Tạo & Chuẩn Hóa Tay Nghề Chuyên Viên Kỹ Thuật')).toBeInTheDocument();
    });
  });
});
