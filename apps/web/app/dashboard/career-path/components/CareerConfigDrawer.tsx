'use client';

import React from 'react';
import { Segmented, ConfigProvider } from 'antd';
import { ShieldAlert } from 'lucide-react';
import { AdaptiveDrawer } from '../../../../components/ui/AdaptiveOverlay';
import {
  type CareerConfigDrawerProps,
  type CareerConfigSavePayload,
  type CareerConfigTab,
  computeStage1SalesSummary,
  computeStage2SalesSummary,
  resolveCvPlusToCvPlusPlusConfig,
  resolveCvToCcConfig,
  resolveFmFloorFarmConfig,
} from './career-config-drawer/careerConfigTypesAndHelpers';
import { CvlBadge, CvllBadge } from './career-config-drawer/CareerConfigFieldPrimitives';
import { CareerStage1ConfigTab } from './career-config-drawer/CareerStage1ConfigTab';
import { CareerStage2ConfigTab } from './career-config-drawer/CareerStage2ConfigTab';
import { CareerStage3FmConfigTab } from './career-config-drawer/CareerStage3FmConfigTab';

export type { CareerConfigDrawerProps, CareerConfigSavePayload, CareerConfigTab };

export function CareerConfigDrawer({
  open,
  onClose,
  config,
  onConfigChange,
  onSave,
  saving,
  themeMode,
  canEdit = true,
}: CareerConfigDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<CareerConfigTab>('CV_TO_CV_PLUS');

  const cvToCc = resolveCvToCcConfig(config);
  const cvPlusToCvPlusPlus = resolveCvPlusToCvPlusPlusConfig(config);
  const fmFloorFarm = resolveFmFloorFarmConfig(config);

  const stage1Summary = computeStage1SalesSummary(cvToCc);
  const stage2Summary = computeStage2SalesSummary(cvPlusToCvPlusPlus);

  const handleSaveAll = () => {
    if (!canEdit) return;
    onSave({
      cvToCc,
      cvToCvPlus: cvToCc,
      cvPlusToCvPlusPlus,
      fmFloorFarm,
      maintenanceRules: {
        cvPlus: {
          minSelfComboRate: cvToCc.minSelfComboRate ?? 0.21,
          maxFixRate: cvToCc.maxFixRate ?? 0.03,
          minHappinessIndex: config.maintenanceRules?.cvPlus?.minHappinessIndex ?? 0.65,
          consecutiveFailedMonthsToDemote: config.maintenanceRules?.cvPlus?.consecutiveFailedMonthsToDemote ?? 2,
        },
        cvPlusPlus: {
          minSelfComboRate: cvPlusToCvPlusPlus.minSelfComboRate ?? 0.21,
          minHappinessIndex: cvPlusToCvPlusPlus.minHappinessIndex ?? 0.7,
          consecutiveFailedMonthsToDemote: cvPlusToCvPlusPlus.consecutiveFailedMonthsToDemote ?? 2,
        },
      },
    });
  };

  return (
    <AdaptiveDrawer
      title="⚙️ Cấu Hình Thông Số Thăng Tiến (Zero-Code Admin)"
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      className={themeMode === 'dark' ? 'dark-theme' : 'light-theme'}
    >
      <div className="space-y-4 pb-20">
        {/* READ-ONLY LOCK BANNER IF NOT SUPER ADMIN */}
        {!canEdit && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5 shadow-2xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="leading-relaxed">
              <strong className="font-black text-amber-700 dark:text-amber-300">Chế độ chỉ xem:</strong> Chỉ Super Admin
              (Danny) mới có quyền thay đổi và lưu các thông số lộ trình thăng tiến.
            </div>
          </div>
        )}

        {/* TAB / SEGMENTED SWITCHER: CV -> CVL vs CVL -> CVLL vs FM */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
          <Segmented
            block
            value={activeTab}
            onChange={(val) => setActiveTab(val as CareerConfigTab)}
            options={[
              {
                label: (
                  <span className="inline-flex items-center justify-center gap-1 py-1 text-xs font-bold">
                    <span>Ải 1: CV ➔</span>
                    <CvlBadge />
                  </span>
                ),
                value: 'CV_TO_CV_PLUS',
              },
              {
                label: (
                  <span className="inline-flex items-center justify-center gap-1 py-1 text-xs font-bold">
                    <span>Ải 2:</span>
                    <CvlBadge />
                    <span>➔</span>
                    <CvllBadge />
                  </span>
                ),
                value: 'CV_PLUS_TO_CV_PLUS_PLUS',
              },
              {
                label: (
                  <span className="inline-flex items-center justify-center gap-1 py-1 text-xs font-bold">
                    <span>Ải 3: FM</span>
                  </span>
                ),
                value: 'FM_FLOOR_FARM',
              },
            ]}
          />
        </div>

        <ConfigProvider componentDisabled={!canEdit}>
          {activeTab === 'CV_TO_CV_PLUS' ? (
            <CareerStage1ConfigTab
              config={config}
              cvToCc={cvToCc}
              summary={stage1Summary}
              onConfigChange={onConfigChange}
            />
          ) : activeTab === 'CV_PLUS_TO_CV_PLUS_PLUS' ? (
            <CareerStage2ConfigTab
              config={config}
              cvPlusToCvPlusPlus={cvPlusToCvPlusPlus}
              summary={stage2Summary}
              stage1SerumOriginalPriceBonus={stage1Summary.serumOrigBonus}
              onConfigChange={onConfigChange}
            />
          ) : (
            <CareerStage3FmConfigTab config={config} fmFloorFarm={fmFloorFarm} onConfigChange={onConfigChange} />
          )}
        </ConfigProvider>
      </div>

      {/* STICKY FOOTER */}
      <div className="sticky bottom-0 -mx-6 -mb-6 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shadow-lg">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>Đang cấu hình:</span>
          <strong className="text-slate-700 dark:text-slate-200 inline-flex items-center gap-1">
            {activeTab === 'CV_TO_CV_PLUS' ? (
              <>
                <span>Ải CV ➔</span>
                <CvlBadge />
              </>
            ) : activeTab === 'CV_PLUS_TO_CV_PLUS_PLUS' ? (
              <>
                <span>Ải</span>
                <CvlBadge />
                <span>➔</span>
                <CvllBadge />
              </>
            ) : (
              <span>Ải 3: Floor Manager (FM 1–2–3)</span>
            )}
          </strong>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!canEdit || saving}
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/30 hover:opacity-95 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title={!canEdit ? 'Chỉ Super Admin (Danny) mới có quyền lưu cấu hình' : undefined}
          >
            {saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Mới'}
          </button>
        </div>
      </div>
    </AdaptiveDrawer>
  );
}
