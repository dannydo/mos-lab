'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Segmented } from 'antd';
import {
  buildProcessedTimelineGroups,
  TIMELINE_SEGMENT_STORAGE_KEY,
  type TimelineSegment,
} from './timeline-view/timeline-view-utils';
import { TimelineBookingCard } from './timeline-view/TimelineBookingCard';

interface TimelineViewTabProps {
  bookings: SafeAny[];
  notes: SafeAny[];
  calls: SafeAny[];
  themeMode: 'light' | 'dark';
}

export const TimelineViewTab: React.FC<TimelineViewTabProps> = React.memo(({ bookings, notes, calls, themeMode }) => {
  const [activeSegment, setActiveSegment] = useState<TimelineSegment>('all');

  // Load selection from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TIMELINE_SEGMENT_STORAGE_KEY);
      if (saved && ['all', 'booking', 'cc', 'cs'].includes(saved)) {
        setActiveSegment(saved as TimelineSegment);
      }
    }
  }, []);

  const handleSegmentChange = (value: SafeAny) => {
    setActiveSegment(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMELINE_SEGMENT_STORAGE_KEY, value);
    }
  };

  const { processedGroups, totalBookingsWithNotes, totalCcWithNotes, totalCsWithNotes, totalAllWithNotes } = useMemo(
    () => buildProcessedTimelineGroups({ bookings, notes, calls, activeSegment }),
    [bookings, notes, calls, activeSegment]
  );

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
          processedGroups.map((group) => <TimelineBookingCard key={group.id} group={group} themeMode={themeMode} />)
        ) : (
          <Empty
            description={<span style={{ color: '#888' }}>Không có ghi chú nào được tìm thấy.</span>}
            style={{ padding: '60px 0' }}
          />
        )}
      </div>
    </div>
  );
});

TimelineViewTab.displayName = 'TimelineViewTab';
