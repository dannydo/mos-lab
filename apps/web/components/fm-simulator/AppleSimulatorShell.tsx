'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, ExternalLink, Monitor, Moon, RotateCcw, Smartphone, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './fm-simulator.css';

export interface StudioTabItem<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: React.ReactNode;
}

interface AppleSimulatorShellProps<T extends string> {
  readonly title: string;
  readonly subtitle: string;
  readonly standaloneMobile: boolean;
  readonly embedded?: boolean;
  readonly mobileHref: string;
  readonly peerLink?: { readonly href: string; readonly label: string };
  readonly tabs: readonly StudioTabItem<T>[];
  readonly activeTab: T;
  readonly onTabChange: (tab: T) => void;
  readonly onReset: () => void;
  readonly renderPanel: (compact: boolean) => React.ReactNode;
}

export function AppleSimulatorShell<T extends string>({
  title,
  subtitle,
  standaloneMobile,
  embedded = false,
  mobileHref,
  peerLink,
  tabs,
  activeTab,
  onTabChange,
  onReset,
  renderPanel,
}: AppleSimulatorShellProps<T>) {
  const { themeMode, toggleTheme } = useTheme();
  const [previewPhone, setPreviewPhone] = useState(false);

  const isPhoneFrame = standaloneMobile || previewPhone;

  const tabBarContent = (
    <div role="tablist" aria-label={title} className="flex flex-nowrap items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`sim-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`sim-panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`fm-apple-tab inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-medium whitespace-nowrap transition ${
              isPhoneFrame ? 'flex-1' : ''
            } ${
              selected
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200'
            }`}
          >
            {tab.icon}
            <span>{isPhoneFrame ? tab.shortLabel : tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (standaloneMobile) {
    return (
      <div className="fm-apple-sim fm-mobile-scroll min-h-dvh bg-neutral-100 pb-28 text-neutral-900 dark:bg-black dark:text-neutral-50">
        <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/80">
          <div className="mx-auto flex max-w-[430px] items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                {title}
              </h1>
              <p className="truncate text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Đặt lại mặc định"
                onClick={onReset}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Đổi giao diện Sáng / Tối"
                onClick={toggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {themeMode === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <main
          id={`sim-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`sim-tab-${activeTab}`}
          className="mx-auto max-w-[430px] px-4 pt-4"
        >
          {renderPanel(true)}
        </main>

        <nav aria-label="Điều hướng dưới" className="fm-safe-bottom fixed inset-x-0 bottom-0 z-40 px-4 pt-2">
          <div className="mx-auto max-w-[400px] rounded-2xl border border-black/5 bg-white/85 px-2 py-1 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/90">
            {tabBarContent}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className={embedded ? 'fm-apple-sim w-full space-y-4' : 'fm-apple-sim mx-auto max-w-7xl space-y-5 p-3 sm:p-6'}>
      <header className="flex flex-col justify-between gap-3 rounded-2xl border border-black/5 bg-white/85 px-5 py-4 shadow-xs backdrop-blur-xl sm:flex-row sm:items-center dark:border-white/10 dark:bg-neutral-900/80">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
          <p className="text-xs font-normal text-neutral-400 dark:text-neutral-500">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabBarContent}

          <div className="inline-flex items-center gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              type="button"
              aria-pressed={!previewPhone}
              aria-label="Chế độ Desktop"
              onClick={() => setPreviewPhone(false)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${
                !previewPhone
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-pressed={previewPhone}
              aria-label="Xem trước iPhone 12 Pro"
              onClick={() => setPreviewPhone(true)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${
                previewPhone
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          {!embedded && peerLink ? (
            <Link
              href={peerLink.href}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-black/5 bg-neutral-100/80 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200/70 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>{peerLink.label}</span>
            </Link>
          ) : null}

          <Link
            href={mobileHref}
            target="_blank"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-black/5 bg-neutral-100/80 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200/70 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">iPhone View</span>
          </Link>

          <button
            type="button"
            aria-label="Đặt lại mặc định"
            onClick={onReset}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 transition hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {previewPhone ? (
        <div className="flex justify-center py-2">
          <div className="w-[390px] max-w-full rounded-[44px] border-8 border-neutral-800 bg-neutral-100 p-3 shadow-2xl dark:border-neutral-700 dark:bg-black">
            <div className="mx-auto mb-3 h-5 w-32 rounded-full bg-neutral-900 dark:bg-neutral-800" />
            <div
              id={`sim-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`sim-tab-${activeTab}`}
              className="fm-mobile-scroll max-h-[760px] space-y-4 overflow-y-auto px-1 pb-4"
            >
              {renderPanel(true)}
            </div>
          </div>
        </div>
      ) : (
        <div id={`sim-panel-${activeTab}`} role="tabpanel" aria-labelledby={`sim-tab-${activeTab}`}>
          {renderPanel(false)}
        </div>
      )}
    </div>
  );
}
