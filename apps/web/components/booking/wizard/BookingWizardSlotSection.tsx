'use client';

import React from 'react';
import dayjs from 'dayjs';
import { CvDatePicker } from '../CvDatePicker';
import { SlotMatrixGrid } from '../SlotMatrixGrid';

interface BookingWizardSlotSectionProps {
  themeMode: 'light' | 'dark';
  selectedCV: SafeAny;
  selectedCN: SafeAny;
  safeBookingDate: dayjs.Dayjs;
  pickerNonce: number;
  staffList: SafeAny[];
  onChangeDate: (date: dayjs.Dayjs) => void;
  slotMatrix: SafeAny;
  loadingSlots: boolean;
  selectedSlot: string | null;
  onSelectSlot: (slot: string | null) => void;
  morning: string[];
  afternoon: string[];
  night: string[];
}

export const BookingWizardSlotSection: React.FC<BookingWizardSlotSectionProps> = ({
  themeMode,
  selectedCV,
  selectedCN,
  safeBookingDate,
  pickerNonce,
  staffList,
  onChangeDate,
  slotMatrix,
  loadingSlots,
  selectedSlot,
  onSelectSlot,
  morning,
  afternoon,
  night,
}) => {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', color: '#888' }}>Ngày đặt:</span>
          <CvDatePicker
            key={`${selectedCV ? selectedCV.id : 'no-cv'}-${safeBookingDate ? safeBookingDate.valueOf() : 0}-${pickerNonce}-${(staffList || []).length}`}
            style={{ marginLeft: '8px' }}
            value={safeBookingDate}
            onChange={(val) => {
              if (!val) return;
              onChangeDate(dayjs(val));
            }}
            selectedCV={selectedCV}
            staffList={staffList}
            themeMode={themeMode}
          />

          <style>{`
              .ant-picker-dropdown .ant-picker-cell-today .ant-picker-cell-inner::before,
              .ant-picker-cell-today .ant-picker-cell-inner::before {
                display: none !important;
                content: none !important;
                border: none !important;
                border-width: 0 !important;
                outline: none !important;
                box-shadow: none !important;
              }
              .ant-picker-dropdown .ant-picker-cell-disabled,
              .ant-picker-cell-disabled {
                color: #64748b !important;
                opacity: 0.25 !important;
                pointer-events: none !important;
                cursor: not-allowed !important;
              }
            `}</style>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
          {safeBookingDate.format('dddd (DD/MM/YYYY)')}
        </div>
      </div>

      <SlotMatrixGrid
        slotMatrix={slotMatrix}
        loadingSlots={loadingSlots}
        selectedSlot={selectedSlot}
        setSelectedSlot={onSelectSlot}
        selectedCN={selectedCN}
        morning={morning}
        afternoon={afternoon}
        night={night}
        themeMode={themeMode}
        selectedCV={selectedCV}
      />
    </div>
  );
};
