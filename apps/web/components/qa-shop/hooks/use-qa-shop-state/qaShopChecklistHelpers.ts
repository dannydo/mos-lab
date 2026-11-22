import dayjs from 'dayjs';
import type { QaAuditResult, SafeAny } from '@mos-lab/shared';
import type { GroupedArea, InspectionStats, ItemStatusMap, QaStaffMember } from '../../types/qa-shop.types';

export type QaShiftType = 'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày';
export type QaReviewFilterTab = 'ALL' | 'PASS' | 'FAIL' | 'NA' | 'PHOTO';

export interface BuildChecklistAuditPayloadParams {
  activeTemplate: SafeAny;
  itemStatuses: ItemStatusMap;
  itemNotes: Record<string, string>;
  selectedBranch: string;
  auditorName: string;
  selectedShift: QaShiftType;
  evaluatedStaffId: number | null;
  evaluatedStaffName: string;
  isPreApproved: boolean;
  inspectionStats: InspectionStats;
  requireAllPhotos: boolean;
}

/** Resolve the active QA checklist template by explicit template code or branch fallback. */
export function resolveActiveTemplate(
  templates: SafeAny[],
  selectedBranch: string,
  selectedTemplateCode: string
): SafeAny | null {
  if (!templates || templates.length === 0) return null;
  if (selectedTemplateCode) {
    const match = templates.find((t) => t.code === selectedTemplateCode || t.id === selectedTemplateCode);
    if (match) return match;
  }
  return templates.find((t) => t.branchCode === selectedBranch || t.code?.startsWith(selectedBranch)) || templates[0];
}

/** Group template sections into 2 core inspection areas (GROOMING & STATION or LOBBY & LASHROOM). */
export function buildGroupedAreas(activeTemplate: SafeAny | null): GroupedArea[] {
  if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return [];

  if (activeTemplate.code === 'CV.Personal.Grooming.Station.check') {
    const groomingSecs = activeTemplate.sections.filter(
      (s: SafeAny) => s.id === 'sec-cv-grooming' || (s.title || '').includes('Tác Phong')
    );
    const stationSecs = activeTemplate.sections.filter(
      (s: SafeAny) =>
        s.id === 'sec-cv-station' || (s.title || '').includes('Phòng') || (s.title || '').includes('Giường')
    );
    return [
      {
        id: 'area-cv-grooming',
        code: 'GROOMING',
        title: '👗 TÁC PHONG & DIỆN MẠO BẢN THÂN (Quy chuẩn 5 sao CV)',
        badgeColor: 'blue',
        subSections: groomingSecs,
        totalItems: groomingSecs.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
      },
      {
        id: 'area-cv-station',
        code: 'STATION',
        title: '🛏️ PHÒNG NỐI MI & GIƯỜNG MI 5S CÁ NHÂN (Vô trùng & Ngăn nắp)',
        badgeColor: 'purple',
        subSections: stationSecs,
        totalItems: stationSecs.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
      },
    ].filter((area) => area.subSections.length > 0);
  }

  const lobbySections: SafeAny[] = [];
  const lashroomSections: SafeAny[] = [];

  activeTemplate.sections.forEach((sec: SafeAny) => {
    const titleUpper = (sec.title || '').toUpperCase();
    const hasLashroomItem = sec.items?.some((i: SafeAny) => {
      const a = (i.area || '').toUpperCase();
      return a === 'LASHROOM' || a === 'PHÒNG RIÊNG' || a === 'KHU VỰC';
    });

    if (
      titleUpper.includes('LASHROOM') ||
      titleUpper.includes('PHÒNG') ||
      titleUpper.includes('GIƯỜNG') ||
      hasLashroomItem
    ) {
      lashroomSections.push(sec);
    } else {
      lobbySections.push(sec);
    }
  });

  return [
    {
      id: 'area-lobby',
      code: 'LOBBY',
      title: '🏢 KHU VỰC LOBBY (Sảnh Đón Khách, Quầy Lễ Tân, Tiếp Khách & Toilet)',
      badgeColor: 'blue',
      subSections: lobbySections,
      totalItems: lobbySections.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
    },
    {
      id: 'area-lashroom',
      code: 'LASHROOM',
      title: '👁️ KHU VỰC LASHROOM (Phòng Dịch Vụ, Giường Mi & Kỹ Thuật Viên)',
      badgeColor: 'purple',
      subSections: lashroomSections,
      totalItems: lashroomSections.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
    },
  ].filter((area) => area.subSections.length > 0);
}

