'use client';

import React from 'react';
import { Select, Tag, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { vietnameseSearchFilter } from '@mos-lab/shared';

interface BookingWizardServiceSectionProps {
  themeMode: 'light' | 'dark';
  colorText: string;
  services: SafeAny[];
  selectedService: SafeAny;
  onSelectService: (srv: SafeAny) => void;
  suggestedServices: string[];
  lastUsedServices: string[];
  comboBalances: SafeAny[];
}

export const BookingWizardServiceSection: React.FC<BookingWizardServiceSectionProps> = ({
  themeMode,
  colorText,
  services,
  selectedService,
  onSelectService,
  suggestedServices,
  lastUsedServices,
  comboBalances,
}) => {
  const activeSuggestedServices = suggestedServices.filter((sName) =>
    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
  );
  const activeLastUsedServices = lastUsedServices.filter((sName) =>
    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
  );
  const activeCombos = comboBalances.filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0);

  return (
    <div>
      <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
        <InboxOutlined /> CHỌN DỊCH VỤ (SERVICE)
      </h4>
      <Select
        showSearch
        filterOption={vietnameseSearchFilter}
        style={{ width: '100%' }}
        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
        placeholder="Chọn hoặc tìm dịch vụ..."
        value={selectedService?.id}
        onChange={(val) => {
          const srv = services.find((s) => s.id === val);
          onSelectService(srv);
        }}
        options={services.map((s) => ({
          value: s.id,
          label:
            s.id === 0
              ? `${s.name} (${s.duration} phút)`
              : `${s.name} - ${s.price.toLocaleString('vi-VN')}đ (${s.duration} phút)`,
        }))}
      />

      {/* Favorite Service Suggestion */}
      {activeSuggestedServices.length > 0 && (
        <div style={{ marginTop: '6px', fontSize: '12px' }}>
          <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>⭐ Dòng mi khách hay đi nhất: </span>
          {activeSuggestedServices.map((sName) => (
            <span
              key={sName}
              style={{
                color: themeMode === 'dark' ? '#ffa940' : '#d87a16',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginLeft: '4px',
              }}
              onClick={() => {
                const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                if (matchedSrv) {
                  onSelectService(matchedSrv);
                  message.success(`Đã chọn dòng mi hay dùng: ${matchedSrv.name}`);
                } else {
                  message.info(`Hay đi: ${sName}`);
                }
              }}
            >
              {sName}
            </span>
          ))}
        </div>
      )}

      {/* Last Service Used Suggestion */}
      {activeLastUsedServices.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '12px' }}>
          <span style={{ color: '#096dd9', fontWeight: 'bold' }}>🕒 Dịch vụ khách dùng cuối cùng: </span>
          {activeLastUsedServices.map((sName) => (
            <span
              key={sName}
              style={{
                color: themeMode === 'dark' ? '#177ddc' : '#096dd9',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginLeft: '4px',
              }}
              onClick={() => {
                const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                if (matchedSrv) {
                  onSelectService(matchedSrv);
                  message.success(`Đã chọn dịch vụ cuối cùng: ${matchedSrv.name}`);
                } else {
                  message.info(`Dùng cuối cùng: ${sName}`);
                }
              }}
            >
              {sName}
            </span>
          ))}
        </div>
      )}

      {/* Active Combo Balances Suggestions */}
      {activeCombos.length > 0 && (
        <div style={{ marginTop: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold', marginBottom: '6px' }}>
            🎁 GÓI COMBO ĐANG CHẠY (CLICK ĐỂ CHỌN NHANH DÒNG MI):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeCombos.map((cb: SafeAny) => (
              <div
                key={cb.id}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${themeMode === 'dark' ? '#4f1a30' : '#fbcfe8'}`,
                  background: themeMode === 'dark' ? 'rgba(219, 39, 119, 0.1)' : 'rgba(219, 39, 119, 0.03)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: colorText,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onClick={() => {
                  const cleanName = cb.serviceName.split('(')[0].trim().toLowerCase();
                  const matchedSrv = services.find(
                    (s) => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase())
                  );
                  if (matchedSrv) {
                    onSelectService(matchedSrv);
                    message.success(`Đã chọn dòng mi từ Combo: ${matchedSrv.name}`);
                  } else {
                    message.info(`Gói combo: ${cb.serviceName}`);
                  }
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold' }}>{cb.serviceName}</span>
                  <div
                    style={{
                      fontSize: '11px',
                      color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                      marginTop: '2px',
                    }}
                  >
                    Còn lại: ✦ {cb.normalCount || 0} · ↻ {cb.retainCount || 0}
                  </div>
                </div>
                <Tag color="magenta" style={{ margin: 0, fontSize: '10px' }}>
                  Chọn
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
