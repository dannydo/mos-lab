import React from 'react';
import { Select } from 'antd';

interface AudioDeviceControlsProps {
  audioInputDevices: SafeAny[];
  audioOutputDevices: SafeAny[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  setSelectedAudioInputId: (id: string) => void;
  setSelectedAudioOutputId: (id: string) => void;
  refreshAudioDevices: () => Promise<void>;
  descColor: string;
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
}) => {
  const systemDeviceValue = '__system__';

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

  return (
    <div className="grid grid-cols-2 gap-2 text-left">
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wide" style={{ color: descColor }}>
          Mic
        </div>
        <Select
          size="small"
          className="w-full"
          value={selectedAudioInputId || systemDeviceValue}
          options={inputDeviceOptions}
          optionFilterProp="label"
          showSearch
          onFocus={() => void refreshAudioDevices()}
          onChange={(value) => setSelectedAudioInputId(value === systemDeviceValue ? '' : value)}
        />
      </div>
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wide" style={{ color: descColor }}>
          Tai nghe
        </div>
        <Select
          size="small"
          className="w-full"
          value={selectedAudioOutputId || systemDeviceValue}
          options={outputDeviceOptions}
          optionFilterProp="label"
          showSearch
          onFocus={() => void refreshAudioDevices()}
          onChange={(value) => setSelectedAudioOutputId(value === systemDeviceValue ? '' : value)}
        />
      </div>
    </div>
  );
};
export default AudioDeviceControls;
