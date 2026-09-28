'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Switch, Button, Space, message } from 'antd';
import {
  Pin,
  Bookmark,
  Sparkles,
  Heart,
  Rocket,
  Target,
  Globe,
  FileText,
  Clock,
  Layers,
  Zap,
  BarChart2,
  Calendar,
  Compass,
} from 'lucide-react';
import { AppIcon } from '../ui/AppIcon';

interface AddPinnedLinkModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: { title: string; url: string; icon?: string; isExternal?: boolean }) => Promise<void>;
  currentPath?: string;
  themeMode?: string;
}

const AVAILABLE_ICONS = [
  { name: 'Pin', icon: Pin },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: Heart },
  { name: 'Rocket', icon: Rocket },
  { name: 'Target', icon: Target },
  { name: 'Globe', icon: Globe },
  { name: 'BarChart2', icon: BarChart2 },
  { name: 'Calendar', icon: Calendar },
  { name: 'FileText', icon: FileText },
  { name: 'Clock', icon: Clock },
  { name: 'Layers', icon: Layers },
  { name: 'Zap', icon: Zap },
  { name: 'Compass', icon: Compass },
];

export function AddPinnedLinkModal({
  open,
  onClose,
  onAdd,
  currentPath = '',
  themeMode = 'dark',
}: AddPinnedLinkModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('Pin');

  useEffect(() => {
    if (open) {
      // Determine if currentPath is external or internal
      const isExt = currentPath.startsWith('http://') || currentPath.startsWith('https://');
      form.setFieldsValue({
        title:
          typeof document !== 'undefined'
            ? document.title.replace(' - WINGS LASHES', '').replace(' | WINGS LASHES', '').trim()
            : '',
        url: currentPath || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''),
        isExternal: isExt,
      });
      setSelectedIcon('Pin');
    }
  }, [open, currentPath, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onAdd({
        title: values.title.trim(),
        url: values.url.trim(),
        icon: selectedIcon,
        isExternal: Boolean(values.isExternal),
      });
      message.success('Đã ghim liên kết thành công!');
      form.resetFields();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      message.error(err?.message || 'Không thể ghim liên kết');
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = themeMode === 'dark';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Pin} size="md" className="text-pink-500" />
          <span className="font-bold">Ghim Liên Kết Mới Lên Menu</span>
        </div>
      }
      okText="Ghim lên Menu"
      cancelText="Hủy"
      destroyOnClose
      width={460}
      styles={{
        content: {
          backgroundColor: isDark ? '#141414' : '#ffffff',
          borderRadius: '12px',
        },
        header: {
          backgroundColor: isDark ? '#141414' : '#ffffff',
        },
      }}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="Tiêu đề hiển thị"
          name="title"
          rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị cho liên kết' }]}
        >
          <Input placeholder="Ví dụ: Báo cáo doanh thu tháng, Lịch uốn mi..." maxLength={50} showCount />
        </Form.Item>

        <Form.Item
          label="Đường dẫn (URL)"
          name="url"
          rules={[
            { required: true, message: 'Vui lòng nhập đường dẫn URL' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('URL phải bắt đầu bằng / (nội bộ) hoặc https:// (ngoài)'));
              },
            },
          ]}
        >
          <Input placeholder="/dashboard/... hoặc https://..." />
        </Form.Item>

        <Form.Item label="Biểu tượng (Icon)">
          <div className="grid grid-cols-7 gap-2 pt-1">
            {AVAILABLE_ICONS.map((item) => {
              const isSelected = selectedIcon === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedIcon(item.name)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                    isSelected
                      ? 'border-pink-500 bg-pink-500/10 text-pink-500 shadow-sm'
                      : isDark
                        ? 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                  title={item.name}
                >
                  <AppIcon icon={item.icon} size="sm" />
                </button>
              );
            })}
          </div>
        </Form.Item>

        <Form.Item
          label="Mở trong tab mới (Liên kết bên ngoài)"
          name="isExternal"
          valuePropName="checked"
          className="mb-0"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
