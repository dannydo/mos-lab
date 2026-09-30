import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AcademyWorkshopAgendaManager from './AcademyWorkshopAgendaManager';
import type { AcademyWorkshopDetail } from '@mos-lab/shared';

vi.mock('./useAcademyWorkshopAgendaTemplates', () => ({
  useAcademyWorkshopAgendaTemplates: () => ({ data: [], loading: false, error: null }),
}));

describe('AcademyWorkshopAgendaManager - MOS-FEAT-65 Actual Execution Time', () => {
  it('displays the actual duration and start/end time when an agenda item is completed', () => {
    const startedAt = new Date(2026, 8, 29, 9, 45, 0).toISOString();
    const completedAt = new Date(2026, 8, 29, 10, 25, 0).toISOString();

    const mockWorkshop = {
      id: 1,
      campaignId: 1,
      name: 'Workshop Đổi Vận',
      slug: 'workshop-doi-van',
      description: null,
      heroImageUrl: null,
      startsAt: '2026-09-29T09:00:00Z',
      endsAt: '2026-09-29T12:00:00Z',
      menuSelectionDeadline: null,
      equipmentSelectionDeadline: null,
      designSelectionDeadline: null,
      location: 'Quận 1',
      capacity: 30,
      feeVnd: 0,
      feeDueAt: null,
      status: 'LIVE',
      liveAgendaItemId: null,
      sharedJoinUrl: 'https://example.com/join',
      agendaTemplate: null,
      menuAgendaItemId: null,
      equipmentAgendaItemId: null,
      designAgendaItemId: null,
      activeQuiz: null,
      agenda: [
        {
          id: 101,
          workshopId: 1,
          title: 'Khai mạc & Giới thiệu',
          description: null,
          kind: 'CONTENT',
          plannedDurationSeconds: 2400,
          sortOrder: 1,
          status: 'COMPLETED',
          startedAt,
          completedAt,
          pausedAt: null,
          pausedSeconds: 0,
          actualDurationSeconds: 2400,
          remainingSeconds: 0,
        },
      ],
      menuItems: [],
      equipmentPackages: [],
      designs: [],
      participants: [],
      summary: {
        total: 0,
        infoSent: 0,
        confirmed: 0,
        feeReady: 0,
        checkedIn: 0,
        tested: 0,
        invoiced: 0,
        tuitionPaid: 0,
        bonusEarned: 0,
        noShow: 0,
      },
    };

    render(
      <AcademyWorkshopAgendaManager
        workshop={mockWorkshop as unknown as AcademyWorkshopDetail}
        canEdit={true}
        onUpdated={vi.fn()}
        onRefresh={vi.fn()}
        onOpenResourceTab={vi.fn()}
      />
    );

    expect(screen.getByText('Khai mạc & Giới thiệu')).toBeInTheDocument();
    expect(screen.getByText('✅ 9h45 - 10h25 : 40 phút')).toBeInTheDocument();
  });
});
