'use client';

import React from 'react';
import { Input } from 'antd';
import { ESSAY_19_CASES, type Essay19Answers, type EssayScores } from './theory-exam-questions';

interface EssayScoreInputProps {
  value: number;
  max: number;
  onChange: (rawValue: string) => void;
}

function EssayScoreInput({ value, max, onChange }: EssayScoreInputProps) {
  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className="text-slate-400">Điểm:</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 text-center font-bold border border-slate-300 dark:border-slate-700 rounded p-0.5 tabular-nums bg-transparent"
      />
      <span className="text-slate-400">/{max}đ</span>
    </div>
  );
}

interface TheoryEssaySectionProps {
  essay18: string;
  onChangeEssay18: (value: string) => void;
  essay19: Essay19Answers;
  onChangeEssay19Case: (caseKey: keyof Essay19Answers, value: string) => void;
  essay20: string;
  onChangeEssay20: (value: string) => void;
  essayScores: EssayScores;
  onChangeEssayScore: (questionKey: keyof EssayScores, rawValue: string, max: number) => void;
  isSubmitted: boolean;
}

export function TheoryEssaySection({
  essay18,
  onChangeEssay18,
  essay19,
  onChangeEssay19Case,
  essay20,
  onChangeEssay20,
  essayScores,
  onChangeEssayScore,
  isSubmitted,
}: TheoryEssaySectionProps) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">
          Phần II. Tự Luận Chuyên Sâu (3 Câu · 32 Điểm)
        </span>
        <span className="text-[11px] text-slate-400">CEO Danny trực tiếp chấm</span>
      </div>

      {/* Câu 18 */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu 18 (10đ).</span>
            Trình bày 7 bước chính của một quy trình uốn mi an toàn
          </span>
          <EssayScoreInput value={essayScores.q18} max={10} onChange={(raw) => onChangeEssayScore('q18', raw, 10)} />
        </div>
        <Input.TextArea
          rows={3}
          value={essay18}
          onChange={(e) => onChangeEssay18(e.target.value)}
          placeholder="Nhập 7 bước uốn mi an toàn..."
          className="text-xs rounded-lg"
          disabled={isSubmitted}
        />
      </div>

      {/* Câu 19 */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu 19 (12đ).</span>
            Phân tích 4 nguyên nhân khiến mi uốn không đều hoặc gập gãy &amp; cách phòng ngừa
          </span>
          <EssayScoreInput value={essayScores.q19} max={12} onChange={(raw) => onChangeEssayScore('q19', raw, 12)} />
        </div>

        <div className="space-y-1.5 text-[11.5px]">
          {ESSAY_19_CASES.map((item) => (
            <div key={item.key}>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
              <Input.TextArea
                rows={1.5}
                value={essay19[item.key]}
                onChange={(e) => onChangeEssay19Case(item.key, e.target.value)}
                className="text-xs rounded-lg mt-0.5"
                disabled={isSubmitted}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Câu 20 */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu 20 (10đ).</span>
            Quy trình ứng phó khi mắt khách nóng rát &amp; dấu hiệu cần chuyển viện
          </span>
          <EssayScoreInput value={essayScores.q20} max={10} onChange={(raw) => onChangeEssayScore('q20', raw, 10)} />
        </div>
        <Input.TextArea
          rows={3}
          value={essay20}
          onChange={(e) => onChangeEssay20(e.target.value)}
          placeholder="Quy trình 5 bước ứng phó an toàn giác mạc..."
          className="text-xs rounded-lg"
          disabled={isSubmitted}
        />
      </div>
    </div>
  );
}
