'use client';

import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    window.location.href = '/dashboard/customers';
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#888888', margin: 0, fontSize: '14px' }}>Đang chuyển hướng sang Danh Sách Khách Hàng...</p>
      </div>
    </div>
  );
}
