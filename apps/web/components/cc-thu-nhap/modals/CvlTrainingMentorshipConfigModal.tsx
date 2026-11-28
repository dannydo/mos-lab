'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, message } from 'antd';
import { GraduationCap, Plus, ShieldCheck } from 'lucide-react';
import type {
  CvlMenteeLifecycleSummary,
  CvlTrainingMentorshipPair,
  CvlTrainingMentorshipStaffOption,
} from '@mos-lab/shared';
import { DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG, validateStrictOneToOneMentorshipPairs } from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter } from '~/components/ui';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { apiClient } from '~/lib/api-client';
import { CvlTrainingMentorshipPairCard, type ResolveMentorshipOutcomePayload } from './CvlTrainingMentorshipPairCard';

export interface CvlTrainingMentorshipConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function getLocalTodayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CvlTrainingMentorshipConfigModal({
  open,
  onClose,
  onSaved,
}: CvlTrainingMentorshipConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolvingPairId, setResolvingPairId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<CvlTrainingMentorshipPair[]>([]);
  const [savedPairIds, setSavedPairIds] = useState<Set<string>>(new Set());
  const [ccMentors, setCcMentors] = useState<CvlTrainingMentorshipStaffOption[]>([]);
  const [cvlMentees, setCvlMentees] = useState<CvlTrainingMentorshipStaffOption[]>([]);
  const [menteeLifecycleByStaffId, setMenteeLifecycleByStaffId] = useState<Record<number, CvlMenteeLifecycleSummary>>(
    {}
  );
  const [updatedMeta, setUpdatedMeta] = useState<{ updatedAt?: string; updatedBy?: string }>({});

  const applyResponse = useCallback((res: Awaited<ReturnType<typeof apiClient.kpi.getCvlTrainingMentorshipConfig>>) => {
    const nextPairs = res.config?.pairs || DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs;
    setPairs(nextPairs);
    setSavedPairIds(new Set(nextPairs.map((p) => p.id)));
    setCcMentors(res.staffOptions?.ccMentors || []);
    setCvlMentees(res.staffOptions?.cvlMentees || []);
    setMenteeLifecycleByStaffId(res.menteeLifecycleByStaffId || {});
    setUpdatedMeta({
      updatedAt: res.config?.updatedAt,
      updatedBy: res.config?.updatedBy,
    });
    setValidationError(null);
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.kpi.getCvlTrainingMentorshipConfig();
      applyResponse(res);
    } catch (err) {
      console.error('Failed to load CVL training mentorship config:', err);
      message.error('Không thể tải cấu hình kèm cặp đào tạo Chuyên Viên Tự Chủ.');
    } finally {
      setLoading(false);
    }
  }, [applyResponse]);

  useEffect(() => {
    if (open) {
      void loadConfig();
    }
  }, [open, loadConfig]);

  const updatePairAt = (index: number, patch: Partial<CvlTrainingMentorshipPair>) => {
    setValidationError(null);
    setPairs((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleAddPair = () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstMentor = ccMentors[0];
    const firstMentee = cvlMentees[0];

    const newPair: CvlTrainingMentorshipPair = {
      id: `pair-${Date.now()}`,
      mentorLegacyStaffId: firstMentor?.legacyStaffId || 37790,
      mentorDisplayName: firstMentor?.displayName || 'Diễm Hương',
      mentorRoleGroup:
        firstMentor?.roleGroup === 'CVL' || firstMentor?.roleGroup === 'CVLL' ? firstMentor.roleGroup : 'CC',
      menteeLegacyStaffId: firstMentee?.legacyStaffId || 46272,
      menteeDisplayName: firstMentee?.displayName || 'Thảo Ly',
      storeCode: firstMentor?.storeCode || 'DT',
      startDate: `${ym}-01`,
      endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
      fixedAllowanceVnd: 1_000_000,
      menteeBonusShareRate: 0.5,
      minComboRateThreshold: 0.2,
      isActive: true,
      outcome: 'ACTIVE',
      note: `Kỳ Training CVL ${ym}`,
    };
    setValidationError(null);
    setPairs((prev) => [...prev, newPair]);
  };

  const handleRemovePair = (index: number) => {
    setValidationError(null);
    setPairs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (!p.mentorLegacyStaffId || !p.menteeLegacyStaffId) {
        message.error(`Cặp #${i + 1}: Vui lòng chọn đầy đủ Mentor và Mentee CVL.`);
        return;
      }
      if (p.mentorLegacyStaffId === p.menteeLegacyStaffId) {
        message.error(`Cặp #${i + 1}: Mentor và Mentee CVL không được trùng một người.`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(p.endDate)) {
        message.error(`Cặp #${i + 1}: Ngày bắt đầu / kết thúc phải đúng định dạng YYYY-MM-DD.`);
        return;
      }
      if (p.startDate > p.endDate) {
        message.error(`Cặp #${i + 1}: Ngày bắt đầu không được lớn hơn ngày kết thúc.`);
        return;
      }
    }

    const strictCheck = validateStrictOneToOneMentorshipPairs(pairs);
    if (!strictCheck.valid) {
      const errMsg = strictCheck.errors[0] || 'Cấu hình Mentor – Mentee 1-kèm-1 bị trùng lịch.';
      setValidationError(errMsg);
      message.error(errMsg);
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.kpi.updateCvlTrainingMentorshipConfig({ pairs });
      applyResponse(res);
      message.success('Đã lưu cấu hình Đào tạo Chuyên Viên Tự Chủ & cập nhật hạch toán lương!');
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const apiMsg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      if (apiMsg) setValidationError(apiMsg);
      message.error(apiMsg || 'Không thể lưu cấu hình đào tạo Chuyên Viên Tự Chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleResolveOutcome = async (payload: ResolveMentorshipOutcomePayload) => {
    setResolvingPairId(payload.pairId);
    setValidationError(null);
    try {
      const res = await apiClient.kpi.resolveCvlTrainingMentorship(payload);
      applyResponse(res);
      message.success('Đã cập nhật trạng thái tốt nghiệp / gia hạn kỳ Training CVL!');
      onSaved?.();
    } catch (err: unknown) {
      const apiMsg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      if (apiMsg) setValidationError(apiMsg);
      message.error(apiMsg || 'Không thể cập nhật kết quả đào tạo CVL.');
    } finally {
      setResolvingPairId(null);
    }
  };

  const todayYmd = getLocalTodayYmd();

  return (
    <AdaptiveModal
      intent="data"
      open={open}
      onCancel={onClose}
      width={920}
      title={
        <div className="flex items-center gap-2.5 pr-6">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span>Gán Mentor 1-kèm-1 &amp; Đào Tạo CVL</span>
              <CvFeather1Badge className="text-xs text-amber-500" />
            </div>
            <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Điều răn CC-006 v1.2.0 &amp; CV-002 v2.12.0 · 1 Mentor kèm tối đa 1 Mentee trong cùng kỳ
            </div>
          </div>
        </div>
      }
      footer={
        <AdaptiveOverlayFooter>
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button onClick={handleAddPair} disabled={loading || saving}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm cặp Mentor – Mentee</span>
              </span>
            </Button>
            <div className="flex items-center gap-2">
              <Button onClick={onClose} disabled={saving}>
                Đóng
              </Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                Lưu &amp; Tính Lại Bảng Lương
              </Button>
            </div>
          </div>
        </AdaptiveOverlayFooter>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-300">
                Quy chế Mentor 1-kèm-1 &amp; Quyền lợi trong / sau Training:
              </div>
              <ul className="list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-300">
                <li>
                  Mentor gồm <strong>CC</strong>, <strong>CVL</strong> hoặc <strong>CVLL Chính thức</strong> (ràng buộc
                  chặt 1 Mentor kèm tối đa 1 Mentee trong khoảng thời gian giao nhau). Gán Training tự mở quyền vào{' '}
                  <code>/ios-app</code> cho Mentee.
                </li>
                <li>
                  <strong>Trong Training:</strong> Mentee nhận trọn 100% Combo, Dưỡng mi, Thu nợ &ge;500K, 90% Tip và
                  +2k/h; Mentor (kể cả CC hay CVL) nhận 0đ trên đơn Mentee và được tổng kết{' '}
                  <strong className="tabular-nums">1.000.000đ + 50%</strong> thu nhập tăng thêm khi Mentee đạt Combo
                  &ge; <strong className="tabular-nums">20.0%</strong>.
                </li>
                <li>
                  <strong>Sau khi Duyệt lên CVL Chính thức (từ 01/12/2026):</strong> 100% CV Xoay, 0đ CC Xoay; Tip{' '}
                  <strong className="tabular-nums">70% nối mi + 20% tư vấn chia 50/50 IN-OUT</strong>; Combo / Thu nợ /
                  Dưỡng mi &amp; tử số % Combo tính <strong className="tabular-nums">100%</strong> khi tự IN&amp;OUT
                  hoặc <strong className="tabular-nums">50%</strong> khi chỉ làm IN hoặc OUT.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {validationError && <Alert type="error" showIcon message={validationError} />}

        {loading ? (
          <div className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Đang tải cấu hình cặp đào tạo...
          </div>
        ) : pairs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Chưa có cặp đào tạo nào. Nhấn &ldquo;Thêm cặp Mentor – Mentee&rdquo; để cấu hình.
          </div>
        ) : (
          <div className="space-y-3">
            {pairs.map((pair, idx) => (
              <CvlTrainingMentorshipPairCard
                key={pair.id || idx}
                pair={pair}
                index={idx}
                isSavedPair={savedPairIds.has(pair.id)}
                resolvingPairId={resolvingPairId}
                todayYmd={todayYmd}
                ccMentors={ccMentors}
                cvlMentees={cvlMentees}
                menteeLifecycleByStaffId={menteeLifecycleByStaffId}
                onUpdate={updatePairAt}
                onRemove={handleRemovePair}
                onResolveOutcome={handleResolveOutcome}
              />
            ))}
          </div>
        )}

        {updatedMeta.updatedAt && (
          <div className="text-right text-[11px] tabular-nums text-slate-400">
            Cập nhật gần nhất: {new Date(updatedMeta.updatedAt).toLocaleString('vi-VN')} bởi{' '}
            {updatedMeta.updatedBy || 'Admin'}
          </div>
        )}
      </div>
    </AdaptiveModal>
  );
}
