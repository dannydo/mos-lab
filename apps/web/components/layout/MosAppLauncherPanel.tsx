'use client';

import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import type { normalizeCvFeatherRole } from '@mos-lab/shared';
import type {
  EcosystemAppItem,
  EcosystemAppKey,
  EcosystemSuiteItem,
  EcosystemSuiteKey,
  EcosystemTone,
} from '../../config/ecosystem-nav';
import { CvFeather1Badge, CvFeather2Badge } from '../../app/ios-app/components/ui-kit/CvFeatherLabels';

export interface MosAppLauncherPanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  panelPos: React.CSSProperties;
  isDark: boolean;
  resolvedAvatar?: string;
  effectiveDisplayName: string;
  displayInitial: string;
  featherTier: ReturnType<typeof normalizeCvFeatherRole>;
  effectiveRole: string;
  isCcTeamMember: boolean;
  coreApps: EcosystemAppItem[];
  suiteApps: EcosystemSuiteItem[];
  footerActions: EcosystemSuiteItem[];
  coreColsClass: string;
  suiteColsClass: string;
  isCoreAppActive: (key: EcosystemAppKey) => boolean;
  isSuiteActive: (key: EcosystemSuiteKey) => boolean;
  toneClass: (tone: EcosystemTone) => string;
  onClose: () => void;
  onOpenProfileClick: () => void;
  onNavigate: (href: string, key?: string) => void;
  onSuiteClick: (suite: EcosystemSuiteItem) => void;
}

