'use client';

import React, { useState } from 'react';
import { Button, Input, Rate, message } from 'antd';
import { Lock, RefreshCw, Sparkles, Star } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

const STAR_LABELS = ['Rất chưa hài lòng', 'Chưa hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

export interface StaffSelfAssessmentCardProps {
  logId?: number | null;
  callUuid?: string | null;
  phone?: string | null;
  aiLockedUntilSelfRated?: boolean;
  analysisStatus?: string | null;
  staffSelfSatisfactionScore?: number | null;
  staffSelfNote?: string | null;
  staffAiCoachingFeedback?: string | null;
  customerSatisfactionScore?: number | null;
  canReviewQa?: boolean;
  isDark?: boolean;
  onSubmitted?: (updatedLog: SafeAny) => void;
}

export function StaffSelfAssessmentCard({
  logId,
  callUuid,
  phone,
  aiLockedUntilSelfRated = false,
  analysisStatus,
  staffSelfSatisfactionScore,
  staffSelfNote,
  staffAiCoachingFeedback,
  customerSatisfactionScore,
  canReviewQa = false,
  isDark = false,
  onSubmitted,
}: StaffSelfAssessmentCardProps) {
  const [score, setScore] = useState<number>(staffSelfSatisfactionScore || 0);
  const [note, setNote] = useState<string>(staffSelfNote || '');
  const [submitting, setSubmitting] = useState(false);

  const alreadyRated = staffSelfSatisfactionScore !== null && staffSelfSatisfactionScore !== undefined;

  // For Admin/Manager/QA viewing another staff's unrated call in QA drawer without active phone intent,
  // still show clear status pill if not rated unless they want to view coaching.
  if (!alreadyRated && canReviewQa && !phone && !callUuid) {
    return (
      <div
        className={`rounded-xl border p-3 text-xs ${
          isDark ? 'border-zinc-800 bg-zinc-900/50 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Tự đánh giá của nhân viên</span>
          <StatusTag status="default" label="Nhân viên chưa tự đánh giá" />
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!score || score < 1 || score > 5) {
      message.warning('Vui lòng chọn số sao từ 1 đến 5 trước khi gửi.');
      return;
    }

    setSubmitting(true);
    try {
      let res: SafeAny;
      if (logId && logId > 0) {
        res = await apiClient.omicall.submitSelfAssessment(logId, {
          score,
          note: note.trim() || undefined,
        });
      } else {
        res = await apiClient.omicall.submitSelfAssessmentIntent({
          phone: phone || undefined,
          callUuid: callUuid || undefined,
          score,
          note: note.trim() || undefined,
        });
      }

      if (res?.log) {
        message.success('Đã lưu tự đánh giá & mở khóa nhận xét AI Coaching!');
        onSubmitted?.(res.log);
      } else {
        message.success('Đã ghi nhận tự đánh giá! AI Coaching sẽ hiển thị ngay khi tổng đài đồng bộ xong.');
        onSubmitted?.({
          id: logId || 0,
          staffSelfSatisfactionScore: score,
          staffSelfNote: note.trim() || null,
          aiLockedUntilSelfRated: false,
        });
      }
    } catch (err: SafeAny) {
      const errMsg = err?.response?.data?.message || 'Không thể gửi tự đánh giá lúc này.';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyRated) {
    const scoreDiff =
      customerSatisfactionScore !== null && customerSatisfactionScore !== undefined
        ? Math.abs(staffSelfSatisfactionScore - customerSatisfactionScore)
        : 0;

    return (
      <div
        className={`rounded-xl border p-3.5 text-xs space-y-2.5 ${
          isDark ? 'border-amber-500/30 bg-amber-500/[0.05]' : 'border-amber-300 bg-amber-50/70'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <AppIcon icon={Star} size={14} />
            <span>Nhân viên tự đánh giá: {staffSelfSatisfactionScore}/5 ★</span>
          </div>
          <div className="flex items-center gap-1.5">
            {scoreDiff >= 2 && <StatusTag status="warning" label={`Lệch ${scoreDiff}★ với AI`} />}
            <StatusTag status="success" icon={<AppIcon icon={Lock} size={11} />} label="Đã khóa điểm" />
          </div>
        </div>

        {staffSelfNote && (
          <div className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
            <span className="font-semibold">Cảm nhận nhân viên:</span> {staffSelfNote}
          </div>
        )}

        <div className={`border-t pt-2.5 ${isDark ? 'border-zinc-800' : 'border-amber-200/80'}`}>
          <div className="mb-1 flex items-center gap-1.5 font-bold text-[var(--color-primary)]">
            <AppIcon icon={Sparkles} size={14} />
            <span>Nhận xét AI Coaching đối chiếu</span>
          </div>
          {staffAiCoachingFeedback ? (
            <div className={`whitespace-pre-line leading-relaxed ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {staffAiCoachingFeedback}
            </div>
          ) : analysisStatus === 'DONE' ? (
            <div className="text-[var(--mos-text-secondary)]">
              AI đã phân tích cuộc gọi; bấm phân tích lại để tạo góp ý Coaching.
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-500">
              <AppIcon icon={RefreshCw} size={12} className="animate-spin" />
              <span>AI đang phân tích băng ghi âm để đối chiếu với đánh giá của bạn...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3.5 text-xs space-y-2.5 ${
        isDark ? 'border-amber-500/40 bg-zinc-900/70' : 'border-amber-300 bg-amber-50/80'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-amber-600 dark:text-amber-400">
          {aiLockedUntilSelfRated
            ? '🔒 Tự đánh giá trước để mở khóa kết quả AI'
            : 'Bạn đánh giá khách hàng hài lòng mấy sao ở cuộc gọi này?'}
        </span>
        {score > 0 && <StatusTag status="processing" label={STAR_LABELS[score - 1]} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Rate value={score} onChange={setScore} disabled={submitting} tooltips={STAR_LABELS} />
        {score > 0 && <span className="font-semibold tabular-nums">{score}/5 sao</span>}
      </div>

      <Input.TextArea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={submitting}
        placeholder="Cảm nhận nhanh của bạn về phản hồi của khách hàng (không bắt buộc)..."
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--mos-text-secondary)]">
          Điểm tự đánh giá được khóa sau khi gửi để AI đối chiếu khách quan.
        </span>
        <Button
          type="primary"
          size="small"
          loading={submitting}
          disabled={score < 1}
          icon={<AppIcon icon={Sparkles} size={13} />}
          onClick={handleSubmit}
        >
          Gửi &amp; Mở khóa AI Coaching
        </Button>
      </div>
    </div>
  );
}
