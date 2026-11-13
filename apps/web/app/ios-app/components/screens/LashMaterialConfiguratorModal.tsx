'use client';

import React, { useState } from 'react';
import { Check, RotateCcw, Plus, Sparkles, Sliders, Trash2, X, ArrowRight } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import {
  ALL_LASH_THICKNESSES,
  ALL_LENGTH_MAPPINGS,
  ALL_SINGLE_LENGTHS,
  ALL_LASH_CURL_CODES,
  STANDARD_COLORS,
  saveMaterialCatalog,
  resetMaterialCatalogToDefault,
  type LashMaterialSpec,
} from './LashMaterialConstraintMatrix';
import { ConfiguratorDesignAndCurlSections } from './consultation/configurator/ConfiguratorDesignAndCurlSections';
import { ConfiguratorSpecsAndSummarySections } from './consultation/configurator/ConfiguratorSpecsAndSummarySections';

export interface LashMaterialConfiguratorModalProps {
  open: boolean;
  catalog: LashMaterialSpec[];
  initialMaterialId?: string;
  onClose: () => void;
  onCatalogChange: (nextCatalog: LashMaterialSpec[]) => void;
}

export const LashMaterialConfiguratorModal: React.FC<LashMaterialConfiguratorModalProps> = ({
  open,
  catalog,
  initialMaterialId,
  onClose,
  onCatalogChange,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const [draftCatalog, setDraftCatalog] = useState<LashMaterialSpec[]>(catalog);
  const [activeId, setActiveId] = useState<string>(initialMaterialId || catalog[0]?.id || 'Flawless Mink');
  const [newMaterialName, setNewMaterialName] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  if (!open) return null;

  const activeMaterial = draftCatalog.find((m) => m.id === activeId) || draftCatalog[0];

  const triggerToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2200);
  };

  const commitUpdate = (nextList: LashMaterialSpec[], toastMsg?: string) => {
    setDraftCatalog(nextList);
    saveMaterialCatalog(nextList);
    onCatalogChange(nextList);
    if (toastMsg) triggerToast(toastMsg);
  };

  const updateActiveMaterial = (updater: (prev: LashMaterialSpec) => LashMaterialSpec, toastMsg?: string) => {
    const nextList = draftCatalog.map((item) => (item.id === activeMaterial.id ? updater(item) : item));
    commitUpdate(nextList, toastMsg);
  };

  const handleToggleDesign = (designId: string) => {
    updateActiveMaterial((m) => {
      const exists = m.allowedDesigns.includes(designId);
      if (exists && m.allowedDesigns.length <= 1) {
        triggerToast('Phải giữ ít nhất 1 thiết kế cho chất liệu này');
        return m;
      }
      const nextDesigns = exists ? m.allowedDesigns.filter((d) => d !== designId) : [...m.allowedDesigns, designId];
      const nextDefault = nextDesigns.includes(m.defaultDesign) ? m.defaultDesign : nextDesigns[0];
      return {
        ...m,
        allowedDesigns: nextDesigns,
        defaultDesign: nextDefault,
      };
    }, `Đã cập nhật thiết kế của ${activeMaterial.shortLabel}`);
  };

  const handleToggleThickness = (thicknessId: string) => {
    updateActiveMaterial((m) => {
      const exists = m.allowedThicknesses.includes(thicknessId);
      if (exists && m.allowedThicknesses.length <= 1) {
        triggerToast('Phải giữ ít nhất 1 độ dày cho chất liệu này');
        return m;
      }
      const nextList = exists
        ? m.allowedThicknesses.filter((t) => t !== thicknessId)
        : [...m.allowedThicknesses, thicknessId];
      const order = ALL_LASH_THICKNESSES.map((t) => t.id);
      nextList.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const nextDefault = nextList.includes(m.defaultThickness) ? m.defaultThickness : nextList[0];
      return {
        ...m,
        allowedThicknesses: nextList,
        defaultThickness: nextDefault,
      };
    }, `Đã cập nhật độ dày của ${activeMaterial.shortLabel}`);
  };

  const handleToggleCurl = (curlCode: string) => {
    updateActiveMaterial((m) => {
      const exists = m.allowedCurls.includes(curlCode);
      if (exists && m.allowedCurls.length <= 1) {
        triggerToast('Phải giữ ít nhất 1 độ cong cho chất liệu này');
        return m;
      }
      const nextList = exists ? m.allowedCurls.filter((c) => c !== curlCode) : [...m.allowedCurls, curlCode];
      nextList.sort((a, b) => ALL_LASH_CURL_CODES.indexOf(a) - ALL_LASH_CURL_CODES.indexOf(b));
      const nextDefault = nextList.includes(m.defaultCurl) ? m.defaultCurl : nextList[0];
      return {
        ...m,
        allowedCurls: nextList,
        defaultCurl: nextDefault,
      };
    }, `Đã cập nhật độ cong của ${activeMaterial.shortLabel}`);
  };

  const handleToggleSingleLength = (mmLabel: string) => {
    updateActiveMaterial((m) => {
      const exists = m.allowedSingleLengths.includes(mmLabel);
      if (exists && m.allowedSingleLengths.length <= 1) {
        triggerToast('Phải giữ ít nhất 1 độ dài cho chất liệu này');
        return m;
      }
      const nextList = exists
        ? m.allowedSingleLengths.filter((l) => l !== mmLabel)
        : [...m.allowedSingleLengths, mmLabel];
      nextList.sort((a, b) => ALL_SINGLE_LENGTHS.indexOf(a) - ALL_SINGLE_LENGTHS.indexOf(b));
      return {
        ...m,
        allowedSingleLengths: nextList,
      };
    }, `Đã cập nhật chiều dài sợi đơn của ${activeMaterial.shortLabel}`);
  };

  const handleToggleLengthMapping = (mappingId: string) => {
    const mappingObj = ALL_LENGTH_MAPPINGS.find((item) => item.id === mappingId);
    if (!mappingObj) return;
    updateActiveMaterial((m) => {
      const exists = m.allowedLengthMappings.some((item) => item.id === mappingId);
      if (exists && m.allowedLengthMappings.length <= 1) {
        triggerToast('Phải giữ ít nhất 1 dải phối độ dài');
        return m;
      }
      const nextMappings = exists
        ? m.allowedLengthMappings.filter((item) => item.id !== mappingId)
        : [...m.allowedLengthMappings, mappingObj];
      const order = ALL_LENGTH_MAPPINGS.map((item) => item.id);
      nextMappings.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      const nextDefault = nextMappings.some((item) => item.id === m.defaultLength)
        ? m.defaultLength
        : nextMappings[0]?.id || m.allowedSingleLengths[0] || '10-12 mm';
      return {
        ...m,
        allowedLengthMappings: nextMappings,
        defaultLength: nextDefault,
      };
    }, `Đã cập nhật dải độ dài của ${activeMaterial.shortLabel}`);
  };

  const handleToggleVolume = (vol: string) => {
    updateActiveMaterial((m) => {
      const exists = m.allowedVolumes.includes(vol);
      if (exists && m.allowedVolumes.length <= 1) {
        return m;
      }
      const nextVols = exists ? m.allowedVolumes.filter((v) => v !== vol) : [...m.allowedVolumes, vol];
      const nextDefault = nextVols.includes(m.defaultVolume) ? m.defaultVolume : nextVols[0];
      return {
        ...m,
        allowedVolumes: nextVols,
        defaultVolume: nextDefault,
      };
    }, `Đã cập nhật Volume của ${activeMaterial.shortLabel}`);
  };

  const handleAddNewMaterial = () => {
    const trimmed = newMaterialName.trim();
    if (!trimmed) return;
    const newSpec: LashMaterialSpec = {
      id: trimmed,
      code: trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      name: trimmed,
      shortLabel: trimmed,
      badge: 'CHẤT LIỆU MỚI',
      priceRange: '550.000đ – 1.200.000đ',
      summary: `Dòng chất liệu ${trimmed} tùy chỉnh theo cấu hình thực tế tại cửa hàng.`,
      constraintReason: `Cấu hình kỹ thuật tùy chỉnh cho ${trimmed}.`,
      allowedDesigns: ['Natural', 'Doll', 'Wing'],
      defaultDesign: 'Natural',
      lockedDesignReasons: {},
      allowedCurls: ['B', 'C', 'D'],
      defaultCurl: 'C',
      lockedCurlReason: `Theo cấu hình độ cong của ${trimmed}`,
      allowedThicknesses: ['0.07 mm', '0.10 mm'],
      defaultThickness: '0.10 mm',
      lockedThicknessReason: `Theo cấu hình độ dày của ${trimmed}`,
      allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
        ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
      ),
      allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
      defaultLength: '10-12 mm',
      allowedVolumes: ['1D (Classic)', '2D (Double Volume)'],
      defaultVolume: '1D (Classic)',
      allowedCounts: ['80 - 100 sợi/mắt', '110 sợi/mắt (Chuẩn)'],
      defaultCount: '110 sợi/mắt (Chuẩn)',
      allowedColors: STANDARD_COLORS,
    };
    const nextList = [...draftCatalog, newSpec];
    commitUpdate(nextList, `Đã thêm chất liệu "${trimmed}"`);
    setActiveId(newSpec.id);
    setNewMaterialName('');
    setIsAddingMaterial(false);
  };

  const handleDeleteActiveMaterial = () => {
    if (draftCatalog.length <= 1) return;
    const nextList = draftCatalog.filter((m) => m.id !== activeMaterial.id);
    commitUpdate(nextList, `Đã xóa chất liệu "${activeMaterial.shortLabel}"`);
    setActiveId(nextList[0].id);
  };

  const handleResetDefault = () => {
    const fresh = resetMaterialCatalogToDefault();
    setDraftCatalog(fresh);
    onCatalogChange(fresh);
    setActiveId(fresh[0].id);
    triggerToast('Đã khôi phục cấu hình chuẩn gốc 6 chất liệu Wings');
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:items-center select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] max-h-[94dvh] bg-[var(--background)] text-[var(--mos-text)] sm:rounded-[30px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border border-[var(--mos-surface-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header — Title left, Close [✕] right */}
        <div className="px-4 py-3 bg-[var(--mos-surface)] text-[var(--mos-text)] border-b border-[var(--mos-surface-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${isDark ? 'bg-[#FFB400]/20 border-[#FFB400]/50 text-[#FFB400]' : 'bg-amber-100 border-amber-300 text-amber-700'}`}>
              <Sliders className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-[#FFB400]' : 'text-amber-700'}`}>
                TRÌNH CẤU HÌNH RÀNG BUỘC KỸ THUẬT MI
              </div>
              <div className="text-[14px] font-black text-[var(--mos-text)] truncate">Chất Liệu → Thiết Kế → Dày · Dài · Cong</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trình cấu hình"
            className="w-8 h-8 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 flex items-center justify-center text-[var(--mos-text)] transition-colors shrink-0 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Feedback */}
        {savedToast && (
          <div className="bg-emerald-600 text-white px-3.5 py-1.5 text-[11px] font-bold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {savedToast}
            </span>
            <span className="text-[9px] uppercase tracking-wider opacity-80">Đã lưu tự động</span>
          </div>
        )}

        {/* Material Selector Strip */}
        <div className="px-3.5 py-2.5 bg-[var(--mos-surface)] border-b border-[var(--mos-surface-border)] shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mos-text-muted)]">
              CHỌN CHẤT LIỆU CẦN CONFIG ({draftCatalog.length} DÒNG MI)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingMaterial((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-extrabold transition-colors cursor-pointer ${isDark ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'}`}
              >
                <Plus className="w-3 h-3" />
                Thêm chất liệu
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--mos-surface-muted)] hover:opacity-80 text-[var(--mos-text)] border border-[var(--mos-surface-border)] text-[10px] font-bold transition-colors cursor-pointer"
                title="Khôi phục mặc định chuẩn Wings"
              >
                <RotateCcw className="w-3 h-3" />
                Chuẩn gốc
              </button>
            </div>
          </div>

          {isAddingMaterial && (
            <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50/80 border-amber-200'}`}>
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="Nhập tên chất liệu mới (VD: Fox Eye Silk)..."
                className="flex-1 bg-[var(--mos-surface-raised)] rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[var(--mos-text)] border border-[var(--mos-surface-border-strong)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddNewMaterial}
                className="px-3 py-1.5 rounded-lg bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] text-[11px] font-black cursor-pointer"
              >
                Tạo
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            {draftCatalog.map((m) => {
              const isSelected = m.id === activeMaterial.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveId(m.id)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] border-[#FFB400] ring-2 ring-[#FFB400]/30 shadow-sm'
                      : 'bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border-[var(--mos-surface-border)] hover:opacity-85'
                  }`}
                >
                  <div className="text-[11px] font-black truncate">{m.shortLabel}</div>
                  <div
                    className={`text-[9px] font-bold mt-0.5 truncate ${
                      isSelected ? 'opacity-85' : 'text-[var(--mos-text-muted)]'
                    }`}
                  >
                    {m.allowedDesigns.length} dáng · {m.allowedCurls.join(',')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Config Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
          {/* Live Pipeline Preview Banner */}
          <div className="bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-2xl p-3 shadow-sm border border-[var(--mos-surface-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-[#FFB400]' : 'text-amber-700'}`}>
                <Sparkles className="w-3 h-3" />
                LUỒNG ÁP DỤNG TỨC THÌ CỦA {activeMaterial.shortLabel.toUpperCase()}
              </span>
              {draftCatalog.length > 6 && (
                <button
                  type="button"
                  onClick={handleDeleteActiveMaterial}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-[#FFB400] text-black font-black">
                1. {activeMaterial.shortLabel}
              </span>
              <ArrowRight className="w-3 h-3 text-[var(--mos-text-muted)] shrink-0" />
              <span className={`px-2 py-0.5 rounded-md border ${isDark ? 'bg-white/10 text-emerald-300 border-white/15' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                2. Thiết kế: {activeMaterial.allowedDesigns.join(', ')}
              </span>
              <ArrowRight className="w-3 h-3 text-[var(--mos-text-muted)] shrink-0" />
              <span className={`px-2 py-0.5 rounded-md border ${isDark ? 'bg-white/10 text-amber-300 border-white/15' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                3. Cong: {activeMaterial.allowedCurls.join(', ')}
              </span>
              <ArrowRight className="w-3 h-3 text-[var(--mos-text-muted)] shrink-0" />
              <span className={`px-2 py-0.5 rounded-md border ${isDark ? 'bg-white/10 text-sky-300 border-white/15' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                Dày: {activeMaterial.allowedThicknesses.map((t) => t.replace(' mm', '')).join(', ')}mm
              </span>
            </div>
          </div>

          <ConfiguratorDesignAndCurlSections
            activeMaterial={activeMaterial}
            updateActiveMaterial={updateActiveMaterial}
            handleToggleDesign={handleToggleDesign}
            handleToggleCurl={handleToggleCurl}
          />

          <ConfiguratorSpecsAndSummarySections
            activeMaterial={activeMaterial}
            draftCatalog={draftCatalog}
            setActiveId={setActiveId}
            updateActiveMaterial={updateActiveMaterial}
            handleToggleThickness={handleToggleThickness}
            handleToggleSingleLength={handleToggleSingleLength}
            handleToggleLengthMapping={handleToggleLengthMapping}
            handleToggleVolume={handleToggleVolume}
          />
        </div>

        {/* Sticky Footer */}
        <div className="p-3 bg-[var(--mos-surface)] border-t border-[var(--mos-surface-border)] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[var(--mos-accent)] hover:opacity-90 text-[var(--mos-accent-contrast)] font-black text-[13px] shadow-md flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.6]" />
            Hoàn tất & Áp dụng ngay vào Màn Tư Vấn
          </button>
        </div>
      </div>
    </div>
  );
};