export const MosAppLauncherPanel: React.FC<MosAppLauncherPanelProps> = ({
  panelRef,
  panelPos,
  isDark,
  resolvedAvatar,
  effectiveDisplayName,
  displayInitial,
  featherTier,
  effectiveRole,
  isCcTeamMember,
  coreApps,
  suiteApps,
  footerActions,
  coreColsClass,
  suiteColsClass,
  isCoreAppActive,
  isSuiteActive,
  toneClass,
  onClose,
  onOpenProfileClick,
  onNavigate,
  onSuiteClick,
}) => {
  return (
    <>
      <div
        className="fixed inset-0 z-[2000] bg-black/55 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Hệ sinh thái mOS"
        data-testid="mos-app-launcher-panel"
        style={{
          ...panelPos,
          backgroundColor: isDark ? '#0e131f' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
          color: isDark ? '#f8fafc' : '#0f172a',
        }}
        className="z-[2010] rounded-2xl border shadow-2xl p-3.5 select-none"
      >
        {/* Header identity + role/team badge (clickable to open Unified Profile Sheet) */}
        <div
          className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
        >
          <button
            type="button"
            data-testid="mos-launcher-profile-btn"
            onClick={onOpenProfileClick}
            title="Mở Hồ sơ & Giao diện cá nhân"
            className={`flex items-center gap-2.5 min-w-0 flex-1 rounded-xl p-1 -m-1 text-left transition-colors cursor-pointer ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/70 bg-amber-400 text-black font-black text-xs flex items-center justify-center shrink-0">
              {resolvedAvatar ? (
                <img src={resolvedAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
              ) : (
                <span>{displayInitial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold truncate flex items-center gap-1">
                <span className="truncate">{effectiveDisplayName}</span>
                <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />
              </div>
              <div className="text-[10.5px] opacity-65 truncate">Hồ sơ & Cài đặt cá nhân</div>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border leading-none ${
                isDark
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {featherTier === 'CVLL' ? (
                <CvFeather2Badge />
              ) : featherTier === 'CVL' ? (
                <CvFeather1Badge />
              ) : isCcTeamMember && String(effectiveRole || '').toLowerCase() !== 'cc' ? (
                `${String(effectiveRole || '').toUpperCase()} · Nhóm CC`
              ) : (
                String(effectiveRole || 'STAFF').toUpperCase()
              )}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bộ chuyển phân hệ"
              className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer md:hidden ${
                isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 1: Core Apps */}
        <div
          className={`grid gap-2 ${suiteApps.length > 0 || footerActions.length > 0 ? 'mb-3' : ''} ${coreColsClass}`}
        >
          {coreApps.map((app) => {
            const Icon = app.icon;
            const active = isCoreAppActive(app.key);
            return (
              <button
                key={app.key}
                type="button"
                data-launcher-app={app.key}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(app.href, app.key)}
                style={{
                  borderColor: active ? '#ffb400' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
                  backgroundColor: active
                    ? isDark
                      ? 'rgba(255,180,0,0.14)'
                      : 'rgba(245,158,11,0.12)'
                    : isDark
                      ? 'rgba(255,255,255,0.03)'
                      : '#f8fafc',
                }}
                className="relative flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer text-center hover:border-amber-400/60"
              >
                {app.badgeCount && app.badgeCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold leading-none flex items-center justify-center tabular-nums">
                    {app.badgeCount > 99 ? '99+' : app.badgeCount}
                  </span>
                ) : null}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneClass(app.tone)}`}>
                  <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="text-[11.5px] font-extrabold leading-tight truncate max-w-full">{app.label}</div>
                <div className="text-[10px] opacity-65 leading-none truncate max-w-full">{app.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Row 2: Ecosystem Suites (Reports, Mission, Bible, Lab, Wings Garden, mOS Kho) */}
        {suiteApps.length > 0 && (
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-55 mb-1.5 px-0.5">
              Phân hệ hệ sinh thái
            </div>
            <div className={`grid gap-2 ${suiteColsClass}`}>
              {suiteApps.map((suite, idx) => {
                const Icon = suite.icon;
                const active = isSuiteActive(suite.key);
                const hasBadge = Boolean(suite.badgeCount && suite.badgeCount > 0);
                const spanFull = suiteApps.length > 1 && suiteApps.length % 2 === 1 && idx === suiteApps.length - 1;
                const tileStyle: React.CSSProperties = {
                  borderColor: active ? '#ffb400' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                  backgroundColor: active
                    ? isDark
                      ? 'rgba(255,180,0,0.14)'
                      : 'rgba(245,158,11,0.1)'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#f1f5f9',
                };

                if (suite.secondaryAction) {
                  const SecondaryIcon = suite.secondaryAction.icon;
                  return (
                    <div
                      key={suite.key}
                      role="group"
                      style={tileStyle}
                      className={`relative rounded-2xl border flex items-stretch overflow-hidden transition-all hover:border-amber-400/50 ${
                        spanFull ? 'col-span-2' : ''
                      }`}
                    >
                      <button
                        type="button"
                        data-launcher-suite={suite.key}
                        aria-current={active ? 'page' : undefined}
                        title={suite.label}
                        onClick={() => onSuiteClick(suite)}
                        className="relative flex-1 min-w-0 p-2.5 flex items-center gap-2 text-left transition-transform active:scale-[0.98] cursor-pointer"
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toneClass(suite.tone)}`}
                        >
                          <Icon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-extrabold leading-tight truncate">{suite.label}</div>
                          <div className="text-[10px] opacity-65 leading-tight truncate mt-0.5">{suite.subtitle}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        data-launcher-suite-secondary={suite.key}
                        aria-label={suite.secondaryAction.label}
                        title={suite.secondaryAction.label}
                        onClick={() => onNavigate(suite.secondaryAction!.href, suite.secondaryAction!.key)}
                        className={`px-2.5 border-l flex items-center justify-center shrink-0 transition-colors active:scale-95 cursor-pointer ${
                          isDark
                            ? 'border-white/10 text-amber-300 hover:bg-amber-500/15'
                            : 'border-slate-900/10 text-amber-700 hover:bg-amber-500/15'
                        }`}
                      >
                        <SecondaryIcon className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={suite.key}
                    type="button"
                    data-launcher-suite={suite.key}
                    aria-current={active ? 'page' : undefined}
                    title={suite.label}
                    onClick={() => onSuiteClick(suite)}
                    style={tileStyle}
                    className={`relative p-2.5 rounded-2xl border flex items-center gap-2 text-left transition-all active:scale-95 cursor-pointer hover:border-amber-400/50 ${
                      spanFull ? 'col-span-2' : ''
                    }`}
                  >
                    {hasBadge ? (
                      <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold leading-none flex items-center justify-center tabular-nums">
                        {suite.badgeCount! > 99 ? '99+' : suite.badgeCount}
                      </span>
                    ) : null}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toneClass(suite.tone)}`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className={`min-w-0 flex-1 ${hasBadge ? 'pr-5' : ''}`}>
                      <div className="text-[11.5px] font-extrabold leading-tight truncate">{suite.label}</div>
                      <div className="text-[10px] opacity-65 leading-tight truncate mt-0.5">{suite.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3: Utility Footer */}
        {footerActions.length > 0 && (
          <div
            className="mt-3 pt-2.5 border-t flex flex-col gap-1.5"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
          >
            {footerActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  data-launcher-suite={item.key}
                  data-launcher-footer={item.key}
                  title={item.label}
                  onClick={() => onSuiteClick(item)}
                  className={`w-full px-2.5 py-2 rounded-xl border flex items-center gap-2.5 text-left transition-all active:scale-[0.99] cursor-pointer ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-amber-400/40'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-amber-400/50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${toneClass(item.tone)}`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-bold leading-tight truncate">{item.label}</span>
                    <span className="text-[10px] opacity-60 leading-tight truncate hidden sm:inline">
                      {item.subtitle}
                    </span>
                  </div>
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="min-w-[17px] h-[17px] px-1.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold leading-none inline-flex items-center justify-center tabular-nums shrink-0">
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  ) : null}
                  <ChevronRight className="w-3.5 h-3.5 opacity-45 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
