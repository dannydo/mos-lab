import type { UpdateBookingRequest } from '@mos-lab/shared';

interface BuildBookingDetailsUpdateRequestInput {
  technicianId: number | null;
  bookingNote: string;
  serviceId: number | null;
  includePromotionSelection: boolean;
  promotionId: number | null;
  campaignPromotionId: number | null;
}

/**
 * The details modal owns only editable booking fields. Branch and appointment
 * time are intentionally absent so this request can never become a reschedule.
 */
export const buildBookingDetailsUpdateRequest = ({
  technicianId,
  bookingNote,
  serviceId,
  includePromotionSelection,
  promotionId,
  campaignPromotionId,
}: BuildBookingDetailsUpdateRequestInput): UpdateBookingRequest => ({
  technicianId,
  bookingNote,
  serviceId,
  ...(includePromotionSelection ? { promotionId, campaignPromotionId } : {}),
  reasonCategory: 'Cập nhật thông tin đơn hàng',
  reasonNote: 'Cập nhật KTV/Dịch vụ/Ưu đãi/Ghi chú từ CRM',
});
