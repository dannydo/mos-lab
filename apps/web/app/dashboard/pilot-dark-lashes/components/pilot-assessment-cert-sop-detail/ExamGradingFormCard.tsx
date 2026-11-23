'use client';

import React from 'react';
import { Button, Card, Input, InputNumber } from 'antd';
import { Award, Check, XCircle } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { PRACTICAL_CRITERIA_LIST, type TechnicianAssessmentRecord } from './assessment-cert-config';

interface ExamGradingFormCardProps {
  records: TechnicianAssessmentRecord[];
  selectedTechId: string;
  examFormScores: Record<string, number>;
  theoryInputScore: number;
  examinerNotesInput: string;
  evidenceNoteInput: string;
  currentPracticalTotal: number;
  currentPassConclusion: boolean;
  onSelectTechnician: (techId: string) => void;
  onTheoryScoreChange: (score: number) => void;
  onCriterionScoreChange: (criterionId: string, score: number) => void;
  onExaminerNotesChange: (notes: string) => void;
  onEvidenceNoteChange: (note: string) => void;
  onSaveExamResult: () => void;
}

export function ExamGradingFormCard({
  records,
  selectedTechId,
  examFormScores,
  theoryInputScore,
  examinerNotesInput,
  evidenceNoteInput,
  currentPracticalTotal,
  currentPassConclusion,
  onSelectTechnician,
  onTheoryScoreChange,
  onCriterionScoreChange,
  onExaminerNotesChange,
  onEvidenceNoteChange,
  onSaveExamResult,
}: ExamGradingFormCardProps) {
  const selectedRecord = records.find((r) => r.id === selectedTechId);

  return (
    <Card
      variant="outlined"
      className="rounded-xl border-amber-500/30 bg-gradient-to-b from-amber-500/[0.03] to-transparent shadow-xs"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
            <AppIcon icon={Award} size={17} className="text-amber-600 dark:text-amber-400" />
            <span>Bảng Chấm Thi &amp; Kết Luận Sát Hạch Trực Tiếp (CEO Danny Đỗ)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Đang chọn chấm:</span>
            <select
              value={selectedTechId}
              onChange={(e) => onSelectTechnician(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
              data-testid="select-technician-to-grade"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.technicianName} ({r.branch}) — {r.status === 'PASSED' ? 'ĐÃ ĐẠT' : 'CHƯA ĐẠT'}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Thông tin hồ sơ thí sinh */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-slate-400 block text-[11px]">Chuyên Viên sát hạch</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord?.technicianName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Người phụ trách đào tạo</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Cô Giang Đàm (Master)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Giám khảo trực tiếp chấm</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">CEO Danny Đỗ</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Ngày tổ chức thi</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {selectedRecord?.examDate}
            </span>
          </div>
        </div>

        {/* Nhập điểm Lý thuyết */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100 block">
              1. Điểm Sát hạch Lý thuyết (Thang điểm 100)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Đề kiểm tra trắc nghiệm 40 câu + 2 câu tình huống an toàn giác mạc. Chuẩn đạt: ≥ 80đ.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <InputNumber
              min={0}
              max={100}
              value={theoryInputScore}
              onChange={(val) => onTheoryScoreChange(val || 0)}
              className="w-24 text-center font-bold tabular-nums"
              data-testid="input-theory-score"
            />
            <span
              className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded text-xs font-bold ${
                theoryInputScore >= 80
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {theoryInputScore >= 80 ? 'Đạt' : 'Chưa đạt'}
            </span>
          </div>
        </div>

        {/* Nhập điểm 5 Tiêu chuẩn Thực hành */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
            <span>2. Điểm Sát hạch Thực hành trên Mẫu (CEO Danny chấm trực tiếp từng tiêu chí)</span>
            <span className="text-slate-500 font-normal">
              Tổng điểm thực hành:{' '}
              <strong className="text-amber-600 dark:text-amber-400 tabular-nums font-bold">
                {currentPracticalTotal} / 100đ
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PRACTICAL_CRITERIA_LIST.map((crit) => (
              <div
                key={crit.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-2"
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <span>{crit.name}</span>
                    {crit.isElimination && <span className="text-[10px] text-rose-500 font-bold">(Tiên quyết)</span>}
                  </div>
                  <span className="text-[10.5px] text-slate-400 block line-clamp-1">{crit.passCondition}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <InputNumber
                    min={0}
                    max={crit.maxScore}
                    value={examFormScores[crit.id] || 0}
                    onChange={(val) => onCriterionScoreChange(crit.id, val || 0)}
                    className="w-16 text-center font-bold tabular-nums"
                    data-testid={`input-criterion-${crit.id}`}
                  />
                  <span className="text-slate-400 font-medium tabular-nums">/{crit.maxScore}đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nhận xét & Minh chứng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
              Nhận xét &amp; Góp ý của CEO Danny Đỗ:
            </span>
            <Input.TextArea
              rows={2}
              value={examinerNotesInput}
              onChange={(e) => onExaminerNotesChange(e.target.value)}
              placeholder="Nhập nhận xét chi tiết về thao tác tay, phom mi uốn của Chuyên Viên..."
              className="text-xs rounded-lg"
              data-testid="input-examiner-notes"
            />
          </div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
              Minh chứng sát hạch (Hình ảnh ca mẫu / Mã hồ sơ SOP):
            </span>
            <Input.TextArea
              rows={2}
              value={evidenceNoteInput}
              onChange={(e) => onEvidenceNoteChange(e.target.value)}
              placeholder="Ghi nhận mã ca mẫu, đường dẫn hình ảnh Before/After hoặc video sát hạch..."
              className="text-xs rounded-lg"
              data-testid="input-evidence-note"
            />
          </div>
        </div>

        {/* Kết luận & Nút Lưu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kết luận của CEO:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                currentPassConclusion
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}
              data-testid="current-grade-conclusion-badge"
            >
              {currentPassConclusion ? <Check size={14} /> : <XCircle size={14} />}
              <span>{currentPassConclusion ? 'ĐẠT (PASS SÁT HẠCH)' : 'KHÔNG ĐẠT (CẦN RÈN LUYỆN LẠI)'}</span>
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              (Lý thuyết: {theoryInputScore}/100đ • Thực hành: {currentPracticalTotal}/100đ)
            </span>
          </div>

          <Button
            type="primary"
            onClick={onSaveExamResult}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-sm"
            data-testid="btn-save-exam-result"
          >
            <AppIcon icon={Award} size={14} className="mr-1" />
            <span>CEO Danny Lưu Kết Quả Sát Hạch</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
