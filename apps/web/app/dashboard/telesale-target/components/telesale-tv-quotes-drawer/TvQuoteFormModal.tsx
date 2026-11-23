'use client';

import React from 'react';
import { Form, Input, Select, Switch, Tooltip } from 'antd';
import type { FormInstance } from 'antd';
import type { TelesaleTvQuoteItem } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { EVENT_TYPE_SELECT_OPTIONS, PERSONA_OPTIONS, VARIABLE_TAGS } from './tvQuotesConstants';
import type { TvQuoteFormValues } from './tvQuotesTypes';

interface TvQuoteFormModalProps {
  open: boolean;
  saving: boolean;
  isDark: boolean;
  zIndex: number;
  getContainer?: string | HTMLElement | (() => HTMLElement) | false;
  editingQuote: TelesaleTvQuoteItem | null;
  form: FormInstance<TvQuoteFormValues>;
  onCancel: () => void;
  onSave: () => void;
  onInsertVariable: (tag: string) => void;
}

/** Modal form for creating or editing a TV celebration quote template with variable insertion helpers. */
export const TvQuoteFormModal: React.FC<TvQuoteFormModalProps> = ({
  open,
  saving,
  isDark,
  zIndex,
  getContainer,
  editingQuote,
  form,
  onCancel,
  onSave,
  onInsertVariable,
}) => {
  return (
    <AdaptiveModal
      intent="form"
      open={open}
      onCancel={onCancel}
      onOk={onSave}
      confirmLoading={saving}
      zIndex={zIndex + 10}
      getContainer={getContainer}
      title={
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-base">{editingQuote ? '✍️' : '✨'}</span>
          <span className="text-sm font-bold">
            {editingQuote ? 'Chỉnh Sửa Câu Thoại Cổ Vũ' : 'Thêm Câu Thoại Cổ Vũ Mới'}
          </span>
        </div>
      }
      okText="Lưu câu thoại"
      cancelText="Hủy"
      width={580}
      className={isDark ? 'dark-theme' : 'light-theme'}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Form.Item
            name="personaKey"
            label="Hình tượng MC (Persona)"
            rules={[{ required: true, message: 'Vui lòng chọn nhân cách' }]}
          >
            <Select
              options={PERSONA_OPTIONS.map((p) => ({
                label: `${p.icon} ${p.label}`,
                value: p.key,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="eventType"
            label="Loại sự kiện kích hoạt"
            rules={[{ required: true, message: 'Vui lòng chọn loại sự kiện' }]}
          >
            <Select options={EVENT_TYPE_SELECT_OPTIONS} />
          </Form.Item>
        </div>

        <Form.Item
          name="template"
          label="Nội dung câu nói phát thanh"
          rules={[
            { required: true, message: 'Vui lòng nhập nội dung câu nói' },
            { min: 5, message: 'Câu nói cần tối thiểu 5 ký tự' },
          ]}
          extra="Nhập câu thoại hài hước, năng lượng và chèn các biến động bên dưới để hệ thống thay thế lúc phát loa"
        >
          <Input.TextArea
            rows={4}
            placeholder="VD: Vàooo! Không thể tin được, một pha chốt Book xé toang hàng phòng ngự từ [Tên]!"
            className="text-xs"
          />
        </Form.Item>

        {/* Quick Insert Variables Toolbar */}
        <div
          className={`mb-4 p-2.5 rounded-lg border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 flex items-center gap-1">
            <span>Bấm để chèn biến thay thế động:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLE_TAGS.map((v) => (
              <Tooltip key={v.tag} title={v.desc}>
                <button
                  type="button"
                  onClick={() => onInsertVariable(v.tag)}
                  className="text-[11px] px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all font-mono"
                >
                  + {v.tag}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <Form.Item label="Trạng thái kích hoạt">
          <div className="flex items-center gap-2">
            <Form.Item name="isActive" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Sẵn sàng đưa vào vòng quay phát loa khi có sự kiện
            </span>
          </div>
        </Form.Item>
      </Form>
    </AdaptiveModal>
  );
};
