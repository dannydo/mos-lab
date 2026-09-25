'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Popconfirm, Tooltip, message } from 'antd';
import {
  Check,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { PilotSessionStep } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui/AdaptiveOverlay';

const { TextArea } = Input;

export function formatStepDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '--:--';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) {
    return `${s}s`;
  }
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

export function formatStepDurationLong(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return '0 phút 00 giây';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) {
    return `${s} giây`;
  }
  return `${m} phút ${s < 10 ? '0' : ''}${s} giây`;
}

interface PilotStepTimerProps {
  sessionId: number;
  steps: PilotSessionStep[];
  onStepsChange: (newSteps: PilotSessionStep[]) => void;
  readOnly?: boolean;
}

export function PilotStepTimer({ sessionId, steps, onStepsChange, readOnly = false }: PilotStepTimerProps) {
  const [now, setNow] = useState<number>(Date.now());
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  // Ticking timer for live running steps
  useEffect(() => {
    const hasRunning = steps.some((s) => s.status === 'RUNNING');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [steps]);

  // Compute total technical duration
  const { totalTechnicalSeconds, completedCount } = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const step of steps) {
      if (step.status === 'COMPLETED' && step.durationSeconds) {
        total += step.durationSeconds;
        completed++;
      } else if (step.status === 'RUNNING' && step.startedAt) {
        const elapsed = Math.max(0, Math.floor((now - new Date(step.startedAt).getTime()) / 1000));
        total += elapsed;
      }
    }
    return { totalTechnicalSeconds: total, completedCount: completed };
  }, [steps, now]);

  const handleStart = async (stepId: number) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`start-${stepId}`]: true }));
      const updated = await apiClient.pilot.startSessionStep(sessionId, stepId);
      const newSteps = steps.map((s) => (s.id === stepId ? updated : s));
      onStepsChange(newSteps);
      message.success(`Đã bấm giờ bắt đầu bước: ${updated.stepName}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể bắt đầu bước kỹ thuật.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`start-${stepId}`]: false }));
    }
  };

  const handleFinish = async (stepId: number) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`finish-${stepId}`]: true }));
      const updated = await apiClient.pilot.finishSessionStep(sessionId, stepId);
      const newSteps = steps.map((s) => (s.id === stepId ? updated : s));
      onStepsChange(newSteps);
      message.success(`Đã hoàn tất bước: ${updated.stepName} (${formatStepDuration(updated.durationSeconds)})`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể hoàn tất bước kỹ thuật.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`finish-${stepId}`]: false }));
    }
  };

  const handleReset = async (stepId: number) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`reset-${stepId}`]: true }));
      const updated = await apiClient.pilot.resetSessionStep(sessionId, stepId);
      const newSteps = steps.map((s) => (s.id === stepId ? updated : s));
      onStepsChange(newSteps);
      message.info(`Đã đặt lại bước: ${updated.stepName}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể đặt lại bước kỹ thuật.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`reset-${stepId}`]: false }));
    }
  };

  const handleOpenNoteModal = (step: PilotSessionStep) => {
    setEditingStepId(step.id);
    setNoteText(step.note || '');
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!editingStepId) return;
    try {
      setActionLoading((prev) => ({ ...prev, [`note-${editingStepId}`]: true }));
      const updated = await apiClient.pilot.updateSessionStepNote(sessionId, editingStepId, { note: noteText });
      const newSteps = steps.map((s) => (s.id === editingStepId ? updated : s));
      onStepsChange(newSteps);
      message.success('Đã lưu ghi chú kỹ thuật!');
      setNoteModalOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể lưu ghi chú.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`note-${editingStepId}`]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Total Technical Summary Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 dark:border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <AppIcon icon={Clock} size="md" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tổng thời gian kỹ thuật (SOP Total Time)
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {formatStepDurationLong(totalTechnicalSeconds)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center leading-none px-3 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm tabular-nums">
              {completedCount} / {steps.length} bước xong
            </span>
          </div>
        </div>
      </div>

      {/* Step by Step Timer List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        {steps.map((step, idx) => {
          const isRunning = step.status === 'RUNNING';
          const isCompleted = step.status === 'COMPLETED';
          const isPending = !isRunning && !isCompleted;

          let liveElapsedSeconds = step.durationSeconds ?? 0;
          if (isRunning && step.startedAt) {
            liveElapsedSeconds = Math.max(0, Math.floor((now - new Date(step.startedAt).getTime()) / 1000));
          }

          let statusBg = 'bg-slate-50 dark:bg-slate-800/40 text-slate-400';
          let statusLabel = 'Chưa bắt đầu';
          if (isRunning) {
            statusBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
            statusLabel = 'Đang làm...';
          } else if (isCompleted) {
            statusBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
            statusLabel = 'Hoàn thành';
          }

          return (
            <div
              key={step.id}
              className={`p-3.5 sm:p-4 transition-all ${
                isRunning
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-400/40'
                  : isCompleted
                    ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Left: Step number, Name & Times */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 tabular-nums transition-all ${
                      isRunning
                        ? 'bg-amber-500 text-white animate-pulse shadow-md'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <AppIcon icon={Check} size="sm" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{step.stepName}</span>
                      <span
                        className={`inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBg}`}
                      >
                        {isRunning && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-ping" />
                        )}
                        {statusLabel}
                      </span>
                    </div>

                    {/* Time Details */}
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      {step.startedAt ? (
                        <span>
                          Bắt đầu:{' '}
                          <strong className="text-slate-600 dark:text-slate-300 tabular-nums">
                            {dayjs(step.startedAt).format('HH:mm:ss')}
                          </strong>
                        </span>
                      ) : (
                        <span>Chưa ghi nhận giờ bắt đầu</span>
                      )}
                      {step.finishedAt && (
                        <>
                          <span>•</span>
                          <span>
                            Xong:{' '}
                            <strong className="text-slate-600 dark:text-slate-300 tabular-nums">
                              {dayjs(step.finishedAt).format('HH:mm:ss')}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Note Preview if exists */}
                    {step.note && (
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <AppIcon icon={FileText} size="sm" className="mt-0.5 text-slate-400 shrink-0" />
                        <span className="italic">{step.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Duration Display & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Duration timer */}
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {isRunning ? 'Đang chạy' : 'Thời gian'}
                    </div>
                    <div
                      className={`text-base sm:text-lg font-black tabular-nums transition-all ${
                        isRunning
                          ? 'text-amber-600 dark:text-amber-400'
                          : isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {isRunning || isCompleted ? formatStepDuration(liveElapsedSeconds) : '--:--'}
                    </div>
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <Button
                          type="primary"
                          size="small"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                          onClick={() => handleStart(step.id)}
                          loading={actionLoading[`start-${step.id}`]}
                        >
                          <AppIcon icon={Play} size="sm" />
                          <span>Bắt đầu</span>
                        </Button>
                      )}

                      {isRunning && (
                        <Button
                          type="primary"
                          size="small"
                          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 shadow-sm"
                          onClick={() => handleFinish(step.id)}
                          loading={actionLoading[`finish-${step.id}`]}
                        >
                          <AppIcon icon={StopCircle} size="sm" />
                          <span>Hoàn thành</span>
                        </Button>
                      )}

                      {/* Note Button */}
                      <Tooltip title={step.note ? 'Sửa ghi chú' : 'Thêm ghi chú kỹ thuật'}>
                        <Button
                          type="text"
                          size="small"
                          className={`flex items-center justify-center ${
                            step.note
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          onClick={() => handleOpenNoteModal(step)}
                          icon={<AppIcon icon={Edit3} size="sm" />}
                        />
                      </Tooltip>

                      {/* Reset Button (only if running or completed) */}
                      {(isRunning || isCompleted) && (
                        <Popconfirm
                          title="Đặt lại bước này?"
                          description="Xóa mốc thời gian bắt đầu và kết thúc của bước này để bấm giờ lại?"
                          onConfirm={() => handleReset(step.id)}
                          okText="Đặt lại"
                          cancelText="Hủy"
                        >
                          <Tooltip title="Đặt lại bước">
                            <Button
                              type="text"
                              size="small"
                              className="text-slate-400 hover:text-rose-500"
                              loading={actionLoading[`reset-${step.id}`]}
                              icon={<AppIcon icon={RotateCcw} size="sm" />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note Modal */}
      <AdaptiveModal
        intent="confirm"
        title={
          <div className="flex items-center gap-2">
            <AppIcon icon={FileText} size="sm" className="text-emerald-600 dark:text-emerald-400" />
            <span>Ghi Chú Kỹ Thuật Bước Dịch Vụ</span>
          </div>
        }
        open={noteModalOpen}
        onCancel={() => setNoteModalOpen(false)}
        onOk={handleSaveNote}
        okText="Lưu ghi chú"
        cancelText="Đóng"
        width={440}
      >
        <div className="pt-2">
          <div className="text-xs text-slate-400 mb-2">
            Nhập các lưu ý về chất mi của khách, thời gian canh thuốc hoặc kỹ thuật uốn áp dụng:
          </div>
          <TextArea
            rows={4}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ví dụ: Mi khách mỏng yếu, thoa thuốc uốn 8 phút; form trục uốn size M..."
            maxLength={300}
            showCount
          />
        </div>
      </AdaptiveModal>
    </div>
  );
}
