import { useState, useEffect, useMemo, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import type { QaAuditResult, QaChecklistTemplate, QaSeverity, QaShopBranchCode } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  buildAuditItemsPayload,
  buildDefaultItemStates,
  computeComplianceStats,
  extractErrorMessage,
  findMissingRequiredFailPhotos,
} from './dailyAuditUtils';
import type { AuditShift, ItemResultState } from './types';

interface UseDailyAuditStateParams {
  onAuditSubmitted: () => void;
}

export function useDailyAuditState({ onAuditSubmitted }: UseDailyAuditStateParams) {
  const [selectedBranch, setSelectedBranch] = useState<QaShopBranchCode>('DT');
  const [template, setTemplate] = useState<QaChecklistTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [shift, setShift] = useState<AuditShift>('Sáng');
  const [auditDate, setAuditDate] = useState<dayjs.Dayjs>(dayjs());
  const [auditorName, setAuditorName] = useState<string>('Nguyễn Thị Minh QA');
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Accordion active keys
  const [activeAccordionKeys, setActiveAccordionKeys] = useState<string[]>([]);

  // Item inspection states: Map<itemId, ItemResultState>
  const [itemStates, setItemStates] = useState<Record<string, ItemResultState>>({});

  // Fetch Template when branch changes
  const fetchTemplate = useCallback(async (branch: QaShopBranchCode) => {
    try {
      setLoadingTemplate(true);
      const res = await apiClient.qaShop.getTemplates({ branchCode: branch });
      if (res && res.length > 0) {
        setTemplate(res[0]);
        setActiveAccordionKeys(res[0].sections.map((s) => s.id));
        setItemStates(buildDefaultItemStates(res[0]));
      } else {
        setTemplate(null);
      }
    } catch (err) {
      console.error('Fetch template error:', err);
      message.error('Không thể tải mẫu kiểm tra cho chi nhánh này');
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplate(selectedBranch);
  }, [selectedBranch, fetchTemplate]);

  const handleItemResultChange = useCallback((itemId: string, newResult: QaAuditResult) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        result: newResult,
        severity: newResult === 'FAIL' ? prev[itemId]?.severity || 'MEDIUM' : undefined,
      },
    }));
  }, []);

  const handleItemNoteChange = useCallback((itemId: string, noteText: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        note: noteText,
      },
    }));
  }, []);

  const handleItemPhotoChange = useCallback((itemId: string, photoUrl: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        photoUrl,
      },
    }));
  }, []);

  const handleItemSeverityChange = useCallback((itemId: string, severity: QaSeverity) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        severity,
      },
    }));
  }, []);

  const handleToggleExpandAll = useCallback(() => {
    if (!template) return;
    setActiveAccordionKeys((prev) =>
      prev.length === template.sections.length ? [] : template.sections.map((s) => s.id)
    );
  }, [template]);

  const stats = useMemo(() => computeComplianceStats(template, itemStates), [template, itemStates]);

  const handleSubmitAudit = useCallback(async () => {
    if (!template) return;

    const failWithoutPhoto = findMissingRequiredFailPhotos(template, itemStates);
    if (failWithoutPhoto.length > 0) {
      message.warning(`Vui lòng tải ảnh bằng chứng cho các mục Không Đạt: ${failWithoutPhoto.join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = buildAuditItemsPayload(itemStates);

      const auditRes = await apiClient.qaShop.saveAudit({
        templateId: template.id,
        branchCode: selectedBranch,
        auditorId: 'usr-qa-current',
        auditorName,
        auditDate: auditDate.format('YYYY-MM-DD'),
        shift,
        notes: generalNotes,
        items: itemsPayload,
      });

      message.success(
        `Đã gửi thành công Báo Cáo Audit ${auditRes.auditCode}! Đạt ${auditRes.complianceRate}% điểm tuân thủ.`
      );
      onAuditSubmitted();
    } catch (err: unknown) {
      console.error('Submit audit error:', err);
      message.error(extractErrorMessage(err, 'Lỗi khi gửi báo cáo audit'));
    } finally {
      setSubmitting(false);
    }
  }, [template, itemStates, selectedBranch, auditorName, auditDate, shift, generalNotes, onAuditSubmitted]);

  return {
    selectedBranch,
    setSelectedBranch,
    template,
    loadingTemplate,
    submitting,
    shift,
    setShift,
    auditDate,
    setAuditDate,
    auditorName,
    setAuditorName,
    generalNotes,
    setGeneralNotes,
    activeAccordionKeys,
    setActiveAccordionKeys,
    itemStates,
    stats,
    handleItemResultChange,
    handleItemNoteChange,
    handleItemPhotoChange,
    handleItemSeverityChange,
    handleToggleExpandAll,
    handleSubmitAudit,
  };
}
