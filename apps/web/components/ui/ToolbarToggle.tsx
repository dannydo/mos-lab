'use client';

import React from 'react';

export interface ToolbarToggleProps {
  /** Short state label, for example “VAT 8%”. */
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * Standard labelled switch for report toolbars. The visible track remains
 * compact, while the actual keyboard target meets the desktop/mobile size
 * contract without relying on a non-interactive wrapper as the hit area.
 */
export function ToolbarToggle({
  label,
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  className = '',
}: ToolbarToggleProps) {
  return (
    <div className={`toolbar-toggle ${className}`.trim()}>
      <span className="toolbar-toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (typeof label === 'string' ? label : 'Bật hoặc tắt tuỳ chọn')}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`toolbar-toggle-control ${checked ? 'toolbar-toggle-control-checked' : ''}`}
      >
        <span aria-hidden="true" className="toolbar-toggle-control-track">
          <span className="toolbar-toggle-control-thumb" />
        </span>
      </button>
    </div>
  );
}

export default React.memo(ToolbarToggle);
