'use client';

import React, { useEffect, useRef } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, type FormInstance } from 'antd';
import { MinusCircle, PlusCircle, RotateCcw, Settings } from 'lucide-react';
import { GoogleSheetColorPicker } from '~/components/GoogleSheetColorPicker';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { TAB_KEYS } from '../hooks/useNycData';

export interface NycTouchpointSettingsModalProps {
  open: boolean;
  themeMode: 'light' | 'dark';
  modalWidth: number;
  modalHeight: number;
  selectedConfigTab: string;
  settingsForm: FormInstance;
  resetConfirmOpen: boolean;
  resettingConfig: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  onConfigTabChange: (value: string) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onOpenResetConfirm: () => void;
  onCancelResetConfirm: () => void;
  onConfirmResetDefaults: () => void | Promise<void>;
}

export function NycTouchpointSettingsModal({
  open,
  themeMode,
  modalWidth,
  modalHeight,
  selectedConfigTab,
  settingsForm,
  resetConfirmOpen,
  resettingConfig,
  onCancel,
  onSave,
  onConfigTabChange,
  onResizeMouseDown,
  onOpenResetConfirm,
  onCancelResetConfirm,
  onConfirmResetDefaults,
}: NycTouchpointSettingsModalProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const isDark = themeMode === 'dark';

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.style.height = `${Math.max(150, modalHeight - 200)}px`;
  }, [modalHeight, open]);

  return (
    <>
      <AdaptiveModal
        intent="form"
        title={
          <div className="flex items-center gap-2 text-base font-bold">
            <AppIcon icon={Settings} size={16} className="text-[var(--color-primary)]" />
            <span>Cấu hình quy trình chạm NYC</span>
          </div>
        }
        open={open}
        onCancel={onCancel}
        onOk={onSave}
        okText="Xuất bản Cấu hình"
        cancelText="Hủy"
        width={modalWidth}
        className="max-w-[95vw]"
        modalRender={(modalNode) => {
          if (!React.isValidElement<{ children?: React.ReactNode; className?: string }>(modalNode)) {
            return modalNode;
          }
          return React.cloneElement(modalNode, {
            className: [modalNode.props.className, 'relative pointer-events-auto max-w-[95vw]']
              .filter(Boolean)
              .join(' '),
            children: (
              <div className="relative h-full w-full">
                {modalNode.props.children}
                <div
                  onMouseDown={onResizeMouseDown}
                  title="Kéo góc để thay đổi kích thước Modal (Kích thước được tự động lưu)"
                  className="absolute right-1 bottom-1 z-50 flex h-5 w-5 cursor-nwse-resize items-center justify-center text-[var(--color-primary)] opacity-85 transition-opacity hover:opacity-100"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M11 1v10H1V1h10m1-1H0v12h12V0z M9 9H7v2h2V9z M9 5H7v2h2V5z M5 9H3v2h2V9z" />
                  </svg>
                </div>
              </div>
            ),
          });
        }}
      >
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-5 pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Select
              value={selectedConfigTab}
              onChange={onConfigTabChange}
              className="w-[220px]"
              options={TAB_KEYS.map((k) => ({ value: k.id, label: `${k.name} (${k.rangeText})` }))}
            />
            <Button type="dashed" danger onClick={onOpenResetConfirm} icon={<AppIcon icon={RotateCcw} size={14} />}>
              Khôi phục mặc định
            </Button>
          </div>
          <Form form={settingsForm} name="touchpoints_configs_form" layout="vertical">
            <Form.List name="touchpoints">
              {(fields, { add, remove }) => (
                <div ref={listRef} id="nyc-touchpoints-list" className="space-y-4 overflow-y-auto pr-1.5">
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      title={<span className="text-xs font-bold">Touchpoint #{name + 1}</span>}
                      extra={
                        <Button
                          type="text"
                          danger
                          onClick={() => remove(name)}
                          icon={<AppIcon icon={MinusCircle} size={15} />}
                          aria-label={`Xóa Touchpoint #${name + 1}`}
                        />
                      }
                      className={isDark ? 'bg-zinc-900' : 'bg-slate-50'}
                    >
                      <Row gutter={12}>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'key']}
                            label="Mã định danh (Key)"
                            rules={[{ required: true, message: 'Nhập key' }]}
                          >
                            <Input placeholder="Ví dụ: chạm-7" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'label']}
                            label="Tên hiển thị (Label)"
                            rules={[{ required: true, message: 'Nhập nhãn' }]}
                          >
                            <Input placeholder="Ví dụ: Chạm 7 ngày" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'daysMin']}
                            label="Min (Ngày)"
                            rules={[{ required: true, message: 'Nhập min' }]}
                          >
                            <InputNumber min={0} className="w-full" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'daysMax']}
                            label="Max (Ngày)"
                            rules={[{ required: true, message: 'Nhập max' }]}
                          >
                            <InputNumber min={0} className="w-full" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'color']}
                            label="Màu sắc đại diện"
                            rules={[{ required: true, message: 'Chọn màu' }]}
                          >
                            <GoogleSheetColorPicker size="small" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ key: '', label: '', daysMin: 0, daysMax: 0, color: 'blue' })}
                    block
                    icon={<AppIcon icon={PlusCircle} size={15} />}
                    className="border-[var(--color-primary)] text-[var(--color-primary)]"
                  >
                    Thêm chặng chạm mới
                  </Button>
                </div>
              )}
            </Form.List>
          </Form>
        </div>
      </AdaptiveModal>

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
