'use client';

import React from 'react';
import { Card, Typography, Slider, Space, Button, Select, Tooltip, Tag } from 'antd';
import {
  FastBackwardOutlined,
  FastForwardOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  SmileOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface AudioTimelineProps {
  recordingUrl: string | null;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isPlaying: boolean;
  themeMode: 'light' | 'dark';
  token: SafeAny;
  laughList: SafeAny[];
  formatTime: (secs: number) => string;
  handleSliderChange: (value: number) => void;
  handleSpeedChange: (rate: number) => void;
  skipTime: (amount: number) => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  logDetails: SafeAny;
}

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  recordingUrl,
  currentTime,
  duration,
  playbackRate,
  isPlaying,
  themeMode,
  token,
  laughList,
  formatTime,
  handleSliderChange,
  handleSpeedChange,
  skipTime,
  togglePlay,
  seekTo,
  logDetails,
}) => {
  const agentLaughs = logDetails?.laughCountAgent ?? laughList.filter((l) => l.speaker === 'agent').length;
  const customerLaughs = logDetails?.laughCountCustomer ?? laughList.filter((l) => l.speaker === 'customer').length;

  return (
    <Card
      className="mb-6 shadow-sm border border-slate-100 dark:border-slate-800"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderRadius: '16px',
      }}
      title={
        <div className="flex items-center justify-between flex-wrap gap-2 py-1">
          <span className="font-bold text-base flex items-center gap-2">
            <SmileOutlined style={{ color: token.colorPrimary }} />
            Ghi âm cuộc gọi & Tiếng cười
          </span>
          <div className="flex items-center gap-2">
            <Tag color="success" className="m-0 font-medium rounded-full px-2.5 py-0.5 border-emerald-500/10">
              NV cười: <strong className="ml-1">{agentLaughs} lần</strong>
            </Tag>
            <Tag color="warning" className="m-0 font-medium rounded-full px-2.5 py-0.5 border-amber-500/10">
              Khách cười: <strong className="ml-1">{customerLaughs} lần</strong>
            </Tag>
          </div>
        </div>
      }
    >
      {!recordingUrl ? (
        <div className="text-center py-12">
          <Text type="secondary" className="italic block mb-2">
            Không tìm thấy liên kết file ghi âm (OmiCall chưa đồng bộ file)
          </Text>
          <Text type="secondary" className="text-xs opacity-75">
            Vui lòng kiểm tra lại cấu hình đồng bộ OmiCall hoặc chờ trong giây lát.
          </Text>
        </div>
      ) : (
        <div>
          {/* Timeline and slider with markers */}
          <div className="relative mb-6 px-1">
            <div className="flex justify-between items-center mb-1">
              <Text
                className="text-xs font-mono font-bold text-slate-400 tabular-nums"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatTime(currentTime)}
              </Text>
              <Text
                className="text-xs font-mono font-bold text-slate-400 tabular-nums"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatTime(duration)}
              </Text>
            </div>

            <div className="relative pt-1 pb-4">
              {/* Custom timeline rail for laughter markers */}
              <div
                className="absolute top-[13px] left-[7px] right-[7px] h-1 rounded pointer-events-none z-10"
                style={{
                  background: 'transparent',
                }}
              >
                {laughList.map((laugh: SafeAny, index: number) => {
                  const leftPercent = duration > 0 ? (laugh.start / duration) * 100 : 0;
                  const widthPercent = duration > 0 ? ((laugh.end - laugh.start) / duration) * 100 : 0;
                  const isAgent = laugh.speaker === 'agent';

                  // Color codes: Agent = emerald, Customer = orange/yellow
                  const markerColor = isAgent ? '#10b981' : '#f59e0b';
                  const speakerLabel = isAgent ? 'Nhân viên cười' : 'Khách hàng cười';

                  return (
                    <Tooltip
                      key={index}
                      title={`${speakerLabel} (${formatTime(laugh.start)} - ${formatTime(laugh.end)}) • Độ tin cậy: ${Math.round(laugh.confidence * 100)}% - Nhấp để nghe`}
                      placement="top"
                    >
                      <div
                        className="absolute h-2.5 top-[-3px] rounded-full cursor-pointer hover:scale-125 transition-transform duration-150 pointer-events-auto shadow-sm"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.max(1.5, widthPercent)}%`,
                          backgroundColor: markerColor,
                          border: themeMode === 'dark' ? '1px solid #1f1f1f' : '1px solid #ffffff',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(laugh.start);
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </div>

              <Slider
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSliderChange}
                tooltip={{ formatter: (val) => formatTime(val ?? 0) }}
                className="m-0 p-0"
                trackStyle={{ backgroundColor: token.colorPrimary }}
                railStyle={{
                  backgroundColor: themeMode === 'dark' ? '#333333' : '#f1f5f9',
                  height: '4px',
                }}
                handleStyle={{
                  borderColor: token.colorPrimary,
                  backgroundColor: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                  borderWidth: '2px',
                  width: '14px',
                  height: '14px',
                  marginTop: '-5px',
                  zIndex: 20,
                }}
              />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Space size="large">
              <Button
                icon={<FastBackwardOutlined />}
                onClick={() => skipTime(-10)}
                type="text"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Tua lại 10s"
              />

              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={
                  isPlaying ? (
                    <PauseCircleOutlined style={{ fontSize: '22px' }} />
                  ) : (
                    <PlayCircleOutlined style={{ fontSize: '22px' }} />
                  )
                }
                onClick={togglePlay}
                style={{
                  background: token.colorPrimary,
                  borderColor: token.colorPrimary,
                  boxShadow: '0 4px 12px rgba(114, 46, 209, 0.25)',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '46px',
                  height: '46px',
                }}
                className="hover:scale-105 transition-transform duration-200"
              />

              <Button
                icon={<FastForwardOutlined />}
                onClick={() => skipTime(10)}
                type="text"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Tua đi 10s"
              />
            </Space>

            {/* Playback speed & interactive status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SettingOutlined className="text-slate-400" />
                <Select
                  size="small"
                  value={playbackRate}
                  onChange={handleSpeedChange}
                  style={{ width: 80 }}
                  className="rounded-md"
                  options={[
                    { value: 1, label: '1.0x' },
                    { value: 1.25, label: '1.25x' },
                    { value: 1.5, label: '1.5x' },
                    { value: 2, label: '2.0x' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AudioTimeline;
