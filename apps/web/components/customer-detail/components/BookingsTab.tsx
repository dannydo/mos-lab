'use client';

import React from 'react';
import { Tag, Popconfirm, Button } from 'antd';
import { CloseCircleOutlined, CalendarOutlined, CheckOutlined } from '@ant-design/icons';

interface BookingsTabProps {
  bookings: SafeAny[];
  themeMode: 'light' | 'dark';
  customer: SafeAny;
  handleCancelBooking: (id: number) => void;
  setSelectedBookingForReschedule: (b: SafeAny) => void;
  setRescheduleModalVisible: (visible: boolean) => void;
}

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

export const BookingsTab: React.FC<BookingsTabProps> = ({
  bookings,
  themeMode,
  customer,
  handleCancelBooking,
  setSelectedBookingForReschedule,
  setRescheduleModalVisible,
}) => {
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
            if (b.bookingDate) {
              const d = new Date(b.bookingDate);
              const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
              const dayPrefix = dayPrefixes[d.getDay()];
              formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;
            }

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    CN: <strong>{b.branchName}</strong> | CV: <strong>{b.technicianName}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', opacity: 0.85 }}>
                    <span>
                      CC IN: <strong>{b.checkinStaffName || b.ccInName || b.technicianName || 'N/A'}</strong>
                    </span>
                    <span>
                      CC OUT:{' '}
                      <strong>
                        {b.checkoutStaffName ||
                          b.ccOutName ||
                          b.checkinStaffName ||
                          b.ccInName ||
                          b.technicianName ||
                          'N/A'}
                      </strong>
                    </span>
                    <span>
                      BK:{' '}
                      <strong>
                        {b.bookerStaffName ||
                          b.bookerName ||
                          b.checkinStaffName ||
                          b.ccInName ||
                          b.technicianName ||
                          'N/A'}
                      </strong>
                    </span>
                  </div>
                </div>

                {b.bookingNote && b.bookingNote.trim() !== '' && (
                  <div
                    style={{
                      background: themeMode === 'dark' ? '#0f172a' : '#fff',
                      border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#f0f0f0'}`,
                      borderRadius: '6px',
                      padding: '8px 12px',
                      marginTop: '8px',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                      borderLeft: `3px solid ${themeMode === 'dark' ? '#D4A84B' : '#d4b106'}`,
                    }}
                  >
                    Ghi chú đặt lịch: {b.bookingNote}
                  </div>
                )}

                {!isCompleted && b.orderState !== 'Cancelled' && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '10px',
                      gap: '8px',
                    }}
                  >
                    <Popconfirm
                      title="Xác nhận hủy lịch"
                      description="Anh/chị có chắc chắn muốn hủy lịch hẹn này không?"
                      okText="Có, Hủy lịch"
                      cancelText="Không"
                      onConfirm={() => handleCancelBooking(b.id)}
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="default"
                        danger
                        size="small"
                        icon={<CloseCircleOutlined />}
                        style={{ borderRadius: '4px', fontWeight: '600' }}
                      >
                        Hủy lịch
                      </Button>
                    </Popconfirm>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CalendarOutlined />}
                      style={{
                        backgroundColor: '#D4A84B',
                        borderColor: '#D4A84B',
                        color: '#000000',
                        fontWeight: '600',
                        borderRadius: '4px',
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
                      Dời lịch hẹn
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Không có lịch sử đặt lịch nào.</div>
      )}
    </div>
  );
};
