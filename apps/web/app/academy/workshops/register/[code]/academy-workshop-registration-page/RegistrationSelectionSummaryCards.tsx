'use client';

import React from 'react';
import { ChevronRight, Sparkles, UtensilsCrossed, Wrench } from 'lucide-react';
import { ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import type {
  SelectionSheetKind,
  WorkshopDesignItem,
  WorkshopEquipmentPackage,
  WorkshopPublicDetail,
} from './registrationTypes';
import { equipmentEffectivePriceLabel, formatFee } from './registrationUtils';

export interface RegistrationSelectionSummaryCardsProps {
  workshop: WorkshopPublicDetail;
  selectedEquipmentPackage: WorkshopEquipmentPackage | undefined;
  selectedDesign: WorkshopDesignItem | undefined;
  selectedMenuCount: number;
  onOpenSelectionSheet: (selection: SelectionSheetKind) => void;
}

export function RegistrationSelectionSummaryCards({
  workshop,
  selectedEquipmentPackage,
  selectedDesign,
  selectedMenuCount,
  onOpenSelectionSheet,
}: RegistrationSelectionSummaryCardsProps) {
  const handleKeyDown = (selection: SelectionSheetKind) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenSelectionSheet(selection);
    }
  };

  return (
    <div className="space-y-2.5 pb-3">
      {workshop.equipment.packages.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenSelectionSheet('equipment')}
          onKeyDown={handleKeyDown('equipment')}
          className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition dark:border-amber-900/50 dark:bg-amber-950/20"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <AppIcon icon={Wrench} size="sm" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {selectedEquipmentPackage ? selectedEquipmentPackage.name : 'Chọn bộ dụng cụ thực hành'}
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {selectedEquipmentPackage
                  ? `${equipmentEffectivePriceLabel(selectedEquipmentPackage)} · Chạm để đổi`
                  : workshop.equipment.required
                    ? 'Bắt buộc chọn'
                    : 'Tùy chọn'}
              </div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" aria-hidden="true" />
        </div>
      )}

      {workshop.design.items.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenSelectionSheet('design')}
          onKeyDown={handleKeyDown('design')}
          className="flex items-center justify-between p-3 rounded-2xl border border-purple-200/80 bg-purple-50/50 hover:bg-purple-50 cursor-pointer transition dark:border-purple-900/50 dark:bg-purple-950/20"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <AppIcon icon={Sparkles} size="sm" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {selectedDesign ? selectedDesign.name : 'Chọn mẫu thiết kế mi'}
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {selectedDesign
                  ? `${ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[selectedDesign.difficultyLevel] || selectedDesign.difficultyLevel}${selectedDesign.priceVnd > 0 ? ` · +${formatFee(selectedDesign.priceVnd)}` : ''} · Chạm để đổi`
                  : workshop.design.required
                    ? 'Bắt buộc chọn'
                    : 'Tùy chọn'}
              </div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" aria-hidden="true" />
        </div>
      )}

      {workshop.menu.categories.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenSelectionSheet('menu')}
          onKeyDown={handleKeyDown('menu')}
          className="flex items-center justify-between p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition dark:border-emerald-900/50 dark:bg-emerald-950/20"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <AppIcon icon={UtensilsCrossed} size="sm" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {selectedMenuCount === workshop.menu.categories.length ? 'Đã chọn đủ phần ăn' : 'Chọn thực đơn ăn trưa'}
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {selectedMenuCount}/{workshop.menu.categories.length} phần đã chọn · Chạm để đổi
              </div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
