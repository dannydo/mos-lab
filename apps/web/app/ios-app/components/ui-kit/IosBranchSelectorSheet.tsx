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
        <div
          className="backdrop-blur-2xl rounded-3xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: 'var(--mos-surface)',
            borderColor: 'var(--mos-surface-border)',
            color: 'var(--mos-text)',
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--mos-surface-border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--mos-focus-ring)',
                  borderColor: 'var(--mos-accent)',
                  color: 'var(--mos-accent)',
                }}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-black tracking-wide uppercase" style={{ color: 'var(--mos-text)' }}>
                  Chọn Chi Nhánh Vận Hành
                </h3>
                <p className="text-[11px] font-medium" style={{ color: 'var(--mos-text-muted)' }}>
                  Xem khách hàng và tình hình thực tế sảnh đón
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng chọn chi nhánh"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: 'var(--mos-surface-muted)',
                color: 'var(--mos-text-muted)',
              }}
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
                  className="w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left border"
                  style={{
                    backgroundColor: isSelected ? 'var(--mos-focus-ring)' : 'var(--mos-surface-muted)',
                    borderColor: isSelected ? 'var(--mos-accent)' : 'var(--mos-surface-border)',
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-[12px] font-black tracking-wider shrink-0 mt-0.5 border"
                      style={
                        isSelected
                          ? {
                              backgroundColor: 'var(--mos-accent)',
                              color: 'var(--mos-accent-contrast)',
                              borderColor: 'var(--mos-accent)',
                            }
                          : {
                              backgroundColor: 'var(--mos-surface)',
                              color: 'var(--mos-text)',
                              borderColor: 'var(--mos-surface-border)',
                            }
                      }
                    >
                      {branch.code}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-black text-[14px] truncate"
                          style={{ color: isSelected ? 'var(--mos-accent)' : 'var(--mos-text)' }}
                        >
                          {branch.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            Đang xem
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] truncate" style={{ color: 'var(--mos-text-muted)' }}>
                        <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--mos-text-muted)' }} />
                        <span className="truncate">{branch.address}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: 'var(--mos-accent)',
                        color: 'var(--mos-accent-contrast)',
                      }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="px-4 py-2.5 border-t text-center"
            style={{
              backgroundColor: 'var(--mos-surface-muted)',
              borderColor: 'var(--mos-surface-border)',
            }}
          >
            <span className="text-[10.5px]" style={{ color: 'var(--mos-text-muted)' }}>
              Quyền Admin: Chuyển đổi sẽ tự động mở xem Toàn Bộ Sảnh của chi nhánh đó
            </span>
          </div>
        </div>

        {/* Cancel Button */}
        <div
          className="backdrop-blur-2xl rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: 'var(--mos-surface)',
            borderColor: 'var(--mos-surface-border)',
          }}
        >
          <button
            onClick={onClose}
            className="w-full py-3.5 text-center text-[15px] font-bold active:opacity-75 transition-opacity cursor-pointer"
            style={{ color: 'var(--mos-accent)' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
