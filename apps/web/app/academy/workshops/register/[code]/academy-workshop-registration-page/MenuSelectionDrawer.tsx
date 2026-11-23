'use client';

import React from 'react';
import { Alert, Button, Form, Image as AntdImage, Radio } from 'antd';
import { Check, UtensilsCrossed } from 'lucide-react';
import Image from 'next/image';
import { AppIcon, IconText } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import type { WorkshopPublicDetail } from './registrationTypes';
import { WorkshopSelectionDrawerShell } from './WorkshopSelectionDrawerShell';

export interface MenuSelectionDrawerProps {
  open: boolean;
  submitting: boolean;
  menu: WorkshopPublicDetail['menu'];
  menuIncomplete: boolean;
  selectedMenuCount: number;
  onClose: () => void;
}

export function MenuSelectionDrawer({
  open,
  submitting,
  menu,
  menuIncomplete,
  selectedMenuCount,
  onClose,
}: MenuSelectionDrawerProps) {
  const footer = menuIncomplete ? (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
        <AppIcon icon={UtensilsCrossed} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-slate-950">Thực đơn đang được hoàn thiện</p>
        <p className="m-0 text-xs leading-5 text-slate-500">Academy sẽ cập nhật lựa chọn sớm nhất.</p>
      </div>
    </>
  ) : selectedMenuCount === menu.categories.length ? (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
        <Check size={18} strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">Thực đơn đã sẵn sàng</p>
        <p className="m-0 text-sm font-extrabold tabular-nums text-slate-950">
          {selectedMenuCount}/{menu.categories.length} phần đã chọn
        </p>
      </div>
      <Button type="primary" size="large" className="!h-11 !rounded-xl !px-5 !font-bold" onClick={onClose}>
        Xác nhận
      </Button>
    </>
  ) : (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-black tabular-nums text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
        {selectedMenuCount}/{menu.categories.length}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-slate-950">Hoàn tất lựa chọn phần ăn</p>
        <p className="m-0 text-xs leading-5 text-slate-500">
          Còn {menu.categories.length - selectedMenuCount} phần cần chọn.
        </p>
      </div>
    </>
  );

  return (
    <WorkshopSelectionDrawerShell open={open} onClose={onClose} footer={footer}>
      <div className="relative h-44 overflow-hidden sm:h-48">
        <Image
          src="/academy/viet-thai-menu-hero-v1.webp"
          alt="Bữa ăn workshop"
          fill
          priority
          sizes="(max-width: 640px) 100vw, 420px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/15" />
        <div className="absolute left-0 top-0 p-4 sm:p-5">
          <span className="inline-flex rounded-full border border-white/15 bg-slate-950/55 px-2.5 py-1.5 backdrop-blur-sm">
            <IconText
              icon={<AppIcon icon={UtensilsCrossed} size="sm" className="text-amber-200" />}
              className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200"
            >
              Bữa trưa Việt Thái
            </IconText>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-slate-950/55 p-4 text-white backdrop-blur-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="m-0 min-w-0 text-lg font-black leading-tight">Chọn phần ăn của bạn</h3>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
              {selectedMenuCount}/{menu.categories.length} đã chọn
            </span>
          </div>
        </div>
      </div>
      <div className={`space-y-5 p-4 sm:p-5 ${styles.selectionSheetContent}`}>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100 dark:text-amber-300">
            <AppIcon icon={UtensilsCrossed} size="sm" />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
              Thực đơn theo set
            </p>
            <p className="mb-0 mt-1 text-sm leading-5 text-slate-700">
              Chọn một món ở mỗi nhóm. Academy sẽ tổng hợp trước cho đơn vị ẩm thực phục vụ workshop.
            </p>
          </div>
        </div>
        {menuIncomplete ? (
          <Alert
            type="warning"
            showIcon
            message="Thực đơn đang được Academy hoàn thiện"
            description="Vui lòng quay lại sau hoặc liên hệ Academy để được hỗ trợ."
          />
        ) : (
          <div className="space-y-4">
            {menu.categories.map((category, categoryIndex) => (
              <section
                key={category.category}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"
              >
                <header className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-extrabold tabular-nums text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {categoryIndex + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="m-0 text-sm font-extrabold leading-5 text-slate-900">{category.label}</h4>
                      <p className="mb-0 mt-0.5 text-xs leading-4 text-slate-500">Chọn một món</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    1 lựa chọn
                  </span>
                </header>
                <Form.Item
                  className="!mb-0 !mt-3"
                  name={['menuSelections', category.category]}
                  rules={[
                    {
                      required: true,
                      message: `Vui lòng chọn ${category.label.toLowerCase()}.`,
                    },
                  ]}
                >
                  <Radio.Group className="grid w-full grid-cols-1 gap-2.5" disabled={submitting}>
                    {category.items.map((item) => (
                      <Radio
                        key={item.id}
                        value={item.id}
                        className="!ml-0 flex min-h-20 w-full items-center !gap-2 rounded-xl border border-slate-200 bg-slate-50 !px-3 !py-2 text-left transition hover:border-amber-400 hover:bg-amber-50 [&>.ant-radio]:!flex [&>.ant-radio]:!h-[var(--mos-control-height)] [&>.ant-radio]:!w-8 [&>.ant-radio]:!items-center [&>.ant-radio]:!justify-center [&>span:last-child]:!min-w-0 [&>span:last-child]:!flex-1 [&>span:last-child]:!p-0"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {item.imageUrl ? (
                            <span onClick={(e) => e.stopPropagation()}>
                              <AntdImage
                                src={item.imageUrl}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-slate-200"
                                wrapperClassName="!h-14 !w-14 shrink-0 rounded-xl overflow-hidden block"
                              />
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 line-clamp-2 text-sm font-bold leading-5 text-slate-800">
                            {item.name}
                          </span>
                        </span>
                      </Radio>
                    ))}
                  </Radio.Group>
                </Form.Item>
              </section>
            ))}
          </div>
        )}
      </div>
    </WorkshopSelectionDrawerShell>
  );
}
