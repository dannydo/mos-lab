import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Form } from 'antd';
import AcademyWorkshopParticipantOverlays, {
  type AcademyWorkshopFeeForm,
  type AcademyWorkshopWalkInForm,
} from './AcademyWorkshopParticipantOverlays';
import type { AcademyWorkshopDetail, AcademyWorkshopParticipant } from '@mos-lab/shared';

describe('AcademyWorkshopParticipantOverlays - MOS-BUG-69 Workshop Pricing Tiers', () => {
  const mockWorkshop: any = {
    id: 12,
    campaignId: 1,
    name: 'Workshop Chuyển Đổi Vận Mệnh',
    slug: 'workshop-chuyen-doi-van-menh',
    description: null,
    heroImageUrl: null,
    startsAt: '2026-10-01T09:00:00Z',
    endsAt: '2026-10-01T17:00:00Z',
    menuSelectionDeadline: null,
    equipmentSelectionDeadline: null,
    designSelectionDeadline: null,
    location: 'Quận 1',
    capacity: 30,
    feeVnd: 1900000,
    feeDueAt: null,
    status: 'SCHEDULED',
    liveAgendaItemId: null,
    sharedJoinUrl: 'https://example.com/join',
    agendaTemplate: null,
    menuAgendaItemId: null,
    equipmentAgendaItemId: null,
    designAgendaItemId: null,
    activeQuiz: null,
    agenda: [],
    menuItems: [],
    equipmentPackages: [],
    designs: [],
  };

  const participantWithDiscount: any = {
    id: 37,
    workshopId: 12,
    leadId: 100,
    leadName: 'Thanhthanh Dip',
    leadPhone: '0901234567',
    lead: {
      id: 100,
      name: 'Thanhthanh Dip',
      phone: '0901234567',
      email: null,
      facebookChatLink: null,
    },
    attendanceStatus: 'CONFIRMED',
    feeStatus: 'PAID',
    feePaidVnd: 1500000,
    feeRemainingVnd: 0,
    appliedFeeVnd: 1500000,
    discountVnd: 400000,
    discountReason: 'Ưu đãi giữ chỗ sớm 1.500.000 đ',
    role: 'STUDENT',
    checkinCode: 'TTD37',
    checkinAt: null,
    notes: null,
    dietaryNotes: null,
    photos: [],
    menuSelections: [],
    equipmentSelection: null,
    talent: null,
    primaryInstructor: null,
    payments: [
      {
        id: 1,
        participantId: 37,
        amountVnd: 1500000,
        paidAt: '2026-09-30T10:00:00Z',
        method: 'TRANSFER',
        referenceCode: 'CK1500',
        note: 'Ck 100% giữ chỗ nhận ưu đãi 1.9 còn 1.5',
      },
    ],
  };

  function TestHarness({ onUpdatePricing }: { onUpdatePricing?: any }) {
    const [feeForm] = Form.useForm<AcademyWorkshopFeeForm>();
    const [walkInForm] = Form.useForm<AcademyWorkshopWalkInForm>();

    return (
      <AcademyWorkshopParticipantOverlays
        workshop={mockWorkshop}
        selected={participantWithDiscount}
        resources={{ staff: [], instructors: [] }}
        busy={false}
        talentLoading={false}
        canManageRestricted={true}
        careDrawerOpen={false}
        qrDataUrl=""
        qrTargetUrl=""
        addOpen={false}
        addLeadIds={[]}
        leadSearch=""
        leadLoading={false}
        leadError={null}
        availableLeadOptions={[]}
        walkInOpen={false}
        feeOpen={true}
        walkInForm={walkInForm}
        feeForm={feeForm}
        onCloseCare={vi.fn()}
        onReissueQr={vi.fn()}
        onUpdateCare={vi.fn()}
        onCheckIn={vi.fn()}
        onOpenFee={vi.fn()}
        onAssignInstructor={vi.fn()}
        onSetPhotoConsent={vi.fn()}
        onUploadPhoto={vi.fn()}
        onOpenTalent={vi.fn()}
        onAddExisting={vi.fn()}
        onAddLeadIdsChange={vi.fn()}
        onLeadSearchChange={vi.fn()}
        onCloseAdd={vi.fn()}
        onOpenWalkInFromAdd={vi.fn()}
        onCloseWalkIn={vi.fn()}
        onCreateWalkIn={vi.fn()}
        onCloseFee={vi.fn()}
        onSaveFee={vi.fn()}
        onUpdatePricing={onUpdatePricing}
      />
    );
  }

  it('renders participant pricing breakdown accurately when appliedFee is 1,500,000 VND and fully paid', () => {
    render(<TestHarness />);

    // Verify fee labels and values
    expect(screen.getByText('Phí niêm yết')).toBeDefined();
    expect(screen.getAllByText(/1\.900\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText('Học phí áp dụng')).toBeDefined();
    expect(screen.getAllByText(/1\.500\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã đóng').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Còn thiếu').length).toBeGreaterThan(0);
    expect(screen.getByText('0 đ')).toBeDefined();
    expect(screen.getByText(/Ưu đãi giữ chỗ sớm 1.500.000 đ/)).toBeDefined();
  });

  it('calls onUpdatePricing with preset tier when a quick preset button is clicked and confirmed', async () => {
    const handleUpdatePricing = vi.fn().mockResolvedValue(undefined);

    render(<TestHarness onUpdatePricing={handleUpdatePricing} />);

    // Click on 50% discount button (950.000 đ)
    const discount50Btn = screen.getByText(/Ưu đãi 50%/);
    fireEvent.click(discount50Btn);

    // Click apply button
    const applyBtn = screen.getByText('Áp dụng gói vé này');
    fireEvent.click(applyBtn);

    expect(handleUpdatePricing).toHaveBeenCalledWith(
      expect.objectContaining({
        appliedFeeVnd: 950000,
        discountVnd: 950000,
        discountReason: 'Ưu đãi 50%',
      })
    );
  });
});
