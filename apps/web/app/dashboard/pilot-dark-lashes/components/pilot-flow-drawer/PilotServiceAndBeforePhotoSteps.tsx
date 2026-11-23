'use client';

import React from 'react';
import { Button } from 'antd';
import { AlertCircle, Camera, CheckCircle, Image as ImageIcon } from 'lucide-react';
import dayjs from 'dayjs';
import type { DarkLashesSessionStatus, PilotAiAssessment, PilotSession, PilotSessionStep } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { resolveMediaUrl } from '~/lib/api-client';
import { PilotStepTimer } from '../PilotStepTimer';
import { PilotPhotoPicker } from './PilotPhotoPicker';

export interface PilotServiceAndBeforePhotoStepsProps {
  session: PilotSession;
  currentStatus: DarkLashesSessionStatus;
  isIneligible: boolean;
  submittingAction: string | null;
  sessionSteps: PilotSessionStep[];
  aiAssessment: PilotAiAssessment | null;
  onUploadBeforePhoto: (file: File) => void;
  onStepsChange: (newSteps: PilotSessionStep[]) => void;
  onServiceDone: () => void;
}

export function PilotServiceAndBeforePhotoSteps({
  session,
  currentStatus,
  isIneligible,
  submittingAction,
  sessionSteps,
  aiAssessment,
  onUploadBeforePhoto,
  onStepsChange,
  onServiceDone,
}: PilotServiceAndBeforePhotoStepsProps) {
  return (
    <>
      {/* ═══════════════════════════════════════════════════
          BƯỚC 4: BEFORE PHOTO (Bắt buộc trước khi làm)
      ═══════════════════════════════════════════════════════ */}
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
          isIneligible
            ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
            : currentStatus === 'ASSESSED' || currentStatus === 'CHECKED_IN'
              ? 'border-emerald-400 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                session.beforePhotoUrl
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              4
            </span>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Ảnh Trước Khi Làm (Before Photo)
              </span>
              <div className="text-xs text-rose-500 font-medium">Bắt buộc chụp trước khi bắt đầu dịch vụ</div>
            </div>
          </div>
          {isIneligible ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              Bỏ qua (FAIL)
            </span>
          ) : session.beforePhotoUrl ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Đã có ảnh Before
            </span>
          ) : (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              Chưa chụp
            </span>
          )}
        </div>

        <PilotPhotoPicker onSelectFile={onUploadBeforePhoto}>
          {({ openCamera, openLibrary }) =>
            session.beforePhotoUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-[4/3] max-h-64 flex items-center justify-center">
                  <img
                    src={resolveMediaUrl(session.beforePhotoUrl)}
                    alt="Before Photo"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-xs font-bold">
                    BEFORE PHOTO
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    icon={<AppIcon icon={Camera} size="sm" />}
                    onClick={openCamera}
                    loading={submittingAction === 'upload-before'}
                  >
                    Chụp lại Camera
                  </Button>
                  <Button
                    icon={<AppIcon icon={ImageIcon} size="sm" />}
                    onClick={openLibrary}
                    loading={submittingAction === 'upload-before'}
                  >
                    Đổi từ thư viện
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50 dark:bg-slate-800/40">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
                  <AppIcon icon={Camera} size="md" />
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Chụp / Tải ảnh Trước khi làm</div>
                <div className="text-xs text-slate-400 mt-1 mb-4">
                  Chụp trực tiếp bằng Camera hoặc chọn ảnh có sẵn từ thư viện điện thoại
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  <Button
                    type="primary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    icon={<AppIcon icon={Camera} size="sm" />}
                    onClick={openCamera}
                    loading={submittingAction === 'upload-before'}
                  >
                    Chụp Camera
                  </Button>
                  <Button
                    icon={<AppIcon icon={ImageIcon} size="sm" />}
                    onClick={openLibrary}
                    loading={submittingAction === 'upload-before'}
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
          BƯỚC 5: SERVICE DONE
      ═══════════════════════════════════════════════════════ */}
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
          isIneligible
            ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
            : currentStatus === 'BEFORE_PHOTO'
              ? 'border-emerald-400 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                session.serviceDoneAt
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              5
            </span>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Hoàn Thành Dịch Vụ (Service Done)
              </span>
              <div className="text-xs text-slate-400">Chuyên Viên hoàn tất uốn mi bóng tối cho khách</div>
            </div>
          </div>
          {isIneligible ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              Bỏ qua (FAIL)
            </span>
          ) : session.serviceDoneAt ? (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Đã hoàn thành
            </span>
          ) : (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
              Đang thực hiện
            </span>
          )}
        </div>

        {/* Step-by-step SOP timer */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Bấm giờ theo từng bước kỹ thuật (SOP Timer)
          </div>
          <PilotStepTimer
            sessionId={session.id}
            steps={sessionSteps}
            onStepsChange={onStepsChange}
            readOnly={isIneligible}
            aiAssessment={session.aiAssessment || aiAssessment}
          />
        </div>

        {session.serviceDoneAt ? (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              Dịch vụ hoàn thành lúc:{' '}
              <strong className="tabular-nums font-bold">
                {dayjs(session.serviceDoneAt).format('HH:mm:ss · DD/MM/YYYY')}
              </strong>
            </span>
            <Button size="small" type="text" onClick={onServiceDone} loading={submittingAction === 'service-done'}>
              Cập nhật lại
            </Button>
          </div>
        ) : (
          <Button
            type="primary"
            size="large"
            block
            disabled={!session.beforePhotoUrl || isIneligible}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
            onClick={onServiceDone}
            loading={submittingAction === 'service-done'}
          >
            <AppIcon icon={CheckCircle} size="sm" />
            Đánh Dấu Hoàn Thành Dịch Vụ
          </Button>
        )}
        {!session.beforePhotoUrl && !session.serviceDoneAt && !isIneligible && (
          <div className="text-[11px] text-rose-500 mt-2 flex items-center gap-1">
            <AppIcon icon={AlertCircle} size="sm" />
            <span>Cần chụp ảnh Before (Bước 4) trước khi bấm hoàn tất dịch vụ.</span>
          </div>
        )}
      </div>
    </>
  );
}
