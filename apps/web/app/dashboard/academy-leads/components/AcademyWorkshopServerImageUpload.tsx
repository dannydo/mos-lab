'use client';

import React from 'react';
import { Button, Upload, message, theme } from 'antd';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon, IconText } from '../../../../components/ui';

type MediaArea = 'hero' | 'menu' | 'equipment';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageDataBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
    reader.onload = () => {
      const encoded = String(reader.result || '');
      const separator = encoded.indexOf(',');
      if (separator < 0) {
        reject(new Error('Dữ liệu ảnh không hợp lệ.'));
        return;
      }
      resolve(encoded.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function AcademyWorkshopServerImageUpload({
  workshopId,
  area,
  value,
  onChange,
  disabled = false,
}: {
  workshopId: number;
  area: MediaArea;
  value?: string | null;
  onChange?: (imageUrl: string) => void;
  disabled?: boolean;
}) {
  const { token } = theme.useToken();
  const [uploading, setUploading] = React.useState(false);

  const upload = React.useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        message.error('Chọn ảnh JPG, PNG hoặc WebP.');
        return;
      }
      if (!file.size || file.size > MAX_IMAGE_BYTES) {
        message.error('Ảnh phải nhỏ hơn hoặc bằng 5 MB.');
        return;
      }

      setUploading(true);
      try {
        const request = {
          fileName: file.name,
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: file.size,
          dataBase64: await imageDataBase64(file),
        };
        const saved =
          area === 'hero'
            ? await apiClient.academySales.workshops.uploadHeroImage(workshopId, request)
            : area === 'menu'
              ? await apiClient.academySales.workshops.uploadMenuImage(workshopId, request)
              : await apiClient.academySales.workshops.uploadEquipmentImage(workshopId, request);
        onChange?.(saved.publicUrl);
        message.success('Đã tải ảnh lên server.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || cause?.message || 'Không thể tải ảnh lên server.');
      } finally {
        setUploading(false);
      }
    },
    [area, onChange, workshopId]
  );

  return (
    <div className="space-y-2">
      {value ? (
        <div
          className="flex items-center gap-3 rounded-xl border p-2.5"
          style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
        >
          <img
            src={value}
            alt="Ảnh đã chọn"
            className={
              area === 'hero'
                ? 'h-20 w-32 shrink-0 rounded-lg object-cover'
                : 'h-14 w-14 shrink-0 rounded-lg object-cover'
            }
            style={{ background: token.colorFillTertiary }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Ảnh đã tải lên</div>
            <p className="mb-0 mt-0.5 text-xs leading-5 opacity-65">Chọn ảnh khác để thay thế.</p>
          </div>
        </div>
      ) : null}
      <Upload
        showUploadList={false}
        accept="image/jpeg,image/png,image/webp"
        beforeUpload={(file) => {
          void upload(file as File);
          return false;
        }}
        disabled={disabled || uploading}
      >
        <Button block type={value ? 'default' : 'dashed'} loading={uploading} disabled={disabled}>
          <IconText
            icon={
              <AppIcon icon={uploading ? LoaderCircle : ImagePlus} className={uploading ? 'animate-spin' : undefined} />
            }
          >
            {value ? 'Thay ảnh từ máy' : 'Tải ảnh lên server'}
          </IconText>
        </Button>
      </Upload>
      <p className="mb-0 text-xs leading-5 opacity-60">JPG, PNG hoặc WebP · tối đa 5 MB</p>
    </div>
  );
}

export default AcademyWorkshopServerImageUpload;
