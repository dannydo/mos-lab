'use client';

import React from 'react';
import { Modal, Tag, Radio, Input, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { CcPaystubRecord } from '@mos-lab/shared';

export interface CcAllowanceModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  selectedRecord: CcPaystubRecord | null;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  allowanceFormType: 'plus' | 'minus';
  setAllowanceFormType: (val: 'plus' | 'minus') => void;
  allowanceTitle: string;
  setAllowanceTitle: (val: string) => void;
  allowanceAmount: number | null;
  setAllowanceAmount: (val: number | null) => void;
  allowanceNote: string;
  setAllowanceNote: (val: string) => void;
}

export default function CcAllowanceModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  selectedRecord,
  dateRange,
  allowanceFormType,
  setAllowanceFormType,
  allowanceTitle,
  setAllowanceTitle,
  allowanceAmount,
  setAllowanceAmount,
  allowanceNote,
  setAllowanceNote,
}: CcAllowanceModalProps) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">Thêm phụ cấp khác</span>
          {selectedRecord && <Tag color="purple">{selectedRecord.displayName}</Tag>}
          <Tag color="default">Tháng {(dateRange?.[0] || dayjs()).format('MM/YYYY')}</Tag>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText="Lưu phụ cấp"
      cancelText="Hủy"
      destroyOnClose
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">Loại phụ cấp:</label>
          <Radio.Group
            value={allowanceFormType}
            onChange={(e) => setAllowanceFormType(e.target.value)}
            buttonStyle="solid"
            className="w-full flex"
          >
            <Radio.Button value="plus" className="flex-1 text-center font-medium">
              + Cộng tiền (Thưởng / Hỗ trợ)
            </Radio.Button>
            <Radio.Button value="minus" className="flex-1 text-center font-medium text-rose-500">
              - Trừ tiền (Khấu trừ / Phạt)
            </Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
            Tên / Nội dung phụ cấp <span className="text-rose-500">*</span>:
          </label>
          <Input
            placeholder="VD: Hỗ trợ gửi xe ngoài, Thưởng chiến dịch, Trừ đồng phục..."
            value={allowanceTitle}
            onChange={(e) => setAllowanceTitle(e.target.value)}
            maxLength={150}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
            Số tiền (VNĐ) <span className="text-rose-500">*</span>:
          </label>
          <InputNumber<number>
            className="w-full"
            placeholder="VD: 200,000"
            value={allowanceAmount}
            onChange={(val) => setAllowanceAmount(val)}
            min={1000}
            step={10000}
            formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0)}
            addonAfter="VNĐ"
          />
          <div className="text-[11px] text-slate-400 mt-1">
            Ghi nhận vào lương:{' '}
            <span className={allowanceFormType === 'minus' ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
              {allowanceFormType === 'minus' ? '-' : '+'}
              {allowanceAmount ? Math.abs(allowanceAmount).toLocaleString('vi-VN') : 0}đ
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
            Ghi chú chi tiết (tùy chọn):
          </label>
          <Input.TextArea
            placeholder="Ghi chú thêm lý do..."
            rows={2}
            value={allowanceNote}
            onChange={(e) => setAllowanceNote(e.target.value)}
            maxLength={255}
          />
        </div>
      </div>
    </Modal>
  );
}
