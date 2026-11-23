'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Radio, Space, Switch, message } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '../../../lib/note-draft-storage';
import { AdaptiveModal } from '../../ui';

interface CreateNoteModalProps {
  open: boolean;
  customerId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

interface NoteDraftPayload {
  note?: string;
  noteFieldKey?: 'note' | 'order_note';
  isSticky?: boolean;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ open, customerId, onCancel, onSuccess }) => {
  const { themeMode } = useTheme();
  const [form] = Form.useForm<NoteDraftPayload>();
  const [loading, setLoading] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [hasDraftText, setHasDraftText] = useState(false);

  const draftKey = useMemo(() => (customerId ? `mos_customer_note_draft:${customerId}` : null), [customerId]);

  useEffect(() => {
    if (!open || !draftKey) return;
    const saved = readSessionDraft<NoteDraftPayload>(draftKey);
    if (saved && saved.note && saved.note.trim().length > 0) {
      form.setFieldsValue({
        note: saved.note,
        noteFieldKey: saved.noteFieldKey === 'order_note' ? 'order_note' : 'note',
        isSticky: Boolean(saved.isSticky),
      });
      setHasRestoredDraft(true);
      setHasDraftText(true);
    } else {
      form.setFieldsValue({ note: '', noteFieldKey: 'note', isSticky: false });
      setHasRestoredDraft(false);
      setHasDraftText(false);
    }
  }, [draftKey, form, open]);

  const handleValuesChange = (_changed: Partial<NoteDraftPayload>, allValues: NoteDraftPayload) => {
    const hasNote = Boolean(allValues.note && allValues.note.trim().length > 0);
    setHasDraftText(hasNote);
    if (hasNote) {
      writeSessionDraft<NoteDraftPayload>(draftKey, {
        note: allValues.note || '',
        noteFieldKey: allValues.noteFieldKey === 'order_note' ? 'order_note' : 'note',
        isSticky: Boolean(allValues.isSticky),
      });
    } else {
      clearSessionDraft(draftKey);
      setHasRestoredDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearSessionDraft(draftKey);
    form.resetFields();
    setHasRestoredDraft(false);
    setHasDraftText(false);
  };

  const handleSubmit = async () => {
    if (!customerId) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await apiClient.customers.createNote(customerId, {
        note: values.note || '',
        noteFieldKey: values.noteFieldKey || 'note',
        isSticky: values.isSticky,
      });

      message.success('Thêm ghi chú thành công!');
      clearSessionDraft(draftKey);
      setHasRestoredDraft(false);
      setHasDraftText(false);
      form.resetFields();
      onSuccess();
    } catch (err) {
      console.error('Failed to create customer note:', err);
      message.error((err as SafeAny).response?.data?.message || 'Không thể lưu ghi chú.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    const currentNote = form.getFieldValue('note');
    if (!currentNote || !String(currentNote).trim()) {
      clearSessionDraft(draftKey);
      form.resetFields();
      setHasRestoredDraft(false);
      setHasDraftText(false);
    }
    onCancel();
  };

  return (
    <AdaptiveModal
      intent="form"
      className="customer-create-note-overlay"
      maskClosable={false}
      title={
        <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937', fontWeight: 'bold', fontSize: '16px' }}>
          <FormOutlined style={{ marginRight: '8px', color: '#D4A84B' }} />
          Thêm Ghi Chú Mới
        </span>
      }
      open={open}
      onCancel={handleCancelClick}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Thêm ghi chú"
      cancelText="Đóng"
      styles={{
        body: {
          paddingTop: '16px',
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
        },
        content: {
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          color: themeMode === 'dark' ? '#fff' : '#1f2937',
        },
        header: {
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
          paddingBottom: '8px',
        },
      }}
    >
      {hasRestoredDraft && (
        <Alert
          type="info"
          showIcon
          className="mb-3"
          message="Đã khôi phục ghi chú nháp chưa lưu"
          action={
            <Button size="small" type="link" danger onClick={handleDiscardDraft}>
              Xóa nháp
            </Button>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{ noteFieldKey: 'note', isSticky: false }}
        onValuesChange={handleValuesChange}
        style={{ marginTop: '8px' }}
      >
        <Form.Item
          name="note"
          label={
            <div className="flex w-full items-center justify-between gap-2">
              <span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563', fontWeight: '500' }}>
                Nội dung ghi chú
              </span>
              {hasDraftText && !hasRestoredDraft && (
                <Button size="small" type="link" danger className="h-auto p-0 text-xs" onClick={handleDiscardDraft}>
                  Xóa nháp
                </Button>
              )}
            </div>
          }
          rules={[{ required: true, message: 'Vui lòng nhập nội dung ghi chú' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Nhập nội dung ghi chú ở đây..."
            style={{
              backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
              color: themeMode === 'dark' ? '#fff' : '#1f2937',
              borderColor: themeMode === 'dark' ? '#334155' : '#d9d9d9',
            }}
          />
        </Form.Item>

        <Form.Item
          name="noteFieldKey"
          label={
            <span style={{ color: themeMode === 'dark' ? '#fff' : '#4b5563', fontWeight: '500' }}>
              Phân loại ghi chú
            </span>
          }
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="note" style={{ color: themeMode === 'dark' ? '#e2e8f0' : '#1f2937' }}>
                CSKH / Telesales (Lưu vào tab CS)
              </Radio>
              <Radio value="order_note" style={{ color: themeMode === 'dark' ? '#e2e8f0' : '#1f2937' }}>
                CC / Check-in-out (Lưu vào tab CC)
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Form.Item name="isSticky" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
            <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937', fontWeight: '500' }}>
              Quan trọng và ghim
            </span>
          </div>
        </Form.Item>
      </Form>
    </AdaptiveModal>
  );
};
