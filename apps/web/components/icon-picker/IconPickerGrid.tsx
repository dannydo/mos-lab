'use client';

import React from 'react';
import * as Icons from '@ant-design/icons';
import { getCustomIconComponent, getDynamicLucideIcon } from '../IconSystem';
import type { IconPickerTabKey } from './popular-emojis';

interface IconButtonProps {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  token: SafeAny;
}

const IconButton: React.FC<IconButtonProps> = ({ name, isSelected, onSelect, icon, label, token }) => {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        height: '70px',
        gap: '6px',
      }}
      title={name}
      className={isSelected ? 'icon-picker-btn icon-picker-btn-selected' : 'icon-picker-btn'}
    >
      {icon}
      <span
        style={{
          fontSize: '10px',
          fontWeight: '500',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: isSelected ? token.colorPrimary : token.colorTextSecondary,
        }}
      >
        {label}
      </span>
    </button>
  );
};

interface IconPickerGridProps {
  activeTab: IconPickerTabKey;
  isCompact: boolean;
  modalHeight: number;
  token: SafeAny;
  value?: string;
  searchText: string;
  filteredAntdIcons: string[];
  filteredLucideIcons: string[];
  filteredEmojis: readonly string[];
  filteredCustomIcons: string[];
  hasNoIcons: boolean;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

export function IconPickerGrid({
  activeTab,
  isCompact,
  modalHeight,
  token,
  value,
  searchText,
  filteredAntdIcons,
  filteredLucideIcons,
  filteredEmojis,
  filteredCustomIcons,
  hasNoIcons,
  onSelect,
  onClose,
}: IconPickerGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${isCompact ? 72 : 90}px, 1fr))`,
        gap: '8px',
        height: isCompact ? 'calc(100dvh - 198px)' : `${modalHeight}px`,
        overflowY: 'auto',
        padding: '4px',
        border: `1px solid ${token.colorBorder}`,
        borderRadius: '6px',
        background: token.colorBgContainer,
      }}
    >
      <style>{`
        .icon-picker-btn {
          background: ${token.colorBgContainer} !important;
          border: 1px solid ${token.colorBorder} !important;
          color: ${token.colorText} !important;
          transition: all 0.2s ease-in-out !important;
        }
        .icon-picker-btn:hover {
          border-color: ${token.colorPrimary} !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          background: ${token.colorBgTextHover} !important;
        }
        .icon-picker-btn-selected {
          border: 2px solid ${token.colorPrimary} !important;
          background: ${token.colorPrimaryBg || 'rgba(212, 168, 75, 0.15)'} !important;
          color: ${token.colorPrimary} !important;
        }
      `}</style>

      {activeTab === 'antd'
        ? filteredAntdIcons.map((name) => {
            const IconComp = (Icons as SafeAny)[name];
            const isSelected = value === name;
            return (
              <IconButton
                key={name}
                name={name}
                isSelected={isSelected}
                onSelect={() => {
                  onSelect(name);
                  onClose();
                }}
                icon={
                  IconComp &&
                  React.createElement(IconComp, {
                    style: {
                      fontSize: '20px',
                      color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                    },
                  })
                }
                label={name.replace('Outlined', '')}
                token={token}
              />
            );
          })
        : activeTab === 'lucide'
          ? filteredLucideIcons.map((name) => {
              const IconComp = getDynamicLucideIcon(name);
              const isSelected = value === `lucide:${name}`;
              return (
                <IconButton
                  key={name}
                  name={name}
                  isSelected={isSelected}
                  onSelect={() => {
                    onSelect(`lucide:${name}`);
                    onClose();
                  }}
                  icon={
                    IconComp &&
                    React.createElement(IconComp, {
                      size: 20,
                      style: {
                        color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                      },
                    })
                  }
                  label={name}
                  token={token}
                />
              );
            })
          : activeTab === 'emoji'
            ? filteredEmojis.map((emoji, idx) => {
                const isSelected = value === emoji;
                return (
                  <IconButton
                    key={`${emoji}-${idx}`}
                    name={emoji}
                    isSelected={isSelected}
                    onSelect={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                    icon={<span style={{ fontSize: '22px' }}>{emoji}</span>}
                    label={emoji}
                    token={token}
                  />
                );
              })
            : filteredCustomIcons.map((name) => {
                const isSelected = value === name;
                const customIcon = getCustomIconComponent(name, {
                  size: 20,
                  style: {
                    color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                  },
                });
                return (
                  <IconButton
                    key={name}
                    name={name}
                    isSelected={isSelected}
                    onSelect={() => {
                      onSelect(name);
                      onClose();
                    }}
                    icon={customIcon}
                    label={name.replace('custom:', '')}
                    token={token}
                  />
                );
              })}

      {hasNoIcons && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: token.colorTextSecondary }}>
          <div className="text-xs text-slate-400">Không tìm thấy icon sẵn có trùng khớp.</div>
          {searchText && (
            <button
              type="button"
              onClick={() => {
                onSelect(searchText.trim());
                onClose();
              }}
              className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <span>Dùng Emoji / Icon tùy chỉnh:</span>
              <span className="font-bold text-amber-300 text-sm">&quot;{searchText.trim()}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
