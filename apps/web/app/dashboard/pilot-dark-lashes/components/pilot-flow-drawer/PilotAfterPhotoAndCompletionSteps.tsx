'use client';

import React from 'react';
import { Button, Input, Rate } from 'antd';
import { AlertCircle, Camera, Check, Image as ImageIcon } from 'lucide-react';
import dayjs from 'dayjs';
import type { DarkLashesSessionStatus, PilotSession } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { resolveMediaUrl } from '~/lib/api-client';
import { FEEDBACK_RATING_LABELS } from './pilot-flow-config';
import { PilotPhotoPicker } from './PilotPhotoPicker';

const { TextArea } = Input;

export interface PilotAfterPhotoAndCompletionStepsProps {
  session: PilotSession;
  currentStatus: DarkLashesSessionStatus;
  isIneligible: boolean;
  submittingAction: string | null;
  feedbackRating: number;
  feedbackNote: string;
  hasAfterPhoto: boolean;
  hasFeedback: boolean;
  canCheckOut: boolean;
  onUploadAfterPhoto: (file: File) => void;
  onFeedbackRatingChange: (rating: number) => void;
  onFeedbackNoteChange: (note: string) => void;
  onSaveFeedback: () => void;
  onCheckOut: () => void;
}

export function PilotAfterPhotoAndCompletionSteps({
  session,
  currentStatus,
  isIneligible,
  submittingAction,
  feedbackRating,
  feedbackNote,
  hasAfterPhoto,
  hasFeedback,
  canCheckOut,
  onUploadAfterPhoto,
  onFeedbackRatingChange,
  onFeedbackNoteChange,
  onSaveFeedback,
  onCheckOut,
}: PilotAfterPhotoAndCompletionStepsProps) {
  return (
    <>
      {/* ═══════════════════════════════════════════════════
          BƯỚC 6: AFTER PHOTO & BEFORE/AFTER COMPARISON
      ═══════════════════════════════════════════════════════ */}
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
          isIneligible
            ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
            : currentStatus === 'SERVICE_DONE'
              ? 'border-emerald-400 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                session.afterPhotoUrl
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              6
            </span>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Ảnh Sau Khi Làm (After Photo)
              </span>
              <div className="text-xs text-rose-500 font-medium">
                Bắt buộc để đối chiếu Before/After &amp; Check-out
              </div>
            </div>
          </div>
          {isIneligible ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              Bỏ qua (FAIL)
            </span>
          ) : session.afterPhotoUrl ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Đã có ảnh After
            </span>
          ) : (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              Chưa chụp
            </span>
          )}
        </div>

        <PilotPhotoPicker onSelectFile={onUploadAfterPhoto}>
          {({ openCamera, openLibrary }) =>
            session.afterPhotoUrl ? (
              <div className="space-y-4">
                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                    <img
                      src={resolveMediaUrl(session.beforePhotoUrl)}
                      alt="Before Photo"
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[11px] font-bold">
                      TRƯỚC (BEFORE)
                    </div>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                    <img
                      src={resolveMediaUrl(session.afterPhotoUrl)}
                      alt="After Photo"
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold">
                      SAU (AFTER) ✨
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    icon={<AppIcon icon={Camera} size="sm" />}
                    onClick={openCamera}
                    loading={submittingAction === 'upload-after'}
                  >
                    Chụp lại Camera
                  </Button>
                  <Button
                    icon={<AppIcon icon={ImageIcon} size="sm" />}
                    onClick={openLibrary}
                    loading={submittingAction === 'upload-after'}
                  >
                    Đổi từ thư viện
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50 dark:bg-slate-800/40">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-2">
                  <AppIcon icon={Camera} size="md" />
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Chụp / Tải ảnh Sau khi làm</div>
                <div className="text-xs text-slate-400 mt-1 mb-4">
                  Chụp trực tiếp bằng Camera hoặc chọn ảnh có sẵn từ thư viện điện thoại
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  <Button
                    type="primary"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    icon={<AppIcon icon={Camera} size="sm" />}
                    onClick={openCamera}
                    loading={submittingAction === 'upload-after'}
                  >
                    Chụp Camera
                  </Button>
                  <Button
                    icon={<AppIcon icon={ImageIcon} size="sm" />}
                    onClick={openLibrary}
                    loading={submittingAction === 'upload-after'}
                    className="border-slate-300 dark:border-slate-700 font-medium"
                  >
                    Thư viện ảnh
                  </Button>
                </div>
              </div>
            )
          }
        </PilotPhotoPicker>
      </div>

      {/* ═══════════════════════════════════════════════════
          BƯỚC 7: CUSTOMER FEEDBACK TẠI CHỖ
      ═══════════════════════════════════════════════════════ */}
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
          isIneligible
            ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
            : currentStatus === 'AFTER_PHOTO'
              ? 'border-emerald-400 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                session.feedbackRating
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              7
            </span>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Customer Feedback Tại ChỖ</span>
              <div className="text-xs text-rose-500 font-medium">
                Bắt buộc khách chấm sao &amp; góp ý trước khi Check-out
              </div>
            </div>
          </div>
          {isIneligible ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              Bỏ qua (FAIL)
            </span>
          ) : session.feedbackRating ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              {session.feedbackRating} ⭐ Đã đánh giá
            </span>
          ) : (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              Chưa đánh giá
            </span>
          )}
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Khách hàng đánh giá mức độ hài lòng (1 - 5 sao):
            </div>
            <div className="flex items-center gap-3">
              <Rate
                value={feedbackRating}
                onChange={onFeedbackRatingChange}
                disabled={isIneligible}
                className="text-amber-400 text-2xl"
              />
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {FEEDBACK_RATING_LABELS[feedbackRating] || ''}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Góp ý hoặc cảm nhận của khách (ngắn gọn):
            </div>
            <TextArea
              rows={2}
              placeholder="VD: Mi cong tự nhiên rất êm, nhân viên tư vấn nhiệt tình..."
              value={feedbackNote}
              disabled={isIneligible}
              onChange={(e) => onFeedbackNoteChange(e.target.value)}
              className="rounded-lg"
            />
          </div>

          <Button
            type="primary"
            block
            disabled={isIneligible}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl"
            onClick={onSaveFeedback}
            loading={submittingAction === 'feedback'}
          >
            Lưu Đánh Giá Feedback
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          BƯỚC 8: CHECK-OUT (Total Visit Duration)
      ═══════════════════════════════════════════════════════ */}
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
          currentStatus === 'FEEDBACK_DONE' || (isIneligible && currentStatus === 'INELIGIBLE')
            ? 'border-emerald-400 ring-2 ring-emerald-500/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                session.checkOutAt
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              8
            </span>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Check-out &amp; Tính Thời Gian Phục Vụ
              </span>
              <div className="text-xs text-slate-400">Total Visit Duration = Check-out time – Check-in time</div>
            </div>
          </div>
          {session.checkOutAt ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Đã Check-out
            </span>
          ) : (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
              Chưa Check-out
            </span>
          )}
        </div>

        {session.checkOutAt ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80">
                <div className="text-[11px] text-slate-400 mb-0.5">Giờ Check-in</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm tabular-nums">
                  {session.checkInAt ? dayjs(session.checkInAt).format('HH:mm') : '--'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80">
                <div className="text-[11px] text-slate-400 mb-0.5">Giờ Check-out</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm tabular-nums">
                  {session.checkOutAt ? dayjs(session.checkOutAt).format('HH:mm') : '--'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mb-0.5">
                  Thời lượng tại shop
                </div>
                <div className="font-extrabold text-emerald-800 dark:text-emerald-200 text-sm tabular-nums">
                  {session.totalDurationMinutes || 0} phút
                </div>
              </div>
            </div>

            <div className="text-right">
              <Button size="small" type="text" onClick={onCheckOut} loading={submittingAction === 'check-out'}>
                Cập nhật lại giờ Check-out
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!canCheckOut && !isIneligible && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AppIcon icon={AlertCircle} size="sm" className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold block mb-0.5">Chưa đủ điều kiện Check-out:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {!hasAfterPhoto && <li>Chưa upload ảnh Sau khi làm (After Photo - Bước 6)</li>}
                    {!hasFeedback && <li>Chưa hoàn thành đánh giá Feedback tại chỗ (Bước 7)</li>}
                  </ul>
                </div>
              </div>
            )}

            <Button
              type="primary"
              size="large"
              block
              disabled={!canCheckOut}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-12 rounded-xl shadow-lg flex items-center justify-center gap-2"
              onClick={onCheckOut}
              loading={submittingAction === 'check-out'}
            >
              <AppIcon icon={Check} size="md" />
              Check-out Khách Ra Về
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
