'use client';

import React from 'react';
import { Button, Card, message } from 'antd';
import { AlertTriangle, CheckCircle2, Download, Edit2, Paperclip, Plus } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { SafetyAttachment, SafetyControlPoint, SafetyStageRule } from './safety-risk-types';

interface SafetyPart1MucosaProtectionSectionProps {
  stageRules: SafetyStageRule[];
  controlPoints: SafetyControlPoint[];
  attachments: SafetyAttachment[];
  onToggleControlPoint: (id: string) => void;
  onOpenAddAttachment: () => void;
  onEditStage: (stage: SafetyStageRule) => void;
}

export function SafetyPart1MucosaProtectionSection({
  stageRules,
  controlPoints,
  attachments,
  onToggleControlPoint,
  onOpenAddAttachment,
  onEditStage,
}: SafetyPart1MucosaProtectionSectionProps) {
  return (
    <section className="space-y-4" data-testid="safety-part-1-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Phần 1 – Quy chuẩn thao tác
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Quy Tắc Bảo Vệ Niêm Mạc Mắt Trước, Trong và Sau Dịch Vụ
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<AppIcon icon={Plus} size={12} />}
            onClick={onOpenAddAttachment}
            className="text-xs"
          >
            Đính kèm tài liệu SOP
          </Button>
        </div>
      </div>

      {/* 3 Giai đoạn Bảo Vệ Niêm Mạc Mắt */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {stageRules.map((st) => (
          <Card
            key={st.id}
            variant="outlined"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {st.stageName}
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">{st.stageTiming}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0 leading-snug">{st.title}</h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">{st.description}</p>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Thao tác bắt buộc:
                </span>
                <ul className="m-0 p-0 list-none space-y-1.5">
                  {st.actions.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-tight">{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {st.warningNote && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>{st.warningNote}</span>
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => onEditStage(st)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer bg-transparent border-0"
              >
                <Edit2 size={12} />
                <span>Chỉnh sửa quy tắc</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Checklist 6 Điểm kiểm soát an toàn (SCP) */}
      <Card
        variant="outlined"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Checklist Tiêu Chuẩn Thực Hành KTV
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              6 Điểm Kiểm Soát An Toàn Giác Mạc Bắt Buộc (Safety Control Points - SCP)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Chuyên Viên Kỹ Thuật phải kiểm tra và xác nhận đủ 6/6 điểm trước khi kết thúc ca
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {controlPoints.map((scp) => (
            <div
              key={scp.id}
              onClick={() => onToggleControlPoint(scp.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                scp.checked
                  ? 'bg-white dark:bg-slate-800/80 border-emerald-500/40 shadow-xs'
                  : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
              data-testid={`scp-item-${scp.code}`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  scp.checked ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-600'
                }`}
              >
                {scp.checked && <CheckCircle2 size={13} />}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {scp.code} · {scp.name}
                  </span>
                  <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 m-0 tabular-nums">
                    {scp.tolerance}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium m-0 leading-snug">
                  {scp.standard}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Dụng cụ kiểm soát:</span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{scp.inspectionTool}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tài Liệu Hướng Dẫn & Minh Chứng Đính Kèm */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip size={15} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              Tài Liệu Hướng Dẫn &amp; Hình Ảnh Minh Họa Kỹ Thuật Đính Kèm ({attachments.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenAddAttachment}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer bg-transparent border-0"
          >
            + Thêm tài liệu mới
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 m-0">
                    {att.format}
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">{att.uploadDate}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0 truncate" title={att.name}>
                  {att.name}
                </h4>
                <p className="text-[11px] text-slate-500 m-0 line-clamp-2">{att.description}</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 truncate">Bởi: {att.uploadedBy}</span>
                <button
                  type="button"
                  onClick={() => message.info(`Tải xuống tài liệu ${att.name}`)}
                  className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 cursor-pointer bg-transparent border-0"
                >
                  <Download size={11} />
                  <span>Xem / Tải</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
