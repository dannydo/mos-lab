'use client';

import React, { useState, useCallback } from 'react';
import { Tooltip, message } from 'antd';
import { Copy, Check } from 'lucide-react';
import { AppIcon } from './AppIcon';

export interface CopyPhoneButtonProps {
  phone?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'default';
  tooltip?: string;
  quiet?: boolean;
  showText?: boolean;
  as?: 'button' | 'span';
}

/**
 * Clean phone number by removing label prefixes (e.g. "SĐT: ", parentheses).
 */
export function extractCleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let str = String(phone).trim();
  // Remove prefixes like "SĐT:", "SDT:", "Phone:"
  str = str.replace(/^(SĐT|SDT|Phone|Tel)\s*[:：\-]\s*/i, '');
  // Remove wrapping parentheses
  str = str.replace(/^\((.+)\)$/, '$1');
  return str.trim();
}

/**
 * Universal copy button for phone numbers.
 * Supports clean clipboard copying, checkmark transition, tooltip state,
 * and stopPropagation to prevent unintended row/card clicks.
 */
export function CopyPhoneButton({
  phone,
  className = '',
  size = 'sm',
  tooltip = 'Sao chép SĐT',
  quiet = false,
  showText = false,
  as = 'button',
}: CopyPhoneButtonProps) {
  const [copied, setCopied] = useState(false);

  const cleanPhone = extractCleanPhoneNumber(phone);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!cleanPhone) return;

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(cleanPhone);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = cleanPhone;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        setCopied(true);
        if (!quiet) {
          message.success({
            content: `Đã sao chép: ${cleanPhone}`,
            key: 'copy-phone-toast',
            duration: 1.5,
          });
        }
        setTimeout(() => setCopied(false), 1800);
      } catch {
        message.error('Không thể sao chép vào bộ nhớ tạm');
      }
    },
    [cleanPhone, quiet]
  );

  // Return null if phone is empty or a placeholder
  if (
    !cleanPhone ||
    cleanPhone === '-' ||
    cleanPhone === '—' ||
    cleanPhone === 'Chưa có SĐT' ||
    cleanPhone === 'Chưa cập nhật' ||
    cleanPhone === 'N/A'
  ) {
    return null;
  }

  const iconSize = size === 'xs' ? 11 : size === 'default' ? 14 : 12;
  const paddingClass = size === 'xs' ? 'p-0.5' : size === 'default' ? 'p-1.5' : 'p-1';

  const content = (
    <>
      <AppIcon
        icon={copied ? Check : Copy}
        size={iconSize}
        className={`transition-transform duration-150 ${copied ? 'scale-110' : ''}`}
      />
      {showText && <span className="ml-1 text-xs">{copied ? 'Đã chép' : 'Sao chép'}</span>}
    </>
  );

  const sharedClassName =
    `inline-flex items-center justify-center shrink-0 rounded border-0 bg-transparent cursor-pointer transition-all duration-150 ${paddingClass} ${
      copied
        ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
        : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
    } ${className}`.trim();

  return (
    <Tooltip title={copied ? 'Đã sao chép!' : tooltip} placement="top">
      {as === 'span' ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={copied ? 'Đã sao chép số điện thoại' : `Sao chép số điện thoại ${cleanPhone}`}
          onClick={handleCopy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCopy(e as unknown as React.MouseEvent);
            }
          }}
          className={sharedClassName}
        >
          {content}
        </span>
      ) : (
        <button
          type="button"
          aria-label={copied ? 'Đã sao chép số điện thoại' : `Sao chép số điện thoại ${cleanPhone}`}
          onClick={handleCopy}
          className={sharedClassName}
        >
          {content}
        </button>
      )}
    </Tooltip>
  );
}
