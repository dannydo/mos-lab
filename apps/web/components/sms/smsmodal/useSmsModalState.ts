'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { Customer, CustomerSmsHistoryItem, SmsTemplate } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  buildSmsTagValues,
  calculateSmsSegmentMetrics,
  interpolateSmsTemplate,
  readStoredMosUser,
} from './smsModalHelpers';
import { DEFAULT_CUSTOMER_BOOKING_URL, type SmsStoredUser } from './smsModalTypes';

interface UseSmsModalStateParams {
  isModalOpen: boolean;
  customer: Customer | null;
  planId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ApiErrorPayload {
  response?: {
    data?: {
      message?: string;
    };
  };
}

/** Manages SMS templates, customer SMS history, variable interpolation, sending, and saving templates. */
export function useSmsModalState({ isModalOpen, customer, planId, onClose, onSuccess }: UseSmsModalStateParams) {
  const [user, setUser] = useState<SmsStoredUser | null>(null);
  const [history, setHistory] = useState<CustomerSmsHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [customerBookingUrl, setCustomerBookingUrl] = useState<string>(DEFAULT_CUSTOMER_BOOKING_URL);

  const [saveTemplateVisible, setSaveTemplateVisible] = useState<boolean>(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<string>('GENERAL');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  useEffect(() => {
    setUser(readStoredMosUser());
  }, []);

  useEffect(() => {
    if (!isModalOpen || !customer) return;

    let cancelled = false;
    setSelectedPhone(customer.phone || '');
    setMessageBody('');
    setSelectedTemplateId(undefined);
    setCustomerBookingUrl(DEFAULT_CUSTOMER_BOOKING_URL);

    setLoadingTemplates(true);
    apiClient.sms
      .getTemplates()
      .then((tpls) => {
        if (cancelled) return;
        setTemplates(tpls);
        if (tpls.length > 0) {
          setSelectedTemplateId(tpls[0].id);
          setMessageBody(tpls[0].content);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to fetch SMS templates:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });

    setLoadingHistory(true);
    apiClient.sms
      .getHistory(customer.id)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to fetch SMS history:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    apiClient.sms
      .getUserUrl(customer.id)
      .then((res) => {
        if (!cancelled && res?.bookingUrl) {
          setCustomerBookingUrl(res.bookingUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setCustomerBookingUrl(DEFAULT_CUSTOMER_BOOKING_URL);
      });

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, customer]);

  const reloadHistory = useCallback(() => {
    if (!customer) return;
    setLoadingHistory(true);
    apiClient.sms
      .getHistory(customer.id)
      .then((items) => setHistory(items))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [customer]);

  const tagValues = useMemo(
    () => buildSmsTagValues(customer, selectedPhone, customerBookingUrl),
    [customer, selectedPhone, customerBookingUrl]
  );

  const livePreview = useMemo(() => interpolateSmsTemplate(messageBody, tagValues), [messageBody, tagValues]);

  const segmentMetrics = useMemo(() => calculateSmsSegmentMetrics(livePreview), [livePreview]);

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setMessageBody(tpl.content);
      }
    },
    [templates]
  );

  const handleInsertTag = useCallback((tag: string) => {
    setMessageBody((prev) => `${prev} ${tag}`);
  }, []);

  const handleSendSms = useCallback(async () => {
    if (!customer) return;

    if (!selectedPhone) {
      message.error('Vui lòng chọn số điện thoại khách hàng!');
      return;
    }

    if (!messageBody.trim()) {
      message.error('Vui lòng nhập nội dung tin nhắn!');
      return;
    }

    setSending(true);
    try {
      const response = await apiClient.sms.sendSms({
        legacyUserId: customer.id,
        toPhoneNumber: selectedPhone,
        body: livePreview,
        templateId: selectedTemplateId,
        planId,
      });

      if (response.success) {
        message.success('Đã gửi tin nhắn SMS thành công!');
        reloadHistory();
        onSuccess?.();
        onClose();
      } else {
        message.error(response.message || 'Gửi SMS thất bại');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiErrorPayload;
      message.error(apiErr?.response?.data?.message || 'Có lỗi xảy ra khi gửi SMS!');
    } finally {
      setSending(false);
    }
  }, [
    customer,
    selectedPhone,
    messageBody,
    livePreview,
    selectedTemplateId,
    planId,
    reloadHistory,
    onSuccess,
    onClose,
  ]);

  const handleSaveTemplateSubmit = useCallback(async () => {
    if (!newTemplateTitle.trim()) {
      message.error('Vui lòng nhập tên template mẫu!');
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await apiClient.sms.saveTemplate({
        title: newTemplateTitle.trim(),
        content: messageBody,
        category: newTemplateCategory,
      });

      if (res.success) {
        message.success('Đã lưu mẫu tin nhắn SMS mới!');
        setTemplates(res.templates);
        setSelectedTemplateId(res.template.id);
        setSaveTemplateVisible(false);
        setNewTemplateTitle('');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiErrorPayload;
      message.error(apiErr?.response?.data?.message || 'Không thể lưu template mẫu');
    } finally {
      setSavingTemplate(false);
    }
  }, [newTemplateTitle, messageBody, newTemplateCategory]);

  const handleCopyLivePreview = useCallback(() => {
    if (!livePreview || !livePreview.trim()) {
      message.warning('Không có nội dung tin nhắn để sao chép!');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(livePreview);
    }
    message.success('Đã sao chép nội dung tin nhắn thực tế!');
  }, [livePreview]);

  const isAdmin = user?.role === 'admin';

  return {
    isAdmin,
    history,
    loadingHistory,
    templates,
    loadingTemplates,
    selectedTemplateId,
    selectedPhone,
    setSelectedPhone,
    messageBody,
    setMessageBody,
    sending,
    livePreview,
    segmentMetrics,
    saveTemplateVisible,
    setSaveTemplateVisible,
    newTemplateTitle,
    setNewTemplateTitle,
    newTemplateCategory,
    setNewTemplateCategory,
    savingTemplate,
    reloadHistory,
    handleTemplateChange,
    handleInsertTag,
    handleSendSms,
    handleSaveTemplateSubmit,
    handleCopyLivePreview,
  };
}
