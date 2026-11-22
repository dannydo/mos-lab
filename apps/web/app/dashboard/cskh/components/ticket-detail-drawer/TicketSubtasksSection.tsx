'use client';

import React from 'react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle2, Clock } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import { TECHNICAL_ISSUE_TAG_LABELS } from './constants';
import { getDepartmentTagStatus, getWarrantyTypeSummaryLabel } from './helpers';
import type { TicketDetailRecord, TicketSubtaskItem } from './types';

export interface TicketSubtasksSectionProps {
  activeTicket: TicketDetailRecord;
  onOpenScheduleModal: (subtask: TicketSubtaskItem) => void;
  onOpenSubtaskModal: (subtask: TicketSubtaskItem) => void;
}

export function TicketSubtasksSection({
  activeTicket,
  onOpenScheduleModal,
  onOpenSubtaskModal,
}: TicketSubtasksSectionProps) {
  const subtasks = activeTicket.subtasks;
  if (!subtasks || subtasks.length === 0) {
    return null;
  }

  const completedCount = activeTicket.completedSubtasksCount || 0;
  const totalCount = activeTicket.totalSubtasksCount || 0;
  const isAllCompleted = completedCount === totalCount;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span>📋 Phụ Trách & Giải Pháp Nội Bộ</span>
          <StatusTag
            status={isAllCompleted ? 'success' : 'processing'}
            label={`${completedCount}/${totalCount} Hoàn thành`}
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-3">
        {subtasks.map((st) => {
          const isDone = st.status === 'RESOLVED';
          return (
            <div
              key={st.id}
              className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <StatusTag
                    status={getDepartmentTagStatus(st.department)}
                    label={st.department}
                    bordered={false}
                    className="font-bold"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Phụ trách: {st.assignedStaffName || 'Trưởng bộ phận'}
                  </span>
                </div>
                {isDone ? (
                  <StatusTag
                    status="success"
                    icon={<AppIcon icon={CheckCircle2} size={12} />}
                    label="Đã nộp giải pháp"
                  />
                ) : (
                  <StatusTag status="warning" icon={<AppIcon icon={Clock} size={12} />} label="Chờ giải pháp" />
                )}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 mb-2 space-y-1.5">
                <div>{st.issueSummary}</div>

                {st.technicalIssueTags && st.technicalIssueTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 my-1">
                    {st.technicalIssueTags.map((tag) => (
                      <StatusTag
                        key={tag}
                        status="orange"
                        bordered={false}
                        label={TECHNICAL_ISSUE_TAG_LABELS[tag] || tag}
                        className="text-[11px] font-medium"
                      />
                    ))}
                  </div>
                )}

                {st.department === 'CV' && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                    {st.isWithin3DayWarranty ? (
                      <StatusTag status="gold" label="🛡️ Bảo Hành 3 Ngày (Kiểu Úc 0đ)" className="font-semibold" />
                    ) : (
                      <StatusTag
                        status="default"
                        label="⚠️ Quá Hạn Bảo Hành 3 Ngày"
                        className="text-slate-500 dark:text-slate-400"
                      />
                    )}
                    {st.inspectionAppointmentDate && (
                      <StatusTag
                        status="cyan"
                        label={`📅 Hẹn đến Shop: ${dayjs(st.inspectionAppointmentDate).format('DD/MM HH:mm')} (${
                          st.inspectionStoreName || 'Store'
                        })`}
                        className="font-medium tabular-nums"
                      />
                    )}
                    {st.previousTechnicianName && (
                      <span className="text-slate-500 dark:text-slate-400">
                        CV ca cũ:{' '}
                        <strong className="text-amber-600 dark:text-amber-400">{st.previousTechnicianName}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isDone ? (
                <div className="text-xs bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded border border-emerald-200 dark:border-emerald-800/50 space-y-1 text-slate-700 dark:text-slate-200">
                  {st.inspectionResultNote && (
                    <div>
                      <strong className="text-emerald-800 dark:text-emerald-300">🔍 Kết quả soi mi tại Shop:</strong>{' '}
                      {st.inspectionResultNote}
                    </div>
                  )}
                  <div>
                    <strong className="text-emerald-800 dark:text-emerald-300">Hành động khắc phục:</strong>{' '}
                    {st.actionPlan}
                  </div>
                  {st.warrantyType && (
                    <div className="text-emerald-700 dark:text-emerald-400">
                      <strong>Phương án bảo hành:</strong> {getWarrantyTypeSummaryLabel(st.warrantyType)}
                    </div>
                  )}
                  {st.replacementTechnicianName && (
                    <div>
                      <strong className="text-emerald-800 dark:text-emerald-300">CV làm lại:</strong>{' '}
                      {st.replacementTechnicianName}
                    </div>
                  )}
                  {st.warrantyAppointmentDate && (
                    <div className="tabular-nums">
                      <strong className="text-emerald-800 dark:text-emerald-300">Hẹn bảo hành:</strong>{' '}
                      {dayjs(st.warrantyAppointmentDate).format('DD/MM/YYYY HH:mm')}
                    </div>
                  )}
                  {st.resolutionNote && (
                    <div>
                      <strong className="text-emerald-800 dark:text-emerald-300">Ghi chú:</strong> {st.resolutionNote}
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-1 tabular-nums">
                    Nộp bởi {st.resolvedByStaffName || 'Trưởng bộ phận'} lúc{' '}
                    {st.resolvedAt ? dayjs(st.resolvedAt).format('DD/MM HH:mm') : ''}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {st.department === 'CV' && (
                    <Button
                      size="small"
                      type="default"
                      icon={<AppIcon icon={Clock} size={13} />}
                      className="text-xs text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700 hover:border-sky-500"
                      onClick={() => onOpenScheduleModal(st)}
                    >
                      📅{' '}
                      {st.status === 'APPOINTMENT_SCHEDULED'
                        ? 'Sửa Lịch Hẹn Đón Khách'
                        : 'GĐ1: Đặt Lịch Hẹn Đến Shop 0đ'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    type="primary"
                    icon={<AppIcon icon={CheckCircle2} size={13} />}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 border-none"
                    onClick={() => onOpenSubtaskModal(st)}
                  >
                    {st.department === 'CV'
                      ? '🔍 GĐ2: Soi Mi Tại Shop & Chốt Bảo Hành'
                      : `Nộp Giải Pháp Bộ Phận ${st.department}`}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
