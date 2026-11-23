import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodayBookingNotesCell } from '../components/TodayBookingNotesCell';
import { BookingNotesPanel } from '~/components/customer-detail/components/bookings-tab/BookingNotesPanel';

describe('TodayBookingNotesCell & BookingNotesPanel [MOS-FEAT-249]', () => {
  it('renders full CC note directly below bookingNote only for completed bookings in Today tables', () => {
    const { rerender } = render(
      <TodayBookingNotesCell
        bookingNote="31/10 ib nhắc lịch"
        ccNote={'Cb 3r\n-MD: chị không làm, đổi qua sauna'}
        ccNoteStaffName="Nguyễn Quang Khải"
        status="completed"
      />
    );

    expect(screen.getByText('31/10 ib nhắc lịch')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú CC / Tư vấn viên')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Quang Khải')).toBeInTheDocument();
    expect(screen.getByText(/Cb 3r/)).toBeInTheDocument();
    expect(screen.getByText(/-MD: chị không làm, đổi qua sauna/)).toBeInTheDocument();

    rerender(
      <TodayBookingNotesCell
        bookingNote="Chờ khách đến"
        ccNote="Không hiện khi chưa hoàn thành"
        ccNoteStaffName="Nguyễn Quang Khải"
        status="confirmed"
      />
    );

    expect(screen.getByText('Chờ khách đến')).toBeInTheDocument();
    expect(screen.queryByText('Ghi chú CC / Tư vấn viên')).not.toBeInTheDocument();
    expect(screen.queryByText('Không hiện khi chưa hoàn thành')).not.toBeInTheDocument();
  });

  it('renders CC note in CustomerDetailDrawer BookingNotesPanel and deduplicates identical attached order_note', () => {
    render(
      <BookingNotesPanel
        booking={{
          id: 339756,
          orderState: 'Completed',
          bookingNote: '18/11 ib nhắc lịch',
          ccNote: '💎85\ncb 5N 29/12/26',
          ccNoteStaffName: 'Nguyễn Quang Khải',
          bookerStaffName: 'Booker Lan',
        }}
        cleanNoteText="18/11 ib nhắc lịch"
        attachedNotes={[
          {
            id: 702787,
            noteFieldKey: 'order_note',
            note: '💎85\ncb 5N 29/12/26',
            staffName: 'Nguyễn Quang Khải',
            dateCreated: '2026-11-18T14:19:47.000Z',
          },
        ]}
        themeMode="light"
      />
    );

    expect(screen.getByText('18/11 ib nhắc lịch')).toBeInTheDocument();
    // Only rendered once (attached order_note deduplicated with direct booking.ccNote)
    expect(screen.getAllByText(/cb 5N 29\/12\/26/)).toHaveLength(1);
    expect(screen.getByText(/Ghi chú CC \/ Tư vấn viên/)).toBeInTheDocument();
  });
});
