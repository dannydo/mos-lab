import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { BookingConfirmationTemplate, DEFAULT_BOOKING_TEMPLATES, SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { OffDayStaffInfo, evaluateBookingTemplateText, pickAutoBookingTemplate } from './rescheduleUtils';

interface UseRescheduleTemplatesParams {
  open: boolean;
  booking: SafeAny;
  selectedCN: SafeAny;
  selectedSlot: string | null;
  bookingDate: dayjs.Dayjs;
  selectedCV: SafeAny;
  selectedCustomer: { id: SafeAny } | null;
  customerLastVisit?: string | null;
  offDayStaffInfo: OffDayStaffInfo | null;
}

export function useRescheduleTemplates({
  open,
  booking,
  selectedCN,
  selectedSlot,
  bookingDate,
  selectedCV,
  selectedCustomer,
  customerLastVisit,
  offDayStaffInfo,
}: UseRescheduleTemplatesParams) {
  const [showTemplateSection, setShowTemplateSection] = useState<boolean>(false);
  const [bookingTemplates, setBookingTemplates] = useState<BookingConfirmationTemplate[]>(DEFAULT_BOOKING_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_booking_no_tech');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);

  const evaluateBookingTemplate = useCallback(
    (templateContent: string): string =>
      evaluateBookingTemplateText({
        templateContent,
        booking,
        selectedCN,
        selectedSlot,
        bookingDate,
        selectedCV,
        selectedCustomer,
        customerLastVisit,
        offDayStaffInfo,
      }),
    [booking, selectedCN, selectedSlot, bookingDate, selectedCV, selectedCustomer, customerLastVisit, offDayStaffInfo]
  );

  const autoSelectTemplate = useCallback(
    (templatesList: BookingConfirmationTemplate[]) => {
      const target = pickAutoBookingTemplate(templatesList, selectedSlot, selectedCV);
      if (target) {
        setSelectedTemplateId(target.id);
        setCustomMessage(target.content);
      }
    },
    [selectedSlot, selectedCV]
  );

  const fetchBookingTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const list = await apiClient.sms.getBookingTemplates();
      if (Array.isArray(list) && list.length > 0) {
        setBookingTemplates(list);
        return list;
      }
    } catch (err) {
      console.error('Failed to fetch booking templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
    return DEFAULT_BOOKING_TEMPLATES;
  }, []);

  useEffect(() => {
    if (open && bookingTemplates.length > 0) {
      autoSelectTemplate(bookingTemplates);
    }
  }, [selectedSlot, selectedCV, open, bookingTemplates, autoSelectTemplate]);

  const handleCopyMessage = useCallback(() => {
    const text = evaluateBookingTemplate(customMessage);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      message.success('Đã sao chép tin nhắn xác nhận vào bộ nhớ tạm!');
    } else {
      message.error('Trình duyệt không hỗ trợ tự động sao chép.');
    }
  }, [evaluateBookingTemplate, customMessage]);

  const handleSaveTemplate = useCallback(async () => {
    if (!selectedTemplateId || !customMessage.trim()) return;
    setSavingTemplate(true);
    try {
      const currentTpl = bookingTemplates.find((t) => t.id === selectedTemplateId);
      const res = await apiClient.sms.saveBookingTemplate({
        id: selectedTemplateId,
        type: currentTpl?.type || 'no_tech',
        title: currentTpl?.title || 'Mẫu dời lịch',
        content: customMessage,
        isDefault: true,
      });
      if (res.success && res.templates) {
        setBookingTemplates(res.templates);
        message.success('Đã lưu mẫu tin nhắn thành công vào CSDL hệ thống!');
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      message.error('Không thể lưu mẫu tin nhắn.');
    } finally {
      setSavingTemplate(false);
    }
  }, [selectedTemplateId, customMessage, bookingTemplates]);

  return {
    showTemplateSection,
    setShowTemplateSection,
    bookingTemplates,
    setBookingTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    customMessage,
    setCustomMessage,
    savingTemplate,
    loadingTemplates,
    isManagerModalOpen,
    setIsManagerModalOpen,
    evaluateBookingTemplate,
    autoSelectTemplate,
    fetchBookingTemplates,
    handleCopyMessage,
    handleSaveTemplate,
  };
}
