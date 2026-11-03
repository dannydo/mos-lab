'use client';

import React, { useState } from 'react';
import { Check, RotateCcw, Plus, Sparkles, Sliders, Star, Trash2, X, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  ALL_LASH_DESIGNS,
  ALL_LASH_THICKNESSES,
  ALL_LENGTH_MAPPINGS,
  ALL_SINGLE_LENGTHS,
  ALL_LASH_CURL_CODES,
  ALL_VOLUME_OPTIONS,
  STANDARD_COLORS,
  saveMaterialCatalog,
  resetMaterialCatalogToDefault,
  type LashMaterialSpec,
} from './LashMaterialConstraintMatrix';
import { LASH_CURL_LIST } from './LashCurlData';
import { LashCurlIllustration } from './LashCurlIllustration';

interface LashMaterialConfiguratorModalProps {
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
  const [draftCatalog, setDraftCatalog] = useState<LashMaterialSpec[]>(catalog);
  const [activeId, setActiveId] = useState<string>(initialMaterialId || catalog[0]?.id || 'New Flawless Mink');
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

  // Toggle Design
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

  // Toggle Thickness
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
      // Sort thicknesses in ascending order
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

  // Toggle Curl
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

  // Toggle Single Length mm
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

  // Toggle Length Mapping
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

