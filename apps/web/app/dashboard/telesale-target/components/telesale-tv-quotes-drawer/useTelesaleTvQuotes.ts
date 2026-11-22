'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { TelesaleTvPersonaKey, TelesaleTvQuoteEventType, TelesaleTvQuoteItem } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { filterTvQuotes } from './tvQuotesConstants';
import type { TvQuoteFormValues } from './tvQuotesTypes';

interface UseTelesaleTvQuotesOptions {
  open: boolean;
  stopAudio: () => void;
}

/** Manages quote library hydration, filtering, CRUD mutations, and the edit/create form modal. */
export function useTelesaleTvQuotes({ open, stopAudio }: UseTelesaleTvQuotesOptions) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState<TelesaleTvQuoteItem[]>([]);

  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<TelesaleTvQuoteItem | null>(null);
  const [form] = Form.useForm<TvQuoteFormValues>();

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.telesaleTarget.getCelebrationQuotes();
      setQuotes(data.quotes || []);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : undefined;
      message.error(errMessage || 'Không thể tải kho câu thoại cổ vũ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadQuotes();
    } else {
      stopAudio();
    }
  }, [open, loadQuotes, stopAudio]);

  const handleToggleActive = useCallback(
    async (id: string, nextActive: boolean) => {
      const updated = quotes.map((q) =>
        q.id === id ? { ...q, isActive: nextActive, updatedAt: new Date().toISOString() } : q
      );
      setQuotes(updated);

      try {
        await apiClient.telesaleTarget.saveCelebrationQuotes(updated);
        message.success(nextActive ? 'Đã bật câu thoại' : 'Đã tắt câu thoại');
      } catch {
        message.error('Không thể lưu trạng thái câu thoại');
        loadQuotes();
      }
    },
    [quotes, loadQuotes]
  );

  const handleDeleteQuote = useCallback(
    async (id: string) => {
      const updated = quotes.filter((q) => q.id !== id);
      setQuotes(updated);

      try {
        await apiClient.telesaleTarget.saveCelebrationQuotes(updated);
        message.success('Đã xóa câu thoại');
      } catch {
        message.error('Không thể xóa câu thoại');
        loadQuotes();
      }
    },
    [quotes, loadQuotes]
  );

  const handleResetToDefaults = useCallback(async () => {
    setSaving(true);
    try {
      const resetConfig = await apiClient.telesaleTarget.resetCelebrationQuotes(
        selectedPersona !== 'ALL' ? selectedPersona : undefined
      );
      setQuotes(resetConfig.quotes || []);
      message.success(
        selectedPersona !== 'ALL'
          ? `Đã khôi phục câu mẫu gốc cho nhân cách ${selectedPersona}`
          : 'Đã khôi phục toàn bộ kho câu thoại mẫu gốc'
      );
    } catch {
      message.error('Không thể khôi phục câu thoại mặc định');
    } finally {
      setSaving(false);
    }
  }, [selectedPersona]);

  const handleOpenForm = useCallback(
    (quote?: TelesaleTvQuoteItem) => {
      if (quote) {
        setEditingQuote(quote);
        form.setFieldsValue({
          personaKey: quote.personaKey,
          eventType: quote.eventType,
          template: quote.template,
          isActive: quote.isActive,
        });
      } else {
        setEditingQuote(null);
        form.setFieldsValue({
          personaKey: (selectedPersona !== 'ALL' ? selectedPersona : 'MC_HOI_CHO') as TelesaleTvPersonaKey,
          eventType: (selectedEventType !== 'ALL' ? selectedEventType : 'BOOK') as TelesaleTvQuoteEventType,
          template: '',
          isActive: true,
        });
      }
      setFormModalOpen(true);
    },
    [form, selectedPersona, selectedEventType]
  );

  const handleInsertVariable = useCallback(
    (tag: string) => {
      const currentVal = form.getFieldValue('template') || '';
      form.setFieldsValue({
        template: currentVal ? `${currentVal} ${tag}` : tag,
      });
    },
    [form]
  );

  const handleSaveForm = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const now = new Date().toISOString();
      let updated: TelesaleTvQuoteItem[];

      if (editingQuote) {
        updated = quotes.map((q) =>
          q.id === editingQuote.id
            ? {
                ...q,
                personaKey: values.personaKey,
                eventType: values.eventType,
                template: values.template.trim(),
                isActive: values.isActive,
                isCustom: true,
                updatedAt: now,
              }
            : q
        );
      } else {
        const newQuote: TelesaleTvQuoteItem = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          personaKey: values.personaKey,
          eventType: values.eventType,
          template: values.template.trim(),
          isActive: values.isActive,
          isCustom: true,
          createdAt: now,
          updatedAt: now,
        };
        updated = [newQuote, ...quotes];
      }

      await apiClient.telesaleTarget.saveCelebrationQuotes(updated);
      setQuotes(updated);
      message.success(editingQuote ? 'Đã cập nhật câu thoại' : 'Đã thêm câu thoại mới thành công');
      setFormModalOpen(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      const errMessage = err instanceof Error ? err.message : undefined;
      message.error(errMessage || 'Không thể lưu câu thoại');
    } finally {
      setSaving(false);
    }
  }, [editingQuote, form, quotes]);

  const filteredQuotes = useMemo(
    () => filterTvQuotes(quotes, selectedPersona, selectedEventType, searchQuery),
    [quotes, selectedPersona, selectedEventType, searchQuery]
  );

  const activeCount = useMemo(() => quotes.filter((q) => q.isActive).length, [quotes]);
  const customCount = useMemo(() => quotes.filter((q) => q.isCustom).length, [quotes]);

  return {
    loading,
    saving,
    quotes,
    selectedPersona,
    setSelectedPersona,
    selectedEventType,
    setSelectedEventType,
    searchQuery,
    setSearchQuery,
    formModalOpen,
    setFormModalOpen,
    editingQuote,
    form,
    filteredQuotes,
    activeCount,
    customCount,
    handleToggleActive,
    handleDeleteQuote,
    handleResetToDefaults,
    handleOpenForm,
    handleInsertVariable,
    handleSaveForm,
  };
}
