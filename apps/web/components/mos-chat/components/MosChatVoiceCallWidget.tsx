'use client';

import React, { useState } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Users,
  Radio,
} from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatVoiceCallSession } from '@mos-lab/shared';
import { MosChatAvatar } from '../MosChatAvatar';
import { formatVoiceCallTimer } from '../utils/useMosChatVoiceCall';

export interface MosChatVoiceCallWidgetProps {
  currentCall: MosChatVoiceCallSession | null;
  incomingCall: MosChatVoiceCallSession | null;
  isMuted: boolean;
  isSpeakerMuted: boolean;
  durationSec: number;
  speakingStaffIds: string[];
  audioWarning?: string | null;
  isConnecting?: boolean;
  isDark?: boolean;
  onAcceptIncoming: (callId?: string) => void;
  onDeclineIncoming: (callId?: string) => void;
  onToggleMute: () => void;
  onToggleSpeakerMute: () => void;
  onEndCall: () => void;
}

export const MosChatVoiceCallWidget: React.FC<MosChatVoiceCallWidgetProps> = ({
  currentCall,
  incomingCall,
  isMuted,
  isSpeakerMuted,
  durationSec,
  speakingStaffIds,
  audioWarning,
  isConnecting = false,
  isDark = true,
  onAcceptIncoming,
  onDeclineIncoming,
  onToggleMute,
  onToggleSpeakerMute,
  onEndCall,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!incomingCall && !currentCall) {
    return null;
  }

  return (
    <>
      {/* 1. INCOMING CALL BANNER / MODAL */}
      {incomingCall && !currentCall && (
        <div
          data-testid="mos-chat-incoming-call-banner"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 2200,
            width: 340,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 18,
            padding: '16px 18px',
            background: isDark
              ? 'linear-gradient(145deg, rgba(17, 24, 39, 0.97), rgba(15, 23, 42, 0.97))'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
            border: `1.5px solid ${isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.35)'}`,
            boxShadow: isDark
              ? '0 20px 45px rgba(0, 0, 0, 0.65), 0 0 24px rgba(16, 185, 129, 0.2)'
              : '0 16px 38px rgba(15, 23, 42, 0.16), 0 0 20px rgba(16, 185, 129, 0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="inline-flex items-center justify-center leading-none py-1 px-2.5 rounded-full text-[11px] font-semibold gap-1.5"
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                color: isDark ? '#34d399' : '#059669',
              }}
            >
              <PhoneIncoming size={12} className="animate-bounce" />
              {incomingCall.conversationType === 'space' ? 'Mời họp nhanh từ Phòng Chat' : 'Cuộc gọi thoại nội bộ đến'}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="relative flex-shrink-0">
              <MosChatAvatar
                src={incomingCall.initiatorAvatar}
                name={incomingCall.initiatorName}
                staffId={incomingCall.initiatorId}
                size={48}
              />
              <span
                className="absolute -inset-1 rounded-full animate-ping pointer-events-none"
                style={{ border: '2px solid rgba(16, 185, 129, 0.45)' }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] truncate" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                {incomingCall.initiatorName}
              </div>
              <div className="text-xs truncate mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                {incomingCall.initiatorRole ? `${incomingCall.initiatorRole} · ` : ''}
                {incomingCall.conversationName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-4">
            <button
              type="button"
              data-testid="mos-chat-decline-call-btn"
              onClick={() => onDeclineIncoming(incomingCall.callId)}
              disabled={isConnecting}
              className="flex-1 inline-flex items-center justify-center leading-none gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer"
              style={{
                background: isDark ? 'rgba(244, 63, 94, 0.16)' : '#ffe4e6',
                color: isDark ? '#fb7185' : '#e11d48',
                border: `1px solid ${isDark ? 'rgba(244, 63, 94, 0.35)' : '#fecdd3'}`,
              }}
            >
              <PhoneOff size={15} />
              Từ chối
            </button>

            <button
              type="button"
              data-testid="mos-chat-accept-call-btn"
              onClick={() => onAcceptIncoming(incomingCall.callId)}
              disabled={isConnecting}
              className="flex-1 inline-flex items-center justify-center leading-none gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
              }}
            >
              <Phone size={15} />
              {isConnecting ? 'Đang kết nối...' : 'Nghe máy'}
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE / OUTGOING CALL FLOATING OVERLAY */}
      {currentCall && (
        <div
          data-testid="mos-chat-active-call-overlay"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 2150,
            width: isMinimized ? 256 : 328,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: isMinimized ? 999 : 20,
            padding: isMinimized ? '10px 16px' : '16px 18px',
            background: isDark
              ? 'linear-gradient(160deg, rgba(15, 23, 42, 0.97), rgba(17, 24, 39, 0.98))'
              : 'linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
            border: `1.5px solid ${
              currentCall.status === 'ACTIVE'
                ? isDark
                  ? 'rgba(16, 185, 129, 0.45)'
                  : 'rgba(16, 185, 129, 0.35)'
                : isDark
                  ? 'rgba(245, 158, 11, 0.45)'
                  : 'rgba(245, 158, 11, 0.35)'
            }`,
            boxShadow: isDark ? '0 22px 48px rgba(0, 0, 0, 0.65)' : '0 16px 40px rgba(15, 23, 42, 0.16)',
            backdropFilter: 'blur(16px)',
            transition: 'all 0.22s ease',
          }}
        >
          {isMinimized ? (
            /* Minimized Pill View */
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{
                    background: currentCall.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                  }}
                />
                <span className="text-xs font-semibold truncate" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {currentCall.conversationName}
                </span>
                <span
                  className="text-xs font-mono font-semibold tabular-nums"
                  style={{
                    color: currentCall.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {currentCall.status === 'ACTIVE' ? formatVoiceCallTimer(durationSec) : 'Đang gọi...'}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="p-1.5 rounded-full cursor-pointer"
                  style={{
                    background: isMuted
                      ? 'rgba(245, 158, 11, 0.2)'
                      : isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(15,23,42,0.06)',
                    color: isMuted ? '#f59e0b' : isDark ? '#cbd5e1' : '#475569',
                    border: 'none',
                  }}
                >
                  {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                </button>
                <button
                  type="button"
                  onClick={onEndCall}
                  className="p-1.5 rounded-full cursor-pointer"
                  style={{
                    background: '#f43f5e',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  <PhoneOff size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(false)}
                  className="p-1.5 rounded-full cursor-pointer"
                  style={{
                    background: 'transparent',
                    color: isDark ? '#94a3b8' : '#64748b',
                    border: 'none',
                  }}
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          ) : (
            /* Expanded Full Overlay View */
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{
                      background: currentCall.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                    }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color:
                        currentCall.status === 'ACTIVE'
                          ? isDark
                            ? '#34d399'
                            : '#059669'
                          : isDark
                            ? '#fbbf24'
                            : '#d97706',
                    }}
                  >
                    {currentCall.status === 'ACTIVE' ? 'Đang đàm thoại (Opus HD)' : 'Đang đổ chuông...'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    data-testid="mos-chat-call-timer"
                    className="text-xs font-mono font-bold tabular-nums py-0.5 px-2 rounded-md"
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                    }}
                  >
                    {currentCall.status === 'ACTIVE' ? formatVoiceCallTimer(durationSec) : '00:00'}
                  </span>
                  <Tooltip title="Thu gọn cửa sổ gọi">
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      className="p-1 rounded-md cursor-pointer"
                      style={{
                        background: 'transparent',
                        color: isDark ? '#94a3b8' : '#64748b',
                        border: 'none',
                      }}
                    >
                      <Minimize2 size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Conversation Title */}
              <div className="text-[13px] font-bold truncate mb-3" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                {currentCall.conversationName}
              </div>

              {/* Participants Grid */}
              <div className="flex flex-wrap items-center gap-2.5 my-2">
                {currentCall.participants.map((p) => {
                  const isSpeaking = speakingStaffIds.includes(String(p.staffId)) && !p.isMuted;
                  return (
                    <div
                      key={p.staffId}
                      className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl min-w-0"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
                        border: `1.5px solid ${
                          isSpeaking ? '#10b981' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
                        }`,
                        boxShadow: isSpeaking ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <MosChatAvatar src={p.avatar} name={p.name} staffId={p.staffId} size={28} />
                        {p.isMuted && (
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full inline-flex items-center justify-center leading-none"
                            style={{ background: '#f59e0b', color: '#ffffff' }}
                          >
                            <MicOff size={9} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-semibold truncate max-w-[110px]"
                          style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                        >
                          {p.name}
                        </div>
                        {p.role && (
                          <div
                            className="text-[10px] truncate max-w-[110px]"
                            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                          >
                            {p.role}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {audioWarning && (
                <div
                  className="text-[11px] rounded-lg px-2.5 py-1.5 mt-2"
                  style={{
                    background: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fef3c7',
                    color: isDark ? '#fbbf24' : '#b45309',
                  }}
                >
                  {audioWarning}
                </div>
              )}

              {/* Control Bar */}
              <div
                className="flex items-center justify-center gap-3.5 mt-4 pt-3"
                style={{
                  borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
                }}
              >
                <Tooltip title={isMuted ? 'Bật Microphone' : 'Tắt Microphone'}>
                  <button
                    type="button"
                    data-testid="mos-chat-toggle-mute-btn"
                    onClick={onToggleMute}
                    className="p-3 rounded-full transition-all cursor-pointer"
                    style={{
                      background: isMuted
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.22)'
                          : '#fef3c7'
                        : isDark
                          ? 'rgba(255,255,255,0.09)'
                          : '#f1f5f9',
                      color: isMuted ? '#f59e0b' : isDark ? '#f8fafc' : '#334155',
                      border: `1px solid ${
                        isMuted ? 'rgba(245, 158, 11, 0.4)' : isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'
                      }`,
                    }}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </Tooltip>

                <Tooltip title={isSpeakerMuted ? 'Bật Loa' : 'Tắt Loa'}>
                  <button
                    type="button"
                    data-testid="mos-chat-toggle-speaker-btn"
                    onClick={onToggleSpeakerMute}
                    className="p-3 rounded-full transition-all cursor-pointer"
                    style={{
                      background: isSpeakerMuted
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.22)'
                          : '#fef3c7'
                        : isDark
                          ? 'rgba(255,255,255,0.09)'
                          : '#f1f5f9',
                      color: isSpeakerMuted ? '#f59e0b' : isDark ? '#f8fafc' : '#334155',
                      border: `1px solid ${
                        isSpeakerMuted ? 'rgba(245, 158, 11, 0.4)' : isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'
                      }`,
                    }}
                  >
                    {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </Tooltip>

                <Tooltip title="Kết thúc cuộc gọi">
                  <button
                    type="button"
                    data-testid="mos-chat-end-call-btn"
                    onClick={onEndCall}
                    className="p-3.5 rounded-full transition-all cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 6px 18px rgba(244, 63, 94, 0.4)',
                    }}
                  >
                    <PhoneOff size={19} />
                  </button>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export interface MosChatActiveCallRoomBannerProps {
  call: MosChatVoiceCallSession | null;
  currentCallId?: string | null;
  isDark?: boolean;
  onJoinCall: (conversationId: string) => void;
}

export const MosChatActiveCallRoomBanner: React.FC<MosChatActiveCallRoomBannerProps> = ({
  call,
  currentCallId,
  isDark = true,
  onJoinCall,
}) => {
  if (!call || (call.status !== 'RINGING' && call.status !== 'ACTIVE')) {
    return null;
  }
  const isAlreadyInThisCall = currentCallId === call.callId;

  return (
    <div
      data-testid="mos-chat-room-call-banner"
      className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
      style={{
        background: isDark
          ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.16), rgba(5, 150, 105, 0.08))'
          : 'linear-gradient(90deg, #ecfdf5, #f0fdf4)',
        borderBottom: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Radio size={14} className="text-emerald-500 animate-pulse flex-shrink-0" />
        <span className="font-semibold truncate" style={{ color: isDark ? '#ecfdf5' : '#065f46' }}>
          Đang có cuộc gọi thoại trực tiếp
        </span>
        <span
          className="inline-flex items-center justify-center leading-none py-1 px-2 rounded-full text-[11px] font-semibold tabular-nums gap-1"
          style={{
            fontVariantNumeric: 'tabular-nums',
            background: isDark ? 'rgba(16, 185, 129, 0.22)' : '#d1fae5',
            color: isDark ? '#34d399' : '#047857',
          }}
        >
          <Users size={11} />
          {call.participants.length} người
        </span>
      </div>

      {!isAlreadyInThisCall && (
        <button
          type="button"
          onClick={() => onJoinCall(call.conversationId)}
          className="inline-flex items-center justify-center leading-none py-1.5 px-3 rounded-lg font-semibold text-xs gap-1.5 cursor-pointer flex-shrink-0"
          style={{
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
          }}
        >
          <Phone size={12} />
          Tham gia ngay
        </button>
      )}
    </div>
  );
};
