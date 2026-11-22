'use client';

import React from 'react';
import { Button } from 'antd';
import { Check, CheckCircle, Clock, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import type { DarkLashesSessionStatus, PilotSession } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton } from '~/components/ui';
import { PILOT_FLOW_STATUS_STEPS } from './pilot-flow-config';

export function PilotFlowDrawerTitle({ session }: { session: PilotSession }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <AppIcon icon={Sparkles} size="sm" />
          </span>
          <div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{session.customerName}</span>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-medium border bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 tabular-nums">
                {session.customerPhone}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Mã ca #{session.id}</span>
              <span>•</span>
              <span>Ngày {session.sessionDate ? dayjs(session.sessionDate).format('DD/MM/YYYY') : '--'}</span>
              {session.bookingTime && (
                <>
                  <span>•</span>
                  <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {session.bookingTime}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PilotFlowProgressBar({ currentStepIdx }: { currentStepIdx: number }) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
        Tiến trình ca dịch vụ ({PILOT_FLOW_STATUS_STEPS.length} bước)
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-2">
        {PILOT_FLOW_STATUS_STEPS.map((s, idx) => {
          const isPassed = currentStepIdx > idx;
          const isCurrent = currentStepIdx === idx;
          let bgClass = 'bg-slate-200 dark:bg-slate-800 text-slate-400';
          let ringClass = '';

          if (isPassed) {
            bgClass = 'bg-emerald-500 text-white font-semibold';
          } else if (isCurrent) {
            bgClass = 'bg-emerald-600 text-white font-bold shadow-md';
            ringClass = 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900';
          }

          return (
            <div key={s.key} className="flex flex-col items-center text-center gap-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition-all ${bgClass} ${ringClass}`}
              >
                {isPassed ? <AppIcon icon={Check} size="sm" /> : s.stepNumber}
              </div>
              <span
                className={`text-[10px] leading-tight line-clamp-1 ${
                  isCurrent
                    ? 'font-bold text-emerald-600 dark:text-emerald-400'
                    : isPassed
                      ? 'text-slate-600 dark:text-slate-300 font-medium'
                      : 'text-slate-400'
                }`}
              >
                {s.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PilotFlowBookingStep({ session }: { session: PilotSession }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
            1
          </span>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Thông tin Booking</span>
        </div>
        <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          Đã xác nhận
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">Ngày hẹn:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {session.sessionDate ? dayjs(session.sessionDate).format('DD/MM/YYYY') : '--'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Giờ hẹn:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {session.bookingTime || 'Chưa đặt giờ'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Chuyên Viên:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {session.technicianName || 'Cô Đẫm (Lead)'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
          <div className="flex items-center gap-1">
            <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
              {session.customerPhone}
            </span>
            <CopyPhoneButton phone={session.customerPhone} size="xs" />
          </div>
        </div>
      </div>

      {session.bookingNote && (
        <div className="text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
          <span className="font-bold">Ghi chú booking: </span>
          {session.bookingNote}
        </div>
      )}
    </div>
  );
}

export interface PilotFlowCheckInStepProps {
  session: PilotSession;
  currentStatus: DarkLashesSessionStatus;
  submittingAction: string | null;
  onCheckIn: () => void;
}

export function PilotFlowCheckInStep({
  session,
  currentStatus,
  submittingAction,
  onCheckIn,
}: PilotFlowCheckInStepProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
        currentStatus === 'BOOKED'
          ? 'border-emerald-400 ring-2 ring-emerald-500/20'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              session.checkInAt
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            2
          </span>
          <div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Check-in Khách Đến</span>
            <div className="text-xs text-slate-400">Ghi nhận chính xác ngày + giờ khách có mặt tại shop</div>
          </div>
        </div>
        {session.checkInAt ? (
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            Đã Check-in
          </span>
        ) : (
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Chờ khách đến
          </span>
        )}
      </div>

      {session.checkInAt ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
            <AppIcon icon={CheckCircle} size="sm" className="text-emerald-600" />
            <span>Khách đã check-in lúc:</span>
            <span className="font-bold tabular-nums">{dayjs(session.checkInAt).format('HH:mm:ss · DD/MM/YYYY')}</span>
          </div>
          <Button size="small" type="text" onClick={onCheckIn} loading={submittingAction === 'check-in'}>
            Cập nhật lại giờ
          </Button>
        </div>
      ) : (
        <Button
          type="primary"
          size="large"
          block
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
          onClick={onCheckIn}
          loading={submittingAction === 'check-in'}
        >
          <AppIcon icon={Clock} size="sm" />
          Bấm Check-in Khách Đến Ngay
        </Button>
      )}
    </div>
  );
}
