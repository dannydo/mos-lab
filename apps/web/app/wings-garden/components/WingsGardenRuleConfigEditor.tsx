'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  computeWingsGardenEconomyPreview,
  DEFAULT_WINGS_GARDEN_FEATHER_RULES,
  type WingsGardenChestKind,
  type WingsGardenClaimMode,
  type WingsGardenFeatherRule,
  type WingsGardenMilestoneTier,
  type WingsGardenPreviewRole,
  type WingsGardenStateResponse,
} from '@mos-lab/shared';
import { Calculator, Plus, RotateCcw, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge } from './GardenVisuals';

export interface WingsGardenRuleConfigEditorProps {
  state: WingsGardenStateResponse;
  busy: boolean;
  onSaveFeatherRules: (rules: WingsGardenFeatherRule[]) => Promise<boolean> | void;
}

const ALL_ROLES: WingsGardenPreviewRole[] = ['CV', 'CVL', 'CVLL', 'FM', 'ADMIN'];

function cloneRules(rules: WingsGardenFeatherRule[]): WingsGardenFeatherRule[] {
  return rules.map((r) => ({
    ...r,
    roles: [...(r.roles || [])],
    milestoneTiers: r.milestoneTiers ? r.milestoneTiers.map((t) => ({ ...t })) : undefined,
  }));
}

function renderRoleLabel(role: WingsGardenPreviewRole, active: boolean) {
  const featherTone = active ? 'w-3 h-3 text-slate-950' : 'w-3 h-3 text-amber-500';
  if (role === 'CVL') return <CvFeather1Badge featherClass={featherTone} />;
  if (role === 'CVLL') return <CvFeather2Badge featherClass={featherTone} />;
  if (role === 'ADMIN') return 'Admin';
  return role;
}

