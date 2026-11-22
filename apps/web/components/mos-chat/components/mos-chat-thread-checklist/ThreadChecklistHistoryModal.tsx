'use client';

import React from 'react';
import { Clock, History } from 'lucide-react';
import type { MosChatTaskItem } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';

export interface ThreadChecklistHistoryModalProps {
  open: boolean;
  isDark: boolean;
  activityLog: NonNullable<MosChatTaskItem['activityLog']>;
  onClose: () => void;
}

export const ThreadChecklistHistoryModal: React.FC<ThreadChecklistHistoryModalProps> = ({
  open,
  isDark,
  activityLog,
  onClose,
}) => {
  return (
    <AdaptiveModal
      intent="confirm"
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      title={
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <History size={16} />
          <span>Lịch sử thao tác Task &amp; Checklist</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <div className="max-h-[380px] overflow-y-auto space-y-2 pt-2">
        {activityLog.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Chưa có lịch sử thao tác.</p>
        ) : (
          activityLog
            .slice()
            .reverse()
            .map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 text-xs"
              >
                <Clock size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{log.actorName}</span>
                    <span className="text-[10px] tabular-nums text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5 mb-0 text-[11.5px]">{log.description}</p>
                </div>
              </div>
            ))
        )}
      </div>
    </AdaptiveModal>
  );
};
