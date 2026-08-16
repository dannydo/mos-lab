'use client';

import React from 'react';
import { Avatar, Button, Pagination, Tag, Tooltip, theme } from 'antd';
import type { ButtonProps } from 'antd/es/button';
import type { PaginationProps } from 'antd/es/pagination';
import type { TablePaginationConfig } from 'antd/es/table';
import { ListOrdered, Phone, Settings2, UserRound } from 'lucide-react';
import { AppIcon } from './AppIcon';

/** The one page-size contract used by every operational data table. */
export const STANDARD_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

export type StandardPaginationProps = PaginationProps;

/**
 * Public pagination renderer for operational data views. Features retain their
 * controlled page/query state; this component only applies the shared density
 * and page-size contract.
 */
export function StandardPagination({
  className,
  pageSizeOptions = STANDARD_PAGE_SIZE_OPTIONS,
  responsive = true,
  showSizeChanger = true,
  ...paginationProps
}: StandardPaginationProps) {
  return (
    <Pagination
      {...paginationProps}
      className={['standard-pagination', className].filter(Boolean).join(' ')}
      pageSizeOptions={pageSizeOptions}
      responsive={responsive}
      showSizeChanger={showSizeChanger}
    />
  );
}

/**
 * Shared pagination contract for every operational data table.
 * Features still own current/pageSize/total and persistence; this applies the
 * common density, page-size choices and fallback range copy.
 */
export function normalizeStandardPagination(
  pagination: TablePaginationConfig | false | undefined
): TablePaginationConfig | false | undefined {
  if (!pagination) return pagination;

  return {
    ...pagination,
    className: ['standard-pagination', pagination.className].filter(Boolean).join(' '),
    showSizeChanger: pagination.showSizeChanger ?? true,
    pageSizeOptions: pagination.pageSizeOptions ?? STANDARD_PAGE_SIZE_OPTIONS,
    responsive: pagination.responsive ?? true,
    showTotal:
      pagination.showTotal ??
      ((total, range) => `Hiển thị ${range[0]}-${range[1]} / Tổng ${total.toLocaleString('vi-VN')}`),
  };
}

/** An icon-only replacement for the legacy “STT” table header. */
export function TableIndexHeader() {
  return (
    <span role="img" aria-label="Số thứ tự" title="Số thứ tự" className="table-index-header-icon">
      <AppIcon icon={ListOrdered} size="disclosure" />
    </span>
  );
}

export interface TableSettingsTriggerProps extends Omit<ButtonProps, 'icon' | 'children'> {
  title?: string;
}

/** Standard trailing action for a table toolbar. Place it in `PageToolbar.actions`. */
export function TableSettingsTrigger({
  title = 'Cấu hình cột',
  className = '',
  ...buttonProps
}: TableSettingsTriggerProps) {
  const { token } = theme.useToken();

  return (
    <Tooltip title={title}>
      <Button
        {...buttonProps}
        type="text"
        aria-label={title}
        icon={<AppIcon icon={Settings2} size="action" />}
        className={`table-toolbar-settings-trigger ${className}`.trim()}
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillTertiary,
          color: token.colorTextSecondary,
          ...buttonProps.style,
        }}
      />
    </Tooltip>
  );
}

export interface PagePrimaryIconActionProps extends Omit<ButtonProps, 'children'> {
  title: string;
}

/** Primary create action reserved for the trailing slot of `PageHeader.extra`. */
export function PagePrimaryIconAction({ title, className = '', ...buttonProps }: PagePrimaryIconActionProps) {
  return (
    <Tooltip title={title}>
      <Button
        {...buttonProps}
        type="primary"
        aria-label={title}
        className={`page-primary-icon-action ${className}`.trim()}
      />
    </Tooltip>
  );
}

export interface CustomerIdentityCellProps {
  name?: string | null;
  phone?: string | null;
  avatar?: string | null;
  onOpen?: () => void;
  onCall?: () => void;
  accentColor?: string;
  isForeign?: boolean;
}

/**
 * Customer-table identity standard: name first, phone directly below, never a
 * customer ID. The phone is an explicit call affordance when OmiCall is ready.
 */
export function CustomerIdentityCell({
  name,
  phone,
  avatar,
  onOpen,
  onCall,
  accentColor,
  isForeign = false,
}: CustomerIdentityCellProps) {
  const { token } = theme.useToken();
  const resolvedAccent = accentColor || token.colorPrimary;

  return (
    <div className="customer-identity-cell">
      <Avatar
        src={avatar || undefined}
        icon={<AppIcon icon={UserRound} size="disclosure" />}
        size={28}
        style={{
          backgroundColor: token.colorFillSecondary,
          color: resolvedAccent,
          border: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      />
      <div className="customer-identity-cell-details">
        <div className="customer-identity-cell-name-row">
          {onOpen ? (
            <button type="button" className="customer-identity-cell-name" onClick={onOpen}>
              {name || 'Khách hàng'}
            </button>
          ) : (
            <span className="customer-identity-cell-name">{name || 'Khách hàng'}</span>
          )}
          {isForeign && <Tag color="purple">🌐 Nước ngoài</Tag>}
        </div>
        {phone ? (
          <button
            type="button"
            className="customer-identity-cell-phone"
            aria-label={onCall ? `Gọi ${phone}` : `Số điện thoại ${phone}`}
            onClick={(event) => {
              event.stopPropagation();
              onCall?.();
            }}
          >
            <AppIcon icon={Phone} size="disclosure" style={{ color: resolvedAccent }} />
            <span>{phone}</span>
          </button>
        ) : (
          <span className="customer-identity-cell-phone customer-identity-cell-phone-empty">Chưa có SĐT</span>
        )}
      </div>
    </div>
  );
}
