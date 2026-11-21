import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { YEPPEUM_PRODUCT_ID, type IosSimulationAttemptSummary } from '@mos-lab/shared';
import { SimulationAttemptEditModal } from '../SimulationAttemptEditModal';
import { IosSimulationHistorySheet } from '../IosSimulationHistorySheet';

const mockGetProductCatalog = vi.fn();

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
    themeId: 'luxury-gold',
    coreThemeId: 'luxury-gold',
    toggleTheme: vi.fn(),
    availableCoreThemes: [],
    setCoreThemeId: vi.fn(),
  }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    ios: {
      getProductCatalog: (...args: any[]) => mockGetProductCatalog(...args),
    },
  },
}));

const MOCK_ATTEMPT: IosSimulationAttemptSummary = {
  attemptId: 'sim-att-101',
  attemptNumber: 1,
  bookingId: 771121,
  orderNumber: '771121',
  customerId: 50021,
  customerName: 'Ngọc Phạm',
  staffId: 46272,
  createdAt: new Date().toISOString(),
  sourceAction: 'COMPLETE_ORDER',
  statusAtSnapshot: 'DONE',
  serviceName: 'Classic 1D',
  servicePrice: 550000,
  selectedStyle: 'Natural',
  selectedComboName: 'Gói 3 Lần (Tiết kiệm)',
  selectedComboPrice: 1170000,
  selectedUnderComboName: null,
  selectedUnderComboPrice: 0,
  upsellProducts: [{ productName: 'Dưỡng Mi Yeppeum Korea', quantity: 1, totalPrice: 1100000 }],
  upsellTotal: 1100000,
  promotionName: null,
  promotionDiscountAmount: 0,
  grandTotal: 2820000,
  tipAmount: 0,
  tipActorShare: 0,
  comboBonusAmount: 50000,
  serumBonusAmount: 100000,
  cvRotationPoints: 2,
  totalEstimatedReward: 205000,
  elapsedSeconds: 2700,
  notes: 'Kịch bản ban đầu',
};

