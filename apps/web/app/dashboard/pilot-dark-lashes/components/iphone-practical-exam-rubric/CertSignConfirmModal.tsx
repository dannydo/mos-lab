'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import { EXAM_APPROVER_NAME, EXAM_CERT_CODE, EXAM_INSTRUCTOR_NAME, type ExamRankInfo } from './rubric-config';

interface CertSignConfirmModalProps {
  open: boolean;
  candidateName: string;
  totalScore: number;
  rank: ExamRankInfo;
  onCancel: () => void;
  onConfirmApprove: () => void;
}

export function CertSignConfirmModal({
  open,
  candidateName,
  totalScore,
  rank,
  onCancel,
  onConfirmApprove,
}: CertSignConfirmModalProps) {
  return (
    <AdaptiveModal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={380}
      centered
      className="rounded-2xl overflow-hidden"
    >
      <div className="p-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-lg">
          <Award size={32} />
        </div>

        <div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Xác Nhận Ký Duyệt Chuyên Môn
          </span>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 m-0 mt-0.5">Cấp Chứng Chỉ Uốn Mi mOS</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
            Học viên: <strong>{candidateName}</strong>
            <br />
            Điểm thực hành: <strong className="text-amber-600 tabular-nums">{totalScore}/100đ</strong> ({rank.label})
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Mã chứng chỉ số:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{EXAM_CERT_CODE}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Giảng viên hướng dẫn:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{EXAM_INSTRUCTOR_NAME}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Chủ khảo phê duyệt:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{EXAM_APPROVER_NAME}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirmApprove}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-md transition-all cursor-pointer"
            data-testid="btn-confirm-sign"
          >
            Ký Xác Nhận
          </button>
        </div>
      </div>
    </AdaptiveModal>
  );
}
