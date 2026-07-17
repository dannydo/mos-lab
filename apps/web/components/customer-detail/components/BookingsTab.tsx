'use client';

import React from 'react';
import { Timeline, Tag, Popconfirm, Button } from 'antd';
import { CloseCircleOutlined, CalendarOutlined } from '@ant-design/icons';

interface BookingsTabProps {
  bookings: SafeAny[];
  themeMode: 'light' | 'dark';
  customer: SafeAny;
  handleCancelBooking: (id: number) => void;
  setSelectedBookingForReschedule: (b: SafeAny) => void;
  setRescheduleModalVisible: (visible: boolean) => void;
}

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
        <Timeline
          items={bookings.map((b: SafeAny) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';

            let formattedDate = 'N/A';
            if (b.bookingDate) {
              const d = new Date(b.bookingDate);
              const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
              const dayPrefix = dayPrefixes[d.getDay()];
              formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;
            }

            return {
              key: b.id,
              color: isCompleted ? 'green' : 'red',
              children: (
                <div
                  style={{
                    background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9fafb',
                    border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '-6px',
                    marginBottom: '10px',
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
                      <Tag color={isCompleted ? 'success' : 'error'}>{isCompleted ? 'Hoàn thành' : b.orderState}</Tag>
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
                        CC IN: <strong>{b.ccInName || 'N/A'}</strong>
                      </span>
                      <span>
                        CC OUT: <strong>{b.ccOutName || 'N/A'}</strong>
                      </span>
                      <span>
                        BK: <strong>{b.bookerName || 'N/A'}</strong>
                      </span>
                    </div>
                  </div>
                  {b.bookingNote && (
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontStyle: 'italic',
                        background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                        borderLeft: '3px solid #D4A84B',
                        padding: '6px 10px',
                        marginTop: '8px',
                        borderRadius: '0 4px 4px 0',
                        color: themeMode === 'dark' ? '#d1d5db' : '#374151',
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
              ),
            };
          })}
        />
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Không có lịch sử đặt lịch nào.</div>
      )}
    </div>
  );
};
