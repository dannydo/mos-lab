'use client';

import React from 'react';
import { Button, Form, Input, InputNumber } from 'antd';
import { MinusCircle, Plus } from 'lucide-react';
import { TouchpointIconPicker } from '~/components/campaign/TouchpointIconPicker';
import { GoogleSheetColorPicker } from '~/components/GoogleSheetColorPicker';
import { AppIcon } from '~/components/ui';
import { resolveDefaultTouchpointIcon } from './campaignManagementUtils';

export function CampaignTouchpointsTab() {
  return (
    <div className="pt-2">
      <Form.List name="touchpoints">
        {(fields, { add, remove }) => (
          <div className="overflow-x-auto">
            <div className="min-w-[540px]">
              {fields.length > 0 && (
                <div className="mb-2 flex items-center gap-2 border-b border-slate-200 px-1 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <div className="min-w-[120px] flex-1">Tên điểm chạm</div>
                  <div className="w-[140px] text-center">Biểu tượng (Icon)</div>
                  <div className="w-16 text-center">Từ ngày</div>
                  <div className="w-16 text-center">Đến ngày</div>
                  <div className="w-[95px] text-center">Màu sắc</div>
                  <div className="w-8 text-center">Xóa</div>
                </div>
              )}
              <div className="space-y-2">
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex items-center gap-2 py-0.5">
                    <div className="min-w-[120px] flex-1">
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: 'Nhập tên' }]}
                        className="mb-0"
                      >
                        <Input placeholder="Tên chạm (VD: Chạm D1)" />
                      </Form.Item>
                    </div>
                    <div className="w-[140px]">
                      <Form.Item {...restField} name={[name, 'icon']} className="mb-0">
                        <TouchpointIconPicker size="small" />
                      </Form.Item>
                    </div>
                    <div className="w-16">
                      <Form.Item
                        {...restField}
                        name={[name, 'daysMin']}
                        rules={[{ required: true, message: 'Nhập ngày' }]}
                        className="mb-0"
                      >
                        <InputNumber min={0} placeholder="D+" className="w-full tabular-nums" />
                      </Form.Item>
                    </div>
                    <div className="w-16">
                      <Form.Item {...restField} name={[name, 'daysMax']} className="mb-0">
                        <InputNumber min={0} placeholder="D+" className="w-full tabular-nums" />
                      </Form.Item>
                    </div>
                    <div className="flex w-[95px] justify-center">
                      <Form.Item {...restField} name={[name, 'color']} className="mb-0">
                        <GoogleSheetColorPicker size="small" />
                      </Form.Item>
                    </div>
                    <div className="flex w-8 justify-center">
                      <Button
                        type="text"
                        danger
                        aria-label={`Xóa điểm chạm #${name + 1}`}
                        icon={<AppIcon icon={MinusCircle} size={15} />}
                        onClick={() => remove(name)}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => {
                    const defaultIcon = resolveDefaultTouchpointIcon(fields.length);
                    add({ color: 'blue', daysMin: 1, icon: defaultIcon });
                  }}
                  block
                  icon={<AppIcon icon={Plus} size={15} />}
                  className="mt-2 h-10 rounded-xl border-dashed"
                >
                  Thêm điểm chạm mới
                </Button>
              </div>
            </div>
          </div>
        )}
      </Form.List>
    </div>
  );
}
