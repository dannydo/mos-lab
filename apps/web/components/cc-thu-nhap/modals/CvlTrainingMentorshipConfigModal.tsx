'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputNumber, Select, Switch, message } from 'antd';
import { ArrowRight, CalendarDays, GraduationCap, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { CvlTrainingMentorshipPair, CvlTrainingMentorshipStaffOption } from '@mos-lab/shared';
import { DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG } from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter, StatusTag } from '~/components/ui';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { apiClient } from '~/lib/api-client';
import { formatVND } from '~/lib/format-utils';

export interface CvlTrainingMentorshipConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const STORE_OPTIONS = [
  { value: 'DT', label: 'Đề Thám (DT)' },
  { value: 'EP', label: 'Estella Place (EP)' },
  { value: 'PXL', label: 'Phan Xích Long (PXL)' },
];

export default function CvlTrainingMentorshipConfigModal({
  open,
  onClose,
  onSaved,
}: CvlTrainingMentorshipConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pairs, setPairs] = useState<CvlTrainingMentorshipPair[]>([]);
  const [ccMentors, setCcMentors] = useState<CvlTrainingMentorshipStaffOption[]>([]);
  const [cvlMentees, setCvlMentees] = useState<CvlTrainingMentorshipStaffOption[]>([]);
  const [updatedMeta, setUpdatedMeta] = useState<{ updatedAt?: string; updatedBy?: string }>({});

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.kpi.getCvlTrainingMentorshipConfig();
      setPairs(res.config?.pairs || DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs);
      setCcMentors(res.staffOptions?.ccMentors || []);
      setCvlMentees(res.staffOptions?.cvlMentees || []);
      setUpdatedMeta({
        updatedAt: res.config?.updatedAt,
        updatedBy: res.config?.updatedBy,
      });
    } catch (err) {
      console.error('Failed to load CVL training mentorship config:', err);
      message.error('Không thể tải cấu hình kèm cặp đào tạo Chuyên Viên Tự Chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadConfig();
    }
  }, [open, loadConfig]);

  const updatePairAt = (index: number, patch: Partial<CvlTrainingMentorshipPair>) => {
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
      menteeLegacyStaffId: firstMentee?.legacyStaffId || 46272,
      menteeDisplayName: firstMentee?.displayName || 'Thảo Ly',
      storeCode: firstMentor?.storeCode || 'DT',
      startDate: `${ym}-01`,
      endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
      fixedAllowanceVnd: 1_000_000,
      menteeBonusShareRate: 0.5,
      minComboRateThreshold: 0.2,
      isActive: true,
      note: `Kỳ Training CVL ${ym}`,
    };
    setPairs((prev) => [...prev, newPair]);
  };

  const handleRemovePair = (index: number) => {
    setPairs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (!p.mentorLegacyStaffId || !p.menteeLegacyStaffId) {
        message.error(`Cặp #${i + 1}: Vui lòng chọn đầy đủ Mentor CC và Mentee CVL.`);
        return;
      }
      if (p.mentorLegacyStaffId === p.menteeLegacyStaffId) {
        message.error(`Cặp #${i + 1}: Mentor CC và Mentee CVL không được trùng một người.`);
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

    setSaving(true);
    try {
      const res = await apiClient.kpi.updateCvlTrainingMentorshipConfig({ pairs });
      setPairs(res.config?.pairs || pairs);
      setUpdatedMeta({
        updatedAt: res.config?.updatedAt,
        updatedBy: res.config?.updatedBy,
      });
      message.success('Đã lưu cấu hình Đào tạo Chuyên Viên Tự Chủ & cập nhật hạch toán lương!');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save CVL training mentorship config:', err);
      message.error('Không thể lưu cấu hình đào tạo Chuyên Viên Tự Chủ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal
      intent="data"
      open={open}
      onCancel={onClose}
      width={880}
      title={
        <div className="flex items-center gap-2.5 pr-6">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span>Cấu Hình Cặp Kèm Cặp Đào Tạo</span>
              <CvFeather1Badge className="text-xs text-amber-500" />
            </div>
            <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Quy chế Điều răn CC-006: 100% thưởng ca về Mentee · Cuối tháng Mentor CC nhận 1M + 50% khi Combo &ge; 20%
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
                Lưu & Tính Lại Bảng Lương
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
                Nguyên tắc bất biến trong thời gian Training (Điều răn CC-006 &amp; CV-002):
              </div>
              <ul className="list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-300">
                <li>
                  Mọi CC bấm Check-in / Check-out giùm đơn của Mentee nhận <strong className="tabular-nums">0đ</strong>{' '}
                  trên toàn bộ CC Xoay, Daily Sales Bonus và CC Tip.
                </li>
                <li>
                  Mentee <CvFeather1Badge className="text-[11px] text-amber-500" /> được cộng trực tiếp{' '}
                  <strong className="tabular-nums">100%</strong> Gói Combo, Dưỡng mi, +20% Tip tư vấn/checkout và +2k/h.
                </li>
                <li>
                  Cuối tháng: Nếu Mentee đạt tỷ lệ bán Combo <strong className="tabular-nums">&ge; 20.0%</strong> (trên
                  khách chưa có gói Live), Mentor CC nhận <strong className="tabular-nums">1.000.000đ + 50%</strong>{' '}
                  tổng thu nhập tăng thêm của Mentee. Dưới 20.0% nhận <strong className="tabular-nums">0đ</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

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
              <div
                key={pair.id || idx}
                className={`rounded-xl border p-3.5 transition-colors ${
                  pair.isActive
                    ? 'border-purple-500/40 bg-slate-50/70 dark:bg-slate-900/70'
                    : 'border-slate-200 bg-slate-100/50 opacity-70 dark:border-slate-800 dark:bg-slate-900/30'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusTag
                      status={pair.isActive ? 'success' : 'default'}
                      label={pair.isActive ? 'Đang áp dụng' : 'Tạm tắt'}
                    />
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                      CC {pair.mentorDisplayName}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-300">
                      <span>{pair.menteeDisplayName}</span>
                      <CvFeather1Badge className="text-[11px]" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <CalendarDays className="h-3 w-3" />
                      <span>
                        {pair.startDate} &rarr; {pair.endDate}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      size="small"
                      checked={pair.isActive}
                      onChange={(checked) => updatePairAt(idx, { isActive: checked })}
                    />
                    <Button
                      size="small"
                      danger
                      type="text"
                      aria-label={`Xóa cặp đào tạo ${pair.mentorDisplayName} và ${pair.menteeDisplayName}`}
                      onClick={() => handleRemovePair(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Mentor CC kèm cặp
                    </label>
                    <Select
                      className="w-full"
                      size="small"
                      showSearch
                      optionFilterProp="label"
                      value={pair.mentorLegacyStaffId}
                      options={ccMentors.map((opt) => ({
                        value: opt.legacyStaffId,
                        label: `${opt.displayName} (${opt.storeCode} · #${opt.legacyStaffId})`,
                      }))}
                      onChange={(val) => {
                        const found = ccMentors.find((item) => item.legacyStaffId === val);
                        updatePairAt(idx, {
                          mentorLegacyStaffId: val,
                          mentorDisplayName: found?.displayName || `CC #${val}`,
                          storeCode: found?.storeCode || pair.storeCode,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Mentee Chuyên Viên Tự Chủ
                    </label>
                    <Select
                      className="w-full"
                      size="small"
                      showSearch
                      optionFilterProp="label"
                      value={pair.menteeLegacyStaffId}
                      options={cvlMentees.map((opt) => ({
                        value: opt.legacyStaffId,
                        label: `${opt.displayName} (${opt.storeCode} · #${opt.legacyStaffId})`,
                      }))}
                      onChange={(val) => {
                        const found = cvlMentees.find((item) => item.legacyStaffId === val);
                        updatePairAt(idx, {
                          menteeLegacyStaffId: val,
                          menteeDisplayName: found?.displayName || `CVL #${val}`,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Từ ngày (YYYY-MM-DD)
                    </label>
                    <Input
                      size="small"
                      type="date"
                      className="tabular-nums"
                      value={pair.startDate}
                      onChange={(e) => updatePairAt(idx, { startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Đến ngày (YYYY-MM-DD)
                    </label>
                    <Input
                      size="small"
                      type="date"
                      className="tabular-nums"
                      value={pair.endDate}
                      onChange={(e) => updatePairAt(idx, { endDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Chi nhánh
                    </label>
                    <Select
                      className="w-full"
                      size="small"
                      value={pair.storeCode}
                      options={STORE_OPTIONS}
                      onChange={(val) => updatePairAt(idx, { storeCode: val })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Thưởng cứng Mentor ({formatVND(pair.fixedAllowanceVnd)})
                    </label>
                    <InputNumber
                      size="small"
                      className="w-full tabular-nums"
                      min={0}
                      step={100000}
                      value={pair.fixedAllowanceVnd}
                      onChange={(val) => updatePairAt(idx, { fixedAllowanceVnd: Number(val || 0) })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      % Thưởng Mentee ({Math.round((pair.menteeBonusShareRate || 0) * 100)}%)
                    </label>
                    <InputNumber
                      size="small"
                      className="w-full tabular-nums"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round((pair.menteeBonusShareRate || 0) * 100)}
                      onChange={(val) => updatePairAt(idx, { menteeBonusShareRate: Number(val || 0) / 100 })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Ngưỡng Combo tối thiểu ({Math.round((pair.minComboRateThreshold || 0) * 100)}%)
                    </label>
                    <InputNumber
                      size="small"
                      className="w-full tabular-nums"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((pair.minComboRateThreshold || 0) * 100)}
                      onChange={(val) => updatePairAt(idx, { minComboRateThreshold: Number(val || 0) / 100 })}
                    />
                  </div>
                </div>
              </div>
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