  // Toggle Volume
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
      className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:items-center select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] max-h-[94dvh] bg-[#F4F5F8] sm:rounded-[30px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header — Title left, Close [✕] right */}
        <div className="px-4 py-3 bg-[#111827] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-[#FFB400]/20 border border-[#FFB400]/50 flex items-center justify-center text-[#FFB400] shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFB400]">
                TRÌNH CẤU HÌNH RÀNG BUỘC KỸ THUẬT MI
              </div>
              <div className="text-[14px] font-black text-white truncate">Chất Liệu → Thiết Kế → Dày · Dài · Cong</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trình cấu hình"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0 ml-2"
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
        <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
              CHỌN CHẤT LIỆU CẦN CONFIG ({draftCatalog.length} DÒNG MI)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingMaterial((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold transition-colors"
              >
                <Plus className="w-3 h-3" />
                Thêm chất liệu
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold transition-colors"
                title="Khôi phục mặc định chuẩn Wings"
              >
                <RotateCcw className="w-3 h-3" />
                Chuẩn gốc
              </button>
            </div>
          </div>

          {isAddingMaterial && (
            <div className="flex items-center gap-1.5 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="Nhập tên chất liệu mới (VD: Fox Eye Silk)..."
                className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-gray-900 border border-amber-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddNewMaterial}
                className="px-3 py-1.5 rounded-lg bg-[#111827] text-[#FFB400] text-[11px] font-black"
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
                  className={`p-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-[#111827] text-white border-[#FFB400] ring-2 ring-[#FFB400]/30 shadow-sm'
                      : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-[11px] font-black truncate">{m.shortLabel}</div>
                  <div
                    className={`text-[9px] font-bold mt-0.5 truncate ${
                      isSelected ? 'text-[#FFB400]' : 'text-gray-500'
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
          <div className="bg-gradient-to-r from-[#111827] to-[#1F2937] text-white rounded-2xl p-3 shadow-sm border border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FFB400] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                LUỒNG ÁP DỤNG TỨC THÌ CỦA {activeMaterial.shortLabel.toUpperCase()}
              </span>
              {draftCatalog.length > 6 && (
                <button
                  type="button"
                  onClick={handleDeleteActiveMaterial}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
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
              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-300 border border-white/15">
                2. Thiết kế: {activeMaterial.allowedDesigns.join(', ')}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-amber-300 border border-white/15">
                3. Cong: {activeMaterial.allowedCurls.join(', ')}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-sky-300 border border-white/15">
                Dày: {activeMaterial.allowedThicknesses.map((t) => t.replace(' mm', '')).join(', ')}mm
              </span>
            </div>
          </div>

          {/* CONFIG SECTION 1: THIẾT KẾ CHO PHÉP (DESIGNS) */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-black text-gray-900 uppercase">
                  1. {activeMaterial.shortLabel} → Có thể ra Thiết Kế gì?
                </div>
                <div className="text-[10px] text-gray-500 font-medium">
                  Bấm để Bật / Khóa thiết kế. Bấm ngôi sao ★ để đặt làm mặc định.
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    updateActiveMaterial(
                      (m) => ({
                        ...m,
                        allowedDesigns: ['Natural'],
                        defaultDesign: 'Natural',
                      }),
                      `Chỉ mở Natural cho ${activeMaterial.shortLabel}`
                    )
                  }
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[9px] font-extrabold text-gray-700"
                >
                  Chỉ Natural
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveMaterial(
                      (m) => ({
                        ...m,
                        allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
                      }),
                      `Mở đủ 4 dáng cho ${activeMaterial.shortLabel}`
                    )
                  }
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[9px] font-extrabold text-gray-700"
                >
                  Mở cả 4
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ALL_LASH_DESIGNS.map((d) => {
                const isAllowed = activeMaterial.allowedDesigns.includes(d.id);
                const isDefault = activeMaterial.defaultDesign === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => handleToggleDesign(d.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-1.5 ${
                      isAllowed
                        ? 'bg-emerald-50/70 border-emerald-500 text-gray-900 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-400 opacity-75'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black ${
                            isAllowed ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isAllowed ? '✓' : '✕'}
                        </span>
                        <span className="text-[12px] font-extrabold truncate">{d.shortName}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                        {isAllowed ? d.desc : 'Đang khóa cho chất liệu này'}
                      </div>
                    </div>

                    {isAllowed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateActiveMaterial(
                            (m) => ({ ...m, defaultDesign: d.id }),
                            `Đặt ${d.shortName} làm thiết kế mặc định`
                          );
                        }}
                        title="Đặt làm thiết kế mặc định"
                        className={`p-1 rounded-lg border shrink-0 ${
                          isDefault
                            ? 'bg-[#FFB400] text-black border-amber-500'
                            : 'bg-white text-gray-400 border-gray-200 hover:text-gray-700'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONFIG SECTION 2: ĐỘ CONG CHO PHÉP (CURLS) */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div>
                <div className="text-[12px] font-black text-gray-900 uppercase">
                  2. {activeMaterial.shortLabel} → Có Độ Cong thế nào?
                </div>
                <div className="text-[10px] text-gray-500 font-medium">
                  Chọn trong 7 độ cong chuẩn (`J, B, C, D` & `LJ, LB, LC`).
                </div>
              </div>

              {/* Quick Curl Presets */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Chỉ B', curls: ['B'] },
                  { label: 'Chỉ B, C', curls: ['B', 'C'] },
                  { label: 'Chỉ B, C, D', curls: ['B', 'C', 'D'] },
                  { label: 'J, B, C, D', curls: ['J', 'B', 'C', 'D'] },
                  { label: 'Chỉ LJ, LB, LC', curls: ['LJ', 'LB', 'LC'] },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      updateActiveMaterial(
                        (m) => ({
                          ...m,
                          allowedCurls: preset.curls,
                          defaultCurl: preset.curls.includes(m.defaultCurl) ? m.defaultCurl : preset.curls[0],
                        }),
                        `Đã đặt độ cong [${preset.curls.join(', ')}] cho ${activeMaterial.shortLabel}`
                      )
                    }
                    className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-extrabold"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {LASH_CURL_LIST.map((curlItem) => {
                const isAllowed = activeMaterial.allowedCurls.includes(curlItem.id);
                const isDefault = activeMaterial.defaultCurl === curlItem.id;
                return (
                  <div
                    key={curlItem.id}
                    onClick={() => handleToggleCurl(curlItem.id)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center relative ${
                      isAllowed
                        ? 'bg-emerald-50/60 border-emerald-500 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 opacity-45 grayscale'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between px-0.5 mb-0.5">
                      <span className={`text-[11px] font-black ${isAllowed ? 'text-emerald-900' : 'text-gray-400'}`}>
                        {curlItem.code}
                      </span>
                      {isAllowed ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateActiveMaterial(
                              (m) => ({ ...m, defaultCurl: curlItem.id }),
                              `Đặt độ cong ${curlItem.code} làm mặc định`
                            );
                          }}
                          className={`p-0.5 rounded ${
                            isDefault ? 'bg-[#FFB400] text-black' : 'text-gray-300 hover:text-gray-600'
                          }`}
                          title="Đặt làm độ cong mặc định"
                        >
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </button>
                      ) : (
                        <span className="text-[8px] font-bold text-gray-400">Khóa</span>
                      )}
                    </div>

                    <div className="w-full">
                      <LashCurlIllustration curl={curlItem} variant="card" isActive={isAllowed} showLabels={false} />
                    </div>

                    <div className="text-[8.5px] font-bold text-gray-600 mt-0.5 truncate w-full text-center">
                      {curlItem.angleLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONFIG SECTION 3: ĐỘ DÀY CHO PHÉP (THICKNESS) */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div>
                <div className="text-[12px] font-black text-gray-900 uppercase">
                  3. {activeMaterial.shortLabel} → Có Độ Dày thế nào?
                </div>
                <div className="text-[10px] text-gray-500 font-medium">
                  Chọn các độ dày sợi (mm) được phép sử dụng cho chất liệu này.
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { label: '0.05 & 0.07', list: ['0.05 mm', '0.07 mm'] },
                  { label: '0.07 & 0.10', list: ['0.07 mm', '0.10 mm'] },
                  { label: '0.10, 0.12, 0.15', list: ['0.10 mm', '0.12 mm', '0.15 mm'] },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      updateActiveMaterial(
                        (m) => ({
                          ...m,
                          allowedThicknesses: preset.list,
                          defaultThickness: preset.list.includes(m.defaultThickness)
                            ? m.defaultThickness
                            : preset.list[0],
                        }),
                        `Đã đặt độ dày [${preset.label}] cho ${activeMaterial.shortLabel}`
                      )
                    }
                    className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-extrabold"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {ALL_LASH_THICKNESSES.map((t) => {
                const isAllowed = activeMaterial.allowedThicknesses.includes(t.id);
                const isDefault = activeMaterial.defaultThickness === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleThickness(t.id)}
                    className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isAllowed
                        ? 'bg-emerald-50/70 border-emerald-500 text-gray-900'
                        : 'bg-gray-50 border-gray-200 text-gray-400 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-black">{t.label}</span>
                      {isAllowed ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateActiveMaterial(
                              (m) => ({ ...m, defaultThickness: t.id }),
                              `Đặt ${t.label} làm độ dày mặc định`
                            );
                          }}
                          className={`p-0.5 rounded ${
                            isDefault ? 'bg-[#FFB400] text-black' : 'text-gray-300 hover:text-gray-600'
                          }`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                      ) : (
                        <span className="text-[8px] font-bold">Khóa</span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5 leading-tight line-clamp-1">{t.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONFIG SECTION 4: ĐỘ DÀI CHO PHÉP (LENGTHS) */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div>
                <div className="text-[12px] font-black text-gray-900 uppercase">
                  4. {activeMaterial.shortLabel} → Có Độ Dài thế nào?
                </div>
                <div className="text-[10px] text-gray-500 font-medium">
                  Cấu hình cả dải phối độ dài (Mapping) và từng cỡ mm đơn lẻ (6mm – 15mm).
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() =>
                    updateActiveMaterial(
                      (m) => ({
                        ...m,
                        allowedSingleLengths: ['6 mm', '7 mm', '8 mm'],
                        allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((item) =>
                          ['6-7 mm', '7-8 mm'].includes(item.id)
                        ),
                        defaultLength: '6-7 mm',
                      }),
                      `Đã đặt độ dài Mi Dưới (6-8mm)`
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-extrabold"
                >
                  Mi dưới 6–8mm
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveMaterial(
                      (m) => ({
                        ...m,
                        allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
                        allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((item) =>
                          ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(item.id)
                        ),
                        defaultLength: '10-12 mm',
                      }),
                      `Đã đặt độ dài chuẩn 8-13mm`
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-extrabold"
                >
                  Chuẩn 8–13mm
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveMaterial(
                      (m) => ({
                        ...m,
                        allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
                        allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((item) =>
                          ['8-10-12 mm', '9-11-13 mm', '10-12-14 mm'].includes(item.id)
                        ),
                        defaultLength: '8-10-12 mm',
                      }),
                      `Đã đặt độ dài so le Ivylight`
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-extrabold"
                >
                  So le Ivylight
                </button>
              </div>
            </div>

            {/* Single mm chips */}
            <div>
              <div className="text-[10px] font-extrabold text-gray-500 uppercase mb-1">Cỡ mm đơn lẻ cho phép:</div>
              <div className="grid grid-cols-5 gap-1.5">
                {ALL_SINGLE_LENGTHS.map((mm) => {
                  const isAllowed = activeMaterial.allowedSingleLengths.includes(mm);
                  return (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => handleToggleSingleLength(mm)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        isAllowed
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}
                    >
                      {mm}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Length Mapping Presets */}
            <div className="pt-1 border-t border-gray-100">
              <div className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5">
                Dải phối độ dài (Mapping gợi ý):
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_LENGTH_MAPPINGS.map((mapping) => {
                  const isAllowed = activeMaterial.allowedLengthMappings.some((item) => item.id === mapping.id);
                  return (
                    <button
                      key={mapping.id}
                      type="button"
                      onClick={() => handleToggleLengthMapping(mapping.id)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        isAllowed
                          ? 'bg-emerald-50/70 border-emerald-500 text-gray-900'
                          : 'bg-gray-50 border-gray-200 text-gray-400 opacity-65'
                      }`}
                    >
                      <div className="text-[11px] font-black flex items-center justify-between">
                        <span>{mapping.id}</span>
                        <span>{isAllowed ? '✓' : 'Khóa'}</span>
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{mapping.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CONFIG SECTION 5: VOLUME / KỸ THUẬT FAN */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2">
            <div className="text-[12px] font-black text-gray-900 uppercase">
              5. {activeMaterial.shortLabel} → Kỹ Thuật Sợi / Volume
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_VOLUME_OPTIONS.map((vol) => {
                const isAllowed = activeMaterial.allowedVolumes.includes(vol);
                return (
                  <button
                    key={vol}
                    type="button"
                    onClick={() => handleToggleVolume(vol)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      isAllowed
                        ? 'bg-[#111827] text-[#FFB400] border-[#111827]'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {isAllowed && '✓ '}
                    {vol}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BẢNG TỔNG HỢP TOÀN BỘ MA TRẬN (OVERVIEW SUMMARY) */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-900 uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Bảng Tổng Hợp Cấu Hình Hiện Tại ({draftCatalog.length} Chất Liệu)
            </div>
            <div className="divide-y divide-gray-100 text-[10.5px]">
              {draftCatalog.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={`py-2 px-2 rounded-lg cursor-pointer transition-colors ${
                    m.id === activeMaterial.id ? 'bg-amber-50/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-black text-gray-900">
                    <span>{m.shortLabel}</span>
                    <span className="text-[9.5px] text-emerald-700 font-extrabold">
                      Cong: {m.allowedCurls.join(', ')}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 flex flex-wrap gap-x-2">
                    <span>
                      <b>Thiết kế:</b> {m.allowedDesigns.join(', ')}
                    </span>
                    <span>·</span>
                    <span>
                      <b>Dày:</b> {m.allowedThicknesses.map((t) => t.replace(' mm', '')).join(', ')}mm
                    </span>
                    <span>·</span>
                    <span>
                      <b>Dài:</b> {m.allowedSingleLengths[0]}–
                      {m.allowedSingleLengths[m.allowedSingleLengths.length - 1]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#FFB400] hover:bg-[#f0a800] text-black font-black text-[13px] shadow-md flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.6]" />
            Hoàn tất & Áp dụng ngay vào Màn Tư Vấn
          </button>
        </div>
      </div>
    </div>
  );
};
