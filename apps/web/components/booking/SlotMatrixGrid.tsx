'use client';

import React, { useState } from 'react';
import { Row, Col, Spin, theme, Popover, Avatar, Button } from 'antd';
import { EyeOutlined, CopyOutlined } from '@ant-design/icons';
import { SlotMatrixMap, SlotBookingInfo, SafeAny } from '@mos-lab/shared';
import dayjs from 'dayjs';
import { LashDetailModal } from './LashDetailModal';

interface SlotMatrixGridProps {
  slotMatrix: SlotMatrixMap | { [time: string]: { available: number; roster: number; booked?: number; bookings?: SlotBookingInfo[] } };
  loadingSlots: boolean;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
  selectedCN: SafeAny;
  selectedCV?: SafeAny;
  morning: string[];
  afternoon: string[];
  night: string[];
  themeMode: string;
}

const CustomerBookingTooltipContent: React.FC<{
  booking: SlotBookingInfo;
  onOpenDetail: (booking: SlotBookingInfo) => void;
  themeMode: string;
}> = ({ booking, onOpenDetail, themeMode }) => {
  const isDark = themeMode === 'dark';
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent, text?: string | null) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        width: 340,
        maxWidth: '90vw',
        background: isDark ? '#0f172a' : '#ffffff',
        borderRadius: 12,
        padding: 16,
        color: isDark ? '#f1f5f9' : '#0f172a',
        fontSize: '12px',
        lineHeight: 1.4,
      }}
    >
      {/* 1. Header with customer avatar, name, phone, slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar
          size={42}
          src={booking.customerAvatar || undefined}
          style={{
            backgroundColor: '#d4a84b',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '2px solid #d4a84b',
            flexShrink: 0,
          }}
        >
          {booking.customerName.trim().charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: isDark ? '#f1f5f9' : '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {booking.customerName}
          </div>
          {booking.customerPhone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }} className="tabular-nums">
                📞 {booking.customerPhone}
              </span>
              <Button
                type="text"
                size="small"
                onClick={(e) => handleCopy(e, booking.customerPhone)}
                style={{
                  height: 18,
                  padding: '0 4px',
                  fontSize: '10px',
                  color: copied ? '#10b981' : isDark ? '#94a3b8' : '#64748b',
                }}
              >
                {copied ? 'Đã chép' : 'Chép'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Current booking info badge */}
      <div
        style={{
          background: isDark ? '#1e293b' : '#f8fafc',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 8,
          padding: '8px 10px',
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>Đang đặt vào slot:</div>
          <div style={{ fontWeight: 600, color: '#d4a84b', fontSize: '12px' }}>
            {booking.serviceName || 'Dịch vụ nối mi'}
          </div>
        </div>
        <div
          style={{
            background: isDark ? 'rgba(212, 168, 75, 0.2)' : '#fffbe6',
            color: '#d4a84b',
            border: '1px solid #d4a84b',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
          className="tabular-nums"
        >
          {booking.bookingTime} ({booking.duration}p)
        </div>
      </div>

      {/* 2. Chu kỳ giữa 2 lịch */}
      <div
        style={{
          background: isDark ? 'rgba(212, 168, 75, 0.12)' : '#fffdf5',
          border: '1px solid rgba(212, 168, 75, 0.4)',
          borderRadius: 8,
          padding: '8px 10px',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: isDark ? '#fbbf24' : '#b45309', fontSize: '12px' }}>
            🔁 Chu kỳ giữa 2 lịch:
          </span>
          <span
            style={{
              fontWeight: 'bold',
              color: isDark ? '#fbbf24' : '#b45309',
              fontSize: '13px',
            }}
            className="tabular-nums"
          >
            {booking.cycleDays !== null ? `${booking.cycleDays} ngày` : 'Khách mới'}
          </span>
        </div>
        {booking.nextBooking?.inDays && (
          <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#78350f', marginTop: 3 }}>
            📅 Lịch kế tiếp sau: <span className="tabular-nums font-semibold">{booking.nextBooking.inDays} ngày</span>
          </div>
        )}
      </div>

      {/* 3. Lịch vừa rồi và Lịch kế tiếp */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 10,
        }}
      >
        {/* Lịch vừa rồi */}
        <div
          style={{
            background: isDark ? '#1e293b' : '#f8fafc',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: 8,
            padding: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>
            ⏮️ Lịch vừa rồi
          </div>
          {booking.previousBooking ? (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px', color: isDark ? '#f1f5f9' : '#0f172a' }} className="tabular-nums">
                {dayjs(booking.previousBooking.date).format('DD/MM/YYYY')}
              </div>
              <div style={{ fontSize: '11px', color: '#d4a84b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {booking.previousBooking.serviceName}
              </div>
              <div style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b' }}>
                CV: {booking.previousBooking.technicianName}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>
              Chưa có lịch trước
            </div>
          )}
        </div>

        {/* Lịch kế tiếp */}
        <div
          style={{
            background: isDark ? '#1e293b' : '#f8fafc',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: 8,
            padding: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>
            ⏭️ Lịch kế tiếp
          </div>
          {booking.nextBooking ? (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px', color: isDark ? '#f1f5f9' : '#0f172a' }} className="tabular-nums">
                {dayjs(booking.nextBooking.date).format('DD/MM/YYYY')}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {booking.nextBooking.serviceName}
              </div>
              <div style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b' }}>
                CV: {booking.nextBooking.technicianName}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>
              Chưa đặt lịch tới
            </div>
          )}
        </div>
      </div>

      {/* 4. Bộ mi đã nối gần nhất và trượt xuống để xem những bộ kế tiếp */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: isDark ? '#94a3b8' : '#64748b',
            marginBottom: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>👁️ CÁC BỘ MI ĐÃ NỐI ({booking.recentLashSets?.length || 0})</span>
          <span style={{ fontSize: '10px', fontWeight: 'normal', color: isDark ? '#64748b' : '#94a3b8' }}>
            Cuộn xuống để xem
          </span>
        </div>

        <div
          style={{
            maxHeight: 140,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingRight: 4,
          }}
        >
          {(!booking.recentLashSets || booking.recentLashSets.length === 0) ? (
            <div style={{ fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', padding: '6px 0', textAlign: 'center' }}>
              Chưa có dữ liệu bộ mi hoàn tất
            </div>
          ) : (
            booking.recentLashSets.map((set, idx) => (
              <div
                key={set.orderId}
                style={{
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: 6,
                  padding: '6px 8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {idx === 0 && (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: 3,
                          padding: '1px 4px',
                        }}
                      >
                        Gần nhất
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {set.serviceName}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                    <span className="tabular-nums">{dayjs(set.bookingDate).format('DD/MM/YYYY')}</span>
                    {' · '}CV: {set.technicianName}
                  </div>
                </div>

                {/* Photo indicator badges */}
                {(set.beforePhotoUrl || set.afterPhotoUrl) ? (
                  <span
                    style={{
                      background: isDark ? 'rgba(6, 182, 212, 0.15)' : '#ecfeff',
                      color: '#06b6d4',
                      border: '1px solid #06b6d4',
                      borderRadius: 4,
                      padding: '1px 5px',
                      fontSize: '10px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    📸 Có ảnh
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Detail button */}
      <Button
        type="primary"
        block
        icon={<EyeOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail(booking);
        }}
        style={{
          background: 'linear-gradient(135deg, #d4a84b 0%, #b8860b 100%)',
          borderColor: '#b8860b',
          fontWeight: 600,
          borderRadius: 8,
          height: 34,
        }}
      >
        Xem chi tiết & ảnh Before / After
      </Button>
    </div>
  );
};

export const SlotMatrixGrid: React.FC<SlotMatrixGridProps> = ({
  slotMatrix,
  loadingSlots,
  selectedSlot,
  setSelectedSlot,
  selectedCN,
  selectedCV,
  morning,
  afternoon,
  night,
  themeMode,
}) => {
  const { token } = theme.useToken();
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<SlotBookingInfo | null>(null);

  const cvDisplayName = selectedCV ? (selectedCV.displayName || selectedCV.fullName || 'Chuyên viên') : null;

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: token.colorText, marginBottom: '12px' }}>
        {cvDisplayName
          ? `BẢNG KHUNG GIỜ ĐẶT LỊCH - CHUYÊN VIÊN: ${cvDisplayName.toUpperCase()} (${selectedCN?.name || 'Vui lòng chọn chi nhánh'})`
          : `BẢNG KHUNG GIỜ HOẠT ĐỘNG CHI NHÁNH (${selectedCN?.name || 'Vui lòng chọn chi nhánh'})`}
      </h3>

      <Spin spinning={loadingSlots}>
        <div
          style={{
            background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
            borderRadius: '8px',
            padding: '20px',
            maxHeight: 'calc(100vh - 420px)',
            overflowY: 'auto',
          }}
        >
          {/* Slot Matrix Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              fontSize: '11px',
              color: '#888',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            {cvDisplayName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Avatar size={16} style={{ backgroundColor: '#d4a84b', fontSize: '9px' }}>
                  K
                </Avatar>{' '}
                Avatar khách đã đặt slot
              </span>
            )}
            <span>
              <span style={{ color: '#d4a84b' }}>🟡</span> 1-2 chỗ trống
            </span>
            <span>
              <span style={{ color: '#ef4444' }}>🔴</span> 0 chỗ trống (Hết)
            </span>
            <span>
              <span
                style={{
                  padding: '2px 4px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                }}
              >
                -1
              </span>{' '}
              Overbook
            </span>
          </div>

          {/* Render Category slots */}
          {[
            { title: 'Morning (Sáng)', list: morning },
            { title: 'Afternoon (Chiều)', list: afternoon },
            { title: 'Night (Tối)', list: night },
          ].map((cat) => (
            <div key={cat.title} style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  color: '#888',
                  fontSize: '12px',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                }}
              >
                {cat.title}
              </div>
              <Row gutter={[12, 12]}>
                {cat.list.map((time) => {
                  const slotInfo = (slotMatrix as SafeAny)[time] || { available: 0, roster: 0 };
                  const availableVal = slotInfo.available;
                  const isActive = selectedSlot === time;
                  const bookings: SlotBookingInfo[] = slotInfo.bookings || [];
                  const hasBookings = bookings.length > 0;

                  // Available Badge Styles based on rules
                  let badgeStyle: React.CSSProperties = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '22px',
                    height: '22px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    padding: '0 4px',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  };

                  if (availableVal > 2) {
                    badgeStyle = {
                      ...badgeStyle,
                      background: themeMode === 'dark' ? '#0f172a' : '#f3f4f6',
                      color: themeMode === 'dark' ? '#94a3b8' : '#6b7280',
                      border: `1px solid ${themeMode === 'dark' ? '#334155' : '#d9d9d9'}`,
                    };
                  } else if (availableVal === 1 || availableVal === 2) {
                    badgeStyle = {
                      ...badgeStyle,
                      background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#fffbe6',
                      color: themeMode === 'dark' ? '#d4a84b' : '#d46b08',
                      border: `1px solid ${themeMode === 'dark' ? '#d4a84b' : '#ffe58f'}`,
                      borderRadius: '11px',
                      minWidth: '26px',
                    };
                  } else if (availableVal === 0) {
                    badgeStyle = {
                      ...badgeStyle,
                      background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fff1f0',
                      color: '#ef4444',
                      border: `1px solid ${themeMode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#ffccc7'}`,
                      borderRadius: '11px',
                      minWidth: '26px',
                    };
                  } else {
                    badgeStyle = {
                      ...badgeStyle,
                      background: '#ef4444',
                      color: '#ffffff',
                      border: '1px solid #ef4444',
                      borderRadius: '11px',
                      minWidth: '26px',
                    };
                  }

                  // Determine slot frame styles matching the badge colors
                  let frameStyle: React.CSSProperties = {
                    flex: 1,
                    textAlign: 'center',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px',
                    padding: '5px 8px',
                    transition: 'all 0.2s',
                  };

                  if (isActive) {
                    frameStyle = {
                      ...frameStyle,
                      background: '#D4A84B',
                      border: '1px solid #D4A84B',
                      color: '#fff',
                    };
                  } else {
                    if (availableVal > 2) {
                      frameStyle = {
                        ...frameStyle,
                        background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                        border: `1px solid ${themeMode === 'dark' ? '#334155' : '#d9d9d9'}`,
                        color: themeMode === 'dark' ? '#cbd5e1' : '#1f2937',
                      };
                    } else if (availableVal === 1 || availableVal === 2) {
                      frameStyle = {
                        ...frameStyle,
                        background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.08)' : '#fffbe6',
                        border: `1px solid ${themeMode === 'dark' ? '#d4a84b' : '#ffe58f'}`,
                        color: themeMode === 'dark' ? '#d4a84b' : '#d46b08',
                      };
                    } else if (availableVal === 0) {
                      frameStyle = {
                        ...frameStyle,
                        background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : '#fff1f0',
                        border: `1px solid ${themeMode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#ffccc7'}`,
                        color: '#ef4444',
                      };
                    } else {
                      frameStyle = {
                        ...frameStyle,
                        background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fff1f0',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                      };
                    }
                  }

                  return (
                    <Col span={6} key={time}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={frameStyle} onClick={() => setSelectedSlot(time)}>
                          {time}
                        </div>

                        {/* Customer Avatar when booked for this CV */}
                        {hasBookings && (
                          <Popover
                            content={
                              <CustomerBookingTooltipContent
                                booking={bookings[0]}
                                onOpenDetail={(b) => setSelectedBookingForDetail(b)}
                                themeMode={themeMode}
                              />
                            }
                            trigger="hover"
                            placement="top"
                            mouseEnterDelay={0.15}
                            styles={{
                              body: {
                                padding: 0,
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                                border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                                boxShadow:
                                  themeMode === 'dark'
                                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                    : '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                              },
                            }}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBookingForDetail(bookings[0]);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                flexShrink: 0,
                                transition: 'transform 0.15s ease',
                              }}
                              title={`${bookings[0].customerName} (${bookings[0].serviceName || 'Đã đặt'})`}
                            >
                              <Avatar
                                size={26}
                                src={bookings[0].customerAvatar || undefined}
                                style={{
                                  border: '2px solid #d4a84b',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                  backgroundColor: '#d4a84b',
                                  color: '#ffffff',
                                  fontWeight: 'bold',
                                  fontSize: '11px',
                                }}
                              >
                                {bookings[0].customerName ? bookings[0].customerName.trim().charAt(0).toUpperCase() : 'K'}
                              </Avatar>
                              {bookings.length > 1 && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    borderRadius: '50%',
                                    width: '14px',
                                    height: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #fff',
                                  }}
                                >
                                  +{bookings.length - 1}
                                </span>
                              )}
                            </div>
                          </Popover>
                        )}

                        <div style={badgeStyle}>{availableVal}</div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))}
        </div>
      </Spin>

      {/* Full detail modal with Before & After photos */}
      <LashDetailModal
        open={Boolean(selectedBookingForDetail)}
        onClose={() => setSelectedBookingForDetail(null)}
        booking={selectedBookingForDetail}
        themeMode={themeMode}
      />
    </div>
  );
};

export default SlotMatrixGrid;
