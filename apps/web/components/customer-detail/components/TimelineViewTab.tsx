'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Segmented, Space, Avatar, Empty } from 'antd';
import { CalendarOutlined, InfoCircleOutlined, EnvironmentOutlined, CheckOutlined } from '@ant-design/icons';

interface TimelineViewTabProps {
  bookings: SafeAny[];
  notes: SafeAny[];
  calls: SafeAny[];
  themeMode: 'light' | 'dark';
}

interface NoteItem {
  id: string;
  department: 'BK' | 'CC' | 'CS' | 'KHÁC';
  staffName: string;
  note: string;
  date: Date;
  formattedTime: string;
  staffAvatar?: string | null;
}

interface GroupedBooking {
  id: string;
  bookingDate: Date;
  formattedDate: string;
  services?: string[];
  branchName?: string;
  technicianName?: string;
  orderState?: string;
  notes: NoteItem[];
}

const DEPT_PRIORITY = {
  BK: 1,
  CC: 2,
  CS: 3,
  KHÁC: 4,
};

const DEPT_COLORS = {
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
  KHÁC: {
    bg: '#f3e8ff',
    color: '#7e22ce',
    avatarBg: '#722ed1',
    avatarColor: '#ffffff',
    label: 'Ghi chú khác',
  },
};

