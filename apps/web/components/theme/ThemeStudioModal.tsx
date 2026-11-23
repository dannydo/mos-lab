'use client';

import type { ClipboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Tabs, message } from 'antd';
import { ClipboardPaste, Image as ImageIcon, Palette } from 'lucide-react';
import { autoMapPalette, parseHexCodes, type CoreThemeMode, type ThemePresetInput } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { SlidersIcon, ThemeStudioLiveBoardTab } from './theme-studio/ThemeStudioLiveBoardTab';
import { ThemeStudioSmartPasteTab } from './theme-studio/ThemeStudioSmartPasteTab';
import { ThemeStudioImageExtractorTab } from './theme-studio/ThemeStudioImageExtractorTab';
import { ThemeStudioPresetsTab } from './theme-studio/ThemeStudioPresetsTab';
import { buildThemePresetCodeSnippet, extractDominantHexesFromImageData } from './theme-studio/theme-studio-utils';

interface ThemeStudioModalProps {
  open: boolean;
  onClose: () => void;
}

export function ThemeStudioModal({ open, onClose }: ThemeStudioModalProps) {
  const {
    themeId,
    themeMode,
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
  const [customDescription] = useState('');
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

  // Sync with current theme and active screen mode on open
  useEffect(() => {
    if (open && activeThemeDefinition) {
      const mode = themeMode;
      const current = (
        activeThemeDefinition.modes[mode] ?? activeThemeDefinition.modes[activeThemeDefinition.defaultMode]
      ).colors;
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
  }, [open, activeThemeDefinition, themeMode]);

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

  const applyMappedPalette = (hexes: string[]) => {
    const mapped = autoMapPalette(hexes, baseMode);
    setPrimary(mapped.primary);
    setBgLayout(mapped.bgLayout);
    setBgContainer(mapped.bgContainer);
    setBgElevated(mapped.bgElevated);
    setBorderColor(mapped.borderColor);
    setTextPrimary(mapped.textPrimary);
    setTextSecondary(mapped.textSecondary);
    setBaseMode(mapped.base);
  };

  // Handle Smart Paste Analysis
  const handleAnalyzePaste = () => {
    const found = parseHexCodes(pasteText);
    if (found.length === 0) {
      message.warning('Không tìm thấy mã màu HEX (#xxxxxx) nào trong đoạn văn bản!');
      return;
    }
    setDetectedHexes(found);
    applyMappedPalette(found);
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

        const sorted = extractDominantHexesFromImageData(imageData);
        setExtractedHexes(sorted);
        applyMappedPalette(sorted);
        message.success(`Đã trích xuất ${sorted.length} màu chủ đạo từ ảnh!`);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handlePasteEvent = (e: ClipboardEvent) => {
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
    const code = buildThemePresetCodeSnippet(getThemeInput());
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
              <ThemeStudioLiveBoardTab
                customLabel={customLabel}
                onChangeCustomLabel={setCustomLabel}
                customId={customId}
                onChangeCustomId={setCustomId}
                baseMode={baseMode}
                onChangeBaseMode={setBaseMode}
                primary={primary}
                onChangePrimary={setPrimary}
                bgLayout={bgLayout}
                onChangeBgLayout={setBgLayout}
                bgContainer={bgContainer}
                onChangeBgContainer={setBgContainer}
                bgElevated={bgElevated}
                onChangeBgElevated={setBgElevated}
                borderColor={borderColor}
                onChangeBorderColor={setBorderColor}
                textPrimary={textPrimary}
                onChangeTextPrimary={setTextPrimary}
                textSecondary={textSecondary}
                onCopyCode={handleCopyCode}
                onLiveApply={handleLiveApply}
                onSaveTheme={handleSaveTheme}
              />
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
              <ThemeStudioSmartPasteTab
                pasteText={pasteText}
                onChangePasteText={setPasteText}
                baseMode={baseMode}
                onChangeBaseMode={setBaseMode}
                detectedHexes={detectedHexes}
                onAnalyzePaste={handleAnalyzePaste}
              />
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
              <ThemeStudioImageExtractorTab
                canvasRef={canvasRef}
                imagePreview={imagePreview}
                extractedHexes={extractedHexes}
                onPaste={handlePasteEvent}
                onFileSelect={processImage}
                onGoToBoard={() => setActiveTab('board')}
              />
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
              <ThemeStudioPresetsTab
                availableCoreThemes={availableCoreThemes}
                activeThemeId={themeId}
                onSelectTheme={(id, label) => {
                  setCoreThemeId(id);
                  message.success(`Đã chuyển sang theme "${label}"`);
                }}
                onDeleteCustomTheme={(id) => {
                  deleteCustomTheme(id);
                  message.info('Đã xóa theme tùy chỉnh.');
                }}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}
