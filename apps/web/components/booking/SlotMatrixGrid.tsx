'use client';

import React, { useState } from 'react';
import { Row, Col, Spin, theme, Popover, Avatar } from 'antd';
import { SlotMatrixMap, SlotBookingInfo, SafeAny } from '@mos-lab/shared';
import { LashDetailModal } from './LashDetailModal';
import { SlotBookingTooltipContent } from './SlotBookingTooltipContent';

interface SlotMatrixGridProps {
  slotMatrix:
    | SlotMatrixMap
    | { [time: string]: { available: number; roster: number; booked?: number; bookings?: SlotBookingInfo[] } };
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

  const cvDisplayName = selectedCV ? selectedCV.displayName || selectedCV.fullName || 'Chuyên viên' : null;

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
                              <SlotBookingTooltipContent
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
                                {bookings[0].customerName
                                  ? bookings[0].customerName.trim().charAt(0).toUpperCase()
                                  : 'K'}
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
