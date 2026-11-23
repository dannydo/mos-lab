'use client';

import React from 'react';
import { Button, Form, Radio } from 'antd';
import { Check, PackageCheck, Wrench } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import type { WorkshopEquipmentPackage, WorkshopPublicDetail } from './registrationTypes';
import { equipmentEffectivePriceLabel, formatFee } from './registrationUtils';
import { EquipmentImageCarousel } from './EquipmentImageCarousel';
import { WorkshopSelectionDrawerShell } from './WorkshopSelectionDrawerShell';

export interface EquipmentSelectionDrawerProps {
  open: boolean;
  submitting: boolean;
  equipment: WorkshopPublicDetail['equipment'];
  selectedEquipmentPackageId: number | undefined;
  selectedEquipmentPackage: WorkshopEquipmentPackage | undefined;
  onClose: () => void;
}

export function EquipmentSelectionDrawer({
  open,
  submitting,
  equipment,
  selectedEquipmentPackageId,
  selectedEquipmentPackage,
  onClose,
}: EquipmentSelectionDrawerProps) {
  const footer = selectedEquipmentPackage ? (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
        <Check size={18} strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">Bộ dụng cụ đã chọn</p>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p className="m-0 min-w-0 flex-1 truncate text-sm font-extrabold text-slate-950">
            {selectedEquipmentPackage.name}
          </p>
          <div className="flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
            <del className="text-xs text-slate-400 line-through">{formatFee(selectedEquipmentPackage.priceVnd)}</del>
            <span
              className={
                selectedEquipmentPackage.effectivePriceVnd === 0
                  ? 'font-extrabold text-emerald-700 dark:text-emerald-300'
                  : 'font-black text-amber-800 dark:text-amber-300'
              }
            >
              {equipmentEffectivePriceLabel(selectedEquipmentPackage)}
            </span>
          </div>
        </div>
      </div>
      <Button type="primary" size="large" className="!h-11 !rounded-xl !px-4 !font-bold" onClick={onClose}>
        Xác nhận
      </Button>
    </>
  ) : (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
        1
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-slate-950">Chọn một bộ để tiếp tục</p>
        <p className="m-0 text-xs leading-5 text-slate-500">Chạm vào bộ phù hợp với phần thực hành của bạn.</p>
      </div>
    </>
  );

  return (
    <WorkshopSelectionDrawerShell open={open} onClose={onClose} footer={footer}>
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-4 text-white sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20">
              <AppIcon icon={Wrench} size="sm" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
                Phần thực hành có hướng dẫn
              </p>
              <h3 className="mb-0 mt-1 text-lg font-black leading-tight">Chọn bộ dụng cụ của bạn</h3>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold">
            1 lựa chọn
          </span>
        </div>
      </div>
      <div className={`space-y-4 p-4 sm:p-5 ${styles.selectionSheetContent}`}>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100 dark:text-amber-300">
            <AppIcon icon={PackageCheck} size="sm" />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
              Bộ dụng cụ cá nhân
            </p>
            <p className="mb-0 mt-1 text-sm leading-5 text-slate-700">
              Chọn một bộ để Academy chuẩn bị sẵn cho phần thực hành. Phụ thu được hiển thị rõ trước khi gửi đăng ký.
            </p>
          </div>
        </div>
        <Form.Item
          className="!mb-0"
          name="equipmentPackageId"
          rules={[{ required: true, message: 'Vui lòng chọn một bộ dụng cụ thực hành.' }]}
        >
          <Radio.Group className="grid w-full grid-cols-1 gap-3" disabled={submitting}>
            {equipment.packages.map((item) => (
              <Radio
                key={item.id}
                value={item.id}
                className="!relative !ml-0 !flex !w-full !rounded-2xl border border-slate-200 bg-white !p-0 text-left shadow-sm transition hover:!border-amber-400 hover:bg-amber-50 [&>.ant-radio]:!absolute [&>.ant-radio]:!opacity-0 [&>span:last-child]:!min-w-0 [&>span:last-child]:!flex-1 [&>span:last-child]:!p-0"
              >
                <span className="relative flex min-h-[104px] min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  {Number(selectedEquipmentPackageId) === item.id ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-6 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-amber-500 bg-amber-400 text-slate-950 shadow-sm"
                    >
                      <Check size={16} strokeWidth={3} />
                    </span>
                  ) : null}
                  <EquipmentImageCarousel images={item.images} label={item.name} />
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-base font-extrabold leading-5 text-slate-900">{item.name}</span>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <del className="text-xs font-semibold tabular-nums text-slate-400 line-through">
                        {formatFee(item.priceVnd)}
                      </del>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs sm:text-sm font-black tabular-nums ${
                          item.isIncludedInFee || item.effectivePriceVnd === 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {equipmentEffectivePriceLabel(item)}
                      </span>
                    </div>
                  </span>
                  {item.description ? (
                    <span className="mt-1.5 block text-sm leading-5 text-slate-600">{item.description}</span>
                  ) : null}
                  <span className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs font-medium leading-5 text-slate-600">
                    {item.includedItems.map((includedItem) => (
                      <span key={includedItem} className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                        {includedItem}
                      </span>
                    ))}
                  </span>
                </span>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      </div>
    </WorkshopSelectionDrawerShell>
  );
}
