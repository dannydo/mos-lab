'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  FmBranchCode,
  FmQuestsOverviewResponse,
  SaveFmQuestsConfigRequest,
  SubmitFmTeamDinnerRequest,
} from '@mos-lab/shared';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  ExternalLink,
  Settings2,
  ShieldAlert,
  Sparkles,
  Star,
  Trophy,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { AppleKpiHero, AppleSegmented, AppleSurface } from './ApplePrimitives';
import { FmQuestEditorModal } from './FmQuestEditorModal';
import { FmTeamDinnerModal } from './FmTeamDinnerModal';
import { formatK, formatM } from './fm-simulator.engine';

function getCurrentIsoWeekKey(): string {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  const d = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function shiftIsoWeek(weekKey: string, delta: number): string {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return getCurrentIsoWeekKey();
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000 + (week - 1 + delta) * 7 * 86400000);
  const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const nextWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(nextWeek).padStart(2, '0')}`;
}

export function FmQuestsAndDinnerHub({
  branch: initialBranch,
  compact,
}: {
  readonly branch: FmBranchCode;
  readonly compact: boolean;
}) {
  const [branch, setBranch] = useState<FmBranchCode>(initialBranch);
  const [weekKey, setWeekKey] = useState<string>(getCurrentIsoWeekKey);
  const [overview, setOverview] = useState<FmQuestsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dinnerModalOpen, setDinnerModalOpen] = useState(false);

  useEffect(() => {
    setBranch(initialBranch);
  }, [initialBranch]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.fmQuests.getOverview({ branch, weekKey });
      setOverview(data);
    } catch (err: unknown) {
      setFeedback({ tone: 'err', text: (err as Error)?.message || 'Không tải được dữ liệu Quest & Quỹ Shop.' });
    } finally {
      setLoading(false);
    }
  }, [branch, weekKey]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSaveConfig = async (payload: SaveFmQuestsConfigRequest) => {
    setBusyAction('config');
    try {
      await apiClient.fmQuests.saveConfig(payload);
      setEditorOpen(false);
      setFeedback({ tone: 'ok', text: 'Đã cập nhật bộ Weekly Quest cho toàn hệ thống.' });
      await loadOverview();
    } catch (err: unknown) {
      setFeedback({ tone: 'err', text: (err as Error)?.message || 'Không lưu được cấu hình Quest.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSettleQuest = async (questId: string, overridePass = false) => {
    if (!overview) return;
    setBusyAction(questId);
    try {
      const res = await apiClient.fmQuests.settleQuest({
        branch,
        weekKey: overview.weekKey,
        questId,
        overridePass,
      });
      setFeedback({
        tone: 'ok',
        text: `Đã cộng +${formatK(res.entry.settledAmountVnd)} vào ${overview.shopFund.name} (Số dư mới: ${formatM(res.newBalanceVnd, 2)}).`,
      });
      await loadOverview();
    } catch (err: unknown) {
      setFeedback({ tone: 'err', text: (err as Error)?.message || 'Không thể chốt thưởng Weekly Quest.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitProofPrompt = async (questId: string) => {
    const proofNote = typeof window !== 'undefined' ? window.prompt('Nhập minh chứng hoàn thành quest tuần này:') : '';
    if (!proofNote?.trim()) return;
    setBusyAction(questId);
    try {
      await apiClient.fmQuests.submitProof({
        branch,
        weekKey,
        questId,
        proofNote: proofNote.trim(),
        manualPassed: true,
      });
      setFeedback({ tone: 'ok', text: 'Đã gửi minh chứng Weekly Quest chờ HR/CEO chốt.' });
      await loadOverview();
    } catch (err: unknown) {
      setFeedback({ tone: 'err', text: (err as Error)?.message || 'Lỗi gửi minh chứng quest.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitDinner = async (payload: SubmitFmTeamDinnerRequest) => {
    setBusyAction('dinner');
    try {
      await apiClient.fmQuests.submitDinner(payload);
      setFeedback({ tone: 'ok', text: 'Đã nộp check-in MXH Tiệc Tháng chờ HR/CEO duyệt!' });
      await loadOverview();
    } finally {
      setBusyAction(null);
    }
  };

  const handleReviewDinner = async (dinnerId: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusyAction(dinnerId);
    try {
      await apiClient.fmQuests.reviewDinner(dinnerId, { decision });
      setFeedback({
        tone: 'ok',
        text: decision === 'APPROVED' ? 'Đã duyệt Tiệc Tháng & cập nhật Quỹ Shop.' : 'Đã từ chối hồ sơ Tiệc Tháng.',
      });
      await loadOverview();
    } catch (err: unknown) {
      setFeedback({ tone: 'err', text: (err as Error)?.message || 'Không thể duyệt hồ sơ Tiệc Tháng.' });
    } finally {
      setBusyAction(null);
    }
  };

  const activeQuests = overview?.quests.filter((q) => q.isActive) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AppleSegmented<FmBranchCode>
          ariaLabel="Chọn chi nhánh Quest"
          value={branch}
          onChange={setBranch}
          options={[
            { value: 'dt', label: 'Đề Thám · Quỹ Shop' },
            { value: 'ep', label: 'Estella · Quỹ Shop' },
          ]}
        />

        <div className="inline-flex items-center gap-1 rounded-full border border-black/5 bg-white/80 p-1 shadow-2xs dark:border-white/10 dark:bg-neutral-900/80">
          <button
            type="button"
            aria-label="Tuần trước"
            onClick={() => setWeekKey((w) => shiftIsoWeek(w, -1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 px-2 text-xs font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
            <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
            <span>
              {overview
                ? `${overview.weekKey} (${overview.weekStart.slice(5)} → ${overview.weekEnd.slice(5)})`
                : weekKey}
            </span>
          </span>
          <button
            type="button"
            aria-label="Tuần sau"
            onClick={() => setWeekKey((w) => shiftIsoWeek(w, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-medium ${
            feedback.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="ml-3 underline">
            Ẩn
          </button>
        </div>
      ) : null}

      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-4 gap-3'}>
        <AppleKpiHero
          icon={<Wallet className="h-3.5 w-3.5 text-blue-500" />}
          label="Số dư Quỹ Shop (Live)"
          value={overview ? formatM(overview.shopFund.currentBalanceVnd, 2) : '—'}
          hint={`${overview?.shopFund.code || 'SHOP_FUND'} · Cộng dồn qua tháng`}
          tone="blue"
        />
        <AppleKpiHero
          icon={<Trophy className="h-3.5 w-3.5 text-emerald-500" />}
          label="Quest đã chốt tháng"
          value={overview ? formatM(overview.monthSettledQuestVnd, 2) : '—'}
          hint={
            overview?.monthlyQuestCapVnd ? `Trần ${formatM(overview.monthlyQuestCapVnd, 1)}` : 'Không giới hạn trần'
          }
          tone="emerald"
        />
        <AppleKpiHero
          icon={<Star className="h-3.5 w-3.5 text-amber-500" />}
          label="Trụ #8 · Tiệc Tháng"
          value={overview ? `${overview.bondingSummary.effectiveStar}★` : '—'}
          hint={
            overview && overview.bondingSummary.approvedDinnerCount > 0
              ? `Cao nhất ${overview.bondingSummary.bestAttendancePct}% · Đã duyệt ${overview.bondingSummary.approvedDinnerCount}`
              : 'Chưa duyệt tiệc check-in MXH'
          }
          tone="amber"
        />
        <AppleKpiHero
          icon={<ShieldAlert className="h-3.5 w-3.5 text-rose-500" />}
          label="Trạng thái Khiên Tiệc"
          value={overview?.bondingSummary.missingDinnerShieldPenalty === 0 ? 'An toàn' : '-1 Khiên'}
          hint={
            overview?.bondingSummary.missingDinnerShieldPenalty === 0
              ? 'Đã có tiệc tháng + check-in MXH'
              : 'Thiếu tiệc tháng hoặc ảnh MXH'
          }
          tone={overview?.bondingSummary.missingDinnerShieldPenalty === 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Weekly Quests Section */}
      <AppleSurface className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                Weekly Quest Nạp Quỹ Shop ({activeQuests.length} nhiệm vụ đang bật)
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Thưởng 100% cộng thẳng vào{' '}
                <Link
                  href="/dashboard/funds"
                  className="inline-flex items-center gap-0.5 text-blue-600 underline dark:text-blue-400"
                >
                  <span>Quỹ Hoạt Động Nội Bộ</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {overview?.permissions.canManageQuests ? (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 text-xs font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Chỉnh Weekly Quest (HR/CEO)</span>
            </button>
          ) : null}
        </div>

        {loading && !overview ? (
          <div className="py-6 text-center text-xs text-neutral-400">Đang đồng bộ số liệu live từ cửa hàng...</div>
        ) : (
          <div className="space-y-2.5">
            {activeQuests.map((quest) => {
              const ev = overview?.evaluations.find((e) => e.questId === quest.id);
              return (
                <div
                  key={quest.id}
                  className="rounded-2xl border border-black/5 bg-neutral-50/70 p-3.5 dark:border-white/10 dark:bg-neutral-800/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            ev?.settled
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : ev?.passed
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {ev?.settled ? (
                            <>
                              <Coins className="h-3 w-3" />
                              <span>Đã nạp +{formatK(ev.settledAmountVnd)}</span>
                            </>
                          ) : ev?.passed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Đạt chuẩn tuần</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              <span>Đang chạy / Chưa đạt</span>
                            </>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white">{quest.title}</span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{quest.description}</p>
                      <div className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                        Tiến độ live: {ev?.metricSummary || 'Chưa có dữ liệu'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatK(quest.rewardVnd)}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {!ev?.settled && overview?.permissions.canSubmitDinner && quest.type === 'custom' ? (
                          <button
                            type="button"
                            disabled={busyAction === quest.id}
                            onClick={() => handleSubmitProofPrompt(quest.id)}
                            className="inline-flex min-h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                          >
                            Nộp minh chứng
                          </button>
                        ) : null}

                        {!ev?.settled && overview?.permissions.canManageQuests ? (
                          <button
                            type="button"
                            disabled={busyAction === quest.id}
                            onClick={() => handleSettleQuest(quest.id, !ev?.passed)}
                            className="inline-flex min-h-8 items-center rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {ev?.passed ? 'Chốt nạp Quỹ Shop' : 'Chốt ngoại lệ (+Quỹ)'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {ev && ev.detailItems.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                        Xem chi tiết ({ev.detailItems.length} mục)
                      </summary>
                      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {ev.detailItems.map((item, i) => (
                          <div
                            key={`${quest.id}-${i}`}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 text-xs dark:bg-neutral-900/70"
                          >
                            <span className="truncate text-neutral-700 dark:text-neutral-200">{item.label}</span>
                            <span
                              className={`shrink-0 font-semibold tabular-nums ${
                                item.passed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {item.countText}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </AppleSurface>

      {/* Monthly Team Dinner Section */}
      <AppleSurface className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                Tiệc Tháng &amp; Check-in MXH ({overview?.monthKey || 'Tháng này'})
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                70% = 1★ (150K) · 80% = 2★ (300K) · 90% = 3★ (450K) · Chi trực tiếp từ Quỹ Shop
              </div>
            </div>
          </div>

          {overview?.permissions.canSubmitDinner ? (
            <button
              type="button"
              onClick={() => setDinnerModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Nộp Check-in Tiệc Tháng</span>
            </button>
          ) : null}
        </div>

        {!overview || overview.dinners.length === 0 ? (
          <div className="rounded-2xl bg-neutral-100/80 px-4 py-5 text-center text-xs text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
            Chưa có bữa tiệc nào được ghi nhận trong tháng {overview?.monthKey || ''}. Tổ chức ít nhất 1 lần + ảnh
            check-in MXH để giữ Khiên Tuần &amp; mở Trụ #8.
          </div>
        ) : (
          <div className="space-y-2.5">
            {overview.dinners.map((dinner) => (
              <div
                key={dinner.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-neutral-50/70 p-3.5 dark:border-white/10 dark:bg-neutral-800/50"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        dinner.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : dinner.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {dinner.status === 'APPROVED'
                        ? `Đã duyệt (${dinner.computedStar}★)`
                        : dinner.status === 'REJECTED'
                          ? 'Từ chối'
                          : `Chờ duyệt (${dinner.computedStar}★)`}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">{dinner.venueName}</span>
                    <span className="text-[11px] tabular-nums text-neutral-400">{dinner.eventDate}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="tabular-nums">
                      Tham gia: {dinner.attendeeCount}/{dinner.totalHeadcount} NV ({dinner.attendancePct}%)
                    </span>
                    <span className="tabular-nums">
                      Chi: {formatK(dinner.amountSpentVnd)} {dinner.deductFromShopFund ? '(từ Quỹ Shop)' : ''}
                    </span>
                    <a
                      href={dinner.socialCheckinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-blue-600 underline dark:text-blue-400"
                    >
                      <span>Ảnh Check-in MXH</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {dinner.status === 'PENDING' && overview.permissions.canReviewDinner ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busyAction === dinner.id}
                      onClick={() => handleReviewDinner(dinner.id, 'REJECTED')}
                      className="inline-flex min-h-8 items-center rounded-lg border border-rose-200 px-2.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === dinner.id}
                      onClick={() => handleReviewDinner(dinner.id, 'APPROVED')}
                      className="inline-flex min-h-8 items-center rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Duyệt {dinner.deductFromShopFund && dinner.amountSpentVnd > 0 ? '& Trừ Quỹ' : ''}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AppleSurface>

      {overview ? (
        <>
          <FmQuestEditorModal
            open={editorOpen}
            initialQuests={overview.quests}
            initialMonthlyCapVnd={overview.monthlyQuestCapVnd}
            saving={busyAction === 'config'}
            onClose={() => setEditorOpen(false)}
            onSave={handleSaveConfig}
          />
          <FmTeamDinnerModal
            open={dinnerModalOpen}
            branch={branch}
            monthKey={overview.monthKey}
            saving={busyAction === 'dinner'}
            onClose={() => setDinnerModalOpen(false)}
            onSubmit={handleSubmitDinner}
          />
        </>
      ) : null}
    </div>
  );
}
