'use client';

import React from 'react';
import { Tag, Space } from 'antd';

interface CallsTabProps {
  calls: SafeAny[];
  themeMode: 'light' | 'dark';
}

export const CallsTab: React.FC<CallsTabProps> = ({ calls, themeMode }) => {
  return (
    <div
      className="custom-scrollbar"
      style={{
        maxHeight: 'calc(100vh - 240px)',
        overflowY: 'auto',
        padding: '10px 4px 10px 10px',
      }}
    >
      {calls.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {calls.map((c: SafeAny) => {
            const d = new Date(c.createdAt);
            const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const dayPrefix = dayPrefixes[d.getDay()];
            const formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;

            const callColor =
              c.callResult === 'ANSWERED' ? '#52c41a' : c.callResult === 'NO_ANSWER' ? '#fa8c16' : '#ff4d4f';

            return (
              <div
                key={c.id}
                style={{
                  background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9fafb',
                  border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                  borderLeft: `4px solid ${callColor}`,
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <Space>
                    <Tag color={c.callType === 'OUTBOUND' ? 'blue' : 'purple'}>
                      {c.callType === 'OUTBOUND' ? 'Gọi đi' : 'Gọi đến'}
                    </Tag>
                    <Tag
                      color={
                        c.callResult === 'ANSWERED' ? 'success' : c.callResult === 'NO_ANSWER' ? 'warning' : 'error'
                      }
                    >
                      {c.callResult === 'ANSWERED'
                        ? 'Đã nghe máy'
                        : c.callResult === 'NO_ANSWER'
                          ? 'Không nghe'
                          : 'Bận/Bị chặn'}
                    </Tag>
                  </Space>
                  <span style={{ fontSize: '11.5px', color: '#888' }}>{formattedDate}</span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    marginTop: '6px',
                    color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                  }}
                >
                  <strong>Nội dung cuộc gọi:</strong> {c.note || 'Không có ghi chú chi tiết'}
                </div>
                {c.outcome && (
                  <div style={{ marginTop: '6px', fontSize: '12px' }}>
                    Kết quả: <Tag color="cyan">{c.outcome}</Tag>
                  </div>
                )}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    marginTop: '8px',
                    borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`,
                    paddingTop: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Nhân viên cuộc gọi: <strong>{c.staffName}</strong>
                  </span>
                  <span>
                    Thời lượng: <strong>{c.durationSec ? `${c.durationSec}s` : '0s'}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
          Chưa có lịch sử cuộc gọi nào được ghi nhận.
        </div>
      )}
    </div>
  );
};
