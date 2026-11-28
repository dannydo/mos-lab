'use client';

import React, { useState } from 'react';
import type {
  FmBranchCode,
  FmWeeklyQuestDefinition,
  FmWeeklyQuestType,
  SaveFmQuestsConfigRequest,
} from '@mos-lab/shared';
import { Plus, Save, Trash2, X } from 'lucide-react';

interface FmQuestEditorModalProps {
  readonly open: boolean;
  readonly initialQuests: FmWeeklyQuestDefinition[];
  readonly initialMonthlyCapVnd: number | null;
  readonly saving: boolean;
  readonly onClose: () => void;
  readonly onSave: (payload: SaveFmQuestsConfigRequest) => Promise<void>;
}

const QUEST_TYPE_OPTIONS: Array<{ value: FmWeeklyQuestType; label: string }> = [
  { value: 'undermink', label: 'Tự động · Undermink / CV' },
  { value: 'banana_no_late', label: 'Tự động · 100% Tặng Chuối (0 Đi Trễ)' },
  { value: 'fal_weekly_cap', label: 'Tự động · Trần FAL Tuần (F/A/L)' },
  { value: 'custom', label: 'Tùy chỉnh · HR & CEO tự thiết kế' },
];

export function FmQuestEditorModal({
  open,
  initialQuests,
  initialMonthlyCapVnd,
  saving,
  onClose,
  onSave,
}: FmQuestEditorModalProps) {
  const [monthlyCap, setMonthlyCap] = useState<string>(
    initialMonthlyCapVnd != null && initialMonthlyCapVnd > 0 ? String(initialMonthlyCapVnd) : ''
  );
  const [quests, setQuests] = useState<FmWeeklyQuestDefinition[]>(() =>
    initialQuests.map((q) => ({ ...q, targetConfig: { ...q.targetConfig } }))
  );

  if (!open) return null;

  const updateQuest = (idx: number, patch: Partial<FmWeeklyQuestDefinition>) => {
    setQuests((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const addCustomQuest = () => {
    const nextIdx = quests.length + 1;
    setQuests((prev) => [
      ...prev,
      {
        id: `quest-custom-${Date.now()}`,
        code: `QUEST_${nextIdx}`,
        title: 'Quest Văn Hóa Mới',
        description: 'Mô tả điều kiện đạt thưởng tuần cho chi nhánh',
        type: 'custom',
        rewardVnd: 400_000,
        branchScope: 'all',
        isActive: true,
        targetConfig: { customCriteria: 'Chụp ảnh / báo cáo xác nhận đạt KPI tuần' },
        sortOrder: nextIdx,
        updatedAt: new Date().toISOString(),
        updatedBy: 'HR/CEO',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCap = monthlyCap.trim() ? Math.max(0, Number(monthlyCap)) : null;
    await onSave({
      monthlyQuestCapVnd: parsedCap && parsedCap > 0 ? parsedCap : null,
      quests,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cấu hình Weekly Quest FM"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Quản Lý Weekly Quest (HR &amp; CEO)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Bật/tắt, chỉnh tiền thưởng VND và thiết kế nhiệm vụ tuần nạp vào Quỹ Shop
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            <div className="rounded-2xl bg-neutral-100/80 p-3.5 dark:bg-neutral-800/70">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Trần tổng thưởng Weekly Quest / tháng (VND · để trống = không giới hạn)
              </label>
              <input
                type="number"
                min={0}
                step={100_000}
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
                placeholder="Ví dụ: 4800000"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs tabular-nums text-neutral-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              />
            </div>

            {quests.map((quest, idx) => (
              <div
                key={quest.id}
                className="space-y-2.5 rounded-2xl border border-black/5 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-neutral-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuest(idx, { isActive: !quest.isActive })}
                      className={`inline-flex min-h-8 items-center rounded-lg px-2.5 text-[11px] font-semibold ${
                        quest.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {quest.isActive ? 'Đang bật' : 'Tạm tắt'}
                    </button>
                    <select
                      value={quest.type}
                      onChange={(e) => updateQuest(idx, { type: e.target.value as FmWeeklyQuestType })}
                      className="min-h-8 rounded-lg border border-black/10 bg-neutral-50 px-2 text-xs text-neutral-800 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      {QUEST_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={quest.branchScope}
                      onChange={(e) => updateQuest(idx, { branchScope: e.target.value as 'all' | FmBranchCode })}
                      className="min-h-8 rounded-lg border border-black/10 bg-neutral-50 px-2 text-xs text-neutral-800 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <option value="all">Tất cả Shop</option>
                      <option value="dt">Chỉ Đề Thám</option>
                      <option value="ep">Chỉ Estella Place</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Xóa ${quest.title}`}
                      disabled={quests.length <= 1}
                      onClick={() => setQuests((prev) => prev.filter((_, i) => i !== idx))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={quest.title}
                      onChange={(e) => updateQuest(idx, { title: e.target.value })}
                      placeholder="Tên Weekly Quest"
                      className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs font-medium text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      step={50_000}
                      value={quest.rewardVnd}
                      onChange={(e) => updateQuest(idx, { rewardVnd: Math.max(0, Number(e.target.value || 0)) })}
                      placeholder="Thưởng VND"
                      className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold tabular-nums text-emerald-700 dark:border-white/10 dark:bg-neutral-950 dark:text-emerald-400"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={quest.description}
                  onChange={(e) => updateQuest(idx, { description: e.target.value })}
                  placeholder="Mô tả quy tắc quest"
                  className="min-h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-neutral-600 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"
                />

                {quest.type === 'undermink' ? (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
                    <label className="inline-flex items-center gap-1.5">
                      <span>Bộ Undermink / CV:</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={quest.targetConfig?.minUnderminkPerCv ?? 2}
                        onChange={(e) =>
                          updateQuest(idx, {
                            targetConfig: { ...quest.targetConfig, minUnderminkPerCv: Number(e.target.value || 2) },
                          })
                        }
                        className="min-h-8 w-16 rounded-lg border border-black/10 bg-white px-2 text-center tabular-nums dark:border-white/10 dark:bg-neutral-950"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <span>% CV tối thiểu đạt:</span>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        step={5}
                        value={quest.targetConfig?.minPassRatioPct ?? 85}
                        onChange={(e) =>
                          updateQuest(idx, {
                            targetConfig: { ...quest.targetConfig, minPassRatioPct: Number(e.target.value || 85) },
                          })
                        }
                        className="min-h-8 w-16 rounded-lg border border-black/10 bg-white px-2 text-center tabular-nums dark:border-white/10 dark:bg-neutral-950"
                      />
                      <span>%</span>
                    </label>
                  </div>
                ) : null}

                {quest.type === 'fal_weekly_cap' ? (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
                    <label className="inline-flex items-center gap-1.5">
                      <span>Max Fix:</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={quest.targetConfig?.maxFix ?? 1}
                        onChange={(e) =>
                          updateQuest(idx, {
                            targetConfig: { ...quest.targetConfig, maxFix: Number(e.target.value || 0) },
                          })
                        }
                        className="min-h-8 w-16 rounded-lg border border-black/10 bg-white px-2 text-center tabular-nums dark:border-white/10 dark:bg-neutral-950"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <span>Max Adjust:</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={quest.targetConfig?.maxAdjust ?? 1}
                        onChange={(e) =>
                          updateQuest(idx, {
                            targetConfig: { ...quest.targetConfig, maxAdjust: Number(e.target.value || 0) },
                          })
                        }
                        className="min-h-8 w-16 rounded-lg border border-black/10 bg-white px-2 text-center tabular-nums dark:border-white/10 dark:bg-neutral-950"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <span>Max Log:</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={quest.targetConfig?.maxLog ?? 1}
                        onChange={(e) =>
                          updateQuest(idx, {
                            targetConfig: { ...quest.targetConfig, maxLog: Number(e.target.value || 0) },
                          })
                        }
                        className="min-h-8 w-16 rounded-lg border border-black/10 bg-white px-2 text-center tabular-nums dark:border-white/10 dark:bg-neutral-950"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ))}

            <button
              type="button"
              onClick={addCustomQuest}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-neutral-800/50"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Weekly Quest tùy chỉnh mới</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-black/5 px-5 py-3.5 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center rounded-xl px-4 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Cấu Hình Quest'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
