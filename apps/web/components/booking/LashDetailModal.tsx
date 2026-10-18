'use client';

import React from 'react';
import { Modal, Tabs, Tag, Image, Avatar, Empty, Button, Typography } from 'antd';
import {
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  PictureOutlined,
  CopyOutlined,
  HistoryOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { SlotBookingInfo, LashSetDetail, SafeAny } from '@mos-lab/shared';
import dayjs from 'dayjs';

const { Text } = Typography;

interface LashDetailModalProps {
  open: boolean;
  onClose: () => void;
  booking: SlotBookingInfo | null;
  themeMode: string;
}

export const LashDetailModal: React.FC<LashDetailModalProps> = ({
  open,
  onClose,
  booking,
  themeMode,
}) => {
  const [copied, setCopied] = React.useState(false);
  const isDark = themeMode === 'dark';

  if (!booking) return null;

  const handleCopyPhone = (phone?: string | null) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setsWithPhotos = (booking.recentLashSets || []).filter(
    (s) => s.beforePhotoUrl || s.afterPhotoUrl
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      destroyOnHidden
      closeIcon={<CloseOutlined style={{ color: isDark ? '#94a3b8' : '#64748b' }} />}
      styles={{
        content: {
          background: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 16,
          padding: 0,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          overflow: 'hidden',
        },
        header: {
          background: isDark ? '#1e293b' : '#f8fafc',
          padding: '16px 24px',
          borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          margin: 0,
        },
        body: {
          padding: '20px 24px',
          maxHeight: 'calc(85vh - 120px)',
          overflowY: 'auto',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #d4a84b, #b8860b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '18px',
            }}
          >
            👁️
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: isDark ? '#f1f5f9' : '#0f172a' }}>
              Chi Tiết Khách Hàng & Bộ Mi: {booking.customerName}
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
              Slot hẹn: <span className="tabular-nums font-semibold">{booking.bookingTime}</span> ({booking.duration} phút) · Dịch vụ: {booking.serviceName || 'Nối mi'}
            </div>
          </div>
        </div>
      }
    >
      {/* Customer summary card */}
      <div
        style={{
          background: isDark ? '#1e293b' : '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Avatar
            size={52}
            src={booking.customerAvatar || undefined}
            style={{
              backgroundColor: '#d4a84b',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '20px',
              border: '2px solid #d4a84b',
            }}
          >
            {booking.customerName.trim().charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: isDark ? '#f1f5f9' : '#0f172a' }}>
              {booking.customerName}
            </div>
            {booking.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }} className="tabular-nums">
                  📞 {booking.customerPhone}
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined style={{ fontSize: '11px' }} />}
                  onClick={() => handleCopyPhone(booking.customerPhone)}
                  style={{ color: copied ? '#10b981' : (isDark ? '#94a3b8' : '#64748b'), padding: '0 4px', height: '20px' }}
                >
                  {copied ? 'Đã chép' : 'Chép'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Cycle days & next appointment highlight pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {booking.cycleDays !== null ? (
            <div
              style={{
                background: isDark ? 'rgba(212, 168, 75, 0.15)' : '#fffbe6',
                border: '1px solid #d4a84b',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                color: isDark ? '#fbbf24' : '#b45309',
                fontWeight: 600,
              }}
            >
              🔁 Chu kỳ: <span className="tabular-nums">{booking.cycleDays}</span> ngày
            </div>
          ) : (
            <div
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                color: isDark ? '#60a5fa' : '#1d4ed8',
                fontWeight: 600,
              }}
            >
              ✨ Khách mới / Chưa ghi nhận lịch trước
            </div>
          )}

          {booking.nextBooking?.inDays && (
            <div
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                color: isDark ? '#34d399' : '#047857',
                fontWeight: 600,
              }}
            >
              📅 Lịch tới sau: <span className="tabular-nums">{booking.nextBooking.inDays}</span> ngày
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Before & After Photo Gallery vs Complete Lash History */}
      <Tabs
        defaultActiveKey="photos"
        items={[
          {
            key: 'photos',
            label: (
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                <PictureOutlined /> Ảnh Before & After ({setsWithPhotos.length})
              </span>
            ),
            children: (
              <div>
                {setsWithPhotos.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '13px' }}>
                        Khách hàng chưa có ảnh chụp Before / After cho các bộ mi trước đây.
                      </span>
                    }
                    style={{ padding: '30px 0' }}
                  />
                ) : (
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {setsWithPhotos.map((set) => (
                        <div
                          key={set.orderId}
                          style={{
                            background: isDark ? '#1e293b' : '#f8fafc',
                            borderRadius: '12px',
                            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          }}
                        >
                          {/* Set metadata */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '14px',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                                {set.serviceName}
                              </span>
                              <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                                <CalendarOutlined style={{ marginRight: '4px' }} />
                                <span className="tabular-nums">{dayjs(set.bookingDate).format('DD/MM/YYYY HH:mm')}</span>
                                {' · '}
                                <UserOutlined style={{ marginRight: '4px' }} />
                                <span>CV: {set.technicianName}</span>
                                {' · '}
                                <ShopOutlined style={{ marginRight: '4px' }} />
                                <span>{set.storeName}</span>
                              </div>
                            </div>
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              {set.orderState}
                            </Tag>
                          </div>

                          {/* Side-by-side Before and After images */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {/* Before Photo */}
                            <div
                              style={{
                                background: isDark ? '#0f172a' : '#ffffff',
                                borderRadius: '8px',
                                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                padding: '10px',
                                textAlign: 'center',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#3b82f6',
                                  marginBottom: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                }}
                              >
                                📸 Trước khi nối (Before)
                              </div>
                              {set.beforePhotoUrl ? (
                                <Image
                                  src={set.beforePhotoUrl}
                                  alt="Trước khi nối"
                                  style={{
                                    width: '100%',
                                    height: '220px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                  }}
                                  fallback="data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23ccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23666%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%3EKh%C3%B4ng%20t%E1%BA%A3i%20%C4%91%C6%B0%E1%BB%A3c%20%E1%BA%A3nh%3C%2Ftext%3E%3C%2Fsvg%3E"
                                />
                              ) : (
                                <div
                                  style={{
                                    height: '220px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isDark ? '#64748b' : '#94a3b8',
                                    fontSize: '12px',
                                    background: isDark ? '#1e293b' : '#f1f5f9',
                                    borderRadius: '6px',
                                  }}
                                >
                                  Không có ảnh chụp trước khi nối
                                </div>
                              )}
                            </div>

                            {/* After Photo */}
                            <div
                              style={{
                                background: isDark ? '#0f172a' : '#ffffff',
                                borderRadius: '8px',
                                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                padding: '10px',
                                textAlign: 'center',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#10b981',
                                  marginBottom: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                }}
                              >
                                ✨ Sau khi hoàn thiện (After)
                              </div>
                              {set.afterPhotoUrl ? (
                                <Image
                                  src={set.afterPhotoUrl}
                                  alt="Sau khi hoàn thiện"
                                  style={{
                                    width: '100%',
                                    height: '220px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                  }}
                                  fallback="data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23ccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23666%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%3EKh%C3%B4ng%20t%E1%BA%A3i%20%C4%91%C6%B0%E1%BB%A3c%20%E1%BA%A3nh%3C%2Ftext%3E%3C%2Fsvg%3E"
                                />
                              ) : (
                                <div
                                  style={{
                                    height: '220px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isDark ? '#64748b' : '#94a3b8',
                                    fontSize: '12px',
                                    background: isDark ? '#1e293b' : '#f1f5f9',
                                    borderRadius: '6px',
                                  }}
                                >
                                  Không có ảnh chụp sau khi nối
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Note if available */}
                          {set.bookingNote && (
                            <div
                              style={{
                                marginTop: '10px',
                                fontSize: '12px',
                                color: isDark ? '#cbd5e1' : '#475569',
                                background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
                                padding: '6px 10px',
                                borderRadius: '6px',
                              }}
                            >
                              💬 Ghi chú: {set.bookingNote}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Image.PreviewGroup>
                )}
              </div>
            ),
          },
          {
            key: 'history',
            label: (
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                <HistoryOutlined /> Lịch Sử Nối Mi ({booking.recentLashSets?.length || 0})
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(booking.recentLashSets || []).length === 0 ? (
                  <Empty description="Chưa có lịch sử nối mi trước đó" />
                ) : (
                  (booking.recentLashSets || []).map((set, idx) => (
                    <div
                      key={set.orderId}
                      style={{
                        background: isDark ? '#1e293b' : '#f8fafc',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              background: '#d4a84b',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                            {set.serviceName}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>
                          <span className="tabular-nums font-semibold">{dayjs(set.bookingDate).format('DD/MM/YYYY HH:mm')}</span>
                          {' · '}
                          <span>CV: {set.technicianName}</span>
                          {' · '}
                          <span>{set.storeName}</span>
                        </div>
                        {set.bookingNote && (
                          <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>
                            💬 {set.bookingNote}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {set.totalPrice ? (
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981' }} className="tabular-nums">
                            {set.totalPrice.toLocaleString('vi-VN')}đ
                          </div>
                        ) : null}
                        <div style={{ marginTop: '4px' }}>
                          {(set.beforePhotoUrl || set.afterPhotoUrl) ? (
                            <Tag color="cyan" icon={<PictureOutlined />}>
                              Có {set.beforePhotoUrl && set.afterPhotoUrl ? '2 ảnh' : '1 ảnh'}
                            </Tag>
                          ) : (
                            <Tag color="default">Chưa có ảnh</Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default LashDetailModal;
