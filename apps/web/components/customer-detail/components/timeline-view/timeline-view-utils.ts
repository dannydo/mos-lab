export type TimelineSegment = 'all' | 'booking' | 'cc' | 'cs';

export interface TimelineNoteItem {
  id: string;
  department: 'BK' | 'CC' | 'CS' | 'CVL' | 'KHÁC';
  staffName: string;
  note: string;
  date: Date;
  formattedTime: string;
  staffAvatar?: string | null;
}

export interface TimelineGroupedBooking {
  id: string;
  bookingDate: Date;
  formattedDate: string;
  services?: string[];
  branchName?: string;
  technicianName?: string;
  orderState?: string;
  notes: TimelineNoteItem[];
}

export interface TimelineProcessedData {
  processedGroups: TimelineGroupedBooking[];
  totalBookingsWithNotes: number;
  totalCcWithNotes: number;
  totalCsWithNotes: number;
  totalAllWithNotes: number;
}

export const TIMELINE_SEGMENT_STORAGE_KEY = 'customer_detail_timeline_segment';

export const DEPT_PRIORITY: Record<TimelineNoteItem['department'], number> = {
  BK: 1,
  CC: 2,
  CVL: 3,
  CS: 4,
  KHÁC: 5,
};

export const DEPT_COLORS = {
  BK: {
    bg: '#fef3c7',
    color: '#d97706',
    avatarBg: '#d4a84b',
    avatarColor: '#ffffff',
    label: 'Booking (Đặt lịch)',
  },
  CC: {
    bg: '#dbeafe',
    color: '#2563eb',
    avatarBg: '#1890ff',
    avatarColor: '#ffffff',
    label: 'CC (Check-in/out)',
  },
  CS: {
    bg: '#dcfce7',
    color: '#15803d',
    avatarBg: '#52c41a',
    avatarColor: '#ffffff',
    label: 'CS (Chăm sóc KH)',
  },
  CVL: {
    bg: '#fef3c7',
    color: '#b45309',
    avatarBg: '#f59e0b',
    avatarColor: '#ffffff',
    label: 'CVL (Chuyên Viên)',
  },
  KHÁC: {
    bg: '#f3e8ff',
    color: '#7e22ce',
    avatarBg: '#722ed1',
    avatarColor: '#ffffff',
    label: 'Ghi chú khác',
  },
};

export const getDaysDiffText = (bookingDate: string | Date) => {
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
};

function getGeneralGroupKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `general-${y}-${m}-${d}`;
}

// Helper to find closest booking within 2 days (48 hours = 172,800,000 ms)
function findClosestBooking(bookings: SafeAny[], dateStr: string | null): SafeAny {
  if (!dateStr || bookings.length === 0) return null;
  const targetTime = new Date(dateStr).getTime();
  let closestBooking: SafeAny = null;
  let minDiff = Infinity;

  bookings.forEach((b: SafeAny) => {
    const dateVal = b.bookingDate || b.bookingDateStart;
    if (!dateVal) return;
    const diff = Math.abs(new Date(dateVal).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestBooking = b;
    }
  });

  if (minDiff <= 172800000) {
    return closestBooking;
  }
  return null;
}

function appendNoteToGroupMap(
  groupsMap: Map<string, TimelineGroupedBooking>,
  targetBookingId: string | null,
  item: TimelineNoteItem
): void {
  if (targetBookingId && groupsMap.has(targetBookingId)) {
    groupsMap.get(targetBookingId)!.notes.push(item);
    return;
  }

  const groupKey = getGeneralGroupKey(item.date);
  let generalGroup = groupsMap.get(groupKey);
  if (!generalGroup) {
    generalGroup = {
      id: groupKey,
      bookingDate: item.date,
      formattedDate: 'Ghi chú ngoài lịch',
      notes: [],
    };
    groupsMap.set(groupKey, generalGroup);
  }
  generalGroup.notes.push(item);
}

