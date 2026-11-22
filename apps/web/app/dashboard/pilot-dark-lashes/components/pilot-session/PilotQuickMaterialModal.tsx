'use client';

import { Form, Input, InputNumber, Select, type FormInstance } from 'antd';
import { AdaptiveModal } from '~/components/ui/AdaptiveOverlay';
import { QUICK_LASH_PRESETS, formatPilotVND } from './pilot-session-utils';

interface PilotQuickMaterialModalProps {
  open: boolean;
  quickForm: FormInstance;
  quickSubmitting: boolean;
  quickCostPerUnit: number;
  onCancel: () => void;
  onOk: () => void;
}

export function PilotQuickMaterialModal({
  open,
  quickForm,
  quickSubmitting,
  quickCostPerUnit,
  onCancel,
  onOk,
}: PilotQuickMaterialModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      title="Thêm nhanh Vật tư Tiêu hao"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={quickSubmitting}
      okText="Tạo & chọn dùng ngay"
      cancelText="Hủy"
      okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 text-white' }}
      width={480}
    >
      <Form form={quickForm} layout="vertical" className="mt-2">
        <div className="mb-3">
          <span className="text-xs font-medium text-slate-500 block mb-1.5">Gợi ý nhanh vật tư uốn mi:</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-lg">
            {QUICK_LASH_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  quickForm.setFieldsValue({
                    name: preset.name,
                    unit: preset.unit,
                    volume: preset.volume,
                    purchasePrice: preset.purchasePrice,
                  });
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>

        <Form.Item name="name" label="Tên vật tư" rules={[{ required: true, message: 'Vui lòng nhập tên vật tư' }]}>
          <Input placeholder="VD: Cây chải mi kim loại, Keratin..." className="rounded-lg" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="itemType"
            label="Phân loại"
            initialValue="CONSUMABLE"
            rules={[{ required: true, message: 'Chọn phân loại' }]}
          >
            <Select
              className="w-full rounded-lg"
              options={[
                { value: 'CONSUMABLE', label: 'Tiêu hao' },
                { value: 'TOOL', label: 'Dụng cụ' },
              ]}
            />
          </Form.Item>

          <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Nhập đơn vị tính' }]}>
            <Input placeholder="VD: ml, cây, cặp, miếng, bộ, g..." className="rounded-lg" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="purchasePrice"
            label="Giá mua trọn gói (đ)"
            rules={[{ required: true, message: 'Nhập giá mua' }]}
          >
            <InputNumber<number>
              className="w-full rounded-lg tabular-nums"
              min={0}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
            />
          </Form.Item>

          <Form.Item name="volume" label="Quy cách / Dung tích" rules={[{ required: true, message: 'Nhập dung tích' }]}>
            <InputNumber<number> className="w-full rounded-lg tabular-nums" min={0.01} step={1} />
          </Form.Item>
        </div>

        <Form.Item name="imageUrl" label="URL Hình ảnh (Tùy chọn)">
          <Input placeholder="https://example.com/item.png" className="rounded-lg" />
        </Form.Item>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">Cost tự động trên 1 đơn vị:</span>
          <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatPilotVND(quickCostPerUnit)} / đơn vị
          </span>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