const getDaysDiffText = (bookingDate: string | Date) => {
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

export const TimelineViewTab: React.FC<TimelineViewTabProps> = ({ bookings, notes, calls, themeMode }) => {
  const [activeSegment, setActiveSegment] = useState<'all' | 'booking' | 'cc' | 'cs'>('all');

  // Load selection from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customer_detail_timeline_segment');
      if (saved && ['all', 'booking', 'cc', 'cs'].includes(saved)) {
        setActiveSegment(saved as 'all' | 'booking' | 'cc' | 'cs');
      }
    }
  }, []);

  const handleSegmentChange = (value: SafeAny) => {
    setActiveSegment(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('customer_detail_timeline_segment', value);
    }
  };

  const getGeneralGroupKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `general-${y}-${m}-${d}`;
  };

  // --- Grouping Logic ---

  // 1. Initialize maps
  const groupsMap = new Map<string, GroupedBooking>();

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

  // Helper to find closest booking within 5 days
  const findClosestBooking = (dateStr: string | null) => {
    if (!dateStr || bookings.length === 0) return null;
    const targetTime = new Date(dateStr).getTime();
    let closestBooking: SafeAny = null;
    let minDiff = Infinity;

    bookings.forEach((b: SafeAny) => {
      if (!b.bookingDate) return;
      const diff = Math.abs(new Date(b.bookingDate).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestBooking = b;
      }
    });

    // 5 days = 432,000,000 ms
    if (minDiff <= 432000000) {
      return closestBooking;
    }
    return null;
  };

  // Helper to find the next booking (first booking on or after note date)
  const findNextBooking = (dateStr: string | null) => {
    if (!dateStr || bookings.length === 0) return null;
    const targetTime = new Date(dateStr).getTime();
    let nextBooking: SafeAny = null;
    let minDiff = Infinity;

    bookings.forEach((b: SafeAny) => {
      if (!b.bookingDate) return;
      const bTime = new Date(b.bookingDate).getTime();
      const diff = bTime - targetTime;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        nextBooking = b;
      }
    });

    return nextBooking;
  };

  // 3. Add CC notes (order_note)
  notes.forEach((n: SafeAny) => {
    if (n.noteFieldKey !== 'order_note') return;

    let targetBookingId = n.orderId ? String(n.orderId) : null;
    if (!targetBookingId) {
      const closest = findClosestBooking(n.dateCreated);
      if (closest) {
        targetBookingId = String(closest.id);
      } else {
        const nextB = findNextBooking(n.dateCreated);
        if (nextB) targetBookingId = String(nextB.id);
      }
    }

    const item: NoteItem = {
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

    if (targetBookingId && groupsMap.has(targetBookingId)) {
      groupsMap.get(targetBookingId)!.notes.push(item);
    } else {
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
  });

  // 4. Add CS notes (general + call logs)
  notes.forEach((n: SafeAny) => {
    if (n.noteFieldKey === 'order_note') return;

    let targetBookingId = n.orderId ? String(n.orderId) : null;
    if (!targetBookingId) {
      const closest = findClosestBooking(n.dateCreated);
      if (closest) {
        targetBookingId = String(closest.id);
      } else {
        const nextB = findNextBooking(n.dateCreated);
        if (nextB) targetBookingId = String(nextB.id);
      }
    }

    const item: NoteItem = {
      id: `cs-note-${n.id}`,
      department: 'CS',
      staffName: n.staffName || 'CS Staff',
      note: n.note,
      date: n.dateCreated ? new Date(n.dateCreated) : new Date(),
      formattedTime: n.dateCreated
        ? new Date(n.dateCreated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '',
      staffAvatar: n.staffAvatar || null,
    };

    if (targetBookingId && groupsMap.has(targetBookingId)) {
      groupsMap.get(targetBookingId)!.notes.push(item);
    } else {
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
  });

  calls.forEach((c: SafeAny) => {
    if (!c.note || c.note.trim() === '') return;

    const closest = findClosestBooking(c.createdAt);
    let targetBookingId = closest ? String(closest.id) : null;
    if (!targetBookingId) {
      const nextB = findNextBooking(c.createdAt);
      if (nextB) targetBookingId = String(nextB.id);
    }

    const item: NoteItem = {
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

    if (targetBookingId && groupsMap.has(targetBookingId)) {
      groupsMap.get(targetBookingId)!.notes.push(item);
    } else {
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

  const processedGroups = rawGroups
    .map((group) => {
      // Filter notes in group based on segment
      const filteredNotes = group.notes.filter((n) => {
        if (activeSegment === 'all') return true;
        return n.department.toLowerCase() === activeSegment;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Segment Selector */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Segmented
          value={activeSegment}
          onChange={handleSegmentChange}
          options={[
            { label: `Tất cả (${totalAllWithNotes})`, value: 'all' },
            { label: `Booking (${totalBookingsWithNotes})`, value: 'booking' },
            { label: `CC (${totalCcWithNotes})`, value: 'cc' },
            { label: `CS (${totalCsWithNotes})`, value: 'cs' },
          ]}
          style={{
            background: themeMode === 'dark' ? '#1e293b' : '#f1f5f9',
            padding: '4px',
            borderRadius: '6px',
          }}
        />
      </div>

      {/* Bookings Timeline Cards */}
      <div
        className="custom-scrollbar"
        style={{
          maxHeight: 'calc(100vh - 300px)',
          overflowY: 'auto',
          padding: '10px 4px 10px 4px',
        }}
      >
        {processedGroups.length > 0 ? (
          processedGroups.map((group) => {
            const isBooking = !group.id.startsWith('general');
            const isCompleted = group.orderState === 'ServiceCompleted' || group.orderState === 'Completed';

            const cardBg = !isBooking
              ? themeMode === 'dark'
                ? '#1e293b'
                : '#ffffff'
              : isCompleted
                ? themeMode === 'dark'
                  ? '#1e293b'
                  : '#ffffff'
                : themeMode === 'dark'
                  ? 'rgba(239, 68, 68, 0.03)'
                  : '#fff5f5';

            const cardBorder = !isBooking
              ? `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`
              : isCompleted
                ? `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`
                : '1px solid #ff4d4f';

            const cardBorderLeft = !isBooking
              ? `4px solid ${themeMode === 'dark' ? '#475569' : '#cbd5e1'}`
              : isCompleted
                ? '4px solid #52c41a'
                : '4px solid #ff4d4f';

            const cardShadow =
              isBooking && !isCompleted
                ? '0 0 10px rgba(255, 77, 79, 0.15)'
                : themeMode === 'dark'
                  ? '0 4px 6px -1px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.04)';

            return (
              <div
                key={group.id}
                style={{
                  background: cardBg,
                  border: cardBorder,
                  borderLeft: cardBorderLeft,
                  boxShadow: cardShadow,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#f1f5f9'}`,
                    paddingBottom: '10px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    {group.id.startsWith('general') ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <InfoCircleOutlined style={{ color: '#D4A84B', fontSize: '15px' }} />
                        <strong style={{ fontSize: '14.5px', color: themeMode === 'dark' ? '#f8fafc' : '#1e293b' }}>
                          Ghi chú ngoài lịch
                        </strong>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarOutlined style={{ color: '#D4A84B', fontSize: '15px' }} />
                          <strong style={{ fontSize: '14.5px', color: themeMode === 'dark' ? '#f8fafc' : '#1e293b' }}>
                            {group.services && group.services.length > 0 ? group.services.join(', ') : 'Dịch vụ'}
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#888',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>
                            <EnvironmentOutlined /> {group.branchName || 'N/A'}
                          </span>
                          {group.technicianName && (
                            <span>
                              | KTV: <strong>{group.technicianName}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#D4A84B',
                        background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.08)' : '#fefaf0',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: '1px solid rgba(212, 168, 75, 0.15)',
                      }}
                    >
                      {group.formattedDate}
                    </span>
                    {group.bookingDate && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: themeMode === 'dark' ? 'rgba(24, 144, 255, 0.15)' : '#e6f7ff',
                          color: themeMode === 'dark' ? '#40a9ff' : '#1890ff',
                        }}
                      >
                        {getDaysDiffText(group.bookingDate)}
                      </span>
                    )}
                    {group.orderState &&
                      (group.orderState === 'ServiceCompleted' || group.orderState === 'Completed' ? (
                        <CheckOutlined
                          style={{
                            color: '#52c41a',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            marginLeft: '4px',
                          }}
                        />
                      ) : (
                        <Tag
                          color="error"
                          style={{
                            margin: 0,
                            fontWeight: '600',
                            fontSize: '12px',
                          }}
                        >
                          {group.orderState}
                        </Tag>
                      ))}
                  </div>
                </div>

                {/* Card Body - Department Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {group.notes.map((n) => {
                    const deptColors = DEPT_COLORS[n.department] || DEPT_COLORS.KHÁC;

                    const isSameDay =
                      n.date.getFullYear() === group.bookingDate.getFullYear() &&
                      n.date.getMonth() === group.bookingDate.getMonth() &&
                      n.date.getDate() === group.bookingDate.getDate();

                    const displayTime = isSameDay
                      ? n.formattedTime
                      : `${String(n.date.getDate()).padStart(2, '0')}/${String(n.date.getMonth() + 1).padStart(2, '0')} ${n.formattedTime}`;

                    return (
                      <div key={n.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        {/* Department Avatar representation */}
                        <Avatar
                          size={32}
                          src={n.staffAvatar || undefined}
                          style={{
                            backgroundColor: deptColors.avatarBg,
                            color: deptColors.avatarColor,
                            fontWeight: 'bold',
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          {!n.staffAvatar && (n.staffName ? n.staffName.trim().charAt(0).toUpperCase() : '?')}
                        </Avatar>

                        {/* Note Content Block */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                              marginBottom: '4px',
                            }}
                          >
                            <Space size={6}>
                              <span
                                style={{
                                  color: deptColors.color,
                                  background: deptColors.bg,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  fontSize: '10px',
                                }}
                              >
                                {deptColors.label}
                              </span>
                              <span style={{ fontWeight: '600', color: themeMode === 'dark' ? '#e2e8f0' : '#4b5563' }}>
                                {n.staffName}
                              </span>
                            </Space>
                            <span style={{ fontSize: '11px', color: '#888' }}>{displayTime}</span>
                          </div>

                          {/* Note text bubble */}
                          <div
                            style={{
                              background: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                              borderRadius: '8px',
                              padding: '10px 14px',
                              color: themeMode === 'dark' ? '#cbd5e1' : '#334155',
                              fontSize: '13px',
                              whiteSpace: 'pre-wrap',
                              lineHeight: '1.4',
                            }}
                          >
                            {n.note}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <Empty
            description={<span style={{ color: '#888' }}>Không có ghi chú nào được tìm thấy.</span>}
            style={{ padding: '60px 0' }}
          />
        )}
      </div>
    </div>
  );
};
