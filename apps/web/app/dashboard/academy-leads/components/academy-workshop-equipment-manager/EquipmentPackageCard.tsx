'use client';

import { Button, Popconfirm } from 'antd';
import { PencilLine, Plus, Trash2 } from 'lucide-react';
import type { AcademyWorkshopEquipmentPackage, AcademyWorkshopEquipmentPackageImage } from '@mos-lab/shared';
import { AppIcon, IconButton, IconText, StatusTag } from '~/components/ui';
import { WorkshopImage, WorkshopImageGallery } from '../AcademyWorkshopImageGallery';
import { computePackageSurcharge, formatVnd, sortImages } from './equipment-manager-utils';

export interface EquipmentPackageCardProps {
  item: AcademyWorkshopEquipmentPackage;
  allPackages: AcademyWorkshopEquipmentPackage[];
  canEdit: boolean;
  saving: boolean;
  onSetAsIncluded: (item: AcademyWorkshopEquipmentPackage) => Promise<void> | void;
  onEdit: (item: AcademyWorkshopEquipmentPackage) => void;
  onDelete: (item: AcademyWorkshopEquipmentPackage) => Promise<void> | void;
  onCreateImage: (item: AcademyWorkshopEquipmentPackage) => void;
  onEditImage: (item: AcademyWorkshopEquipmentPackage, image: AcademyWorkshopEquipmentPackageImage) => void;
  onDeleteImage: (
    item: AcademyWorkshopEquipmentPackage,
    image: AcademyWorkshopEquipmentPackageImage
  ) => Promise<void> | void;
}

export function EquipmentPackageCard({
  item,
  allPackages,
  canEdit,
  saving,
  onSetAsIncluded,
  onEdit,
  onDelete,
  onCreateImage,
  onEditImage,
  onDeleteImage,
}: EquipmentPackageCardProps) {
  const { includedPackage, basePrice, surcharge } = computePackageSurcharge(item, allPackages);

  return (
    <article
      className={`rounded-2xl border border-[var(--mos-border-secondary)] p-4 ${
        item.isAvailable ? 'opacity-100' : 'opacity-[0.58]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="m-0 text-base font-extrabold">{item.name}</h3>
            {item.isIncludedInFee ? <StatusTag status="success" label="Tặng kèm trong gói học" /> : null}
            {!item.isAvailable ? <StatusTag status="default" label="Tạm ẩn" /> : null}
          </div>
          {item.description ? <p className="mb-0 mt-1 text-sm leading-6 opacity-70">{item.description}</p> : null}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {!item.isIncludedInFee ? (
              <Button
                size="small"
                type="dashed"
                className="!text-xs !h-7 !px-2"
                disabled={saving}
                onClick={() => void onSetAsIncluded(item)}
              >
                Tặng kèm
              </Button>
            ) : null}
            <IconButton label={`Sửa ${item.name}`} icon={PencilLine} onClick={() => onEdit(item)} />
            <Popconfirm
              title={`Xóa “${item.name}”?`}
              description="Học viên sẽ không thể chọn gói này nữa. Đơn đã đăng ký vẫn giữ nguyên giá đã chốt."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => void onDelete(item)}
            >
              <IconButton tone="danger" label={`Xóa ${item.name}`} icon={Trash2} disabled={saving} />
            </Popconfirm>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[var(--mos-border-secondary)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide opacity-55">Thư viện ảnh</span>
          {canEdit ? (
            <Button type="link" size="small" className="!px-0" onClick={() => onCreateImage(item)}>
              <IconText icon={<AppIcon icon={Plus} size="sm" />}>Thêm ảnh</IconText>
            </Button>
          ) : null}
        </div>
        {item.images.length ? (
          <WorkshopImageGallery>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sortImages(item.images).map((image) => (
                <figure
                  key={image.id}
                  className="group relative m-0 aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
                >
                  <WorkshopImage
                    src={image.imageUrl}
                    alt={image.altText || item.name}
                    className="h-full w-full object-cover"
                    wrapperClassName="!h-full !w-full"
                  />
                  {canEdit ? (
                    <div
                      className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="pointer-events-auto flex items-center gap-1">
                        <IconButton
                          label={`Sửa ảnh ${item.name}`}
                          icon={PencilLine}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditImage(item, image);
                          }}
                        />
                        <Popconfirm
                          title="Xóa ảnh này?"
                          description="Ảnh sẽ không còn hiển thị cho học viên."
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => void onDeleteImage(item, image)}
                        >
                          <IconButton
                            tone="danger"
                            label={`Xóa ảnh ${item.name}`}
                            icon={Trash2}
                            disabled={saving}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  ) : null}
                </figure>
              ))}
            </div>
          </WorkshopImageGallery>
        ) : (
          <p className="mb-0 mt-2 text-sm opacity-55">Chưa có ảnh. Thêm ảnh để học viên xem gallery trước khi chọn.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mos-border-secondary)] pt-3">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wide opacity-55">Phụ thu thực tế</span>
          {item.isIncludedInFee ? (
            <p className="mb-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Đã bao gồm trong học phí (0 đ)
            </p>
          ) : includedPackage ? (
            <p className="mb-0 text-xs font-medium text-slate-500 dark:text-slate-400">
              Chênh lệch từ gói tặng kèm ({formatVnd(basePrice)})
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <span
            className={`tabular-nums text-lg font-extrabold ${
              item.isIncludedInFee ? 'text-[var(--mos-success)]' : 'text-[var(--color-primary)]'
            }`}
          >
            {item.isIncludedInFee ? '0 đ' : `+${formatVnd(surcharge)}`}
          </span>
          <span className="ml-2 block text-xs opacity-50 tabular-nums">Niêm yết: {formatVnd(item.priceVnd)}</span>
        </div>
      </div>

      <ul className="mb-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {item.includedItems.map((includedItem) => (
          <li key={includedItem} className="flex min-w-0 items-start gap-2 text-sm leading-5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
            <span>{includedItem}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
