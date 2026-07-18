'use client';

import React, { useEffect, useRef } from 'react';
import { Card, Spin, Typography, Button, Avatar, Tooltip } from 'antd';
import { UserOutlined, SmileOutlined, MessageOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface TranscriptChatProps {
  logDetails: SafeAny;
  currentTime: number;
  themeMode: 'light' | 'dark';
  token: SafeAny;
  laughList: SafeAny[];
  seekTo: (seconds: number) => void;
}

interface ChatMessage {
  timestamp: number; // total seconds
  timeStr: string; // "[MM:SS]"
  speaker: 'agent' | 'customer' | 'unknown';
  speakerLabel: string; // "NV" or "KH"
  text: string;
  isLaughter: boolean;
  laughterConfidence?: number;
}

export const TranscriptChat: React.FC<TranscriptChatProps> = ({
  logDetails,
  currentTime,
  themeMode,
  token,
  laughList,
  seekTo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMessageRef = useRef<HTMLDivElement>(null);

  // Parse transcript lines into structured chat messages
  const parseTranscript = (): ChatMessage[] => {
    if (!logDetails?.transcript) return [];

    const lines = logDetails.transcript.split('\n');
    const messages: ChatMessage[] = [];

    lines.forEach((line: string) => {
      const match = line.match(/^\[(\d{2}):(\d{2})\]/);
      if (!match) return;

      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const totalSecs = mins * 60 + secs;
      const timeStr = `[${match[1]}:${match[2]}]`;
      const content = line.replace(/^\[\d{2}:\d{2}\]/, '').trim();

      let speaker: 'agent' | 'customer' | 'unknown' = 'unknown';
      let speakerLabel = '';
      let text = content;

      if (content.startsWith('NV:')) {
        speaker = 'agent';
        speakerLabel = 'Telesales';
        text = content.substring(3).trim();
      } else if (content.startsWith('KH:')) {
        speaker = 'customer';
        speakerLabel = logDetails.customerName || 'Khách hàng';
        text = content.substring(3).trim();
      } else {
        // Fallback checks
        const colonIndex = content.indexOf(':');
        if (colonIndex > 0 && colonIndex < 10) {
          const possibleSpeaker = content.substring(0, colonIndex).trim();
          if (possibleSpeaker.toLowerCase().includes('nv') || possibleSpeaker.toLowerCase().includes('tele')) {
            speaker = 'agent';
            speakerLabel = 'Telesales';
          } else {
            speaker = 'customer';
            speakerLabel = possibleSpeaker;
          }
          text = content.substring(colonIndex + 1).trim();
        }
      }

      // Check if laughter matches this message timestamp (within 3 seconds tolerance)
      const hasLaughter = laughList.some(
        (laugh) =>
          Math.abs(totalSecs - laugh.start) <= 3 &&
          (speaker === 'unknown' ||
            (speaker === 'agent' && laugh.speaker === 'agent') ||
            (speaker === 'customer' && laugh.speaker === 'customer'))
      );

      const matchedLaugh = laughList.find(
        (laugh) =>
          Math.abs(totalSecs - laugh.start) <= 3 &&
          (speaker === 'unknown' ||
            (speaker === 'agent' && laugh.speaker === 'agent') ||
            (speaker === 'customer' && laugh.speaker === 'customer'))
      );

      messages.push({
        timestamp: totalSecs,
        timeStr,
        speaker,
        speakerLabel: speakerLabel || (speaker === 'agent' ? 'Telesales' : 'Khách hàng'),
        text,
        isLaughter: hasLaughter,
        laughterConfidence: matchedLaugh?.confidence,
      });
    });

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  };

  const messages = parseTranscript();

  // Find active message index based on current playback time
  const getActiveMessageIndex = (): number => {
    if (messages.length === 0) return -1;

    // Find the message that is closest to but not after currentTime
    let activeIdx = -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].timestamp <= currentTime) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  };

  const activeIndex = getActiveMessageIndex();

  // Auto-scroll to active bubble
  useEffect(() => {
    if (activeMessageRef.current) {
      activeMessageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeIndex]);

  const isLoading = logDetails.analysisStatus === 'PENDING' || logDetails.analysisStatus === 'PROCESSING';
  const isFailed = logDetails.analysisStatus === 'FAILED';

  return (
    <Card
      title={
        <span className="font-bold text-base flex items-center gap-2">
          <MessageOutlined style={{ color: token.colorPrimary }} />
          Cuộc hội thoại (AI Transcript)
        </span>
      }
      className="shadow-sm flex flex-col border border-slate-100 dark:border-slate-800"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderRadius: '16px',
        height: '420px',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { overflowY: 'auto', flex: 1, padding: '16px' } }}
      ref={containerRef}
    >
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24">
          <Spin size="default" />
          <Paragraph className="mt-3 text-center text-xs opacity-70" style={{ color: token.colorTextDescription }}>
            AI đang dịch giọng nói & phân tích đoạn thoại. Vui lòng đợi...
          </Paragraph>
        </div>
      ) : isFailed ? (
        <div className="py-12 text-center">
          <Text type="danger" className="font-semibold block">
            AI xử lý hội thoại thất bại
          </Text>
          {logDetails.analysisError && (
            <Paragraph type="secondary" className="mt-2 text-xs">
              Chi tiết lỗi: {logDetails.analysisError}
            </Paragraph>
          )}
        </div>
      ) : messages.length === 0 ? (
        <div className="py-24 text-center">
          <Text type="secondary" className="italic text-slate-400">
            Không tìm thấy dữ liệu hội thoại trong cuộc gọi này.
          </Text>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, idx) => {
            const isAgent = msg.speaker === 'agent';
            const isActive = idx === activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeMessageRef : null}
                className={`flex gap-3 items-start group transition-all duration-300 ${
                  isAgent ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* Speaker Avatar */}
                <Avatar
                  size={32}
                  src={isAgent ? logDetails.staffAvatarUrl : undefined}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: isAgent
                      ? themeMode === 'dark'
                        ? '#141414'
                        : '#e6f7ff'
                      : themeMode === 'dark'
                        ? '#2a2a2a'
                        : '#f5f5f5',
                    color: isAgent ? token.colorPrimary : '#8c8c8c',
                    flexShrink: 0,
                  }}
                />

                {/* Message Bubble Container */}
                <div className={`max-w-[75%] flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                  {/* Speaker name + Timestamp */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-400">{msg.speakerLabel}</span>
                    <Button
                      size="small"
                      type="text"
                      className="p-0 text-[10px] text-slate-400 hover:text-primary font-mono h-auto"
                      onClick={() => seekTo(msg.timestamp)}
                    >
                      {msg.timeStr}
                    </Button>
                  </div>

                  {/* Speech Bubble */}
                  <div
                    onClick={() => seekTo(msg.timestamp)}
                    className={`px-3.5 py-2.5 rounded-2xl text-sm cursor-pointer relative transition-all duration-200 border shadow-sm ${
                      isAgent
                        ? themeMode === 'dark'
                          ? isActive
                            ? 'bg-primary/20 border-primary/40 text-slate-100'
                            : 'bg-[#141414] border-slate-800 text-slate-200 hover:border-slate-700'
                          : isActive
                            ? 'bg-primary/10 border-primary/30 text-primary-dark font-medium shadow-primary/5'
                            : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/70'
                        : themeMode === 'dark'
                          ? isActive
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-100'
                            : 'bg-[#1d1b16] border-slate-800 text-slate-200 hover:border-slate-700'
                          : isActive
                            ? 'bg-amber-50 border-amber-200 text-amber-900 font-medium'
                            : 'bg-amber-50/40 border-amber-100/50 text-slate-700 hover:bg-amber-50/70'
                    }`}
                    style={{
                      borderBottomLeftRadius: isAgent ? '4px' : '16px',
                      borderBottomRightRadius: !isAgent ? '4px' : '16px',
                      transform: isActive ? 'scale(1.02)' : 'none',
                    }}
                  >
                    <span className="leading-relaxed">{msg.text}</span>

                    {/* Laugh indicator bubble on message */}
                    {msg.isLaughter && (
                      <Tooltip
                        title={`Tiếng cười phát hiện (Độ tin cậy: ${Math.round((msg.laughterConfidence ?? 0.8) * 100)}%)`}
                      >
                        <span
                          className={`absolute -bottom-2 ${isAgent ? '-right-2' : '-left-2'} text-base flex items-center justify-center bg-white dark:bg-[#141414] w-6 h-6 rounded-full border border-yellow-400 shadow-sm animate-bounce`}
                        >
                          😄
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TranscriptChat;
