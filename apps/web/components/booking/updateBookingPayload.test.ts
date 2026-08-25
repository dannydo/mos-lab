import { describe, expect, it } from 'vitest';
import { buildBookingDetailsUpdateRequest } from './updateBookingPayload';

describe('buildBookingDetailsUpdateRequest', () => {
  it('never includes locked branch or appointment time fields', () => {
    const payload = buildBookingDetailsUpdateRequest({
      technicianId: 3832,
      bookingNote: 'Đổi dòng mi',
      serviceId: 12,
      includePromotionSelection: true,
      promotionId: null,
      campaignPromotionId: 7,
    });

    expect(payload).toMatchObject({
      technicianId: 3832,
      bookingNote: 'Đổi dòng mi',
      serviceId: 12,
      campaignPromotionId: 7,
    });
    expect(payload).not.toHaveProperty('storeId');
    expect(payload).not.toHaveProperty('bookingDate');
    expect(payload).not.toHaveProperty('bookingTime');
  });
});
