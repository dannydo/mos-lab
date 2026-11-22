'use client';

import React from 'react';
import { Card } from 'antd';
import { AlertOctagon, AlertTriangle, CheckCircle2, Edit2, Eye, PhoneCall, Stethoscope } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { ESCALATION_PROTOCOL_STEPS } from './safety-risk-data';
import type { SensitiveReactionCase } from './safety-risk-types';

interface SafetyPart2SensitiveReactionSectionProps {
  sensitiveCases: SensitiveReactionCase[];
  onEditCase: (reactionCase: SensitiveReactionCase) => void;
}

export function SafetyPart2SensitiveReactionSection({
  sensitiveCases,
  onEditCase,
}: SafetyPart2SensitiveReactionSectionProps) {
  return (
    <section className="space-y-4 pt-2" data-testid="safety-part-2-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Phần 2 – Lâm sàng &amp; Khẩn cấp
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Nhận Diện Sớm &amp; Xử Lý Phản Ứng Nhạy Cảm (Do Cô Giang Đàm Xác Nhận)
          </h2>
        </div>
        <span className="text-xs text-slate-500">Phân định rõ thẩm quyền Chuyên viên vs Quy chế chuyển viện y tế</span>
      </div>

      {/* 3 Cấp độ Phản ứng nhạy cảm */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {sensitiveCases.map((cs) => {
          const isSevere = cs.severity === 'SEVERE';
          const isModerate = cs.severity === 'MODERATE';
          return (
            <Card
              key={cs.id}
              variant="outlined"
              className={`rounded-2xl border transition-all flex flex-col justify-between ${
                isSevere
                  ? 'border-rose-500/40 bg-rose-500/[0.02] ring-1 ring-rose-500/20'
                  : isModerate
                    ? 'border-amber-500/40 bg-amber-500/[0.02]'
                    : 'border-slate-200 dark:border-slate-800'
              }`}
              data-testid={`sensitive-case-card-${cs.severity.toLowerCase()}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-[10.5px] font-semibold border ${
                      isSevere
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        : isModerate
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {cs.severityLabel}
                  </span>
                  {cs.expertConfirmed && (
                    <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 m-0">
                      Cô Giang Đàm đã duyệt
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0 flex items-center gap-1.5">
                  {isSevere ? (
                    <AlertOctagon size={15} className="text-rose-500 shrink-0" />
                  ) : isModerate ? (
                    <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  ) : (
                    <Eye size={15} className="text-emerald-500 shrink-0" />
                  )}
                  <span>{cs.name}</span>
                </h3>

                {/* Dấu hiệu nhận biết */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                    Dấu hiệu nhận diện:
                  </span>
                  <ul className="m-0 p-0 list-none space-y-1">
                    {cs.recognitionSigns.map((sign, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="text-rose-500 font-bold shrink-0">•</span>
                        <span className="leading-tight">{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Biện pháp phòng ngừa */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                    Phòng ngừa trước thao tác:
                  </span>
                  <ul className="m-0 p-0 list-none space-y-1">
                    {cs.preventionMeasures.map((prevItem, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{prevItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hướng xử lý chuyên môn */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                    Hướng xử lý chuyên môn tức thì:
                  </span>
                  <div
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      isSevere
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
                        : isModerate
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    {cs.clinicalTreatment.map((treat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="font-bold shrink-0">{idx + 1}.</span>
                        <span>{treat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {cs.escalationRequired ? (
                  <span className="text-[10.5px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertOctagon size={12} />
                    Bắt buộc chuyển y tế
                  </span>
                ) : (
                  <span className="text-[10.5px] text-slate-400">Xử lý tại chi nhánh</span>
                )}
                <button
                  type="button"
                  onClick={() => onEditCase(cs)}
                  className="text-xs text-slate-500 hover:text-amber-600 cursor-pointer bg-transparent border-0"
                >
                  <Edit2 size={12} className="inline mr-1" />
                  Chỉnh sửa
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quy Trình Khẩn Cấp: Dừng Dịch Vụ & Chuyển Cơ Sở Y Tế (Escalation Protocol) */}
      <div className="p-4 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-500/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <AppIcon icon={Stethoscope} size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Quy Trình Khẩn Cấp: Dừng Dịch Vụ &amp; Chuyển Cơ Sở Y Tế (Escalation Protocol)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
                Áp dụng khi khách có biểu hiện phản ứng cấp độ 3 hoặc rát giác mạc không thuyên giảm sau 10 phút
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 m-0 gap-1">
              <PhoneCall size={12} />
              Hotline Y Tế: 1900 8198
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {ESCALATION_PROTOCOL_STEPS.map((step) => (
            <div
              key={step.stepLabel}
              className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1"
            >
              <span className={`text-[10.5px] font-bold uppercase ${step.labelColorClass}`}>{step.stepLabel}</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0">{step.title}</h4>
              <p className="text-[11px] text-slate-500 m-0 leading-normal">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