export function buildProcessedTimelineGroups(params: {
  bookings: SafeAny[];
  notes: SafeAny[];
  calls: SafeAny[];
  activeSegment: TimelineSegment;
}): TimelineProcessedData {
  const { bookings, notes, calls, activeSegment } = params;
  const groupsMap = new Map<string, TimelineGroupedBooking>();

  // 1. Initialize booking groups
  bookings.forEach((b) => {
    const bDate = b.bookingDate ? new Date(b.bookingDate) : new Date();

    let formattedDate = 'N/A';
    if (b.bookingDate) {
      const d = new Date(b.bookingDate);
      const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayPrefix = dayPrefixes[d.getDay()];
      const pad = (n: number) => n.toString().padStart(2, '0');
      formattedDate = `${dayPrefix}, ${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    }

    groupsMap.set(String(b.id), {
      id: String(b.id),
      bookingDate: bDate,
      formattedDate,
      services: b.services || [],
      branchName: b.branchName,
      technicianName: b.technicianName,
      orderState: b.orderState,
      notes: [],
    });
  });

  // 2. Add Booking note
  bookings.forEach((b: SafeAny) => {
    if (b.bookingNote && b.bookingNote.trim() !== '') {
      const group = groupsMap.get(String(b.id));
      if (group) {
        group.notes.push({
          id: `bk-${b.id}`,
          department: 'BK',
          staffName: b.bookerName && b.bookerName !== 'Unknown' ? b.bookerName : 'Đặt trực tuyến',
          note: b.bookingNote,
          date: b.bookingDate ? new Date(b.bookingDate) : new Date(),
          formattedTime: 'Đặt lịch',
          staffAvatar: b.bookerAvatar || null,
        });
      }
    }
  });

  // 3. Add CC notes (order_note)
  notes.forEach((n: SafeAny) => {
    if (n.noteFieldKey !== 'order_note') return;

    let targetBookingId = n.orderId && groupsMap.has(String(n.orderId)) ? String(n.orderId) : null;
    if (!targetBookingId) {
      const closest = findClosestBooking(bookings, n.dateCreated);
      if (closest && groupsMap.has(String(closest.id))) {
        targetBookingId = String(closest.id);
      }
    }

    const item: TimelineNoteItem = {
      id: `cc-${n.id}`,
      department: 'CC',
      staffName: n.staffName || 'CC Staff',
      note: n.note,
      date: n.dateCreated ? new Date(n.dateCreated) : new Date(),
      formattedTime: n.dateCreated
        ? new Date(n.dateCreated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '',
      staffAvatar: n.staffAvatar || null,
    };

    appendNoteToGroupMap(groupsMap, targetBookingId, item);
  });

  // 4. Add CS notes (general + call logs)
  notes.forEach((n: SafeAny) => {
    if (n.noteFieldKey === 'order_note') return;

    let targetBookingId = n.orderId && groupsMap.has(String(n.orderId)) ? String(n.orderId) : null;
    if (!targetBookingId) {
      const closest = findClosestBooking(bookings, n.dateCreated);
      if (closest && groupsMap.has(String(closest.id))) {
        targetBookingId = String(closest.id);
      }
    }

    const isTouchpoint = n.source === 'loca_touchpoint' || n.source === 'campaign_touchpoint';
    let noteText = n.note;
    if (isTouchpoint) {
      const statusTitle =
        n.status === 'MESSAGED'
          ? '💬✓ Nhắn tin'
          : n.status === 'FAILED'
            ? '📞❌ Cuộc gọi thất bại'
            : n.status === 'LOST'
              ? '💔 Khách từ chối'
              : '📞✓ Cuộc gọi thành công';
      const labelStr = n.touchpointLabel ? `[${n.touchpointLabel}] ` : '';
      noteText = `${labelStr}${statusTitle}: ${n.note}`;
    }

    const isCvlNote = n.noteFieldKey === 'cvl_note';
    const item: TimelineNoteItem = {
      id: `cs-note-${n.id}`,
      department: isCvlNote ? 'CVL' : 'CS',
      staffName: n.staffName || (isCvlNote ? 'Chuyên Viên' : 'CS Staff'),
      note: noteText,
      date: n.dateCreated ? new Date(n.dateCreated) : new Date(),
      formattedTime: n.dateCreated
        ? new Date(n.dateCreated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '',
      staffAvatar: n.staffAvatar || null,
    };

    appendNoteToGroupMap(groupsMap, targetBookingId, item);
  });

  calls.forEach((c: SafeAny) => {
    if (!c.note || c.note.trim() === '') return;

    const closest = findClosestBooking(bookings, c.createdAt);
    const targetBookingId = closest && groupsMap.has(String(closest.id)) ? String(closest.id) : null;

    const item: TimelineNoteItem = {
      id: `cs-call-${c.id}`,
      department: 'CS',
      staffName: c.staffName || 'CSKH',
      note: `[Cuộc gọi ${c.callType === 'OUTBOUND' ? 'đi' : 'đến'}] ${c.note}`,
      date: c.createdAt ? new Date(c.createdAt) : new Date(),
      formattedTime: c.createdAt
        ? new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '',
      staffAvatar: c.staffAvatar || null,
    };

    appendNoteToGroupMap(groupsMap, targetBookingId, item);
  });

  // Update general group dates to match highest note date for sorting, and set correct formattedDate
  groupsMap.forEach((group, key) => {
    if (key.startsWith('general-') && group.notes.length > 0) {
      const dates = group.notes.map((n) => n.date.getTime());
      const maxDate = new Date(Math.max(...dates));
      group.bookingDate = maxDate;
      const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayPrefix = dayPrefixes[maxDate.getDay()];
      const pad = (n: number) => n.toString().padStart(2, '0');
      group.formattedDate = `Ghi chú ngoài lịch (${dayPrefix}, ${pad(maxDate.getDate())}/${pad(maxDate.getMonth() + 1)})`;
    }
  });

  // --- Filter and Sort Groups ---
  const rawGroups = Array.from(groupsMap.values());

  const processed = rawGroups
    .map((group) => {
      // Filter notes in group based on segment
      const filteredNotes = group.notes.filter((n) => {
        if (activeSegment === 'all') return true;
        const targetDept = activeSegment === 'booking' ? 'bk' : activeSegment;
        return n.department.toLowerCase() === targetDept;
      });

      // Sort notes: BK first, then CC, then CS
      const sortedNotes = [...filteredNotes].sort((a, b) => {
        const prioA = DEPT_PRIORITY[a.department] || 99;
        const prioB = DEPT_PRIORITY[b.department] || 99;
        if (prioA !== prioB) return prioA - prioB;
        return a.date.getTime() - b.date.getTime();
      });

      return {
        ...group,
        notes: sortedNotes,
      };
    })
    // Only show groups that have notes after filtering
    .filter((group) => group.notes.length > 0)
    // Sort groups newest booking first
    .sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());

  // Count totals for badges
  const totalBookingsWithNotes = rawGroups.filter((g) => g.notes.some((n) => n.department === 'BK')).length;
  const totalCcWithNotes = rawGroups.filter((g) => g.notes.some((n) => n.department === 'CC')).length;
  const totalCsWithNotes = rawGroups.filter((g) => g.notes.some((n) => n.department === 'CS')).length;
  const totalAllWithNotes = rawGroups.filter((g) => g.notes.length > 0).length;

  return {
    processedGroups: processed,
    totalBookingsWithNotes,
    totalCcWithNotes,
    totalCsWithNotes,
    totalAllWithNotes,
  };
}
