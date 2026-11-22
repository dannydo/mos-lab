'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useMediaQuery } from '../../../hooks/useResponsiveTier';
import type { ItemStatusMap, InspectionStats, GroupedArea } from '../types/qa-shop.types';
import {
  resolveActiveTemplate,
  buildGroupedAreas,
  createInitialItemStatusMap,
  computeInspectionStats,
  type QaShiftType,
} from './use-qa-shop-state/qaShopChecklistHelpers';
import { useQaShopData } from './use-qa-shop-state/useQaShopData';
import { useQaTemplateCrud } from './use-qa-shop-state/useQaTemplateCrud';
import { useQaCameraCapture } from './use-qa-shop-state/useQaCameraCapture';
import { useQaAuditOperations } from './use-qa-shop-state/useQaAuditOperations';

export {
  resolveActiveTemplate,
  buildGroupedAreas,
  deduplicateQaStaffMembers,
  createInitialItemStatusMap,
  computeInspectionStats,
  findMissingRequiredPhotoItems,
  buildChecklistAuditPayload,
  type QaShiftType,
  type QaReviewFilterTab,
  type BuildChecklistAuditPayloadParams,
} from './use-qa-shop-state/qaShopChecklistHelpers';
export { compressImageFile } from './use-qa-shop-state/qaShopMediaHelpers';
export { useQaShopData } from './use-qa-shop-state/useQaShopData';
export { useQaTemplateCrud, type UseQaTemplateCrudParams } from './use-qa-shop-state/useQaTemplateCrud';
export { useQaCameraCapture, type UseQaCameraCaptureParams } from './use-qa-shop-state/useQaCameraCapture';
export { useQaAuditOperations, type UseQaAuditOperationsParams } from './use-qa-shop-state/useQaAuditOperations';

