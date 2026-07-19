import React, { useState, useEffect } from 'react';
import { CheckOutlined, CloseOutlined, AudioOutlined, CustomerServiceOutlined, DownOutlined } from '@ant-design/icons';

interface AudioDeviceControlsProps {
  audioInputDevices: SafeAny[];
  audioOutputDevices: SafeAny[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  setSelectedAudioInputId: (id: string) => void;
  setSelectedAudioOutputId: (id: string) => void;
  refreshAudioDevices: () => Promise<void>;
  descColor: string;
  isDark?: boolean;
}

export const AudioDeviceControls: React.FC<AudioDeviceControlsProps> = ({
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  setSelectedAudioInputId,
  setSelectedAudioOutputId,
  refreshAudioDevices,
  descColor,
  isDark: propIsDark,
}) => {
  const systemDeviceValue = '__system__';
  const [openSheet, setOpenSheet] = useState<'input' | 'output' | null>(null);

  // Auto detect dark theme if not passed as prop
  const [isDark, setIsDark] = useState(propIsDark ?? false);
  useEffect(() => {
    if (propIsDark !== undefined) {
      setIsDark(propIsDark);
      return;
    }
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark-theme'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [propIsDark]);

  const inputDeviceOptions = [
    { value: systemDeviceValue, label: 'Mic hệ thống' },
    ...audioInputDevices.map((device, index) => ({
      value: device.deviceId,
      label: device.label || `Mic ${index + 1}`,
    })),
  ];

  const outputDeviceOptions = [
    { value: systemDeviceValue, label: 'Tai nghe hệ thống' },
    ...audioOutputDevices.map((device, index) => ({
      value: device.deviceId,
      label: device.label || `Tai nghe ${index + 1}`,
    })),
  ];

  const activeInput =
    inputDeviceOptions.find((opt) => opt.value === (selectedAudioInputId || systemDeviceValue)) ||
    inputDeviceOptions[0];

  const activeOutput =
    outputDeviceOptions.find((opt) => opt.value === (selectedAudioOutputId || systemDeviceValue)) ||
    outputDeviceOptions[0];

  const handleOpenSheet = async (type: 'input' | 'output') => {
    await refreshAudioDevices();
    setOpenSheet(type);
  };

  const handleSelect = (value: string, type: 'input' | 'output') => {
    const finalValue = value === systemDeviceValue ? '' : value;
    if (type === 'input') {
      setSelectedAudioInputId(finalValue);
    } else {
      setSelectedAudioOutputId(finalValue);
    }
    setOpenSheet(null);
  };

  const currentOptions = openSheet === 'input' ? inputDeviceOptions : outputDeviceOptions;
  const currentSelectedId =
    openSheet === 'input' ? selectedAudioInputId || systemDeviceValue : selectedAudioOutputId || systemDeviceValue;

  return (
    <div className="w-full relative">
      {/* Pills Container */}
      <div className="grid grid-cols-2 gap-3 mt-3 px-1">
        <div className="space-y-1.5">
          <div
            className="text-[9px] uppercase font-extrabold tracking-widest pl-1 opacity-60"
            style={{ color: descColor }}
          >
            MIC
          </div>
          <button
            type="button"
            onClick={() => void handleOpenSheet('input')}
            className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg border text-left text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm ${
              isDark
                ? 'bg-zinc-900/60 border-white/10 hover:border-amber-500/60 hover:bg-zinc-800/80 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)] text-slate-200'
                : 'bg-zinc-100/60 border-black/10 hover:border-amber-500/60 hover:bg-zinc-200/80 hover:shadow-[0_0_12px_rgba(245,158,11,0.1)] text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <AudioOutlined className={isDark ? 'text-amber-400 animate-pulse' : 'text-amber-500'} />
              <span className="truncate pr-1 font-semibold">{activeInput.label}</span>
            </div>
            <DownOutlined className="text-[8px] opacity-60 flex-shrink-0" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div
            className="text-[9px] uppercase font-extrabold tracking-widest pl-1 opacity-60"
            style={{ color: descColor }}
          >
            TAI NGHE
          </div>
          <button
            type="button"
            onClick={() => void handleOpenSheet('output')}
            className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg border text-left text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm ${
              isDark
                ? 'bg-zinc-900/60 border-white/10 hover:border-blue-500/60 hover:bg-zinc-800/80 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)] text-slate-200'
                : 'bg-zinc-100/60 border-black/10 hover:border-blue-500/60 hover:bg-zinc-200/80 hover:shadow-[0_0_12px_rgba(59,130,246,0.1)] text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <CustomerServiceOutlined className={isDark ? 'text-blue-400' : 'text-blue-500'} />
              <span className="truncate pr-1 font-semibold">{activeOutput.label}</span>
            </div>
            <DownOutlined className="text-[8px] opacity-60 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Backdrop Dimmer (positioned absolute, covers the relative parent) */}
      {openSheet && (
        <div
          className="absolute inset-0 bg-black/50 transition-opacity duration-300 z-[99] rounded-2xl"
          onClick={() => setOpenSheet(null)}
        />
      )}

      {/* Slide-up Bottom Sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[100] flex flex-col rounded-t-2xl border-t transition-all duration-300 ease-in-out ${
          openSheet ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        } ${
          isDark
            ? 'bg-[#18181b]/95 border-white/10 text-slate-200 shadow-2xl backdrop-blur-md'
            : 'bg-white/95 border-black/10 text-slate-700 shadow-2xl backdrop-blur-md'
        }`}
        style={{
          height: '240px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
        }}
      >
        {/* Header of Sheet */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">
            {openSheet === 'input' ? 'Chọn Microphone' : 'Chọn Tai nghe/Đầu ra'}
          </span>
          <button
            type="button"
            onClick={() => setOpenSheet(null)}
            className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
              isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/10 text-slate-600'
            }`}
          >
            <CloseOutlined className="text-xs" />
          </button>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {currentOptions.map((opt) => {
            const isSelected = opt.value === currentSelectedId;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value, openSheet!)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all text-left ${
                  isSelected
                    ? isDark
                      ? 'bg-amber-500/10 text-amber-400 font-semibold'
                      : 'bg-amber-500/10 text-amber-600 font-semibold'
                    : isDark
                      ? 'hover:bg-white/[0.04] text-slate-300'
                      : 'hover:bg-black/[0.03] text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {openSheet === 'input' ? (
                    <AudioOutlined className={isSelected ? 'text-amber-500' : 'opacity-60'} />
                  ) : (
                    <CustomerServiceOutlined className={isSelected ? 'text-blue-500' : 'opacity-60'} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <CheckOutlined className={openSheet === 'input' ? 'text-amber-500' : 'text-blue-500'} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AudioDeviceControls;