describe('SimulationAttemptEditModal & IosSimulationHistorySheet Contract (MOS-FEAT-228 & MOS-BUG-241)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProductCatalog.mockResolvedValue({
      success: true,
      products: [
        {
          productId: YEPPEUM_PRODUCT_ID,
          productSku: 'YEPPEUM-01',
          productName: 'Dưỡng Mi Yeppeum Korea',
          price: 1100000,
          isSerum: true,
        },
      ],
    });
  });

  it('renders modal with prefilled attempt values and real Wings upsell catalog (no fake mock products)', async () => {
    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={vi.fn()}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockGetProductCatalog).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeDefined();
    expect(screen.getByDisplayValue('Kịch bản ban đầu')).toBeDefined();
    expect(screen.getByText('Khách hàng: Ngọc Phạm · Dịch vụ: Classic 1D')).toBeDefined();

    // Real product Dưỡng Mi Yeppeum Korea (1.100.000đ) is rendered
    expect(screen.getByText('Dưỡng Mi Yeppeum Korea')).toBeDefined();
    expect(screen.getByText('(1.100.000đ)')).toBeDefined();

    // Old hardcoded fake products must NOT exist
    expect(screen.queryByText(/Serum Dưỡng Mi Wings/i)).toBeNull();
    expect(screen.queryByText(/Mascara Chuyên Nối Mi/i)).toBeNull();
    expect(screen.queryByText(/Gel Tháo Mi Dưỡng Ẩm/i)).toBeNull();
    expect(screen.queryByText(/Bọt Vệ Sinh Mi Kháng Khuẩn/i)).toBeNull();
  });

  it('supports switching Yeppeum price tiers and quantity while recalculating grandTotal and CV reward', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const attemptNoUpsell: IosSimulationAttemptSummary = {
      ...MOCK_ATTEMPT,
      upsellProducts: [],
      upsellTotal: 0,
      grandTotal: 1720000,
      serumBonusAmount: 0,
      totalEstimatedReward: 50000,
    };

    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={vi.fn()}
        attempt={attemptNoUpsell}
        bookingId={771121}
        onSave={handleSave}
      />
    );

    // Select Dưỡng Mi Yeppeum Korea (1.100.000đ)
    fireEvent.click(screen.getByRole('button', { name: /Dưỡng Mi Yeppeum Korea/i }));
    expect(screen.getByText('2.820.000đ')).toBeDefined(); // 550k + 1170k + 1100k
    expect(screen.getByText('+150.000đ')).toBeDefined(); // 50k combo + 100k serum

    // Switch to Ưu đãi < 50% (770K -> +50K bonus)
    fireEvent.click(screen.getByRole('button', { name: /Ưu đãi < 50% · 770K/i }));
    expect(screen.getByText('2.490.000đ')).toBeDefined(); // 550k + 1170k + 770k
    expect(screen.getByText('+100.000đ')).toBeDefined(); // 50k combo + 50k serum

    // Increase quantity to 2 (1.540.000đ -> +100K serum bonus)
    fireEvent.click(screen.getByRole('button', { name: /Tăng số lượng Dưỡng Mi Yeppeum Korea/i }));
    expect(screen.getByText('3.260.000đ')).toBeDefined(); // 550k + 1170k + 1540k
    expect(screen.getByText('+150.000đ')).toBeDefined(); // 50k combo + 100k serum

    // Save and inspect payload
    fireEvent.click(screen.getByRole('button', { name: /Lưu kịch bản/i }));
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
    const payload = handleSave.mock.calls[0][1];
    expect(payload.upsellProducts).toEqual([
      {
        productId: YEPPEUM_PRODUCT_ID,
        productName: 'Dưỡng Mi Yeppeum Korea (Ưu đãi < 50% (770.000đ))',
        quantity: 2,
        unitPrice: 770000,
        totalPrice: 1540000,
      },
    ]);
  });

  it('loads additional active products from /api/ios/products/catalog and renders custom saved combo pill', async () => {
    mockGetProductCatalog.mockResolvedValue({
      success: true,
      products: [
        {
          productId: YEPPEUM_PRODUCT_ID,
          productSku: 'YEPPEUM-01',
          productName: 'Dưỡng Mi Yeppeum Korea',
          price: 1100000,
          isSerum: true,
        },
        {
          productId: 55,
          productSku: 'CLEAN-01',
          productName: 'Cọ Vệ Sinh Mi Wings',
          price: 90000,
          isSerum: false,
        },
      ],
    });

    const attemptWithRealCombo: IosSimulationAttemptSummary = {
      ...MOCK_ATTEMPT,
      selectedComboName: 'VIP 15+3 Flawless Mink 90 sợi',
      selectedComboPrice: 11100000,
      upsellProducts: [],
      upsellTotal: 0,
    };

    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={vi.fn()}
        attempt={attemptWithRealCombo}
        bookingId={771121}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('VIP 15+3 Flawless Mink 90 sợi (Đang chọn)')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Cọ Vệ Sinh Mi Wings')).toBeDefined();
    });
    expect(screen.getByText('(90.000đ)')).toBeDefined();
  });

  it('updates form fields and calls onSave with recalculated totals', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={handleClose}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={handleSave}
      />
    );

    // Edit notes
    const notesInput = screen.getByDisplayValue('Kịch bản ban đầu');
    fireEvent.change(notesInput, { target: { value: 'Kịch bản đã sửa - Combo VIP' } });

    // Select style Katun
    const katunBtn = screen.getByRole('button', { name: 'Katun' });
    fireEvent.click(katunBtn);

    // Click Tip 50k
    const tip50kBtn = screen.getByRole('button', { name: '50k' });
    fireEvent.click(tip50kBtn);

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Lưu kịch bản/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const callPayload = handleSave.mock.calls[0][1];
    expect(callPayload.bookingId).toBe(771121);
    expect(callPayload.notes).toBe('Kịch bản đã sửa - Combo VIP');
    expect(callPayload.selectedStyle).toBe('Katun');
    expect(callPayload.tipAmount).toBe(50000);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onApplyToWorkspace when clicking Nạp vào bàn làm việc', async () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={handleClose}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={vi.fn()}
        onApplyToWorkspace={handleApply}
      />
    );

    await waitFor(() => {
      expect(mockGetProductCatalog).toHaveBeenCalledTimes(1);
    });

    const applyBtn = screen.getByRole('button', { name: /Nạp vào bàn làm việc/i });
    fireEvent.click(applyBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply.mock.calls[0][0].attemptId).toBe('sim-att-101');
  });

  it('renders Chỉnh sửa kịch bản button on each attempt card in IosSimulationHistorySheet', async () => {
    render(
      <IosSimulationHistorySheet
        isOpen={true}
        onClose={vi.fn()}
        attempts={[MOCK_ATTEMPT]}
        booking={{ id: 771121, customerName: 'Ngọc Phạm' } as any}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa kịch bản PA #1/i });
    expect(editBtn).toBeDefined();

    // Click edit button opens SimulationAttemptEditModal
    fireEvent.click(editBtn);
    expect(screen.getByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeDefined();

    // Clicking [X] closes the modal reliably even while parent action is busy (MOS-BUG-242)
    const closeButtons = screen.getAllByRole('button', { name: 'Đóng' });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeNull();
  });

  it('closes via [X] even when isBusy is true and lists real Dưỡng Mi Yeppeum Korea catalog tiers (MOS-BUG-241, MOS-BUG-242)', () => {
    const handleClose = vi.fn();
    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={handleClose}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={vi.fn()}
        isBusy={true}
      />
    );

    expect(screen.getByText('Dưỡng Mi Yeppeum Korea')).toBeDefined();
    expect(screen.getAllByText(/1\.100\.000đ/).length).toBeGreaterThan(0);

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders Tạo & Chỉnh sửa kịch bản mới button when attempts is empty and opens edit modal', async () => {
    render(
      <IosSimulationHistorySheet
        isOpen={true}
        onClose={vi.fn()}
        attempts={[]}
        booking={{ id: 771121, customerName: 'Ngọc Phạm' } as any}
      />
    );

    expect(screen.getByText(/Chưa có phương án được lưu/i)).toBeDefined();
    const createBtn = screen.getByRole('button', { name: /Tạo & Chỉnh sửa kịch bản mới/i });
    expect(createBtn).toBeDefined();

    fireEvent.click(createBtn);
    expect(screen.getByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeDefined();
    await waitFor(() => {
      expect(mockGetProductCatalog).toHaveBeenCalledTimes(1);
    });
  });
});
