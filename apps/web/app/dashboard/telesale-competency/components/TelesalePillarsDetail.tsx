'use client';

import React from 'react';
import { Slider, Input, Alert } from 'antd';
import {
  TrendingUp,
  Award,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import {
  TelesaleSkillKey,
  TELESALE_SKILL_DEFINITIONS,
  TelesaleCompetencyEvaluation,
} from '@mos-lab/shared';
import { StatusTag } from '../../../../components/ui';

interface TelesalePillarsDetailProps {
  evaluation: TelesaleCompetencyEvaluation;
  skillRatings: Record<TelesaleSkillKey, { score: number; notes: string }>;
  onSkillChange: (key: TelesaleSkillKey, score: number, notes?: string) => void;
  pillarCScore: number;
  onPillarCScoreChange: (score: number) => void;
  pillarCNotes: string;
  onPillarCNotesChange: (notes: string) => void;
  pillarDScore: number;
  onPillarDScoreChange: (score: number) => void;
  evidenceUrl: string;
  onEvidenceUrlChange: (url: string) => void;
  evidenceNotes: string;
  onEvidenceNotesChange: (notes: string) => void;
}

export const TelesalePillarsDetail: React.FC<TelesalePillarsDetailProps> = ({
  evaluation,
  skillRatings,
  onSkillChange,
  pillarCScore,
  onPillarCScoreChange,
  pillarCNotes,
  onPillarCNotesChange,
  pillarDScore,
  onPillarDScoreChange,
  evidenceUrl,
  onEvidenceUrlChange,
  evidenceNotes,
  onEvidenceNotesChange,
}) => {
  const averageSkill = Number(
    (Object.values(skillRatings).reduce((a, b) => a + b.score, 0) / 9).toFixed(2)
  );
  const skill25 = Number(((averageSkill / 5) * 25).toFixed(1));

  return (
    <div className="space-y-6">
      {/* 1. Trụ Cột A: Hiệu suất công việc (40%) */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-zinc-950 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                Trụ Cột A: Hiệu Suất Công Việc (40%)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Hệ thống tự động tính từ đơn hàng Book & Done, Doanh thu, Năng suất cuộc gọi
              </p>
            </div>
          </div>
          <StatusTag
            status="processing"
            label={`Đạt ${evaluation.pillarA?.cappedScore || 0} / 40đ (Trần tối đa 48đ)`}
          />
        </div>

        <Alert
          message="Quy tắc chuẩn hóa Trụ cột A:"
          description={`Tự động điều chỉnh mục tiêu theo ngày làm việc thực tế (Pacing: ${evaluation.pillarA?.actualWorkingDays || 26}/${evaluation.pillarA?.standardWorkingDays || 26} ngày). Không tự động cho 0 điểm nếu thiếu dữ liệu.`}
          type="info"
          showIcon
          className="mb-4"
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-slate-500 dark:text-zinc-400">1. Book & Done</div>
            <div className="text-sm font-semibold mt-1">
              Book: <span className="text-blue-600 dark:text-blue-400 tabular-nums font-bold">{evaluation.pillarA?.bookCount}</span> / <span className="tabular-nums">{evaluation.pillarA?.bookTarget}</span>
            </div>
            <div className="text-sm font-semibold">
              Done: <span className="text-emerald-600 dark:text-emerald-400 tabular-nums font-bold">{evaluation.pillarA?.doneCount}</span> / <span className="tabular-nums">{evaluation.pillarA?.doneTarget}</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              Đạt <span className="tabular-nums">{Math.round((evaluation.pillarA?.doneAchievementRate || 0) * 100)}%</span> chỉ tiêu Done
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-slate-500 dark:text-zinc-400">2. Khách mới Done</div>
            <div className="text-sm font-semibold mt-1">
              Thực tế: <span className="text-emerald-600 dark:text-emerald-400 tabular-nums font-bold">{evaluation.pillarA?.newCustomersDone}</span> khách
            </div>
            <div className="text-xs text-slate-400 dark:text-zinc-500">Mục tiêu: <span className="tabular-nums">{evaluation.pillarA?.newCustomersTarget}</span> khách</div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              Đạt <span className="tabular-nums">{Math.round((evaluation.pillarA?.newCustomersAchievementRate || 0) * 100)}%</span> KPI
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-slate-500 dark:text-zinc-400">3. Doanh thu Done</div>
            <div className="text-sm font-semibold mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 tabular-nums font-bold">
                {((evaluation.pillarA?.actualRevenue || 0) / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="text-xs text-slate-400 dark:text-zinc-500">Mục tiêu: <span className="tabular-nums">{((evaluation.pillarA?.revenueTarget || 0) / 1000000).toFixed(1)}M</span></div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              Đạt <span className="tabular-nums">{Math.round((evaluation.pillarA?.revenueAchievementRate || 0) * 100)}%</span> KPI
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-slate-500 dark:text-zinc-400">4. Chuyển đổi</div>
            <div className="text-sm font-semibold mt-1">
              Done/Book: <span className="tabular-nums font-bold">{Math.round((evaluation.pillarA?.conversionDoneBookRate || 0) * 100)}%</span>
            </div>
            <div className="text-xs text-slate-400 dark:text-zinc-500">
              Book/Cuộc gọi: <span className="tabular-nums">{Math.round((evaluation.pillarA?.conversionBookCallRate || 0) * 100)}%</span>
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Điểm: <span className="tabular-nums">{evaluation.pillarA?.conversionScore}</span>/10</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-slate-500 dark:text-zinc-400">5. Năng suất gọi</div>
            <div className="text-sm font-semibold mt-1">
              Tổng gọi: <span className="tabular-nums font-bold">{evaluation.pillarA?.totalCalls}</span>
            </div>
            <div className="text-xs text-slate-400 dark:text-zinc-500">Kết nối: <span className="tabular-nums">{evaluation.pillarA?.connectedCalls}</span> cuộc</div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">Điểm: <span className="tabular-nums">{evaluation.pillarA?.callProductivityScore}</span>/10</div>
          </div>
        </div>
      </div>

      {/* 2. Trụ Cột B: 9 Kỹ năng nghiệp vụ (25%) */}
      <div className="rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-zinc-950 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                Trụ Cột B: 9 Kỹ Năng Nghiệp Vụ (25%)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Quản lý trực tiếp chấm điểm theo thang 1 - 5 sao và ghi chú phản hồi
              </p>
            </div>
          </div>
          <StatusTag
            status="purple"
            label={`TB: ${averageSkill}/5 sao · Quy đổi: ${skill25} / 25đ`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(TELESALE_SKILL_DEFINITIONS) as TelesaleSkillKey[]).map((key) => {
            const def = TELESALE_SKILL_DEFINITIONS[key];
            const currentScore = skillRatings[key]?.score || 4;

            return (
              <div
                key={key}
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                      {def.code}
                    </span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-zinc-100">{def.name}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-500 tabular-nums">{currentScore} / 5</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">{def.description}</p>

                <div className="pt-2">
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={currentScore}
                    onChange={(val) => onSkillChange(key, val, skillRatings[key]?.notes)}
                    marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
                  />
                </div>

                <Input
                  placeholder="Ghi chú phản hồi kỹ năng..."
                  size="small"
                  value={skillRatings[key]?.notes || ''}
                  onChange={(e) => onSkillChange(key, currentScore, e.target.value)}
                  className="text-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Trụ Cột C & D Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trụ Cột C: Chất lượng công việc (20%) */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-zinc-950 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Trụ Cột C: Chất Lượng Công Việc (20%)
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Kiểm toán lỗi hồ sơ CRM & cuộc gọi</p>
              </div>
            </div>
            <StatusTag status="success" label={`${pillarCScore} / 20đ`} />
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Đánh giá dựa trên mức độ nghiêm trọng, tần suất và tỷ lệ lỗi trên hồ sơ / cuộc gọi kiểm tra CRM.
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-zinc-300">Điểm đánh giá chất lượng (Quản lý chấm):</span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">{pillarCScore} / 20 điểm</span>
            </div>
            <Slider
              min={0}
              max={20}
              value={pillarCScore}
              onChange={onPillarCScoreChange}
              marks={{ 0: '0đ', 5: '5đ', 10: '10đ', 15: '15đ', 20: '20đ' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Ghi chú kiểm toán cuộc gọi & lỗi hồ sơ:
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Ghi chú lỗi nhập liệu CRM, tác phong cuộc gọi, tỷ lệ hủy hẹn..."
              value={pillarCNotes}
              onChange={(e) => onPillarCNotesChange(e.target.value)}
            />
          </div>
        </div>

        {/* Trụ Cột D: Kỷ luật & Thái độ (15%) */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-zinc-950 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Flame className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Trụ Cột D: Kỷ Luật & Thái Độ (15%)
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Bắt buộc minh chứng khi trừ điểm</p>
              </div>
            </div>
            <StatusTag status="warning" label={`${pillarDScore} / 15đ`} />
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Kết hợp dữ liệu chấm công / vi phạm và đánh giá hành vi. <strong className="text-rose-500">Bắt buộc đính kèm link minh chứng khi trừ điểm!</strong>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-zinc-300">Điểm kỷ luật & tác phong:</span>
              <span className="tabular-nums text-amber-600 dark:text-amber-400 font-bold">{pillarDScore} / 15 điểm</span>
            </div>
            <Slider
              min={0}
              max={15}
              value={pillarDScore}
              onChange={onPillarDScoreChange}
              marks={{ 0: '0đ', 5: '5đ', 10: '10đ', 15: '15đ' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Link minh chứng sự vụ (Ảnh chụp biên bản / tin nhắn / log): <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="https://... (Link ảnh hoặc tài liệu chứng minh)"
              value={evidenceUrl}
              onChange={(e) => onEvidenceUrlChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Ghi chú minh chứng sự vụ vi phạm:
            </label>
            <Input.TextArea
              rows={2}
              placeholder="Chi tiết ngày đi trễ, vi phạm quy tắc ứng xử, văn bản giải trình..."
              value={evidenceNotes}
              onChange={(e) => onEvidenceNotesChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
