'use client';

import React from 'react';
import { Card, Tag } from 'antd';
import { ShareAltOutlined, SketchOutlined } from '@ant-design/icons';

interface ReferralCardProps {
  data: SafeAny;
  themeMode: 'light' | 'dark';
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ data, themeMode }) => {
  const mutedTextColor = themeMode === 'dark' ? '#cbd5e1' : '#475569';
  return (
    <Card
      title={
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
          <ShareAltOutlined /> GIỚI THIỆU KHÁCH HÀNG
        </span>
      }
      size="small"
      styles={{ body: { padding: '16px' } }}
      style={{
        backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
        borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
        marginTop: '12px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Referred By Section */}
        <div>
          <div
            style={{
              fontSize: '11px',
              color: mutedTextColor,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Được giới thiệu bởi
          </div>
          {data?.referrer ? (
            <div
              style={{
                padding: '10px',
                background: themeMode === 'dark' ? 'rgba(82, 196, 26, 0.05)' : '#f6ffed',
                border: `1px solid ${themeMode === 'dark' ? 'rgba(82, 196, 26, 0.2)' : '#b7eb8f'}`,
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 'bold', color: themeMode === 'dark' ? '#4ade80' : '#389e0d' }}>
                {data.referrer.name}
              </div>
              <div style={{ color: mutedTextColor, marginTop: '2px' }}>SĐT: {data.referrer.phone}</div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: mutedTextColor, fontStyle: 'italic' }}>
              Tự đăng ký (Không có người giới thiệu)
            </div>
          )}
        </div>

        {/* Referred List Section */}
        <div>
          <div
            style={{
              fontSize: '11px',
              color: mutedTextColor,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Danh sách đã giới thiệu ({data?.referredUsers?.length || 0})
          </div>
          {data?.referredUsers && data.referredUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.referredUsers.map((ru: SafeAny) => (
                <div
                  key={ru.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
                    border: `1px solid ${themeMode === 'dark' ? '#334155' : '#f0f0f0'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>
                      {ru.name}
                    </div>
                    <div style={{ fontSize: '11px', color: mutedTextColor, marginTop: '1px' }}>
                      {ru.phone} {ru.dateCreated ? `• ${new Date(ru.dateCreated).toLocaleDateString('vi-VN')}` : ''}
                    </div>
                  </div>
                  {ru.rewardDiamonds > 0 ? (
                    <Tag
                      color="success"
                      style={{
                        fontWeight: 'bold',
                        margin: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>+{ru.rewardDiamonds}</span>
                      <SketchOutlined style={{ color: '#0ea5e9' }} />
                    </Tag>
                  ) : (
                    <span style={{ fontSize: '11px', color: mutedTextColor }}>Chưa nhận thưởng</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: mutedTextColor, fontStyle: 'italic' }}>
              Chưa giới thiệu khách hàng nào.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
