'use client';

import { Button, Form, InputNumber, Select, type FormInstance } from 'antd';
import { Package, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { PilotMaterial, PilotSession } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { formatPilotVND } from './pilot-session-utils';

interface PilotSessionConsumablesSectionProps {
  form: FormInstance;
  quickForm: FormInstance;
  session?: PilotSession | null;
  materialsCatalog: PilotMaterial[];
  catalogMap: Map<number, PilotMaterial>;
  formMaterials: Array<{ materialId?: number; usageAmount?: number }>;
  liveConsumablesCost: number;
  deducting: boolean;
  onDeductStock: () => void;
  onOpenQuickAdd: () => void;
}

export function PilotSessionConsumablesSection({
  form,
  quickForm,
  session,
  materialsCatalog,
  catalogMap,
  formMaterials,
  liveConsumablesCost,
  deducting,
  onDeductStock,
  onOpenQuickAdd,
}: PilotSessionConsumablesSectionProps) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AppIcon icon={Package} size="sm" className="text-emerald-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            2. Theo dõi Vật tư Tiêu hao (Consumables)
          </span>
          {session?.isStockDeducted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <AppIcon icon={Sparkles} size="sm" /> Đã trừ kho tồn
            </span>
          ) : session?.id ? (
            <Button
              size="small"
              loading={deducting}
              onClick={onDeductStock}
              className="text-[11px] h-6 px-2 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              Trừ kho BOM
            </Button>
          ) : null}
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Tổng Consumables Cost / Done: </span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatPilotVND(liveConsumablesCost)}
          </span>
        </div>
      </div>

      <Form.List name="materials">
        {(fields, { add, remove }) => (
          <div className="space-y-2">
            {fields.map(({ key, name, ...restField }) => {
              const currentItem = formMaterials[name];
              const selectedMat = currentItem?.materialId ? catalogMap.get(currentItem.materialId) : null;
              const usage = currentItem?.usageAmount || 0;
              const rowCost = selectedMat ? Math.round(selectedMat.costPerUnit * usage) : 0;

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  {selectedMat?.imageUrl && (
                    <div className="w-8 h-8 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                      <img src={selectedMat.imageUrl} alt={selectedMat.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1">
                    <Form.Item
                      {...restField}
                      name={[name, 'materialId']}
                      rules={[{ required: true, message: 'Chọn vật tư' }]}
                      className="!mb-0"
                    >
                      <Select
                        placeholder="Chọn vật tư sử dụng"
                        className="w-full"
                        options={materialsCatalog
                          .filter((m) => m.isActive || m.id === currentItem?.materialId)
                          .map((m) => ({
                            value: m.id,
                            label: `[${m.itemType === 'TOOL' ? 'Dụng cụ' : 'Tiêu hao'}] ${m.name} (${formatPilotVND(m.costPerUnit)}/${m.unit})`,
                          }))}
                      />
                    </Form.Item>
                  </div>

                  {selectedMat && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                        selectedMat.itemType === 'TOOL'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {selectedMat.itemType === 'TOOL' ? 'Dụng cụ' : 'Tiêu hao'}
                    </span>
                  )}

                  <div className="w-32">
                    <Form.Item
                      {...restField}
                      name={[name, 'usageAmount']}
                      rules={[{ required: true, message: 'Lượng dùng' }]}
                      className="!mb-0"
                    >
                      <InputNumber
                        min={0.1}
                        step={selectedMat?.unit === 'cặp' || selectedMat?.unit === 'miếng' ? 1 : 0.5}
                        placeholder="Lượng"
                        addonAfter={selectedMat?.unit || 'đv'}
                        className="w-full tabular-nums"
                      />
                    </Form.Item>
                  </div>

                  <div className="w-32 text-right">
                    <span className="text-[10px] text-slate-400 block leading-tight">Cost tạm tính</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {formatPilotVND(rowCost)}
                    </span>
                  </div>

                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<AppIcon icon={Trash2} size="sm" />}
                    onClick={() => remove(name)}
                  />
                </div>
              );
            })}

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                type="dashed"
                onClick={() => add({ materialId: undefined, usageAmount: 1 })}
                icon={<AppIcon icon={Plus} size="sm" />}
                className="rounded-lg text-xs"
              >
                Thêm vật tư đã dùng
              </Button>
              <Button
                type="dashed"
                onClick={() => {
                  quickForm.resetFields();
                  quickForm.setFieldsValue({
                    unit: 'ml',
                    volume: 1,
                    purchasePrice: 0,
                    itemType: 'CONSUMABLE',
                    imageUrl: '',
                  });
                  onOpenQuickAdd();
                }}
                icon={<AppIcon icon={Package} size="sm" />}
                className="rounded-lg text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              >
                + Tạo vật tư mới vào danh mục
              </Button>
              {materialsCatalog.length > 0 && fields.length === 0 && (
                <Button
                  type="default"
                  onClick={() => {
                    const standardPreset = materialsCatalog
                      .filter((m) => m.isActive)
                      .map((m) => ({
                        materialId: m.id,
                        usageAmount: 1,
                      }));
                    form.setFieldValue('materials', standardPreset);
                  }}
                  className="text-xs rounded-lg text-emerald-600 border-emerald-500/30"
                >
                  Áp dụng định lượng chuẩn (1 ca)
                </Button>
              )}
            </div>
          </div>
        )}
      </Form.List>
    </div>
  );
}
