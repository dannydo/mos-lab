'use client';

import React from 'react';
import { Form, message } from 'antd';
import { removeVietnameseTones, type AcademyLead, type AcademyWorkshopParticipant } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { compressWorkshopImage } from './academy-workshop-image';
import type { AcademyWorkshopFeeForm, AcademyWorkshopWalkInForm } from './AcademyWorkshopParticipantOverlays';

export interface UseAcademyWorkshopParticipantActionsOptions {
  workshop: Awaited<ReturnType<typeof apiClient.academySales.workshops.getBySlug>> | null;
  slug: string;
  canManageRestricted: boolean;
  participants: AcademyWorkshopParticipant[];
  setWorkshop: React.Dispatch<
    React.SetStateAction<Awaited<ReturnType<typeof apiClient.academySales.workshops.getBySlug>> | null>
  >;
  setParticipants: React.Dispatch<React.SetStateAction<AcademyWorkshopParticipant[]>>;
  load: () => Promise<void>;
}

export function useAcademyWorkshopParticipantActions({
  workshop,
  slug,
  canManageRestricted,
  participants,
  setWorkshop,
  setParticipants,
  load,
}: UseAcademyWorkshopParticipantActionsOptions) {
  const [selected, setSelected] = React.useState<AcademyWorkshopParticipant | null>(null);
  const [careDrawerOpen, setCareDrawerOpen] = React.useState(false);
  const [addLeadIds, setAddLeadIds] = React.useState<number[]>([]);
  const [leadSearch, setLeadSearch] = React.useState('');
  const deferredLeadSearch = React.useDeferredValue(leadSearch);
  const [leadLoading, setLeadLoading] = React.useState(false);
  const [leadError, setLeadError] = React.useState<string | null>(null);
  const [leadOptions, setLeadOptions] = React.useState<AcademyLead[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [feeOpen, setFeeOpen] = React.useState(false);
  const [selectionsOpen, setSelectionsOpen] = React.useState(false);
  const [selectionsParticipant, setSelectionsParticipant] = React.useState<AcademyWorkshopParticipant | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState('');
  const [qrTargetUrl, setQrTargetUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [busyParticipantId, setBusyParticipantId] = React.useState<number | null>(null);
  const [walkInForm] = Form.useForm<AcademyWorkshopWalkInForm>();
  const [feeForm] = Form.useForm<AcademyWorkshopFeeForm>();

  React.useEffect(() => {
    if (!addOpen) return;
    let active = true;
    setLeadLoading(true);
    setLeadError(null);
    const timer = window.setTimeout(
      () => {
        void apiClient.academySales
          .listLeads({ page: 1, limit: 100, search: deferredLeadSearch.trim() || undefined })
          .then((response) => {
            if (!active) return;
            setLeadOptions((current) => {
              const byId = new Map(current.map((lead) => [lead.id, lead]));
              response.data.forEach((lead) => byId.set(lead.id, lead));
              return [...byId.values()];
            });
          })
          .catch((cause: any) => {
            if (!active) return;
            setLeadError(cause?.response?.data?.message || 'Không thể tải danh sách học viên Academy.');
          })
          .finally(() => {
            if (active) setLeadLoading(false);
          });
      },
      deferredLeadSearch ? 250 : 0
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [addOpen, deferredLeadSearch]);

  const availableLeadOptions = React.useMemo(() => {
    const rosterLeadIds = new Set(participants.map((participant) => participant.lead.id));
    const normalizedSearch = removeVietnameseTones(leadSearch);
    return leadOptions.filter((lead) => {
      if (rosterLeadIds.has(lead.id)) return false;
      if (addLeadIds.includes(lead.id) || !normalizedSearch) return true;
      return removeVietnameseTones(`${lead.name} ${lead.phone || ''} ${lead.email || ''}`).includes(normalizedSearch);
    });
  }, [addLeadIds, leadOptions, leadSearch, participants]);

  const mutateParticipant = React.useCallback(
    async (mutation: () => Promise<AcademyWorkshopParticipant>, success: string, participantId?: number) => {
      setBusy(true);
      if (participantId) setBusyParticipantId(participantId);
      try {
        const next = await mutation();
        setParticipants((rows) => rows.map((row) => (row.id === next.id ? next : row)));
        setSelected((current) => (current?.id === next.id ? next : current));
        void apiClient.academySales.workshops
          .getBySlug(slug)
          .then(setWorkshop)
          .catch(() => undefined);
        message.success(success);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật học viên.');
      } finally {
        setBusy(false);
        setBusyParticipantId(null);
      }
    },
    [setParticipants, setWorkshop, slug]
  );

  const openCareDrawer = React.useCallback((participant: AcademyWorkshopParticipant) => {
    setQrDataUrl('');
    setQrTargetUrl('');
    setSelected(participant);
    setCareDrawerOpen(true);
  }, []);

  const openFeeForParticipant = React.useCallback(
    (participant: AcademyWorkshopParticipant) => {
      if (!canManageRestricted) return;
      setSelected(participant);
      feeForm.resetFields();
      feeForm.setFieldValue('method', 'BANK_TRANSFER');
      if (participant.feeRemainingVnd > 0) feeForm.setFieldValue('amountVnd', participant.feeRemainingVnd);
      setFeeOpen(true);
    },
    [canManageRestricted, feeForm]
  );

  const closeFeeModal = React.useCallback(() => {
    setFeeOpen(false);
    feeForm.resetFields();
    if (!careDrawerOpen) setSelected(null);
  }, [careDrawerOpen, feeForm]);

  const openSelectionsForParticipant = React.useCallback((participant: AcademyWorkshopParticipant) => {
    setSelectionsParticipant(participant);
    setSelectionsOpen(true);
  }, []);

  const closeSelectionsModal = React.useCallback(() => {
    setSelectionsOpen(false);
    setSelectionsParticipant(null);
  }, []);

  const saveSelections = React.useCallback(
    async (menuItemIds: number[], equipmentPackageId: number | null, designItemId?: number | null) => {
      if (!workshop || !selectionsParticipant) return;
      await mutateParticipant(
        () =>
          apiClient.academySales.workshops.updateSelections(workshop.id, selectionsParticipant.id, {
            menuItemIds,
            equipmentPackageId,
            designItemId,
          }),
        'Đã lưu lựa chọn thực đơn, dụng cụ và mẫu mi.',
        selectionsParticipant.id
      );
      setSelectionsOpen(false);
      setSelectionsParticipant(null);
    },
    [mutateParticipant, selectionsParticipant, workshop]
  );

  const addExisting = React.useCallback(async () => {
    if (!workshop || !addLeadIds.length) return;
    setBusy(true);
    try {
      const added = await apiClient.academySales.workshops.addParticipants(workshop.id, { leadIds: addLeadIds });
      message.success(`Đã thêm ${added.length} học viên và cấp QR.`);
      setAddOpen(false);
      setAddLeadIds([]);
      setLeadSearch('');
      await load();
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể thêm học viên.');
    } finally {
      setBusy(false);
    }
  }, [addLeadIds, load, workshop]);

  const createWalkIn = React.useCallback(
    async (values: AcademyWorkshopWalkInForm) => {
      if (!workshop) return;
      setBusy(true);
      try {
        const added = await apiClient.academySales.workshops.addWalkIn(workshop.id, values);
        setWalkInOpen(false);
        walkInForm.resetFields();
        setSelected(added);
        setCareDrawerOpen(true);
        setParticipants((rows) => [added, ...rows]);
        if (added.qrUrl) {
          const QRCode = (await import('qrcode')).default;
          setQrDataUrl(await QRCode.toDataURL(added.qrUrl, { width: 520, margin: 2 }));
          setQrTargetUrl(added.qrUrl);
        }
        message.success('Đã tạo walk-in và cấp QR.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể tạo walk-in.');
      } finally {
        setBusy(false);
      }
    },
    [setParticipants, walkInForm, workshop]
  );

  const reissueQr = React.useCallback(async () => {
    if (!workshop || !selected) return;
    await mutateParticipant(async () => {
      const next = await apiClient.academySales.workshops.reissueQr(workshop.id, selected.id);
      if (next.qrUrl) {
        const QRCode = (await import('qrcode')).default;
        setQrDataUrl(await QRCode.toDataURL(next.qrUrl, { width: 520, margin: 2 }));
        setQrTargetUrl(next.qrUrl);
      }
      return next;
    }, 'Đã cấp QR mới; QR cũ không còn hiệu lực.');
  }, [mutateParticipant, selected, workshop]);

  const saveFee = React.useCallback(
    async (values: AcademyWorkshopFeeForm) => {
      if (!workshop || !selected) return;
      await mutateParticipant(
        () => apiClient.academySales.workshops.recordFee(workshop.id, selected.id, values),
        'Đã ghi nhận bút toán phí.',
        selected.id
      );
      closeFeeModal();
    },
    [closeFeeModal, mutateParticipant, selected, workshop]
  );

  const uploadPhoto = React.useCallback(
    async (file: File) => {
      if (!workshop || !selected) return false;
      setBusy(true);
      try {
        const compressed = await compressWorkshopImage(file);
        const intent = await apiClient.academySales.workshops.createPhotoUploadIntent(workshop.id, selected.id, {
          fileName: compressed.name,
          mimeType: compressed.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: compressed.size,
        });
        const response = await fetch(intent.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': compressed.type, 'x-upsert': 'false' },
          body: compressed,
        });
        if (!response.ok) throw new Error('Storage từ chối upload ảnh.');
        const next = await apiClient.academySales.workshops.confirmPhoto(workshop.id, selected.id, {
          storagePath: intent.storagePath,
          mimeType: compressed.type,
          sizeBytes: compressed.size,
          capturedAt: new Date().toISOString(),
        });
        setSelected(next);
        setParticipants((rows) => rows.map((row) => (row.id === next.id ? next : row)));
        message.success('Đã lưu ảnh khoảnh khắc.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || cause?.message || 'Không thể tải ảnh.');
      } finally {
        setBusy(false);
      }
      return false;
    },
    [selected, setParticipants, workshop]
  );

  const quickUpdateCare = React.useCallback(
    (
      participant: AcademyWorkshopParticipant,
      input: Parameters<typeof apiClient.academySales.workshops.updateCare>[2],
      success: string
    ) => {
      if (!workshop) return Promise.resolve();
      return mutateParticipant(
        () => apiClient.academySales.workshops.updateCare(workshop.id, participant.id, input),
        success,
        participant.id
      );
    },
    [mutateParticipant, workshop]
  );

  const quickCheckIn = React.useCallback(
    (participant: AcademyWorkshopParticipant) => {
      if (!workshop) return Promise.resolve();
      return mutateParticipant(
        () => apiClient.academySales.workshops.checkIn(workshop.id, participant.id, { checkedIn: true }),
        'Check-in thành công.',
        participant.id
      );
    },
    [mutateParticipant, workshop]
  );

  const quickAssignInstructor = React.useCallback(
    (participant: AcademyWorkshopParticipant, instructorId: number | null) => {
      if (!workshop) return Promise.resolve();
      return mutateParticipant(
        () => apiClient.academySales.workshops.assignInstructor(workshop.id, participant.id, { instructorId }),
        instructorId ? 'Đã phân giáo viên chính.' : 'Đã bỏ phân giáo viên chính.',
        participant.id
      );
    },
    [mutateParticipant, workshop]
  );

  return {
    selected,
    setSelected,
    careDrawerOpen,
    setCareDrawerOpen,
    addLeadIds,
    setAddLeadIds,
    leadSearch,
    setLeadSearch,
    leadLoading,
    leadError,
    setLeadError,
    availableLeadOptions,
    addOpen,
    setAddOpen,
    walkInOpen,
    setWalkInOpen,
    feeOpen,
    setFeeOpen,
    selectionsOpen,
    selectionsParticipant,
    openSelectionsForParticipant,
    closeSelectionsModal,
    saveSelections,
    qrDataUrl,
    setQrDataUrl,
    qrTargetUrl,
    setQrTargetUrl,
    busy,
    busyParticipantId,
    walkInForm,
    feeForm,
    mutateParticipant,
    openCareDrawer,
    openFeeForParticipant,
    closeFeeModal,
    addExisting,
    createWalkIn,
    reissueQr,
    saveFee,
    uploadPhoto,
    quickUpdateCare,
    quickCheckIn,
    quickAssignInstructor,
  };
}
