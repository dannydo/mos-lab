'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { InputRef } from 'antd';
import { Search } from 'lucide-react';
import { IconButton } from './IconButton';
import { SearchField, type SearchFieldProps } from './SearchField';
import styles from './CollapsibleSearchField.module.css';

export interface CollapsibleSearchFieldProps extends SearchFieldProps {
  /** Controls the disclosure when a screen needs to synchronize it with other toolbar state. */
  expanded?: boolean;
  /** Starts compact by default; set this only when search should be immediately visible. */
  defaultExpanded?: boolean;
  /** Receives every user-driven expansion or automatic empty-field collapse. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Empty searches collapse after focus leaves the control, preserving active queries on screen. */
  collapseOnBlur?: boolean;
  /** Accessible label for the compact icon action. */
  expandButtonLabel?: string;
  /** Maximum desktop width of the expanded control; it always fills a narrow phone toolbar. */
  expandedWidth?: CSSProperties['width'];
}

function hasSearchValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Space-efficient toolbar search. It opens from one named icon action, focuses
 * the input immediately, and returns to its compact state once an empty field
 * loses focus. Searches with an active query stay visible so their context is
 * never hidden from the operator.
 */
export function CollapsibleSearchField({
  className,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  collapseOnBlur = true,
  expandButtonLabel = 'Mở tìm kiếm',
  expandedWidth,
  onBlur,
  onKeyDown,
  value,
  defaultValue,
  ...searchProps
}: CollapsibleSearchFieldProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(
    () => defaultExpanded || hasSearchValue(value ?? defaultValue)
  );
  const inputRef = useRef<InputRef>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const focusAfterExpandRef = useRef(false);
  const isExpanded = expanded ?? uncontrolledExpanded;

  const setExpanded = useCallback(
    (nextExpanded: boolean) => {
      if (expanded === undefined) setUncontrolledExpanded(nextExpanded);
      onExpandedChange?.(nextExpanded);
    },
    [expanded, onExpandedChange]
  );

  useEffect(() => {
    if (!isExpanded || !focusAfterExpandRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      focusAfterExpandRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isExpanded]);

  const handleExpand = useCallback(() => {
    focusAfterExpandRef.current = true;
    setExpanded(true);
  }, [setExpanded]);

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(event);

      const nextFocusTarget = event.relatedTarget as Node | null;
      const focusStaysInside = Boolean(nextFocusTarget && rootRef.current?.contains(nextFocusTarget));

      if (collapseOnBlur && !hasSearchValue(event.currentTarget.value) && !focusStaysInside) {
        setExpanded(false);
      }
    },
    [collapseOnBlur, onBlur, setExpanded]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);

      if (!event.defaultPrevented && event.key === 'Escape' && !hasSearchValue(event.currentTarget.value)) {
        event.preventDefault();
        setExpanded(false);
      }
    },
    [onKeyDown, setExpanded]
  );

  const resolvedExpandedWidth = typeof expandedWidth === 'number' ? `${expandedWidth}px` : expandedWidth;
  const rootStyle =
    resolvedExpandedWidth === undefined
      ? undefined
      : ({ '--mos-collapsible-search-expanded-width': resolvedExpandedWidth } as CSSProperties);

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-expanded={isExpanded}
      style={rootStyle}
    >
      {isExpanded ? (
        <SearchField
          {...searchProps}
          ref={inputRef}
          value={value}
          defaultValue={defaultValue}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={styles.field}
          aria-label={searchProps['aria-label'] ?? expandButtonLabel}
        />
      ) : (
        <IconButton
          label={expandButtonLabel}
          icon={Search}
          tooltip={false}
          className={styles.trigger}
          onClick={handleExpand}
        />
      )}
    </div>
  );
}

export default React.memo(CollapsibleSearchField);
