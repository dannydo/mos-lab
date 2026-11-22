'use client';

import { Button, Input, Radio, Space } from 'antd';
import { Check, Copy, Eye } from 'lucide-react';
import type { CoreThemeMode } from '@mos-lab/shared';

interface ThemeStudioLiveBoardTabProps {
  customLabel: string;
  onChangeCustomLabel: (value: string) => void;
  customId: string;
  onChangeCustomId: (value: string) => void;
  baseMode: CoreThemeMode;
  onChangeBaseMode: (mode: CoreThemeMode) => void;
  primary: string;
  onChangePrimary: (value: string) => void;
  bgLayout: string;
  onChangeBgLayout: (value: string) => void;
  bgContainer: string;
  onChangeBgContainer: (value: string) => void;
  bgElevated: string;
  onChangeBgElevated: (value: string) => void;
  borderColor: string;
  onChangeBorderColor: (value: string) => void;
  textPrimary: string;
  onChangeTextPrimary: (value: string) => void;
  textSecondary: string;
  onCopyCode: () => void;
  onLiveApply: () => void;
  onSaveTheme: () => void;
}

export function ThemeStudioLiveBoardTab({
  customLabel,
  onChangeCustomLabel,
  customId,
  onChangeCustomId,
  baseMode,
  onChangeBaseMode,
  primary,
  onChangePrimary,
  bgLayout,
  onChangeBgLayout,
  bgContainer,
  onChangeBgContainer,
  bgElevated,
  onChangeBgElevated,
  borderColor,
  onChangeBorderColor,
  textPrimary,
  onChangeTextPrimary,
  textSecondary,
  onCopyCode,
  onLiveApply,
  onSaveTheme,
}: ThemeStudioLiveBoardTabProps) {
  return (
    <div className="space-y-5 pt-2">
      {/* Meta info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Tên Theme</label>
          <Input
            value={customLabel}
            onChange={(e) => onChangeCustomLabel(e.target.value)}
            placeholder="VD: Màu Ngà Luxury"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Mã Theme ID</label>
          <Input value={customId} onChange={(e) => onChangeCustomId(e.target.value)} placeholder="VD: ivory-spa" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Kiểu Nền Cơ Bản (Base)</label>
          <Radio.Group
            value={baseMode}
            onChange={(e) => onChangeBaseMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            className="w-full flex"
          >
            <Radio.Button value="light" className="flex-1 text-center">
              ☀️ Sáng
            </Radio.Button>
            <Radio.Button value="dark" className="flex-1 text-center">
              🌙 Tối
            </Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {/* Visual Color Pickers */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          6 Mã Màu Cốt Lõi (Sửa trực tiếp bên dưới)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <ColorSlot label="Màu Nhấn (Primary / Gold)" value={primary} onChange={onChangePrimary} />
          <ColorSlot label="Nền Ứng Dụng (App Background)" value={bgLayout} onChange={onChangeBgLayout} />
          <ColorSlot label="Nền Thẻ / Bảng (Card Container)" value={bgContainer} onChange={onChangeBgContainer} />
          <ColorSlot label="Nền Nổi (Elevated / Popover)" value={bgElevated} onChange={onChangeBgElevated} />
          <ColorSlot label="Màu Viền (Border)" value={borderColor} onChange={onChangeBorderColor} />
          <ColorSlot label="Màu Chữ Chính (Text Primary)" value={textPrimary} onChange={onChangeTextPrimary} />
        </div>
      </div>

      {/* Mini Preview Box */}
      <div
        className="p-4 rounded-xl border transition-all duration-200"
        style={{
          backgroundColor: bgLayout,
          borderColor: borderColor,
        }}
      >
        <div className="text-xs font-medium mb-2 opacity-60" style={{ color: textPrimary }}>
          Xem trước thành phần giao diện (Mini Preview)
        </div>
        <div
          className="p-3 rounded-lg border shadow-sm flex items-center justify-between"
          style={{
            backgroundColor: bgContainer,
            borderColor: borderColor,
          }}
        >
          <div>
            <div className="font-semibold text-sm" style={{ color: textPrimary }}>
              Hệ thống Quản lý mOS Lab
            </div>
            <div className="text-xs opacity-75" style={{ color: textSecondary }}>
              Đồng bộ dữ liệu và hiển thị trực quan
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: primary }}
            >
              Nút Chính
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded text-xs font-medium border"
              style={{
                borderColor: borderColor,
                color: textPrimary,
                backgroundColor: bgElevated,
              }}
            >
              Nút Phụ
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
        <Button icon={<Copy className="w-4 h-4" />} onClick={onCopyCode}>
          Sao chép mã TypeScript
        </Button>
        <Space>
          <Button icon={<Eye className="w-4 h-4" />} onClick={onLiveApply}>
            Xem trước toàn màn hình
          </Button>
          <Button type="primary" icon={<Check className="w-4 h-4" />} onClick={onSaveTheme}>
            Lưu & Áp Dụng Theme
          </Button>
        </Space>
      </div>
    </div>
  );
}

export function ColorSlot({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between gap-2 shadow-xs">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</div>
        <div className="text-xs font-mono font-semibold">{value}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
        />
      </div>
    </div>
  );
}

export function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
