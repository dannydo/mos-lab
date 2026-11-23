'use client';

import React from 'react';
import { Button, Select, Slider, Switch } from 'antd';
import { Sparkles, Volume2 } from 'lucide-react';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';
import {
  DEMO_FIREWORK_BUTTONS,
  DEMO_VOICE_PRIMARY_BUTTONS,
  DEMO_VOICE_SPECIAL_BUTTONS,
  EDGINESS_LEVEL_OPTIONS,
  EVENT_TYPE_FILTER_OPTIONS,
  PERSONA_MODE_OPTIONS,
  VOICE_STYLE_OPTIONS,
  type TvFullscreenDemoFireworkKind,
} from './tvFullscreenTypes';

interface TvFullscreenSettingsPopoverProps {
  isDark: boolean;
  voiceSettings: TvCelebrationSettings;
  onUpdateVoiceSettings: (next: Partial<TvCelebrationSettings>) => void;
  onOpenQuotesManager: () => void;
  onTriggerDemoCelebration: ReturnType<typeof useTelesaleTvLiveCelebration>['triggerDemoCelebration'];
  onTriggerTestFireworks: (card: TvFullscreenDemoFireworkKind) => void;
  fullscreenContainerRef: React.RefObject<HTMLDivElement | null>;
}

/** Popover content for configuring TV fireworks, sound volume, persona style, and live demo triggers. */
export const TvFullscreenSettingsPopover: React.FC<TvFullscreenSettingsPopoverProps> = ({
  isDark,
  voiceSettings,
  onUpdateVoiceSettings,
  onOpenQuotesManager,
  onTriggerDemoCelebration,
  onTriggerTestFireworks,
  fullscreenContainerRef,
}) => {
  const dividerClass = isDark ? 'border-zinc-800' : 'border-slate-200';
  const mutedTextClass = isDark ? 'text-zinc-400' : 'text-slate-500';
  const getPopupContainer = (trigger: HTMLElement) =>
    trigger.parentElement || fullscreenContainerRef.current || document.body;

  return (
    <div className={`w-72 p-1 flex flex-col gap-4 ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
      <div className={`flex items-center justify-between border-b pb-2.5 ${dividerClass}`}>
        <div>
          <span
            className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Hiệu ứng pháo bông
          </span>
          <span className={`text-[10px] block ${mutedTextClass}`}>Tự động bắn khi đạt mốc ≥ 100%</span>
        </div>
        <Switch
          checked={voiceSettings.fireworksEnabled ?? true}
          onChange={(checked) => onUpdateVoiceSettings({ fireworksEnabled: checked })}
          className={isDark ? 'bg-zinc-700' : undefined}
        />
      </div>

      <div className={`flex items-center justify-between border-b pb-2.5 ${dividerClass}`}>
        <span className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
          <Volume2 className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          Âm thanh chúc mừng
        </span>
        <Switch
          checked={voiceSettings.soundEnabled}
          onChange={(checked) => onUpdateVoiceSettings({ soundEnabled: checked })}
          className={isDark ? 'bg-zinc-700' : undefined}
        />
      </div>

      <div>
        <div className={`flex justify-between text-xs font-mono mb-1 ${mutedTextClass}`}>
          <span>Âm lượng loa</span>
          <span className={`${isDark ? 'text-amber-300' : 'text-amber-600'} font-bold tabular-nums`}>
            {Math.round(voiceSettings.volume * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={voiceSettings.volume}
          onChange={(val) => onUpdateVoiceSettings({ volume: val })}
          disabled={!voiceSettings.soundEnabled}
        />
      </div>

      <div>
        <span className={`text-xs block mb-1 ${mutedTextClass}`}>Loại sự kiện phát loa</span>
        <Select
          value={voiceSettings.eventTypeFilter}
          onChange={(val) => onUpdateVoiceSettings({ eventTypeFilter: val })}
          className="w-full"
          getPopupContainer={getPopupContainer}
          options={EVENT_TYPE_FILTER_OPTIONS}
        />
      </div>

      <div>
        <span className={`text-xs block mb-1 ${mutedTextClass}`}>Chất giọng phát loa</span>
        <Select
          value={voiceSettings.voiceStyle || 'MALE_CHARM'}
          onChange={(val) => onUpdateVoiceSettings({ voiceStyle: val })}
          className="w-full"
          getPopupContainer={getPopupContainer}
          options={VOICE_STYLE_OPTIONS}
        />
      </div>

      <div>
        <span className={`text-xs block mb-1 ${mutedTextClass}`}>Hình tượng MC (Persona)</span>
        <Select
          value={voiceSettings.personaMode || 'RANDOM_MULTI'}
          onChange={(val) => onUpdateVoiceSettings({ personaMode: val })}
          className="w-full"
          getPopupContainer={getPopupContainer}
          options={PERSONA_MODE_OPTIONS}
        />
      </div>

      <div>
        <span className={`text-xs block mb-1 ${mutedTextClass}`}>Độ nham nhở & Cà khịa</span>
        <Select
          value={voiceSettings.edginessLevel || 'SUPER_SPICY'}
          onChange={(val) => onUpdateVoiceSettings({ edginessLevel: val })}
          className="w-full"
          getPopupContainer={getPopupContainer}
          options={EDGINESS_LEVEL_OPTIONS}
        />
      </div>

      <div className={`flex items-center justify-between border-t pt-2.5 ${dividerClass}`}>
        <div>
          <span className={`text-xs font-medium block ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
            Chế độ im lặng
          </span>
          <span className={`text-[10px] block ${mutedTextClass}`}>Tự động nghỉ 12:00-13:30</span>
        </div>
        <Switch
          checked={voiceSettings.quietModeEnabled}
          onChange={(checked) => onUpdateVoiceSettings({ quietModeEnabled: checked })}
          className={isDark ? 'bg-zinc-700' : undefined}
        />
      </div>

      <div className={`border-t pt-2.5 ${dividerClass}`}>
        <Button
          type="primary"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          className="w-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-0 text-black flex items-center justify-center gap-1.5 shadow-sm py-1.5 h-auto cursor-pointer"
          onClick={onOpenQuotesManager}
        >
          📣 Quản lý thông điệp cổ vũ
        </Button>
      </div>

      <div className={`border-t pt-2.5 flex flex-col gap-1.5 ${dividerClass}`}>
        <span className={`text-[11px] font-mono ${mutedTextClass}`}>Thử nghiệm loa (Demo):</span>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_VOICE_PRIMARY_BUTTONS.map((btn) => (
            <Button
              key={btn.kind}
              size="small"
              className={`text-[11px] ${isDark ? btn.darkClass : btn.lightClass}`}
              onClick={() => onTriggerDemoCelebration(btn.kind)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-0.5">
          {DEMO_VOICE_SPECIAL_BUTTONS.map((btn) => (
            <Button
              key={btn.kind}
              size="small"
              className={`text-[11px] ${isDark ? btn.darkClass : btn.lightClass}`}
              onClick={() => onTriggerDemoCelebration(btn.kind)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={`border-t pt-2.5 flex flex-col gap-1.5 ${dividerClass}`}>
        <span className={`text-[11px] font-mono ${mutedTextClass}`}>Thử nghiệm pháo hoa:</span>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_FIREWORK_BUTTONS.map((btn) => (
            <Button
              key={btn.kind}
              size="small"
              className={`text-[11px] font-bold ${isDark ? btn.darkClass : btn.lightClass}`}
              onClick={() => onTriggerTestFireworks(btn.kind)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
