'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Tag, Tooltip } from 'antd';
import {
  CloseOutlined,
  SoundOutlined,
  SendOutlined,
  AudioOutlined,
  StopOutlined,
  RedoOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Volume2, VolumeX } from 'lucide-react';
import { VoiceStatus, ChatMessage } from './types';
import { VoiceVisualizerOrb } from './VoiceVisualizerOrb';
import { useTheme } from '../../context/ThemeContext';

interface VoiceAssistantModalProps {
  open: boolean;
  onClose: () => void;
  status: VoiceStatus;
  transcript: string;
  messages: ChatMessage[];
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  onReplayLastMessage: () => void;
  onSendMessage: (text: string) => void;
}

const QUICK_PROMPTS = [
  'Thời hạn dặm mi bao nhiêu ngày?',
  'Quy tắc chia thưởng CC In khác CC Out?',
  'Tiêu chuẩn kiểm tra QA Shop?',
  'Doanh số bán Combo tính thế nào?',
];

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  open,
  onClose,
  status,
  transcript,
  messages,
  isMuted,
  onToggleMute,
  onToggleListening,
  onStopSpeaking,
  onReplayLastMessage,
  onSendMessage,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll messages to bottom
  useEffect(() => {
    if (open && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, transcript]);

  if (!open) return null;

  const handleManualSubmit = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const getStatusTag = () => {
    switch (status) {
      case 'listening':
        return (
          <Tag color="error" className="rounded-full font-semibold animate-pulse border-0">
            🔴 ĐANG NGHE...
          </Tag>
        );
      case 'thinking':
        return (
          <Tag color="processing" className="rounded-full font-semibold border-0">
            ⚡ ĐANG PHÂN TÍCH...
          </Tag>
        );
      case 'speaking':
        return (
          <Tag color="success" className="rounded-full font-semibold border-0">
            🔊 ĐANG TRẢ LỜI...
          </Tag>
        );
      default:
        return (
          <Tag color="default" className="rounded-full font-medium border-0">
            SẴN SÀNG
          </Tag>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-label="mOS Voice Copilot"
      className="fixed bottom-6 right-6 z-[9999] w-[92vw] sm:w-[460px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-300 backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95"
      style={{
        background: isDark ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.96)',
        borderColor: isDark ? 'rgba(75, 85, 99, 0.4)' : 'rgba(226, 232, 240, 0.9)',
      }}
    >
      {/* 1. Header Bar */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0 select-none"
        style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <ThunderboltOutlined className="text-purple-500" /> mOS Voice Copilot
          </span>
          {getStatusTag()}
        </div>

        <div className="flex items-center gap-1">
          <Tooltip title={isMuted ? 'Bật âm thanh trả lời' : 'Tắt âm thanh trả lời (Mute)'}>
            <Button
              type="text"
              size="small"
              icon={
                isMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                )
              }
              onClick={onToggleMute}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            />
          </Tooltip>

          <Button
            type="text"
            size="small"
            icon={<CloseOutlined className="text-xs" />}
            onClick={onClose}
            aria-label="Đóng Voice Assistant"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          />
        </div>
      </div>

      {/* 2. Central Interactive Voice Orb Section */}
      <div
        className="py-4 px-4 flex flex-col items-center justify-center border-b shrink-0 select-none relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(88, 28, 135, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%)'
            : 'linear-gradient(180deg, rgba(243, 232, 255, 0.5) 0%, rgba(248, 250, 252, 0.8) 100%)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="my-1">
          <VoiceVisualizerOrb status={status} size="large" onClick={onToggleListening} />
        </div>

        {/* State status prompt */}
        <div className="mt-3 text-center">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {status === 'listening'
              ? 'Đang nghe bạn nói...'
              : status === 'thinking'
                ? 'Đang suy nghĩ và phân tích câu trả lời...'
                : status === 'speaking'
                  ? 'Đang trả lời bằng giọng nói...'
                  : 'Nhấn nút Micro hoặc ấn phím Ctrl 2 lần để bắt đầu'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {status === 'listening'
              ? 'Nói xong có thể nhấn Ctrl 2 lần hoặc nhấp nút để gửi ngay'
              : status === 'speaking'
                ? 'Nhấn nút Dừng nếu bạn muốn ngắt giọng đọc'
                : 'Hỗ trợ tra cứu quy định, KPI CC, dặm mi, QA Shop...'}
          </div>
        </div>

        {/* Speaking playback controls */}
        {status === 'speaking' && (
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={onStopSpeaking}
              className="text-xs font-semibold"
            >
              Dừng Đọc
            </Button>
            <Button size="small" icon={<RedoOutlined />} onClick={onReplayLastMessage} className="text-xs font-medium">
              Nghe Lại
            </Button>
          </div>
        )}

        {/* Live Interim Transcript Box */}
        {transcript && (
          <div className="mt-2 w-full p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-700 dark:text-purple-300 font-medium text-center animate-pulse">
            <span className="opacity-70 text-[11px] block">Bạn đang nói:</span>
            &ldquo;{transcript}&rdquo;
          </div>
        )}
      </div>

      {/* 3. Conversation Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[160px] max-h-[280px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <AudioOutlined className="text-2xl text-purple-400 mb-2 opacity-60" />
            <p className="text-xs mb-1">Chưa có tin nhắn nào trong phiên này.</p>
            <p className="text-[11px] text-slate-500">
              Hãy bấm vào Quả Cầu Âm Thanh hoặc gõ{' '}
              <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Ctrl</kbd> 2 lần
              để trò chuyện.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>{isUser ? 'Bạn' : 'mOS AI'}</span>
                  <span>·</span>
                  <span className="tabular-nums">{msg.timestamp}</span>
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[88%] leading-relaxed ${
                    isUser
                      ? 'bg-purple-600 text-white rounded-tr-xs shadow-xs'
                      : isDark
                        ? 'bg-slate-800/80 text-slate-100 border border-slate-700/60 rounded-tl-xs'
                        : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap m-0">{msg.text}</p>
                  {!isUser && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/20 dark:border-slate-700/30 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{msg.source === 'gemini' ? '✨ Gemini AI' : '📖 mOS Rule'}</span>
                      <button
                        type="button"
                        onClick={() => onReplayLastMessage()}
                        className="hover:text-purple-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Đọc lại câu trả lời này"
                      >
                        <SoundOutlined /> Đọc lại
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Prompts Horizontal Scroll */}
      <div
        className="px-3 py-1.5 border-t overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0"
        style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}
      >
        <span className="text-[10px] text-slate-400 shrink-0 font-medium">Gợi ý:</span>
        {QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(p)}
            className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200/70 dark:border-slate-700/60 transition-colors shrink-0 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* 5. Bottom Text Input & Shortcut Hint */}
      <div
        className="p-3 border-t shrink-0 space-y-2"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPressEnter={handleManualSubmit}
            placeholder="Hoặc nhập câu hỏi của bạn tại đây..."
            size="middle"
            className="text-xs rounded-xl"
          />

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleManualSubmit}
            disabled={!inputText.trim()}
            className="bg-purple-600 hover:bg-purple-500 rounded-xl"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Ctrl
            </kbd>
            <span className="ml-1">Bấm 2 lần bất kỳ đâu để nói</span>
          </span>
          <span className="text-emerald-500 font-medium">● Voice Live</span>
        </div>
      </div>
    </div>
  );
};
