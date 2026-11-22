'use client';

import React from 'react';
import { Input, InputNumber } from 'antd';
import { Pencil } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';

export type InlineTextCellProps = {
  ariaLabel: string;
  value: string | null;
  placeholder: string;
  disabled?: boolean;
  multiline?: boolean;
  onSave: (value: string | null) => Promise<void>;
};

export function InlineTextCell({
  ariaLabel,
  value,
  placeholder,
  disabled,
  multiline = false,
  onSave,
}: InlineTextCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value || '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [editing, value]);

  const finish = React.useCallback(async () => {
    if (!editing || saving) return;
    const next = draft.trim() || null;
    if (next === (value || null)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, editing, onSave, saving, value]);

  if (editing) {
    const commonProps = {
      autoFocus: true,
      value: draft,
      disabled: saving,
      'aria-label': ariaLabel,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: () => void finish(),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Escape') {
          setDraft(value || '');
          setEditing(false);
        }
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          void finish();
        }
      },
    };
    return multiline ? (
      <Input.TextArea {...commonProps} autoSize={{ minRows: 1, maxRows: 3 }} />
    ) : (
      <Input size="small" {...commonProps} />
    );
  }

  return (
    <button
      type="button"
      className="academy-inline-edit-trigger"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      <span className={value ? '' : 'academy-inline-edit-placeholder'}>{value || placeholder}</span>
      {!disabled && <AppIcon icon={Pencil} />}
    </button>
  );
}

export type InlineVndCellProps = {
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onSave: (value: number) => Promise<void>;
};

export function InlineVndCell({ value, disabled, ariaLabel, onSave }: InlineVndCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const finish = React.useCallback(async () => {
    if (!editing || saving) return;
    const next = Math.max(0, Math.round(Number(draft) || 0));
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, editing, onSave, saving, value]);

  if (editing) {
    return (
      <InputNumber
        autoFocus
        min={0}
        controls={false}
        className="w-full"
        aria-label={ariaLabel}
        value={draft}
        disabled={saving}
        formatter={(next) => formatVND(Math.max(0, Math.round(Number(next) || 0)))}
        parser={(next) => Number(String(next || '').replace(/[^\d]/g, ''))}
        onChange={(next) => setDraft(Number(next) || 0)}
        onBlur={() => void finish()}
        onPressEnter={() => void finish()}
      />
    );
  }

  return (
    <button
      type="button"
      className="academy-inline-edit-trigger academy-inline-money"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      <span className="tabular-nums">{formatVND(value)}</span>
      {!disabled && <AppIcon icon={Pencil} />}
    </button>
  );
}