export function WingsGardenRuleConfigEditor({ state, busy, onSaveFeatherRules }: WingsGardenRuleConfigEditorProps) {
  const serverFingerprint = useMemo(
    () => JSON.stringify(state.config.featherRules || DEFAULT_WINGS_GARDEN_FEATHER_RULES),
    [state.config.featherRules]
  );

  const [draftRules, setDraftRules] = useState<WingsGardenFeatherRule[]>(() =>
    cloneRules(state.config.featherRules?.length ? state.config.featherRules : DEFAULT_WINGS_GARDEN_FEATHER_RULES)
  );
  const [newRuleOpen, setNewRuleOpen] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newFeathers, setNewFeathers] = useState<string>('10');
  const [newClaimMode, setNewClaimMode] = useState<WingsGardenClaimMode>('CLAIM');

  useEffect(() => {
    setDraftRules(
      cloneRules(state.config.featherRules?.length ? state.config.featherRules : DEFAULT_WINGS_GARDEN_FEATHER_RULES)
    );
  }, [serverFingerprint, state.config.featherRules]);

  const preview = useMemo(
    () => computeWingsGardenEconomyPreview({ ...state.config, featherRules: draftRules }),
    [state.config, draftRules]
  );

  const isBalanced = preview.standardDayFeathers >= 45 && preview.standardDayFeathers <= 150;

  const updateRule = (ruleId: string, updater: (rule: WingsGardenFeatherRule) => WingsGardenFeatherRule) => {
    setDraftRules((prev) => prev.map((r) => (r.ruleId === ruleId ? updater(r) : r)));
  };

  const toggleRole = (ruleId: string, role: WingsGardenPreviewRole) => {
    updateRule(ruleId, (r) => {
      const exists = r.roles.includes(role);
      const next = exists ? r.roles.filter((x) => x !== role) : [...r.roles, role];
      return { ...r, roles: next.length > 0 ? next : [role] };
    });
  };

  const handleAddCustomRule = () => {
    const label = newLabel.trim();
    if (!label) return;
    const feathersVal = Math.max(0, Math.min(500, Math.round(Number(newFeathers) || 10)));
    const nextRule: WingsGardenFeatherRule = {
      ruleId: `custom-${Date.now()}`,
      trigger: 'CUSTOM',
      label,
      description: newDesc.trim() || 'Luật thưởng Lông tùy chỉnh bởi Admin',
      enabled: true,
      feathers: feathersVal,
      claimMode: newClaimMode,
      roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
      isSystem: false,
    };
    setDraftRules((prev) => [...prev, nextRule]);
    setNewLabel('');
    setNewDesc('');
    setNewFeathers('10');
    setNewRuleOpen(false);
  };

  return (
    <section
      aria-label="Cấu hình luật thưởng Lông"
      className="rounded-2xl bg-white/95 text-slate-900 border-2 border-amber-300 p-3 space-y-3 text-xs shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-extrabold text-amber-900">
          <SlidersHorizontal className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>Cơ Chế Nhận Lông · Luật Thưởng (Admin Config)</span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDraftRules(cloneRules(DEFAULT_WINGS_GARDEN_FEATHER_RULES))}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          <span>Mặc định</span>
        </button>
      </div>

      {/* Live Economy Calculator */}
      <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-2.5 space-y-1.5 tabular-nums">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Calculator className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
            <span>Máy Tính Cân Bằng Lông (Live)</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold leading-none ${
              isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isBalanced ? 'Cân bằng tốt' : preview.standardDayFeathers > 150 ? 'Hơi cao' : 'Hơi thấp'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-white/90 border border-amber-200 p-1.5">
            <div className="text-slate-500">1 ngày chuẩn</div>
            <div className="font-black text-amber-900">+{preview.standardDayFeathers} Lông</div>
          </div>
          <div className="rounded-lg bg-white/90 border border-amber-200 p-1.5">
            <div className="text-slate-500">Quy đổi Keo Đen</div>
            <div className="font-black text-slate-900">{preview.glueBottleEquivalent} chai</div>
          </div>
          <div className="rounded-lg bg-white/90 border border-amber-200 p-1.5">
            <div className="text-slate-500">Độ Cánh Bậc 2</div>
            <div className="font-black text-emerald-700">{preview.wing2Pct}%</div>
          </div>
        </div>
        <div className="text-slate-600">{preview.breakdown}</div>
      </div>

      {/* Rules List */}
      <div className="space-y-2.5">
        {draftRules.map((rule) => {
          const isMilestone = rule.trigger === 'DAILY_LASH_MILESTONE';
          const isRefill = rule.trigger === 'LASH_REFILL';
          const isCombo = rule.trigger === 'CUSTOMER_COMBO_BUY';

          return (
            <div
              key={rule.ruleId}
              className={`rounded-xl border p-2.5 space-y-2 ${
                rule.enabled ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200 bg-slate-100 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 leading-snug">{rule.label}</div>
                  <div className="text-slate-500 leading-snug">{rule.description}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!rule.isSystem && (
                    <button
                      type="button"
                      aria-label={`Xoá luật ${rule.label}`}
                      onClick={() => setDraftRules((prev) => prev.filter((x) => x.ruleId !== rule.ruleId))}
                      className="p-1 rounded-lg bg-rose-100 text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateRule(rule.ruleId, (r) => ({ ...r, enabled: !r.enabled }))}
                    className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                      rule.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {rule.enabled ? 'Đang bật' : 'Đã tắt'}
                  </button>
                </div>
              </div>

              {/* Base Feathers + Claim Mode */}
              <div className="grid grid-cols-12 gap-1.5 items-center">
                {!isMilestone ? (
                  <label className="col-span-5 flex items-center justify-between gap-1 bg-white rounded-lg border border-slate-200 px-2 py-1">
                    <span className="text-slate-600 font-semibold whitespace-nowrap">Lông:</span>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      aria-label={`Số Lông ${rule.label}`}
                      value={rule.feathers}
                      onChange={(e) => {
                        const n = Math.max(0, Math.min(500, Math.round(Number(e.target.value) || 0)));
                        updateRule(rule.ruleId, (r) => ({ ...r, feathers: n }));
                      }}
                      className="w-14 text-right font-bold text-amber-900 bg-amber-50 rounded-md px-1.5 py-0.5 border border-amber-200 tabular-nums"
                    />
                  </label>
                ) : (
                  <div className="col-span-5 text-slate-600 font-semibold px-1 leading-tight">Thưởng theo bậc</div>
                )}

                <div className="col-span-7 grid grid-cols-2 gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateRule(rule.ruleId, (r) => ({ ...r, claimMode: 'AUTO' }))}
                    className={`py-1 px-1 rounded-md font-bold whitespace-nowrap cursor-pointer ${
                      rule.claimMode === 'AUTO' ? 'bg-slate-900 text-amber-300' : 'text-slate-600'
                    }`}
                  >
                    Tự cộng
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRule(rule.ruleId, (r) => ({ ...r, claimMode: 'CLAIM' }))}
                    className={`py-1 px-1 rounded-md font-bold whitespace-nowrap cursor-pointer ${
                      rule.claimMode === 'CLAIM' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                    }`}
                  >
                    Bấm nhận ✨
                  </button>
                </div>
              </div>

              {/* Refill Weight Selector */}
              {isRefill && (
                <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="text-slate-600 font-semibold">Quy đổi vào mốc ngày:</span>
                  <div className="flex gap-1 tabular-nums">
                    {[0, 0.5, 1].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateRule(rule.ruleId, (r) => ({ ...r, refillSetWeight: w }))}
                        className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                          (rule.refillSetWeight ?? 0.5) === w
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {w} bộ
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Combo Attribution Window */}
              {isCombo && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5 tabular-nums">
                  <span className="text-slate-600 font-semibold">Cửa sổ ghi nhận Combo:</span>
                  <div className="flex items-center gap-1">
                    {[0, 3, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => updateRule(rule.ruleId, (r) => ({ ...r, comboAttributionWindowDays: days }))}
                        className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                          (rule.comboAttributionWindowDays ?? 0) === days
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {days === 0 ? 'Cùng ngày' : `${days}d`}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={0}
                      max={30}
                      aria-label="Cửa sổ ghi nhận Combo (ngày)"
                      value={rule.comboAttributionWindowDays ?? 0}
                      onChange={(e) => {
                        const d = Math.max(0, Math.min(30, Math.round(Number(e.target.value) || 0)));
                        updateRule(rule.ruleId, (r) => ({ ...r, comboAttributionWindowDays: d }));
                      }}
                      className="w-12 text-right font-bold bg-slate-50 border border-slate-200 rounded-md px-1 py-0.5"
                    />
                  </div>
                </div>
              )}

              {/* Daily Milestone Tiers Editor */}
              {isMilestone && (
                <div className="rounded-lg bg-white border border-amber-200 p-2 space-y-1.5 tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">Bậc thang mốc ngày (3 / 4 / 5+ bộ):</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateRule(rule.ruleId, (r) => {
                          const existing = r.milestoneTiers || [];
                          const maxSets = existing.reduce((m, t) => Math.max(m, t.thresholdSets), 2);
                          const nextTier: WingsGardenMilestoneTier = {
                            id: `m-${Date.now()}`,
                            thresholdSets: Math.min(20, maxSets + 1),
                            feathers: 35,
                            bonusChest: null,
                          };
                          return { ...r, milestoneTiers: [...existing, nextTier] };
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" /> Thêm bậc
                    </button>
                  </div>
                  {(rule.milestoneTiers || []).map((tier, idx) => (
                    <div key={tier.id} className="grid grid-cols-12 gap-1 items-center">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        aria-label={`Ngưỡng bộ mốc ${idx + 1}`}
                        value={tier.thresholdSets}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                          updateRule(rule.ruleId, (r) => ({
                            ...r,
                            milestoneTiers: (r.milestoneTiers || []).map((t) =>
                              t.id === tier.id ? { ...t, thresholdSets: val } : t
                            ),
                          }));
                        }}
                        className="col-span-3 px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 font-bold text-center"
                      />
                      <input
                        type="number"
                        min={1}
                        max={500}
                        aria-label={`Lông thưởng mốc ${idx + 1}`}
                        value={tier.feathers}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1)));
                          updateRule(rule.ruleId, (r) => ({
                            ...r,
                            milestoneTiers: (r.milestoneTiers || []).map((t) =>
                              t.id === tier.id ? { ...t, feathers: val } : t
                            ),
                          }));
                        }}
                        className="col-span-3 px-1.5 py-1 rounded-md border border-amber-200 bg-amber-50 font-bold text-center text-amber-900"
                      />
                      <select
                        aria-label={`Rương thưởng mốc ${idx + 1}`}
                        value={tier.bonusChest || ''}
                        onChange={(e) => {
                          const chest = (e.target.value || null) as WingsGardenChestKind | null;
                          updateRule(rule.ruleId, (r) => ({
                            ...r,
                            milestoneTiers: (r.milestoneTiers || []).map((t) =>
                              t.id === tier.id ? { ...t, bonusChest: chest } : t
                            ),
                          }));
                        }}
                        className="col-span-5 px-1 py-1 rounded-md border border-slate-200 bg-slate-50 font-semibold"
                      >
                        <option value="">Không rương</option>
                        <option value="bronze">+ Rương Đồng</option>
                        <option value="silver">+ Rương Bạc</option>
                        <option value="gold">+ Rương Vàng</option>
                      </select>
                      {(rule.milestoneTiers || []).length > 1 && (
                        <button
                          type="button"
                          aria-label={`Xoá mốc ${idx + 1}`}
                          onClick={() =>
                            updateRule(rule.ruleId, (r) => ({
                              ...r,
                              milestoneTiers: (r.milestoneTiers || []).filter((t) => t.id !== tier.id),
                            }))
                          }
                          className="col-span-1 p-1 text-rose-600 font-bold cursor-pointer text-center"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Role Applicability Pills */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-slate-500 font-semibold mr-1">Áp dụng:</span>
                {ALL_ROLES.map((role) => {
                  const active = rule.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(rule.ruleId, role)}
                      className={`px-2 py-0.5 rounded-md font-bold inline-flex items-center justify-center leading-none cursor-pointer border ${
                        active
                          ? 'bg-amber-400 text-slate-950 border-amber-500'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {renderRoleLabel(role, active)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Rule Box */}
      {!newRuleOpen ? (
        <button
          type="button"
          onClick={() => setNewRuleOpen(true)}
          className="w-full py-2 rounded-xl border border-dashed border-amber-400 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Thêm luật thưởng mới</span>
        </button>
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-2.5 space-y-2">
          <div className="font-bold text-amber-900">Tạo Luật Thưởng Lông Mới</div>
          <input
            type="text"
            placeholder="Tên luật (VD: Quay TikTok Review Mi)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          />
          <input
            type="text"
            placeholder="Mô tả ngắn gọn điều kiện nhận"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              max={500}
              value={newFeathers}
              onChange={(e) => setNewFeathers(e.target.value)}
              aria-label="Số Lông luật mới"
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white tabular-nums font-bold"
            />
            <select
              value={newClaimMode}
              onChange={(e) => setNewClaimMode(e.target.value as WingsGardenClaimMode)}
              className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
            >
              <option value="CLAIM">Bấm nhận ✨</option>
              <option value="AUTO">Tự cộng ngay</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddCustomRule}
              className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
            >
              Thêm vào danh sách
            </button>
            <button
              type="button"
              onClick={() => setNewRuleOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Save Feather Rules Button */}
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSaveFeatherRules(draftRules)}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        <span>Lưu Cấu Hình Luật Lên Server</span>
      </button>
    </section>
  );
}
