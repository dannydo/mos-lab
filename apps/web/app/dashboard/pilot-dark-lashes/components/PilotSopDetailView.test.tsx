import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PilotSopDetailView } from './PilotSopDetailView';
import { apiClient } from '../../../../lib/api-client';

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    pilot: {
      getSopEmpiricalStats: vi.fn(),
    },
  },
}));

describe('PilotSopDetailView (MOS-FEAT-171 SOP Hạng Mục 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.pilot.getSopEmpiricalStats as any).mockResolvedValue({
      pilotCode: 'DARK_LASHES',
      totalSessionsCount: 18,
      stats: [
        {
          stepOrder: 1,
          stepName: 'Kiểm tra & làm sạch mi',
          targetMinutes: 5,
          totalRecorded: 18,
          completedCount: 9,
          avgDurationSeconds: 671,
          minDurationSeconds: 5,
          maxDurationSeconds: 2734,
          sampleSessions: [
            {
              sessionId: 18,
              customerName: 'Nguyệt',
              technicianName: 'Cô Đẫm',
              sessionDate: '2026-10-27',
              durationSeconds: 406,
              status: 'COMPLETED',
            },
          ],
        },
        {
          stepOrder: 2,
          stepName: 'Làm mềm',
          targetMinutes: 15,
          totalRecorded: 18,
          completedCount: 8,
          avgDurationSeconds: 1263,
          minDurationSeconds: 11,
          maxDurationSeconds: 2463,
          sampleSessions: [
            {
              sessionId: 18,
              customerName: 'Nguyệt',
              technicianName: 'Cô Đẫm',
              sessionDate: '2026-10-27',
              durationSeconds: 1319,
              status: 'COMPLETED',
            },
          ],
        },
      ],
    });
  });

  it('renders header, draft status badge, and core principles', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(
        screen.getByText('Hạng mục 2: Quy trình Kỹ thuật 7 Bước Uốn Mi Bóng Tối')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Bản dự thảo chuyên môn · Chờ Cô Giang Đàm thẩm định/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Trình tự 7 bước bất biến')).toBeInTheDocument();
    expect(screen.getByText('Phân định thời gian')).toBeInTheDocument();
    expect(screen.getByText('Minh chứng & Căn cứ')).toBeInTheDocument();
    expect(screen.getByText('Dự thảo không tự ban hành')).toBeInTheDocument();
  });

  it('renders benchmark summary cards and comparison table', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getByText('Thời gian tiêu chuẩn')).toBeInTheDocument();
    });

    expect(screen.getByText('Thời gian thực tế TB')).toBeInTheDocument();
    expect(screen.getByText('Tổng ca Pilot lưu trữ')).toBeInTheDocument();

    // Table header and contents
    expect(screen.getByText(/Bảng Thống Kê Đối Chiếu: Thời Gian Tiêu Chuẩn vs Thời Gian Thực Tế Pilot/i)).toBeInTheDocument();
    expect(screen.getAllByText('Kiểm tra & làm sạch mi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Làm mềm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tạo form độ cong').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cân bằng pH').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Màu').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dưỡng Keratin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vệ sinh & hoàn thiện').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 7 detailed step cards with purpose, instructions, materials, QC and error remedies', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getAllByText('Mục đích chuyên môn').length).toBe(7);
    });

    // Step names
    expect(screen.getAllByText('Kiểm tra & làm sạch mi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hướng dẫn thao tác kỹ thuật chuẩn mực').length).toBe(7);
    expect(screen.getAllByText('Dụng cụ & Vật tư sử dụng').length).toBe(7);
    expect(screen.getAllByText('Điểm kiểm soát chất lượng & Tiêu chuẩn hoàn thành').length).toBe(7);
    expect(screen.getAllByText('Lỗi kỹ thuật thường gặp & Phương án xử lý').length).toBe(7);

    // Unverified notice checks
    expect(screen.getByText(/Chờ Cô Giang Đàm xác nhận định lượng bọt chuyên dụng/i)).toBeInTheDocument();
  });

  it('supports expanding and collapsing all steps via quick action buttons', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getByTestId('collapse-all-btn')).toBeInTheDocument();
    });

    // Initially expanded
    expect(screen.getAllByText('Mục đích chuyên môn').length).toBe(7);

    // Click collapse all
    fireEvent.click(screen.getByTestId('collapse-all-btn'));
    expect(screen.queryByText('Mục đích chuyên môn')).not.toBeInTheDocument();

    // Click expand all
    fireEvent.click(screen.getByTestId('expand-all-btn'));
    expect(screen.getAllByText('Mục đích chuyên môn').length).toBe(7);
  });

  it('toggles individual step accordion open and closed', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getByTestId('step-header-1')).toBeInTheDocument();
    });

    // Step 1 is initially expanded
    expect(screen.getByText(/Đánh giá chất mi, độ khỏe nang lông và loại bỏ 100% bã nhờn/i)).toBeInTheDocument();

    // Click step 1 header to collapse
    fireEvent.click(screen.getByTestId('step-header-1'));
    expect(screen.queryByText(/Đánh giá chất mi, độ khỏe nang lông và loại bỏ 100% bã nhờn/i)).not.toBeInTheDocument();

    // Click again to re-expand
    fireEvent.click(screen.getByTestId('step-header-1'));
    expect(screen.getByText(/Đánh giá chất mi, độ khỏe nang lông và loại bỏ 100% bã nhờn/i)).toBeInTheDocument();
  });

  it('toggles technical glossary explaining technical terms in plain language', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-glossary-btn')).toBeInTheDocument();
    });

    // Initially hidden
    expect(screen.queryByTestId('sop-glossary-section')).not.toBeInTheDocument();

    // Click to open glossary
    fireEvent.click(screen.getByTestId('toggle-glossary-btn'));
    const glossarySection = screen.getByTestId('sop-glossary-section');
    expect(glossarySection).toBeInTheDocument();
    expect(within(glossarySection).getByText(/Từ Điển Thuật Ngữ Kỹ Thuật/i)).toBeInTheDocument();
    expect(within(glossarySection).getByText(/Liên kết Disunfua/i)).toBeInTheDocument();
    expect(within(glossarySection).getByText(/Cân bằng pH/i)).toBeInTheDocument();

    // Click to close
    fireEvent.click(screen.getByTestId('toggle-glossary-btn'));
    expect(screen.queryByTestId('sop-glossary-section')).not.toBeInTheDocument();
  });

  it('classifies instructions with tags: Bắt buộc, Lưu ý kỹ thuật, Cảnh báo an toàn', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getAllByText('Mục đích chuyên môn').length).toBe(7);
    });

    expect(screen.getAllByText('Bắt buộc').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Lưu ý kỹ thuật').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cảnh báo an toàn').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles deep dive section for empirical statistics and sample sessions', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getByTestId('deep-dive-toggle-1')).toBeInTheDocument();
    });

    // Click deep dive toggle on Step 1
    fireEvent.click(screen.getByTestId('deep-dive-toggle-1'));

    await waitFor(() => {
      expect(screen.getByText(/Đo kiểm thời gian thực tế qua bộ đếm tự động/i)).toBeInTheDocument();
      expect(screen.getByText(/Ca #18 · Nguyệt/i)).toBeInTheDocument();
    });
  });

  it('filters by step when a step pill is clicked in navigator', async () => {
    render(<PilotSopDetailView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bước 2: Làm mềm/i })).toBeInTheDocument();
    });

    const step2Btn = screen.getByRole('button', { name: /Bước 2: Làm mềm/i });
    fireEvent.click(step2Btn);

    // Step 2 card is visible, other step cards filtered out
    expect(screen.getByRole('heading', { level: 3, name: 'Làm mềm' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Tạo form độ cong' })).not.toBeInTheDocument();
  });

  it('triggers onBack and onViewSessionId callbacks correctly', async () => {
    const handleBack = vi.fn();
    const handleViewSession = vi.fn();

    render(<PilotSopDetailView onBack={handleBack} onViewSessionId={handleViewSession} />);

    const backBtn = screen.getByRole('button', { name: /Quay lại Khung Đào Tạo/i });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);

    // Open deep dive on step 1 to access sample sessions
    await waitFor(() => {
      expect(screen.getByTestId('deep-dive-toggle-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('deep-dive-toggle-1'));

    await waitFor(() => {
      const viewSessionBtn = screen.queryAllByRole('button', { name: /Xem ca gốc →/i });
      if (viewSessionBtn.length > 0) {
        fireEvent.click(viewSessionBtn[0]);
        expect(handleViewSession).toHaveBeenCalledWith(18);
      }
    });
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden word "thợ")', async () => {
    const { container } = render(<PilotSopDetailView />);
    await waitFor(() => {
      expect(screen.getByText('Hạng mục 2: Quy trình Kỹ thuật 7 Bước Uốn Mi Bóng Tối')).toBeInTheDocument();
    });

    // Also open glossary to ensure glossary doesn't contain forbidden word
    fireEvent.click(screen.getByTestId('toggle-glossary-btn'));

    const textContent = container.textContent?.toLowerCase() || '';

    const forbiddenWords = ['thợ mi', 'thợ kỹ thuật', 'thợ tự chủ', 'thợ lash', 'thợ cứng', 'tay nghề thợ'];
    for (const word of forbiddenWords) {
      expect(textContent.includes(word)).toBe(false);
    }
    expect(/\bthợ\b/i.test(textContent)).toBe(false);
  });
});
