'use client';

import React from 'react';
import { Card, Space } from 'antd';
import { InboxOutlined, SunOutlined, SyncOutlined } from '@ant-design/icons';

interface ComboBalancesCardProps {
  comboBalances: SafeAny[];
  themeMode: 'light' | 'dark';
  getComboDisplayInfo: (
    serviceName: string,
    normalCount: number,
    retainCount: number,
    packageNormalCount?: number,
    packageKey?: string
  ) => SafeAny;
  onOpenComboModal: () => void;
}

export const ComboBalancesCard: React.FC<ComboBalancesCardProps> = ({
  comboBalances,
  themeMode,
  getComboDisplayInfo,
  onOpenComboModal,
}) => {
  const activeCombos = comboBalances.filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0);

  return (
    <Card
      title={
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
          <InboxOutlined /> GÓI DỊCH VỤ ĐANG CHẠY
        </span>
      }
      size="small"
      styles={{ body: { padding: '16px' } }}
      style={{
        backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
        borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
      }}
    >
      {activeCombos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeCombos.map((cb: SafeAny) => {
            const info = getComboDisplayInfo(
              cb.serviceName,
              cb.normalCount,
              cb.retainCount,
              cb.packageNormalCount,
              cb.packageKey
            );

            return (
              <div
                key={cb.id}
                onClick={onOpenComboModal}
                style={{
                  background: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.05)' : '#fffbe6',
                  border: `1px solid ${themeMode === 'dark' ? 'rgba(250, 140, 22, 0.2)' : '#ffe58f'}`,
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#fa8c16';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(250, 140, 22, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = themeMode === 'dark' ? 'rgba(250, 140, 22, 0.2)' : '#ffe58f';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fa8c16', flex: 1 }}>
                    {cb.serviceName} {cb.packageKey ? `(${cb.packageKey})` : ''}
                  </div>
                  <span style={{ fontSize: '10px', color: '#fa8c16', textDecoration: 'underline' }}>Chi tiết</span>
                </div>

                {/* Warning Badge for Manual Adjustment / Extra sessions */}
                {cb.hasManualAdjustment && (
                  <div
                    style={{
                      marginTop: '4px',
                      marginBottom: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fff2f0',
                      border: `1px solid ${themeMode === 'dark' ? '#ef4444' : '#ffccc7'}`,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#ff4d4f',
                    }}
                  >
                    <span>⚠️ Có lượt cộng thủ công</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    fontSize: '12px',
                    marginTop: '6px',
                    color: themeMode === 'dark' ? '#f1f5f9' : '#334155',
                  }}
                >
                  <Space size={4}>
                    <SunOutlined style={{ color: '#fa8c16', fontSize: '13px' }} />
                    <strong>{cb.normalCount}</strong>
                  </Space>

                  <Space size={4}>
                    <SyncOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                    <strong>{cb.retainCount}</strong>
                  </Space>

                  {cb.dateExpired && (
                    <Space size={4} style={{ marginLeft: 'auto' }}>
                      <span style={{ fontSize: '12px' }}>💀</span>
                      <span style={{ fontSize: '11px', color: '#888' }}>
                        {new Date(cb.dateExpired).toLocaleDateString('vi-VN')}
                      </span>
                    </Space>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    fontSize: '10.5px',
                    marginTop: '6px',
                    color: '#888',
                    borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`,
                    paddingTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>New (Nối mới):</span>
                    <span>
                      <strong>{cb.normalCount}</strong> / {info.totalNew} buổi
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Refill (Dặm):</span>
                    <span>
                      <strong>{cb.retainCount}</strong> / {info.totalRefill} buổi
                    </span>
                  </div>
                  {cb.creatorStaffName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span>Người bán (CC):</span>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#555' }}>{cb.creatorStaffName}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', fontSize: '12px', padding: '12px 0' }}>
          Không có gói combo nào đang chạy.
        </div>
      )}
    </Card>
  );
};
