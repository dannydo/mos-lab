'use client';

import React from 'react';
import { Button, Select, Slider, Switch } from 'antd';
import { Settings, Sparkles, Square, Volume2 } from 'lucide-react';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';
import {
  DEMO_CELEBRATION_BUTTONS,
  EDGINESS_LEVEL_OPTIONS,
  PERSONA_MODE_OPTIONS,
  type TestFireworksKind,
} from './tvMonitorCardTypes';

interface TvMonitorSettingsPopoverProps {
  isDark: boolean;
  settings: TvCelebrationSettings;
  fireworksEnabled: boolean;
  soundEnabled: boolean;
  volume: number;
  testFireworksBook: boolean;
  testFireworksCheckin: boolean;
  testFireworksDone: boolean;
  onUpdateSettings: (next: Partial<TvCelebrationSettings>) => void;
  onOpenQuotesDrawer: () => void;
  onTriggerTestFireworks: (type: TestFireworksKind) => void;
  onStopTestFireworks: () => void;
  onTriggerDemoCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>['triggerDemoCelebration'];
}

/** Settings popover body for configuring fireworks, voice announcements, persona, and live test triggers. */
export const TvMonitorSettingsPopover: React.FC<TvMonitorSettingsPopoverProps> = ({
  isDark,
  settings,
  fireworksEnabled,
  soundEnabled,
  volume,
  testFireworksBook,
  testFireworksCheckin,
  testFireworksDone,
  onUpdateSettings,
  onOpenQuotesDrawer,
  onTriggerTestFireworks,
  onStopTestFireworks,
  onTriggerDemoCelebration,
}) => {
  const dividerClass = isDark ? 'border-zinc-800/80' : 'border-slate-200';
  const mutedTextClass = isDark ? 'text-zinc-400' : 'text-slate-500';
  const labelTextClass = isDark ? 'text-zinc-200' : 'text-slate-800';
  const isAnyTestFireworkActive = testFireworksBook || testFireworksCheckin || testFireworksDone;

  return (
    <div className={`w-72 sm:w-80 p-1 flex flex-col gap-3.5 ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
      {/* Title */}
      <div className={`border-b ${dividerClass} pb-2 flex items-center justify-between`}>
        <div>
          <span
            className={`font-bold text-xs sm:text-sm ${isDark ? 'text-zinc-100' : 'text-slate-900'} flex items-center gap-1.5`}
          >
            <Settings className="w-3.5 h-3.5 text-amber-500" />
            Cấu hình Pháo bông & Âm thanh
          </span>
          <span className={`text-[10px] ${mutedTextClass} block mt-0.5`}>TV Monitor Telesales Hôm Nay</span>
        </div>
      </div>

      {/* Switch 1: Fireworks */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className={`text-xs font-semibold ${labelTextClass} flex items-center gap-1.5`}>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Pháo bông chúc mừng
          </span>
          <span className={`text-[10px] ${mutedTextClass} block mt-0.5 leading-tight`}>
            Tự động bắn pháo khi Book, Check-in hoặc Cuộc gọi đạt ≥ 100%
          </span>
        </div>
        <Switch
          checked={fireworksEnabled}
          onChange={(checked) => onUpdateSettings({ fireworksEnabled: checked })}
          className={isDark ? 'bg-zinc-700 shrink-0' : 'shrink-0'}
        />
      </div>

      {/* Switch 2: Sound */}
      <div className={`flex items-center justify-between gap-2 border-t ${dividerClass} pt-2.5`}>
        <div>
          <span className={`text-xs font-semibold ${labelTextClass} flex items-center gap-1.5`}>
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            Âm thanh hiệu ứng & Loa
          </span>
          <span className={`text-[10px] ${mutedTextClass} block mt-0.5 leading-tight`}>
            Tiếng rít phóng pháo hoa, tiếng nổ boom & chúc mừng
          </span>
        </div>
        <Switch
          checked={soundEnabled}
          onChange={(checked) => onUpdateSettings({ soundEnabled: checked })}
          className={isDark ? 'bg-zinc-700 shrink-0' : 'shrink-0'}
        />
      </div>

      {/* Slider: Volume */}
      <div className={`border-t ${dividerClass} pt-2.5`}>
        <div className={`flex justify-between text-[11px] font-mono ${mutedTextClass} mb-1`}>
          <span>Âm lượng loa</span>
          <span className={`${isDark ? 'text-amber-300' : 'text-amber-600'} font-bold tabular-nums`}>
            {Math.round(volume * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(val) => onUpdateSettings({ volume: val })}
          disabled={!soundEnabled}
        />
      </div>

      {/* Select: Persona Mode */}
      <div className={`border-t ${dividerClass} pt-2.5`}>
        <span className={`text-[11px] block mb-1 ${mutedTextClass}`}>Hình tượng MC (Persona)</span>
        <Select
          size="small"
          value={settings.personaMode || 'RANDOM_MULTI'}
          onChange={(val) => onUpdateSettings({ personaMode: val })}
          className="w-full text-xs"
          options={PERSONA_MODE_OPTIONS}
        />
      </div>

      {/* Select: Edginess Level */}
      <div>
        <span className={`text-[11px] block mb-1 ${mutedTextClass}`}>Độ nham nhở & Cà khịa</span>
        <Select
          size="small"
          value={settings.edginessLevel || 'SUPER_SPICY'}
          onChange={(val) => onUpdateSettings({ edginessLevel: val })}
          className="w-full text-xs"
          options={EDGINESS_LEVEL_OPTIONS}
        />
      </div>

      {/* Button: Quản lý thông điệp cổ vũ */}
      <div className={`border-t ${dividerClass} pt-2.5`}>
        <Button
          type="primary"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          className="w-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-0 text-black flex items-center justify-center gap-1.5 shadow-sm py-1.5 h-auto cursor-pointer"
          onClick={onOpenQuotesDrawer}
        >
          📣 Quản lý thông điệp cổ vũ
        </Button>
      </div>

      {/* Section: Test Fireworks */}
      <div className={`border-t ${dividerClass} pt-2.5 flex flex-col gap-2`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-mono ${isDark ? 'text-zinc-300' : 'text-slate-700'} font-bold flex items-center gap-1`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            Bắn thử nghiệm pháo hoa:
          </span>
          {isAnyTestFireworkActive && (
            <button
              type="button"
              onClick={onStopTestFireworks}
              className={`text-[10px] ${
                isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
              } flex items-center gap-0.5 font-bold cursor-pointer`}
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              Dừng bắn
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="small"
            onClick={() => onTriggerTestFireworks('BOOK')}
            className={`text-[11px] font-bold h-7 rounded-lg transition-all ${
              testFireworksBook
                ? 'bg-sky-600 text-white border-sky-400 animate-pulse'
                : isDark
                  ? 'bg-sky-950/80 border-sky-500/60 text-sky-300 hover:bg-sky-900'
                  : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
            }`}
          >
            🎆 Pháo Book
          </Button>
          <Button
            size="small"
            onClick={() => onTriggerTestFireworks('CHECKIN')}
            className={`text-[11px] font-bold h-7 rounded-lg transition-all ${
              testFireworksCheckin
                ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                : isDark
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🎆 Pháo Check-in
          </Button>
        </div>
      </div>

      {/* Section: Test Voice Celebrations */}
      {onTriggerDemoCelebration && (
        <div className={`border-t ${dividerClass} pt-2.5 flex flex-col gap-1.5`}>
          <span
            className={`text-[11px] font-mono ${isDark ? 'text-zinc-300' : 'text-slate-700'} font-bold flex items-center gap-1`}
          >
            <Volume2 className="w-3 h-3 text-blue-500" />
            Thử loa giọng nói:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_CELEBRATION_BUTTONS.map((btn) => (
              <Button
                key={btn.kind}
                size="small"
                onClick={() => onTriggerDemoCelebration(btn.kind)}
                className={`text-[11px] ${isDark ? btn.darkClass : btn.lightClass} h-7 rounded-lg font-medium`}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
