'use client';

import React from 'react';
import { Button, Divider, Form, Input, InputNumber, Tooltip, type FormInstance } from 'antd';
import { MinusCircle, Plus, RotateCcw, Save } from 'lucide-react';
import { GoogleSheetColorPicker } from '~/components/GoogleSheetColorPicker';
import { AdaptiveModal, AppIcon, StatusTag } from '~/components/ui';

export interface LocaWorkflowSettingsTabProps {
  themeMode: 'light' | 'dark';
  settingsForm: FormInstance;
  resetConfirmOpen: boolean;
  resettingConfig: boolean;
  onSaveConfig: () => void | Promise<void>;
  onOpenResetConfirm: () => void;
  onCancelResetConfirm: () => void;
  onConfirmResetDefaults: () => void | Promise<void>;
}

export function LocaWorkflowSettingsTab({
  themeMode,
  settingsForm,
  resetConfirmOpen,
  resettingConfig,
  onSaveConfig,
  onOpenResetConfirm,
  onCancelResetConfirm,
  onConfirmResetDefaults,
}: LocaWorkflowSettingsTabProps) {
  const isDark = themeMode === 'dark';

  return (
    <>
      <div className="space-y-3">
        {/* Header info banner */}
        <div
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            isDark ? 'border-slate-800 bg-slate-900/90 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-500">⚡ Quy trình CSKH</span>
            <span className="hidden text-[11px] opacity-75 sm:inline">(Cấu hình mốc thời gian & màu sắc hiển thị)</span>
          </div>
          <Tooltip title="Khôi phục quy trình mốc chạm mặc định">
            <Button
              type="text"
              danger
              icon={<AppIcon icon={RotateCcw} size={13} />}
              onClick={onOpenResetConfirm}
              size="small"
              className="text-xs hover:bg-rose-500/10"
            >
              Mặc định
            </Button>
          </Tooltip>
        </div>

        {/* Table Header Bar */}
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold tracking-wider uppercase ${
            isDark
              ? 'border border-slate-700/60 bg-slate-800/80 text-amber-400'
              : 'border border-slate-200 bg-slate-100 text-slate-700'
          }`}
        >
          <span className="w-8 text-center">STT</span>
          <span className="w-24">Mã Key</span>
          <span className="flex-1">Tên hiển thị</span>
          <span className="w-32 text-center">Thời gian (Min - Max)</span>
          <span className="w-28 text-center">Màu Badge</span>
          <span className="w-8 text-center">Xóa</span>
        </div>

        <Form form={settingsForm} name="loca_touchpoints_form" layout="vertical">
          <Form.List name="touchpoints">
            {(fields, { add, remove }) => (
              <div id="loca-touchpoints-list" className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 shadow-sm transition-all duration-150 ${
                      isDark
                        ? 'border-slate-800 bg-slate-900/90 hover:border-amber-500/50'
                        : 'border-slate-200 bg-white hover:border-blue-400/50'
                    }`}
                  >
                    <StatusTag
                      status={isDark ? 'gold' : 'processing'}
                      label={`#${name + 1}`}
                      className="min-w-[32px] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
                    />

                    <Tooltip title="Mã định danh Key (ví dụ: now, 17)">
                      <div className="w-24">
                        <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true }]}>
                          <Input
                            placeholder="Key"
                            size="small"
                            className={`text-xs ${isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : ''}`}
                          />
                        </Form.Item>
                      </div>
                    </Tooltip>

                    <Tooltip title="Tên nhãn hiển thị (ví dụ: Chạm 24h)">
                      <div className="min-w-0 flex-1">
                        <Form.Item {...restField} name={[name, 'label']} noStyle rules={[{ required: true }]}>
                          <Input
                            placeholder="Tên hiển thị"
                            size="small"
                            className={`text-xs ${isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : ''}`}
                          />
                        </Form.Item>
                      </div>
                    </Tooltip>

                    <div className="flex w-32 items-center gap-1">
                      <Tooltip title="Số ngày Min">
                        <Form.Item {...restField} name={[name, 'daysMin']} noStyle rules={[{ required: true }]}>
                          <InputNumber
                            min={0}
                            placeholder="Min"
                            size="small"
                            className={`w-full text-xs tabular-nums ${
                              isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : ''
                            }`}
                          />
                        </Form.Item>
                      </Tooltip>
                      <span className="text-xs font-bold text-slate-400">-</span>
                      <Tooltip title="Số ngày Max">
                        <Form.Item {...restField} name={[name, 'daysMax']} noStyle rules={[{ required: true }]}>
                          <InputNumber
                            min={0}
                            placeholder="Max"
                            size="small"
                            className={`w-full text-xs tabular-nums ${
                              isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : ''
                            }`}
                          />
                        </Form.Item>
                      </Tooltip>
                    </div>

                    <Tooltip title="Màu sắc đại diện">
                      <div className="flex w-28 justify-center">
                        <Form.Item {...restField} name={[name, 'color']} noStyle rules={[{ required: true }]}>
                          <GoogleSheetColorPicker size="small" />
                        </Form.Item>
                      </div>
                    </Tooltip>

                    <Tooltip title="Xóa mốc chạm">
                      <div className="flex w-8 justify-center">
                        <Button
                          type="text"
                          danger
                          size="small"
                          aria-label={`Xóa mốc chạm #${name + 1}`}
                          onClick={() => remove(name)}
                          icon={<AppIcon icon={MinusCircle} size={15} />}
                          className="hover:bg-rose-500/10"
                        />
                      </div>
                    </Tooltip>
                  </div>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<AppIcon icon={Plus} size={14} />}
                  size="small"
                  className={`mt-2 py-1.5 font-medium transition-all ${
                    isDark
                      ? 'border-slate-700 text-slate-300 hover:border-amber-400 hover:text-amber-400'
                      : 'border-slate-300 hover:border-blue-500 hover:text-blue-600'
                  }`}
                >
                  Thêm Mốc Chạm Mới
                </Button>
              </div>
            )}
          </Form.List>
        </Form>

        <Divider className="my-3" />

        <Button
          type="primary"
          icon={<AppIcon icon={Save} size={15} />}
          onClick={onSaveConfig}
          block
          size="large"
          className={`font-semibold shadow-md transition-all ${
            isDark
              ? 'border-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500'
              : 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
          }`}
        >
          Xuất bản quy trình LoCa
        </Button>
      </div>

      <AdaptiveModal
        intent="confirm"
        title="Xác nhận khôi phục mặc định"
        open={resetConfirmOpen}
        onCancel={onCancelResetConfirm}
        onOk={onConfirmResetDefaults}
        confirmLoading={resettingConfig}
        okText="Đồng ý"
        cancelText="Hủy"
      >
        <p className="m-0 text-sm text-[var(--mos-text-secondary)]">
          Bạn có chắc chắn muốn xóa tất cả cấu hình hiện tại và quay về cài đặt gốc không?
        </p>
      </AdaptiveModal>
    </>
  );
}
