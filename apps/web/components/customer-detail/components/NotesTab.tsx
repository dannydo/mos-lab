'use client';

import React from 'react';
import { Timeline, Button, Tooltip } from 'antd';
import { WarningOutlined, ClockCircleOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons';

interface NotesTabProps {
  notes: SafeAny[];
  themeMode: 'light' | 'dark';
  currentUser?: SafeAny;
  onPinToggle?: (noteId: number, currentSticky: boolean) => Promise<void>;
  unpinLoading?: boolean;
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes, themeMode, currentUser, onPinToggle, unpinLoading }) => {
  return (
    <div
      className="custom-scrollbar"
      style={{
        maxHeight: 'calc(100vh - 240px)',
        overflowY: 'auto',
        padding: '10px 4px 10px 10px',
      }}
    >
      {notes.length > 0 ? (
        <Timeline
          items={notes.map((n: SafeAny) => {
            const isSticky = n.isSticky;
            let formattedDate = 'N/A';
            if (n.dateCreated) {
              const d = new Date(n.dateCreated);
              const dayPrefixes = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
              const dayPrefix = dayPrefixes[d.getDay()];
              formattedDate = `${dayPrefix}, ${d.toLocaleString('vi-VN')}`;
            }

            return {
              key: n.id,
              dot: isSticky ? (
                <WarningOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
              ) : (
                <ClockCircleOutlined style={{ fontSize: '14px' }} />
              ),
              children: (
                <div
                  style={{
                    background: isSticky
                      ? themeMode === 'dark'
                        ? 'rgba(255, 77, 79, 0.05)'
                        : '#fff1f0'
                      : themeMode === 'dark'
                        ? 'rgba(255, 255, 255, 0.02)'
                        : '#f9fafb',
                    border: `1px solid ${isSticky ? '#ffccc7' : themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '0px',
                    marginBottom: '10px',
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
                    {isSticky ? (
                      <span
                        style={{
                          color: '#f5222d',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <WarningOutlined /> Ghi chú quan trọng
                      </span>
                    ) : (
                      <span />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#888' }}>{formattedDate}</span>
                      {currentUser?.role === 'admin' && onPinToggle && (
                        <Tooltip title={isSticky ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú'}>
                          <Button
                            type="text"
                            size="small"
                            onClick={() => onPinToggle(n.id, isSticky)}
                            loading={unpinLoading}
                            style={{
                              padding: '0 4px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isSticky ? '#ff4d4f' : undefined,
                            }}
                            icon={isSticky ? <PushpinFilled /> : <PushpinOutlined />}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '13.5px',
                      marginTop: '6px',
                      fontWeight: isSticky ? '500' : 'normal',
                      color: themeMode === 'dark' ? '#e2e8f0' : '#1f2937',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {n.note}
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#888',
                      marginTop: '8px',
                      borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`,
                      paddingTop: '4px',
                    }}
                  >
                    Tạo bởi: <strong>{n.staffName}</strong>
                  </div>
                </div>
              ),
            };
          })}
        />
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Không có nhật ký ghi chú nào.</div>
      )}
    </div>
  );
};
