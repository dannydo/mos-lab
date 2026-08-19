'use client';

import React, { useState, useMemo } from 'react';
import { Tag, Button, Skeleton, Tooltip } from 'antd';
import {
  CoffeeOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  CheckOutlined,
  ControlOutlined,
  DollarOutlined,
  HistoryOutlined,
  EditOutlined,
  FrownOutlined,
  FunnelPlotOutlined,
  HeartOutlined,
  SearchOutlined,
  SunOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { CancelBookingModal } from '../../booking/CancelBookingModal';
import { BookingAuditLogDrawer } from '../../booking/BookingAuditLogDrawer';
import { UpdateBookingModal } from '../../UpdateBookingModal';
import { SafeAny } from '@mos-lab/shared';
import CalendarRescheduleIcon from '../../icons/CalendarRescheduleIcon';

interface BookingsTabProps {
  bookings: SafeAny[];
  themeMode: 'light' | 'dark';
  customer: SafeAny;
  handleCancelBooking: (id: number) => void;
  setSelectedBookingForReschedule: (b: SafeAny) => void;
  setRescheduleModalVisible: (visible: boolean) => void;
}

const parseBookingPromoInfo = (rawBookingNote?: string | null, promotionName?: string | null) => {
  let promoTitle: string | null = null;
  let fullPromoText: string | null = null;
  let cleanBookingNote: string = (rawBookingNote || '').trim();

  // Pattern 1: New format: [50%] 💤 Wake Up: Wellcome Back
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

const safeParseDate = (val: SafeAny): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(' ', 'T');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const legacyBookingStatusMeta: Record<string, { label: string; color?: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'gold', icon: <FunnelPlotOutlined /> },
  lead_book: { label: 'Lead Book', color: 'gold', icon: <FunnelPlotOutlined /> },
  new: { label: 'New', color: 'blue', icon: <SunOutlined /> },
  combo: { label: 'Combo', color: 'orange', icon: <SyncOutlined /> },
  combo_last: { label: 'Combo Last', color: 'gold', icon: <DollarOutlined /> },
  combo_expired: { label: 'Combo Expired', color: 'red', icon: <SyncOutlined /> },
  combo_over: { label: 'Combo Over', color: 'purple', icon: <SearchOutlined /> },
  long_time: { label: 'Long Time', color: 'cyan', icon: <CalendarOutlined /> },
  lapser: { label: 'Lapser', color: 'magenta', icon: <HeartOutlined /> },
  occasion: { label: 'Occasion', color: 'geekblue', icon: <CoffeeOutlined /> },
  lost: { label: 'Lost', color: 'default', icon: <FrownOutlined /> },
  game: { label: 'Game', color: 'green', icon: <ControlOutlined /> },
};

const LegacyBookingStatusTags = ({ statuses }: { statuses?: SafeAny[] }) => {
  const uniqueStatuses = Array.from(
    new Map(
      (statuses || [])
        .filter((status) => status?.userServiceType)
        .map((status) => [`${status.serviceName}:${status.userServiceType}`, status])
    ).values()
  );

  if (uniqueStatuses.length === 0) return null;

  return (
    <>
      {uniqueStatuses.map((status) => {
        const metadata = legacyBookingStatusMeta[status.userServiceType] || {
          label: String(status.userServiceType).replaceAll('_', ' '),
          color: 'default',
          icon: <HistoryOutlined />,
        };
        return (
          <Tooltip
            key={`${status.serviceName}:${status.userServiceType}`}
            title={`Tệp khách tại thời điểm đặt lịch (legacy): ${metadata.label} — ${status.serviceName}`}
          >
            <Tag color={metadata.color} icon={metadata.icon} style={{ margin: 0 }}>
              {metadata.label}
            </Tag>
          </Tooltip>
        );
      })}
    </>
  );
};

export const BookingsTab: React.FC<
  BookingsTabProps & {
    notes?: SafeAny[];
    loading?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    onRefreshDetails?: () => void;
  }
> = React.memo(
  ({
    bookings,
    notes,
    themeMode,
    customer,
    handleCancelBooking,
    setSelectedBookingForReschedule,
    setRescheduleModalVisible,
    loading = false,
    hasMore = false,
    onLoadMore,
    onRefreshDetails,
  }) => {
    // Pre-map notes (CC, CS, Pinned) to bookings (by orderId or closest date)
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<SafeAny | null>(null);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<SafeAny | null>(null);
    const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
    const [selectedOrderIdForAudit, setSelectedOrderIdForAudit] = useState<{ id: number; key?: string } | null>(null);
    const mutedTextColor = themeMode === 'dark' ? '#cbd5e1' : '#475569';
    const infoTextColor = themeMode === 'dark' ? '#60a5fa' : '#1d4ed8';
    const goldTextColor = themeMode === 'dark' ? '#D4A84B' : '#855b0e';

    const notesByBookingMap = useMemo(() => {
      const map = new Map<string, SafeAny[]>();

      if (notes && notes.length > 0 && bookings.length > 0) {
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
              if (closestB && minDiff <= 12 * 60 * 60 * 1000) {
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
      }

      return map;
    }, [notes, bookings]);

    const bookingCycleMap = useMemo(() => {
      const map = new Map<
        number,
        {
          cycleDays: number | null;
          isFirstOrder: boolean;
          prevCompletedDateStr: string | null;
        }
      >();

      if (!bookings || bookings.length === 0) return map;

      const completedList = bookings
        .filter((b: SafeAny) => b.orderState === 'ServiceCompleted' || b.orderState === 'Completed')
        .map((b: SafeAny) => ({
          id: Number(b.id),
          date: safeParseDate(b.bookingDate),
        }))
        .filter((b): b is { id: number; date: Date } => b.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      bookings.forEach((b: SafeAny) => {
        const bId = Number(b.id);
        const bDate = safeParseDate(b.bookingDate);

        if (!bDate) {
          map.set(bId, { cycleDays: null, isFirstOrder: false, prevCompletedDateStr: null });
          return;
        }

        const prevCompleted = completedList.filter((cb) => cb.id !== bId && cb.date.getTime() <= bDate.getTime()).pop();

        if (!prevCompleted) {
          map.set(bId, { cycleDays: null, isFirstOrder: true, prevCompletedDateStr: null });
        } else {
          const diffTime = bDate.getTime() - prevCompleted.date.getTime();
          const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
          const dayPrefix = dayPrefixes[prevCompleted.date.getDay()];
          const formattedPrevDate = `${dayPrefix}, ${prevCompleted.date.toLocaleDateString('vi-VN')}`;

          map.set(bId, {
            cycleDays: diffDays,
            isFirstOrder: false,
            prevCompletedDateStr: formattedPrevDate,
          });
        }
      });

      return map;
    }, [bookings]);

    return (
      <div
        className="custom-scrollbar"
        style={{
          maxHeight: 'calc(100vh - 240px)',
          overflowY: 'auto',
          padding: '10px 4px 10px 10px',
        }}
      >
        {bookings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.map((b: SafeAny) => {
              const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';

              let formattedDate = 'N/A';
              const bParsedDate = safeParseDate(b.bookingDate);
              if (bParsedDate) {
                const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const dayPrefix = dayPrefixes[bParsedDate.getDay()];
                formattedDate = `${dayPrefix}, ${bParsedDate.toLocaleString('vi-VN')}`;
              }

              const attachedNotes = notesByBookingMap.get(String(b.id)) || [];
              const bookerAuthorName = b.bookerStaffName || b.bookerName || 'Đặt trực tuyến';

              // Parse promotion info and clean bookingNote
              const promoInfo = parseBookingPromoInfo(b.bookingNote, b.promotionName || b.campaignPromotion);
              const cleanNoteText = promoInfo.cleanBookingNote;
              const hasBookingNote = Boolean(cleanNoteText && cleanNoteText.trim() !== '');
              const hasAttachedNotes = attachedNotes.length > 0;

              return (
                <div
                  key={b.id}
                  style={{
                    background: isCompleted
                      ? themeMode === 'dark'
                        ? 'rgba(255, 255, 255, 0.02)'
                        : '#f9fafb'
                      : themeMode === 'dark'
                        ? 'rgba(239, 68, 68, 0.03)'
                        : '#fff5f5',
                    border: isCompleted
                      ? `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`
                      : '1px solid #ff4d4f',
                    borderLeft: isCompleted ? '4px solid #52c41a' : '4px solid #ff4d4f',
                    boxShadow: isCompleted ? 'none' : '0 0 10px rgba(255, 77, 79, 0.15)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {b.services && b.services.length > 0 ? b.services.join(', ') : 'Dịch vụ'}
                      </span>
                      <LegacyBookingStatusTags statuses={b.serviceStatuses} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {promoInfo.promoTitle && (
                        <Tooltip title={promoInfo.fullPromoText || promoInfo.promoTitle}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: themeMode === 'dark' ? 'rgba(168, 85, 247, 0.18)' : '#faf5ff',
                              color: themeMode === 'dark' ? '#c084fc' : '#7e22ce',
                              border: `1px solid ${themeMode === 'dark' ? 'rgba(192, 132, 252, 0.35)' : '#e9d5ff'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            <span>🎁</span>
                            <span>{promoInfo.promoTitle}</span>
                          </span>
                        </Tooltip>
                      )}
                      <span style={{ fontSize: '12px', color: mutedTextColor }}>{formattedDate}</span>
                      {b.bookingDate && (
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: themeMode === 'dark' ? 'rgba(24, 144, 255, 0.15)' : '#e6f7ff',
                            color: infoTextColor,
                          }}
                        >
                          {getDaysDiffText(b.bookingDate)}
                        </span>
                      )}
                      {(() => {
                        const cycleInfo = bookingCycleMap.get(Number(b.id));
                        if (!cycleInfo) return null;

                        if (cycleInfo.isFirstOrder) {
                          return (
                            <Tooltip title="Đơn đặt lịch hoàn tất đầu tiên của khách hàng">
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: themeMode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9',
                                  color: mutedTextColor,
                                  border: `1px solid ${themeMode === 'dark' ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1'}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <SyncOutlined style={{ fontSize: '10px' }} />
                                <span>Chu kỳ: Đơn đầu</span>
                              </span>
                            </Tooltip>
                          );
                        }

                        if (cycleInfo.cycleDays !== null) {
                          const hasCombo = Boolean(customer?.hasComboPackage || customer?.hasCombo);
                          const maxLimit = hasCombo ? 25 : 21;
                          const isOverdue = cycleInfo.cycleDays > maxLimit;

                          let bg = themeMode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5';
                          let color = themeMode === 'dark' ? '#34d399' : '#047857';
                          let border = `1px solid ${themeMode === 'dark' ? 'rgba(52, 211, 153, 0.3)' : '#a7f3d0'}`;

                          if (isOverdue) {
                            bg = themeMode === 'dark' ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb';
                            color = themeMode === 'dark' ? '#fbbf24' : '#b45309';
                            border = `1px solid ${themeMode === 'dark' ? 'rgba(251, 191, 36, 0.35)' : '#fde68a'}`;
                          }

                          const tooltipText = `Chu kỳ: ${cycleInfo.cycleDays} ngày (tính từ đơn hoàn tất liền trước: ${cycleInfo.prevCompletedDateStr || 'N/A'}${isOverdue ? ` - Quá hạn dặm >${maxLimit} ngày` : ''})`;

                          return (
                            <Tooltip title={tooltipText}>
                              <span
                                className="tabular-nums"
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: bg,
                                  color: color,
                                  border: border,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <SyncOutlined style={{ fontSize: '10px' }} />
                                <span>Chu kỳ: {cycleInfo.cycleDays} ngày</span>
                              </span>
                            </Tooltip>
                          );
                        }

                        return null;
                      })()}
                      {isCompleted ? (
                        <CheckOutlined
                          style={{
                            color: '#52c41a',
                            fontSize: '16px',
                            fontWeight: 'bold',
                          }}
                        />
                      ) : (
                        <Tag color="error" style={{ margin: 0 }}>
                          {b.orderState}
                        </Tag>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: mutedTextColor,
                      marginTop: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div>
                      CN: <strong>{b.branchName || '-'}</strong> | CV:{' '}
                      <strong>
                        {b.technicianName && b.technicianName !== 'Kỹ thuật viên' && b.technicianName !== 'Chuyên viên'
                          ? b.technicianName
                          : '-'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', opacity: 0.85 }}>
                      <span>
                        CC IN: <strong>{b.checkinStaffName || b.ccInName || '-'}</strong>
                      </span>
                      <span>
                        CC OUT: <strong>{b.checkoutStaffName || b.ccOutName || '-'}</strong>
                      </span>
                      <span>
                        BK: <strong>{b.bookerStaffName || b.bookerName || '-'}</strong>
                      </span>
                    </div>
                  </div>

                  {(hasBookingNote || hasAttachedNotes) && (
                    <div
                      style={{
                        background: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                        border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '8px 12px',
                        marginTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        borderLeft: `3px solid ${themeMode === 'dark' ? '#D4A84B' : '#d4b106'}`,
                      }}
                    >
                      {hasBookingNote && (
                        <div
                          style={{
                            fontSize: '13px',
                            color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: themeMode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                              color: themeMode === 'dark' ? '#818cf8' : '#4338ca',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            CC
                          </span>
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: themeMode === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                              {b.ccInName || b.ccOutName || b.bookerStaffName || 'CC'}:
                            </strong>
                            <div
                              style={{
                                marginTop: '2px',
                                fontStyle: 'italic',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                lineHeight: '1.5',
                                color: themeMode === 'dark' ? '#e2e8f0' : '#334155',
                              }}
                            >
                              {cleanNoteText}
                            </div>
                          </div>
                        </div>
                      )}

                      {attachedNotes
                        .filter(
                          (n: SafeAny) => !hasBookingNote || (n.note || '').trim() !== (b.bookingNote || '').trim()
                        )
                        .map((n: SafeAny) => {
                          const isCcNote = n.noteFieldKey === 'order_note';
                          const isPinned = Boolean(n.isSticky);
                          const badgeLabel = isCcNote ? 'CC' : isPinned ? '📌 Note' : 'CS';
                          const staffAuthor = n.staffName || (isCcNote ? 'CC' : 'Nhân viên');
                          const parsedNDate = safeParseDate(n.dateCreated);

                          return (
                            <div
                              key={n.id}
                              style={{
                                fontSize: '13px',
                                color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                                display: 'flex',
                                gap: '6px',
                                alignItems: 'flex-start',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: isPinned
                                    ? themeMode === 'dark'
                                      ? 'rgba(239, 68, 68, 0.2)'
                                      : '#fff1f0'
                                    : isCcNote
                                      ? themeMode === 'dark'
                                        ? 'rgba(99, 102, 241, 0.2)'
                                        : '#e0e7ff'
                                      : themeMode === 'dark'
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : '#d1fae5',
                                  color: isPinned
                                    ? themeMode === 'dark'
                                      ? '#f87171'
                                      : '#cf1322'
                                    : isCcNote
                                      ? themeMode === 'dark'
                                        ? '#818cf8'
                                        : '#4338ca'
                                      : themeMode === 'dark'
                                        ? '#34d399'
                                        : '#047857',
                                  flexShrink: 0,
                                  marginTop: '2px',
                                }}
                              >
                                {badgeLabel}
                              </span>
                              <div style={{ flex: 1 }}>
                                <strong style={{ color: themeMode === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                                  {staffAuthor}
                                  {parsedNDate && (
                                    <span
                                      className="tabular-nums"
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 'normal',
                                        opacity: 0.7,
                                        marginLeft: '4px',
                                      }}
                                    >
                                      ({parsedNDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
                                    </span>
                                  )}
                                  :
                                </strong>
                                <div
                                  style={{
                                    marginTop: '2px',
                                    fontStyle: 'italic',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.5',
                                    color: themeMode === 'dark' ? '#e2e8f0' : '#334155',
                                  }}
                                >
                                  {n.note}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '10px',
                      gap: '8px',
                    }}
                  >
                    <Button
                      type="default"
                      size="small"
                      icon={<HistoryOutlined />}
                      style={{ borderRadius: '4px', fontSize: '12px' }}
                      className="tabular-nums"
                      onClick={() => {
                        setSelectedOrderIdForAudit({ id: b.id, key: b.orderKey });
                        setAuditDrawerOpen(true);
                      }}
                    >
                      Nhật ký thao tác{b.auditLogCount !== undefined ? ` (${b.auditLogCount})` : ''}
                    </Button>

                    {!isCompleted && b.orderState !== 'Cancelled' && (
                      <>
                        <Button
                          type="default"
                          danger
                          size="small"
                          icon={<CloseCircleOutlined />}
                          style={{ borderRadius: '4px', fontWeight: '600' }}
                          onClick={() => {
                            setSelectedBookingForCancel({
                              id: b.id,
                              orderKey: b.orderKey,
                              dateCreated: b.dateCreated,
                              bookingDate: b.bookingDate,
                              createdStaffId: b.createdStaffId,
                              createdStaffName: b.createdStaffName || b.bookerName,
                              customerName: customer?.name || 'Khách Hàng',
                            });
                            setCancelModalOpen(true);
                          }}
                        >
                          Hủy lịch
                        </Button>

                        <Button
                          type="default"
                          size="small"
                          icon={<EditOutlined />}
                          style={{
                            borderRadius: '4px',
                            borderColor: infoTextColor,
                            color: infoTextColor,
                            fontWeight: '600',
                          }}
                          onClick={() => {
                            setSelectedBookingForUpdate(b);
                            setUpdateModalOpen(true);
                          }}
                        >
                          Cập nhật
                        </Button>

                        <Button
                          type="primary"
                          size="small"
                          icon={<CalendarRescheduleIcon fontSize={15} />}
                          style={{
                            backgroundColor: '#D4A84B',
                            borderColor: '#D4A84B',
                            color: '#0f172a',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => {
                            setSelectedBookingForReschedule({
                              ...b,
                              customerName: customer?.name || 'Khách Hàng',
                              customerPhone: customer?.phone || '',
                              customerId: customer?.id,
                            });
                            setRescheduleModalVisible(true);
                          }}
                        >
                          Đổi lịch
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '16px' }}>
                <Button onClick={onLoadMore} loading={loading} type="default">
                  Tải thêm lịch sử đặt lịch
                </Button>
              </div>
            )}
          </div>
        ) : loading ? (
          <div style={{ padding: '16px 0' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: themeMode === 'dark' ? '#141414' : '#fafafa',
                  border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                }}
              >
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Không có lịch sử đặt lịch nào.</div>
        )}

        {/* Cancel Booking Modal */}
        <CancelBookingModal
          open={cancelModalOpen}
          booking={selectedBookingForCancel}
          currentStaffId={customer?.assignedStaff?.id}
          onCancel={() => {
            setCancelModalOpen(false);
            setSelectedBookingForCancel(null);
          }}
          onSuccess={() => {
            setCancelModalOpen(false);
            setSelectedBookingForCancel(null);
            if (onRefreshDetails) {
              onRefreshDetails();
            } else if (selectedBookingForCancel?.id) {
              window.location.reload();
            }
          }}
        />

        {/* Update Booking Modal */}
        <UpdateBookingModal
          visible={updateModalOpen}
          booking={selectedBookingForUpdate}
          onClose={() => {
            setUpdateModalOpen(false);
            setSelectedBookingForUpdate(null);
          }}
          onSuccess={() => {
            setUpdateModalOpen(false);
            setSelectedBookingForUpdate(null);
            if (onRefreshDetails) {
              onRefreshDetails();
            }
          }}
        />

        {/* Booking Audit Log Drawer */}
        <BookingAuditLogDrawer
          open={auditDrawerOpen}
          orderId={selectedOrderIdForAudit?.id || null}
          orderKey={selectedOrderIdForAudit?.key}
          onClose={() => {
            setAuditDrawerOpen(false);
            setSelectedOrderIdForAudit(null);
          }}
        />
      </div>
    );
  }
);

BookingsTab.displayName = 'BookingsTab';
