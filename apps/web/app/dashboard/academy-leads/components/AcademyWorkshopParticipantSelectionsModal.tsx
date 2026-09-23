'use client';

import React from 'react';
import { Button, Form, Select } from 'antd';
import { UtensilsCrossed, Wrench, CheckCircle2, Sparkles } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS,
  type AcademyWorkshopDetail,
  type AcademyWorkshopMenuCategory,
  type AcademyWorkshopMenuItem,
  type AcademyWorkshopParticipant,
} from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '../../../../components/ui';
import { WorkshopImage, WorkshopImageGallery } from './AcademyWorkshopImageGallery';

export interface AcademyWorkshopParticipantSelectionsModalProps {
  open: boolean;
  participant: AcademyWorkshopParticipant | null;
  workshop: AcademyWorkshopDetail | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (menuItemIds: number[], equipmentPackageId: number | null, designItemId?: number | null) => Promise<void>;
}

export default function AcademyWorkshopParticipantSelectionsModal({
  open,
  participant,
  workshop,
  busy = false,
  onClose,
  onSave,
}: AcademyWorkshopParticipantSelectionsModalProps) {
  const [form] = Form.useForm();
  const [selectedPkgId, setSelectedPkgId] = React.useState<number | null>(null);
  const [selectedDesignId, setSelectedDesignId] = React.useState<number | null>(null);

  // Group available menu items by category
  const categorizedMenuItems = React.useMemo(() => {
    if (!workshop?.menuItems) return new Map<AcademyWorkshopMenuCategory, AcademyWorkshopMenuItem[]>();
    const map = new Map<AcademyWorkshopMenuCategory, AcademyWorkshopMenuItem[]>();
    for (const cat of ACADEMY_WORKSHOP_MENU_CATEGORIES) {
      const items = workshop.menuItems.filter((i) => i.category === cat && i.isAvailable);
      if (items.length > 0) {
        map.set(cat, items);
      }
    }
    return map;
  }, [workshop]);

  const selectedPkg = React.useMemo(() => {
    if (!selectedPkgId || !workshop?.equipmentPackages) return null;
    return workshop.equipmentPackages.find((p) => p.id === selectedPkgId) || null;
  }, [selectedPkgId, workshop]);

  const selectedDesign = React.useMemo(() => {
    if (!selectedDesignId || !workshop?.designs) return null;
    return workshop.designs.find((d) => d.id === selectedDesignId) || null;
  }, [selectedDesignId, workshop]);

  // Sync form when modal opens or participant changes
  React.useEffect(() => {
    if (!open || !participant) return;

    const initialValues: Record<string, any> = {};
    for (const cat of ACADEMY_WORKSHOP_MENU_CATEGORIES) {
      const match = participant.menuSelections.find((s) => s.category === cat);
      initialValues[`menu_${cat}`] = match?.menuItemId || 0;
    }

    const pkgId = participant.equipmentSelection?.equipmentPackageId || 0;
    initialValues.equipmentPackageId = pkgId;
    setSelectedPkgId(pkgId > 0 ? pkgId : null);

    const desId = participant.designSelection?.designItemId || 0;
    initialValues.designItemId = desId;
    setSelectedDesignId(desId > 0 ? desId : null);

    form.setFieldsValue(initialValues);
  }, [open, participant, form]);

  const handleSubmit = async (values: Record<string, any>) => {
    const menuItemIds: number[] = [];
    for (const cat of ACADEMY_WORKSHOP_MENU_CATEGORIES) {
      const val = Number(values[`menu_${cat}`]);
      if (val && val > 0) {
        menuItemIds.push(val);
      }
    }

    const rawPkgId = Number(values.equipmentPackageId);
    const equipmentPackageId = rawPkgId && rawPkgId > 0 ? rawPkgId : null;

    const rawDesignId = Number(values.designItemId);
    const designItemId = rawDesignId && rawDesignId > 0 ? rawDesignId : null;

    await onSave(menuItemIds, equipmentPackageId, designItemId);
  };

  if (!participant || !workshop) return null;

  return (
    <AdaptiveModal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <AppIcon icon={UtensilsCrossed} className="h-4 w-4" />
          </div>
          <div>
            <div className="text-base font-semibold leading-tight">
              Chọn Thực đơn, Dụng cụ & Mẫu mi · {participant.lead.name}
            </div>
            <div className="text-xs font-normal opacity-65">
              {participant.lead.phone || participant.lead.email || 'Học viên'}
            </div>
          </div>
        </div>
      }
      onCancel={onClose}
      destroyOnHidden
      width={560}
      footer={
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="primary" icon={<AppIcon icon={CheckCircle2} />} loading={busy} onClick={() => form.submit()}>
            Lưu lựa chọn
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-6 pt-1">
        {/* SECTION 1: CATERING MENU */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mb-3 flex items-center gap-2">
            <AppIcon icon={UtensilsCrossed} className="h-4 w-4 text-emerald-500" />
            <span className="font-semibold">1. Thực đơn ăn trưa (Catering)</span>
          </div>

          {categorizedMenuItems.size === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs opacity-60 dark:border-slate-700">
              Workshop chưa thiết lập danh sách món ăn trong thực đơn.
            </div>
          ) : (
            <div className="space-y-3">
              {ACADEMY_WORKSHOP_MENU_CATEGORIES.map((cat) => {
                const items = categorizedMenuItems.get(cat);
                if (!items || items.length === 0) return null;

                const options = [
                  { value: 0, label: '— Không dùng / Bỏ chọn món này —' },
                  ...items.map((item) => ({
                    value: item.id,
                    label: item.name + (item.description ? ` (${item.description})` : ''),
                  })),
                ];

                return (
                  <Form.Item
                    key={cat}
                    name={`menu_${cat}`}
                    label={<span className="text-xs font-medium">{ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[cat]}</span>}
                    className="!mb-2"
                  >
                    <Select
                      options={options}
                      placeholder={`Chọn món ${ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[cat]}`}
                      className="w-full"
                    />
                  </Form.Item>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: EQUIPMENT PACKAGE */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mb-3 flex items-center gap-2">
            <AppIcon icon={Wrench} className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold">2. Cốp dụng cụ thực hành</span>
          </div>

          {!workshop.equipmentPackages || workshop.equipmentPackages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs opacity-60 dark:border-slate-700">
              Workshop chưa cấu hình gói dụng cụ thực hành.
            </div>
          ) : (
            <div>
              <Form.Item
                name="equipmentPackageId"
                label={<span className="text-xs font-medium">Gói dụng cụ</span>}
                className="!mb-3"
              >
                <Select
                  onChange={(val) => setSelectedPkgId(val && Number(val) > 0 ? Number(val) : null)}
                  options={[
                    { value: 0, label: '— Không chọn (Học viên tự túc mang đồ nghề) —' },
                    ...workshop.equipmentPackages.map((pkg) => ({
                      value: pkg.id,
                      label: `${pkg.name} · Phụ thu ${pkg.priceVnd.toLocaleString('vi-VN')} đ`,
                    })),
                  ]}
                  className="w-full"
                />
              </Form.Item>

              {selectedPkg && (
                <div className="mt-2 rounded-lg border border-indigo-200/80 bg-indigo-50/60 p-3 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
                  <div className="flex items-center justify-between font-semibold text-indigo-950 dark:text-indigo-200">
                    <span>{selectedPkg.name}</span>
                    <span className="tabular-nums">
                      {selectedPkg.priceVnd > 0
                        ? `+${selectedPkg.priceVnd.toLocaleString('vi-VN')} đ`
                        : 'Miễn phí kèm vé'}
                    </span>
                  </div>
                  {selectedPkg.description && <div className="mt-1 opacity-70">{selectedPkg.description}</div>}
                  {selectedPkg.includedItems && selectedPkg.includedItems.length > 0 && (
                    <div className="mt-2.5">
                      <div className="mb-1 text-[11px] font-medium opacity-65">
                        Bao gồm {selectedPkg.includedItems.length} món đồ nghề trong cốp:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedPkg.includedItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedPkg.images && selectedPkg.images.length > 0 && (
                    <WorkshopImageGallery>
                      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
                        {selectedPkg.images.map((img) => (
                          <div key={img.id} className="h-12 w-12 shrink-0 rounded overflow-hidden">
                            <WorkshopImage
                              src={img.imageUrl}
                              alt={img.altText || selectedPkg.name}
                              className="h-full w-full rounded object-cover"
                              wrapperClassName="!h-full !w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </WorkshopImageGallery>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: LASH DESIGN */}
          {workshop.designs && workshop.designs.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AppIcon icon={Sparkles} className="h-4 w-4 text-purple-500" />
                  <span className="font-semibold">3. Mẫu thiết kế mi thực hành</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Chọn 1 mẫu học viên muốn thực hành</span>
              </div>

              <Form.Item name="designItemId" className="mb-0">
                <Select
                  placeholder="Chọn mẫu thiết kế mi"
                  onChange={(val) => setSelectedDesignId(val ? Number(val) : null)}
                  options={[
                    { value: 0, label: '-- Chưa chọn / Mặc định theo lớp --' },
                    ...workshop.designs.map((des) => ({
                      value: des.id,
                      label: `${des.name} · [${ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[des.difficultyLevel] || des.difficultyLevel}]${des.priceVnd > 0 ? ` · Phụ thu ${des.priceVnd.toLocaleString('vi-VN')} đ` : ''}`,
                    })),
                  ]}
                  className="w-full"
                />
              </Form.Item>

              {selectedDesign && (
                <div className="mt-2 rounded-lg border border-purple-200/80 bg-purple-50/60 p-3 text-xs dark:border-purple-900/60 dark:bg-purple-950/30">
                  <div className="flex items-center justify-between font-semibold text-purple-950 dark:text-purple-200">
                    <div className="flex items-center gap-2">
                      <span>{selectedDesign.name}</span>
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                        {ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[selectedDesign.difficultyLevel] ||
                          selectedDesign.difficultyLevel}
                      </span>
                    </div>
                    <span className="tabular-nums">
                      {selectedDesign.priceVnd > 0
                        ? `+${selectedDesign.priceVnd.toLocaleString('vi-VN')} đ`
                        : 'Không phụ thu'}
                    </span>
                  </div>
                  {selectedDesign.description && <div className="mt-1 opacity-70">{selectedDesign.description}</div>}
                  {selectedDesign.images && selectedDesign.images.length > 0 && (
                    <WorkshopImageGallery>
                      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
                        {selectedDesign.images.map((img) => (
                          <div key={img.id} className="h-12 w-12 shrink-0 rounded overflow-hidden">
                            <WorkshopImage
                              src={img.imageUrl}
                              alt={img.altText || selectedDesign.name}
                              className="h-full w-full rounded object-cover"
                              wrapperClassName="!h-full !w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </WorkshopImageGallery>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Form>
    </AdaptiveModal>
  );
}
