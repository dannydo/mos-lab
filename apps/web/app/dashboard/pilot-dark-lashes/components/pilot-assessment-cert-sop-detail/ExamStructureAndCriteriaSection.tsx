'use client';

import React from 'react';
import { Card } from 'antd';
import { BookOpen, FileText, GraduationCap, Layers, ShieldCheck } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { PRACTICAL_CRITERIA_LIST } from './assessment-cert-config';

export function ExamStructureAndCriteriaSection() {
  return (
    <>
      {/* Nguyên tắc bất biến 2 vòng */}
      <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
          <AppIcon icon={ShieldCheck} size={16} />
          <span>Nguyên Tắc Bắt Buộc: Kiểm Soát Độc Lập 2 Vòng Giữa Đào Tạo &amp; Sát Hạch</span>
        </div>
        <p className="leading-relaxed m-0">
          • <strong>Cô Giang Đàm</strong>: Phụ trách trực tiếp đào tạo kỹ thuật, thiết kế đề thi lý thuyết và thực hành,
          xây dựng bảng tiêu chuẩn chấm điểm. <em>Quy tắc: Người đào tạo không được chấm thi học viên của mình</em> nhằm
          triệt tiêu thiên vị chủ quan.
        </p>
        <p className="leading-relaxed m-0">
          • <strong>CEO Danny Đỗ</strong>: Trực tiếp chấm thi độc lập trên mẫu thật, trực tiếp nhập điểm, nhận xét và
          đưa ra kết luận ĐẠT / KHÔNG ĐẠT.
        </p>
      </div>

      {/* Cấu trúc Đề thi & Khung tiêu chuẩn chấm điểm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cột 1: Cấu trúc Đề thi Lý thuyết & Thực hành */}
        <Card
          variant="outlined"
          className="rounded-xl border-slate-200 dark:border-slate-800"
          title={
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <AppIcon icon={BookOpen} size={16} className="text-amber-500" />
              <span>Cấu Trúc Đề Thi Lý Thuyết &amp; Thực Hành</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Đề Lý thuyết */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-500" />
                  1. Đề thi Lý thuyết Chuyên môn (45 phút)
                </span>
                <span className="tabular-nums text-blue-600 dark:text-blue-400 font-bold">Chuẩn ≥ 80/100đ</span>
              </div>
              <ul className="m-0 pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>
                  40 câu trắc nghiệm thẩm định cấu trúc sợi mi, phân loại nang lông và chiều dài tối thiểu (≥ 8mm).
                </li>
                <li>
                  Thời gian ủ thuốc số 1 &amp; số 2 theo từng chất mi (mi mảnh: 12-14p, thường: 15-18p, thô cứng:
                  18-20p).
                </li>
                <li>2 câu hỏi tình huống: Xử lý tức thời khi mắt khách bị châm chích và quy trình sơ cứu giác mạc.</li>
              </ul>
            </div>

            {/* Đề Thực hành */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-emerald-500" />
                  2. Đề thi Thực hành trên Mẫu thật (60 phút)
                </span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">Chuẩn ≥ 80/100đ</span>
              </div>
              <ul className="m-0 pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Thao tác trực tiếp trên mẫu do ban giám khảo chỉ định trước mặt CEO Danny.</li>
                <li>Căn nẹp trục silicon cá heo, vuốt keo định hình, kiểm tra độ bám sợi mi.</li>
                <li>Ủ thuốc uốn, thử độ đàn hồi bằng que gạt mi chuyên dụng, phủ bóng tinh chất dưỡng.</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Cột 2: Bảng Tiêu Chuẩn Chấm Điểm (5 tiêu chí) */}
        <Card
          variant="outlined"
          className="rounded-xl border-slate-200 dark:border-slate-800"
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <AppIcon icon={Layers} size={16} className="text-emerald-500" />
                <span>5 Tiêu Chuẩn Chấm Điểm Thực Hành (CEO Danny trực tiếp chấm)</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Thang 100đ</span>
            </div>
          }
        >
          <div className="space-y-2.5 text-xs">
            {PRACTICAL_CRITERIA_LIST.map((crit, idx) => (
              <div
                key={crit.id}
                className={`p-2.5 rounded-lg border transition-colors ${
                  crit.isElimination
                    ? 'bg-rose-500/5 border-rose-500/20 text-slate-800 dark:text-slate-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-400">{idx + 1}.</span>
                    <span>{crit.name}</span>
                    {crit.isElimination && (
                      <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        Tiêu chí loại trực tiếp
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums font-bold text-amber-600 dark:text-amber-400">
                    {crit.maxScore}đ ({crit.weightPercent}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                  {crit.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
