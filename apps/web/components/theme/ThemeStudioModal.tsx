'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Input, Button, Radio, Space, Tag, message, Card, Tooltip } from 'antd';
import {
  Palette,
  Sparkles,
  ClipboardPaste,
  Image as ImageIcon,
  Check,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { parseHexCodes, autoMapPalette, type ThemePresetInput, type CoreThemeMode } from '@mos-lab/shared';

interface ThemeStudioModalProps {
  open: boolean;
  onClose: () => void;
}

export function ThemeStudioModal({ open, onClose }: ThemeStudioModalProps) {
  const {
    themeId,
    availableCoreThemes,
    setCoreThemeId,
    saveCustomTheme,
    deleteCustomTheme,
    activeThemeDefinition,
    canManageThemes,
  } = useTheme();

  const [activeTab, setActiveTab] = useState('board');

  // Form State for Live Board
  const [customId, setCustomId] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [baseMode, setBaseMode] = useState<CoreThemeMode>('light');

  const [primary, setPrimary] = useState('#966820');
  const [bgLayout, setBgLayout] = useState('#f5efeb');
  const [bgContainer, setBgContainer] = useState('#fdfbf7');
  const [bgElevated, setBgElevated] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#e8e1d5');
  const [textPrimary, setTextPrimary] = useState('#2d2824');
  const [textSecondary, setTextSecondary] = useState('#6e655f');

  // Smart Paste State
  const [pasteText, setPasteText] = useState('');
  const [detectedHexes, setDetectedHexes] = useState<string[]>([]);

  // Image Extractor State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedHexes, setExtractedHexes] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync with current theme on open
  useEffect(() => {
    if (open && activeThemeDefinition) {
      const mode = activeThemeDefinition.defaultMode;
      const current = activeThemeDefinition.modes[mode].colors;
      setBaseMode(mode);
      setPrimary(current.primary);
      setBgLayout(current.bgLayout);
      setBgContainer(current.bgContainer);
      setBgElevated(current.bgElevated || '#ffffff');
      setBorderColor(current.borderColor);
      setTextPrimary(current.textPrimary);
      setTextSecondary(current.textSecondary);
      setCustomLabel(`${activeThemeDefinition.label} (Bản sao)`);
      setCustomId(`custom-${Date.now().toString(36)}`);
    }
  }, [open, activeThemeDefinition]);

  if (!canManageThemes) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" type="primary" onClick={onClose}>
            Đã hiểu
          </Button>,
        ]}
        title="Giới Hạn Quyền Quản Trị Theme"
      >
        <div className="py-4 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Chỉ Quản trị viên (Admin) mới có quyền tạo mới hoặc chỉnh sửa bảng màu giao diện.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Bạn vẫn có thể lựa chọn các giao diện có sẵn trên thanh tiêu đề.
          </p>
        </div>
      </Modal>
    );
  }

  // Handle Smart Paste Analysis
  const handleAnalyzePaste = () => {
    const found = parseHexCodes(pasteText);
    if (found.length === 0) {
      message.warning('Không tìm thấy mã màu HEX (#xxxxxx) nào trong đoạn văn bản!');
      return;
    }
    setDetectedHexes(found);
    const mapped = autoMapPalette(found, baseMode);
    setPrimary(mapped.primary);
    setBgLayout(mapped.bgLayout);
    setBgContainer(mapped.bgContainer);
    setBgElevated(mapped.bgElevated);
    setBorderColor(mapped.borderColor);
    setTextPrimary(mapped.textPrimary);
    setTextSecondary(mapped.textSecondary);
    setBaseMode(mapped.base);
    message.success(`Đã phát hiện ${found.length} mã màu và tự động xếp vào bảng màu!`);
    setActiveTab('board');
  };

  // Image Color Extraction using HTML Canvas
  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Downsample to 64x64 for fast color sampling
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        const imageData = ctx.getImageData(0, 0, 64, 64).data;

        // Quantize colors into map
        const colorCounts: Record<string, { count: number; r: number; g: number; b: number }> = {};
        for (let i = 0; i < imageData.length; i += 16) {
          const r = Math.round(imageData[i] / 16) * 16;
          const g = Math.round(imageData[i + 1] / 16) * 16;
          const b = Math.round(imageData[i + 2] / 16) * 16;
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          if (!colorCounts[hex]) {
            colorCounts[hex] = { count: 1, r, g, b };
          } else {
            colorCounts[hex].count++;
          }
        }

        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 8)
          .map(([hex]) => hex);

        setExtractedHexes(sorted);
        const mapped = autoMapPalette(sorted, baseMode);
        setPrimary(mapped.primary);
        setBgLayout(mapped.bgLayout);
        setBgContainer(mapped.bgContainer);
        setBgElevated(mapped.bgElevated);
        setBorderColor(mapped.borderColor);
        setTextPrimary(mapped.textPrimary);
        setTextSecondary(mapped.textSecondary);
        setBaseMode(mapped.base);
        message.success(`Đã trích xuất ${sorted.length} màu chủ đạo từ ảnh!`);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImage(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  // Build Theme Preset Input
  const getThemeInput = (): ThemePresetInput => ({
    id: customId.trim() || `theme-${Date.now()}`,
    label: customLabel.trim() || 'Theme Tùy Chỉnh',
    description: customDescription.trim() || 'Theme tạo từ Theme Studio',
    base: baseMode,
    colors: {
      primary,
      bgLayout,
      bgContainer,
      bgElevated,
      borderColor,
      textPrimary,
      textSecondary,
    },
  });

  // Save Custom Theme
  const handleSaveTheme = () => {
    const input = getThemeInput();
    saveCustomTheme(input);
    message.success(`Đã lưu và áp dụng theme "${input.label}" thành công!`);
    onClose();
  };

  // Live Apply / Test
  const handleLiveApply = () => {
    const input = getThemeInput();
    saveCustomTheme(input);
    message.success('Đã kích hoạt chế độ xem trước trực tiếp trên toàn màn hình!');
  };

  // Copy TypeScript code
  const handleCopyCode = () => {
    const input = getThemeInput();
    const code = `// Thêm vào packages/shared/src/theme/tokens.ts
export const ${input.id.replace(/[^a-zA-Z0-9]/g, '_')}Theme = defineTheme({
  id: '${input.id}',
  label: '${input.label}',
  description: '${input.description}',
  base: '${input.base}',
  colors: {
    primary: '${input.colors.primary}',
    bgLayout: '${input.colors.bgLayout}',
    bgContainer: '${input.colors.bgContainer}',
    bgElevated: '${input.colors.bgElevated}',
    borderColor: '${input.colors.borderColor}',
    textPrimary: '${input.colors.textPrimary}',
    textSecondary: '${input.colors.textSecondary}',
  },
});`;

    navigator.clipboard.writeText(code);
    message.success('Đã sao chép mã cấu hình TypeScript vào clipboard!');
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <Palette className="w-5 h-5 text-amber-500" />
          <span>Theme Studio — Tinh Chỉnh & Tạo Theme Siêu Tốc</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={780}
      footer={null}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'board',
            label: (
              <span className="flex items-center gap-1.5">
                <SlidersIcon className="w-4 h-4" /> Bảng Tự Sửa Màu (Live Board)
              </span>
            ),
            children: (
              <div className="space-y-5 pt-2">
                {/* Meta info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Tên Theme</label>
                    <Input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="VD: Màu Ngà Luxury"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Mã Theme ID</label>
                    <Input value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder="VD: ivory-spa" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Kiểu Nền Cơ Bản (Base)</label>
                    <Radio.Group
                      value={baseMode}
                      onChange={(e) => setBaseMode(e.target.value)}
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
                    <ColorSlot label="Màu Nhấn (Primary / Gold)" value={primary} onChange={setPrimary} />
                    <ColorSlot label="Nền Ứng Dụng (App Background)" value={bgLayout} onChange={setBgLayout} />
                    <ColorSlot label="Nền Thẻ / Bảng (Card Container)" value={bgContainer} onChange={setBgContainer} />
                    <ColorSlot label="Nền Nổi (Elevated / Popover)" value={bgElevated} onChange={setBgElevated} />
                    <ColorSlot label="Màu Viền (Border)" value={borderColor} onChange={setBorderColor} />
                    <ColorSlot label="Màu Chữ Chính (Text Primary)" value={textPrimary} onChange={setTextPrimary} />
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
                  <Button icon={<Copy className="w-4 h-4" />} onClick={handleCopyCode}>
                    Sao chép mã TypeScript
                  </Button>
                  <Space>
                    <Button icon={<Eye className="w-4 h-4" />} onClick={handleLiveApply}>
                      Xem trước toàn màn hình
                    </Button>
                    <Button type="primary" icon={<Check className="w-4 h-4" />} onClick={handleSaveTheme}>
                      Lưu & Áp Dụng Theme
                    </Button>
                  </Space>
                </div>
              </div>
            ),
          },
          {
            key: 'paste',
            label: (
              <span className="flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4" /> Dán Mã Từ Mạng (Smart Paste)
              </span>
            ),
            children: (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-slate-500">
                  Anh copy bất kỳ đoạn mã màu nào từ trang <b>Coolors.co, Tailwind, Pinterest, ChatGPT</b> hoặc mã CSS
                  rồi dán vào ô bên dưới. Hệ thống sẽ tự động quét bóc tách và phân loại vào bảng màu!
                </p>
                <Input.TextArea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Dán mã hex hoặc CSS vào đây... Ví dụ: #f5efeb, #fdfbf7, #2d2824, #966820, #e8e1d5"
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Loại nền muốn ưu tiên:</span>
                    <Radio.Group size="small" value={baseMode} onChange={(e) => setBaseMode(e.target.value)}>
                      <Radio.Button value="light">Nền Sáng</Radio.Button>
                      <Radio.Button value="dark">Nền Tối</Radio.Button>
                    </Radio.Group>
                  </div>
                  <Button
                    type="primary"
                    icon={<Sparkles className="w-4 h-4" />}
                    onClick={handleAnalyzePaste}
                    disabled={!pasteText.trim()}
                  >
                    Phân Tích & Nạp Bảng Màu
                  </Button>
                </div>

                {detectedHexes.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-400 mb-2">Các mã màu đã nhận diện:</div>
                    <div className="flex flex-wrap gap-2">
                      {detectedHexes.map((hex) => (
                        <div
                          key={hex}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono"
                          style={{
                            borderColor: '#cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{hex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'image',
            label: (
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" /> Bóc Tách Từ Ảnh (Image Extractor)
              </span>
            ),
            children: (
              <div className="space-y-4 pt-2" onPaste={handlePasteEvent}>
                <p className="text-sm text-slate-500">
                  Chụp màn hình giao diện anh thấy đẹp trên mạng (`Cmd + Shift + 4`), sau đó <b>dán vào đây (Cmd+V)</b>{' '}
                  hoặc chọn file ảnh. Hệ thống sẽ tự quét và bốc tách 5-8 màu chủ đạo!
                </p>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-amber-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processImage(file);
                    }}
                    className="hidden"
                    id="theme-image-upload"
                  />
                  <label htmlFor="theme-image-upload" className="cursor-pointer block">
                    <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <div className="font-medium text-sm text-slate-700 dark:text-slate-300">
                      Bấm vào đây để chọn ảnh chụp màn hình, hoặc bấm{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">Cmd + V</kbd> để dán
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Hỗ trợ PNG, JPG, WebP</div>
                  </label>
                </div>

                {imagePreview && (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-md border border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-500 mb-1.5">Màu sắc trích xuất thành công:</div>
                      <div className="flex flex-wrap gap-2">
                        {extractedHexes.map((hex) => (
                          <div
                            key={hex}
                            className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono bg-white dark:bg-slate-800"
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                              style={{ backgroundColor: hex }}
                            />
                            <span>{hex}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <Button
                          type="primary"
                          size="small"
                          icon={<Sparkles className="w-3.5 h-3.5" />}
                          onClick={() => setActiveTab('board')}
                        >
                          Chuyển qua Bảng Tự Sửa để hoàn thiện
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ),
          },
          {
            key: 'presets',
            label: (
              <span className="flex items-center gap-1.5">
                <Palette className="w-4 h-4" /> Thư Viện Theme Sẵn Có
              </span>
            ),
            children: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {availableCoreThemes.map((themeItem) => {
                  const isActive = themeItem.id === themeId;
                  return (
                    <div
                      key={themeItem.id}
                      onClick={() => {
                        setCoreThemeId(themeItem.id);
                        message.success(`Đã chuyển sang theme "${themeItem.label}"`);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                        isActive
                          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{themeItem.label}</span>
                          {isActive && <Tag color="gold">Đang dùng</Tag>}
                          {themeItem.isCustom && <Tag color="blue">Tùy chỉnh</Tag>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {themeItem.base === 'light' ? 'Nền sáng' : 'Nền tối'} • ID: {themeItem.id}
                        </div>
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: themeItem.colors.primary }}
                            title="Primary Accent"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: themeItem.colors.bgLayout }}
                            title="Layout Background"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: themeItem.colors.bgContainer }}
                            title="Container Surface"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {themeItem.isCustom && (
                          <Tooltip title="Xóa theme này">
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<Trash2 className="w-4 h-4" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCustomTheme(themeItem.id);
                                message.info('Đã xóa theme tùy chỉnh.');
                              }}
                            />
                          </Tooltip>
                        )}
                        {isActive && <Check className="w-5 h-5 text-amber-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}

function ColorSlot({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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

function SlidersIcon({ className }: { className?: string }) {
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
