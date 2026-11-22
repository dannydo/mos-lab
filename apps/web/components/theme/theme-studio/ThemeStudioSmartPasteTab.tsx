'use client';

import { Button, Input, Radio } from 'antd';
import { Sparkles } from 'lucide-react';
import type { CoreThemeMode } from '@mos-lab/shared';

interface ThemeStudioSmartPasteTabProps {
  pasteText: string;
  onChangePasteText: (value: string) => void;
  baseMode: CoreThemeMode;
  onChangeBaseMode: (mode: CoreThemeMode) => void;
  detectedHexes: string[];
  onAnalyzePaste: () => void;
}

export function ThemeStudioSmartPasteTab({
  pasteText,
  onChangePasteText,
  baseMode,
  onChangeBaseMode,
  detectedHexes,
  onAnalyzePaste,
}: ThemeStudioSmartPasteTabProps) {
  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-slate-500">
        Anh copy bất kỳ đoạn mã màu nào từ trang <b>Coolors.co, Tailwind, Pinterest, ChatGPT</b> hoặc mã CSS rồi dán vào
        ô bên dưới. Hệ thống sẽ tự động quét bóc tách và phân loại vào bảng màu!
      </p>
      <Input.TextArea
        rows={4}
        value={pasteText}
        onChange={(e) => onChangePasteText(e.target.value)}
        placeholder="Dán mã hex hoặc CSS vào đây... Ví dụ: #f5efeb, #fdfbf7, #2d2824, #966820, #e8e1d5"
        className="font-mono text-xs"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Loại nền muốn ưu tiên:</span>
          <Radio.Group size="small" value={baseMode} onChange={(e) => onChangeBaseMode(e.target.value)}>
            <Radio.Button value="light">Nền Sáng</Radio.Button>
            <Radio.Button value="dark">Nền Tối</Radio.Button>
          </Radio.Group>
        </div>
        <Button
          type="primary"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={onAnalyzePaste}
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
  );
}
