import React from 'react';
import { Card, Typography, Slider, Space, Button, Select } from 'antd';
import {
  FastBackwardOutlined,
  FastForwardOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface AudioPlayerCardProps {
  recordingUrl: string | null;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isPlaying: boolean;
  themeMode: string;
  token: SafeAny;
  formatTime: (secs: number) => string;
  handleSliderChange: (value: number) => void;
  handleSpeedChange: (rate: number) => void;
  skipTime: (amount: number) => void;
  togglePlay: () => void;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  recordingUrl,
  currentTime,
  duration,
  playbackRate,
  isPlaying,
  themeMode,
  token,
  formatTime,
  handleSliderChange,
  handleSpeedChange,
  skipTime,
  togglePlay,
}) => {
  return (
    <Card
      className="mb-4 shadow-sm"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderColor: token.colorBorderSecondary,
        borderRadius: '12px',
      }}
    >
      {!recordingUrl ? (
        <div className="text-center py-6">
          <Text type="secondary" style={{ fontStyle: 'italic' }}>
            Không tìm thấy liên kết file ghi âm (OmiCall chưa đồng bộ file)
          </Text>
        </div>
      ) : (
        <div>
          {/* Time sliders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <Text style={{ fontSize: '12px', fontWeight: '500' }}>{formatTime(currentTime)}</Text>
            <Text style={{ fontSize: '12px', fontWeight: '500' }}>{formatTime(duration)}</Text>
          </div>

          <Slider
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            tooltip={{ formatter: (val) => formatTime(val ?? 0) }}
            className="mb-4"
            trackStyle={{ backgroundColor: token.colorPrimary }}
            handleStyle={{ borderColor: token.colorPrimary }}
          />

          {/* Controls row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <Space size="middle">
              <Button
                icon={<FastBackwardOutlined />}
                onClick={() => skipTime(-10)}
                type="text"
                style={{ fontSize: '16px' }}
                title="Tua lại 10s"
              />
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={
                  isPlaying ? (
                    <PauseCircleOutlined style={{ fontSize: '24px' }} />
                  ) : (
                    <PlayCircleOutlined style={{ fontSize: '24px' }} />
                  )
                }
                onClick={togglePlay}
                style={{
                  background: token.colorPrimary,
                  borderColor: token.colorPrimary,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '50px',
                  height: '50px',
                }}
              />
              <Button
                icon={<FastForwardOutlined />}
                onClick={() => skipTime(10)}
                type="text"
                style={{ fontSize: '16px' }}
                title="Tua đi 10s"
              />
            </Space>

            {/* Playback speed selector */}
            <Space>
              <SettingOutlined type="secondary" />
              <Select
                size="small"
                value={playbackRate}
                onChange={handleSpeedChange}
                style={{ width: 85 }}
                options={[
                  { value: 1, label: '1.0x' },
                  { value: 1.25, label: '1.25x' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2, label: '2.0x' },
                ]}
              />
            </Space>
          </div>
        </div>
      )}
    </Card>
  );
};
export default AudioPlayerCard;
