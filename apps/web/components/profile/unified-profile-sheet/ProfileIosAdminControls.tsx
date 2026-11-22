'use client';

import React from 'react';
import { Building2, Shield } from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge } from '../../../app/ios-app/components/ui-kit/CvFeatherLabels';
import type { IosBranchConfig, IosUserRole } from '../../../app/ios-app/state/useIosAppState';
import { IOS_SWITCHABLE_ROLES } from './profileSheetUtils';

export interface ProfileIosAdminControlsProps {
  isDark: boolean;
  isAdmin: boolean;
  canSwitchRole: boolean;
  effectiveIosRole?: IosUserRole;
  onRoleChange?: (role: IosUserRole) => void;
  selectedStoreId: number;
  onSelectBranch?: (storeId: number) => void;
  availableBranches: IosBranchConfig[];
  onClose: () => void;
}

export const ProfileIosAdminControls: React.FC<ProfileIosAdminControlsProps> = ({
  isDark,
  isAdmin,
  canSwitchRole,
  effectiveIosRole,
  onRoleChange,
  selectedStoreId,
  onSelectBranch,
  availableBranches,
  onClose,
}) => {
  const showRoleSwitcher = canSwitchRole && Boolean(effectiveIosRole);
  const showBranchSwitcher =
    isAdmin &&
    effectiveIosRole !== 'CVL' &&
    effectiveIosRole !== 'CVLL' &&
    effectiveIosRole !== 'CV' &&
    Boolean(onSelectBranch) &&
    availableBranches.length > 0;

  if (!showRoleSwitcher && !showBranchSwitcher) return null;

  return (
    <>
      {showRoleSwitcher && effectiveIosRole && (
        <div className="space-y-1.5 pt-0.5">
          <div
            className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-1 ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Kiểm thử vai trò (Admin Mode):</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {IOS_SWITCHABLE_ROLES.map((r) => {
              const active = effectiveIosRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onRoleChange?.(r);
                    onClose();
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-black shadow-md'
                      : isDark
                        ? 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                        : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
                  }`}
                >
                  {r === 'CVL' ? (
                    <CvFeather1Badge featherClass={active ? 'w-3 h-3 text-black' : 'w-3 h-3 text-amber-400'} />
                  ) : r === 'CVLL' ? (
                    <CvFeather2Badge featherClass={active ? 'w-3 h-3 text-black' : 'w-3 h-3 text-amber-400'} />
                  ) : (
                    'CC Sảnh'
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showBranchSwitcher && onSelectBranch && (
        <div className="space-y-1.5 pt-0.5">
          <div
            className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-1 ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Chi nhánh vận hành (Admin):</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Toàn bộ sảnh</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {availableBranches.map((b) => {
              const active = Number(b.id) === Number(selectedStoreId);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSelectBranch(b.id);
                    onClose();
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-black shadow-md'
                      : isDark
                        ? 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                        : 'bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200'
                  }`}
                >
                  <span className="text-[10.5px] font-extrabold">{b.code}</span>
                  <span className="truncate">{b.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
