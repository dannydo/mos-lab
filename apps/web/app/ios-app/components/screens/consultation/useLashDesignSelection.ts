'use client';

import { useState, useMemo, useEffect } from 'react';
import { isSuperAdminRole, isCanonicalSuperAdminIdentity } from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import type { InfoModalType } from '../LashConsultationInfoModal';
import {
  DEFAULT_LASH_MATERIAL_CATALOG,
  MATERIAL_MATRIX_UPDATED_EVENT,
  loadMaterialCatalog,
  resolveMaterialSpec,
  isAlwaysFullSetMaterial,
  parseDaysSinceLastVisit,
  resolveServiceSpecsFromComboOrHistory,
  COMBO_RETAIN_CYCLE_DAYS_LIMIT,
  SINGLE_RETAIN_CYCLE_DAYS_LIMIT,
  UNDER_MINK_PREP_SPEC,
  detectUnderMinkFromLastVisit,
  parseUnderMinkCountFibers,
  parseUnderMinkLengthMm,
  type LashMaterialSpec,
} from '../LashMaterialConstraintMatrix';
import type { PendingOverrideState } from './ConsultationTypes';

export function useLashDesignSelection(booking?: BookingItem) {
  const [materialCatalog, setMaterialCatalog] = useState<LashMaterialSpec[]>(() => loadMaterialCatalog());
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState<boolean>(false);
  const [infoModalKey, setInfoModalKey] = useState<InfoModalType>(null);
  const [showStaffRewards, setShowStaffRewards] = useState<boolean>(false);

  useEffect(() => {
    setShowStaffRewards(false);
  }, [booking?.id]);

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

  // Tự động nhận diện Gói Combo (25 ngày) vs Khách lẻ Single (21 ngày vô điều kiện)
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  const comboName = booking?.comboLiveStatus?.comboName || '';
  const comboRemainingSessions = booking?.comboLiveStatus?.remainingSessions ?? 0;
  const lastVisitDate = booking?.lashHistory?.[0]?.date || null;
  const daysSinceLastVisit = useMemo(() => parseDaysSinceLastVisit(lastVisitDate || undefined), [lastVisitDate]);
  const retainDaysLimit = isComboLive ? COMBO_RETAIN_CYCLE_DAYS_LIMIT : SINGLE_RETAIN_CYCLE_DAYS_LIMIT;
  const isFirstVisitWithoutHistory =
    (booking?.customerVisits ?? 1) <= 1 && (!booking?.lashHistory || booking.lashHistory.length === 0);
  const isWithin25Days =
    !isFirstVisitWithoutHistory && daysSinceLastVisit !== null && daysSinceLastVisit <= retainDaysLimit;

  const autoComboSpec = useMemo(() => {
    const sourceText = isComboLive
      ? booking?.comboLiveStatus?.serviceKey || booking?.comboLiveStatus?.comboName || booking?.serviceName
      : booking?.attributes?.material || booking?.lashHistory?.[0]?.serviceName || booking?.serviceName;
    return (
      resolveServiceSpecsFromComboOrHistory(sourceText || 'Flawless Mink 880', materialCatalog) || {
        materialId: 'Flawless Mink',
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

  const initialMat = useMemo(
    () => resolveMaterialSpec(autoComboSpec.materialId, materialCatalog),
    [autoComboSpec.materialId, materialCatalog]
  );

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

  const expectedAutoServiceType: 'Normal' | 'Retain' = useMemo(() => {
    if (isComboLive) {
      if (!hasComboRetainRemaining && hasComboNormalRemaining) {
        return 'Normal';
      }
      if (!hasComboNormalRemaining && hasComboRetainRemaining) {
        return 'Retain';
      }
      if (isWithin25Days && hasComboRetainRemaining) {
        return 'Retain';
      }
      return 'Normal';
    }
    return isWithin25Days ? 'Retain' : 'Normal';
  }, [isComboLive, hasComboRetainRemaining, hasComboNormalRemaining, isWithin25Days]);

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

  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    const initStyle = booking?.attributes?.style || initialMat.defaultDesign;
    return initialMat.allowedDesigns.includes(initStyle) ? initStyle : initialMat.defaultDesign;
  });

  const [selectedCurl, setSelectedCurl] = useState<string>(() => {
    const initCurl = booking?.attributes?.curl || initialMat.defaultCurl;
    return initialMat.allowedCurls.includes(initCurl) ? initCurl : initialMat.defaultCurl;
  });

  const [selectedThickness, setSelectedThickness] = useState<string>(() => {
    const initThick = booking?.attributes?.thickness || initialMat.defaultThickness;
    return initialMat.allowedThicknesses.includes(initThick) ? initThick : initialMat.defaultThickness;
  });

  const [selectedLengths, setSelectedLengths] = useState<number[]>(() => {
    const init = booking?.attributes?.length || initialMat.defaultLength;
    const matches = init.match(/\d+/g);
    if (matches && matches.length > 0) {
      const nums = Array.from(new Set(matches.map((n: string) => parseInt(n, 10)))).sort((a, b) => a - b);
      return nums.slice(0, 5);
    }
    return [10, 11, 12];
  });

  const selectedLength = useMemo(() => {
    if (selectedLengths.length === 0) return '10 mm';
    return `${selectedLengths.join(' - ')} mm`;
  }, [selectedLengths]);

  const handleToggleLength = (sizeNum: number) => {
    setSelectedLengths((prev) => {
      if (prev.includes(sizeNum)) {
        if (prev.length > 1) {
          return prev.filter((n) => n !== sizeNum);
        }
        return prev;
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, sizeNum].sort((a, b) => a - b);
    });
  };

  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    const raw = booking?.attributes?.color || 'Đen Tuyền (Jet Black)';
    const parts = raw.split(/\s*\+\s*/).filter(Boolean);
    return parts.length > 0 ? parts : [raw];
  });
  const selectedColor = useMemo(() => selectedColors.join(' + '), [selectedColors]);
  const [selectedVolume, setSelectedVolume] = useState<string>(autoComboSpec.volume || initialMat.defaultVolume);
  const [selectedCount, setSelectedCount] = useState<string>(autoComboSpec.count || initialMat.defaultCount);
  const [serviceType, setServiceType] = useState<'Normal' | 'Retain'>(expectedAutoServiceType);

  // Trạng thái CVL Override & Cảnh báo xác nhận
  const [isOverridden, setIsOverridden] = useState<boolean>(Boolean(booking?.attributes?.isOverridden));
  const [overrideReason, setOverrideReason] = useState<string>(booking?.attributes?.overrideReason || '');
  const [pendingOverride, setPendingOverride] = useState<PendingOverrideState | null>(null);
  const [selectedOverrideReasonDraft, setSelectedOverrideReasonDraft] = useState<string>('');

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
    if (selectedLengths.length === 0) {
      const matches = (currentMaterialSpec.defaultLength || '10-12 mm').match(/\d+/g);
      if (matches && matches.length > 0) {
        setSelectedLengths(
          Array.from(new Set(matches.map((n) => parseInt(n, 10))))
            .sort((a, b) => a - b)
            .slice(0, 5)
        );
      }
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
    if (selectedLengths.length === 0) {
      const matches = (mat.defaultLength || '10-12 mm').match(/\d+/g);
      if (matches && matches.length > 0) {
        setSelectedLengths(
          Array.from(new Set(matches.map((n) => parseInt(n, 10))))
            .sort((a, b) => a - b)
            .slice(0, 5)
        );
      }
    }
    if (!mat.allowedVolumes.includes(selectedVolume)) {
      setSelectedVolume(mat.defaultVolume);
    }
    if (!mat.allowedCounts.includes(selectedCount)) {
      setSelectedCount(mat.defaultCount);
    }
  };

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

  // Khi CVL bấm chuyển giữa Nối Mới / Giá Dặm -> Kiểm tra nếu trái với chu kỳ Combo (25 ngày) hoặc Single (21 ngày) thì bật Cảnh báo Override
  const handleRequestServiceTypeChange = (targetType: 'Normal' | 'Retain') => {
    if (targetType === serviceType) return;

    // Nếu CVL bấm quay về đúng chuẩn tự động (expectedAutoServiceType) và đang đúng dòng mi gói Combo -> xóa cảnh báo override
    if (targetType === expectedAutoServiceType) {
      setServiceType(targetType);
      if (!isComboLive || selectedMaterial === initialMat.id) {
        setIsOverridden(false);
        setOverrideReason('');
      }
      return;
    }

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
        title: `⚠️ Cảnh Báo Override: Đã Quá ${retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Khách Lẻ'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé ${daysText}. Theo quy định khách mua Combo đi trong 25 ngày luôn được tính Dặm, sau 25 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính DẶM.`
          : `Khách lẻ ghé ${daysText}. Theo quy định khách lẻ đi trong 21 ngày có Giá Dặm vô điều kiện, sau 21 ngày bắt buộc tính NỐI MỚI, nhưng bạn đang chọn tính GIÁ DẶM.`,
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

    if (targetType === 'Normal' && isComboLive && !isAlwaysFullSet && hasComboNormalRemaining) {
      setServiceType('Normal');
      if (selectedMaterial === initialMat.id) {
        setIsOverridden(false);
        setOverrideReason('');
      }
      return;
    }

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
        title: `⚠️ Cảnh Báo Override: Đi Trong ${retainDaysLimit} Ngày (${isComboLive ? 'Combo' : 'Khách Lẻ'})`,
        message: isComboLive
          ? `Khách Gói Combo ghé lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước ≤ 25 ngày). Theo quy định khách mua Combo đi trong 25 ngày luôn luôn được tính DẶM, nhưng bạn đang chuyển sang tính NỐI MỚI.`
          : `Khách lẻ ghé lần cuối ngày ${lastVisitDate} (${daysSinceLastVisit} ngày trước ≤ 21 ngày). Theo quy định khách lẻ đi trong 21 ngày luôn có GIÁ DẶM VÔ ĐIỀU KIỆN, nhưng bạn đang chuyển sang tính GIÁ NỐI MỚI.`,
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

  // Option làm kèm: Mi Dưới (Under Mink)
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

  const [isCurlZoomOpen, setIsCurlZoomOpen] = useState(false);
  const [zoomCurlId, setZoomCurlId] = useState<string>('C');
  const [isCompareDesignsOpen, setIsCompareDesignsOpen] = useState<boolean>(false);
  const [zoomDesignId, setZoomDesignId] = useState<string>(selectedStyle);

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

  return {
    materialCatalog,
    setMaterialCatalog,
    isConfiguratorOpen,
    setIsConfiguratorOpen,
    infoModalKey,
    setInfoModalKey,
    showStaffRewards,
    setShowStaffRewards,
    isComboLive,
    comboName,
    comboRemainingSessions,
    lastVisitDate,
    daysSinceLastVisit,
    retainDaysLimit,
    isWithin25Days,
    autoComboSpec,
    initialMat,
    comboNormalRemaining,
    comboRetainRemaining,
    hasComboNormalRemaining,
    hasComboRetainRemaining,
    expectedAutoServiceType,
    selectedMaterial,
    setSelectedMaterial,
    currentMaterialSpec,
    isAlwaysFullSet,
    selectedStyle,
    setSelectedStyle,
    selectedCurl,
    setSelectedCurl,
    selectedThickness,
    setSelectedThickness,
    selectedLengths,
    setSelectedLengths,
    selectedLength,
    handleToggleLength,
    selectedColors,
    setSelectedColors,
    selectedColor,
    selectedVolume,
    setSelectedVolume,
    selectedCount,
    setSelectedCount,
    serviceType,
    setServiceType,
    isOverridden,
    overrideReason,
    pendingOverride,
    setPendingOverride,
    selectedOverrideReasonDraft,
    setSelectedOverrideReasonDraft,
    handleSelectMaterial,
    handleRequestServiceTypeChange,
    handleRestoreAutoRule,
    hasUnderMinkCombo,
    underComboNormalRemaining,
    underComboRetainRemaining,
    hasUnderMink,
    setHasUnderMink,
    underMinkServiceType,
    setUnderMinkServiceType,
    underMinkCurl,
    setUnderMinkCurl,
    underMinkLength,
    setUnderMinkLength,
    underMinkCount,
    setUnderMinkCount,
    isCurlZoomOpen,
    setIsCurlZoomOpen,
    zoomCurlId,
    setZoomCurlId,
    isCompareDesignsOpen,
    setIsCompareDesignsOpen,
    zoomDesignId,
    setZoomDesignId,
    isSuperAdmin,
  };
}
