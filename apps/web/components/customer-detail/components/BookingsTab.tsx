'use client';

import React, { useState } from 'react';
import { Tag, Button, Skeleton, Tooltip } from 'antd';
import { CloseCircleOutlined, CalendarOutlined, CheckOutlined, HistoryOutlined } from '@ant-design/icons';
import { CancelBookingModal } from '../../booking/CancelBookingModal';
import { BookingAuditLogDrawer } from '../../booking/BookingAuditLogDrawer';
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

export const BookingsTab: React.FC<
  BookingsTabProps & {
    notes?: SafeAny[];
    loading?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    onRefreshDetails?: () => void;
  }
> = ({
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
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [selectedOrderIdForAudit, setSelectedOrderIdForAudit] = useState<{ id: number; key?: string } | null>(null);

  const notesByBookingMap = new Map<string, SafeAny[]>();

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

          if (closestB) {
            targetBookingId = String(closestB.id);
          }
        }
      }

      // Fallback: attach to first/latest booking if no date matched
      if (!targetBookingId && bookings.length > 0) {
        targetBookingId = String(bookings[0].id);
      }

      if (targetBookingId) {
        const list = notesByBookingMap.get(targetBookingId) || [];
        list.push(n);
        notesByBookingMap.set(targetBookingId, list);
      }
    });
  }

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
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {b.services && b.services.length > 0 ? b.services.join(', ') : 'Dịch vụ'}
                  </span>
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
                    <span style={{ fontSize: '12px', color: '#888' }}>{formattedDate}</span>
                    {b.bookingDate && (
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
                        {getDaysDiffText(b.bookingDate)}
                      </span>
                    )}
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
                    color: '#888',
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div>
                    CN: <strong>{b.branchName || '-'}</strong> | CV:{' '}
                    <strong>{b.technicianName && b.technicianName !== 'Kỹ thuật viên' ? b.technicianName : '-'}</strong>
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
                      .filter((n: SafeAny) => !hasBookingNote || (n.note || '').trim() !== (b.bookingNote || '').trim())
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
                        type="primary"
                        size="small"
                        icon={<CalendarRescheduleIcon fontSize={15} />}
                        style={{
                          backgroundColor: '#D4A84B',
                          borderColor: '#D4A84B',
                          color: '#ffffff',
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
};
