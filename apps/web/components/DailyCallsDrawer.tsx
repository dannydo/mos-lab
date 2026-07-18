'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Drawer, Space, theme } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { usePathname, useSearchParams } from 'next/navigation';
import DailyCallsTable from './DailyCallsTable';
import { useTheme } from '../context/ThemeContext';

interface DailyCallsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function DailyCallsDrawer({ open, onClose }: DailyCallsDrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  // Resize state
  const [drawerWidth, setDrawerWidth] = useState<number>(1100);
  const [isResizing, setIsResizing] = useState(false);

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('mos_daily_calls_drawer_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed > 400) {
          setDrawerWidth(parsed);
        }
      }
    }
  }, []);

  // Handle drag resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Since Drawer is anchored to the right, width increases as mouse moves left
      const newWidth = window.innerWidth - moveEvent.clientX;
      // Constrain width between 500px and window width minus offset
      const clampedWidth = Math.max(500, Math.min(window.innerWidth - 50, newWidth));
      setDrawerWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Persist the final width to localStorage
      setDrawerWidth((currentWidth) => {
        localStorage.setItem('mos_daily_calls_drawer_width', currentWidth.toString());
        return currentWidth;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Dynamically resolve scope based on active route when Drawer is opened
  const resolvedScope = useMemo(() => {
    if (!open) return 'all'; // default fallthrough

    if (pathname.includes('/dashboard/nyc')) {
      return 'nyc';
    }

    const assignedStaffId = searchParams.get('assignedStaffId');
    if (pathname.includes('/dashboard/customers') && assignedStaffId === 'me') {
      return 'me';
    }

    return 'all';
  }, [pathname, searchParams, open]);

  return (
    <Drawer
      title={
        <Space size="small">
          <PhoneOutlined style={{ color: '#D4A84B', fontSize: '18px' }} />
          <span style={{ fontWeight: 'bold' }}>Lịch sử cuộc gọi trong ngày</span>
        </Space>
      }
      placement="right"
      width={drawerWidth}
      onClose={onClose}
      open={open}
      styles={{
        body: {
          padding: '24px 16px',
          background: themeMode === 'dark' ? '#0b0f19' : '#ffffff',
          position: 'relative', // required for absolute position handle
        },
        header: {
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: themeMode === 'dark' ? '#0b0f19' : '#ffffff',
        },
      }}
      destroyOnClose
    >
      {/* Absolute resize handle on the left edge of the Drawer body content */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: 'ew-resize',
          zIndex: 1000,
          background: isResizing
            ? 'rgba(212, 168, 75, 0.4)' // highlight with gold alpha during drag
            : 'transparent',
          transition: 'background 0.2s',
        }}
        title="Kéo để thay đổi độ rộng"
      />

      <DailyCallsTable initialScope={resolvedScope} isDrawerMode={true} />
    </Drawer>
  );
}
