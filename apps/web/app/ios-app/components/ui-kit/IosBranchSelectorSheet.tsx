'use client';

import React from 'react';
import { Check, MapPin, Building2, X } from 'lucide-react';
import { IosBranchConfig } from '../../state/useIosAppState';

interface IosBranchSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStoreId: number;
  onSelectBranch: (storeId: number) => void;
  availableBranches: IosBranchConfig[];
}

export function IosBranchSelectorSheet({
  isOpen,
  onClose,
  selectedStoreId,
  onSelectBranch,
  availableBranches,
}: IosBranchSelectorSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] select-none">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="w-full max-w-[420px] z-10 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom duration-200">
        {/* Main Selection Card */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-black text-white tracking-wide uppercase">Chọn Chi Nhánh Vận Hành</h3>
                <p className="text-[11px] text-neutral-400 font-medium">Xem khách hàng và tình hình thực tế sảnh đón</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Branch Options List */}
          <div className="p-2 space-y-1.5">
            {availableBranches.map((branch) => {
              const isSelected = Number(branch.id) === Number(selectedStoreId);
              return (
                <button
                  key={branch.id}
                  onClick={() => {
                    onSelectBranch(branch.id);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-400/15 border border-amber-400/40 shadow-sm'
                      : 'bg-neutral-900/60 hover:bg-neutral-800/70 border border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-black tracking-wider shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-amber-400 text-black shadow-xs'
                          : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                      }`}
                    >
                      {branch.code}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-[14px] truncate ${
                            isSelected ? 'text-amber-400' : 'text-neutral-100'
                          }`}
                        >
                          {branch.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Đang xem
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-400 truncate">
                        <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-black shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2.5 bg-neutral-950/60 border-t border-neutral-800/60 text-center">
            <span className="text-[10.5px] text-neutral-500">
              Quyền Admin: Chuyển đổi sẽ tự động mở xem Toàn Bộ Sảnh của chi nhánh đó
            </span>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
          <button
            onClick={onClose}
            className="w-full py-3.5 text-center text-[#FFB400] text-[15px] font-bold active:bg-white/5 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
