'use client';

import React from 'react';
import { ActiveActorProfile, IosUserRole } from '../../state/useIosAppState';
import { CvFeather2Badge } from './CvFeatherLabels';
import { Wallet, MessageSquare, Award, Lock, ChevronRight, X, Sparkles, Shield, Layers } from 'lucide-react';

interface IosProfileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actor: ActiveActorProfile;
  role: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  onOpenPaystub?: () => void;
  onOpenChat?: () => void;
  onOpenCareer?: () => void;
}

export function IosProfileMenuSheet({
  isOpen,
  onClose,
  actor,
  role,
  canSwitchRole = false,
  onRoleChange,
  onOpenPaystub,
  onOpenChat,
  onOpenCareer,
}: IosProfileMenuSheetProps) {
  if (!isOpen) return null;

  const actorName = actor?.name || 'Thảo Ly';
  const isCvl = role === 'CVL';
  const isCvll = role === 'CVLL';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Sheet Container */}
      <div className="w-full max-w-[420px] z-10 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom duration-200">
        {/* Main Content Box */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-3xl p-4 border border-neutral-800 text-white space-y-4 shadow-2xl">
          {/* Header Staff Identity */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-400 text-black font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                <img
                  src="https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png"
                  alt={actorName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[15px] text-white tracking-tight">{actorName}</span>
                  <span className="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center">
                    {isCvll ? <CvFeather2Badge /> : isCvl ? 'CV🪶 Tự Chủ' : role}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                  <span>📍 Chi nhánh Đề Thám</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">Đang hoạt động</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Privacy Scope Info */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-2.5 flex items-center gap-2 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0 text-[11.5px] leading-tight">
              <span className="text-neutral-300 font-medium">Phạm vi bảo mật: </span>
              <span className="text-amber-400 font-bold">1 khách đầu tua + khách book đích danh</span>
            </div>
          </div>

          {/* Admin Test Role Switcher (Hidden in menu as requested by Danny) */}
          {canSwitchRole && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kiểm thử vai trò (Admin Mode):</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CVL', 'CVLL', 'CC'] as const).map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        onRoleChange?.(r);
                        onClose();
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                      }`}
                    >
                      {r === 'CVL' ? 'CV🪶' : r === 'CVLL' ? <CvFeather2Badge /> : 'CC Sảnh'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Action Navigation Rows */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenPaystub?.();
              }}
              className="w-full p-2.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border border-neutral-800/80 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Thu nhập tạm tính</div>
                  <div className="text-[10.5px] text-neutral-400">Xem bảng kê ca làm & thưởng</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => {
                onClose();
                if (onOpenChat) onOpenChat();
                else window.open('/dashboard/chat', '_blank');
              }}
              className="w-full p-2.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border border-neutral-800/80 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Trò chuyện mOS Chat</div>
                  <div className="text-[10.5px] text-neutral-400">Tin nhắn nội bộ sảnh & quản lý</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => {
                onClose();
                if (onOpenCareer) onOpenCareer();
                else window.open('/dashboard/career', '_blank');
              }}
              className="w-full p-2.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border border-neutral-800/80 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Lộ trình thăng tiến</div>
                  <div className="text-[10.5px] text-neutral-400">Tiêu chuẩn cấp bậc CV 🪶 và CC</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-[#1C1C1E] text-amber-400 font-bold text-sm active:bg-neutral-800 transition-colors shadow-lg cursor-pointer text-center"
        >
          Đóng (Close)
        </button>
      </div>
    </div>
  );
}
