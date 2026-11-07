'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { ComboSessionBadge } from '../ui-kit/ComboSessionBadge';
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
  RotateCw,
  Feather,
  Zap,
  Leaf,
  Layers,
  Crown,
} from 'lucide-react';
import { isSuperAdminRole, isCanonicalSuperAdminIdentity } from '@mos-lab/shared';
import { LASH_CURL_LIST } from './LashCurlData';
import { LashCurlIllustration } from './LashCurlIllustration';
import { LashCurlZoomModal } from './LashCurlZoomModal';
import { LashMaterialConfiguratorModal } from './LashMaterialConfiguratorModal';
import { LashDesignCompareModal } from './LashDesignCompareModal';
import { EyeShapeCompareModal } from './EyeShapeCompareModal';
import { LashConsultationInfoModal, type InfoModalType } from './LashConsultationInfoModal';
import {
  ALL_LASH_DESIGNS,
  ALL_LASH_THICKNESSES,
  DEFAULT_LASH_MATERIAL_CATALOG,
  MATERIAL_MATRIX_UPDATED_EVENT,
  loadMaterialCatalog,
  resolveMaterialSpec,
  calculateLashPricingAndCvPoints,
  getWingsMenuDetail,
  isAlwaysFullSetMaterial,
  parseDaysSinceLastVisit,
  resolveServiceSpecsFromComboOrHistory,
  formatComboName,
  COMBO_RETAIN_CYCLE_DAYS_LIMIT,
  SINGLE_RETAIN_CYCLE_DAYS_LIMIT,
  getRetainCycleDaysLimit,
  IVYLIGHT_SYSTEM_DB_RETENTION_DAYS,
  IVYLIGHT_SYSTEM_COMBO_REMIND_DAYS,
  UNDER_MINK_PREP_SPEC,
  detectUnderMinkFromLastVisit,
  parseUnderMinkCountFibers,
  parseUnderMinkLengthMm,
  stepUnderMinkCount,
  stepUnderMinkLength,
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
  resolveNaturalLashCountLabel,
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
      hasUnderMink?: boolean;
      underMinkServiceType?: 'Normal' | 'Retain';
      underMinkCurl?: string;
      underMinkThickness?: string;
      underMinkLength?: string;
      underMinkCount?: string;
      isOverridden?: boolean;
      overrideReason?: string;
      eyeShape?: string;
      naturalLashLength?: string;
      naturalLashThickness?: string;
      naturalLashDensity?: string;
      naturalLashCount?: string;
      isNewClientDiagnosticDone?: boolean;
      lashHealth?: string;
      lashTrail?: string;
      medicalProblem?: string;
      notes?: string;
    },
    selectedCombo?: { id: string; name: string; price: number; bonus: number; sessions: number } | null,
    skuPricing?: {
      skuName?: string;
      skuPrice?: number;
      upgradePrice?: number;
      cvPoints?: number;
      cvBreakdown?: string;
      serviceType?: string;
    } | null
  ) => void;
}