export function useQaShopState() {
  const data = useQaShopData();

  // Inspection Checklist Interactive State
  const [selectedBranch, setSelectedBranch] = useState<string>('DT');
  const [selectedShift, setSelectedShift] = useState<QaShiftType>('Sáng');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [isPreApproved, setIsPreApproved] = useState<boolean>(false);
  const itemNotesRef = useRef<Record<string, string>>({});
  const [itemStatuses, setItemStatuses] = useState<ItemStatusMap>({});

  // Tab & Pagination
  const [activeTab, setActiveTab] = useState('checklist');
  const [auditTabNextPage, setAuditTabNextPage] = useState(1);
  const [auditTabNextSize, setAuditTabNextSize] = useState(10);
  const [ticketTabNextPage, setTicketTabNextPage] = useState(1);
  const [ticketTabNextSize, setTicketTabNextSize] = useState(10);

  // Toggles & Modes
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobileFocusMode, setIsMobileFocusMode] = useState(false);
  const isMobileScreen = useMediaQuery('(max-width: 767px)');
  const [requireAllPhotos, setRequireAllPhotos] = useState(false);

  useEffect(() => {
    if (!isMobileScreen) setIsMobileFocusMode(false);
  }, [isMobileScreen]);

  // Active Template for current branch or specific selection
  const activeTemplate = useMemo(
    () => resolveActiveTemplate(data.templates, selectedBranch, selectedTemplateCode),
    [data.templates, selectedBranch, selectedTemplateCode]
  );

  // Group sections into 2 Core Areas: LOBBY & LASHROOM or GROOMING & STATION
  const groupedAreas: GroupedArea[] = useMemo(() => buildGroupedAreas(activeTemplate), [activeTemplate]);

  // Reset item statuses when activeTemplate changes
  useEffect(() => {
    if (activeTemplate && Array.isArray(activeTemplate.sections)) {
      setItemStatuses(createInitialItemStatusMap(activeTemplate));
    }
  }, [activeTemplate]);

  // Compute Live Score Metrics
  const inspectionStats: InspectionStats = useMemo(
    () => computeInspectionStats(itemStatuses, activeTemplate, isPreApproved),
    [itemStatuses, activeTemplate, isPreApproved]
  );

  const hasRecordedInspectionResult = inspectionStats.passed + inspectionStats.failed + inspectionStats.na > 0;
  const inspectionProgressLabel = hasRecordedInspectionResult ? `${inspectionStats.passRate.toFixed(1)}%` : 'Chưa chấm';

  const templateCrud = useQaTemplateCrud({
    activeTemplate,
    selectedBranch,
    setTemplates: data.setTemplates,
    setItemStatuses,
  });

  const camera = useQaCameraCapture({ setItemStatuses });

  const auditOps = useQaAuditOperations({
    activeTemplate,
    itemStatuses,
    itemNotesRef,
    requireAllPhotos,
    selectedBranch,
    auditorName: data.auditorName,
    selectedShift,
    evaluatedStaffId: data.evaluatedStaffId,
    evaluatedStaffName: data.evaluatedStaffName,
    isPreApproved,
    inspectionStats,
    fetchData: data.fetchData,
    setIsMobileFocusMode,
  });

  return {
    // Data states
    loading: data.loading,
    audits: data.audits,
    tickets: data.tickets,
    templates: data.templates,
    analytics: data.analytics,
    activeTemplate,
    groupedAreas,

    // Interactive shift & auditor
    selectedBranch,
    setSelectedBranch,
    selectedShift,
    setSelectedShift,
    auditorName: data.auditorName,
    setAuditorName: data.setAuditorName,
    qaStaffList: data.qaStaffList,
    selectedTemplateCode,
    setSelectedTemplateCode,
    evaluatedStaffId: data.evaluatedStaffId,
    setEvaluatedStaffId: data.setEvaluatedStaffId,
    evaluatedStaffName: data.evaluatedStaffName,
    setEvaluatedStaffName: data.setEvaluatedStaffName,
    handleSelectEvaluatedStaff: data.handleSelectEvaluatedStaff,
    isPreApproved,
    setIsPreApproved,
    allStaffList: data.allStaffList,

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
    branchFilter: data.branchFilter,
    setBranchFilter: data.setBranchFilter,
    ticketStatusFilter: data.ticketStatusFilter,
    setTicketStatusFilter: data.setTicketStatusFilter,
    dateRange: data.dateRange,
    setDateRange: data.setDateRange,

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
    selectedAudit: auditOps.selectedAudit,
    setSelectedAudit: auditOps.setSelectedAudit,
    isDrawerOpen: auditOps.isDrawerOpen,
    setIsDrawerOpen: auditOps.setIsDrawerOpen,
    selectedTicket: auditOps.selectedTicket,
    setSelectedTicket: auditOps.setSelectedTicket,
    isTicketModalOpen: auditOps.isTicketModalOpen,
    setIsTicketModalOpen: auditOps.setIsTicketModalOpen,
    ticketForm: auditOps.ticketForm,
    auditReviewModalOpen: auditOps.auditReviewModalOpen,
    setAuditReviewModalOpen: auditOps.setAuditReviewModalOpen,
    reviewFilterTab: auditOps.reviewFilterTab,
    setReviewFilterTab: auditOps.setReviewFilterTab,
    previewImageUrl: auditOps.previewImageUrl,
    setPreviewImageUrl: auditOps.setPreviewImageUrl,
    newlySavedAudit: auditOps.newlySavedAudit,
    isSavingAudit: auditOps.isSavingAudit,

    // Template CRUD Modal
    isManageModalOpen: templateCrud.isManageModalOpen,
    setIsManageModalOpen: templateCrud.setIsManageModalOpen,
    manageSearchText: templateCrud.manageSearchText,
    setManageSearchText: templateCrud.setManageSearchText,
    isItemModalOpen: templateCrud.isItemModalOpen,
    setIsItemModalOpen: templateCrud.setIsItemModalOpen,
    editingItem: templateCrud.editingItem,
    crudForm: templateCrud.crudForm,
    handleOpenItemModal: templateCrud.handleOpenItemModal,
    handleSaveItem: templateCrud.handleSaveItem,
    handleDeleteItem: templateCrud.handleDeleteItem,

    // Camera WebRTC
    isCameraModalOpen: camera.isCameraModalOpen,
    activeItemIdForCamera: camera.activeItemIdForCamera,
    cameraStream: camera.cameraStream,
    isCameraLoading: camera.isCameraLoading,
    cameraError: camera.cameraError,
    videoRef: camera.videoRef,
    canvasRef: camera.canvasRef,
    openCameraForItem: camera.openCameraForItem,
    closeCameraModal: camera.closeCameraModal,
    captureLivePhoto: camera.captureLivePhoto,
    handleFileInputChange: camera.handleFileInputChange,

    // Handlers
    fetchData: data.fetchData,
    handleSaveChecklistAudit: auditOps.handleSaveChecklistAudit,
    handleUpdateTicket: auditOps.handleUpdateTicket,
    handleDeleteAudit: auditOps.handleDeleteAudit,
  };
}
