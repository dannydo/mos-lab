'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Timeline, Tag, Spin, Empty, Card, Badge } from 'antd';
import { HistoryOutlined, WarningOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api-client';
import { BookingAuditLog } from '@mos-lab/shared';

export interface BookingAuditLogDrawerProps {
  open: boolean;
  orderId: number | null;
  orderKey?: string;
  onClose: () => void;
}

const ACTION_TAG_CONFIG: Record<string, { color: string; label: string }> = {
  CANCEL: { color: 'error', label: '❌ Hủy lịch' },
  RESCHEDULE: { color: 'warning', label: '📅 Dời ngày/giờ' },
  CHANGE_CV: { color: 'processing', label: '💇 Đổi CV' },
  CHANGE_KTV: { color: 'processing', label: '💇 Đổi CV' },
  CHANGE_STORE: { color: 'purple', label: '🏢 Đổi chi nhánh' },
  EDIT: { color: 'default', label: '✏️ Chỉnh sửa đơn' },
};

export const BookingAuditLogDrawer: React.FC<BookingAuditLogDrawerProps> = ({ open, orderId, orderKey, onClose }) => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<BookingAuditLog[]>([]);

  useEffect(() => {
    if (open && orderId) {
      setLoading(true);
      apiClient.bookingAudit
        .getLogsForOrder(orderId)
        .then((res) => {
          if (res.success && res.logs) {
            setLogs(res.logs);
          } else {
            setLogs([]);
          }
        })
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [open, orderId]);

  const isDark = themeMode === 'dark';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HistoryOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />
          <span>Lịch Sử Thao Tác & Truy Vết {orderKey ? `(${orderKey})` : `#${orderId}`}</span>
        </div>
      }
      width={480}
    >
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin tip="Đang tải nhật ký thao tác..." />
        </div>
      ) : logs.length === 0 ? (
        <Empty description="Chưa có nhật ký ghi nhận cho lịch hẹn này" />
      ) : (
        <Timeline
          mode="left"
          items={logs.map((log) => {
            const tagCfg = ACTION_TAG_CONFIG[log.actionType] || { color: 'default', label: log.actionType };
            const oldData = log.oldDataJson ? JSON.parse(log.oldDataJson) : null;
            const newData = log.newDataJson ? JSON.parse(log.newDataJson) : null;

            return {
              color: log.actionType === 'CANCEL' ? 'red' : log.isCrossAction ? 'orange' : 'blue',
              dot: log.isCrossAction ? <WarningOutlined style={{ fontSize: '16px', color: '#f59e0b' }} /> : undefined,
              children: (
                <Card
                  size="small"
                  style={{
                    marginBottom: '12px',
                    borderRadius: '8px',
                    border: log.isCrossAction
                      ? '1px solid #f59e0b'
                      : isDark
                        ? '1px solid #334155'
                        : '1px solid #e2e8f0',
                    background: isDark ? '#1e293b' : '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <Tag color={tagCfg.color}>{tagCfg.label}</Tag>
                    {log.isCrossAction && (
                      <Badge count="⚠️ CAN THIỆP CHÉO" style={{ backgroundColor: '#ef4444', fontSize: '10px' }} />
                    )}
                  </div>

                  {/* Actor & Original Creator */}
                  <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                    <div>
                      <strong>Người thao tác:</strong>{' '}
                      <Tag icon={<UserOutlined />} color="blue">
                        {log.actorStaffName || `#${log.actorStaffId}`}
                      </Tag>
                    </div>
                    {log.originalStaffName && (
                      <div style={{ marginTop: '2px', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Booker tạo đơn gốc: <strong>{log.originalStaffName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  {(log.reasonCategory || log.reasonNote) && (
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isDark ? '#0f172a' : '#ffffff',
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        fontSize: '12px',
                        marginBottom: '6px',
                      }}
                    >
                      {log.reasonCategory && (
                        <div style={{ fontWeight: '600', color: isDark ? '#38bdf8' : '#0284c7' }}>
                          Lý do: {log.reasonCategory}
                        </div>
                      )}
                      {log.reasonNote && (
                        <div style={{ fontStyle: 'italic', color: isDark ? '#cbd5e1' : '#475569' }}>
                          &quot;{log.reasonNote}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Diff */}
                  {oldData && (
                    <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      {oldData.bookingDateStart && (
                        <div>Cũ: {new Date(oldData.bookingDateStart).toLocaleString('vi-VN')}</div>
                      )}
                      {newData?.bookingDateStart && (
                        <div style={{ color: isDark ? '#4ade80' : '#16a34a', fontWeight: '600' }}>
                          Mới: {new Date(newData.bookingDateStart).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ClockCircleOutlined />
                    <span>{new Date(log.dateCreated).toLocaleString('vi-VN')}</span>
                  </div>
                </Card>
              ),
            };
          })}
        />
      )}
    </Drawer>
  );
};
