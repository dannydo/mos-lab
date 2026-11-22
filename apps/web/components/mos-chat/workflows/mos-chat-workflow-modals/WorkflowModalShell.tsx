'use client';

import React from 'react';
import { X } from 'lucide-react';

export const WORKFLOW_CONTROL_CLASS =
  'w-full px-2.5 py-2 rounded-lg border border-[var(--mos-surface-border-strong)] bg-[var(--mos-surface-raised)] text-[var(--mos-text)] text-[13px] focus:outline-none focus:border-[var(--mos-accent)]';

export const WORKFLOW_COMPACT_CONTROL_CLASS =
  'w-full px-2.5 py-2 rounded-lg border border-[var(--mos-surface-border-strong)] bg-[var(--mos-surface-raised)] text-[var(--mos-text)] text-[12.5px] focus:outline-none focus:border-[var(--mos-accent)]';

export interface WorkflowFieldProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export const WorkflowField: React.FC<WorkflowFieldProps> = ({ label, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-xs font-bold mb-1 text-[var(--mos-text)]">
      {label}
    </label>
    {children}
  </div>
);

export interface WorkflowModalShellProps {
  open: boolean;
  isDark: boolean;
  eyebrow: string;
  title: string;
  maxWidthClassName?: string;
  titleClassName?: string;
  errorMsg: string | null;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

export const WorkflowModalShell: React.FC<WorkflowModalShellProps> = ({
  open,
  isDark,
  eyebrow,
  title,
  maxWidthClassName = 'max-w-[540px]',
  titleClassName = 'text-[17px]',
  errorMsg,
  submitting,
  submitLabel,
  submittingLabel,
  onClose,
  onSubmit,
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className={`mos-chat-theme-scope fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-[4px] flex items-center justify-center p-4 ${
        isDark ? 'dark' : ''
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClassName} max-h-[88vh] overflow-y-auto rounded-2xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border-strong)] shadow-[var(--mos-shadow,0_24px_48px_rgba(0,0,0,0.35))] p-5 text-[var(--mos-text)]`}
      >
        <div className="flex justify-between items-center gap-3 mb-3.5">
          <div>
            <div className="text-[11px] font-bold text-[var(--mos-accent)] uppercase">{eyebrow}</div>
            <h3 className={`m-0 font-extrabold leading-snug ${titleClassName}`}>{title}</h3>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="bg-transparent border-0 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer p-1 rounded-lg transition-colors shrink-0 inline-flex items-center justify-center"
          >
            <X className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {children}

          {errorMsg && <div className="text-red-600 dark:text-red-400 text-xs font-semibold">{errorMsg}</div>}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-[var(--mos-surface-border-strong)] bg-[var(--mos-surface-raised)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] font-semibold text-[12.5px] cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              className="px-4 py-2 rounded-lg border-0 bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold text-[12.5px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
