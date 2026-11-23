'use client';

import React from 'react';
import { Card } from 'antd';
import { Award, UserCheck } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import type { TechnicianAssessmentRecord } from './assessment-cert-config';

interface ExamResultsTableCardProps {
  records: TechnicianAssessmentRecord[];
  onPreviewCert: (record: TechnicianAssessmentRecord) => void;
}

export function ExamResultsTableCard({ records, onPreviewCert }: ExamResultsTableCardProps) {
  return (
    <Card
      variant="outlined"
      className="rounded-xl border-slate-200 dark:border-slate-800"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <AppIcon icon={UserCheck} size={16} className="text-emerald-500" />
            <span>Danh Sách Kết Quả Sát Hạch Độc Lập Chuyên Viên ({records.length} CV)</span>
          </div>
          <span className="text-xs text-slate-400">Người chấm: CEO Danny Đỗ</span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse" data-testid="table-technician-exam-results">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
              <th className="py-2.5 px-3">Chuyên Viên Kỹ Thuật</th>
              <th className="py-2.5 px-3">Chi Nhánh</th>
              <th className="py-2.5 px-3 text-center">Ngày Thi</th>
              <th className="py-2.5 px-3 text-center">Lý Thuyết</th>
              <th className="py-2.5 px-3 text-center">Thực Hành</th>
              <th className="py-2.5 px-3 text-center">Kết Luận</th>
              <th className="py-2.5 px-3">Nhận Xét Của CEO Danny</th>
              <th className="py-2.5 px-3 text-center">Chứng Chỉ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {records.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{rec.technicianName}</td>
                <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{rec.branch}</td>
                <td className="py-3 px-3 text-center tabular-nums text-slate-600 dark:text-slate-300">
                  {rec.examDate}
                </td>
                <td className="py-3 px-3 text-center tabular-nums font-semibold">
                  <span
                    className={
                      rec.theoryScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    {rec.theoryScore}/100
                  </span>
                </td>
                <td className="py-3 px-3 text-center tabular-nums font-semibold">
                  <span
                    className={
                      rec.practicalTotalScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    {rec.practicalTotalScore}/100
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded text-[11px] font-bold ${
                      rec.status === 'PASSED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {rec.status === 'PASSED' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                  </span>
                </td>
                <td
                  className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate"
                  title={rec.examinerNotes}
                >
                  {rec.examinerNotes}
                </td>
                <td className="py-3 px-3 text-center">
                  {rec.certificateApproved ? (
                    <button
                      type="button"
                      onClick={() => onPreviewCert(rec)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
                      data-testid={`btn-view-cert-${rec.id}`}
                    >
                      <Award size={12} />
                      <span>Đã cấp</span>
                    </button>
                  ) : rec.status === 'PASSED' ? (
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Chờ CEO duyệt</span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Chưa đủ ĐK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
