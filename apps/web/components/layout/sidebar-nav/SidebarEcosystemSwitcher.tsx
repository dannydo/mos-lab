'use client';

import React from 'react';
import {
  isLabPathname,
  isMissionPathname,
  isReportPathname,
  isWingsGardenPathname,
} from '../../../config/ecosystem-nav';
import { AppIcon } from '../../ui/AppIcon';
import type { EcosystemNavigateHandler, SidebarEcosystemModel } from './sidebarNavTypes';

interface SidebarEcosystemSwitcherProps {
  ecosystemModel: SidebarEcosystemModel;
  pathname: string;
  themeMode: string;
  onEcosystemNavigate: EcosystemNavigateHandler;
}

export const SidebarEcosystemSwitcher: React.FC<SidebarEcosystemSwitcherProps> = ({
  ecosystemModel,
  pathname,
  themeMode,
  onEcosystemNavigate,
}) => {
  const isDark = themeMode === 'dark';

  const activeButtonClasses =
    'bg-[var(--mos-accent-soft)] text-[var(--mos-accent)] border border-[var(--mos-accent-border)]';
  const inactiveButtonClasses = isDark
    ? 'bg-white/[0.03] border border-white/[0.06] text-[var(--mos-text,var(--foreground))]'
    : 'bg-slate-900/[0.03] border border-slate-900/[0.06] text-[var(--mos-text,var(--foreground))]';

  return (
    <div
      className={`px-2.5 pt-2.5 pb-2 mb-1 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-900/[0.08]'}`}
      data-testid="sidebar-ecosystem-switcher"
    >
      <div
        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 pb-1.5 ${
          isDark ? 'text-white/45' : 'text-black/[0.48]'
        }`}
      >
        Hệ sinh thái mOS
      </div>
      <div className="flex flex-col gap-1">
        {ecosystemModel.coreApps.map((app) => {
          const Icon = app.icon;
          const isActive =
            app.key === 'general' &&
            !isReportPathname(pathname) &&
            !isMissionPathname(pathname) &&
            !isLabPathname(pathname) &&
            !isWingsGardenPathname(pathname);
          return (
            <button
              key={app.key}
              type="button"
              data-sidebar-eco-app={app.key}
              onClick={() => onEcosystemNavigate(app.key, app.href)}
              className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2.5 text-left text-xs font-semibold transition-all cursor-pointer active:scale-[0.99] ${
                isActive ? activeButtonClasses : inactiveButtonClasses
              }`}
            >
              <AppIcon icon={Icon} size="sm" />
              <span className="flex-1 truncate">{app.label}</span>
              {app.badgeCount && app.badgeCount > 0 ? (
                <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
                  {app.badgeCount > 99 ? '99+' : app.badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {ecosystemModel.suiteApps.length > 0 && (
        <div className={`grid gap-1 mt-1.5 ${ecosystemModel.suiteApps.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {ecosystemModel.suiteApps.map((suite, index) => {
            const Icon = suite.icon;
            const isActive =
              (suite.key === 'reports' && isReportPathname(pathname)) ||
              (suite.key === 'mission' && isMissionPathname(pathname)) ||
              (suite.key === 'lab' && isLabPathname(pathname)) ||
              (suite.key === 'wings-garden' && isWingsGardenPathname(pathname));
            const spanFull =
              ecosystemModel.suiteApps.length > 1 &&
              ecosystemModel.suiteApps.length % 2 === 1 &&
              index === ecosystemModel.suiteApps.length - 1;
            return (
              <button
                key={suite.key}
                type="button"
                data-sidebar-eco-suite={suite.key}
                title={suite.label}
                onClick={() => onEcosystemNavigate(suite.key, suite.href, suite.action)}
                className={`px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left text-[11px] font-semibold transition-all min-w-0 cursor-pointer active:scale-[0.99] ${
                  spanFull ? 'col-span-2' : ''
                } ${isActive ? activeButtonClasses : inactiveButtonClasses}`}
              >
                <AppIcon icon={Icon} size="sm" />
                <span className="flex-1 truncate">{suite.shortLabel || suite.label}</span>
                {suite.badgeCount && suite.badgeCount > 0 ? (
                  <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold tabular-nums shrink-0">
                    {suite.badgeCount > 99 ? '99+' : suite.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      {(ecosystemModel.footerActions?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1 mt-1.5">
          {ecosystemModel.footerActions?.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                data-sidebar-eco-suite={item.key}
                title={item.label}
                onClick={() => onEcosystemNavigate(item.key, item.href, item.action)}
                className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left text-[11px] font-semibold transition-all min-w-0 cursor-pointer active:scale-[0.99] ${inactiveButtonClasses}`}
              >
                <AppIcon icon={Icon} size="sm" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold tabular-nums shrink-0">
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
