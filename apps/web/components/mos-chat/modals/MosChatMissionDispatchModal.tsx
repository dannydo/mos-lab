'use client';

import React from 'react';
import { Modal, Input, type GlobalToken } from 'antd';
import { Loader2, Rocket } from 'lucide-react';
import type { MosChatMessage, SafeAny } from '@mos-lab/shared';

export interface MosChatMissionDispatchModalProps {
  isDark: boolean;
  isMobile: boolean;
  token: GlobalToken;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  isStrictDannySuperAdmin: boolean;
  missionModalOpen: boolean;
  setMissionModalOpen: (open: boolean) => void;
  missionSourceMsg: MosChatMessage | null;
  missionTitle: string;
  setMissionTitle: (val: string) => void;
  missionType: 'FEATURE' | 'BUG';
  setMissionType: (val: 'FEATURE' | 'BUG') => void;
  missionNote: string;
  setMissionNote: (val: string) => void;
  isDispatchingMission: boolean;
  handleConfirmDispatchMission: () => Promise<void> | void;
}

export const MosChatMissionDispatchModal: React.FC<MosChatMissionDispatchModalProps> = ({
  isDark,
  isMobile,
  token,
  surfaceRaised,
  borderColor,
  borderStrong,
  isStrictDannySuperAdmin,
  missionModalOpen,
  setMissionModalOpen,
  missionSourceMsg,
  missionTitle,
  setMissionTitle,
  missionType,
  setMissionType,
  missionNote,
  setMissionNote,
  isDispatchingMission,
  handleConfirmDispatchMission,
}) => {
  return (
    <Modal
      className="mos-chat-theme-scope"
      open={missionModalOpen && isStrictDannySuperAdmin}
      zIndex={1360}
      onCancel={() => !isDispatchingMission && setMissionModalOpen(false)}
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 text-left leading-snug min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 shrink-0 text-[10px]">
              ⚡
            </span>
            <span className="truncate">
              Tự động duyệt <strong className="text-slate-200 font-semibold">Cổng 1</strong> & đồng bộ 2 chiều ngay
              trong luồng Chat
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              disabled={isDispatchingMission}
              onClick={() => setMissionModalOpen(false)}
              className="h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center cursor-pointer transition-all hover:opacity-90 shrink-0 whitespace-nowrap"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}`, color: token.colorText }}
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={isDispatchingMission || !missionTitle.trim()}
              onClick={() => void handleConfirmDispatchMission()}
              className="h-9 px-4 rounded-lg text-[12.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all hover:brightness-105 disabled:opacity-50 shrink-0 whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#04130d',
                border: '1px solid rgba(16, 185, 129, 0.5)',
              }}
            >
              {isDispatchingMission ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : (
                <Rocket size={15} className="shrink-0" />
              )}
              <span>{isDispatchingMission ? 'Đang chuyển sang mOS Mission...' : 'Chuyển vào mOS Mission'}</span>
            </button>
          </div>
        </div>
      }
      title={
        <div className="flex items-center justify-between gap-2 pr-6 flex-wrap">
          <span className="inline-flex items-center gap-2 text-[15px] font-extrabold">
            <span
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(167, 139, 250, 0.16)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                color: '#c4b5fd',
              }}
            >
              <Rocket size={15} />
            </span>
            <span>Chuyển vào mOS Mission</span>
          </span>
          <span
            className="inline-flex items-center justify-center leading-none gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
            style={{
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
            }}
          >
            <span>Đích kế tiếp: mOS Mission · Cổng 1</span>
          </span>
        </div>
      }
      width={isMobile ? 'calc(100vw - 24px)' : 560}
    >
      <div className="space-y-3.5 py-1.5">
        {/* Next Destination Flow Banner */}
        <div
          className="px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-[11px]"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.95)',
            border: `1px solid ${borderColor}`,
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-400 min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold shrink-0">
              1
            </span>
            <span className="truncate">Luồng mOS Chat</span>
          </div>
          <span className="text-slate-500 shrink-0">→</span>
          <div className="flex items-center gap-1.5 font-extrabold text-emerald-400 min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
              2
            </span>
            <span className="truncate">mOS Mission (Cổng 1)</span>
          </div>
          <span className="text-slate-500 shrink-0">→</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-400 min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
              3
            </span>
            <span className="truncate">Xử lý & Nghiệm thu</span>
          </div>
        </div>

        {missionSourceMsg && (
          <div
            className="p-3 rounded-xl text-[12px] space-y-1.5"
            style={{
              background: surfaceRaised,
              border: `1px solid ${borderStrong}`,
              borderLeft: '3.5px solid #a78bfa',
            }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-purple-300 inline-flex items-center gap-1.5">
                <span>📦 Gói ngữ cảnh từ {missionSourceMsg.senderName}</span>
              </span>
              <span
                className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-bold tabular-nums"
                style={{
                  background: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
                  color: token.colorTextSecondary,
                }}
              >
                {1 + (missionSourceMsg.thread?.length || 0)} tin nhắn ·{' '}
                {(missionSourceMsg.attachments?.length || 0) +
                  (missionSourceMsg.thread || []).reduce(
                    (acc: number, r: SafeAny) => acc + (r.attachments?.length || 0),
                    0
                  )}{' '}
                hình ảnh
              </span>
            </div>
            <div className="text-[11.5px] opacity-90 line-clamp-3 whitespace-pre-wrap leading-relaxed">
              &ldquo;{missionSourceMsg.text}&rdquo;
            </div>
          </div>
        )}

        <div>
          <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">Tiêu đề Ticket trên mOS Mission</div>
          <Input
            value={missionTitle}
            onChange={(e) => setMissionTitle(e.target.value)}
            placeholder="Nhập tiêu đề nhiệm vụ chuyển vào mOS Mission..."
          />
        </div>

        <div>
          <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">Phân loại nhiệm vụ</div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: 'FEATURE' as const, label: '✨ Tính năng / Nâng cấp mới', color: '#a78bfa' },
              { key: 'BUG' as const, label: '🐞 Sửa lỗi vận hành (Bug)', color: '#f43f5e' },
            ].map((opt) => {
              const active = missionType === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMissionType(opt.key)}
                  className="h-9 px-3 rounded-lg text-[12px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    background: active ? `${opt.color}22` : surfaceRaised,
                    border: `1.5px solid ${active ? opt.color : borderColor}`,
                    color: active ? opt.color : token.colorText,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">
            Chỉ đạo / Ghi chú triển khai cho mOS Mission (Tuỳ chọn)
          </div>
          <Input.TextArea
            rows={2}
            value={missionNote}
            onChange={(e) => setMissionNote(e.target.value)}
            placeholder="VD: Áp dụng đúng quy chuẩn Combo Elsa của Bảo Hân, giữ nguyên layout bảng..."
          />
        </div>
      </div>
    </Modal>
  );
};
