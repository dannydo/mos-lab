'use client';

import { Avatar, Space, Tag } from 'antd';
import { CalendarOutlined, CheckOutlined, EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { DEPT_COLORS, getDaysDiffText, type TimelineGroupedBooking } from './timeline-view-utils';

interface TimelineBookingCardProps {
  group: TimelineGroupedBooking;
  themeMode: 'light' | 'dark';
}

export function TimelineBookingCard({ group, themeMode }: TimelineBookingCardProps) {
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
                    | CV: <strong>{group.technicianName}</strong>
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
}
