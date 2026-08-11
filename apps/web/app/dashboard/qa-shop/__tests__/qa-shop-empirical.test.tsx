import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QaShopPage from '../page';
import { ItemStatusToggle, SeverityDotIndicator } from '../components/DailyAuditTab';

// Polyfill window.matchMedia for Ant Design in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const { mockTemplates } = vi.hoisted(() => ({
  mockTemplates: [
    {
      id: 'tpl-wings-dt',
      title: 'Wings Lashes - Đề Thám (DT)',
      branchCode: 'DT',
      code: 'DT.Reception.DAILY.check',
      sections: [
        {
          id: 'sec-0',
          title: 'Khu Vực Quầy Lễ Tân',
          items: [
            {
              id: 'itm-01',
              title: 'Quầy lễ tân sạch sẻ, gọn gàng',
              severity: 'HIGH',
              standardRequirement: 'Không bám bụi, gọn gàng. Đơn vị: 1',
            },
            {
              id: 'itm-02',
              title: 'Đồng phục lễ tân đúng quy chuẩn',
              severity: 'MID',
              standardRequirement: 'Áo sơ mi phẳng, đeo bảng tên. Đơn vị: 1',
            },
          ],
        },
      ],
    },
  ],
}));

// Mock theme context & api-client with exact path
vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    qaShop: {
      getAudits: vi.fn().mockResolvedValue([]),
      getTickets: vi.fn().mockResolvedValue([]),
      getTemplates: vi.fn().mockResolvedValue(mockTemplates),
      getAnalytics: vi.fn().mockResolvedValue({}),
      saveAudit: vi.fn().mockResolvedValue({ success: true }),
      updateTicket: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('QA Shop Inspection UI Empirical Verification Suite', () => {
  describe('1. ItemStatusToggle ARIA & Interactive State Logic', () => {
    it('renders vector icon buttons with correct initial ARIA attributes for PASS state', () => {
      const handleChange = vi.fn();
      render(
        <ItemStatusToggle
          itemId="itm-01"
          itemTitle="Quầy lễ tân sạch sẻ, gọn gàng"
          value="PASS"
          onChange={handleChange}
        />
      );

      const passBtn = screen.getByRole('button', { name: /Đánh giá Đạt cho tiêu chí/i });
      const failBtn = screen.getByRole('button', { name: /Đánh giá Không đạt cho tiêu chí/i });
      const naBtn = screen.getByRole('button', { name: /Bỏ qua tiêu chí/i });

      expect(passBtn).toHaveAttribute('aria-pressed', 'true');
      expect(failBtn).toHaveAttribute('aria-pressed', 'false');
      expect(naBtn).toHaveAttribute('aria-pressed', 'false');
      expect(passBtn).toHaveAttribute('aria-label', 'Đánh giá Đạt cho tiêu chí Quầy lễ tân sạch sẻ, gọn gàng');
      expect(failBtn).toHaveAttribute('aria-label', 'Đánh giá Không đạt cho tiêu chí Quầy lễ tân sạch sẻ, gọn gàng');
      expect(naBtn).toHaveAttribute('aria-label', 'Bỏ qua tiêu chí Quầy lễ tân sạch sẻ, gọn gàng');
    });

    it('triggers onChange with FAIL when clicking Fail button', () => {
      const handleChange = vi.fn();
      render(
        <ItemStatusToggle
          itemId="itm-01"
          itemTitle="Quầy lễ tân sạch sẻ, gọn gàng"
          value="PASS"
          onChange={handleChange}
        />
      );

      const failBtn = screen.getByRole('button', { name: /Đánh giá Không đạt cho tiêu chí/i });
      fireEvent.click(failBtn);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('itm-01', 'FAIL');
    });

    it('triggers onChange with NA when clicking N/A button', () => {
      const handleChange = vi.fn();
      render(
        <ItemStatusToggle
          itemId="itm-01"
          itemTitle="Quầy lễ tân sạch sẻ, gọn gàng"
          value="PASS"
          onChange={handleChange}
        />
      );

      const naBtn = screen.getByRole('button', { name: /Bỏ qua tiêu chí/i });
      fireEvent.click(naBtn);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('itm-01', 'NA');
    });
  });

  describe('2. SeverityDotIndicator Component', () => {
    it('renders MID severity properly matching MEDIUM', () => {
      render(<SeverityDotIndicator severity="MID" />);
      expect(screen.getByText('MID')).toBeInTheDocument();
    });

    it('renders CRITICAL severity with red pulse animation dot', () => {
      const { container } = render(<SeverityDotIndicator severity="CRITICAL" />);
      const pulseDot = container.querySelector('.bg-red-500.animate-pulse');
      expect(pulseDot).not.toBeNull();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  describe('3. QaShopPage Full Component Empirical Verification', () => {
    it('initializes all items as PASS, soft alert strip is hidden when failed === 0', async () => {
      render(<QaShopPage />);

      await waitFor(() => {
        expect(screen.getByText(/Khu Vực Quầy Lễ Tân/i)).toBeInTheDocument();
      });

      // Initially failed count is 0, so soft alert strip (role="alert") should not be in document
      const alertStrip = screen.queryByRole('alert');
      expect(alertStrip).toBeNull();
    });

    it('shows soft alert strip with role="alert" and aria-live="polite" when an item is toggled to FAIL', async () => {
      render(<QaShopPage />);

      await waitFor(() => {
        expect(screen.getByText(/Khu Vực Quầy Lễ Tân/i)).toBeInTheDocument();
      });

      // Find the Fail button for item 1
      const failButtons = screen.getAllByRole('button', { name: /Đánh giá Không đạt cho tiêu chí/i });
      expect(failButtons.length).toBeGreaterThan(0);

      // Click the first fail button
      fireEvent.click(failButtons[0]);

      // Soft alert strip should now appear with role="alert" and aria-live="polite"
      await waitFor(() => {
        const alertStrip = screen.getByRole('alert');
        expect(alertStrip).toBeInTheDocument();
        expect(alertStrip).toHaveAttribute('aria-live', 'polite');
        expect(alertStrip).toHaveAttribute('aria-label', 'Cảnh báo vi phạm tiêu chí kiểm tra');
        expect(alertStrip).toHaveTextContent(/Phát hiện 1 tiêu chí không đạt quy chuẩn/i);
      });
    });

    it('shows note and photo input fields when item status is FAIL, hides them when changed back to PASS', async () => {
      render(<QaShopPage />);

      await waitFor(() => {
        expect(screen.getByText(/Khu Vực Quầy Lễ Tân/i)).toBeInTheDocument();
      });

      // Note input placeholder before FAIL
      expect(screen.queryByPlaceholderText(/Nhập ghi chú lý do không đạt.../i)).toBeNull();

      // Click FAIL on first item
      const failButtons = screen.getAllByRole('button', { name: /Đánh giá Không đạt cho tiêu chí/i });
      fireEvent.click(failButtons[0]);

      // Note and photo inputs should appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Nhập ghi chú lý do không đạt.../i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/URL Ảnh minh chứng.../i)).toBeInTheDocument();
      });

      // Click PASS back on first item
      const passButtons = screen.getAllByRole('button', { name: /Đánh giá Đạt cho tiêu chí/i });
      fireEvent.click(passButtons[0]);

      // Note input should disappear
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Nhập ghi chú lý do không đạt.../i)).toBeNull();
      });
    });
  });
});
