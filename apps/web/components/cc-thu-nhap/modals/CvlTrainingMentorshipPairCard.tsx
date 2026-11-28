'use client';

import React, { useMemo, useState } from 'react';
import { Button, Input, InputNumber, Popconfirm, Select, Switch } from 'antd';
import { ArrowRight, CalendarDays, CheckCircle2, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import type {
  CvlMenteeLifecycleSummary,
  CvlTrainingMentorshipPair,
  CvlTrainingMentorshipStaffOption,
} from '@mos-lab/shared';
import { StatusTag, type StatusType } from '~/components/ui';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { formatVND } from '~/lib/format-utils';

export interface ResolveMentorshipOutcomePayload {
  pairId: string;
  action: 'GRADUATE' | 'EXTEND' | 'RETURN_TO_CV';
  newStartDate?: string;
  newEndDate?: string;
  mentorLegacyStaffId?: number;
  mentorDisplayName?: string;
  note?: string;
}

export interface CvlTrainingMentorshipPairCardProps {
  pair: CvlTrainingMentorshipPair;
  index: number;
  isSavedPair: boolean;
  resolvingPairId: string | null;
  todayYmd: string;
  ccMentors: CvlTrainingMentorshipStaffOption[];
  cvlMentees: CvlTrainingMentorshipStaffOption[];
  menteeLifecycleByStaffId: Record<number, CvlMenteeLifecycleSummary>;
  onUpdate: (index: number, patch: Partial<CvlTrainingMentorshipPair>) => void;
  onRemove: (index: number) => void;
  onResolveOutcome: (payload: ResolveMentorshipOutcomePayload) => Promise<void>;
}

const STORE_OPTIONS = [
  { value: 'DT', label: 'Đề Thám (DT)' },
  { value: 'EP', label: 'Estella Place (EP)' },
  { value: 'PXL', label: 'Phan Xích Long (PXL)' },
];

function computeDefaultExtensionRange(currentEndDate: string): { start: string; end: string } {
  const parts = currentEndDate.split('-').map(Number);
  if (parts.length === 3 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1]) && !Number.isNaN(parts[2])) {
    const endD = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const nextStart = new Date(endD.getTime() + 86_400_000);
    const nextEnd = new Date(Date.UTC(nextStart.getUTCFullYear(), nextStart.getUTCMonth() + 1, 0));
    return {
      start: nextStart.toISOString().slice(0, 10),
      end: nextEnd.toISOString().slice(0, 10),
    };
  }
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { start: `${ym}-01`, end: `${ym}-${String(lastDay).padStart(2, '0')}` };
}

function getPairBadgeMeta(pair: CvlTrainingMentorshipPair, todayYmd: string): { status: StatusType; label: string } {
  if (pair.outcome === 'GRADUATED') return { status: 'success', label: 'Đã lên CVL Chính thức' };
  if (pair.outcome === 'EXTENDED') return { status: 'processing', label: 'Đã gia hạn' };
  if (pair.outcome === 'RETURNED_TO_CV') return { status: 'default', label: 'Đã trả về CV' };
  if (!pair.isActive) return { status: 'default', label: 'Tạm tắt' };
  if (todayYmd < pair.startDate) return { status: 'cyan', label: 'Sắp bắt đầu' };
  if (todayYmd > pair.endDate) return { status: 'warning', label: 'Chờ chốt tốt nghiệp' };
  return { status: 'gold', label: 'Đang Training' };
}

function formatMenteeLifecycleHint(summary?: CvlMenteeLifecycleSummary, roleGroup?: string): string {
  if (!summary) return roleGroup || 'CV';
  if (summary.status === 'TRAINING') return 'Đang Training';
  if (summary.status === 'PENDING_GRADUATION') return 'Chờ chốt';
  if (summary.status === 'OFFICIAL') return 'CVL Chính thức';
  return roleGroup || 'CV';
}

