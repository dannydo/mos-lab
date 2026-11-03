'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem, COMBO_PACKAGES_CVL } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import {
  Sparkles,
  CheckCircle2,
  Eye,
  FileText,
  Sliders,
  ZoomIn,
  Lock,
  ShieldCheck,
  ArrowDownRight,
  Settings2,
  Images,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Activity,
  Check,
  Info,
} from 'lucide-react';
import { isSuperAdminRole, isCanonicalSuperAdminIdentity } from '@mos-lab/shared';
import { LASH_CURL_LIST } from './LashCurlData';
import { LashCurlIllustration } from './LashCurlIllustration';
import { LashCurlZoomModal } from './LashCurlZoomModal';
import { LashMaterialConfiguratorModal } from './LashMaterialConfiguratorModal';
import { LashDesignCompareModal } from './LashDesignCompareModal';
import { EyeShapeCompareModal } from './EyeShapeCompareModal';
import {
  ALL_LASH_DESIGNS,
  ALL_LASH_THICKNESSES,
  DEFAULT_LASH_MATERIAL_CATALOG,
  MATERIAL_MATRIX_UPDATED_EVENT,
  loadMaterialCatalog,
  resolveMaterialSpec,
  type LashMaterialSpec,
} from './LashMaterialConstraintMatrix';
import {
  NATURAL_LASH_LENGTH_OPTIONS,
  NATURAL_LASH_THICKNESS_OPTIONS,
  NATURAL_LASH_DENSITY_OPTIONS,
  NATURAL_LASH_DIRECTIONS,
  NATURAL_EYE_SHAPES,
  NATURAL_LASH_HEALTH_CONDITIONS,
  computeLashRecommendation,
} from './NaturalLashAssessmentData';

interface Screen03ConsultationMatrixProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onSave: (
    attributes: {
      style: string;
      curl: string;
      length: string;
      thickness: string;
      material?: string;
      color?: string;
      volume?: string;
      count?: string;
      eyeShape?: string;
      naturalLashLength?: string;
      naturalLashThickness?: string;
      naturalLashDensity?: string;
      isNewClientDiagnosticDone?: boolean;
      lashHealth?: string;
      lashTrail?: string;
      medicalProblem?: string;
      notes?: string;
    },
    selectedCombo?: { id: string; name: string; price: number; bonus: number; sessions: number } | null
  ) => void;
}

