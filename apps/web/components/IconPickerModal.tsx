'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input, Tabs, theme } from 'antd';
import * as Icons from '@ant-design/icons';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { CUSTOM_ICONS } from './IconSystem';
import { AdaptiveModal } from './ui/AdaptiveOverlay';
import { getViewportSize, useResponsiveTier } from '../hooks/useResponsiveTier';
import { IconPickerGrid } from './icon-picker/IconPickerGrid';
import {
  ICON_PICKER_HEIGHT_STORAGE_KEY,
  ICON_PICKER_WIDTH_STORAGE_KEY,
  POPULAR_EMOJIS,
  type IconPickerTabKey,
} from './icon-picker/popular-emojis';

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  value?: string;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({ open, onClose, onSelect, value }) => {
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isCompact = responsiveTier === 'mobile' || responsiveTier === 'tablet';
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<IconPickerTabKey>('antd');

  // 1. Persistent Size States
  const [modalWidth, setModalWidth] = useState<number>(600);
  const [modalHeight, setModalHeight] = useState<number>(350);

  // 2. Dynamic limits based on current browser window dimensions
  const [maxDimensions, setMaxDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(ICON_PICKER_WIDTH_STORAGE_KEY);
      const savedHeight = localStorage.getItem(ICON_PICKER_HEIGHT_STORAGE_KEY);
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

  // 5. Get and filter Emoji & Custom icons
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
        localStorage.setItem(ICON_PICKER_WIDTH_STORAGE_KEY, String(currWidth));
        return currWidth;
      });
      setModalHeight((currHeight) => {
        localStorage.setItem(ICON_PICKER_HEIGHT_STORAGE_KEY, String(currHeight));
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
        onChange={(key) => setActiveTab(key as IconPickerTabKey)}
        style={{ marginBottom: '12px' }}
        size="small"
        items={[
          { key: 'antd', label: `Ant Design (${filteredAntdIcons.length})` },
          { key: 'lucide', label: `Lucide (${filteredLucideIcons.length})` },
          { key: 'emoji', label: `Emoji (${filteredEmojis.length})` },
          { key: 'custom', label: `Custom (${filteredCustomIcons.length})` },
        ]}
      />

      <IconPickerGrid
        activeTab={activeTab}
        isCompact={isCompact}
        modalHeight={modalHeight}
        token={token}
        value={value}
        searchText={searchText}
        filteredAntdIcons={filteredAntdIcons}
        filteredLucideIcons={filteredLucideIcons}
        filteredEmojis={filteredEmojis}
        filteredCustomIcons={filteredCustomIcons}
        hasNoIcons={hasNoIcons}
        onSelect={onSelect}
        onClose={onClose}
      />

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
