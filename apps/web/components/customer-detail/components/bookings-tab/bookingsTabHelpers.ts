import type { BookingCycleInfo, BookingPromoInfo } from './types';

const DAY_PREFIXES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
const WARRANTY_SERVICE_TYPES = new Set(['Fix', 'Log', 'Adjust']);
const NOTE_PROXIMITY_MS = 12 * 60 * 60 * 1000;

export function parseBookingPromoInfo(rawBookingNote?: string | null, promotionName?: string | null): BookingPromoInfo {
  let promoTitle: string | null = null;
  let fullPromoText: string | null = null;
  let cleanBookingNote: string = (rawBookingNote || '').trim();

  // Pattern 1: New format: [50%] Wake Up: Welcome Back
  // Pattern 2: Old format: [Ưu đãi chiến dịch Kiều Nữ: Giảm 50% Dịch vụ Nối mi (Giảm 50%)]
  const newFormatMatch = cleanBookingNote.match(/(\[[^\]]+\]\s*[^\n\r]+)/i);
  const oldBracketMatch = cleanBookingNote.match(/\[(Ưu đãi|Khuyến mãi|Promo|Mã giảm giá)[^\]]+\]/i);

  if (newFormatMatch && newFormatMatch[0].startsWith('[')) {
    fullPromoText = newFormatMatch[0].trim();
    cleanBookingNote = cleanBookingNote.replace(newFormatMatch[0], '').trim();
  } else if (oldBracketMatch) {
    fullPromoText = oldBracketMatch[0].slice(1, -1).trim();
    cleanBookingNote = cleanBookingNote.replace(oldBracketMatch[0], '').trim();
  } else if (promotionName && promotionName.trim() !== '') {
    fullPromoText = promotionName.trim();
  }

  if (fullPromoText) {
    let title = fullPromoText;
    if (title.startsWith('[')) {
      promoTitle = title;
    } else {
      if (title.includes(':')) {
        title = title.split(':').slice(1).join(':').trim();
      }
      title = title.replace(/\([^)]*\)$/, '').trim();
      title = title.replace(/^(Ưu đãi|Khuyến mãi|Mã)\s*/i, '').trim();
      promoTitle = title || fullPromoText;
    }
  }

  return {
    promoTitle,
    fullPromoText,
    cleanBookingNote,
  };
}

export function getDaysDiffText(bookingDate: string | Date): string {
  if (!bookingDate) return '';
  const d = new Date(bookingDate);
  const today = new Date();
  const date1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const date2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays > 0) return `${diffDays} ngày trước`;
  return `${Math.abs(diffDays)} ngày nữa`;
}

export function safeParseDate(val: SafeAny): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(' ', 'T');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function isBookingCompleted(orderState?: string | null): boolean {
  return orderState === 'ServiceCompleted' || orderState === 'Completed';
}

export function isWarrantyBooking(booking: SafeAny): boolean {
  if (booking?.isWarranty) return true;
  const serviceTypes: string[] = booking?.serviceTypes || [];
  return serviceTypes.length > 0 && serviceTypes.every((type) => WARRANTY_SERVICE_TYPES.has(type));
}

export function formatBookingDateTime(bookingDate: SafeAny): string {
  const parsedDate = safeParseDate(bookingDate);
  if (!parsedDate) return 'N/A';
  const dayPrefix = DAY_PREFIXES[parsedDate.getDay()];
  return `${dayPrefix}, ${parsedDate.toLocaleString('vi-VN')}`;
}

export function buildNotesByBookingMap(notes?: SafeAny[], bookings?: SafeAny[]): Map<string, SafeAny[]> {
  const map = new Map<string, SafeAny[]>();
  if (!notes || notes.length === 0 || !bookings || bookings.length === 0) {
    return map;
  }

  notes.forEach((n: SafeAny) => {
    let targetBookingId: string | null = n.orderId ? String(n.orderId) : null;

    if (!targetBookingId) {
      const nDate = safeParseDate(n.dateCreated);
      if (nDate) {
        const nTime = nDate.getTime();
        let closestB: SafeAny = null;
        let minDiff = Infinity;

        bookings.forEach((b: SafeAny) => {
          const bDate = safeParseDate(b.bookingDate);
          if (!bDate) return;
          const diff = Math.abs(bDate.getTime() - nTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestB = b;
          }
        });

        // Only attach to booking card if note was created within 12 hours of appointment
        if (closestB && minDiff <= NOTE_PROXIMITY_MS) {
          targetBookingId = String(closestB.id);
        }
      }
    }

    if (targetBookingId) {
      const list = map.get(targetBookingId) || [];
      list.push(n);
      map.set(targetBookingId, list);
    }
  });

  return map;
}

export function buildBookingCycleMap(bookings?: SafeAny[]): Map<number, BookingCycleInfo> {
  const map = new Map<number, BookingCycleInfo>();
  if (!bookings || bookings.length === 0) return map;

  const completedList = bookings
    .filter((b: SafeAny) => isBookingCompleted(b.orderState) && !isWarrantyBooking(b))
    .map((b: SafeAny) => ({
      id: Number(b.id),
      date: safeParseDate(b.bookingDate),
    }))
    .filter((b): b is { id: number; date: Date } => b.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  bookings.forEach((b: SafeAny) => {
    const bId = Number(b.id);
    const bDate = safeParseDate(b.bookingDate);
    const isWarranty = isWarrantyBooking(b);

    if (isWarranty) {
      map.set(bId, { cycleDays: null, isFirstOrder: false, isWarranty: true, prevCompletedDateStr: null });
      return;
    }

    if (!bDate) {
      map.set(bId, { cycleDays: null, isFirstOrder: false, isWarranty: false, prevCompletedDateStr: null });
      return;
    }

    const prevCompleted = completedList.filter((cb) => cb.id !== bId && cb.date.getTime() <= bDate.getTime()).pop();

    if (!prevCompleted) {
      map.set(bId, { cycleDays: null, isFirstOrder: true, isWarranty: false, prevCompletedDateStr: null });
      return;
    }

    const diffTime = bDate.getTime() - prevCompleted.date.getTime();
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const dayPrefix = DAY_PREFIXES[prevCompleted.date.getDay()];
    const formattedPrevDate = `${dayPrefix}, ${prevCompleted.date.toLocaleDateString('vi-VN')}`;

    map.set(bId, {
      cycleDays: diffDays,
      isFirstOrder: false,
      isWarranty: false,
      prevCompletedDateStr: formattedPrevDate,
    });
  });

  return map;
}
