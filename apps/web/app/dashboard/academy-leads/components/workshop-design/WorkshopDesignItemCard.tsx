'use client';

import { Button, Popconfirm } from 'antd';
import { PencilLine, Plus, Trash2 } from 'lucide-react';
import type { AcademyWorkshopDesignItem, AcademyWorkshopDesignItemImage } from '@mos-lab/shared';
import { AppIcon, IconButton, StatusTag } from '../../../../../components/ui';
import { WorkshopImage, WorkshopImageGallery } from '../AcademyWorkshopImageGallery';
import { difficultyMeta, formatVnd } from './workshop-design-utils';

interface WorkshopDesignItemCardProps {
  design: AcademyWorkshopDesignItem;
  canEdit: boolean;
  onEditDesign: (design: AcademyWorkshopDesignItem) => void;
  onDeleteDesign: (design: AcademyWorkshopDesignItem) => void;
  onCreateImage: (design: AcademyWorkshopDesignItem) => void;
  onEditImage: (design: AcademyWorkshopDesignItem, image: AcademyWorkshopDesignItemImage) => void;
  onDeleteImage: (design: AcademyWorkshopDesignItem, image: AcademyWorkshopDesignItemImage) => void;
}

export function WorkshopDesignItemCard({
  design,
  canEdit,
  onEditDesign,
  onDeleteDesign,
  onCreateImage,
  onEditImage,
  onDeleteImage,
}: WorkshopDesignItemCardProps) {
  const meta = difficultyMeta(design.difficultyLevel);

  return (
    <div className="flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 m-0">{design.name}</h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}
              >
                {'⭐'.repeat(meta.stars)} {meta.label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {design.priceVnd > 0 ? (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Phụ thu: +{formatVnd(design.priceVnd)}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Miễn phí / Đã bao gồm
                </span>
              )}
              <StatusTag
                status={design.isAvailable ? 'success' : 'default'}
                label={design.isAvailable ? 'Khả dụng' : 'Tạm ngưng'}
              />
            </div>
          </div>

          {canEdit ? (
            <div className="flex items-center gap-1 shrink-0">
              <IconButton icon={PencilLine} label="Sửa thông tin" onClick={() => onEditDesign(design)} />
              <Popconfirm
                title="Xóa mẫu thiết kế mi này?"
                description="Lựa chọn của học viên đã chọn mẫu này vẫn được giữ lại để đối soát."
                onConfirm={() => onDeleteDesign(design)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <IconButton icon={Trash2} label="Xóa mẫu" tone="danger" />
              </Popconfirm>
            </div>
          ) : null}
        </div>

        {design.description ? (
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed m-0">{design.description}</p>
        ) : null}

        {/* Image gallery */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Hình ảnh mẫu dáng ({design.images.length})</span>
            {canEdit ? (
              <Button
                type="link"
                size="small"
                className="p-0 h-auto text-xs"
                icon={<AppIcon icon={Plus} className="h-3 w-3" />}
                onClick={() => onCreateImage(design)}
              >
                Thêm ảnh
              </Button>
            ) : null}
          </div>

          {design.images.length > 0 ? (
            <WorkshopImageGallery>
              <div className="flex flex-wrap gap-2">
                {design.images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <WorkshopImage
                      src={img.imageUrl}
                      alt={img.altText || design.name}
                      className="h-full w-full object-cover"
                      wrapperClassName="!h-full !w-full"
                    />
                    {canEdit ? (
                      <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="pointer-events-auto flex items-center gap-1">
                          <IconButton
                            icon={PencilLine}
                            label="Chỉnh sửa ảnh"
                            className="text-white hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditImage(design, img);
                            }}
                          />
                          <Popconfirm
                            title="Xóa ảnh này?"
                            onConfirm={() => onDeleteImage(design, img)}
                            okText="Xóa"
                            cancelText="Hủy"
                          >
                            <IconButton
                              icon={Trash2}
                              label="Xóa ảnh"
                              tone="danger"
                              className="text-red-400"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </WorkshopImageGallery>
          ) : (
            <div className="text-xs italic text-gray-400">Chưa có ảnh minh họa cho mẫu này</div>
          )}
        </div>
      </div>
    </div>
  );
}
