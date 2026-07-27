'use client';

import React from 'react';
import { Timeline, Button, Tooltip, Skeleton } from 'antd';
import { WarningOutlined, ClockCircleOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons';

interface NotesTabProps {
  notes: SafeAny[];
  themeMode: 'light' | 'dark';
  currentUser?: SafeAny;
  onPinToggle?: (noteId: number, currentSticky: boolean) => Promise<void>;
  unpinLoading?: boolean;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  themeMode,
  currentUser,
  onPinToggle,
  unpinLoading,
  loading = false,
  hasMore = false,
  onLoadMore,
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
      {notes.length > 0 ? (
        <>
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
                  <ClockCircleOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                ),
                children: (
                  <div
                    style={{
                      background: isSticky
                        ? themeMode === 'dark'
                          ? '#2a1215'
                          : '#fff1f0'
                        : themeMode === 'dark'
                          ? '#141414'
                          : '#fafafa',
                      border: `1px solid ${
                        isSticky
                          ? themeMode === 'dark'
                            ? '#5c1d24'
                            : '#ffa39e'
                          : themeMode === 'dark'
                            ? '#303030'
                            : '#f0f0f0'
                      }`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{formattedDate}</span>
                      {onPinToggle && (
                        <Tooltip title={isSticky ? 'Bỏ ghim' : 'Ghim ghi chú'}>
                          <Button
                            type="text"
                            size="small"
                            loading={unpinLoading}
                            icon={isSticky ? <PushpinFilled style={{ color: '#ff4d4f' }} /> : <PushpinOutlined />}
                            onClick={() => onPinToggle(n.id, isSticky)}
                          />
                        </Tooltip>
                      )}
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
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '16px' }}>
              <Button onClick={onLoadMore} loading={loading} type="default">
                Tải thêm ghi chú
              </Button>
            </div>
          )}
        </>
      ) : loading ? (
        <div style={{ padding: '16px 0' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                marginBottom: '16px',
                padding: '16px',
                borderRadius: '8px',
                background: themeMode === 'dark' ? '#141414' : '#fafafa',
                border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
              }}
            >
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>Không có nhật ký ghi chú nào.</div>
      )}
    </div>
  );
};