export function Screen03ConsultationMatrix({ booking, actor, onBack, onSave }: Screen03ConsultationMatrixProps) {
  const [materialCatalog, setMaterialCatalog] = useState<LashMaterialSpec[]>(() => loadMaterialCatalog());
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState<boolean>(false);
  const [infoModalKey, setInfoModalKey] = useState<InfoModalType>(null);

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

  // ---------------------------------------------------------------------------
  // TỰ ĐỘNG NHẬN DIỆN GÓI COMBO (25 NGÀY) vs KHÁCH LẺ SINGLE (21 NGÀY VÔ ĐIỀU KIỆN)
  // ---------------------------------------------------------------------------
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  const comboName = booking?.comboLiveStatus?.comboName || '';
  const comboRemainingSessions = booking?.comboLiveStatus?.remainingSessions ?? 0;
  const lastVisitDate = booking?.lashHistory?.[0]?.date || null;
  const daysSinceLastVisit = useMemo(() => parseDaysSinceLastVisit(lastVisitDate || undefined), [lastVisitDate]);
  // Khách mua Gói Combo: trong 25 ngày luôn luôn được tính Dặm.
  // Khách lẻ Single: trong 21 ngày sẽ có Giá Dặm vô điều kiện.
  const retainDaysLimit = isComboLive ? COMBO_RETAIN_CYCLE_DAYS_LIMIT : SINGLE_RETAIN_CYCLE_DAYS_LIMIT;
  const isWithin25Days = daysSinceLastVisit !== null && daysSinceLastVisit <= retainDaysLimit;

  // Thông số dịch vụ tự động lấy từ Gói Combo khách đã mua (hoặc dịch vụ lần gần nhất)
  const autoComboSpec = useMemo(() => {
    const sourceText = isComboLive
      ? booking?.comboLiveStatus?.serviceKey || booking?.comboLiveStatus?.comboName || booking?.serviceName
      : booking?.attributes?.material || booking?.lashHistory?.[0]?.serviceName || booking?.serviceName;
    return (
      resolveServiceSpecsFromComboOrHistory(sourceText || 'New Flawless Mink 880', materialCatalog) || {
        materialId: 'New Flawless Mink',
        materialCode: 'FLAWLESS_MINK',
        materialShortLabel: 'Flawless Mink',
        volume: '1D',
        count: '70 sợi',
      }
    );
  }, [
    isComboLive,
    booking?.comboLiveStatus?.serviceKey,
    booking?.comboLiveStatus?.comboName,
    booking?.serviceName,
    booking?.attributes?.material,
    booking?.lashHistory,
    materialCatalog,
  ]);

  // Chế độ giá tự động theo chu kỳ 25 ngày:
  // - Trong 25 ngày (<= 25 ngày): Tự động chọn 'Retain' (Dặm mi, hoặc với Mink & IvyLight thì luôn Nối Mới nhưng tính Giá Dặm)
  // - Sau 25 ngày (> 25 ngày) hoặc khách mới chưa có lịch sử: Tự động chọn 'Normal' (Nối Mới & Giá Mới)
  const expectedAutoServiceType: 'Normal' | 'Retain' = isWithin25Days ? 'Retain' : 'Normal';

  const initialMat = useMemo(
    () => resolveMaterialSpec(autoComboSpec.materialId, materialCatalog),
    [autoComboSpec.materialId, materialCatalog]
  );

  // Số lần Nối Mới (normalRemaining) và số lần Dặm (retainRemaining) còn lại trong gói Combo
  const { comboNormalRemaining, comboRetainRemaining, hasComboNormalRemaining, hasComboRetainRemaining } =
    useMemo(() => {
      const alwaysFull = isAlwaysFullSetMaterial(initialMat.code || initialMat.id);
      let normalRem = booking?.comboLiveStatus?.normalRemaining ?? 0;
      let retainRem = booking?.comboLiveStatus?.retainRemaining ?? 0;
      if (isComboLive && normalRem === 0 && retainRem === 0 && comboRemainingSessions > 0) {
        if (alwaysFull) {
          normalRem = comboRemainingSessions;
          retainRem = 0;
        } else {
          normalRem = Math.max(1, Math.floor(comboRemainingSessions / 2));
          retainRem = Math.max(1, comboRemainingSessions - normalRem);
        }
      }
      return {
        comboNormalRemaining: normalRem,
        comboRetainRemaining: retainRem,
        hasComboNormalRemaining: normalRem > 0,
        hasComboRetainRemaining: alwaysFull ? normalRem > 0 : retainRem > 0,
      };
    }, [
      booking?.comboLiveStatus?.normalRemaining,
      booking?.comboLiveStatus?.retainRemaining,
      isComboLive,
      comboRemainingSessions,
      initialMat.code,
      initialMat.id,
    ]);

  // ---------------------------------------------------------------------------
  // BƯỚC 1: CHẤT LIỆU / DÒNG MI (MATERIAL FAMILY - NGUỒN RÀNG BUỘC GỐC)
  // ---------------------------------------------------------------------------
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMat.id);

  const currentMaterialSpec: LashMaterialSpec = useMemo(
    () =>
      materialCatalog.find((m) => m.id === selectedMaterial) || materialCatalog[0] || DEFAULT_LASH_MATERIAL_CATALOG[0],
    [selectedMaterial, materialCatalog]
  );

  const isAlwaysFullSet = useMemo(
    () => isAlwaysFullSetMaterial(currentMaterialSpec.code || selectedMaterial),
    [currentMaterialSpec.code, selectedMaterial]
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
  const [selectedVolume, setSelectedVolume] = useState<string>(autoComboSpec.volume || initialMat.defaultVolume);
  const [selectedCount, setSelectedCount] = useState<string>(autoComboSpec.count || initialMat.defaultCount);
  const [serviceType, setServiceType] = useState<'Normal' | 'Retain'>(expectedAutoServiceType);

  // Trạng thái CV🪶 Override & Cảnh báo xác nhận
  const [isOverridden, setIsOverridden] = useState<boolean>(Boolean(booking?.attributes?.isOverridden));
  const [overrideReason, setOverrideReason] = useState<string>(booking?.attributes?.overrideReason || '');
  const [pendingOverride, setPendingOverride] = useState<{
    type: 'CYCLE_OVERRIDE' | 'COMBO_MATERIAL_OVERRIDE';
    title: string;
    message: string;
    defaultReason: string;
    reasons: string[];
    onConfirm: (reason: string) => void;
  } | null>(null);
  const [selectedOverrideReasonDraft, setSelectedOverrideReasonDraft] = useState<string>('');

  // Tự động đồng bộ đúng dịch vụ Gói Combo & Chu kỳ 25 ngày mỗi khi mở hồ sơ khách
  useEffect(() => {
    setSelectedMaterial(initialMat.id);
    setSelectedVolume(
      initialMat.allowedVolumes.includes(autoComboSpec.volume) ? autoComboSpec.volume : initialMat.defaultVolume
    );
    setSelectedCount(
      initialMat.allowedCounts.includes(autoComboSpec.count) ? autoComboSpec.count : initialMat.defaultCount
    );
    setServiceType(expectedAutoServiceType);
    setIsOverridden(Boolean(booking?.attributes?.isOverridden));
    setOverrideReason(booking?.attributes?.overrideReason || '');
  }, [booking?.id, initialMat.id, autoComboSpec.volume, autoComboSpec.count, expectedAutoServiceType]);

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
      setSelectedVolume(currentMaterialSpec.defaultVolume || currentMaterialSpec.allowedVolumes[0] || '1D');
    }
  }, [currentMaterialSpec]);

  const applyMaterialSelectionDirect = (mat: LashMaterialSpec) => {
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

  // Khi chuyển Chất Liệu ở Bước 1 -> Kiểm tra nếu khác Gói Combo khách đã mua thì bật Cảnh báo Override
  const handleSelectMaterial = (mat: LashMaterialSpec) => {
    if (mat.id === selectedMaterial) return;

    if (isComboLive && mat.id !== initialMat.id) {
      const reasons = [
        `Khách yêu cầu đổi sang ${mat.shortLabel} (bù chênh lệch nâng cấp)`,
        'Khách mua lẻ buổi này, giữ nguyên số lượt gói Combo',
        'Quản lý duyệt hỗ trợ đổi dòng mi tương đương',
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        type: 'COMBO_MATERIAL_OVERRIDE',
        title: '⚠️ Cảnh Báo Đổi Khác Dịch Vụ Gói Combo',
        message: `Khách hàng đang có gói "${comboName}" (còn ${comboRemainingSessions} lượt) tương ứng dòng mi "${initialMat.shortLabel}". Bạn đang chuyển sang "${mat.shortLabel}" trái với gói khách đã mua.`,
        defaultReason: reasons[0],
        reasons,
        onConfirm: (reason: string) => {
          applyMaterialSelectionDirect(mat);
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    applyMaterialSelectionDirect(mat);
  };

  // Khi CV🪶 bấm chuyển giữa Nối Mới / Giá Dặm -> Kiểm tra nếu trái với chu kỳ Combo (25 ngày) hoặc Single (21 ngày) thì bật Cảnh báo Override
  const handleRequestServiceTypeChange = (targetType: 'Normal' | 'Retain') => {
    if (targetType === serviceType) return;

    // Nếu CV🪶 bấm quay về đúng chuẩn tự động (expectedAutoServiceType) và đang đúng dòng mi gói Combo -> xóa cảnh báo override
    if (targetType === expectedAutoServiceType) {
      setServiceType(targetType);
      if (!isComboLive || selectedMaterial === initialMat.id) {
        setIsOverridden(false);
        setOverrideReason('');
      }
      return;
    }

    // Trái với quy định chu kỳ (Combo 25 ngày / Single 21 ngày) -> Bật Cảnh Báo Override
    if (targetType === 'Retain' && !isWithin25Days) {
      const daysText =
        daysSinceLastVisit !== null
          ? `lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước — quá hạn ${retainDaysLimit} ngày)`
          : `chưa có lịch sử trong ${retainDaysLimit} ngày`;
      const reasons = [
        `Quản lý duyệt hỗ trợ trễ chu kỳ (≤ 30 ngày) do khách bận/công tác`,
        `Khách VIP xin gia hạn tính dặm 1 lần duy nhất`,
        `Bảo hành / Hỗ trợ đặc biệt theo duyệt Cửa hàng trưởng`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        type: 'CYCLE_OVERRIDE',
        title: `⚠️ Cảnh Báo Override: Đã Quá ${retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Single'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé ${daysText}. Theo quy định khách mua Combo đi trong 25 ngày luôn được tính Dặm, sau 25 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính DẶM.`
          : `Khách lẻ (Single) ghé ${daysText}. Theo quy định khách Single đi trong 21 ngày có Giá Dặm vô điều kiện, sau 21 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính GIÁ DẶM.`,
        defaultReason: reasons[0],
        reasons,
        onConfirm: (reason: string) => {
          setServiceType('Retain');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    // Khách có Gói Combo muốn Dặm nhưng trong gói đã hết lần Dặm (chỉ còn lần Nối Mới)
    if (targetType === 'Retain' && isComboLive && !isAlwaysFullSet && !hasComboRetainRemaining) {
      const reasons = [
        `Gói đã hết lần Dặm — khách thanh toán lẻ buổi Dặm này`,
        `Quản lý duyệt quy đổi lượt trong gói cho khách VIP`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        type: 'CYCLE_OVERRIDE',
        title: '⚠️ Gói Combo Đã Hết Lần Dặm (Còn 0 lần Dặm)',
        message: `Khách hàng đang còn ${comboNormalRemaining} lần Nối Mới và 0 lần Dặm trong gói "${comboName}". Vui lòng xác nhận lý do nếu tính Dặm:`,
        defaultReason: reasons[0],
        reasons,
        onConfirm: (reason: string) => {
          setServiceType('Retain');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    // TRƯỜNG HỢP QUAN TRỌNG: Khách có Gói Combo muốn NỐI MỚI và trong gói CÒN LẦN NỐI MỚI (comboNormalRemaining > 0)
    // -> Cho phép chọn NỐI MỚI tự do (trừ 1 lần Nối Mới trong gói, không bật cảnh báo lỗi Override đỏ!)
    if (targetType === 'Normal' && isComboLive && !isAlwaysFullSet && hasComboNormalRemaining) {
      setServiceType('Normal');
      if (selectedMaterial === initialMat.id) {
        setIsOverridden(false);
        setOverrideReason('');
      }
      return;
    }

    // Khách có Gói Combo muốn Nối Mới nhưng trong gói ĐÃ HẾT LẦN NỐI MỚI (chỉ còn lần Dặm)
    if (targetType === 'Normal' && isComboLive && !isAlwaysFullSet && !hasComboNormalRemaining) {
      const reasons = [
        `Khách hết lần Nối Mới trong gói — đồng ý mua thêm gói mới hoặc thanh toán lẻ buổi Nối Mới`,
        `Quản lý duyệt hỗ trợ bù chênh lệch từ lần Dặm sang Nối Mới`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        type: 'CYCLE_OVERRIDE',
        title: '⚠️ Gói Combo Đã Hết Lần Nối Mới (Còn 0 lần Mới)',
        message: `Khách hàng chỉ còn ${comboRetainRemaining} lần Dặm (0 lần Nối Mới) trong gói "${comboName}". Vui lòng xác nhận phương án khi khách muốn Nối Mới:`,
        defaultReason: reasons[0],
        reasons,
        onConfirm: (reason: string) => {
          setServiceType('Normal');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    if (targetType === 'Normal' && isWithin25Days) {
      const reasons = [
        `Mi cũ rụng > 70% không đủ điều kiện dặm — khách đồng ý tính Nối Mới`,
        `Khách yêu cầu tháo làm bộ mới hoàn toàn và tính suất Nối Mới`,
        `Khách đổi sang form / dòng mi mới không áp dụng giá dặm`,
      ];
      setSelectedOverrideReasonDraft(reasons[0]);
      setPendingOverride({
        type: 'CYCLE_OVERRIDE',
        title: `⚠️ Cảnh Báo Override: Đi Trong ${retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Single'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước ≤ 25 ngày). Theo quy định khách mua Combo đi trong 25 ngày luôn luôn được tính DẶM, nhưng bạn đang chuyển sang tính NỐI MỚI.`
          : `Khách lẻ (Single) ghé lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước ≤ 21 ngày). Theo quy định khách Single đi trong 21 ngày luôn có GIÁ DẶM VÔ ĐIỀU KIỆN, nhưng bạn đang chuyển sang tính GIÁ NỐI MỚI.`,
        defaultReason: reasons[0],
        reasons,
        onConfirm: (reason: string) => {
          setServiceType('Normal');
          setIsOverridden(true);
          setOverrideReason(reason);
          setPendingOverride(null);
        },
      });
      return;
    }

    setServiceType(targetType);
  };

  // Khôi phục toàn bộ về chuẩn tự động theo Gói Combo & Chu kỳ 25 ngày
  const handleRestoreAutoRule = () => {
    setSelectedMaterial(initialMat.id);
    setSelectedVolume(
      initialMat.allowedVolumes.includes(autoComboSpec.volume) ? autoComboSpec.volume : initialMat.defaultVolume
    );
    setSelectedCount(
      initialMat.allowedCounts.includes(autoComboSpec.count) ? autoComboSpec.count : initialMat.defaultCount
    );
    setServiceType(expectedAutoServiceType);
    setIsOverridden(false);
    setOverrideReason('');
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
  const [naturalDensity, setNaturalDensity] = useState<string>(booking?.attributes?.naturalLashDensity || '60-80');
  const [naturalCount, setNaturalCount] = useState<string>(() => {
    return (
      booking?.attributes?.naturalLashCount ||
      resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity) ||
      '60-80'
    );
  });

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

  // Option làm kèm: Mi Dưới (Under Mink) đi cùng 6 chất liệu mi chính
  // Quy chuẩn dữ liệu DB Wings: Độ dày cố định 0.10mm · Độ cong B hoặc C · Chiều dài 6-7mm · Số sợi < 50 sợi (20 / 30 / 40 sợi)
  const hasUnderMinkCombo = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo && Number(booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
  const underComboNormalRemaining = Number(booking?.underMinkComboStatus?.normalRemaining ?? 0);
  const underComboRetainRemaining = Number(booking?.underMinkComboStatus?.retainRemaining ?? 0);

  const [hasUnderMink, setHasUnderMink] = useState<boolean>(() => {
    const s = (booking?.serviceName || '').toLowerCase();
    return (
      detectUnderMinkFromLastVisit(booking?.lashHistory, booking?.attributes?.hasUnderMink) ||
      hasUnderMinkCombo ||
      s.includes('under') ||
      s.includes('dưới')
    );
  });
  const [underMinkServiceType, setUnderMinkServiceType] = useState<'Normal' | 'Retain'>(() => {
    if (booking?.attributes?.underMinkServiceType) return booking.attributes.underMinkServiceType;
    if (hasUnderMinkCombo) {
      return isWithin25Days && underComboRetainRemaining > 0
        ? 'Retain'
        : underComboNormalRemaining > 0
          ? 'Normal'
          : 'Retain';
    }
    const hadUnderLastTime = detectUnderMinkFromLastVisit(booking?.lashHistory, booking?.attributes?.hasUnderMink);
    return hadUnderLastTime && isWithin25Days ? 'Retain' : 'Normal';
  });
  const [underMinkCurl, setUnderMinkCurl] = useState<'B' | 'C'>(
    (booking?.attributes?.underMinkCurl as 'B' | 'C') || UNDER_MINK_PREP_SPEC.defaultCurl
  );
  const [underMinkLength, setUnderMinkLength] = useState<string>(
    `${parseUnderMinkLengthMm(booking?.attributes?.underMinkLength)} mm`
  );
  const [underMinkCount, setUnderMinkCount] = useState<string>(
    `${parseUnderMinkCountFibers(booking?.attributes?.underMinkCount)} sợi`
  );

  // Đồng bộ trạng thái Mi Dưới khi đổi hồ sơ khách
  useEffect(() => {
    const s = (booking?.serviceName || '').toLowerCase();
    const hadUnder =
      detectUnderMinkFromLastVisit(booking?.lashHistory, booking?.attributes?.hasUnderMink) ||
      hasUnderMinkCombo ||
      s.includes('under') ||
      s.includes('dưới');
    setHasUnderMink(hadUnder);
    setUnderMinkServiceType(
      booking?.attributes?.underMinkServiceType ||
        (hasUnderMinkCombo
          ? isWithin25Days && underComboRetainRemaining > 0
            ? 'Retain'
            : underComboNormalRemaining > 0
              ? 'Normal'
              : 'Retain'
          : hadUnder && isWithin25Days
            ? 'Retain'
            : 'Normal')
    );
    setUnderMinkCurl((booking?.attributes?.underMinkCurl as 'B' | 'C') || UNDER_MINK_PREP_SPEC.defaultCurl);
    setUnderMinkLength(`${parseUnderMinkLengthMm(booking?.attributes?.underMinkLength)} mm`);
    setUnderMinkCount(`${parseUnderMinkCountFibers(booking?.attributes?.underMinkCount)} sợi`);
  }, [booking?.id, isWithin25Days, hasUnderMinkCombo, underComboNormalRemaining, underComboRetainRemaining]);

  const naturalLengthSpec = useMemo(() => {
    return NATURAL_LASH_LENGTH_OPTIONS.find((o) => o.id === naturalLength) || NATURAL_LASH_LENGTH_OPTIONS[2];
  }, [naturalLength]);

  const naturalThicknessSpec = useMemo(() => {
    return NATURAL_LASH_THICKNESS_OPTIONS.find((o) => o.id === naturalThickness) || NATURAL_LASH_THICKNESS_OPTIONS[0];
  }, [naturalThickness]);

  const naturalCountLabel = useMemo(() => {
    return resolveNaturalLashCountLabel(
      naturalCount || naturalDensity || booking?.attributes?.naturalLashCount || booking?.attributes?.naturalLashDensity
    );
  }, [naturalCount, naturalDensity, booking?.attributes?.naturalLashCount, booking?.attributes?.naturalLashDensity]);

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

  // Mapping Giá Niêm Yết SKU & Điểm Thưởng Vòng Xoay CV trực tiếp theo thông số mi
  const livePricingAndCvPoints = useMemo(() => {
    return calculateLashPricingAndCvPoints({
      materialId: selectedMaterial,
      countStr: selectedCount,
      volumeStr: selectedVolume,
      designId: selectedStyle,
      colorStr: selectedColor,
      originalBookedPrice: booking?.servicePrice || 550000,
      serviceType,
      hasUnderMink,
      underMinkServiceType,
      hasUnderMinkCombo,
    });
  }, [
    selectedMaterial,
    selectedCount,
    selectedVolume,
    selectedStyle,
    selectedColor,
    booking?.servicePrice,
    serviceType,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
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

  const [notes, setNotes] = useState(
    booking?.attributes?.notes ||
      'Khách mí lót nhẹ, mi thật góc trong yếu. Chuyên Viên dán pad êm, nối form cánh quạt nhẹ ôm đuôi mắt.'
  );

  const [activeSubTab, setActiveSubTab] = useState<'SPECS' | 'PROFILE'>(() => {
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

  const handleSubmit = () => {
    const finalNotes = isOverridden && overrideReason ? `[CV🪶 Override: ${overrideReason}] ${notes}`.trim() : notes;

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
        hasUnderMink,
        underMinkServiceType: hasUnderMink ? underMinkServiceType : undefined,
        underMinkCurl: hasUnderMink ? underMinkCurl : undefined,
        underMinkThickness: hasUnderMink ? UNDER_MINK_PREP_SPEC.fixedThickness : undefined,
        underMinkLength: hasUnderMink ? underMinkLength : undefined,
        underMinkCount: hasUnderMink ? underMinkCount : undefined,
        isOverridden,
        overrideReason: isOverridden ? overrideReason : undefined,
        eyeShape: selectedEyeShape,
        naturalLashLength: naturalLength,
        naturalLashThickness: naturalThickness,
        naturalLashDensity: naturalDensity,
        naturalLashCount: naturalCount,
        isNewClientDiagnosticDone: true,
        lashHealth: selectedLashHealth,
        lashTrail: selectedLashTrail,
        medicalProblem: selectedMedicalProblem,
        notes: finalNotes,
      },
      null,
      {
        skuName: livePricingAndCvPoints.skuName,
        skuPrice: livePricingAndCvPoints.skuPrice,
        upgradePrice: livePricingAndCvPoints.upgradePrice,
        cvPoints: livePricingAndCvPoints.totalPoints,
        cvBreakdown: livePricingAndCvPoints.breakdownLabel,
        serviceType,
      }
    );
  };

  const customerName = (booking?.customerName || 'Chị Trúc').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const customerPhone = booking?.customerPhone || '0933.779.207';
  const serviceName = booking?.serviceName || 'New Flawless Mink';
  const servicePrice = booking?.servicePrice ? booking.servicePrice.toLocaleString('vi-VN') : '770.000';
  const actorName = actor?.name || 'Thảo Ly';
  const actorTierBadge = actor?.tier === 'CVLL' ? <CvFeather2Badge /> : 'CV🪶';

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
              Dịch vụ:{' '}
              <strong className="text-black">
                {serviceName.toLowerCase().includes('any') ? 'Chưa chọn mẫu mi' : serviceName}
              </strong>{' '}
              ({servicePrice} đ) · In: <strong className="text-emerald-600">{actorName}</strong>
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
            <div className="flex items-center gap-1.5 min-w-0">
              <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-gray-500 font-medium shrink-0">Mi Thật:</span>
              <strong className="text-black font-extrabold truncate">
                {naturalCountLabel ? `${naturalCountLabel} · ` : ''}
                {naturalLengthSpec.label} · {naturalThicknessSpec.label.replace(/^Sợi\s*/i, '')}
              </strong>
              {!naturalCountLabel && (
                <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  Chưa đo sợi
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('PROFILE')}
              className="text-[#D97706] font-bold text-[10.5px] hover:underline cursor-pointer shrink-0 ml-1.5"
            >
              {naturalCountLabel ? 'Đo lại mi →' : '+ Bổ sung số sợi →'}
            </button>
          </div>
        )}

        {/* 2. Sub-tab Filter Segment Bar (Chỉ gồm 2 bước chuyên môn kỹ thuật) */}
        <div className="bg-white/80 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-gray-200/80 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('PROFILE')}
            className={`py-2 px-2 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1.5 leading-none relative cursor-pointer ${
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
            className={`py-2 px-2 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1.5 leading-none cursor-pointer ${
              activeSubTab === 'SPECS' ? 'bg-black text-[#FFB400] shadow-sm' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Dòng Mi → Dáng → Thông Số</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: QUY TRÌNH TƯ VẤN 3 BƯỚC RÀNG BUỘC THEO CHẤT LIỆU CHUẨN WINGS       */}
        {/* ========================================================================= */}
        {activeSubTab === 'SPECS' && (
          <div className="space-y-3.5">
            {/* QUY CÁCH DỊCH VỤ: THIẾT KẾ MINIMALISM (Ít chữ · Icon trực quan · Thao tác 1 chạm) */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2">
              {/* Header gọn: Tên gói / Single + Badge Ngày ghé cuối & Tổng lượt */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center shrink-0">
                    <Zap className="w-3 h-3 fill-current" />
                  </span>
                  <span className="text-[12px] font-extrabold text-neutral-900 truncate">
                    {isComboLive ? formatComboName(comboName) : 'Khách lẻ Single (Chu kỳ 21N)'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 tabular-nums">
                  {daysSinceLastVisit !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isWithin25Days ? 'bg-emerald-100/90 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {daysSinceLastVisit} ngày
                    </span>
                  )}
                  {isComboLive && (
                    <ComboSessionBadge
                      normalRemaining={comboNormalRemaining}
                      retainRemaining={comboRetainRemaining}
                      remainingSessions={comboRemainingSessions}
                      comboName={comboName}
                      size="xs"
                    />
                  )}
                </div>
              </div>

              {/* Khối Thông số Mi Trên + Nút +Mi dưới & 1 dòng thông số Mi Dưới tối giản */}
              <div className="bg-neutral-50/80 rounded-xl p-2.5 border border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-extrabold text-neutral-900 truncate">
                        {currentMaterialSpec.shortLabel} · {selectedVolume} · {selectedCount}
                      </span>
                      {lastVisitDate && (
                        <span className="text-[10px] text-neutral-400 font-medium tabular-nums shrink-0">
                          ({lastVisitDate.slice(0, 5)})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-neutral-600 truncate mt-0.5">
                      {selectedStyle} · Cong {selectedCurl} · {selectedThickness.replace(/\s+/g, '')} ·{' '}
                      {selectedLength.replace(/\s+/g, '')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHasUnderMink((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      hasUnderMink
                        ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-purple-300'
                    }`}
                  >
                    {hasUnderMink && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>+Mi dưới</span>
                  </button>
                </div>

                {/* 1 Dòng Ngang Duy Nhất Cho Mi Dưới: [B|C] · [6|7|6-7] · [20|30|40] + Chọn độc lập [Mới | Dặm] */}
                {hasUnderMink && (
                  <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-neutral-200">
                        {(['B', 'C'] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setUnderMinkCurl(c)}
                            className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                              underMinkCurl === c
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-neutral-600 hover:text-black'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>

                      {/* Độ dài: default 7 · nút cộng trừ tăng giảm 1 */}
                      <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-neutral-200 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, -1))}
                          disabled={parseUnderMinkLengthMm(underMinkLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-2xs">
                          {parseUnderMinkLengthMm(underMinkLength)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, 1))}
                          disabled={parseUnderMinkLengthMm(underMinkLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      {/* Số lượng: default 30 · nút cộng trừ tăng giảm 10 */}
                      <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-neutral-200 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, -10))}
                          disabled={parseUnderMinkCountFibers(underMinkCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-2xs">
                          {parseUnderMinkCountFibers(underMinkCount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, 10))}
                          disabled={parseUnderMinkCountFibers(underMinkCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-100 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Chọn ĐỘC LẬP Mi Dưới: Mới (390K) hoặc Dặm (250K) */}
                    <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-purple-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => setUnderMinkServiceType('Normal')}
                        className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                          underMinkServiceType === 'Normal'
                            ? 'bg-[#FFB400] text-black shadow-2xs'
                            : 'text-neutral-500 hover:text-black'
                        }`}
                      >
                        {hasUnderMinkCombo ? `Mới (${underComboNormalRemaining})` : 'Mới'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnderMinkServiceType('Retain')}
                        className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                          underMinkServiceType === 'Retain'
                            ? 'bg-[#34C759] text-white shadow-2xs'
                            : 'text-neutral-500 hover:text-black'
                        }`}
                      >
                        {hasUnderMinkCombo ? `Dặm (${underComboRetainRemaining})` : 'Dặm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isOverridden && (
                <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-[10px] text-rose-900 font-semibold">
                  <span className="truncate">⚠️ {overrideReason}</span>
                  <button
                    type="button"
                    onClick={handleRestoreAutoRule}
                    className="px-1.5 py-0.5 rounded bg-white text-rose-700 border border-rose-300 text-[9px] font-bold shrink-0 cursor-pointer"
                  >
                    Hoàn tác ↺
                  </button>
                </div>
              )}

              {/* 2 Nút chọn chế độ tối giản: ✨ Mới (X) | 🔄 Dặm (Y) */}
              <div className="bg-neutral-900 p-1 rounded-xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleRequestServiceTypeChange('Normal')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
                    serviceType === 'Normal' ? 'bg-[#FFB400] text-black shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isAlwaysFullSet
                      ? 'Mới · Giá mới'
                      : isComboLive
                        ? `Mới (${comboNormalRemaining})`
                        : `Nối mới (>${retainDaysLimit}N)`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestServiceTypeChange('Retain')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
                    serviceType === 'Retain' ? 'bg-[#34C759] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isAlwaysFullSet
                      ? 'Mới · Giá dặm'
                      : isComboLive
                        ? `Dặm (${comboRetainRemaining})`
                        : 'Giá dặm (≤21N)'}
                  </span>
                </button>
              </div>

              {isComboLive && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-[12px] flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer ${
                    serviceType === 'Normal' && !isAlwaysFullSet
                      ? 'bg-[#FFB400] hover:bg-amber-500 text-black'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Quick Check-in</span>
                </button>
              )}
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* BƯỚC 1: CHỌN CHẤT LIỆU / DÒNG MI (MATERIAL FAMILY)                    */}
            {/* --------------------------------------------------------------------- */}
            <div>
              <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
                    1
                  </span>
                  <span>BƯỚC 1: DÒNG MI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInfoModalKey('MATERIAL')}
                    className="w-6 h-6 rounded-full bg-amber-100/90 text-amber-800 hover:bg-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Xem quy chuẩn dòng mi"
                  >
                    <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsConfiguratorOpen(true)}
                      aria-label="Cấu hình ma trận chất liệu (Chỉ Super Admin)"
                      className="w-6 h-6 rounded-full bg-neutral-900 text-[#FFB400] hover:bg-black flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Cấu hình ma trận chất liệu (Chỉ Super Admin)"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-neutral-100">
                <div className="grid grid-cols-2 gap-2">
                  {materialCatalog
                    .filter((mat) => mat.code !== 'UNDER_MINK')
                    .map((mat) => {
                      const active = selectedMaterial === mat.id;
                      const startingPrice =
                        mat.code === 'FLAWLESS_MINK'
                          ? '770K'
                          : mat.code === 'ULTRALIGHT'
                            ? '550K'
                            : mat.code === 'HYPERLIGHT'
                              ? '440K'
                              : mat.code === 'IVYLIGHT'
                                ? '770K'
                                : mat.code === 'NEW_VOLUME'
                                  ? '390K'
                                  : mat.code === 'NEW_CLASSIC'
                                    ? '390K'
                                    : '390K';

                      const icon =
                        mat.code === 'ULTRALIGHT' ? (
                          <Feather className="w-3.5 h-3.5 text-amber-600" />
                        ) : mat.code === 'HYPERLIGHT' ? (
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                        ) : mat.code === 'IVYLIGHT' ? (
                          <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                        ) : mat.code === 'NEW_VOLUME' ? (
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        ) : mat.code === 'NEW_CLASSIC' ? (
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        );

                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => handleSelectMaterial(mat)}
                          className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            active
                              ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-1 ring-[#FFB400]'
                              : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {icon}
                              <span className="text-[12px] font-black leading-tight truncate">{mat.shortLabel}</span>
                            </div>
                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />}
                          </div>

                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                            {(() => {
                              const badgeText = mat.badge.split('·')[0].trim();
                              const isBest = badgeText === 'BEST SELLER';
                              const isPop = badgeText === 'MOST POPULAR';
                              if (isBest || isPop) {
                                return (
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white leading-none uppercase tracking-wide inline-flex items-center gap-0.5 shadow-2xs">
                                    {isBest ? (
                                      <Sparkles className="w-2 h-2 fill-white text-white shrink-0" />
                                    ) : (
                                      <Crown className="w-2 h-2 fill-white text-white shrink-0" />
                                    )}
                                    {badgeText}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
                                    active ? 'bg-black text-[#FFB400]' : 'bg-gray-200/80 text-gray-600'
                                  }`}
                                >
                                  {badgeText}
                                </span>
                              );
                            })()}
                            <span className="text-[10.5px] font-bold text-gray-500 tabular-nums">
                              từ {startingPrice}
                            </span>
                          </div>
                        </button>
                      );
                    })}
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
                  <span>BƯỚC 2: DÁNG MI ({currentMaterialSpec.shortLabel.toUpperCase()})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInfoModalKey('DESIGN')}
                    className="w-6 h-6 rounded-full bg-amber-100/90 text-amber-800 hover:bg-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Xem quy chuẩn 4 dáng mi & dáng mắt"
                  >
                    <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCompareDesignsOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100/90 hover:bg-amber-200 text-amber-950 text-[10px] font-extrabold shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Images className="w-3 h-3 text-amber-700" />
                    <span>So sánh</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-neutral-100">
                <div
                  className={`grid gap-2 ${
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
                          className={`p-1 rounded-xl border text-left transition-all relative cursor-pointer overflow-hidden ${
                            active
                              ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-2 ring-[#FFB400]/40'
                              : 'bg-[#F9F9FB] border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="relative aspect-4/3 w-full rounded-lg overflow-hidden bg-neutral-950 border border-black/10 shadow-2xs group">
                            <img
                              src={style.image}
                              alt={style.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <span
                              className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
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
                        </button>
                      );
                    }
                  )}
                </div>
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
                  <span>BƯỚC 3: THÔNG SỐ KỸ THUẬT</span>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">{currentMaterialSpec.shortLabel}</span>
              </div>

              {/* Thẻ ghim thông số mi thật để đối chiếu an toàn */}
              <div className="bg-gradient-to-r from-blue-50/80 to-amber-50/80 border border-blue-200/80 rounded-xl p-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-gray-600 font-medium">Mi thật:</span>
                  <strong className="text-black font-extrabold truncate">
                    {naturalLengthSpec.label} · Sợi {naturalThicknessSpec.label}
                  </strong>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="bg-emerald-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full">
                    ≤ {naturalLengthSpec.safeMaxExtensionMm}mm
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
              <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-black uppercase">3.1 Độ Cong</span>
                    <button
                      type="button"
                      onClick={() => setInfoModalKey('CURL')}
                      className="w-5 h-5 rounded-full bg-amber-100/90 text-amber-900 hover:bg-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Bản đồ độ cong"
                    >
                      <Info className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomCurlId(selectedCurl);
                      setIsCurlZoomOpen(true);
                    }}
                    className="text-[10.5px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 active:opacity-70 cursor-pointer shrink-0"
                  >
                    <ZoomIn className="w-3 h-3" />
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
                            <button
                              type="button"
                              aria-label={`Xem phóng to góc độ cong ${c.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomCurlId(c.id);
                                setIsCurlZoomOpen(true);
                              }}
                              className={`absolute top-1 right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                active
                                  ? 'bg-black text-[#FFB400] hover:bg-neutral-800'
                                  : 'bg-white/90 text-gray-500 hover:text-black shadow-xs'
                              }`}
                            >
                              <ZoomIn className="w-2.5 h-2.5" />
                            </button>

                            <div className="w-full">
                              <LashCurlIllustration curl={c} variant="card" isActive={active} />
                            </div>

                            <div className="w-full mt-1">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[13px] font-black">{c.code}</span>
                                <span
                                  className={`text-[9.5px] font-bold px-1 rounded ${
                                    active ? 'bg-[#FFB400] text-black' : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {c.angleLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* 3.2 ĐỘ DÀY CỦA CHẤT LIỆU (THICKNESS) */}
              <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-black uppercase">3.2 Độ Dày Sợi</span>
                    <button
                      type="button"
                      onClick={() => setInfoModalKey('THICKNESS')}
                      className="w-5 h-5 rounded-full bg-amber-100/90 text-amber-900 hover:bg-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Quy chuẩn độ dày"
                    >
                      <Info className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
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
                            className={`py-2 px-2.5 rounded-xl border text-center transition-all relative cursor-pointer ${
                              active
                                ? 'bg-[#FFB400] border-[#FFB400] text-black font-extrabold shadow-xs'
                                : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-[12.5px] font-black tabular-nums">{thick.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Cảnh báo độ dày không an toàn so với mi thật */}
                {thicknessWarning && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[10.5px] font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{thicknessWarning}</span>
                  </div>
                )}
              </div>

              {/* 3.3 CHIỀU DÀI & PHÂN BỔ THEO CHẤT LIỆU (LENGTH & MAPPING) */}
              <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-black uppercase">3.3 Chiều Dài</span>
                    <button
                      type="button"
                      onClick={() => setInfoModalKey('LENGTH')}
                      className="w-5 h-5 rounded-full bg-amber-100/90 text-amber-900 hover:bg-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Quy tắc chiều dài"
                    >
                      <Info className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {currentMaterialSpec.allowedLengthMappings.map((len) => {
                    const active = selectedLength === len.id;
                    return (
                      <button
                        key={len.id}
                        type="button"
                        onClick={() => setSelectedLength(len.id)}
                        className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-between ${
                          active
                            ? 'bg-amber-50/90 border-[#FFB400] text-black font-extrabold shadow-xs ring-1 ring-[#FFB400]'
                            : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-[12.5px] font-bold tabular-nums">{len.label}</span>
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Dải số đơn từng mm được phép của Chất liệu đang chọn */}
                <div className="pt-1.5 border-t border-gray-100">
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
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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

                {/* Kỹ thuật Volume được phép (chỉ hiện khi có từ 2 kỹ thuật trở lên) */}
                {currentMaterialSpec.allowedVolumes.length > 1 && (
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
                )}

                {/* Mật độ sợi / fan hoàn thành theo Menu Wings Lashes */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10.5px] font-extrabold text-gray-700">
                      BẬC SỐ LƯỢNG SỢI / FAN (MENU WINGS):
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                      {serviceType === 'Retain' ? 'Dặm Refill' : 'Nối Mới'} · Chưa VAT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentMaterialSpec.allowedCounts.map((cnt) => {
                      const active = selectedCount === cnt;
                      const detail = getWingsMenuDetail(currentMaterialSpec.code, cnt, selectedVolume);
                      const numStr = cnt.split(' ')[0];
                      const unitStr =
                        currentMaterialSpec.code === 'UNDER_MINK' ||
                        currentMaterialSpec.code === 'FLAWLESS_MINK' ||
                        currentMaterialSpec.code === 'NEW_CLASSIC'
                          ? 'sợi'
                          : currentMaterialSpec.code === 'IVYLIGHT'
                            ? 'nhịp'
                            : 'fan';
                      const price = detail ? (serviceType === 'Retain' ? detail.refillPrice : detail.newPrice) : null;
                      const priceStr = price ? `${Math.round(price / 1000)}K` : '';
                      const badge = detail?.badge;

                      return (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setSelectedCount(cnt)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                            active
                              ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-1 ring-[#FFB400]'
                              : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-black leading-tight tabular-nums">
                                {numStr} {unitStr}
                              </span>
                              {badge === 'BEST SELLER' && (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white uppercase tracking-wider shadow-xs -rotate-2 border border-red-300/40">
                                  <Sparkles className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                                  BEST SELLER
                                </span>
                              )}
                              {badge === 'MOST POPULAR' && (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white uppercase tracking-wider shadow-xs border border-rose-300/40">
                                  <Crown className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                                  MOST POPULAR
                                </span>
                              )}
                            </div>
                            {priceStr && (
                              <span
                                className={`text-[13px] font-black tabular-nums ${
                                  active ? 'text-amber-800' : 'text-gray-900'
                                }`}
                              >
                                {priceStr}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1.5 pt-1 border-t border-gray-100/80">
                            <span>{detail ? `${detail.totalFibers} sợi / 2 mắt` : cnt}</span>
                            <span className="font-semibold text-gray-700">
                              {detail ? `⏱️ ${detail.durationMin} phút` : ''}
                            </span>
                          </div>
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

            {/* --------------------------------------------------------------------- */}
            {/* OPTION LÀM KÈM: MI DƯỚI (UNDER MINK) - ĐI VỚI 6 MI TRÊN                */}
            {/* --------------------------------------------------------------------- */}
            <div>
              <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-700 text-white text-[10px] font-black inline-flex items-center justify-center">
                    +
                  </span>
                  <span>OPTION MI DƯỚI (UNDER MINK)</span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Đi kèm 6 chất liệu trên
                </span>
              </div>

              <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-neutral-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: Không nối mi dưới */}
                  <button
                    type="button"
                    onClick={() => setHasUnderMink(false)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      !hasUnderMink
                        ? 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-1 ring-[#FFB400]'
                        : 'bg-[#F9F9FB] border-gray-100 text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-black leading-tight">Không nối mi dưới</span>
                      {!hasUnderMink && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500]" />}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">Chỉ làm trọn bộ mi trên</div>
                    <div className="text-[12px] font-black text-gray-900 mt-1.5 pt-1 border-t border-gray-100">0 đ</div>
                  </button>

                  {/* Option 2: Nối Mi Dưới Under Mink */}
                  <button
                    type="button"
                    onClick={() => setHasUnderMink(true)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      hasUnderMink
                        ? 'bg-purple-50/95 border-purple-500 text-purple-950 shadow-xs ring-1 ring-purple-500'
                        : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 min-w-0">
                        <ArrowDownRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-[12px] font-black leading-tight truncate">+Mi Dưới Under</span>
                      </div>
                      {hasUnderMink && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-purple-800/80 mt-1 font-semibold">
                      Cong {underMinkCurl} · {underMinkLength} · {underMinkCount}
                    </div>
                    <div className="text-[12px] font-black text-purple-700 mt-1.5 pt-1 border-t border-purple-100 flex items-center justify-between">
                      <span>
                        {hasUnderMinkCombo ? '0đ (Trừ gói)' : underMinkServiceType === 'Retain' ? '+250K' : '+390K'}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        {underMinkServiceType === 'Retain' ? 'Dặm dưới' : 'Mới dưới'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* 1 Dòng Ngang Duy Nhất Khi Bật Mi Dưới: [B|C] · [6|7|6-7] · [20|30|40] + Chọn độc lập [Mới | Dặm] */}
                {hasUnderMink && (
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <div className="inline-flex items-center bg-neutral-50 p-0.5 rounded-lg border border-neutral-200">
                        {(['B', 'C'] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setUnderMinkCurl(c)}
                            className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                              underMinkCurl === c
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-neutral-600 hover:text-black'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>

                      {/* Độ dài: default 7 · nút cộng trừ tăng giảm 1 */}
                      <div className="inline-flex items-center bg-neutral-50 p-0.5 rounded-lg border border-neutral-200 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, -1))}
                          disabled={parseUnderMinkLengthMm(underMinkLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-200/70 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-2xs">
                          {parseUnderMinkLengthMm(underMinkLength)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, 1))}
                          disabled={parseUnderMinkLengthMm(underMinkLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-200/70 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      {/* Số lượng: default 30 · nút cộng trừ tăng giảm 10 */}
                      <div className="inline-flex items-center bg-neutral-50 p-0.5 rounded-lg border border-neutral-200 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, -10))}
                          disabled={parseUnderMinkCountFibers(underMinkCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-200/70 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-2xs">
                          {parseUnderMinkCountFibers(underMinkCount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, 10))}
                          disabled={parseUnderMinkCountFibers(underMinkCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
                          className="w-5 h-5 rounded-md font-black text-neutral-500 hover:text-black hover:bg-neutral-200/70 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div
                      className="inline-flex items-center bg-neutral-50 p-0.5 rounded-lg border border-purple-200 shrink-0"
                      title={
                        hasUnderMinkCombo
                          ? `Khách có gói Combo Mi Dưới · Tự động trừ vào gói (0đ)`
                          : 'Chọn độc lập Mi Dưới: Nối Mới (390K) hoặc Dặm (250K)'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setUnderMinkServiceType('Normal')}
                        className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                          underMinkServiceType === 'Normal'
                            ? 'bg-[#FFB400] text-black shadow-2xs'
                            : 'text-neutral-500 hover:text-black'
                        }`}
                      >
                        {hasUnderMinkCombo ? `Mới (${underComboNormalRemaining})` : 'Mới'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnderMinkServiceType('Retain')}
                        className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                          underMinkServiceType === 'Retain'
                            ? 'bg-[#34C759] text-white shadow-2xs'
                            : 'text-neutral-500 hover:text-black'
                        }`}
                      >
                        {hasUnderMinkCombo ? `Dặm (${underComboRetainRemaining})` : 'Dặm'}
                      </button>
                    </div>
                  </div>
                )}
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

            {/* 4. MỤC 0.3: SỐ LƯỢNG SỢI & MẬT ĐỘ MI THẬT */}
            <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-black inline-flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[11px] font-extrabold text-black uppercase">
                    SỐ LƯỢNG SỢI MI THẬT (MẬT ĐỘ TRÊN BỜ MÍ)
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold">Đo số sợi mỗi mắt</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {NATURAL_LASH_DENSITY_OPTIONS.map((den) => {
                  const active =
                    naturalCount === den.countRange || naturalDensity === den.id || naturalDensity === den.label;
                  return (
                    <button
                      key={den.id}
                      type="button"
                      onClick={() => {
                        setNaturalCount(den.countRange);
                        setNaturalDensity(den.id);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? 'bg-[#FFB400] border-[#FFB400] text-black font-extrabold shadow-xs ring-1 ring-[#FFB400]'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                      }`}
                    >
                      <div className="text-[13px] font-black tracking-tight">{den.countRange}</div>
                      <div className="text-[9.5px] opacity-80 mt-0.5 leading-tight line-clamp-1">{den.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Hộp đối chiếu tóm tắt thông số Mi Thật chuẩn */}
              <div className="bg-neutral-900 text-white rounded-xl p-2.5 flex items-center justify-between text-[11px] shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#FFB400] shrink-0" />
                  <span className="text-gray-300">Thông số Mi Thật:</span>
                  <strong className="text-[#FFB400] font-black">
                    {naturalCount || '60-80'} · {naturalLengthSpec.label} ·{' '}
                    {naturalThicknessSpec.label.replace(/^Sợi\s*/i, '')}
                  </strong>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Chuẩn Wings</span>
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
        <div className="bg-neutral-900 rounded-2xl p-3 text-white shadow-sm space-y-2">
          <div className="text-[10px] font-bold text-[#FFB400] uppercase tracking-wider flex items-center justify-between">
            <span>TÓM TẮT QUY TRÌNH 3 BƯỚC & ĐỊNH GIÁ:</span>
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
            {hasUnderMink && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                + Mi Dưới ({underMinkServiceType === 'Retain' ? 'Dặm' : 'Mới'}):{' '}
                <strong className="text-purple-300">
                  Cong {underMinkCurl} · {underMinkLength} · {underMinkCount} (
                  {livePricingAndCvPoints.isUnderMinkComboDeducted
                    ? 'Trừ gói Mi Dưới · 0đ'
                    : underMinkServiceType === 'Retain'
                      ? '+250K'
                      : '+390K'}
                  )
                </strong>
              </span>
            )}
            {isOverridden && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/50">
                ⚠️ Override: <strong className="text-rose-100">{overrideReason}</strong>
              </span>
            )}
          </div>

          {/* Khay Nguyên Vật Liệu Cần Chuẩn Bị (Cho CV & CV🪶 chuẩn bị trước khi nối) */}
          <div className="bg-black/40 rounded-xl p-2 border border-white/10 space-y-1 text-[10.5px]">
            <div className="text-[9.5px] font-black text-amber-400 uppercase tracking-wider">
              📦 KHAY NGUYÊN VẬT LIỆU CẦN CHUẨN BỊ:
            </div>
            <div className="flex items-center justify-between text-neutral-200">
              <span className="text-neutral-400 font-semibold">Khay 1 (Mi Trên):</span>
              <span className="font-bold text-white">
                {currentMaterialSpec.shortLabel} · {selectedVolume} ({selectedCount}) · Cong {selectedCurl} · Dày{' '}
                {selectedThickness} · {selectedLength}
              </span>
            </div>
            {hasUnderMink && (
              <div className="flex items-center justify-between text-purple-200 pt-0.5 border-t border-white/5">
                <span className="text-purple-300 font-semibold">Khay 2 (Mi Dưới):</span>
                <span className="font-bold text-purple-200">
                  Under 1D · Cong {underMinkCurl} · 0.10mm · {underMinkLength} · {underMinkCount}
                </span>
              </div>
            )}
          </div>

          {/* Dòng mapping SKU Giá Tiền & Huy Hiệu Điểm Vòng Xoay CV */}
          <div className="pt-2 border-t border-neutral-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12px] font-bold text-white">{livePricingAndCvPoints.skuName}</span>
                <span className="text-[13px] font-black text-[#FFB400] tabular-nums">
                  {livePricingAndCvPoints.skuPrice.toLocaleString('vi-VN')} đ
                  <span className="text-[10px] font-medium text-amber-200/90 ml-1">
                    (+8% VAT: {livePricingAndCvPoints.totalPriceWithVat.toLocaleString('vi-VN')} đ)
                  </span>
                </span>
                {livePricingAndCvPoints.upgradePrice > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tabular-nums">
                    Phụ thu nâng cấp: +{livePricingAndCvPoints.upgradePrice.toLocaleString('vi-VN')}đ (+8% VAT = +
                    {livePricingAndCvPoints.upgradePriceWithVat.toLocaleString('vi-VN')}đ)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span
                  className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-600/30 text-blue-200 border border-blue-400/40 shadow-xs tabular-nums"
                  title={livePricingAndCvPoints.breakdownLabel}
                >
                  {livePricingAndCvPoints.summaryLabel}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 flex items-center justify-between pt-0.5">
              <span>{livePricingAndCvPoints.breakdownLabel}</span>
              <span className="text-[#FFB400]/80">Mapping tự động theo Ma trận SKU Wings</span>
            </div>
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] shadow-md active:scale-98 transition-transform text-center cursor-pointer"
          >
            LƯU TƯ VẤN & BẮT ĐẦU LÀM MI
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

      {/* Bottom Sheet Xem Chi Tiết Quy Chuẩn Khi Chạm Nút (ⓘ) */}
      <LashConsultationInfoModal
        type={infoModalKey}
        material={currentMaterialSpec}
        onClose={() => setInfoModalKey(null)}
      />

      {/* Modal Cảnh Báo Xác Nhận Khi CV🪶 Override Chu Kỳ 25 Ngày Hoặc Khác Gói Combo */}
      {pendingOverride && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-white rounded-3xl p-4 shadow-2xl border-2 border-rose-500 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-black text-rose-950 leading-tight">{pendingOverride.title}</div>
                <div className="text-[11px] text-neutral-600 font-medium mt-1 leading-relaxed">
                  {pendingOverride.message}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[10.5px] font-extrabold text-neutral-800 uppercase tracking-wide">
                Chọn lý do CV🪶 Override (Bắt buộc ghi nhận):
              </div>
              <div className="space-y-1.5">
                {pendingOverride.reasons.map((reason) => {
                  const active = selectedOverrideReasonDraft === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedOverrideReasonDraft(reason)}
                      className={`w-full p-2.5 rounded-xl border text-left text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="leading-snug">{reason}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-[12px] cursor-pointer transition-all"
              >
                Hủy · Giữ chuẩn
              </button>
              <button
                type="button"
                onClick={() => pendingOverride.onConfirm(selectedOverrideReasonDraft || pendingOverride.defaultReason)}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[12px] shadow-md cursor-pointer transition-all"
              >
                ⚠️ Xác nhận Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
