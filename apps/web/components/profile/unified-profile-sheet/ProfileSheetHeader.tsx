'use client';

import React from 'react';
import { Camera, Lock, X } from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge } from '../../../app/ios-app/components/ui-kit/CvFeatherLabels';
import type { IosUserRole } from '../../../app/ios-app/state/useIosAppState';
import type { UnifiedProfileAppContext } from './types';

interface ProfileRoleBadgeProps {
  appContext: UnifiedProfileAppContext;
  isCvll: boolean;
  isCvl: boolean;
  effectiveIosRole?: IosUserRole;
  isCcTeamMember: boolean;
  effectiveRoleStr: string;
}

const ProfileRoleBadge: React.FC<ProfileRoleBadgeProps> = ({
  appContext,
  isCvll,
  isCvl,
  effectiveIosRole,
  isCcTeamMember,
  effectiveRoleStr,
}) => {
  if (appContext === 'ios') {
    if (isCvll) return <CvFeather2Badge />;
    if (isCvl) {
      return (
        <span className="inline-flex items-center gap-1">
          <CvFeather1Badge /> Tự Chủ
        </span>
      );
    }
    return <span>{effectiveIosRole || 'CC'}</span>;
  }
  if (isCvll) return <CvFeather2Badge />;
  if (isCvl) return <CvFeather1Badge />;
  if (isCcTeamMember && effectiveRoleStr.toLowerCase() !== 'cc') {
    return <span>{effectiveRoleStr.toUpperCase()} · Nhóm CC</span>;
  }
  return <span>{(effectiveRoleStr || 'STAFF').toUpperCase()}</span>;
};

export interface ProfileSheetHeaderProps {
  isDark: boolean;
  appContext: UnifiedProfileAppContext;
  displayName: string;
  displayInitial: string;
  resolvedAvatar?: string;
  avatarLoadError: boolean;
  onAvatarError: () => void;
  onOpenAvatarCrop: () => void;
  onClose: () => void;
  branchText: string;
  isCvll: boolean;
  isCvl: boolean;
  effectiveIosRole?: IosUserRole;
  isCcTeamMember: boolean;
  effectiveRoleStr: string;
  isImpersonating: boolean;
  onExitImpersonation?: () => Promise<void> | void;
  scopeText: string;
}

export const ProfileSheetHeader: React.FC<ProfileSheetHeaderProps> = ({
  isDark,
  appContext,
  displayName,
  displayInitial,
  resolvedAvatar,
  avatarLoadError,
  onAvatarError,
  onOpenAvatarCrop,
  onClose,
  branchText,
  isCvll,
  isCvl,
  effectiveIosRole,
  isCcTeamMember,
  effectiveRoleStr,
  isImpersonating,
  onExitImpersonation,
  scopeText,
}) => {
  return (
    <>
      {/* 1. Header Staff Identity */}
      <div
        className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenAvatarCrop}
            title="Bấm để đổi ảnh đại diện (AI Coach)"
            aria-label="Đổi ảnh đại diện từ ảnh hồ sơ"
            className="relative w-12 h-12 rounded-full overflow-visible shrink-0 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-400 text-black font-black text-lg flex items-center justify-center shadow-md">
              {resolvedAvatar && !avatarLoadError ? (
                <img
                  src={resolvedAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={onAvatarError}
                />
              ) : (
                <span>{displayInitial}</span>
              )}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border shadow-xs ${
                isDark
                  ? 'bg-neutral-900 border-amber-400/60 text-amber-400'
                  : 'bg-white border-amber-400 text-amber-600'
              }`}
            >
              <Camera className="w-2.5 h-2.5" />
            </span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-extrabold text-[15px] tracking-tight truncate ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
              >
                {displayName}
              </span>
              <span className="bg-amber-400/20 text-amber-500 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center leading-none">
                <ProfileRoleBadge
                  appContext={appContext}
                  isCvll={isCvll}
                  isCvl={isCvl}
                  effectiveIosRole={effectiveIosRole}
                  isCcTeamMember={isCcTeamMember}
                  effectiveRoleStr={effectiveRoleStr}
                />
              </span>
            </div>
            <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
              <span>📍 {branchText}</span>
              <span>·</span>
              <span className="text-emerald-500 font-semibold">Đang hoạt động</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng menu hồ sơ"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isDark
              ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="rounded-2xl px-3 py-2 bg-amber-500/15 border border-amber-500/35 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-amber-400">Đang giả lập tài khoản</span>
          <button
            type="button"
            onClick={async () => {
              onClose();
              await onExitImpersonation?.();
            }}
            className="font-extrabold text-rose-400 hover:underline cursor-pointer"
          >
            Thoát giả lập
          </button>
        </div>
      )}

      {/* 2. Operational Scope Bar */}
      <div
        className={`border rounded-2xl p-2.5 flex items-center gap-2 text-xs ${
          isDark
            ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
            : 'bg-amber-50/90 border-amber-200 text-amber-900'
        }`}
      >
        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="min-w-0 text-[11.5px] leading-tight">
          <span className={isDark ? 'text-neutral-300 font-medium' : 'text-amber-800 font-medium'}>
            {isCvl && appContext === 'ios' ? 'Phạm vi bảo mật: ' : 'Phạm vi vận hành: '}
          </span>
          <span className={isDark ? 'text-amber-400 font-bold' : 'text-amber-900 font-bold'}>{scopeText}</span>
        </div>
      </div>
    </>
  );
};