/** Deduplicate QA staff members case-insensitively by display name. */
export function deduplicateQaStaffMembers(members: SafeAny[]): QaStaffMember[] {
  const realList: QaStaffMember[] = members.map((member) => ({
    id: String(member.crmStaffId || member.staffId),
    displayName: member.displayName,
    role: member.role || 'qa_qc',
  }));

  const seen = new Set<string>();
  return realList.filter((item) => {
    const key = (item.displayName || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Build an initial item status map for every checklist item in the active template. */
export function createInitialItemStatusMap(activeTemplate: SafeAny | null): ItemStatusMap {
  const initialMap: ItemStatusMap = {};
  if (activeTemplate && Array.isArray(activeTemplate.sections)) {
    activeTemplate.sections.forEach((sec: SafeAny) => {
      if (Array.isArray(sec.items)) {
        sec.items.forEach((itm: SafeAny) => {
          initialMap[itm.id] = { result: undefined, note: '', photoUrl: '' };
        });
      }
    });
  }
  return initialMap;
}

/** Compute live compliance metrics and evaluation result from current item statuses. */
export function computeInspectionStats(
  itemStatuses: ItemStatusMap,
  activeTemplate: SafeAny | null,
  isPreApproved: boolean
): InspectionStats {
  const totalItems = Object.keys(itemStatuses).length;
  if (totalItems === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      criticalFailed: 0,
      minorFailed: 0,
      na: 0,
      passRate: 100,
      evaluationResult: 'PASSED',
      failedItemsList: [],
    };
  }

  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;
  let minorFailed = 0;
  let na = 0;
  const failedItemsList: InspectionStats['failedItemsList'] = [];

  if (activeTemplate && Array.isArray(activeTemplate.sections)) {
    activeTemplate.sections.forEach((sec: SafeAny) => {
      if (Array.isArray(sec.items)) {
        sec.items.forEach((itm: SafeAny) => {
          const st = itemStatuses[itm.id] || {};
          if (st.result === 'PASS') passed++;
          else if (st.result === 'NA') na++;
          else if (st.result === 'FAIL') {
            failed++;
            if (itm.isCritical) criticalFailed++;
            else minorFailed++;
            failedItemsList.push({
              secTitle: sec.title,
              itemTitle: itm.title,
              severity: itm.severity || (itm.isCritical ? 'CRITICAL' : 'MID'),
              note: st.note || 'Không đạt quy chuẩn tiêu chí',
              photoUrl: st.photoUrl || '',
            });
          }
        });
      }
    });
  }

  const scorable = totalItems - na;
  const passRate = scorable > 0 ? Math.round((passed / scorable) * 1000) / 10 : 100;

  let evaluationResult: 'PASSED' | 'FAILED' | 'REMEDIATION_PENDING' = 'PASSED';
  if (criticalFailed >= 1 || minorFailed >= 3) {
    if (isPreApproved) {
      evaluationResult = 'REMEDIATION_PENDING';
    } else {
      evaluationResult = 'FAILED';
    }
  }

  return {
    total: totalItems,
    passed,
    failed,
    criticalFailed,
    minorFailed,
    na,
    passRate,
    evaluationResult,
    failedItemsList,
  };
}

/** Find checklist items that are still missing an attached evidence photo. */
export function findMissingRequiredPhotoItems(activeTemplate: SafeAny, itemStatuses: ItemStatusMap): SafeAny[] {
  const allItems = activeTemplate.sections.flatMap((s: SafeAny) => s.items || []);
  return allItems.filter((itm: SafeAny) => !itemStatuses[itm.id]?.photoUrl);
}

/** Build the audit submission payload including snapshot and contextual notes. */
export function buildChecklistAuditPayload({
  activeTemplate,
  itemStatuses,
  itemNotes,
  selectedBranch,
  auditorName,
  selectedShift,
  evaluatedStaffId,
  evaluatedStaffName,
  isPreApproved,
  inspectionStats,
  requireAllPhotos,
}: BuildChecklistAuditPayloadParams) {
  const auditItems = Object.entries(itemStatuses).map(([itemId, st]) => ({
    itemId,
    result: (st.result || 'PASS') as QaAuditResult,
    note: itemNotes[itemId] ?? st.note ?? '',
    photoUrls: st.photoUrl ? [st.photoUrl] : [],
  }));

  const isPersonalCheck = activeTemplate.code === 'CV.Personal.Grooming.Station.check';
  return {
    templateId: activeTemplate.id || 'tpl-wings-dt',
    branchCode: selectedBranch as SafeAny,
    auditorId: 'usr-qa-01',
    auditorName: auditorName || 'Nguyễn Thị Minh QA',
    auditDate: dayjs().format('YYYY-MM-DD'),
    shift: selectedShift,
    evaluatedStaffId: isPersonalCheck ? evaluatedStaffId : null,
    evaluatedStaffName: isPersonalCheck ? evaluatedStaffName : null,
    isPreApproved: isPersonalCheck ? isPreApproved : false,
    notes:
      isPersonalCheck && evaluatedStaffName
        ? `Biên bản kiểm định tác phong & phòng mi CV ${evaluatedStaffName} (${selectedBranch} ca ${selectedShift}). Kết quả: ${
            inspectionStats.evaluationResult === 'PASSED'
              ? 'ĐẠT'
              : inspectionStats.evaluationResult === 'REMEDIATION_PENDING'
                ? 'Ân hạn khắc phục (Có đơn xin trước)'
                : 'KHÔNG ĐẠT (Khóa nâng cấp)'
          } (${inspectionStats.criticalFailed} lỗi nghiêm trọng, ${inspectionStats.minorFailed} lỗi nhỏ).`
        : `Biên bản kiểm tra cửa hàng ${selectedBranch} ca ${selectedShift}. Tỷ lệ đạt: ${inspectionStats.passRate}% (${inspectionStats.failed} lỗi phát hiện).`,
    items: auditItems,
    itemSnapshot: itemStatuses,
    sectionsSnapshot: activeTemplate.sections,
    requireAllPhotos,
  };
}
