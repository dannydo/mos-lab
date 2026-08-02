'use client';

import React, { useState } from 'react';
import { Popover, Tooltip, ColorPicker as AntColorPicker, Button, theme } from 'antd';
import { CheckOutlined, DownOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';

// 10 Columns x 8 Rows = 80 Theme Colors (Exact Google Sheets Color Palette Matrix)
export const GOOGLE_SHEETS_MATRIX: string[][] = [
  ['#000000', '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff'],
  ['#434343', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  ['#666666', '#e6b8af', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
  ['#999999', '#dd7e6b', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
  ['#b7b7b7', '#cc4125', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
  ['#cccccc', '#a61c1c', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  ['#d9d9d9', '#85200c', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47'],
  ['#ffffff', '#5b0f00', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'],
];

export const STANDARD_COLORS = ['#000000', '#ffffff', '#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01', '#46bdc6'];

// Helper mapping named keys (blue, cyan, etc.) to hex
export const COLOR_KEY_MAP: Record<string, { hex: string; label: string }> = {
  blue: { hex: '#4a86e8', label: 'Blue' },
  cyan: { hex: '#00ffff', label: 'Cyan' },
  green: { hex: '#00ff00', label: 'Green' },
  emerald: { hex: '#6aa84f', label: 'Emerald' },
  amber: { hex: '#f1c232', label: 'Amber' },
  orange: { hex: '#ff9900', label: 'Orange' },
  rose: { hex: '#a64d79', label: 'Rose' },
  red: { hex: '#ff0000', label: 'Red' },
  purple: { hex: '#9900ff', label: 'Purple' },
  indigo: { hex: '#3c78d8', label: 'Indigo' },
  slate: { hex: '#434343', label: 'Slate' },
};

export interface GoogleSheetColorPickerProps {
  value?: string;
  onChange?: (hexOrKey: string) => void;
  size?: 'small' | 'middle';
  defaultColor?: string;
}

export const GoogleSheetColorPicker: React.FC<GoogleSheetColorPickerProps> = ({
  value = 'blue',
  onChange,
  size = 'small',
  defaultColor = '#2563eb',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>(['#1e293b', '#0f766e']);
  const [customPickerOpen, setCustomPickerOpen] = useState(false);

  // Normalize active color
  const lowerVal = (value || '').toLowerCase();
  let currentHex = defaultColor;
  let currentLabel = value || 'Blue';

  if (COLOR_KEY_MAP[lowerVal]) {
    currentHex = COLOR_KEY_MAP[lowerVal].hex;
    currentLabel = COLOR_KEY_MAP[lowerVal].label;
  } else if (value && value.startsWith('#')) {
    currentHex = value;
    currentLabel = value;
  }

  const handleSelectHex = (hex: string) => {
    if (onChange) {
      onChange(hex);
    }
    setPopoverOpen(false);
  };

  const handleAddCustomColor = (colorObj: SafeAny) => {
    const hex = typeof colorObj === 'string' ? colorObj : colorObj.toHexString();
    if (!customColors.includes(hex)) {
      setCustomColors([...customColors, hex]);
    }
    if (onChange) {
      onChange(hex);
    }
    setCustomPickerOpen(false);
    setPopoverOpen(false);
  };

  const handleReset = () => {
    if (onChange) {
      onChange(defaultColor);
    }
    setPopoverOpen(false);
  };

  const isColorSelected = (hex: string) => {
    return currentHex.toLowerCase() === hex.toLowerCase();
  };

  // Helper to determine checkmark contrast (white checkmark for dark colors, black for light colors)
  const getContrastColor = (hex: string) => {
    if (!hex) return '#000000';
    let cleanHex = hex.trim();
    if (cleanHex.startsWith('#')) {
      if (cleanHex.length === 4) {
        cleanHex = `#${cleanHex[1]}${cleanHex[1]}${cleanHex[2]}${cleanHex[2]}${cleanHex[3]}${cleanHex[3]}`;
      }
      const r = parseInt(cleanHex.slice(1, 3), 16) || 0;
      const g = parseInt(cleanHex.slice(3, 5), 16) || 0;
      const b = parseInt(cleanHex.slice(5, 7), 16) || 0;

      // Luminance formula
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.55 ? '#000000' : '#ffffff';
    }

    const lower = cleanHex.toLowerCase();
    if (['yellow', 'cyan', 'white', 'amber', 'lime'].includes(lower)) {
      return '#000000';
    }
    return '#ffffff';
  };

  const popoverContent = (
    <div style={{ width: '236px', padding: '6px' }} className="user-select-none">
      {/* Top Header Reset Button */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
            \
          </span>
          <span>Reset</span>
        </button>
      </div>

      {/* 10x8 Color Swatch Matrix */}
      <div className="flex flex-col gap-1 mb-3">
        {GOOGLE_SHEETS_MATRIX.map((row, rIdx) => (
          <div key={`row-${rIdx}`} className="flex items-center justify-between">
            {row.map((hex, cIdx) => {
              const selected = isColorSelected(hex);
              const isWhite = hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff';
              const contrastColor = getContrastColor(hex);

              return (
                <Tooltip key={`c-${rIdx}-${cIdx}`} title={hex} mouseEnterDelay={0.3}>
                  <button
                    type="button"
                    onClick={() => handleSelectHex(hex)}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: isWhite ? '1px solid #cbd5e1' : '1px solid rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      outline: 'none',
                      boxShadow: 'none',
                      transition: 'transform 0.1s',
                    }}
                    className="hover:scale-125 active:scale-95"
                  >
                    {selected && (
                      <CheckOutlined
                        style={{
                          color: contrastColor,
                          fontSize: '10px',
                          fontWeight: 'bold',
                          filter:
                            contrastColor === '#ffffff'
                              ? 'drop-shadow(0px 0px 1px rgba(0,0,0,0.8))'
                              : 'drop-shadow(0px 0px 1px rgba(255,255,255,0.9))',
                        }}
                      />
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      {/* STANDARD Section */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mb-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
          <span>STANDARD</span>
          <EditOutlined className="text-[10px]" />
        </div>
        <div className="flex items-center gap-1.5">
          {STANDARD_COLORS.map((hex) => {
            const selected = isColorSelected(hex);
            const isWhite = hex === '#ffffff';
            const contrastColor = getContrastColor(hex);

            return (
              <button
                key={`std-${hex}`}
                type="button"
                onClick={() => handleSelectHex(hex)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: hex,
                  border: isWhite ? '1px solid #cbd5e1' : '1px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  boxShadow: 'none',
                }}
                className="hover:scale-110"
              >
                {selected && (
                  <CheckOutlined
                    style={{
                      color: contrastColor,
                      fontSize: '10px',
                      fontWeight: 'bold',
                      filter:
                        contrastColor === '#ffffff'
                          ? 'drop-shadow(0px 0px 1px rgba(0,0,0,0.8))'
                          : 'drop-shadow(0px 0px 1px rgba(255,255,255,0.9))',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CUSTOM Section */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">CUSTOM</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Custom Plus Button */}
          <Popover
            content={
              <div className="p-1">
                <AntColorPicker size="small" onChangeComplete={handleAddCustomColor} showText />
              </div>
            }
            trigger="click"
            open={customPickerOpen}
            onOpenChange={setCustomPickerOpen}
            placement="bottom"
          >
            <Tooltip title="Thêm màu mới">
              <button
                type="button"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '1px dashed #94a3b8',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                className="hover:border-blue-500 hover:text-blue-500 text-slate-400"
              >
                <PlusOutlined style={{ fontSize: '10px' }} />
              </button>
            </Tooltip>
          </Popover>

          {/* User added custom color swatches */}
          {customColors.map((hex) => {
            const selected = isColorSelected(hex);
            const contrastColor = getContrastColor(hex);

            return (
              <button
                key={`cust-${hex}`}
                type="button"
                onClick={() => handleSelectHex(hex)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: hex,
                  border: '1px solid rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  boxShadow: 'none',
                }}
                className="hover:scale-110"
              >
                {selected && (
                  <CheckOutlined
                    style={{
                      color: contrastColor,
                      fontSize: '10px',
                      fontWeight: 'bold',
                      filter:
                        contrastColor === '#ffffff'
                          ? 'drop-shadow(0px 0px 1px rgba(0,0,0,0.8))'
                          : 'drop-shadow(0px 0px 1px rgba(255,255,255,0.9))',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const { token } = theme.useToken();

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottomRight"
    >
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: size === 'small' ? '3px 8px' : '5px 10px',
          borderRadius: '6px',
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          color: token.colorText,
          cursor: 'pointer',
          fontSize: '12px',
          transition: 'all 0.15s',
          width: '100%',
          justifyContent: 'space-between',
        }}
        className="hover:border-amber-400/70"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: currentHex,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: token.colorText,
            }}
          >
            {currentLabel}
          </span>
        </div>
        <DownOutlined style={{ fontSize: '9px', color: token.colorTextSecondary }} />
      </button>
    </Popover>
  );
};
