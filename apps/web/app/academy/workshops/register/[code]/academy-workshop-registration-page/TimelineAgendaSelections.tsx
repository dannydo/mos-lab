'use client';

import React from 'react';
import { Image as AntdImage } from 'antd';
import { ArrowRight, Check, PackageCheck, Sparkles, UtensilsCrossed, Wrench } from 'lucide-react';
import { ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import type {
  SelectionSheetKind,
  WorkshopDesignItem,
  WorkshopEquipmentPackage,
  WorkshopMenuSelectionSummary,
  WorkshopPublicDetail,
} from './registrationTypes';
import { equipmentEffectivePriceLabel, formatFee } from './registrationUtils';

type SelectionCountdownState = {
  locked: boolean;
  label: string;
};

export interface TimelineAgendaSelectionsProps {
  item: WorkshopPublicDetail['agenda'][number];
  menuCategoriesCount: number;
  selectedEquipmentPackage: WorkshopEquipmentPackage | undefined;
  selectedDesign: WorkshopDesignItem | undefined;
  selectedMenuItems: WorkshopMenuSelectionSummary[];
  equipmentCountdown: SelectionCountdownState;
  designCountdown: SelectionCountdownState;
  menuCountdown: SelectionCountdownState;
  onOpenSelectionSheet: (selection: SelectionSheetKind) => void;
}

export function TimelineAgendaSelections({
  item,
  menuCategoriesCount,
  selectedEquipmentPackage,
  selectedDesign,
  selectedMenuItems,
  equipmentCountdown,
  designCountdown,
  menuCountdown,
  onOpenSelectionSheet,
}: TimelineAgendaSelectionsProps) {
  const hasCompleteMenuSelection = menuCategoriesCount > 0 && selectedMenuItems.length === menuCategoriesCount;

  return (
    <>
      {item.equipmentSelectionEnabled ? (
        selectedEquipmentPackage ? (
          <div className={`mt-3 overflow-hidden rounded-2xl ${styles.selectionSummary}`}>
            <div className="flex items-start gap-3 p-3">
              {selectedEquipmentPackage.images[0] ? (
                <span onClick={(e) => e.stopPropagation()}>
                  <AntdImage.PreviewGroup items={selectedEquipmentPackage.images.map((img) => img.imageUrl)}>
                    <AntdImage
                      src={selectedEquipmentPackage.images[0].imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-emerald-100"
                      wrapperClassName="!h-12 !w-12 shrink-0 rounded-xl overflow-hidden block"
                    />
                  </AntdImage.PreviewGroup>
                </span>
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <AppIcon icon={PackageCheck} size="sm" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                    Bộ dụng cụ của bạn
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white">
                    <Check size={12} strokeWidth={3} aria-hidden="true" /> Đã chọn
                  </span>
                </div>
                <p className={`mb-0 mt-1 truncate text-sm font-semibold ${styles.agendaTitle}`}>
                  {selectedEquipmentPackage.name}
                </p>
                <div
                  className={`mb-0 mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-medium tabular-nums ${styles.agendaDescription}`}
                >
                  <del className="text-slate-400 line-through opacity-75">
                    {formatFee(selectedEquipmentPackage.priceVnd)}
                  </del>
                  <span
                    className={
                      selectedEquipmentPackage.effectivePriceVnd === 0
                        ? 'font-bold text-emerald-700 dark:text-emerald-300'
                        : 'font-bold text-amber-900 dark:text-amber-300'
                    }
                  >
                    {equipmentEffectivePriceLabel(selectedEquipmentPackage)}
                  </span>
                </div>
              </div>
            </div>
            {selectedEquipmentPackage.includedItems.length ? (
              <div className={`flex flex-wrap gap-1.5 px-3 py-2.5 ${styles.selectionSummaryItems}`}>
                {selectedEquipmentPackage.includedItems.slice(0, 3).map((includedItem) => (
                  <span
                    key={includedItem}
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${styles.selectionChip}`}
                  >
                    {includedItem}
                  </span>
                ))}
                {selectedEquipmentPackage.includedItems.length > 3 ? (
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${styles.selectionChip}`}>
                    +{selectedEquipmentPackage.includedItems.length - 3}
                  </span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium transition ${styles.selectionSummaryAction}`}
              disabled={equipmentCountdown.locked}
              title={
                equipmentCountdown.locked
                  ? 'Đã hết hạn thay đổi bộ dụng cụ.'
                  : 'Bạn có thể thay đổi đến hạn chốt đã đặt.'
              }
              onClick={() => onOpenSelectionSheet('equipment')}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span>{equipmentCountdown.locked ? 'Bộ dụng cụ đã chốt' : 'Thay đổi bộ dụng cụ'}</span>
                <span className={styles.selectionChangeCountdown} aria-live="polite" suppressHydrationWarning>
                  {equipmentCountdown.locked ? 'Đã chốt' : equipmentCountdown.label}
                </span>
              </span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-haspopup="dialog"
            className={`group mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left transition ${styles.selectionAction}`}
            disabled={equipmentCountdown.locked}
            title={equipmentCountdown.locked ? 'Đã hết hạn chọn bộ dụng cụ.' : 'Chọn bộ dụng cụ trước hạn chốt.'}
            onClick={() => onOpenSelectionSheet('equipment')}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${styles.selectionActionIcon}`}
            >
              <AppIcon icon={Wrench} size="sm" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${styles.selectionActionTitle}`}>Chọn bộ dụng cụ</span>
              <span className={`mt-0.5 block text-xs leading-5 ${styles.selectionActionDescription}`}>
                Sẵn sàng cho phần thực hành.
              </span>
            </span>
            <AppIcon icon={ArrowRight} size="sm" className={`shrink-0 ${styles.selectionActionArrow}`} />
          </button>
        )
      ) : null}

      {item.designSelectionEnabled ? (
        selectedDesign ? (
          <div className={`mt-3 overflow-hidden rounded-2xl ${styles.selectionSummary}`}>
            <div className="flex items-start gap-3 p-3">
              {selectedDesign.images[0] ? (
                <span onClick={(e) => e.stopPropagation()}>
                  <AntdImage.PreviewGroup items={selectedDesign.images.map((img) => img.imageUrl)}>
                    <AntdImage
                      src={selectedDesign.images[0].imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-purple-100"
                      wrapperClassName="!h-12 !w-12 shrink-0 rounded-xl overflow-hidden block"
                    />
                  </AntdImage.PreviewGroup>
                </span>
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  <AppIcon icon={Sparkles} size="sm" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-purple-700 dark:text-purple-300">
                    Mẫu mi thực hành của bạn
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-[10px] font-medium text-white">
                    <Check size={12} strokeWidth={3} aria-hidden="true" /> Đã chọn
                  </span>
                </div>
                <p className={`mb-0 mt-1 truncate text-sm font-semibold ${styles.agendaTitle}`}>
                  {selectedDesign.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                    {ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[selectedDesign.difficultyLevel] ||
                      selectedDesign.difficultyLevel}
                  </span>
                  <span className={`text-xs font-medium tabular-nums ${styles.agendaDescription}`}>
                    {selectedDesign.priceVnd > 0 ? `+${formatFee(selectedDesign.priceVnd)}` : 'Miễn phí'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium transition ${styles.selectionSummaryAction}`}
              disabled={designCountdown.locked}
              title={
                designCountdown.locked ? 'Đã hết hạn thay đổi mẫu mi.' : 'Bạn có thể thay đổi đến hạn chốt đã đặt.'
              }
              onClick={() => onOpenSelectionSheet('design')}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span>{designCountdown.locked ? 'Mẫu mi đã chốt' : 'Thay đổi mẫu mi'}</span>
                <span className={styles.selectionChangeCountdown} aria-live="polite" suppressHydrationWarning>
                  {designCountdown.locked ? 'Đã chốt' : designCountdown.label}
                </span>
              </span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-haspopup="dialog"
            className={`group mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left transition ${styles.selectionAction}`}
            disabled={designCountdown.locked}
            title={designCountdown.locked ? 'Đã hết hạn chọn mẫu thiết kế mi.' : 'Chọn mẫu thiết kế mi trước hạn chốt.'}
            onClick={() => onOpenSelectionSheet('design')}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${styles.selectionActionIcon}`}
            >
              <AppIcon icon={Sparkles} size="sm" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${styles.selectionActionTitle}`}>Chọn mẫu thiết kế mi</span>
              <span className={`mt-0.5 block text-xs leading-5 ${styles.selectionActionDescription}`}>
                Sẵn sàng cho phần thực hành mẫu mi yêu thích.
              </span>
            </span>
            <AppIcon icon={ArrowRight} size="sm" className={`shrink-0 ${styles.selectionActionArrow}`} />
          </button>
        )
      ) : null}

      {item.menuSelectionEnabled ? (
        hasCompleteMenuSelection ? (
          <div className={`mt-3 overflow-hidden rounded-2xl ${styles.selectionSummary}`}>
            <div className={styles.selectionSummaryHeader}>
              <div className="flex min-w-0 items-center gap-2">
                <span className={styles.selectionSummaryIcon}>
                  <AppIcon icon={UtensilsCrossed} size="sm" />
                </span>
                <div className="min-w-0">
                  <p className={styles.selectionSummaryEyebrow}>Phần ăn của bạn</p>
                  <p className={styles.selectionSummarySubcopy}>
                    {selectedMenuItems.length} món đã sẵn sàng cho workshop
                  </p>
                </div>
              </div>
              <span className={styles.selectionSummaryStatus}>
                <Check size={12} strokeWidth={3} aria-hidden="true" /> Đủ món
              </span>
            </div>
            <div className={styles.menuSelectionGrid}>
              {selectedMenuItems.map((selection) => (
                <div key={selection.category} className={styles.menuSelectionItem}>
                  {selection.imageUrl ? (
                    <span onClick={(e) => e.stopPropagation()}>
                      <AntdImage
                        src={selection.imageUrl}
                        alt=""
                        className={styles.menuSelectionImage}
                        wrapperClassName="!h-10 !w-10 shrink-0 rounded-lg overflow-hidden block"
                      />
                    </span>
                  ) : (
                    <span className={styles.menuSelectionFallback}>
                      <AppIcon icon={UtensilsCrossed} size="sm" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className={styles.menuSelectionLabel}>{selection.label}</p>
                    <p className={styles.menuSelectionName}>{selection.name}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold transition ${styles.selectionSummaryAction}`}
              disabled={menuCountdown.locked}
              title={menuCountdown.locked ? 'Đã hết hạn thay đổi phần ăn.' : 'Bạn có thể thay đổi đến hạn chốt đã đặt.'}
              onClick={() => onOpenSelectionSheet('menu')}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span>{menuCountdown.locked ? 'Phần ăn đã chốt' : 'Đổi phần ăn'}</span>
                <span className={styles.selectionChangeCountdown} aria-live="polite" suppressHydrationWarning>
                  {menuCountdown.locked ? 'Đã chốt' : menuCountdown.label}
                </span>
              </span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-haspopup="dialog"
            className={`group mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left transition ${styles.selectionAction}`}
            disabled={menuCountdown.locked}
            title={menuCountdown.locked ? 'Đã hết hạn chọn phần ăn.' : 'Chọn phần ăn trước hạn chốt.'}
            onClick={() => onOpenSelectionSheet('menu')}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${styles.selectionActionIcon}`}
            >
              <AppIcon icon={UtensilsCrossed} size="sm" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${styles.selectionActionTitle}`}>
                {selectedMenuItems.length
                  ? `Hoàn tất phần ăn (${selectedMenuItems.length}/${menuCategoriesCount})`
                  : 'Chọn phần ăn'}
              </span>
              <span className={`mt-0.5 block truncate text-xs leading-5 ${styles.selectionActionDescription}`}>
                {selectedMenuItems.length
                  ? selectedMenuItems.map((selection) => selection.name).join(' · ')
                  : 'Chọn món để nhà hàng chuẩn bị riêng.'}
              </span>
            </span>
            <AppIcon icon={ArrowRight} size="sm" className={`shrink-0 ${styles.selectionActionArrow}`} />
          </button>
        )
      ) : null}
    </>
  );
}
