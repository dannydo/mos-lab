import React, { useState } from 'react';
import { Card, Space, Button, Tooltip, Tag, Popconfirm, message } from 'antd';
import { InboxOutlined, SunOutlined, SyncOutlined, CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CopyComboModal } from './CopyComboModal';
import { ElsaReservationModal } from './ElsaReservationModal';
import { apiClient } from '../../../lib/api-client';
import { Customer } from '@mos-lab/shared';

interface ComboBalancesCardProps {
  comboBalances: SafeAny[];
  customerName?: string;
  customerId?: number;
  customer?: Customer;
  onRefreshCustomer?: () => void;
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

export const ComboBalancesCard: React.FC<ComboBalancesCardProps> = React.memo(
  ({
    comboBalances,
    customerName,
    customerId,
    customer,
    onRefreshCustomer,
    themeMode,
    getComboDisplayInfo,
    onOpenComboModal,
  }) => {
    const [selectedCopyCombo, setSelectedCopyCombo] = useState<SafeAny | null>(null);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
    const [isElsaModalOpen, setIsElsaModalOpen] = useState<boolean>(false);
    const [releaseLoading, setReleaseLoading] = useState<boolean>(false);

    const mutedTextColor = themeMode === 'dark' ? '#cbd5e1' : '#475569';
    const warningTextColor = themeMode === 'dark' ? '#fbbf24' : '#92400e';
    const infoTextColor = themeMode === 'dark' ? '#60a5fa' : '#1d4ed8';

    const activeCombos = comboBalances.filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0);
    const effectiveCustomerId = customerId || customer?.id;
    const isElsaActive =
      customer?.bucket === 'COMBO_ELSA' ||
      (customer?.elsaReservation && customer.elsaReservation.status === 'ACTIVE');

    const handleReleaseElsa = async () => {
      if (!effectiveCustomerId) return;
      try {
        setReleaseLoading(true);
        await apiClient.customers.releaseElsa(effectiveCustomerId, {
          releaseNote: 'Mở lại combo (Rã đông)',
        });
        message.success('Đã mở lại gói combo (Rã đông Elsa) thành công');
        onRefreshCustomer?.();
      } catch (err: SafeAny) {
        message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi rã đông combo');
      } finally {
        setReleaseLoading(false);
      }
    };

    return (
      <>
        <Card
          title={
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              <InboxOutlined /> GÓI COMBO ĐANG CHẠY
            </span>
          }
          extra={
            effectiveCustomerId ? (
              <Space>
                {!isElsaActive ? (
                  <Button
                    size="small"
                    onClick={() => setIsElsaModalOpen(true)}
                    style={{
                      borderColor: '#38bdf8',
                      color: '#0284c7',
                      fontSize: '12px',
                      borderRadius: '6px',
                    }}
                  >
                    ❄️ Bảo lưu Elsa
                  </Button>
                ) : null}
              </Space>
            ) : null
          }
          size="small"
          styles={{ body: { padding: '16px' } }}
          style={{
            backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
            borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
          }}
        >
          {isElsaActive && (
            <div
              style={{
                background: themeMode === 'dark' ? 'rgba(2, 132, 199, 0.15)' : '#f0f9ff',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: activeCombos.length > 0 ? '12px' : 0,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>❄️</span>
                  <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '13px' }}>
                    ĐANG BẢO LƯU COMBO ELSA
                  </span>
                  <Tag color="cyan" style={{ marginLeft: 4, fontWeight: 600 }}>
                    {customer?.elsaReservation?.reservationType === 'INDEFINITE'
                      ? 'Vô thời hạn (PXL)'
                      : 'Có thời hạn'}
                  </Tag>
                </div>
                <Space size={6}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setIsElsaModalOpen(true)}
                    style={{ padding: '0 4px', fontSize: '12px', color: '#0284c7' }}
                  >
                    Chỉnh sửa
                  </Button>
                  <Popconfirm
                    title="Rã đông và mở lại combo?"
                    description="Khách hàng sẽ quay lại tệp Combo bình thường."
                    onConfirm={handleReleaseElsa}
                    okText="Rã đông"
                    cancelText="Hủy"
                    okButtonProps={{ loading: releaseLoading }}
                  >
                    <Button size="small" type="primary" danger ghost style={{ fontSize: '12px' }}>
                      Rã đông combo
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              {customer?.elsaReservation && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: themeMode === 'dark' ? '#cbd5e1' : '#334155',
                  }}
                >
                  <div>
                    <strong>Lý do:</strong> {customer.elsaReservation.reason}
                  </div>
                  {customer.elsaReservation.endDate && (
                    <div>
                      <strong>Hạn bảo lưu:</strong>{' '}
                      {dayjs(customer.elsaReservation.endDate).format('DD/MM/YYYY')}
                    </div>
                  )}
                  {customer.elsaReservation.reminderDate && (
                    <div style={{ color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                      🕒 <strong>Ngày nhắc CS:</strong>{' '}
                      {dayjs(customer.elsaReservation.reminderDate).format('DD/MM/YYYY')}
                      {customer.elsaReservation.reminderNote && ` — ${customer.elsaReservation.reminderNote}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: warningTextColor, flex: 1 }}>
                        {cb.serviceName} {cb.packageKey ? `(${cb.packageKey})` : ''}
                      </div>
                      <Space size={4}>
                        <Tooltip title="Sao chép thông tin gửi khách">
                          <Button
                            size="small"
                            type="text"
                            icon={<CopyOutlined style={{ color: '#fa8c16', fontSize: '13px' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCopyCombo(cb);
                              setIsCopyModalOpen(true);
                            }}
                            style={{
                              padding: '0 4px',
                              height: '22px',
                              lineHeight: '22px',
                              borderRadius: '4px',
                              background: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.15)' : '#fff1b8',
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Xem chi tiết lịch sử combo">
                          <Button
                            size="small"
                            type="text"
                            icon={<InfoCircleOutlined style={{ color: '#fa8c16', fontSize: '13px' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenComboModal();
                            }}
                            style={{
                              padding: '0 4px',
                              height: '22px',
                              lineHeight: '22px',
                              borderRadius: '4px',
                              background: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.15)' : '#fff1b8',
                            }}
                          />
                        </Tooltip>
                      </Space>
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
                        <SunOutlined style={{ color: warningTextColor, fontSize: '13px' }} />
                        <strong>{cb.normalCount}</strong>
                      </Space>

                      <Space size={4}>
                        <SyncOutlined style={{ color: infoTextColor, fontSize: '12px' }} />
                        <strong>{cb.retainCount}</strong>
                      </Space>

                      {cb.dateExpired && (
                        <Space size={4} style={{ marginLeft: 'auto' }}>
                          <span style={{ fontSize: '12px' }}>💀</span>
                          <span style={{ fontSize: '11px', color: mutedTextColor }}>
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
                        color: mutedTextColor,
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
                          <strong style={{ color: themeMode === 'dark' ? '#fff' : '#555' }}>
                            {cb.creatorStaffName}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: mutedTextColor, fontSize: '12px', padding: '12px 0' }}>
              Không có gói combo nào đang chạy.
            </div>
          )}
        </Card>

        <CopyComboModal
          open={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          customerName={customerName || ''}
          combo={selectedCopyCombo}
          comboInfo={
            selectedCopyCombo
              ? getComboDisplayInfo(
                  selectedCopyCombo.serviceName,
                  selectedCopyCombo.normalCount,
                  selectedCopyCombo.retainCount,
                  selectedCopyCombo.packageNormalCount,
                  selectedCopyCombo.packageKey
                )
              : { totalNew: 0, totalRefill: 0 }
          }
          themeMode={themeMode}
        />

        {effectiveCustomerId && (
          <ElsaReservationModal
            open={isElsaModalOpen}
            onClose={() => setIsElsaModalOpen(false)}
            customerId={effectiveCustomerId}
            customerName={customerName || customer?.name || ''}
            currentReservation={customer?.elsaReservation}
            onSuccess={() => onRefreshCustomer?.()}
            themeMode={themeMode}
          />
        )}
      </>
    );
  }
);

ComboBalancesCard.displayName = 'ComboBalancesCard';
