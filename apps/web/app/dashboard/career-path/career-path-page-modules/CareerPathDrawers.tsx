'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';
import type {
  BananaTransactionCategory,
  CareerPeriod,
  CareerProgressionConfig,
  CareerStaffSummary,
  StaffCareerStatus,
} from '@mos-lab/shared';
import { AdaptiveDrawer } from '~/components/ui/AdaptiveOverlay';
import { CareerConfigDrawer } from '../components/CareerConfigDrawer';
import { BananaTransactionDrawer } from '../components/BananaTransactionDrawer';
import { MobileStaffCareerSheet } from '../components/MobileStaffCareerSheet';
import { CareerRealmEncyclopedia } from '../components/CareerRealmEncyclopedia';
import { CareerBibleDrawer, type CareerBibleTopic } from '../components/CareerBibleDrawer';
import { IslandGameIcon, WingRoleLabel } from '../components/IslandGameIcon';
import type { CareerIsland } from '../career-path.constants';
import type { CareerConfigSavePayload, CareerIslandId } from './careerPathTypesAndHelpers';

interface CareerPathDrawersProps {
  selectedBibleTopic: CareerBibleTopic | null;
  onCloseBibleDrawer: () => void;
  isMapDrawerOpen: boolean;
  onCloseMapDrawer: () => void;
  islands: CareerIsland[];
  activeIsland: CareerIslandId;
  onSelectMapIsland: (islandId: CareerIsland['id']) => void;
  isMobileStaffDrawerOpen: boolean;
  onCloseMobileStaffDrawer: () => void;
  safeConfig: CareerProgressionConfig;
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  isEncyclopediaDrawerOpen: boolean;
  onCloseEncyclopediaDrawer: () => void;
  currentIslandData: CareerIsland;
  isConfigDrawerOpen: boolean;
  onCloseConfigDrawer: () => void;
  onConfigChange: (nextConfig: CareerProgressionConfig) => void;
  onSaveConfig: (payload: CareerConfigSavePayload) => Promise<void>;
  savingConfig: boolean;
  themeMode: 'light' | 'dark';
  isDanny: boolean;
  isBananaDrawerOpen: boolean;
  onCloseBananaDrawer: () => void;
  selectedStaffStatus: StaffCareerStatus | null;
  bananaDrawerCategory: BananaTransactionCategory;
  selectedPeriod: CareerPeriod;
}

export const CareerPathDrawers: React.FC<CareerPathDrawersProps> = ({
  selectedBibleTopic,
  onCloseBibleDrawer,
  isMapDrawerOpen,
  onCloseMapDrawer,
  islands,
  activeIsland,
  onSelectMapIsland,
  isMobileStaffDrawerOpen,
  onCloseMobileStaffDrawer,
  safeConfig,
  staffList,
  selectedStaffId,
  onSelectStaff,
  isEncyclopediaDrawerOpen,
  onCloseEncyclopediaDrawer,
  currentIslandData,
  isConfigDrawerOpen,
  onCloseConfigDrawer,
  onConfigChange,
  onSaveConfig,
  savingConfig,
  themeMode,
  isDanny,
  isBananaDrawerOpen,
  onCloseBananaDrawer,
  selectedStaffStatus,
  bananaDrawerCategory,
  selectedPeriod,
}) => {
  return (
    <>
      {/* CAREER BIBLE DRAWER (KINH THÁNH mOS) */}
      <CareerBibleDrawer open={!!selectedBibleTopic} onClose={onCloseBibleDrawer} topic={selectedBibleTopic} />

      {/* 7 ISLANDS MAP BOTTOM SHEET FOR MOBILE */}
      <AdaptiveDrawer
        title={
          <div className="flex items-center gap-2">
            <span className="text-base">🗺️</span>
            <span className="font-black text-base">Bản Đồ 7 Đảo Thế Giới Thiên Thần</span>
          </div>
        }
        placement="bottom"
        height="75vh"
        open={isMapDrawerOpen}
        onClose={onCloseMapDrawer}
        destroyOnHidden
      >
        <div className="p-3 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Chọn một vương quốc để khám phá bí tịch kỹ năng và chuẩn thăng tiến:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {islands.map((island) => {
              const isActive = activeIsland === island.id;
              return (
                <button
                  key={island.id}
                  type="button"
                  onClick={() => onSelectMapIsland(island.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-pink-50/70 dark:bg-pink-950/30 border-pink-500 shadow-sm ring-1 ring-pink-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <IslandGameIcon islandId={island.id} size="sm" isActive={isActive} />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <WingRoleLabel text={island.name.split('·')[0]?.trim()} />
                      </div>
                      <div className="text-[10px] text-pink-600 dark:text-pink-300 font-bold truncate">
                        {island.name.split('·')[1]?.trim()}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{island.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </AdaptiveDrawer>

      {/* MOBILE STAFF SELECTOR BOTTOM SHEET */}
      <AdaptiveDrawer
        title={
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/25 flex items-center justify-center shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-sm">Chọn Nhân Sự</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white tabular-nums shadow-xs">
                {staffList.length} Nhân Sự
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal m-0 mt-0.5">
              Chạm để xem hồ sơ và kích hoạt thử thách
            </p>
          </div>
        }
        placement="bottom"
        height="85vh"
        open={isMobileStaffDrawerOpen}
        onClose={onCloseMobileStaffDrawer}
        destroyOnHidden
      >
        <MobileStaffCareerSheet
          config={safeConfig}
          staffList={staffList}
          selectedStaffId={selectedStaffId}
          onSelectStaff={onSelectStaff}
          onClose={onCloseMobileStaffDrawer}
        />
      </AdaptiveDrawer>

      {/* ACTIVE REALM LORE & SKILL ENCYCLOPEDIA DRAWER */}
      <AdaptiveDrawer
        title={
          <div className="flex items-center gap-2">
            <IslandGameIcon islandId={currentIslandData.id} size="sm" isActive />
            <span className="font-black text-base">{currentIslandData.name}</span>
          </div>
        }
        placement="right"
        width={680}
        open={isEncyclopediaDrawerOpen}
        onClose={onCloseEncyclopediaDrawer}
        destroyOnHidden
      >
        <CareerRealmEncyclopedia currentIslandData={currentIslandData} />
      </AdaptiveDrawer>

      {/* ADMIN CONFIG DRAWER */}
      <CareerConfigDrawer
        open={isConfigDrawerOpen}
        onClose={onCloseConfigDrawer}
        config={safeConfig}
        onConfigChange={onConfigChange}
        onSave={onSaveConfig}
        saving={savingConfig}
        themeMode={themeMode}
        canEdit={isDanny}
      />

      {/* BANANA TRANSACTION & GIVE AWAY DRAWER */}
      <BananaTransactionDrawer
        open={isBananaDrawerOpen}
        onClose={onCloseBananaDrawer}
        staffId={selectedStaffId}
        staffName={selectedStaffStatus?.staffName}
        avatarUrl={selectedStaffStatus?.avatarUrl}
        initialCategory={bananaDrawerCategory}
        period={selectedPeriod}
      />
    </>
  );
};
