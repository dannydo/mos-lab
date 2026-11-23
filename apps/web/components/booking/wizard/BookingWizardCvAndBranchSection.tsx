'use client';

import React from 'react';
import { Button, Select, Tag } from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { STORES, isStaffOffOnDate } from '../constants';
import { TechnicianSelector } from '../TechnicianSelector';

interface BookingWizardCvAndBranchSectionProps {
  themeMode: 'light' | 'dark';
  selectedCV: SafeAny;
  selectedCN: SafeAny;
  onSelectCN: (store: SafeAny) => void;
  showCvCardSelector: boolean;
  onToggleCvCardSelector: () => void;
  staffList: SafeAny[];
  loadingStaff: boolean;
  safeBookingDate: dayjs.Dayjs;
  onSelectCVOption: (cv: SafeAny) => void;
  favoriteTechs: SafeAny[];
  getFavoriteKTVs: () => SafeAny[];
  getGroupedKTVs: () => SafeAny;
  suggestedBranch: SafeAny;
}

export const BookingWizardCvAndBranchSection: React.FC<BookingWizardCvAndBranchSectionProps> = ({
  themeMode,
  selectedCV,
  selectedCN,
  onSelectCN,
  showCvCardSelector,
  onToggleCvCardSelector,
  staffList,
  loadingStaff,
  safeBookingDate,
  onSelectCVOption,
  favoriteTechs,
  getFavoriteKTVs,
  getGroupedKTVs,
  suggestedBranch,
}) => {
  const favoriteKTVs = getFavoriteKTVs();

  return (
    <>
      {/* SPECIALIST (CV) QUICK SELECTOR + OPTIONAL CARD PICKER */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', margin: 0 }}>
            <UserOutlined /> CHỌN CHUYÊN VIÊN (CV)
          </h4>
          <Button size="small" type={showCvCardSelector ? 'primary' : 'dashed'} onClick={onToggleCvCardSelector}>
            {showCvCardSelector ? 'Thu gọn danh sách thẻ CV' : 'Mở bảng thẻ Chuyên Viên'}
          </Button>
        </div>

        <Select
          showSearch
          allowClear
          filterOption={vietnameseSearchFilter}
          style={{ width: '100%' }}
          getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          placeholder="🌟 Chuyên viên tự do (Click để chọn CV chỉ định)..."
          value={selectedCV?.id ?? 0}
          loading={loadingStaff}
          onChange={(val) => {
            if (!val || val === 0) {
              onSelectCVOption(null);
              return;
            }
            const found = (staffList || []).find((s: SafeAny) => s.id === val);
            if (found) {
              onSelectCVOption(found);
            }
          }}
          options={[
            {
              value: 0,
              label: '🌟 Chuyên viên tự do (Không yêu cầu chỉ định CV)',
            },
            ...(staffList || []).map((cv: SafeAny) => {
              const isOff = isStaffOffOnDate(cv, safeBookingDate);
              return {
                value: cv.id,
                label: `${cv.displayName}${cv.notes ? ` (${cv.notes})` : ''}${isOff ? ' — [Nghỉ phép ngày chọn]' : ''}`,
              };
            }),
          ]}
        />

        {/* Favorite CVs quick chips */}
        {favoriteKTVs.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>💖 CV khách hay chọn:</span>
            {favoriteKTVs.map((cv: SafeAny) => {
              const isSelected = selectedCV?.id === cv.id;
              return (
                <Tag
                  key={cv.id}
                  color={isSelected ? 'magenta' : 'pink'}
                  style={{
                    cursor: 'pointer',
                    margin: 0,
                    fontWeight: isSelected ? 'bold' : 'normal',
                    border: isSelected ? '1.5px solid #db2777' : undefined,
                  }}
                  onClick={() => onSelectCVOption(cv)}
                >
                  {cv.displayName}
                </Tag>
              );
            })}
          </div>
        )}

        {showCvCardSelector && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
              background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
            }}
          >
            <TechnicianSelector
              selectedCV={selectedCV}
              onSelectCVOption={onSelectCVOption}
              favoriteTechs={favoriteTechs}
              getFavoriteKTVs={getFavoriteKTVs}
              getGroupedKTVs={getGroupedKTVs}
              loadingStaff={loadingStaff}
              themeMode={themeMode}
            />
          </div>
        )}
      </div>

      {/* Branch Check */}
      <div>
        <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
          <HomeOutlined /> CHI NHÁNH ĐẶT LỊCH (CN)
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STORES.map((s) => {
            const isSelected = selectedCN?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onSelectCN(s)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  background: isSelected ? '#D4A84B' : themeMode === 'dark' ? '#1e293b' : '#f3f4f6',
                  border: `1px solid ${isSelected ? '#D4A84B' : themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                  color: isSelected ? '#fff' : themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{s.name}</span>
                {suggestedBranch?.id === s.id && (
                  <Tag
                    color={isSelected ? 'magenta' : 'orange'}
                    style={{
                      marginLeft: '6px',
                      marginRight: 0,
                      fontSize: '10px',
                      padding: '0 6px',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    💖 Hay đi
                  </Tag>
                )}
              </div>
            );
          })}
        </div>
        {selectedCV && (
          <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '6px' }}>
            * Tự động gợi ý chi nhánh làm việc chính của <strong>{selectedCV.displayName}</strong>.
          </div>
        )}
      </div>
    </>
  );
};