export function Screen03ConsultationMatrix({ booking, actor, onBack, onSave }: Screen03ConsultationMatrixProps) {
  const [materialCatalog, setMaterialCatalog] = useState<LashMaterialSpec[]>(() => loadMaterialCatalog());
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState<boolean>(false);

  useEffect(() => {
    setMaterialCatalog(loadMaterialCatalog());
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('config') === '1') {
        setIsConfiguratorOpen(true);
      }
      const onMatrixUpdated = () => {
        setMaterialCatalog(loadMaterialCatalog());
      };
      window.addEventListener(MATERIAL_MATRIX_UPDATED_EVENT, onMatrixUpdated);
      return () => window.removeEventListener(MATERIAL_MATRIX_UPDATED_EVENT, onMatrixUpdated);
    }
  }, []);

  const initialMat = useMemo(
    () =>
      resolveMaterialSpec(
        booking?.attributes?.material || booking?.serviceName || 'New Flawless Mink',
        materialCatalog
      ),
    [booking?.attributes?.material, booking?.serviceName, materialCatalog]
  );

  // ---------------------------------------------------------------------------
  // BƯỚC 1: CHẤT LIỆU / DÒNG MI (MATERIAL FAMILY - NGUỒN RÀNG BUỘC GỐC)
  // ---------------------------------------------------------------------------
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMat.id);

  const currentMaterialSpec: LashMaterialSpec = useMemo(
    () =>
      materialCatalog.find((m) => m.id === selectedMaterial) || materialCatalog[0] || DEFAULT_LASH_MATERIAL_CATALOG[0],
    [selectedMaterial, materialCatalog]
  );

  // ---------------------------------------------------------------------------
  // BƯỚC 2: THIẾT KẾ TRÊN HẠN CHẾ CỦA CHẤT LIỆU (CONSTRAINED DESIGN)
  // ---------------------------------------------------------------------------
  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    const initStyle = booking?.attributes?.style || initialMat.defaultDesign;
    return initialMat.allowedDesigns.includes(initStyle) ? initStyle : initialMat.defaultDesign;
  });

  // ---------------------------------------------------------------------------
  // BƯỚC 3: ĐỘ CONG, ĐỘ DÀY, CHIỀU DÀI & VOLUME CỦA CHẤT LIỆU (CONSTRAINED SPECS)
  // ---------------------------------------------------------------------------
  const [selectedCurl, setSelectedCurl] = useState<string>(() => {
    const initCurl = booking?.attributes?.curl || initialMat.defaultCurl;
    return initialMat.allowedCurls.includes(initCurl) ? initCurl : initialMat.defaultCurl;
  });

  const [selectedThickness, setSelectedThickness] = useState<string>(() => {
    const initThick = booking?.attributes?.thickness || initialMat.defaultThickness;
    return initialMat.allowedThicknesses.includes(initThick) ? initThick : initialMat.defaultThickness;
  });

  const [selectedLength, setSelectedLength] = useState<string>(booking?.attributes?.length || initialMat.defaultLength);
  const [selectedColor, setSelectedColor] = useState<string>(booking?.attributes?.color || 'Đen Tuyền (Jet Black)');
  const [selectedVolume, setSelectedVolume] = useState<string>(booking?.attributes?.volume || initialMat.defaultVolume);
  const [selectedCount, setSelectedCount] = useState<string>(booking?.attributes?.count || initialMat.defaultCount);

  // Tự động đồng bộ khi danh mục cấu hình thay đổi hoặc khi chọn chất liệu mới
  useEffect(() => {
    if (!currentMaterialSpec.allowedDesigns.includes(selectedStyle)) {
      setSelectedStyle(currentMaterialSpec.defaultDesign || currentMaterialSpec.allowedDesigns[0] || 'Natural');
    }
    if (!currentMaterialSpec.allowedCurls.includes(selectedCurl)) {
      setSelectedCurl(currentMaterialSpec.defaultCurl || currentMaterialSpec.allowedCurls[0] || 'C');
    }
    if (!currentMaterialSpec.allowedThicknesses.includes(selectedThickness)) {
      setSelectedThickness(
        currentMaterialSpec.defaultThickness || currentMaterialSpec.allowedThicknesses[0] || '0.10 mm'
      );
    }
    const validLengths = [
      ...currentMaterialSpec.allowedLengthMappings.map((m) => m.id),
      ...currentMaterialSpec.allowedSingleLengths,
    ];
    if (!validLengths.includes(selectedLength)) {
      setSelectedLength(
        currentMaterialSpec.defaultLength ||
          currentMaterialSpec.allowedLengthMappings[0]?.id ||
          currentMaterialSpec.allowedSingleLengths[0] ||
          '10-12 mm'
      );
    }
    if (!currentMaterialSpec.allowedVolumes.includes(selectedVolume)) {
      setSelectedVolume(currentMaterialSpec.defaultVolume || currentMaterialSpec.allowedVolumes[0] || '1D (Classic)');
    }
  }, [currentMaterialSpec]);

  // Khi chuyển Chất Liệu ở Bước 1 -> Tự động đồng bộ Thiết Kế (Bước 2) & Thông Số (Bước 3)
  const handleSelectMaterial = (mat: LashMaterialSpec) => {
    setSelectedMaterial(mat.id);

    if (!mat.allowedDesigns.includes(selectedStyle)) {
      setSelectedStyle(mat.defaultDesign);
    }
    if (!mat.allowedCurls.includes(selectedCurl)) {
      setSelectedCurl(mat.defaultCurl);
    }
    if (!mat.allowedThicknesses.includes(selectedThickness)) {
      setSelectedThickness(mat.defaultThickness);
    }
    const validLengths = [...mat.allowedLengthMappings.map((m) => m.id), ...mat.allowedSingleLengths];
    if (!validLengths.includes(selectedLength)) {
      setSelectedLength(mat.defaultLength);
    }
    if (!mat.allowedVolumes.includes(selectedVolume)) {
      setSelectedVolume(mat.defaultVolume);
    }
    if (!mat.allowedCounts.includes(selectedCount)) {
      setSelectedCount(mat.defaultCount);
    }
  };

  // ---------------------------------------------------------------------------
  // BƯỚC 0: ĐO & KHÁM MI THẬT (NATURAL LASH INTAKE & ASSESSMENT)
  // ---------------------------------------------------------------------------
  const isNewClient = useMemo(() => {
    return (
      (booking?.customerVisits ?? 1) <= 1 ||
      Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
      booking?.attributes?.isNewClientDiagnosticDone === false
    );
  }, [booking?.customerVisits, booking?.attributes?.lashHealth, booking?.attributes?.isNewClientDiagnosticDone]);

  const [naturalLength, setNaturalLength] = useState<string>(
    booking?.attributes?.naturalLashLength || (isNewClient ? '7mm' : '8mm')
  );
  const [naturalThickness, setNaturalThickness] = useState<string>(
    booking?.attributes?.naturalLashThickness || '0.05-0.07mm'
  );
  const [naturalDensity, setNaturalDensity] = useState<string>(
    booking?.attributes?.naturalLashDensity || 'Vừa (80 - 120 sợi/mắt)'
  );

  const [selectedEyeShape, setSelectedEyeShape] = useState(booking?.attributes?.eyeShape || 'Mí lót / Sụp mí (Hooded)');
  const [selectedLashHealth, setSelectedLashHealth] = useState(
    booking?.attributes?.lashHealth || (isNewClient ? 'Khách mới lần đầu nối mi (Virgin Lashes)' : 'Mi khỏe (Healthy)')
  );
  const [selectedLashTrail, setSelectedLashTrail] = useState(
    booking?.attributes?.lashTrail || 'Chúc xuống (Downwards)'
  );
  const [selectedMedicalProblem, setSelectedMedicalProblem] = useState(
    booking?.attributes?.medicalProblem || 'Bình thường (Good)'
  );

  const naturalLengthSpec = useMemo(() => {
    return NATURAL_LASH_LENGTH_OPTIONS.find((o) => o.id === naturalLength) || NATURAL_LASH_LENGTH_OPTIONS[2];
  }, [naturalLength]);

  const naturalThicknessSpec = useMemo(() => {
    return NATURAL_LASH_THICKNESS_OPTIONS.find((o) => o.id === naturalThickness) || NATURAL_LASH_THICKNESS_OPTIONS[0];
  }, [naturalThickness]);

  const recommendation = useMemo(() => {
    return computeLashRecommendation({
      lengthMm: naturalLengthSpec.valueMm,
      thicknessId: naturalThickness,
      directionId: selectedLashTrail,
      eyeShapeId: selectedEyeShape,
      healthId: selectedLashHealth,
      isNewClient,
    });
  }, [
    naturalLengthSpec.valueMm,
    naturalThickness,
    selectedLashTrail,
    selectedEyeShape,
    selectedLashHealth,
    isNewClient,
  ]);

  // Áp dụng khuyến nghị an toàn vào thông số nối mi
  const handleApplyRecommendation = () => {
    setSelectedStyle(recommendation.recommendedDesign);
    setSelectedCurl(recommendation.recommendedCurl);
    setSelectedThickness(recommendation.recommendedThickness);

    const maxSafe = recommendation.maxSafeMm;
    const matchedMapping = currentMaterialSpec.allowedLengthMappings.find(
      (m) => m.singleMmList.includes(String(maxSafe)) || m.singleMmList.includes(String(maxSafe - 1))
    );
    if (matchedMapping) {
      setSelectedLength(matchedMapping.id);
    } else {
      const matchedSingle = currentMaterialSpec.allowedSingleLengths.find((l) => l.includes(String(maxSafe)));
      if (matchedSingle) {
        setSelectedLength(matchedSingle);
      }
    }
    setActiveSubTab('SPECS');
  };

  // Cảnh báo an toàn trực tiếp (Live Validation)
  const lengthWarning = useMemo(() => {
    const nums = selectedLength.match(/\d+/g);
    if (nums && nums.length > 0) {
      const maxChosenMm = Math.max(...nums.map(Number));
      if (maxChosenMm > naturalLengthSpec.safeMaxExtensionMm) {
        return `⚠️ Chiều dài nối ${selectedLength} dài hơn mi thật (${naturalLengthSpec.label}) quá +2mm (khuyên dùng tối đa ${naturalLengthSpec.safeMaxExtensionMm}mm) có thể gây nặng sụp mí và hại nang mi!`;
      }
    }
    return null;
  }, [selectedLength, naturalLengthSpec]);

  const thicknessWarning = useMemo(() => {
    if (naturalThickness.includes('0.05') && selectedThickness.includes('0.15')) {
      return `🛑 Cảnh báo an toàn: Mi thật của khách là Mi tơ mảnh (0.07mm). Nối sợi Classic 0.15mm thô nặng sẽ làm gãy rụng nang mi thật!`;
    }
    return null;
  }, [naturalThickness, selectedThickness]);

  // ---------------------------------------------------------------------------
  // TAB 3: TƯ VẤN COMBO & GHI CHÚ KỸ THUẬT
  // ---------------------------------------------------------------------------
  const [selectedComboId, setSelectedComboId] = useState<string>(booking?.selectedCombo?.id || 'combo-flawless-5');
  const [notes, setNotes] = useState(
    booking?.attributes?.notes ||
      'Khách mí lót nhẹ, mi thật góc trong yếu. Chuyên Viên dán pad êm, nối form cánh quạt nhẹ ôm đuôi mắt.'
  );

  const [activeSubTab, setActiveSubTab] = useState<'SPECS' | 'PROFILE' | 'COMBO'>(() => {
    return (booking?.customerVisits ?? 1) <= 1 ? 'PROFILE' : 'SPECS';
  });
  const [isCurlZoomOpen, setIsCurlZoomOpen] = useState(false);
  const [zoomCurlId, setZoomCurlId] = useState<string>('C');
  const [isCompareDesignsOpen, setIsCompareDesignsOpen] = useState<boolean>(false);
  const [isEyeCompareOpen, setIsEyeCompareOpen] = useState<boolean>(false);

  const isSuperAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const rawUser = window.localStorage.getItem('mos_user');
      if (!rawUser) return false;
      const user = JSON.parse(rawUser);
      const role = String(user?.role || '')
        .trim()
        .toLowerCase();
      const email = String(user?.email || '')
        .trim()
        .toLowerCase();
      const username = String(user?.username || '')
        .trim()
        .toLowerCase();

      if (role === 'super_admin' || role === 'boss') return true;
      if (isSuperAdminRole(role)) return true;
      if (isCanonicalSuperAdminIdentity(user)) return true;
      if (email === 'danhdo@gmail.com' || email === 'danny.do@wingslashes.com' || username === 'admin') return true;
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('superadmin') === '1' || searchParams.get('super_admin') === '1') return true;
      return false;
    } catch {
      return false;
    }
  }, []);

  const chosenComboOption = COMBO_PACKAGES_CVL.find((c) => c.id === selectedComboId) || null;

  const handleSubmit = () => {
    onSave(
      {
        style: selectedStyle,
        curl: selectedCurl,
        length: selectedLength,
        thickness: selectedThickness,
        material: selectedMaterial,
        color: selectedColor,
        volume: selectedVolume,
        count: selectedCount,
        eyeShape: selectedEyeShape,
        naturalLashLength: naturalLength,
        naturalLashThickness: naturalThickness,
        naturalLashDensity: naturalDensity,
        isNewClientDiagnosticDone: true,
        lashHealth: selectedLashHealth,
        lashTrail: selectedLashTrail,
        medicalProblem: selectedMedicalProblem,
        notes,
      },
      chosenComboOption
        ? {
            id: chosenComboOption.id,
            name: chosenComboOption.name,
            price: chosenComboOption.price,
            bonus: chosenComboOption.cvBonus,
            sessions: chosenComboOption.sessions,
          }
        : null
    );
  };

  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = booking?.customerPhone || '0933.779.207';
  const serviceName = booking?.serviceName || 'New Flawless Mink';
  const servicePrice = booking?.servicePrice ? booking.servicePrice.toLocaleString('vi-VN') : '770.000';
  const actorName = actor?.name || 'Thảo Ly';
  const actorTierBadge = actor?.tier === 'CVLL' ? '🪶CV🪶' : 'CV🪶';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-hidden select-none">
      <IosNavigationBar
        title="Tư Vấn Dáng Mi Chuẩn iOS"
        onBack={onBack}
        backTitle="Check In"
        rightAction={
          <button onClick={handleSubmit} className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60">
            Lưu
          </button>
        }
      />

      <div className="flex-1 px-3.5 py-2.5 space-y-3 overflow-y-auto pb-8">
        {/* 1. Customer & Consultation Header Card */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[14px] font-bold text-black truncate">{customerName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-gray-700 font-bold tabular-nums">
                {customerPhone}
              </span>
              <span
                className={`text-[9.5px] px-2 py-0.5 rounded-full font-black ${
                  isNewClient ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {isNewClient ? 'KHÁCH MỚI' : `LẦN ${booking?.customerVisits || 2}`}
              </span>
            </div>
            <div className="text-[11.5px] text-gray-500 mt-0.5 font-medium truncate">
              Dịch vụ: <strong className="text-black">{serviceName}</strong> ({servicePrice} đ) · In:{' '}
              <strong className="text-emerald-600">{actorName}</strong>
            </div>
          </div>
          <span className="bg-[#FFB400] text-black font-extrabold text-[11px] px-2.5 py-1 rounded-full shadow-xs shrink-0">
            {actorTierBadge} Tư Vấn
          </span>
        </div>

        {/* Cảnh Báo Khách Mới Hoặc Tóm Tắt Mi Thật */}
        {isNewClient ? (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-[#FFB400] rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-[#FFB400] text-black flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-black" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-amber-950 uppercase tracking-tight">
                  KHÁCH MỚI · BẮT BUỘC KHÁM MI THẬT
                </div>
                <div className="text-[10px] text-amber-800 font-medium truncate">
                  Đo chiều dài (mm) & độ dày sợi để chọn mi nối an toàn
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('PROFILE')}
              className="px-2.5 py-1 rounded-lg bg-black text-[#FFB400] text-[10px] font-bold shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              Khám Ngay →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl px-3 py-1.5 shadow-xs border border-neutral-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-gray-500 font-medium">Mi thật đã lưu:</span>
              <strong className="text-black font-bold">
                {naturalLengthSpec.label} · Sợi {naturalThicknessSpec.label}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('PROFILE')}
              className="text-[#D97706] font-bold text-[10.5px] hover:underline cursor-pointer"
            >
              Đo lại mi →
            </button>
          </div>
        )}

        {/* 2. Sub-tab Filter Segment Bar */}
        <div className="bg-white/80 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-gray-200/80 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('PROFILE')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1 leading-none relative cursor-pointer ${
              activeSubTab === 'PROFILE' ? 'bg-black text-[#FFB400] shadow-sm' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>0. Khám Mi Thật</span>
            {isNewClient && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SPECS')}
            className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1 leading-none cursor-pointer ${
              activeSubTab === 'SPECS' ? 'bg-black text-[#FFB400] shadow-sm' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Dòng Mi → Dáng → Thông Số</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('COMBO')}
            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1 leading-none cursor-pointer ${
              activeSubTab === 'COMBO' ? 'bg-black text-[#FFB400] shadow-sm' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Combo</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: QUY TRÌNH TƯ VẤN 3 BƯỚC RÀNG BUỘC THEO CHẤT LIỆU CHUẨN WINGS       */}
        {/* ========================================================================= */}
        {activeSubTab === 'SPECS' && (
          <div className="space-y-3.5">
            {/* --------------------------------------------------------------------- */}
            {/* BƯỚC 1: CHỌN CHẤT LIỆU / DÒNG MI (MATERIAL FAMILY)                    */}
            {/* --------------------------------------------------------------------- */}
            <div>
              <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
                    1
                  </span>
                  <span>BƯỚC 1: CHỌN CHẤT LIỆU / DÒNG MI</span>
                </div>
                {/* Chỉ duy nhất 1 icon config và chỉ có Super Admin mới được thấy */}
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsConfiguratorOpen(true)}
                    aria-label="Cấu hình ma trận chất liệu (Chỉ Super Admin)"
                    className="w-7 h-7 rounded-full bg-neutral-900 text-[#FFB400] hover:bg-black flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Cấu hình ma trận chất liệu (Chỉ Super Admin)"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {materialCatalog.map((mat) => {
                    const active = selectedMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => handleSelectMaterial(mat)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          active
                            ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-sm ring-1 ring-[#FFB400]'
                            : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12px] font-black leading-tight">{mat.shortLabel}</span>
                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />}
                          </div>
                          <span
                            className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-1 ${
                              active ? 'bg-black text-[#FFB400]' : 'bg-gray-200/80 text-gray-600'
                            }`}
                          >
                            {mat.badge}
                          </span>
                        </div>

                        <div className="text-[9.5px] font-semibold text-gray-500 mt-1.5 leading-snug">
                          Dáng: <strong className="text-gray-800">{mat.allowedDesigns.join(', ')}</strong> · Cong:{' '}
                          <strong className="text-amber-700">{mat.allowedCurls.join(', ')}</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Thanh Quy Tắc Ràng Buộc Vật Lý Của Chất Liệu Đang Chọn */}
                <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-2.5 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-950 leading-snug">
                    <span className="font-extrabold">Quy chuẩn {currentMaterialSpec.shortLabel}: </span>
                    <span>{currentMaterialSpec.constraintReason}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* BƯỚC 2: THIẾT KẾ TRÊN HẠN CHẾ CỦA CHẤT LIỆU (CONSTRAINED DESIGN)      */}
            {/* --------------------------------------------------------------------- */}
            <div>
              <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
                    2
                  </span>
                  <span>BƯỚC 2: THIẾT KẾ CỦA {currentMaterialSpec.shortLabel.toUpperCase()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareDesignsOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100/90 hover:bg-amber-200 text-amber-950 text-[10px] font-extrabold shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  <Images className="w-3 h-3 text-amber-700" />
                  <span>So sánh 4 dáng mi</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2">
                <div
                  className={`grid gap-2.5 ${
                    currentMaterialSpec.allowedDesigns.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {ALL_LASH_DESIGNS.filter((style) => currentMaterialSpec.allowedDesigns.includes(style.id)).map(
                    (style) => {
                      const active = selectedStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-2 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer overflow-hidden ${
                            active
                              ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-2 ring-[#FFB400]/40'
                              : 'bg-[#F9F9FB] border-gray-200 text-gray-800 hover:border-gray-300'
                          }`}
                        >
                          <div>
                            {/* 4 Dáng Mi trên cùng 1 khuôn mắt mẫu thực tế */}
                            <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-neutral-950 mb-2 border border-black/10 shadow-2xs group">
                              <img
                                src={style.image}
                                alt={style.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <span
                                className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                                  active ? 'bg-[#FFB400] text-black' : 'bg-black/75 text-white'
                                }`}
                              >
                                {style.shortName}
                              </span>
                              {active && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FFB400] text-black flex items-center justify-center shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                                </span>
                              )}
                            </div>

                            <div className="text-[12px] font-black leading-tight">{style.name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              {style.desc}
                            </div>
                          </div>

                          <div className="mt-2 pt-1 border-t border-gray-100 text-[9.5px] font-semibold text-amber-700 flex items-center gap-1">
                            <ArrowDownRight className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{style.eyeEffect}</span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>

                {ALL_LASH_DESIGNS.some((d) => !currentMaterialSpec.allowedDesigns.includes(d.id)) && (
                  <div className="text-[10px] text-gray-500 bg-[#F9F9FB] rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <Lock className="w-3 h-3 inline mr-1 text-rose-500 -mt-0.5" />
                    Không áp dụng cho {currentMaterialSpec.shortLabel}:{' '}
                    <strong className="text-gray-700">
                      {ALL_LASH_DESIGNS.filter((d) => !currentMaterialSpec.allowedDesigns.includes(d.id))
                        .map((d) => d.shortName)
                        .join(', ')}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* BƯỚC 3: ĐỘ CONG · ĐỘ DÀY · CHIỀU DÀI CỦA CHẤT LIỆU                    */}
            {/* --------------------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
                    3
                  </span>
                  <span>BƯỚC 3: ĐỘ CONG · ĐỘ DÀY · CHIỀU DÀI CỦA CHẤT LIỆU</span>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">{currentMaterialSpec.shortLabel}</span>
              </div>

              {/* Thẻ ghim thông số mi thật để đối chiếu an toàn */}
              <div className="bg-gradient-to-r from-blue-50/80 to-amber-50/80 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-gray-600 font-medium">Đối chiếu mi thật:</span>
                  <strong className="text-black font-extrabold truncate">
                    {naturalLengthSpec.label} · Sợi {naturalThicknessSpec.label}
                  </strong>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="bg-emerald-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full">
                    Nối tối đa: ≤ {naturalLengthSpec.safeMaxExtensionMm}mm
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('PROFILE')}
                    className="text-[#D97706] font-bold text-[10px] hover:underline pl-1 cursor-pointer"
                  >
                    Đổi
                  </button>
                </div>
              </div>

              {/* 3.1 ĐỘ CONG CỦA CHẤT LIỆU (CURL) */}
              <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-black uppercase">
                      3.1 Độ Cong Của {currentMaterialSpec.shortLabel} (Chỉ có:{' '}
                      {currentMaterialSpec.allowedCurls.join(', ')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomCurlId(selectedCurl);
                      setIsCurlZoomOpen(true);
                    }}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 active:opacity-70 cursor-pointer shrink-0"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Trượt xem</span>
                  </button>
                </div>

                {(() => {
                  const allowedCurlItems = LASH_CURL_LIST.filter((c) =>
                    currentMaterialSpec.allowedCurls.includes(c.id)
                  );
                  const colClass =
                    allowedCurlItems.length === 1
                      ? 'grid-cols-1 max-w-[200px]'
                      : allowedCurlItems.length === 2
                        ? 'grid-cols-2'
                        : allowedCurlItems.length === 4
                          ? 'grid-cols-2 sm:grid-cols-4'
                          : 'grid-cols-3';

                  return (
                    <div className={`grid gap-2 ${colClass}`}>
                      {allowedCurlItems.map((c) => {
                        const active = selectedCurl === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCurl(c.id)}
                            className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-between border relative select-none cursor-pointer ${
                              active
                                ? 'bg-amber-50/90 border-[#FFB400] text-black font-extrabold shadow-sm ring-1 ring-[#FFB400]'
                                : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                            }`}
                          >
                            {/* Top Right Magnifier Button */}
                            <button
                              type="button"
                              aria-label={`Xem phóng to góc độ cong ${c.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomCurlId(c.id);
                                setIsCurlZoomOpen(true);
                              }}
                              className={`absolute top-1 right-1 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                active
                                  ? 'bg-black text-[#FFB400] hover:bg-neutral-800'
                                  : 'bg-white/90 text-gray-500 hover:text-black shadow-xs'
                              }`}
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>

                            {/* Vector SVG Lash Fiber & Natural Lash Baseline */}
                            <div className="w-full">
                              <LashCurlIllustration curl={c} variant="card" isActive={active} />
                            </div>

                            {/* Label & Status */}
                            <div className="w-full mt-1">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[13px] font-black">{c.code}</span>
                                <span
                                  className={`text-[10px] font-bold px-1 rounded ${
                                    active ? 'bg-[#FFB400] text-black' : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {c.angleLabel}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500 block mt-0.5 leading-tight truncate">
                                {c.shortDesc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="text-[10px] text-gray-500 bg-[#F9F9FB] rounded-lg px-2.5 py-1.5 border border-gray-100">
                  <strong className="text-gray-700">Quy chuẩn độ cong:</strong> {currentMaterialSpec.lockedCurlReason}
                </div>
              </div>

              {/* 3.2 ĐỘ DÀY CỦA CHẤT LIỆU (THICKNESS) */}
              <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    3.2 Độ Dày Sợi Cho Phép ({currentMaterialSpec.allowedThicknesses.join(' · ')})
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold">Theo an toàn gốc mi</span>
                </div>

                {(() => {
                  const allowedThickItems = ALL_LASH_THICKNESSES.filter((t) =>
                    currentMaterialSpec.allowedThicknesses.includes(t.id)
                  );
                  const colClass =
                    allowedThickItems.length === 1
                      ? 'grid-cols-1'
                      : allowedThickItems.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3';

                  return (
                    <div className={`grid gap-2 ${colClass}`}>
                      {allowedThickItems.map((thick) => {
                        const active = selectedThickness === thick.id;
                        return (
                          <button
                            key={thick.id}
                            type="button"
                            onClick={() => setSelectedThickness(thick.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all relative cursor-pointer ${
                              active
                                ? 'bg-[#FFB400] border-[#FFB400] text-black font-extrabold shadow-xs'
                                : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-[12.5px] font-black">{thick.label}</div>
                            <div className="text-[9.5px] opacity-80 leading-none mt-0.5">{thick.note}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Cảnh báo độ dày không an toàn so với mi thật */}
                {thicknessWarning && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{thicknessWarning}</span>
                  </div>
                )}
              </div>

              {/* 3.3 CHIỀU DÀI & PHÂN BỔ THEO CHẤT LIỆU (LENGTH & MAPPING) */}
              <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    3.3 Chiều Dài & Phân Bổ ({currentMaterialSpec.allowedSingleLengths[0]} –{' '}
                    {currentMaterialSpec.allowedSingleLengths[currentMaterialSpec.allowedSingleLengths.length - 1]})
                  </span>
                  <span className="text-[10px] text-gray-500">Đầu · Thân · Đuôi ({selectedStyle})</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {currentMaterialSpec.allowedLengthMappings.map((len) => {
                    const active = selectedLength === len.id;
                    return (
                      <button
                        key={len.id}
                        type="button"
                        onClick={() => setSelectedLength(len.id)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-50/90 border-[#FFB400] text-black font-bold shadow-xs'
                            : 'bg-[#F9F9FB] border-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-[12px] font-bold flex items-center justify-between">
                          <span>{len.label}</span>
                          {active && <CheckCircle2 className="w-3 h-3 text-[#FF9500]" />}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{len.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Dải số đơn từng mm được phép của Chất liệu đang chọn */}
                <div className="pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] font-semibold text-gray-500 mb-1.5">
                    Hoặc chọn chiều dài sợi chính cho phép ({currentMaterialSpec.shortLabel}):
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {currentMaterialSpec.allowedSingleLengths.map((mm) => (
                      <button
                        key={mm}
                        type="button"
                        onClick={() => setSelectedLength(mm)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                          selectedLength === mm ? 'bg-black text-[#FFB400]' : 'bg-[#F2F2F7] text-gray-700'
                        }`}
                      >
                        {mm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cảnh báo chiều dài vượt ngưỡng an toàn so với mi thật */}
                {lengthWarning && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{lengthWarning}</span>
                  </div>
                )}
              </div>

              {/* 3.4 KỸ THUẬT FAN / SỐ SỢI & MÀU SẮC CỦA CHẤT LIỆU */}
              <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    3.4 Kỹ Thuật Volume · Mật Độ & Màu Sắc
                  </span>
                  <span className="text-[10px] text-gray-500">{currentMaterialSpec.shortLabel}</span>
                </div>

                {/* Kỹ thuật Volume được phép */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 mb-1">Kỹ thuật fan cho phép:</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {currentMaterialSpec.allowedVolumes.map((vol) => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() => setSelectedVolume(vol)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                          selectedVolume === vol ? 'bg-black text-[#FFB400]' : 'bg-[#F2F2F7] text-gray-700'
                        }`}
                      >
                        {vol}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mật độ hoàn thành */}
                <div className="pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] font-semibold text-gray-500 mb-1">Mật độ sợi / fan hoàn thành:</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {currentMaterialSpec.allowedCounts.map((cnt) => {
                      const active = selectedCount === cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setSelectedCount(cnt)}
                          className={`p-1.5 rounded-lg border text-center text-[10px] font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FFB400] border-[#FFB400] text-black shadow-xs'
                              : 'bg-[#F9F9FB] border-gray-100 text-gray-700'
                          }`}
                        >
                          {cnt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Màu sắc sợi mi */}
                <div className="pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] font-semibold text-gray-500 mb-1">Màu sắc sợi mi:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {currentMaterialSpec.allowedColors.map((c) => {
                      const active = selectedColor === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedColor(c.id)}
                          className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-50/90 border-[#FFB400] text-black font-bold shadow-xs'
                              : 'bg-[#F9F9FB] border-gray-100 text-gray-800'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: c.colorCode }}
                          />
                          <span className="text-[11px] truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 0: HỒ SƠ ĐO KHÁM MI THẬT (NATURAL LASH ASSESSMENT - ĐIỀU RĂN KHOA HỌC) */}
        {/* ========================================================================= */}
        {activeSubTab === 'PROFILE' && (
          <div className="space-y-3.5">
            {/* 1. Header Khám Mi Thật */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-black text-[#FFB400] flex items-center justify-center font-black text-[12px]">
                  0
                </span>
                <div>
                  <h3 className="text-[13px] font-extrabold text-black">KHÁM & ĐO THÔNG SỐ MI THẬT</h3>
                  <p className="text-[10.5px] text-gray-500 font-medium">
                    {isNewClient
                      ? 'Khách Hàng Mới · Bắt buộc đo cữ mm trước khi chọn mi nối'
                      : 'Hồ sơ sức khỏe nang mi của khách hàng'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Chuẩn Khoa Học Wings
              </span>
            </div>

            {/* 2. MỤC 0.1: CHIỀU DÀI MI THẬT (NATURAL LASH LENGTH) */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-black inline-flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    CHIỀU DÀI MI THẬT (ĐO CỮ THƯỚC MM THỰC TẾ)
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold">Tỷ lệ an toàn: +2mm</span>
              </div>

              {/* Dãy nút đo mm */}
              <div className="grid grid-cols-7 gap-1">
                {NATURAL_LASH_LENGTH_OPTIONS.map((len) => {
                  const active = naturalLength === len.id;
                  return (
                    <button
                      key={len.id}
                      type="button"
                      onClick={() => setNaturalLength(len.id)}
                      className={`py-2 px-0.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        active
                          ? 'bg-[#FFB400] border-[#FFB400] text-black font-black shadow-xs ring-1 ring-[#FFB400]'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-700 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-[12px] font-black tracking-tight">{len.label}</span>
                      <span className="text-[8.5px] opacity-75 mt-0.5 font-bold uppercase truncate max-w-full">
                        {len.tier === 'SHORT' ? 'Ngắn' : len.tier === 'STANDARD' ? 'Chuẩn' : 'Dài'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Thước đối chiếu thông số an toàn */}
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-300">
                    Mi thật đo được: <strong className="text-white font-bold">{naturalLengthSpec.label}</strong> (
                    {naturalLengthSpec.tierLabel})
                  </span>
                  <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                    Nối tối đa: ≤ {naturalLengthSpec.safeMaxExtensionMm} mm
                  </span>
                </div>
                <div className="text-[10.5px] text-amber-200 font-medium leading-relaxed">
                  💡 {naturalLengthSpec.advice} (Dải mi nối khuyên dùng:{' '}
                  <strong className="text-white font-bold">{naturalLengthSpec.recommendedLengths}</strong>)
                </div>
              </div>
            </div>

            {/* 3. MỤC 0.2: ĐỘ DÀY SỢI MI THẬT (NATURAL LASH THICKNESS / CALIBER) */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-black inline-flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    ĐỘ DÀY SỢI MI THẬT (ĐƯỜNG KÍNH THÂN KERATIN)
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold">Tải trọng nang mi</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {NATURAL_LASH_THICKNESS_OPTIONS.map((thick) => {
                  const active = naturalThickness === thick.id;
                  return (
                    <button
                      key={thick.id}
                      type="button"
                      onClick={() => setNaturalThickness(thick.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        active
                          ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-1 ring-[#FFB400]'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-black">{thick.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${thick.colorTag}`}>
                            {thick.name}
                          </span>
                        </div>
                        {active && <CheckCircle2 className="w-4 h-4 text-[#FF9500]" />}
                      </div>
                      <div className="text-[10.5px] text-gray-600 mt-1 leading-snug">{thick.safetyRule}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. MỤC 0.3: MẬT ĐỘ MI THẬT (NATURAL LASH DENSITY) */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-black inline-flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    MẬT ĐỘ MI THẬT (SỐ LƯỢNG SỢI TRÊN BỜ MÍ)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {NATURAL_LASH_DENSITY_OPTIONS.map((den) => {
                  const active = naturalDensity === den.id;
                  return (
                    <button
                      key={den.id}
                      type="button"
                      onClick={() => setNaturalDensity(den.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? 'bg-[#FFB400] border-[#FFB400] text-black font-extrabold shadow-xs'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                      }`}
                    >
                      <div className="text-[12px] font-bold">{den.label}</div>
                      <div className="text-[9.5px] opacity-80 mt-0.5 leading-tight line-clamp-2">{den.advice}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. MỤC 0.4: HƯỚNG MỌC & DÁNG MẮT (TRAIL & EYE SHAPE) */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-3">
              <div>
                <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>HƯỚNG MỌC MI THẬT (LASH DIRECTION)</span>
                  <span className="text-[10px] text-amber-700 font-semibold">Quyết định độ cong</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {NATURAL_LASH_DIRECTIONS.map((dir) => {
                    const active = selectedLashTrail === dir.id;
                    return (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => setSelectedLashTrail(dir.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-50/90 border-[#FFB400] text-black font-bold shadow-xs'
                            : 'bg-[#F9F9FB] border-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-[12px] font-bold flex items-center justify-between">
                          <span>{dir.name}</span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500]" />}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 leading-snug">{dir.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>DÁNG MẮT KHÁCH HÀNG (EYE SHAPE)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEyeCompareOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Images className="w-3 h-3 text-[#FF9500]" />
                    <span>So sánh 5 dáng mắt</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {NATURAL_EYE_SHAPES.map((eye, idx) => {
                    const active = selectedEyeShape === eye.id;
                    const isLastOdd = idx === NATURAL_EYE_SHAPES.length - 1 && NATURAL_EYE_SHAPES.length % 2 !== 0;
                    return (
                      <button
                        key={eye.id}
                        type="button"
                        onClick={() => setSelectedEyeShape(eye.id)}
                        className={`group p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isLastOdd ? 'col-span-2 sm:col-span-1' : ''
                        } ${
                          active
                            ? 'bg-amber-50/90 border-[#FFB400] text-black font-bold shadow-xs ring-1 ring-[#FFB400]'
                            : 'bg-[#F9F9FB] hover:bg-white border-gray-100 text-gray-800'
                        }`}
                      >
                        <div>
                          {/* 4:3 Image of the eye on the exact same Asian face */}
                          <div className="relative aspect-4/3 w-full rounded-lg overflow-hidden bg-neutral-900 mb-1.5 border border-black/5 shadow-2xs">
                            <img
                              src={eye.image}
                              alt={eye.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white">
                              {eye.recommendedCurl} Curl · {eye.recommendedDesign}
                            </div>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsEyeCompareOpen(true);
                              }}
                              title="Phóng to so sánh"
                              className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </span>
                          </div>

                          <div className="text-[12px] font-bold flex items-center justify-between text-gray-900 leading-tight">
                            <span className="truncate">{eye.name}</span>
                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500] shrink-0 ml-1" />}
                          </div>

                          <div className="text-[9.5px] text-amber-900 bg-amber-100/60 rounded px-1.5 py-0.5 mt-1 font-medium leading-snug">
                            <span className="font-bold">Đặc điểm: </span>
                            {eye.keyFeature}
                          </div>
                        </div>

                        <div className="text-[9px] text-gray-500 mt-1 leading-tight pt-1 border-t border-gray-100/80">
                          <span className="font-semibold text-gray-700">💡 Gợi ý: </span>
                          {eye.lashAdvice}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 6. MỤC 0.5: SỨC KHỎE NANG MI & ĐỘ NHẠY CẢM */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-3">
              <div>
                <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                  TÌNH TRẠNG NANG MI & TIỀN SỬ
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {NATURAL_LASH_HEALTH_CONDITIONS.map((cond) => {
                    const active = selectedLashHealth === cond.id;
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => setSelectedLashHealth(cond.id)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#FFB400] border-[#FFB400] text-black font-bold shadow-xs'
                            : 'bg-[#F9F9FB] border-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-[11.5px] font-bold">{cond.name}</div>
                        <div className="text-[9.5px] opacity-80 mt-0.5 leading-tight">{cond.note}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                  VẤN ĐỀ NHẠY CẢM MẮT (MEDICAL & SENSITIVITY)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Bình thường (Good)', desc: 'Không kích ứng, mắt khỏe mạnh' },
                    { id: 'Mắt nhạy cảm (Sensitive)', desc: 'Dùng keo siêu êm dịu, quạt khô kỹ' },
                    { id: 'Mắt hở khi ngủ', desc: 'Dán pad mi che kín lòng trắng mắt' },
                    { id: 'Mới phẫu thuật / phun mí', desc: 'Thao tác nhẹ tay, tránh chạm bờ mí' },
                  ].map((med) => {
                    const active = selectedMedicalProblem === med.id;
                    return (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => setSelectedMedicalProblem(med.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-50/90 border-[#FFB400] text-black font-bold shadow-xs'
                            : 'bg-[#F9F9FB] border-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-[12px] font-bold flex items-center justify-between">
                          <span>{med.id.split(' ')[0]}</span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500]" />}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{med.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 7. MỤC 0.6: KHUYẾN NGHỊ KHOA HỌC AN TOÀN TỰ ĐỘNG TỪ CHUYÊN GIA WINGS */}
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/15 border-2 border-[#FFB400] rounded-2xl p-3.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF9500]" />
                  <span className="text-[12px] font-black text-amber-950 uppercase tracking-wide">
                    KHUYẾN NGHỊ KHOA HỌC TỪ WINGS
                  </span>
                </div>
                <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  Chuẩn Tỷ Lệ Vàng
                </span>
              </div>

              {/* Thông số đề xuất */}
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="bg-white/90 rounded-xl p-2 border border-amber-200">
                  <div className="text-gray-500 text-[10px]">Dòng mi khuyên dùng</div>
                  <div className="font-extrabold text-black mt-0.5 truncate">{recommendation.recommendedMaterial}</div>
                </div>
                <div className="bg-white/90 rounded-xl p-2 border border-amber-200">
                  <div className="text-gray-500 text-[10px]">Dáng & Độ cong</div>
                  <div className="font-extrabold text-black mt-0.5">
                    {recommendation.recommendedDesign} · Cong {recommendation.recommendedCurl}
                  </div>
                </div>
                <div className="bg-white/90 rounded-xl p-2 border border-amber-200">
                  <div className="text-gray-500 text-[10px]">Độ dày an toàn</div>
                  <div className="font-extrabold text-emerald-700 mt-0.5">{recommendation.recommendedThickness}</div>
                </div>
                <div className="bg-white/90 rounded-xl p-2 border border-amber-200">
                  <div className="text-gray-500 text-[10px]">Chiều dài an toàn</div>
                  <div className="font-extrabold text-emerald-700 mt-0.5">
                    {recommendation.safeRangeLabel} (Max {recommendation.maxSafeMm}mm)
                  </div>
                </div>
              </div>

              {/* Kịch bản tư vấn mẫu */}
              <div className="bg-white/95 rounded-xl p-2.5 border border-amber-200 text-[11px] text-gray-800 leading-relaxed font-medium">
                <span className="text-[#D97706] font-bold">💬 Lời khuyên tư vấn cho khách: </span>
                <span className="italic">{recommendation.consultationScript}</span>
              </div>

              {/* Nút 1-chạm áp dụng */}
              <button
                type="button"
                onClick={handleApplyRecommendation}
                className="w-full py-3 px-4 rounded-xl bg-[#FFB400] hover:bg-amber-400 text-black font-extrabold text-[13px] shadow-sm flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
              >
                <span>Áp Dụng Thông Số Này & Sang Bước Nối Mi</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TƯ VẤN GÓI COMBO MỚI (ĐIỀU RĂN CV-002)                              */}
        {/* ========================================================================= */}
        {activeSubTab === 'COMBO' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF9500]" />
                  TƯ VẤN GÓI COMBO (THƯỞNG BẬC THANG CV🪶)
                </span>
                <span className="text-[10px] font-bold text-emerald-700">Ai Checkout người đó nhận</span>
              </div>

              <div className="bg-white rounded-2xl p-2.5 shadow-xs border-2 border-[#FFB400] space-y-2">
                {COMBO_PACKAGES_CVL.map((pkg) => {
                  const active = selectedComboId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedComboId(pkg.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        active
                          ? 'bg-amber-50/90 border-[#FF9500] shadow-xs'
                          : 'bg-[#F9F9FB] border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-black truncate">{pkg.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-600 font-medium mt-0.5 tabular-nums">
                          Giá gói: <strong className="text-black">{pkg.price.toLocaleString('vi-VN')} đ</strong> (
                          {pkg.sessions} lần)
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums">
                          +{pkg.cvBonus.toLocaleString('vi-VN')}đ
                        </span>
                        {active && (
                          <span className="text-[10px] font-bold text-[#FF9500] mt-1 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Đã chọn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSelectedComboId('NONE')}
                  className={`w-full py-2 px-3 rounded-xl text-[12px] font-semibold text-center transition-all ${
                    selectedComboId === 'NONE' ? 'bg-gray-800 text-white font-bold' : 'bg-[#F2F2F7] text-gray-600'
                  }`}
                >
                  {selectedComboId === 'NONE' ? '✓ ' : ''}Khách chỉ làm dịch vụ lẻ hôm nay (Không mua thêm gói Combo)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ghi Chú Kỹ Thuật & Cam Kết Với Khách */}
        <div>
          <div className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>GHI CHÚ KỸ THUẬT & CAM KẾT VỚI KHÁCH</span>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-transparent text-[13px] text-gray-800 leading-relaxed focus:outline-none resize-none font-medium"
              placeholder="Nhập ghi chú kỹ thuật, loại keo, form mắt..."
            />
          </div>
        </div>

        {/* Live Matrix Summary Chips (Theo đúng thứ tự 1. Chất liệu -> 2. Thiết kế -> 3. Độ cong, Dày, Dài) */}
        <div className="bg-neutral-900 rounded-2xl p-2.5 text-white shadow-sm space-y-1.5">
          <div className="text-[10px] font-bold text-[#FFB400] uppercase tracking-wider flex items-center justify-between">
            <span>TÓM TẮT QUY TRÌNH 3 BƯỚC (LIVE MATRIX):</span>
            <span className="text-gray-400 font-normal">CV🪶 {actorName}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              0. Mi thật: <strong>{naturalLengthSpec.label}</strong> · <strong>{naturalThicknessSpec.label}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              1. Chất liệu: <strong>{currentMaterialSpec.shortLabel}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
              2. Thiết kế: <strong className="text-amber-400">{selectedStyle}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
              3. Cong: <strong className="text-amber-400">{selectedCurl}</strong> · Dày:{' '}
              <strong className="text-amber-400">{selectedThickness}</strong> · Dài:{' '}
              <strong className="text-amber-400">{selectedLength}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
              Volume: <strong className="text-emerald-400">{selectedVolume}</strong>
            </span>
            {chosenComboOption && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Combo: <strong>+{chosenComboOption.cvBonus.toLocaleString('vi-VN')}đ</strong>
              </span>
            )}
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] shadow-md active:scale-98 transition-transform text-center cursor-pointer"
          >
            {chosenComboOption
              ? `CHỐT ${chosenComboOption.name.toUpperCase()} (+${chosenComboOption.cvBonus.toLocaleString('vi-VN')}Đ) & BẮT ĐẦU LÀM MI`
              : 'LƯU TƯ VẤN & BẮT ĐẦU LÀM MI'}
          </button>
        </div>
      </div>

      {/* Interactive Zoom Lightbox / Swipeable Carousel Modal with Material Curl Constraints */}
      <LashCurlZoomModal
        isOpen={isCurlZoomOpen}
        initialCurlId={zoomCurlId || selectedCurl}
        allowedCurls={currentMaterialSpec.allowedCurls}
        materialName={currentMaterialSpec.shortLabel}
        lockedCurlReason={currentMaterialSpec.lockedCurlReason}
        onClose={() => setIsCurlZoomOpen(false)}
        onSelectCurl={(curlId) => {
          if (currentMaterialSpec.allowedCurls.includes(curlId)) {
            setSelectedCurl(curlId);
          }
        }}
      />

      {/* Trình Cấu Hình Trực Quan: Chất Liệu -> Thiết Kế -> Dày · Dài · Cong (Chỉ Super Admin) */}
      {isSuperAdmin && (
        <LashMaterialConfiguratorModal
          open={isConfiguratorOpen}
          catalog={materialCatalog}
          initialMaterialId={selectedMaterial}
          onClose={() => setIsConfiguratorOpen(false)}
          onCatalogChange={(nextCatalog) => {
            setMaterialCatalog(nextCatalog);
          }}
        />
      )}

      {/* Modal So Sánh 4 Dáng Mi Trên Cùng 1 Dáng Mắt Mẫu Thực Tế */}
      <LashDesignCompareModal
        open={isCompareDesignsOpen}
        selectedDesignId={selectedStyle}
        allowedDesignIds={currentMaterialSpec.allowedDesigns}
        materialName={currentMaterialSpec.shortLabel}
        onClose={() => setIsCompareDesignsOpen(false)}
        onSelectDesign={(designId) => {
          setSelectedStyle(designId);
        }}
      />

      {/* Modal So Sánh 5 Dáng Mắt Trên Cùng 1 Khuôn Mặt Mẫu Thực Tế */}
      <EyeShapeCompareModal
        open={isEyeCompareOpen}
        selectedEyeShapeId={selectedEyeShape}
        onClose={() => setIsEyeCompareOpen(false)}
        onSelectEyeShape={(eyeId) => {
          setSelectedEyeShape(eyeId);
        }}
      />
    </div>
  );
}
