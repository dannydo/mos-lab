'use client';

import React, { useState } from 'react';
import { Slider, InputNumber, Button, Progress } from 'antd';
import {
  Sliders,
  RotateCcw,
  Target,
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { BkSalaryInputs, BkSalaryResult } from './contracts/salary-explainer.types';
import { BK_SAMPLE_INPUTS, calculateBkSalary } from './adapters/bk-salary.adapter';
import SalaryInfographic from './SalaryInfographic';
import { AppIcon, StatusTag } from '../ui';

interface SalarySimulatorProps {
  initialInputs?: Partial<BkSalaryInputs>;
}

export default function SalarySimulator({ initialInputs }: SalarySimulatorProps) {
  const [inputs, setInputs] = useState<BkSalaryInputs>({
    ...BK_SAMPLE_INPUTS,
    ...initialInputs,
  });

  const [activeBranch, setActiveBranch] = useState<string | undefined>();

  const result: BkSalaryResult = calculateBkSalary(inputs);

  const updateInput = <K extends keyof BkSalaryInputs>(key: K, value: BkSalaryInputs[K]) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyPreset = (preset: 'sample' | 'rookie' | 'top') => {
    if (preset === 'sample') {
      setInputs(BK_SAMPLE_INPUTS);
    } else if (preset === 'rookie') {
      setInputs({
        workDays: 24,
        singleDone: 95,
        comboDone: 15,
        missedRate: 18,
        revenueMillion: 45,
        tipAmount: 50_000,
        avgSingleCheckinPrice: BK_SAMPLE_INPUTS.avgSingleCheckinPrice,
      });
    } else if (preset === 'top') {
      setInputs({
        workDays: 27,
        singleDone: 360,
        comboDone: 85,
        missedRate: 8.5,
        revenueMillion: 310,
        tipAmount: 600_000,
        avgSingleCheckinPrice: BK_SAMPLE_INPUTS.avgSingleCheckinPrice,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Visual Infographic */}
      <SalaryInfographic
        result={result}
        activeBranchKey={activeBranch}
        onSelectBranch={(key) => setActiveBranch(key === activeBranch ? undefined : key)}
      />

      {/* Milestone Progress Callout */}
      <div className="rounded-xl border border-purple-200/80 dark:border-purple-800/50 bg-purple-50/60 dark:bg-purple-950/20 p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <AppIcon icon={Target} size="sm" />
            </div>
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
              Tiến Trình Mốc Bậc Thang Khách Lẻ (Điều răn BK-005)
            </span>
          </div>
          <StatusTag status={result.milestoneBonus > 0 ? 'success' : 'default'} label={result.currentMilestone.label} />
        </div>

        {/* Progress Bar towards Next Milestone */}
        {result.nextMilestone ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
              <span>
                Hiện tại:{' '}
                <strong className="text-purple-600 dark:text-purple-400 tabular-nums">
                  {inputs.singleDone} khách lẻ
                </strong>{' '}
                ({result.currentMilestone.label})
              </span>
              <span>
                Mục tiêu tiếp theo:{' '}
                <strong className="text-purple-600 dark:text-purple-400 tabular-nums">
                  {result.nextMilestone.minSingle} khách lẻ
                </strong>{' '}
                (+{(result.nextMilestone.bonus / 1000).toLocaleString('vi-VN')}k)
              </span>
            </div>
            <Progress
              percent={Math.min(100, Math.round((inputs.singleDone / result.nextMilestone.minSingle) * 100))}
              strokeColor={{
                '0%': '#8B5CF6',
                '100%': '#6D28D9',
              }}
              size="small"
              showInfo={false}
            />
            <div className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1 font-medium">
              <AppIcon icon={Sparkles} size="sm" />
              <span>
                Chỉ cần thêm{' '}
                <strong className="tabular-nums underline font-bold">{result.singleNeededForNext} khách lẻ Done</strong>{' '}
                nữa để nâng thưởng bậc thang lên{' '}
                <strong className="tabular-nums font-bold">
                  +{result.nextMilestone.bonus.toLocaleString('vi-VN')}đ
                </strong>{' '}
                (tăng thêm +{(result.nextMilestone.bonus - result.milestoneBonus).toLocaleString('vi-VN')}đ)!
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <AppIcon icon={CheckCircle2} size="sm" />
            <span>Chúc mừng! Bạn đã chạm mốc tối đa 500+ khách lẻ (+2.700.000đ tiền thưởng mốc)!</span>
          </div>
        )}
      </div>

      {/* Simulator Controls & Preset Buttons */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-4 shadow-sm">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <AppIcon icon={Sliders} size="sm" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                Bộ Giả Lập Thu Nhập Tương Tác
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Kéo thanh trượt hoặc nhập số để dự phóng mức lương tháng tức thì
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            <Button size="small" onClick={() => handleApplyPreset('sample')} className="text-xs font-medium">
              Mẫu Kinh Thánh (13.9tr)
            </Button>
            <Button size="small" onClick={() => handleApplyPreset('rookie')} className="text-xs">
              Thử việc
            </Button>
            <Button size="small" onClick={() => handleApplyPreset('top')} className="text-xs">
              Chiến thần
            </Button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* 1. Ngày công làm việc */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                1. Ngày công thực tế (Chuẩn 26 công):
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{inputs.workDays} công</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={31}
                  step={0.5}
                  value={inputs.workDays}
                  onChange={(v) => updateInput('workDays', v)}
                />
              </div>
              <InputNumber
                min={0}
                max={31}
                step={0.5}
                value={inputs.workDays}
                onChange={(v) => updateInput('workDays', v || 0)}
                className="w-16 tabular-nums"
                size="small"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Lương ca = ({inputs.workDays}/26) × 6.500.000đ ={' '}
              <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                {result.baseSalary.toLocaleString('vi-VN')}đ
              </strong>
            </div>
          </div>

          {/* 2. Khách Lẻ Done */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">2. Khách Lẻ Done trong tháng:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {inputs.singleDone} khách lẻ
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={600}
                  step={5}
                  value={inputs.singleDone}
                  onChange={(v) => updateInput('singleDone', v)}
                />
              </div>
              <InputNumber
                min={0}
                max={1000}
                step={1}
                value={inputs.singleDone}
                onChange={(v) => updateInput('singleDone', v || 0)}
                className="w-20 tabular-nums"
                size="small"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Thưởng check-in ~
              <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                {(result.checkinBonus - inputs.comboDone * 1000).toLocaleString('vi-VN')}đ
              </strong>{' '}
              · Bậc thang BK-005:{' '}
              <strong className="text-purple-600 dark:text-purple-400 tabular-nums">
                +{result.milestoneBonus.toLocaleString('vi-VN')}đ
              </strong>
            </div>
          </div>

          {/* 3. Khách Combo Live */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">3. Khách Combo Live (1.000đ/lượt):</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 tabular-nums">{inputs.comboDone} combo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={200}
                  step={5}
                  value={inputs.comboDone}
                  onChange={(v) => updateInput('comboDone', v)}
                />
              </div>
              <InputNumber
                min={0}
                max={500}
                step={1}
                value={inputs.comboDone}
                onChange={(v) => updateInput('comboDone', v || 0)}
                className="w-16 tabular-nums"
                size="small"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Thưởng check-in combo = {inputs.comboDone} × 1.000đ ={' '}
              <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                {(inputs.comboDone * 1000).toLocaleString('vi-VN')}đ
              </strong>{' '}
              (không tính vào bậc thang BK-005)
            </div>
          </div>

          {/* 4. Tỷ lệ Missed % */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">4. Tỷ lệ Khách Missed (%):</span>
              <span
                className={`font-bold tabular-nums ${
                  result.missedBonus < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : result.missedBonus > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {inputs.missedRate.toFixed(1)}% ({result.missedBonus > 0 ? '+' : ''}
                {result.missedBonus.toLocaleString('vi-VN')}đ)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={40}
                  step={0.5}
                  value={inputs.missedRate}
                  onChange={(v) => updateInput('missedRate', v)}
                />
              </div>
              <InputNumber
                min={0}
                max={100}
                step={0.5}
                value={inputs.missedRate}
                onChange={(v) => updateInput('missedRate', v || 0)}
                className="w-16 tabular-nums"
                size="small"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              ≤10% (+1tr) · ≤15% (+500k) · 15.1-20% (0đ) · 20.1-25% (-500k) · &gt;25% (-1tr)
              {(inputs.singleDone || 0) + (inputs.comboDone || 0) < 100 && (
                <span className="text-amber-500 font-medium ml-1">
                  (Chưa đạt tối thiểu 100 khách Done: không tính thưởng/phạt)
                </span>
              )}
            </div>
          </div>

          {/* 5. Doanh thu Net (Triệu đồng) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">5. Doanh thu Net tạo ra:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                {inputs.revenueMillion} triệu ({((result.revenueCommissionRate || 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={500}
                  step={10}
                  value={inputs.revenueMillion}
                  onChange={(v) => updateInput('revenueMillion', v)}
                />
              </div>
              <InputNumber
                min={0}
                max={1000}
                step={5}
                value={inputs.revenueMillion}
                onChange={(v) => updateInput('revenueMillion', v || 0)}
                className="w-20 tabular-nums"
                size="small"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Hoa hồng doanh thu ={' '}
              <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                {result.revenueBonus.toLocaleString('vi-VN')}đ
              </strong>{' '}
              (Mốc 50tr: 0.7% → 300tr: 1.2%)
            </div>
          </div>

          {/* 6. Tiền Tip được chia */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">6. Tiền Tip khách cho Booker:</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                {inputs.tipAmount.toLocaleString('vi-VN')}đ (Chia 7%)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  min={0}
                  max={2_000_000}
                  step={50_000}
                  value={inputs.tipAmount}
                  onChange={(v) => updateInput('tipAmount', v)}
                />
              </div>
              <InputNumber
                min={0}
                max={10_000_000}
                step={50_000}
                value={inputs.tipAmount}
                onChange={(v) => updateInput('tipAmount', v || 0)}
                className="w-24 tabular-nums"
                size="small"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Thưởng Tip Booker nhận (7%) ={' '}
              <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                {result.tipBonus.toLocaleString('vi-VN')}đ
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
