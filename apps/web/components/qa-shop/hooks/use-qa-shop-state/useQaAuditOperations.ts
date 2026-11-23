'use client';

import { useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Form, message } from 'antd';
import type { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import type { InspectionStats, ItemStatusMap } from '../../types/qa-shop.types';
import {
  buildChecklistAuditPayload,
  findMissingRequiredPhotoItems,
  type QaReviewFilterTab,
  type QaShiftType,
} from './qaShopChecklistHelpers';

export interface UseQaAuditOperationsParams {
  activeTemplate: SafeAny | null;
  itemStatuses: ItemStatusMap;
  itemNotesRef: MutableRefObject<Record<string, string>>;
  requireAllPhotos: boolean;
  selectedBranch: string;
  auditorName: string;
  selectedShift: QaShiftType;
  evaluatedStaffId: number | null;
  evaluatedStaffName: string;
  isPreApproved: boolean;
  inspectionStats: InspectionStats;
  fetchData: () => Promise<void>;
  setIsMobileFocusMode: Dispatch<SetStateAction<boolean>>;
}

/** Manage QA Shop audit review modals, ticket modals, and save/update/delete handlers. */
export function useQaAuditOperations({
  activeTemplate,
  itemStatuses,
  itemNotesRef,
  requireAllPhotos,
  selectedBranch,
  auditorName,
  selectedShift,
  evaluatedStaffId,
  evaluatedStaffName,
  isPreApproved,
  inspectionStats,
  fetchData,
  setIsMobileFocusMode,
}: UseQaAuditOperationsParams) {
  const [ticketForm] = Form.useForm();
  const [selectedAudit, setSelectedAudit] = useState<SafeAny | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SafeAny | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [auditReviewModalOpen, setAuditReviewModalOpen] = useState(false);
  const [reviewFilterTab, setReviewFilterTab] = useState<QaReviewFilterTab>('ALL');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [newlySavedAudit, setNewlySavedAudit] = useState<SafeAny | null>(null);
  const [isSavingAudit, setIsSavingAudit] = useState(false);

  // Submit Interactive Accordion Checklist Audit
  const handleSaveChecklistAudit = async () => {
    if (!activeTemplate || isSavingAudit) return;
    setIsSavingAudit(true);
    try {
      if (requireAllPhotos) {
        const missingPhotos = findMissingRequiredPhotoItems(activeTemplate, itemStatuses);
        if (missingPhotos.length > 0) {
          message.error(
            `Chế Độ Ép Chụp Hình 100% đang BẬT: Còn ${missingPhotos.length} tiêu chí chưa được chụp ảnh bằng chứng! Vui lòng chụp đủ ảnh trước khi nộp.`
          );
          setIsSavingAudit(false);
          return;
        }
      }

      const auditPayload = buildChecklistAuditPayload({
        activeTemplate,
        itemStatuses,
        itemNotes: itemNotesRef.current,
        selectedBranch,
        auditorName,
        selectedShift,
        evaluatedStaffId,
        evaluatedStaffName,
        isPreApproved,
        inspectionStats,
        requireAllPhotos,
      });

      const res = await apiClient.qaShop.saveAudit(auditPayload);
      const savedRecord = (res as any)?.data || { ...auditPayload, id: `AUD-${Date.now().toString().slice(-6)}` };
      setNewlySavedAudit(savedRecord);
      setSelectedAudit(savedRecord);

      message.success({
        content: `Đã lưu thành công Biên bản Kiểm tra QA Shop ${selectedBranch}!`,
        duration: 4,
      });

      setIsMobileFocusMode(false);
      setAuditReviewModalOpen(true);
      fetchData();
    } catch (err: SafeAny) {
      console.error('Save checklist audit error:', err);
      message.error(err.message || 'Lỗi khi lưu biên bản kiểm tra');
    } finally {
      setIsSavingAudit(false);
    }
  };

  // Ticket Update Handler
  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    try {
      const values = await ticketForm.validateFields();
      await apiClient.qaShop.updateTicket(selectedTicket.id, {
        status: values.status,
        resolutionNotes: values.resolutionNotes,
        resolutionPhotoUrls: values.resolutionPhotos ? values.resolutionPhotos.split('\n').filter(Boolean) : [],
      });
      message.success('Đã cập nhật tiến độ xử lý phiếu vi phạm!');
      setIsTicketModalOpen(false);
      setSelectedTicket(null);
      fetchData();
    } catch (err: SafeAny) {
      console.error('Update ticket error:', err);
      message.error(err.message || 'Lỗi khi cập nhật phiếu');
    }
  };

  // Delete Audit
  const handleDeleteAudit = async (id: string) => {
    try {
      await apiClient.qaShop.deleteAudit(id);
      message.success('Đã xóa biên bản audit (Soft delete for testing)');
      await fetchData();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa biên bản audit');
    }
  };

  return {
    selectedAudit,
    setSelectedAudit,
    isDrawerOpen,
    setIsDrawerOpen,
    selectedTicket,
    setSelectedTicket,
    isTicketModalOpen,
    setIsTicketModalOpen,
    ticketForm,
    auditReviewModalOpen,
    setAuditReviewModalOpen,
    reviewFilterTab,
    setReviewFilterTab,
    previewImageUrl,
    setPreviewImageUrl,
    newlySavedAudit,
    isSavingAudit,
    handleSaveChecklistAudit,
    handleUpdateTicket,
    handleDeleteAudit,
  };
}
