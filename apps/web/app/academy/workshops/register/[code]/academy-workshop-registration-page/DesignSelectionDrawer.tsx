'use client';

import React from 'react';
import { Button, Form, Radio } from 'antd';
import { Check, Sparkles } from 'lucide-react';
import { ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import type { WorkshopDesignItem, WorkshopPublicDetail } from './registrationTypes';
import { formatFee } from './registrationUtils';
import { EquipmentImageCarousel } from './EquipmentImageCarousel';
import { WorkshopSelectionDrawerShell } from './WorkshopSelectionDrawerShell';

export interface DesignSelectionDrawerProps {
  open: boolean;
  submitting: boolean;
  design: WorkshopPublicDetail['design'];
  selectedDesignItemId: number | undefined;
  selectedDesign: WorkshopDesignItem | undefined;
  onClose: () => void;
}

export function DesignSelectionDrawer({
  open,
  submitting,
  design,
  selectedDesignItemId,
  selectedDesign,
  onClose,
}: DesignSelectionDrawerProps) {
  const footer = selectedDesign ? (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800">
        <Check size={18} strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-bold text-purple-700 dark:text-purple-300">Mẫu mi đã chọn</p>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p className="m-0 min-w-0 flex-1 truncate text-sm font-extrabold text-slate-950">{selectedDesign.name}</p>
          <span className="shrink-0 text-sm font-black tabular-nums text-purple-800 dark:text-purple-300">
            {selectedDesign.priceVnd > 0 ? `+${formatFee(selectedDesign.priceVnd)}` : 'Miễn phí'}
          </span>
        </div>
      </div>
      <Button type="primary" size="large" className="!h-11 !rounded-xl !px-4 !font-bold" onClick={onClose}>
        Xác nhận
      </Button>
    </>
  ) : (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-sm font-black text-purple-800 ring-1 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800">
        1
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-slate-950">Chọn một mẫu để tiếp tục</p>
        <p className="m-0 text-xs leading-5 text-slate-500">Chạm vào mẫu mi bạn muốn thực hành trong buổi học.</p>
      </div>
    </>
  );

  return (
    <WorkshopSelectionDrawerShell open={open} onClose={onClose} footer={footer}>
      <div className="border-b border-purple-200 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 px-4 py-4 text-white sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-400 text-slate-950 shadow-lg shadow-purple-400/20">
              <AppIcon icon={Sparkles} size="sm" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-purple-200">Phần thực hành mẫu mi</p>
              <h3 className="mb-0 mt-1 text-lg font-black leading-tight">Chọn mẫu thiết kế mi của bạn</h3>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold">
            1 lựa chọn
          </span>
        </div>
      </div>
      <div className={`space-y-4 p-4 sm:p-5 ${styles.selectionSheetContent}`}>
        <div className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm ring-1 ring-purple-100 dark:bg-slate-800 dark:text-purple-300">
            <AppIcon icon={Sparkles} size="sm" />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-purple-800 dark:text-purple-300">
              Mẫu thiết kế mi cá nhân
            </p>
            <p className="mb-0 mt-1 text-sm leading-5 text-slate-700 dark:text-slate-300">
              Chọn mẫu thiết kế mi bạn muốn thực hành trực tiếp cùng Giảng viên. Độ khó và phụ thu (nếu có) được hiển
              thị rõ bên dưới.
            </p>
          </div>
        </div>
        <Form.Item
          className="!mb-0"
          name="designItemId"
          rules={design.required ? [{ required: true, message: 'Vui lòng chọn một mẫu thiết kế mi.' }] : []}
        >
          <Radio.Group className="grid w-full grid-cols-1 gap-3" disabled={submitting}>
            {design.items.map((item) => (
              <Radio
                key={item.id}
                value={item.id}
                className="!relative !ml-0 !flex !w-full !rounded-2xl border border-slate-200 bg-white !p-0 text-left shadow-sm transition hover:!border-purple-400 hover:bg-purple-50/30 [&>.ant-radio]:!absolute [&>.ant-radio]:!opacity-0 [&>span:last-child]:!min-w-0 [&>span:last-child]:!flex-1 [&>span:last-child]:!p-0"
              >
                <span className="relative flex min-h-[104px] min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  {Number(selectedDesignItemId) === item.id ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-6 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-purple-500 bg-purple-500 text-white shadow-sm"
                    >
                      <Check size={16} strokeWidth={3} />
                    </span>
                  ) : null}
                  <EquipmentImageCarousel images={item.images} label={item.name} />
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-base font-extrabold leading-5 text-slate-900">{item.name}</span>
                    <span className="shrink-0 rounded-lg bg-purple-100 px-2.5 py-1 text-sm font-black tabular-nums text-purple-900 dark:bg-purple-950/60 dark:text-purple-200">
                      {item.priceVnd > 0 ? `+${formatFee(item.priceVnd)}` : 'Miễn phí'}
                    </span>
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                      {ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[item.difficultyLevel] || item.difficultyLevel}
                    </span>
                  </div>
                  {item.description ? (
                    <span className="mt-1.5 block text-sm leading-5 text-slate-600">{item.description}</span>
                  ) : null}
                </span>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      </div>
    </WorkshopSelectionDrawerShell>
  );
}
