'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Input, theme, Tabs } from 'antd';
import * as Icons from '@ant-design/icons';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { getDynamicLucideIcon, getCustomIconComponent, CUSTOM_ICONS } from './IconSystem';
import { AdaptiveModal } from './ui/AdaptiveOverlay';
import { getViewportSize, useResponsiveTier } from '../hooks/useResponsiveTier';

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  value?: string;
}

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

export const IconPickerModal: React.FC<IconPickerModalProps> = ({ open, onClose, onSelect, value }) => {
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isCompact = responsiveTier === 'mobile' || responsiveTier === 'tablet';
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'antd' | 'lucide' | 'emoji' | 'custom'>('antd');

  // 1. Persistent Size States
  const [modalWidth, setModalWidth] = useState<number>(600);
  const [modalHeight, setModalHeight] = useState<number>(350);

  // 2. Dynamic limits based on current browser window dimensions
  const [maxDimensions, setMaxDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('mos_icon_picker_width');
      const savedHeight = localStorage.getItem('mos_icon_picker_height');
      if (savedWidth) setModalWidth(Number(savedWidth));
      if (savedHeight) setModalHeight(Number(savedHeight));

      const viewport = getViewportSize();
      setMaxDimensions({
        width: isCompact ? Math.max(320, viewport.width - 24) : Math.max(800, viewport.width - 80),
        height: isCompact ? Math.max(200, viewport.height - 210) : Math.max(400, viewport.height - 260),
      });
    }
  }, [isCompact, responsiveTier]);

  // Determine correct initial tab based on selection value
  useEffect(() => {
    if (open) {
      setSearchText('');
      if (value && value.startsWith('lucide:')) {
        setActiveTab('lucide');
      } else if (value && value.startsWith('custom:')) {
        setActiveTab('custom');
      } else {
        setActiveTab('antd');
      }
    }
  }, [open, value]);

  // 3. Get and filter Ant Design outlined icons
  const outlinedIcons = useMemo(() => {
    return Object.keys(Icons)
      .filter((name) => name.endsWith('Outlined') && typeof (Icons as SafeAny)[name] === 'object')
      .sort();
  }, []);

  const filteredAntdIcons = useMemo(() => {
    if (!searchText) return outlinedIcons;
    const query = searchText.toLowerCase();
    return outlinedIcons.filter((name) => name.toLowerCase().includes(query));
  }, [searchText, outlinedIcons]);

  // 4. Get and filter Lucide icons
  const lucideIcons = useMemo(() => {
    return Object.keys(dynamicIconImports).sort();
  }, []);

  const filteredLucideIcons = useMemo(() => {
    if (!searchText) return lucideIcons;
    const query = searchText.toLowerCase();
    return lucideIcons.filter((name) => name.toLowerCase().includes(query));
  }, [searchText, lucideIcons]);

  // 5. Get and filter Custom icons
  const POPULAR_EMOJIS = [
    // Smileys & Emotion
    '😃',
    '😄',
    '😁',
    '😆',
    '😅',
    '😂',
    '🤣',
    '😊',
    '😇',
    '🙂',
    '🙃',
    '😉',
    '😌',
    '😍',
    '🥰',
    '😘',
    '😗',
    '😙',
    '😚',
    '😋',
    '😛',
    '😝',
    '😜',
    '🤪',
    '🤨',
    '🧐',
    '🤓',
    '😎',
    '🤩',
    '🥳',
    '😏',
    '😒',
    '😞',
    '😔',
    '😟',
    '😕',
    '🙁',
    '☹️',
    '😣',
    '😖',
    '😫',
    '😩',
    '🥺',
    '😢',
    '😭',
    '😤',
    '😠',
    '😡',
    '🤬',
    '🤯',
    '😳',
    '🥵',
    '🥶',
    '😱',
    '😨',
    '😰',
    '😥',
    '😓',
    '🤗',
    '🤔',
    '🤭',
    '🤫',
    '🤥',
    '😶',
    '😐',
    '😑',
    '😬',
    '🙄',
    '😯',
    '😦',
    '😧',
    '😮',
    '😲',
    '🥱',
    '😴',
    '🤤',
    '😪',
    '😵',
    '🤐',
    '🥴',
    '🤢',
    '🤮',
    '🤧',
    '😷',
    '🤒',
    '🤕',
    '🤑',
    '🤠',
    '😈',
    '👿',
    '👹',
    '👺',
    '🤡',
    '💩',
    '👻',
    '💀',
    // Hands & Gestures
    '👋',
    '🤚',
    '🖐️',
    '✋',
    '🖖',
    '👌',
    '🤏',
    '✌️',
    '🤞',
    '🤟',
    '🤘',
    '🤙',
    '👈',
    '👉',
    '👆',
    '🖕',
    '👇',
    '☝️',
    '👍',
    '👎',
    '✊',
    '👊',
    '🤛',
    '🤜',
    '👏',
    '🙌',
    '👐',
    '🤲',
    '🤝',
    '🙏',
    '✍️',
    '💅',
    '🤳',
    '💪',
    '🦾',
    '🦵',
    '🦶',
    '👂',
    '👃',
    '🧠',
    '🫀',
    '🫁',
    '🦷',
    '🦴',
    '👀',
    '👁️',
    '👅',
    '👄',
    // Hearts & Romance
    '💋',
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '🤎',
    '💔',
    '❣️',
    '💕',
    '💞',
    '💓',
    '💗',
    '💖',
    '💘',
    '💝',
    '💟',
    '💌',
    '💍',
    '💎',
    // Beauty, Gifts & Objects
    '💄',
    '💇‍♀️',
    '💇‍♂️',
    '💆‍♀️',
    '💆‍♂️',
    '🛍️',
    '👑',
    '🎁',
    '🎀',
    '🎈',
    '🎉',
    '🎊',
    '🎋',
    '🎍',
    '🎎',
    '🎏',
    '🎐',
    '🎑',
    '🧧',
    '📱',
    '💻',
    '⏰',
    '📅',
    '🔔',
    '🛏️',
    '☕',
    '🍹',
    '🍷',
    '🍺',
    '🥂',
    '🍾',
    '🎂',
    '🍰',
    '🧁',
    '🍭',
    '🍬',
    '🍫',
    '🍿',
    '🍩',
    '🍪',
    // Status, Sparkles & Nature
    '✨',
    '⭐',
    '🌟',
    '💫',
    '💥',
    '🔥',
    '⚡',
    '🌈',
    '☀️',
    '🌙',
    '☁️',
    '❄️',
    '💧',
    '🌊',
    '🏆',
    '🏅',
    '🥇',
    '🥈',
    '🥉',
    '🎯',
    '🚀',
    '💯',
    '✅',
    '❌',
    '⚠️',
    '🛑',
    '🔴',
    '🟢',
    '🔵',
    '🟡',
    '🟠',
    '🟣',
    '⚫',
    '⚪',
    '🌺',
    '🌸',
    '🌼',
    '🌻',
    '🌹',
    '🌷',
    '🌱',
    '🌲',
    '🌴',
    '🍀',
    '🍁',
    '🍂',
  ];

  const filteredEmojis = useMemo(() => {
    if (!searchText) return POPULAR_EMOJIS;
    return POPULAR_EMOJIS.filter((e) => e.includes(searchText.trim()));
  }, [searchText]);

  const filteredCustomIcons = useMemo(() => {
    if (!searchText) return CUSTOM_ICONS;
    const query = searchText.toLowerCase();
    return CUSTOM_ICONS.filter((name) => name.toLowerCase().includes(query));
  }, [searchText]);

  // 6. Mouse Drag Resizing Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalWidth;
    const startHeight = modalHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Symmetrical horizontal expansion (deltaX * 2) and height expansion (deltaY)
      const newWidth = Math.max(400, Math.min(maxDimensions.width, startWidth + deltaX * 2));
      const newHeight = Math.max(200, Math.min(maxDimensions.height, startHeight + deltaY));

      setModalWidth(newWidth);
      setModalHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Persist values in localStorage
      setModalWidth((currWidth) => {
        localStorage.setItem('mos_icon_picker_width', String(currWidth));
        return currWidth;
      });
      setModalHeight((currHeight) => {
        localStorage.setItem('mos_icon_picker_height', String(currHeight));
        return currHeight;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const hasNoIcons =
    activeTab === 'antd'
      ? filteredAntdIcons.length === 0
      : activeTab === 'lucide'
        ? filteredLucideIcons.length === 0
        : filteredCustomIcons.length === 0;

  return (
    <AdaptiveModal
      intent="data"
      className="icon-picker-modal"
      title="Chọn Icon từ thư viện"
      open={open}
      onCancel={onClose}
      footer={null}
      width={isCompact ? undefined : modalWidth}
      styles={{
        body: {
          padding: '16px 16px 24px 16px',
          position: 'relative',
        },
      }}
    >
      <Input.Search
        placeholder="Tìm kiếm icon (ví dụ: user, phone, check, heart...)"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: '12px' }}
        allowClear
        autoFocus
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'antd' | 'lucide' | 'emoji' | 'custom')}
        style={{ marginBottom: '12px' }}
        size="small"
        items={[
          { key: 'antd', label: `Ant Design (${filteredAntdIcons.length})` },
          { key: 'lucide', label: `Lucide (${filteredLucideIcons.length})` },
          { key: 'emoji', label: `Emoji (${filteredEmojis.length})` },
          { key: 'custom', label: `Custom (${filteredCustomIcons.length})` },
        ]}
      />

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

      {!isCompact && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            right: '4px',
            bottom: '4px',
            width: '16px',
            height: '16px',
            cursor: 'se-resize',
            zIndex: 1,
            color: token.colorTextDescription,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '2px',
          }}
          title="Kéo để thay đổi kích thước bảng"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6, cursor: 'se-resize' }}>
            <path
              d="M10 0 L0 10 M10 4 L4 10 M10 8 L8 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </AdaptiveModal>
  );
};
