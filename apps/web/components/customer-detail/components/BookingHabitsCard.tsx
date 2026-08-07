'use client';

import React from 'react';
import { Card } from 'antd';
import {
  EnvironmentOutlined,
  UserOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';

interface BookingHabitsCardProps {
  themeMode: 'light' | 'dark';
  bookings: SafeAny[];
  getFavoriteBranch: (bookings: SafeAny[]) => string;
  getFavoriteTechnicians: (bookings: SafeAny[]) => string;
  getRecentTechnician: (bookings: SafeAny[]) => string;
  getMostFrequentDay: (bookings: SafeAny[]) => string;
  getFavoriteTimeSlot: (bookings: SafeAny[]) => string;
  getRecentVisitTime: (bookings: SafeAny[]) => string;
}

export const BookingHabitsCard: React.FC<BookingHabitsCardProps> = React.memo(
  ({
    themeMode,
    bookings,
    getFavoriteBranch,
    getFavoriteTechnicians,
    getRecentTechnician,
    getMostFrequentDay,
    getFavoriteTimeSlot,
    getRecentVisitTime,
  }) => {
    const favBranch = getFavoriteBranch(bookings);
    const favTech = getFavoriteTechnicians(bookings);
    const recentTech = getRecentTechnician(bookings);
    const favDay = getMostFrequentDay(bookings);
    const favTime = getFavoriteTimeSlot(bookings);
    const recentVisit = getRecentVisitTime(bookings);

    const sectionStyle = {
      padding: '8px 10px',
      borderRadius: '6px',
      background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
      border: `1px solid ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    };

    const titleHeaderStyle = {
      fontSize: '11px',
      color: '#888',
      fontWeight: 'bold',
      textTransform: 'uppercase' as const,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    };

    return (
      <Card
        title={
          <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ScheduleOutlined /> THÓI QUEN ĐẶT LỊCH
          </span>
        }
        size="small"
        styles={{ body: { padding: '12px' } }}
        style={{
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
          marginTop: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Section 1: Địa điểm */}
          <div style={sectionStyle}>
            <div style={titleHeaderStyle}>
              <EnvironmentOutlined style={{ color: '#D4A84B' }} />
              <span>Chi nhánh hay đi</span>
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#fff' : '#1f2937',
                paddingLeft: '18px',
              }}
            >
              {favBranch}
            </div>
          </div>

          {/* Section 2: Nhân sự */}
          <div style={sectionStyle}>
            <div style={titleHeaderStyle}>
              <UserOutlined style={{ color: themeMode === 'dark' ? '#f472b6' : '#db2777' }} />
              <span>Chuyên viên (CV)</span>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '18px', fontSize: '12px' }}
            >
              <div>
                <span style={{ color: '#888' }}>Yêu thích:</span>{' '}
                <strong style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>{favTech}</strong>
              </div>
              <div style={{ marginTop: '2px' }}>
                <span style={{ color: '#888' }}>Gần nhất:</span>{' '}
                <strong style={{ color: themeMode === 'dark' ? '#38bdf8' : '#0284c7' }}>{recentTech}</strong>
              </div>
            </div>
          </div>

          {/* Section 3: Khung giờ ưa thích */}
          <div style={sectionStyle}>
            <div style={titleHeaderStyle}>
              <ClockCircleOutlined style={{ color: '#52c41a' }} />
              <span>Thời gian ưa thích nhất</span>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '18px', fontSize: '12px' }}
            >
              <div>
                <span style={{ color: '#888' }}>Thứ thường đi:</span>{' '}
                <strong style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>{favDay}</strong>
              </div>
              <div style={{ marginTop: '2px' }}>
                <span style={{ color: '#888' }}>Giờ thường đi:</span>{' '}
                <strong style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>{favTime}</strong>
              </div>
            </div>
          </div>

          {/* Section 4: Lần gần nhất */}
          <div style={sectionStyle}>
            <div style={titleHeaderStyle}>
              <HistoryOutlined style={{ color: '#fa8c16' }} />
              <span>Lần đi gần nhất</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fa8c16', paddingLeft: '18px' }}>
              {recentVisit}
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

BookingHabitsCard.displayName = 'BookingHabitsCard';
