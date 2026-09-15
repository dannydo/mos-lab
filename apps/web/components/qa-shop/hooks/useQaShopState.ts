'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Form, message } from 'antd';
import dayjs from 'dayjs';
import { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { useMediaQuery } from '../../../hooks/useResponsiveTier';
import { ItemStatusMap, InspectionStats, GroupedArea, QaStaffMember } from '../types/qa-shop.types';

export function useQaShopState() {
  // Data States
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<SafeAny[]>([]);
  const [tickets, setTickets] = useState<SafeAny[]>([]);
  const [templates, setTemplates] = useState<SafeAny[]>([]);
  const [analytics, setAnalytics] = useState<SafeAny | null>(null);

  // Inspection Checklist Interactive State
  const [selectedBranch, setSelectedBranch] = useState<string>('DT');
  const [selectedShift, setSelectedShift] = useState<'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày'>('Sáng');
  const [auditorName, setAuditorName] = useState<string>('');
  const [qaStaffList, setQaStaffList] = useState<QaStaffMember[]>([]);
  const itemNotesRef = useRef<Record<string, string>>({});
  const [itemStatuses, setItemStatuses] = useState<ItemStatusMap>({});

  // Tab & Filters
  const [activeTab, setActiveTab] = useState('checklist');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // Modal & Drawer States
  const [selectedAudit, setSelectedAudit] = useState<SafeAny | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SafeAny | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [auditReviewModalOpen, setAuditReviewModalOpen] = useState(false);
  const [reviewFilterTab, setReviewFilterTab] = useState<'ALL' | 'PASS' | 'FAIL' | 'NA' | 'PHOTO'>('ALL');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [newlySavedAudit, setNewlySavedAudit] = useState<SafeAny | null>(null);
  const [isSavingAudit, setIsSavingAudit] = useState(false);

  // Pagination
  const [auditTabNextPage, setAuditTabNextPage] = useState(1);
  const [auditTabNextSize, setAuditTabNextSize] = useState(10);
  const [ticketTabNextPage, setTicketTabNextPage] = useState(1);
  const [ticketTabNextSize, setTicketTabNextSize] = useState(10);

  // Form Hooks
  const [ticketForm] = Form.useForm();
  const [crudForm] = Form.useForm();

  // Item Management Modals
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobileFocusMode, setIsMobileFocusMode] = useState(false);
  const isMobileScreen = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (!isMobileScreen) setIsMobileFocusMode(false);
  }, [isMobileScreen]);

  const [requireAllPhotos, setRequireAllPhotos] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SafeAny | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [manageSearchText, setManageSearchText] = useState('');

  // WebRTC Camera State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [activeItemIdForCamera, setActiveItemIdForCamera] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Template for current branch
  const activeTemplate = useMemo(() => {
    if (!templates || templates.length === 0) return null;
    return templates.find((t) => t.branchCode === selectedBranch || t.code?.startsWith(selectedBranch)) || templates[0];
  }, [templates, selectedBranch]);

  // Group sections into 2 Core Areas: LOBBY & LASHROOM
  const groupedAreas: GroupedArea[] = useMemo(() => {
    if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return [];

    const lobbySections: SafeAny[] = [];
    const lashroomSections: SafeAny[] = [];

    activeTemplate.sections.forEach((sec: SafeAny) => {
      const titleUpper = (sec.title || '').toUpperCase();
      const hasLashroomItem = sec.items?.some((i: SafeAny) => {
        const a = (i.area || '').toUpperCase();
        return a === 'LASHROOM' || a === 'PHÒNG RIÊNG' || a === 'KHU VỰC';
      });

      if (
        titleUpper.includes('LASHROOM') ||
        titleUpper.includes('PHÒNG') ||
        titleUpper.includes('GIƯỜNG') ||
        hasLashroomItem
      ) {
        lashroomSections.push(sec);
      } else {
        lobbySections.push(sec);
      }
    });

    return [
      {
        id: 'area-lobby',
        code: 'LOBBY',
        title: '🏢 KHU VỰC LOBBY (Sảnh Đón Khách, Quầy Lễ Tân, Tiếp Khách & Toilet)',
        badgeColor: 'blue',
        subSections: lobbySections,
        totalItems: lobbySections.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
      },
      {
        id: 'area-lashroom',
        code: 'LASHROOM',
        title: '👁️ KHU VỰC LASHROOM (Phòng Dịch Vụ, Giường Mi & Kỹ Thuật Viên)',
        badgeColor: 'purple',
        subSections: lashroomSections,
        totalItems: lashroomSections.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
      },
    ].filter((area) => area.subSections.length > 0);
  }, [activeTemplate]);

  // Fetch QA Staff List (Rule #20 Deduplicated)
  const fetchQaStaffList = useCallback(async () => {
    try {
      const detail = await apiClient.teams.getByCode('QA_QC_SHOP');
      const realList = detail.members.map((member) => ({
        id: String(member.crmStaffId || member.staffId),
        displayName: member.displayName,
        role: member.role || 'qa_qc',
      }));

      const seen = new Set<string>();
      const deduplicated = realList.filter((item) => {
        const key = (item.displayName || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setQaStaffList(deduplicated);
      if (deduplicated.length > 0) {
        setAuditorName(deduplicated[0].displayName);
      } else {
        setAuditorName('');
      }
    } catch (err) {
      console.error('Fetch QA staff error:', err);
      setQaStaffList([]);
      setAuditorName('');
    }
  }, []);

  useEffect(() => {
    fetchQaStaffList();
  }, [fetchQaStaffList]);

  // Fetch QA Shop Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [auditsRes, ticketsRes, templatesRes, analyticsRes] = await Promise.allSettled([
        apiClient.qaShop.getAudits({
          branchCode: branchFilter !== 'all' ? branchFilter : undefined,
          dateFrom: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
          dateTo: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        }),
        apiClient.qaShop.getTickets({
          branchCode: branchFilter !== 'all' ? branchFilter : undefined,
          status: ticketStatusFilter !== 'all' ? ticketStatusFilter : undefined,
        }),
        apiClient.qaShop.getTemplates(),
        apiClient.qaShop.getAnalytics(),
      ]);

      if (auditsRes.status === 'fulfilled') setAudits(Array.isArray(auditsRes.value) ? auditsRes.value : []);
      if (ticketsRes.status === 'fulfilled') setTickets(Array.isArray(ticketsRes.value) ? ticketsRes.value : []);
      if (templatesRes.status === 'fulfilled')
        setTemplates(Array.isArray(templatesRes.value) ? templatesRes.value : []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
    } catch (err) {
      console.error('Fetch QA Shop data error:', err);
      message.error('Không thể tải dữ liệu QA Shop Inspection');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, ticketStatusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset item statuses when activeTemplate changes
  useEffect(() => {
    if (activeTemplate && Array.isArray(activeTemplate.sections)) {
      const initialMap: ItemStatusMap = {};
      activeTemplate.sections.forEach((sec: SafeAny) => {
        if (Array.isArray(sec.items)) {
          sec.items.forEach((itm: SafeAny) => {
            initialMap[itm.id] = { result: undefined, note: '', photoUrl: '' };
          });
        }
      });
      setItemStatuses(initialMap);
    }
  }, [activeTemplate]);

  // Compute Live Score Metrics
  const inspectionStats: InspectionStats = useMemo(() => {
    const totalItems = Object.keys(itemStatuses).length;
    if (totalItems === 0) return { total: 0, passed: 0, failed: 0, na: 0, passRate: 100, failedItemsList: [] };

    let passed = 0;
    let failed = 0;
    let na = 0;
    const failedItemsList: InspectionStats['failedItemsList'] = [];

    if (activeTemplate && Array.isArray(activeTemplate.sections)) {
      activeTemplate.sections.forEach((sec: SafeAny) => {
        if (Array.isArray(sec.items)) {
          sec.items.forEach((itm: SafeAny) => {
            const st = itemStatuses[itm.id] || {};
            if (st.result === 'PASS') passed++;
            else if (st.result === 'NA') na++;
            else if (st.result === 'FAIL') {
              failed++;
              failedItemsList.push({
                secTitle: sec.title,
                itemTitle: itm.title,
                severity: itm.severity || 'MID',
                note: st.note || 'Không đạt quy chuẩn tiêu chí',
                photoUrl: st.photoUrl || '',
              });
            }
          });
        }
      });
    }

    const scorable = totalItems - na;
    const passRate = scorable > 0 ? Math.round((passed / scorable) * 1000) / 10 : 100;

    return { total: totalItems, passed, failed, na, passRate, failedItemsList };
  }, [itemStatuses, activeTemplate]);

  const hasRecordedInspectionResult = inspectionStats.passed + inspectionStats.failed + inspectionStats.na > 0;
  const inspectionProgressLabel = hasRecordedInspectionResult ? `${inspectionStats.passRate.toFixed(1)}%` : 'Chưa chấm';

  // Save updated template sections
  const persistTemplateChanges = useCallback(
    async (updatedSections: SafeAny[]) => {
      if (!activeTemplate) return;

      const newTemplate = {
        ...activeTemplate,
        sections: updatedSections,
        totalItemsCount: updatedSections.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0),
        updatedAt: new Date().toISOString(),
      };

      setTemplates((prev) => {
        if (!prev || prev.length === 0) return [newTemplate];
        const exists = prev.some((t) => t.branchCode === selectedBranch || t.id === newTemplate.id);
        if (!exists) return [...prev, newTemplate];
        return prev.map((t) => (t.branchCode === selectedBranch || t.id === newTemplate.id ? newTemplate : t));
      });

      setItemStatuses((prev) => {
        const next = { ...prev };
        updatedSections.forEach((sec: SafeAny) => {
          if (Array.isArray(sec.items)) {
            sec.items.forEach((itm: SafeAny) => {
              if (!next[itm.id]) {
                next[itm.id] = { result: 'PASS', note: '', photoUrl: '' };
              }
            });
          }
        });
        return next;
      });

      try {
        localStorage.setItem(`qa_custom_template_${selectedBranch}`, JSON.stringify(newTemplate));
      } catch (e) {
        console.warn('Failed to save template to localStorage', e);
      }

      try {
        await apiClient.qaShop.updateTemplate(selectedBranch, updatedSections);
      } catch (e) {
        console.warn('Backend API update template warning:', e);
      }
    },
    [activeTemplate, selectedBranch]
  );

  // Template CRUD Item Handlers
  const handleOpenItemModal = (item?: SafeAny, sectionId?: string) => {
    setEditingItem(item || null);
    setTargetSectionId(sectionId || activeTemplate?.sections?.[0]?.id || 'sec-1');
    if (item) {
      const foundSecId =
        sectionId ||
        activeTemplate?.sections?.find((s: SafeAny) => s.items?.some((i: SafeAny) => i.id === item.id))?.id;
      crudForm.setFieldsValue({
        sectionId: foundSecId,
        title: item.title || '',
        standardRequirement: item.standardRequirement || '',
        severity: item.severity || (item.isCritical ? 'HIGH' : 'MID'),
        unitQty: item.unitQty || item.weight || 1,
        area: item.area || '',
      });
    } else {
      crudForm.resetFields();
      crudForm.setFieldsValue({
        sectionId: sectionId || activeTemplate?.sections?.[0]?.id,
        severity: 'MID',
        unitQty: 1,
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const values = await crudForm.validateFields();
      if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return;

      let sectionId = values.sectionId || targetSectionId || activeTemplate.sections[0]?.id;
      const currentSections = [...activeTemplate.sections];

      let secIndex = currentSections.findIndex((s) => s.id === sectionId);
      if (secIndex === -1) {
        const newSecId = `sec-custom-${Date.now()}`;
        const newSec = {
          id: newSecId,
          title: values.sectionTitle || 'Nhóm Mới Thêm',
          items: [],
        };
        currentSections.push(newSec);
        secIndex = currentSections.length - 1;
        sectionId = newSecId;
      }

      const newItemId = editingItem?.id || `itm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newItemObj = {
        id: newItemId,
        code: editingItem?.code || `QA.${newItemId.slice(-4)}`,
        title: values.title,
        standardRequirement: values.standardRequirement || '',
        severity: values.severity,
        weight: values.unitQty || 1,
        unitQty: values.unitQty || 1,
        area: values.area || '',
        isCritical: values.severity === 'CRITICAL',
        requirePhotoOnFail: true,
      };

      if (editingItem) {
        const updatedSections = currentSections.map((sec) => ({
          ...sec,
          items: (sec.items || []).map((itm: SafeAny) => (itm.id === editingItem.id ? newItemObj : itm)),
        }));
        await persistTemplateChanges(updatedSections);
        message.success('Đã cập nhật thông tin tiêu chí thành công!');
      } else {
        const targetSec = currentSections[secIndex];
        const updatedItems = [...(targetSec.items || []), newItemObj];
        currentSections[secIndex] = { ...targetSec, items: updatedItems };

        await persistTemplateChanges(currentSections);
        message.success('Đã thêm tiêu chí kiểm tra mới thành công!');
      }

      setIsItemModalOpen(false);
    } catch (err) {
      console.error('Validation or save error:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return;

    const updatedSections = activeTemplate.sections.map((sec: SafeAny) => ({
      ...sec,
      items: (sec.items || []).filter((itm: SafeAny) => itm.id !== itemId),
    }));

    await persistTemplateChanges(updatedSections);
    message.success('Đã xóa tiêu chí kiểm tra!');
  };

  // Submit Interactive Accordion Checklist Audit
  const handleSaveChecklistAudit = async () => {
    if (!activeTemplate || isSavingAudit) return;
    setIsSavingAudit(true);
    try {
      const auditItems = Object.entries(itemStatuses).map(([itemId, st]) => ({
        itemId,
        result: st.result || 'PASS',
        note: itemNotesRef.current[itemId] ?? st.note ?? '',
        photoUrls: st.photoUrl ? [st.photoUrl] : [],
      }));

      if (requireAllPhotos) {
        const allItems = activeTemplate.sections.flatMap((s: SafeAny) => s.items || []);
        const missingPhotos = allItems.filter((itm: SafeAny) => !itemStatuses[itm.id]?.photoUrl);
        if (missingPhotos.length > 0) {
          message.error(
            `Chế Độ Ép Chụp Hình 100% đang BẬT: Còn ${missingPhotos.length} tiêu chí chưa được chụp ảnh bằng chứng! Vui lòng chụp đủ ảnh trước khi nộp.`
          );
          setIsSavingAudit(false);
          return;
        }
      }

      const auditPayload = {
        templateId: activeTemplate.id || 'tpl-wings-dt',
        branchCode: selectedBranch as SafeAny,
        auditorId: 'usr-qa-01',
        auditorName: auditorName || 'Nguyễn Thị Minh QA',
        auditDate: dayjs().format('YYYY-MM-DD'),
        shift: selectedShift,
        notes: `Biên bản kiểm tra cửa hàng ${selectedBranch} ca ${selectedShift}. Tỷ lệ đạt: ${inspectionStats.passRate}% (${inspectionStats.failed} lỗi phát hiện).`,
        items: auditItems,
        itemSnapshot: itemStatuses,
        sectionsSnapshot: activeTemplate.sections,
        requireAllPhotos,
      };

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

  // WebRTC Live Camera Handlers
  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập WebRTC camera.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
    } finally {
      setIsCameraLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const openCameraForItem = (itemId: string) => {
    setActiveItemIdForCamera(itemId);
    setIsCameraModalOpen(true);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const closeCameraModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
    setActiveItemIdForCamera(null);
  };

  const captureLivePhoto = () => {
    if (!videoRef.current || !activeItemIdForCamera) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setItemStatuses((prev) => ({
        ...prev,
        [activeItemIdForCamera]: {
          ...prev[activeItemIdForCamera],
          result: 'FAIL',
          photoUrl: dataUrl,
        },
      }));

      message.success('Đã chụp ảnh bằng chứng vi phạm thành công!');
      closeCameraModal();
    }
  };

  // Image compression helper
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((event.target?.result as string) || '');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(compressedDataUrl);
        };
        img.onerror = () => resolve((event.target?.result as string) || '');
        img.src = (event.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        message.loading({ content: 'Đang xử lý & đính kèm ảnh bằng chứng...', key: `photo-${itemId}` });
        const dataUrl = await compressImageFile(file);
        if (dataUrl) {
          setItemStatuses((prev) => ({
            ...prev,
            [itemId]: {
              ...prev[itemId],
              result: 'FAIL',
              photoUrl: dataUrl,
            },
          }));
          message.success({ content: 'Đã đính kèm ảnh bằng chứng thành công!', key: `photo-${itemId}` });
        }
      } catch (err: SafeAny) {
        console.error('Compress image error:', err);
        message.error({ content: 'Không thể đính kèm ảnh, vui lòng thử lại!', key: `photo-${itemId}` });
      }
    }
    e.target.value = '';
  };

  return {
    // Data states
    loading,
    audits,
    tickets,
    templates,
    analytics,
    activeTemplate,
    groupedAreas,

    // Interactive shift & auditor
    selectedBranch,
    setSelectedBranch,
    selectedShift,
    setSelectedShift,
    auditorName,
    setAuditorName,
    qaStaffList,

    // Checklist statuses
    itemStatuses,
    setItemStatuses,
    itemNotesRef,
    inspectionStats,
    hasRecordedInspectionResult,
    inspectionProgressLabel,

    // Toggles & Modes
    isEditMode,
    setIsEditMode,
    isMobileFocusMode,
    setIsMobileFocusMode,
    isMobileScreen,
    requireAllPhotos,
    setRequireAllPhotos,

    // Tabs & Filters
    activeTab,
    setActiveTab,
    branchFilter,
    setBranchFilter,
    ticketStatusFilter,
    setTicketStatusFilter,
    dateRange,
    setDateRange,

    // Pagination
    auditTabNextPage,
    setAuditTabNextPage,
    auditTabNextSize,
    setAuditTabNextSize,
    ticketTabNextPage,
    setTicketTabNextPage,
    ticketTabNextSize,
    setTicketTabNextSize,

    // Modals
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

    // Template CRUD Modal
    isManageModalOpen,
    setIsManageModalOpen,
    manageSearchText,
    setManageSearchText,
    isItemModalOpen,
    setIsItemModalOpen,
    editingItem,
    crudForm,
    handleOpenItemModal,
    handleSaveItem,
    handleDeleteItem,

    // Camera WebRTC
    isCameraModalOpen,
    activeItemIdForCamera,
    cameraStream,
    isCameraLoading,
    cameraError,
    videoRef,
    canvasRef,
    openCameraForItem,
    closeCameraModal,
    captureLivePhoto,
    handleFileInputChange,

    // Handlers
    fetchData,
    handleSaveChecklistAudit,
    handleUpdateTicket,
    handleDeleteAudit,
  };
}