export function CvlTrainingMentorshipPairCard({
  pair,
  index,
  isSavedPair,
  resolvingPairId,
  todayYmd,
  ccMentors,
  cvlMentees,
  menteeLifecycleByStaffId,
  onUpdate,
  onRemove,
  onResolveOutcome,
}: CvlTrainingMentorshipPairCardProps) {
  const defaultExt = useMemo(() => computeDefaultExtensionRange(pair.endDate), [pair.endDate]);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extStart, setExtStart] = useState(defaultExt.start);
  const [extEnd, setExtEnd] = useState(defaultExt.end);

  const badge = getPairBadgeMeta(pair, todayYmd);
  const isResolved = pair.outcome === 'GRADUATED' || pair.outcome === 'EXTENDED' || pair.outcome === 'RETURNED_TO_CV';
  const isResolving = resolvingPairId === pair.id;
  const mentorRolePrefix = pair.mentorRoleGroup || 'CC';

  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors ${
        pair.isActive && !isResolved
          ? 'border-purple-500/40 bg-slate-50/70 dark:bg-slate-900/70'
          : 'border-slate-200 bg-slate-100/50 opacity-85 dark:border-slate-800 dark:bg-slate-900/30'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status={badge.status} label={badge.label} />
          <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
            [{mentorRolePrefix}] {pair.mentorDisplayName}
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
          <Switch size="small" checked={pair.isActive} onChange={(checked) => onUpdate(index, { isActive: checked })} />
          <Button
            size="small"
            danger
            type="text"
            aria-label={`Xóa cặp đào tạo ${pair.mentorDisplayName} và ${pair.menteeDisplayName}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Mentor kèm cặp (CC / CVL / CVLL)
          </label>
          <Select
            className="w-full"
            size="small"
            showSearch
            optionFilterProp="label"
            value={pair.mentorLegacyStaffId}
            options={ccMentors.map((opt) => ({
              value: opt.legacyStaffId,
              label: `[${opt.roleGroup}] ${opt.displayName} (${opt.storeCode} · #${opt.legacyStaffId})`,
            }))}
            onChange={(val) => {
              const found = ccMentors.find((item) => item.legacyStaffId === val);
              onUpdate(index, {
                mentorLegacyStaffId: val,
                mentorDisplayName: found?.displayName || `Mentor #${val}`,
                mentorRoleGroup: found?.roleGroup === 'CVL' || found?.roleGroup === 'CVLL' ? found.roleGroup : 'CC',
                storeCode: found?.storeCode || pair.storeCode,
              });
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Mentee CVL Training (1-kèm-1)
          </label>
          <Select
            className="w-full"
            size="small"
            showSearch
            optionFilterProp="label"
            value={pair.menteeLegacyStaffId}
            options={cvlMentees.map((opt) => {
              const hint = formatMenteeLifecycleHint(menteeLifecycleByStaffId[opt.legacyStaffId], opt.roleGroup);
              return {
                value: opt.legacyStaffId,
                label: `${opt.displayName} · ${hint} (${opt.storeCode} · #${opt.legacyStaffId})`,
              };
            })}
            onChange={(val) => {
              const found = cvlMentees.find((item) => item.legacyStaffId === val);
              onUpdate(index, {
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
            onChange={(e) => onUpdate(index, { startDate: e.target.value })}
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
            onChange={(e) => onUpdate(index, { endDate: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Chi nhánh</label>
          <Select
            className="w-full"
            size="small"
            value={pair.storeCode}
            options={STORE_OPTIONS}
            onChange={(val) => onUpdate(index, { storeCode: val })}
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
            onChange={(val) => onUpdate(index, { fixedAllowanceVnd: Number(val || 0) })}
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
            onChange={(val) => onUpdate(index, { menteeBonusShareRate: Number(val || 0) / 100 })}
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
            onChange={(val) => onUpdate(index, { minComboRateThreshold: Number(val || 0) / 100 })}
          />
        </div>
      </div>

      {isSavedPair && !isResolved && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Chốt kết quả Training (giữ nguyên lịch sử kỳ trước):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Popconfirm
              title={`Duyệt ${pair.menteeDisplayName} lên CVL Chính thức?`}
              description="Cặp Training này được lưu làm lịch sử, mở chia sẻ tip/combo 50-50 IN/OUT cho kỳ mới."
              okText="Duyệt lên CVL Chính thức"
              cancelText="Huỷ"
              onConfirm={() => onResolveOutcome({ pairId: pair.id, action: 'GRADUATE' })}
            >
              <Button size="small" type="primary" ghost loading={isResolving}>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Duyệt lên CVL Chính thức</span>
                </span>
              </Button>
            </Popconfirm>

            <Button
              size="small"
              loading={isResolving}
              onClick={() => {
                setExtStart(defaultExt.start);
                setExtEnd(defaultExt.end);
                setExtendOpen((prev) => !prev);
              }}
            >
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>Gia hạn kỳ mới</span>
              </span>
            </Button>

            <Popconfirm
              title={`Trả ${pair.menteeDisplayName} về CV thường?`}
              description="Sẽ đóng kỳ Training và thu hồi quyền vào /ios-app."
              okText="Trả về CV thường"
              okButtonProps={{ danger: true }}
              cancelText="Huỷ"
              onConfirm={() => onResolveOutcome({ pairId: pair.id, action: 'RETURN_TO_CV' })}
            >
              <Button size="small" danger loading={isResolving}>
                <span className="inline-flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  <span>Trả về CV thường</span>
                </span>
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}

      {isSavedPair && !isResolved && extendOpen && (
        <div className="mt-2.5 flex flex-wrap items-end gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs">
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              Từ ngày kỳ mới
            </label>
            <Input
              size="small"
              type="date"
              className="w-36 tabular-nums"
              value={extStart}
              onChange={(e) => setExtStart(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              Đến ngày kỳ mới
            </label>
            <Input
              size="small"
              type="date"
              className="w-36 tabular-nums"
              value={extEnd}
              onChange={(e) => setExtEnd(e.target.value)}
            />
          </div>
          <Button
            size="small"
            type="primary"
            loading={isResolving}
            onClick={async () => {
              await onResolveOutcome({
                pairId: pair.id,
                action: 'EXTEND',
                newStartDate: extStart,
                newEndDate: extEnd,
                mentorLegacyStaffId: pair.mentorLegacyStaffId,
                mentorDisplayName: pair.mentorDisplayName,
              });
              setExtendOpen(false);
            }}
          >
            Xác nhận gia hạn
          </Button>
          <Button size="small" onClick={() => setExtendOpen(false)}>
            Đóng
          </Button>
        </div>
      )}

      {isResolved && pair.resolvedAt && (
        <div className="mt-2 text-right text-[10.5px] tabular-nums text-slate-500 dark:text-slate-400">
          Đã chốt {new Date(pair.resolvedAt).toLocaleString('vi-VN')} bởi {pair.resolvedBy || 'Admin'}
        </div>
      )}
    </div>
  );
}
