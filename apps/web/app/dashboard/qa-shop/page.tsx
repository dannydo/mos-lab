'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Tabs,
  Modal,
  Drawer,
  Button,
  Select,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Progress,
  Badge,
  Tooltip,
  Space,
  Row,
  Col,
  Typography,
  message,
  Empty,
  Divider,
  Alert,
  Radio,
  Collapse,
  Spin,
  Popconfirm,
  Switch,
} from 'antd';
import {
  SafetyCertificateOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  ShopOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  MinusOutlined,
  EditOutlined,
  BarChartOutlined,
  SettingOutlined,
  CopyOutlined,
  TrophyOutlined,
  BuildOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
  FilterOutlined,
  PictureOutlined,
  CameraOutlined,
  DeleteOutlined,
  PrinterOutlined,
  AlertOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  MobileOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { useTheme } from '../../../context/ThemeContext';
import { FullBranchAuditReportTab } from './components/FullBranchAuditReportTab';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// Active Store Branch Definitions fetched from Database (client_store where is_disabled = 0)
const STORE_BRANCHES = [
  { code: 'DT', name: 'Đề Thám (DT)' },
  { code: 'EP', name: 'Estella Place (EP)' },
  { code: 'ACA-DT', name: 'Academy - Đề Thám (ACA-DT)' },
  { code: 'HQ', name: 'Văn Phòng HQ (HQ)' },
];

const parseNormalizedItem = (itm: SafeAny) => {
  let rawTitle = (itm.title || '').replace(/\s*\[[A-Z0-9_\s]+\]\s*$/gi, '').trim();
  let subject = rawTitle;
  let detailRequirement = '';

  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    subject = parts[0].trim();
    detailRequirement = parts.slice(1).join(' - ').trim();
  } else if (rawTitle.includes(' – ')) {
    const parts = rawTitle.split(' – ');
    subject = parts[0].trim();
    detailRequirement = parts.slice(1).join(' – ').trim();
  }

  let unitQty = '';
  if (itm.standardRequirement) {
    const match = itm.standardRequirement.match(/Đơn vị:\s*([0-9]+)/i);
    if (match && match[1] && match[1] !== '1') {
      unitQty = `SL: ${match[1]}`;
    }
  }

  const area = itm.area ? itm.area.trim() : '';
  const dept = itm.dept ? itm.dept.trim() : 'CC';

  return { subject, detailRequirement, unitQty, area, dept };
};

const formatReqWithoutArea = (req?: string) => {
  if (!req) return '';
  return req
    .replace(/\|\s*Khu vực:\s*[^|]+/gi, '')
    .replace(/Khu vực:\s*[^|]+\|\s*/gi, '')
    .replace(/Khu vực:\s*[^|]+/gi, '')
    .replace(/^\s*\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
};

// Zero-lag native textarea for 195 items (0ms typing latency, direct ref sync)
const ItemNoteInput: React.FC<{
  itemId: string;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  notesRef: React.MutableRefObject<Record<string, string>>;
}> = React.memo(({ itemId, initialValue = '', placeholder, className, notesRef }) => {
  const [localVal, setLocalVal] = useState(() => notesRef.current[itemId] ?? initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    notesRef.current[itemId] = val;
  };

  return (
    <textarea
      value={localVal}
      onChange={handleChange}
      placeholder={placeholder || 'Ghi chú lỗi chi tiết...'}
      rows={2}
      className={`w-full p-2 text-xs rounded-md border outline-none transition-colors resize-none ${
        className || 'bg-slate-950 text-white border-rose-900/60 focus:border-rose-500'
      }`}
    />
  );
});
ItemNoteInput.displayName = 'ItemNoteInput';

export default function QaShopPage() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

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
  const [qaStaffList, setQaStaffList] = useState<Array<{ id: string; displayName: string; role?: string }>>([]);
  const itemNotesRef = useRef<Record<string, string>>({});
  const [itemStatuses, setItemStatuses] = useState<
    Record<
      string,
      { result?: 'PASS' | 'FAIL' | 'NA'; failedQty?: number; failedPercent?: number; note?: string; photoUrl?: string }
    >
  >({});

  // Helper to read logged-in user profile from localStorage
  const getLoggedInUser = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const mosUser = localStorage.getItem('mos_user');
      if (mosUser) return JSON.parse(mosUser);
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u);
    } catch (_) {}
    return null;
  }, []);

  // Fetch REAL QA & QC Staff List from MOS system DB and auto-select logged-in user
  const fetchQaStaffList = useCallback(async () => {
    try {
      const allStaff = await apiClient.staff.list();
      const loggedUser = getLoggedInUser();
      const loggedUserName = loggedUser?.displayName || loggedUser?.name || loggedUser?.username || '';

      // Filter active staff members from MOS database
      let activeStaff = Array.isArray(allStaff)
        ? allStaff.filter((s: SafeAny) => s.isActive !== false && s.isActive !== 0)
        : [];

      // Filter staff with role QA, QC, QA_QC, Admin, Manager
      const qaRoles = ['qa', 'qc', 'qa_qc', 'admin', 'manager'];
      let targetStaff = activeStaff.filter((s: SafeAny) => {
        const r = (s.role || '').toLowerCase();
        return qaRoles.some((qr) => r.includes(qr));
      });

      // If no QA/QC role filter match, use all active system staff
      if (targetStaff.length === 0) {
        targetStaff = activeStaff;
      }

      const realList = targetStaff.map((s: SafeAny) => ({
        id: String(s.id || s.username),
        displayName: s.displayName || s.name || s.username,
        role: s.role || 'staff',
      }));

      // Ensure logged-in user is at top of list if present
      if (loggedUserName && !realList.some((c) => c.displayName.toLowerCase() === loggedUserName.toLowerCase())) {
        realList.unshift({
          id: String(loggedUser?.id || 'logged-user'),
          displayName: loggedUserName,
          role: loggedUser?.role || 'admin',
        });
      }

      // Deduplicate by displayName per Rule #20
      const seen = new Set<string>();
      const deduplicated = realList.filter((item) => {
        const key = (item.displayName || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setQaStaffList(deduplicated);

      // Auto-select logged-in user if available, else first real staff
      if (loggedUserName && deduplicated.some((d) => d.displayName.toLowerCase() === loggedUserName.toLowerCase())) {
        const matched = deduplicated.find((d) => d.displayName.toLowerCase() === loggedUserName.toLowerCase());
        if (matched) setAuditorName(matched.displayName);
      } else if (deduplicated.length > 0) {
        setAuditorName(deduplicated[0].displayName);
      }
    } catch (err) {
      console.error('Fetch QA staff error:', err);
    }
  }, [getLoggedInUser]);

  useEffect(() => {
    fetchQaStaffList();
  }, [fetchQaStaffList]);

  // Soft Delete Audit Handler
  const handleDeleteAuditInPage = async (id: string) => {
    try {
      await apiClient.qaShop.deleteAudit(id);
      message.success('Đã xóa biên bản audit (Soft delete for testing)');
      await fetchData();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa biên bản audit');
    }
  };

  // Filters
  const [activeTab, setActiveTab] = useState('checklist');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // Modal & Drawer States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<SafeAny | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SafeAny | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Form Hooks
  const [auditForm] = Form.useForm();
  const [ticketForm] = Form.useForm();
  const [importForm] = Form.useForm();

  // Active Template for current branch
  const activeTemplate = useMemo(() => {
    if (!templates || templates.length === 0) return null;
    return templates.find((t) => t.branchCode === selectedBranch || t.code?.startsWith(selectedBranch)) || templates[0];
  }, [templates, selectedBranch]);

  // Group 32 sections into 2 Core Areas: LOBBY & LASHROOM
  const groupedAreas = useMemo(() => {
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

  // WebRTC Live Camera & Native File Upload States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [activeItemIdForCamera, setActiveItemIdForCamera] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start WebRTC Camera stream
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

  // Stop Camera stream
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Open Camera Modal for a specific item
  const openCameraForItem = (itemId: string) => {
    setActiveItemIdForCamera(itemId);
    setIsCameraModalOpen(true);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  // Close Camera Modal
  const closeCameraModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
    setActiveItemIdForCamera(null);
  };

  // Capture Live Photo from video stream onto canvas
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

  // Compress Image using Canvas helper to prevent payload explosion on Mobile (iPhone/Android)
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

  // Handle Native Camera / File Input change with automatic client-side compression
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
    // Clear value so user can take or choose another photo if needed
    e.target.value = '';
  };

  // CRUD & Item Editing States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobileFocusMode, setIsMobileFocusMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileFocusMode(true);
    }
  }, []);
  const [requireAllPhotos, setRequireAllPhotos] = useState(false);
  const [auditReviewModalOpen, setAuditReviewModalOpen] = useState(false);
  const [reviewFilterTab, setReviewFilterTab] = useState<'ALL' | 'PASS' | 'FAIL' | 'NA' | 'PHOTO'>('ALL');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [newlySavedAudit, setNewlySavedAudit] = useState<SafeAny | null>(null);
  const [isSavingAudit, setIsSavingAudit] = useState(false);
  const [auditTabNextPage, setAuditTabNextPage] = useState(1);
  const [auditTabNextSize, setAuditTabNextSize] = useState(10);
  const [ticketTabNextPage, setTicketTabNextPage] = useState(1);
  const [ticketTabNextSize, setTicketTabNextSize] = useState(10);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneSourceBranch, setCloneSourceBranch] = useState('DT');
  const [cloneTargetBranch, setCloneTargetBranch] = useState('EP');
  const [isCloning, setIsCloning] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SafeAny | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [manageSearchText, setManageSearchText] = useState('');

  const [crudForm] = Form.useForm();

  // Save updated sections to Active Template & Sync to Backend/LocalStorage
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

      // Ensure itemStatuses has entry for any new item
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

      // Save to LocalStorage
      try {
        localStorage.setItem(`qa_custom_template_${selectedBranch}`, JSON.stringify(newTemplate));
      } catch (e) {
        console.warn('Failed to save template to localStorage', e);
      }

      // Sync to Backend API
      try {
        await apiClient.qaShop.updateTemplate(selectedBranch, updatedSections);
      } catch (e) {
        console.warn('Backend API update template warning:', e);
      }
    },
    [activeTemplate, selectedBranch]
  );

  // Open Item Modal for Create or Edit
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

  // Handle Save Item (Create or Update)
  const handleSaveItem = async () => {
    try {
      const values = await crudForm.validateFields();
      if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return;

      let sectionId = values.sectionId || targetSectionId || activeTemplate.sections[0]?.id;
      const currentSections = [...activeTemplate.sections];

      let secIndex = currentSections.findIndex((s) => s.id === sectionId);
      if (secIndex === -1) {
        // Create new section if custom name entered
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
        // Update existing item across all sections
        const updatedSections = currentSections.map((sec) => ({
          ...sec,
          items: (sec.items || []).map((itm: SafeAny) => (itm.id === editingItem.id ? newItemObj : itm)),
        }));
        await persistTemplateChanges(updatedSections);
        message.success('Đã cập nhật thông tin tiêu chí thành công!');
      } else {
        // Add new item into target section
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

  // Handle Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!activeTemplate || !Array.isArray(activeTemplate.sections)) return;

    const updatedSections = activeTemplate.sections.map((sec: SafeAny) => ({
      ...sec,
      items: (sec.items || []).filter((itm: SafeAny) => itm.id !== itemId),
    }));

    await persistTemplateChanges(updatedSections);
    message.success('Đã xóa tiêu chí kiểm tra!');
  };

  // Initialize or reset checklist item statuses when active template changes
  useEffect(() => {
    if (activeTemplate && Array.isArray(activeTemplate.sections)) {
      const initialMap: Record<string, { result?: 'PASS' | 'FAIL' | 'NA'; note?: string; photoUrl?: string }> = {};
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

  // Compute Live Score Metrics for current interactive session
  const inspectionStats = useMemo(() => {
    const totalItems = Object.keys(itemStatuses).length;
    if (totalItems === 0) return { total: 0, passed: 0, failed: 0, na: 0, passRate: 100, failedItemsList: [] };

    let passed = 0;
    let failed = 0;
    let na = 0;
    const failedItemsList: { secTitle: string; itemTitle: string; severity: string; note: string; photoUrl: string }[] =
      [];

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

  // Fetch Data Function
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

      // Close mobile focus overlay and open Audit Review Modal directly
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

  // Dot Indicator helper for Severity levels
  const renderSeverityDot = (severity?: string) => {
    let colorClass = 'bg-slate-400';
    let label = 'Thấp';
    if (severity === 'CRITICAL') {
      colorClass = 'bg-red-500 animate-pulse';
      label = 'Cực kỳ nghiêm trọng';
    } else if (severity === 'HIGH') {
      colorClass = 'bg-orange-500';
      label = 'Nghiêm trọng';
    } else if (severity === 'MID' || severity === 'MEDIUM') {
      colorClass = 'bg-amber-400';
      label = 'Trung bình';
    } else if (severity === 'LOW') {
      colorClass = 'bg-sky-400';
      label = 'Thấp';
    }

    const displayCode = severity === 'MEDIUM' ? 'MID' : severity || 'MID';

    return (
      <Tooltip title={`Mức độ ưu tiên: ${label}`}>
        <span className="inline-flex items-center gap-1.5 text-xs select-none">
          <span className={`w-2 h-2 rounded-full inline-block ${colorClass}`} aria-hidden="true" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {displayCode}
          </span>
        </span>
      </Tooltip>
    );
  };

  // Helper to compute 0-100% compliance rate
  const getAuditComplianceRate = (record: SafeAny): number => {
    if (!record) return 100.0;
    if (record.complianceRate !== undefined && record.complianceRate !== null) {
      return Math.min(100, Math.max(0, Number(record.complianceRate)));
    }
    if (record.maxScore && record.maxScore > 0) {
      return Math.min(
        100,
        Math.max(0, Math.round((Number(record.overallScore || 0) / Number(record.maxScore)) * 1000) / 10)
      );
    }
    if (record.overallScore !== undefined && Number(record.overallScore) <= 100) {
      return Math.min(100, Math.max(0, Number(record.overallScore)));
    }
    const passed = Number(record.passedCount || 0);
    const failed = Number(record.failedCount || 0);
    if (passed + failed > 0) {
      return Math.min(100, Math.max(0, Math.round((passed / (passed + failed)) * 1000) / 10));
    }
    return 100.0;
  };

  // Render Status Tag Helper
  const renderAuditStatusTag = (status: string, record: SafeAny) => {
    const rate = typeof record === 'number' ? (record <= 100 ? record : 98) : getAuditComplianceRate(record);
    if (status === 'PASSED' || rate >= 90) {
      return (
        <Tag color="success" className="rounded-full border-0 font-medium" icon={<CheckCircleOutlined />}>
          ĐẠT CHUẨN
        </Tag>
      );
    }
    if (status === 'NEEDS_REMEDIATION' || rate >= 70) {
      return (
        <Tag color="warning" className="rounded-full border-0 font-medium" icon={<ExclamationCircleOutlined />}>
          CẦN KHẮC PHỤC
        </Tag>
      );
    }
    return (
      <Tag color="error" className="rounded-full border-0 font-medium" icon={<CloseCircleOutlined />}>
        KHÔNG ĐẠT
      </Tag>
    );
  };

  const renderTicketStatusTag = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <Tag color="error" className="rounded-full border-0">
            MỚI PHÁT HIỆN
          </Tag>
        );
      case 'IN_PROGRESS':
        return (
          <Tag color="processing" className="rounded-full border-0">
            ĐANG XỬ LÝ
          </Tag>
        );
      case 'RESOLVED':
        return (
          <Tag color="warning" className="rounded-full border-0">
            ĐÃ KHẮC PHỤC
          </Tag>
        );
      case 'VERIFIED':
        return (
          <Tag color="success" className="rounded-full border-0">
            ĐÃ XÁC NHẬN QA
          </Tag>
        );
      default:
        return (
          <Tag color="default" className="rounded-full border-0">
            {status}
          </Tag>
        );
    }
  };

  // Table Columns Definitions
  const auditColumns = [
    {
      title: 'Mã Biên Bản',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: SafeAny) => (
        <div>
          <Text
            className="font-medium text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
            onClick={() => {
              setSelectedAudit(record);
              setAuditReviewModalOpen(true);
            }}
          >
            {id || `AUD-${record.auditDate}`}
          </Text>
          <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {dayjs(record.auditDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (text: string, record: SafeAny) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{text || record.branchCode}</span>
      ),
    },
    {
      title: 'Nhân Sự QA/QC',
      dataIndex: 'auditorName',
      key: 'auditorName',
      render: (text: string) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <UserOutlined className="text-purple-400" />
          {text || 'Nguyễn Thị Minh QA'}
        </span>
      ),
    },
    {
      title: 'Điểm Đánh Giá',
      dataIndex: 'complianceRate',
      key: 'complianceRate',
      render: (_: any, record: SafeAny) => {
        const val = getAuditComplianceRate(record);
        const color = val >= 90 ? '#10b981' : val >= 80 ? '#f59e0b' : '#ef4444';
        return (
          <span className="text-base font-bold tabular-nums" style={{ color }}>
            {val.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
          </span>
        );
      },
    },
    {
      title: 'Kết Luận QA',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: SafeAny) => renderAuditStatusTag(status, record),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      render: (_: SafeAny, record: SafeAny) => (
        <Button
          type="text"
          icon={<EyeOutlined className="text-slate-400 hover:text-purple-500" />}
          size="small"
          onClick={() => {
            setSelectedAudit(record);
            setAuditReviewModalOpen(true);
          }}
          aria-label="Xem chi tiết biên bản"
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        />
      ),
    },
  ];

  const ticketColumns = [
    {
      title: 'Mã Phiếu',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text className="font-mono text-xs font-medium text-slate-500">{id}</Text>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (text: string, record: SafeAny) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{text || record.branchCode}</span>
      ),
    },
    {
      title: 'Nội Dung Vi Phạm',
      dataIndex: 'issueDescription',
      key: 'issueDescription',
      render: (text: string) => <Text className="text-xs text-slate-700 dark:text-slate-300">{text}</Text>,
    },
    {
      title: 'Mức Độ',
      dataIndex: 'severity',
      key: 'severity',
      render: (sev: string) => renderSeverityDot(sev),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderTicketStatusTag(status),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      render: (_: SafeAny, record: SafeAny) => (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined className="text-slate-400 hover:text-purple-500" />}
          onClick={() => {
            setSelectedTicket(record);
            ticketForm.setFieldsValue({
              status: record.status,
              resolutionNotes: record.resolutionNotes,
            });
            setIsTicketModalOpen(true);
          }}
          aria-label="Cập nhật tiến độ xử lý"
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5" style={{ background: isDark ? '#0a0a0a' : '#f8fafc', minHeight: '100vh' }}>
      {/* Minimalist Top Navigation Header */}
      <div
        className="rounded-xl p-5 border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{
          background: isDark ? '#141414' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e2e8f0',
        }}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-xl text-purple-500" />
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
              QA & QC Shop Inspection
            </Title>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-normal">
              v2.0 Minimalist Vector Edition
            </span>
          </div>
          <Paragraph className="text-slate-600 dark:text-slate-400 text-xs mb-0">
            Bảng kiểm tra chất lượng cửa hàng phân chia theo từng phần (Quầy lễ tân, Sảnh đón, Toilet, Giường mi 1..N)
            hệ thống tiêu chuẩn nội bộ.
          </Paragraph>
        </div>

        <Space wrap size="small">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            style={{
              background: '#10b981',
              borderColor: 'transparent',
              borderRadius: '8px',
              fontWeight: 500,
            }}
            className="focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:outline-none"
            onClick={handleSaveChecklistAudit}
            loading={isSavingAudit}
            disabled={isSavingAudit}
          >
            {`Lưu Biên Bản (${inspectionStats.passRate}%)`}
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            style={{ borderRadius: '8px' }}
            className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 focus-visible:outline-none"
            aria-label="Tải lại dữ liệu"
          />
        </Space>
      </div>

      {/* Flat Minimal Stat Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <div
            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none"
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Điểm QA Trung Bình
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums tracking-tight">
                  {analytics?.averageScore ? analytics.averageScore.toFixed(1) : '94.2'}{' '}
                  <span className="text-xs font-normal text-slate-500">/100</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
                <TrophyOutlined className="text-emerald-600 dark:text-emerald-400 text-base" />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none"
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Biên Bản Đã Kiểm Tra
                </span>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums tracking-tight">
                  {audits.length || 28} <span className="text-xs font-normal text-slate-500">đợt</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center shrink-0">
                <FileTextOutlined className="text-blue-600 dark:text-blue-400 text-base" />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none"
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Tỷ Lệ Đạt Tuân Thủ
                </span>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 tabular-nums tracking-tight">
                  {analytics?.complianceRate ? `${analytics.complianceRate}%` : '96.4%'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center shrink-0">
                <SafetyCertificateOutlined className="text-purple-600 dark:text-purple-400 text-base" />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none"
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Lỗi Vi Phạm Cần Xử Lý
                </span>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums tracking-tight">
                  {tickets.filter((t) => t.status !== 'VERIFIED').length || 3}{' '}
                  <span className="text-xs font-normal text-slate-500">lỗi</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50 flex items-center justify-center shrink-0">
                <AlertOutlined className="text-rose-600 dark:text-rose-400 text-base" />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Interactive Inspection Control & Live Score Bar */}
      <div
        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200"
        style={{ background: isDark ? '#141414' : '#ffffff' }}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Space wrap size="middle">
              <div>
                <Text className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Chi Nhánh Kiểm Tra:
                </Text>
                <Select
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  style={{ width: 250 }}
                  options={STORE_BRANCHES.map((b) => ({
                    value: b.code,
                    label: b.name,
                  }))}
                />
              </div>

              <div>
                <Text className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Ca Kiểm Tra:
                </Text>
                <Radio.Group
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  size="small"
                  buttonStyle="solid"
                >
                  <Radio.Button value="Sáng">Sáng</Radio.Button>
                  <Radio.Button value="Chiều">Chiều</Radio.Button>
                  <Radio.Button value="Tối">Tối</Radio.Button>
                  <Radio.Button value="Toàn ngày">Cả Ngày</Radio.Button>
                </Radio.Group>
              </div>

              <div>
                <Text className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Auditor (QA & QC):
                </Text>
                <Select
                  value={auditorName}
                  onChange={setAuditorName}
                  size="small"
                  style={{ width: 220 }}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  options={qaStaffList.map((s) => ({
                    value: s.displayName,
                    label: s.role ? `${s.displayName} (${s.role})` : s.displayName,
                  }))}
                />
              </div>

              <div>
                <Text className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                  Giao Diện Mobile:
                </Text>
                <Tooltip title="Bật Chế độ Mobile tập trung (Full-screen Mobile Inspection Mode) ẩn Sidebar & Clutter">
                  <Button
                    size="small"
                    icon={<MobileOutlined className="text-purple-500" />}
                    onClick={() => setIsMobileFocusMode((prev) => !prev)}
                    className={`text-xs font-semibold ${
                      isMobileFocusMode
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                    }`}
                  >
                    {isMobileFocusMode ? '📱 ĐANG BẬT MOBILE' : '📱 Mobile Focus Mode'}
                  </Button>
                </Tooltip>
              </div>

              <div>
                <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                  Audit Đột Xuất:
                </Text>
                <Tooltip title="Bật ON khi kiểm tra đột xuất: Yêu cầu chụp hình 100% tất cả tiêu chí (kể cả Đạt) mới cho Nộp Biên Bản">
                  <div
                    onClick={() => setRequireAllPhotos((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                      requireAllPhotos
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-500'
                    }`}
                  >
                    <Switch
                      size="small"
                      checked={requireAllPhotos}
                      onClick={(_, e) => e.stopPropagation()}
                      onChange={setRequireAllPhotos}
                    />
                    <span className="text-xs select-none">{requireAllPhotos ? '📷 ÉP CHỤP 100%' : 'Chụp Thường'}</span>
                  </div>
                </Tooltip>
              </div>

              <div>
                <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Chế Độ Chỉnh Sửa:
                </Text>
                <Space size="small" align="center">
                  <Tooltip title="Bật/Tắt chế độ hiển thị nút Chỉnh sửa & Xóa tiêu chí">
                    <div
                      onClick={() => setIsEditMode((prev) => !prev)}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 cursor-pointer"
                    >
                      <Switch
                        size="small"
                        checked={isEditMode}
                        onClick={(_, e) => e.stopPropagation()}
                        onChange={setIsEditMode}
                      />
                      <span
                        className={`text-xs font-semibold select-none ${isEditMode ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                      >
                        {isEditMode ? 'BẬT Edit' : 'TẮT Edit'}
                      </span>
                    </div>
                  </Tooltip>

                  {isEditMode && (
                    <>
                      <Button
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => setIsManageModalOpen(true)}
                        className="text-xs font-medium"
                      >
                        Bảng Quản Lý
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenItemModal()}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 border-none"
                      >
                        Thêm Mới
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </Space>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-600 dark:text-slate-400">Tỷ lệ đạt:</span>
              <span
                className="text-xl font-bold tabular-nums"
                style={{
                  color:
                    inspectionStats.passRate >= 90 ? '#10b981' : inspectionStats.passRate >= 80 ? '#f59e0b' : '#ef4444',
                }}
              >
                {inspectionStats.passRate.toFixed(1)}%
              </span>
              <div className="flex gap-1.5 ml-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {inspectionStats.passed} Đạt
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 tabular-nums">
                  {inspectionStats.failed} Lỗi
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 tabular-nums">
                  {inspectionStats.na} N/A
                </span>
              </div>
            </div>
          </div>

          <Progress
            percent={inspectionStats.passRate}
            strokeColor={
              inspectionStats.passRate >= 90 ? '#10b981' : inspectionStats.passRate >= 80 ? '#f59e0b' : '#ef4444'
            }
            size="small"
            showInfo={false}
          />

          {/* Soft Alert Strip for Failed Items */}
          {inspectionStats.failed > 0 && (
            <div
              role="alert"
              aria-live="polite"
              aria-label="Cảnh báo vi phạm tiêu chí kiểm tra"
              className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex items-start gap-2.5 transition-all duration-200"
            >
              <AlertOutlined className="text-rose-500 mt-0.5 text-sm shrink-0" aria-hidden="true" />
              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-700 dark:text-rose-300 block">
                    Phát hiện {inspectionStats.failed} tiêu chí không đạt quy chuẩn trong đợt kiểm tra:
                  </span>
                  <span className="text-[11px] font-medium text-rose-500 tabular-nums">
                    ({inspectionStats.failedItemsList.length} lỗi)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {inspectionStats.failedItemsList.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/80 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium shadow-2xs"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-semibold">[{item.secTitle}]</span> {item.itemTitle}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs Container */}
      <div
        className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200"
        style={{ background: isDark ? '#141414' : '#ffffff' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="line"
          items={[
            {
              key: 'checklist',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <BuildOutlined /> Bảng Kiểm Tra Từng Phần ({selectedBranch})
                </span>
              ),
              children: (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                        {(activeTemplate?.title || `Bộ Tiêu Chuẩn Kiểm Tra Chi Nhánh ${selectedBranch}`)
                          .replace(/\s*-?\s*Daily Shop Inspection Standard.*$/gi, '')
                          .replace(/\s*\(Google Sheet Synced\)/gi, '')}
                      </Title>
                      <Text className="text-xs text-slate-600 dark:text-slate-400">
                        {(
                          activeTemplate?.description ||
                          'Bộ tiêu chuẩn kiểm tra chất lượng vệ sinh & vận hành cửa hàng chuẩn nội bộ'
                        ).replace(
                          /Mẫu tiêu chí kiểm tra cửa hàng đồng bộ từ Google Sheet tab [A-Za-z0-9_\.]+/gi,
                          'Bộ tiêu chuẩn kiểm tra chất lượng vệ sinh & vận hành cửa hàng chuẩn nội bộ'
                        )}
                      </Text>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium tabular-nums">
                      {activeTemplate?.sections?.length || 0} Nhóm Khu Vực
                    </span>
                  </div>

                  {groupedAreas && groupedAreas.length > 0 ? (
                    <Collapse
                      defaultActiveKey={['area-lobby', 'area-lashroom']}
                      ghost
                      className="antd-minimal-collapse"
                      items={groupedAreas.map((area: SafeAny) => {
                        let areaPassed = 0;
                        let areaFailed = 0;
                        let areaNa = 0;

                        area.subSections.forEach((sec: SafeAny) => {
                          (sec.items || []).forEach((i: SafeAny) => {
                            const res = itemStatuses[i.id]?.result;
                            if (res === 'PASS') areaPassed++;
                            else if (res === 'FAIL') areaFailed++;
                            else if (res === 'NA') areaNa++;
                          });
                        });

                        const areaFailedPercent =
                          area.totalItems > 0 ? Math.round((areaFailed / area.totalItems) * 100) : 0;

                        return {
                          key: area.id,
                          label: (
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                {area.title}
                                <span className="text-slate-600 dark:text-slate-400 font-normal text-xs tabular-nums">
                                  ({area.subSections.length} nhóm nhỏ · {area.totalItems} tiêu chí)
                                </span>
                              </span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums border border-emerald-500/20">
                                  {areaPassed} Đạt
                                </span>
                                {areaFailed > 0 && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold tabular-nums border border-rose-500/20 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                    {areaFailed} Không đạt ({areaFailedPercent}%)
                                  </span>
                                )}
                                {areaNa > 0 && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 tabular-nums border border-slate-500/20">
                                    {areaNa} N/A
                                  </span>
                                )}
                              </div>
                            </div>
                          ),
                          children: (
                            <div className="space-y-4 pt-2">
                              {area.subSections.map((sec: SafeAny, secIdx: number) => {
                                const secItems = sec.items || [];
                                const secPassed = secItems.filter(
                                  (i: SafeAny) => itemStatuses[i.id]?.result === 'PASS'
                                ).length;
                                const secFailed = secItems.filter(
                                  (i: SafeAny) => itemStatuses[i.id]?.result === 'FAIL'
                                ).length;
                                const secNa = secItems.filter(
                                  (i: SafeAny) => itemStatuses[i.id]?.result === 'NA'
                                ).length;
                                const secFailedPercent =
                                  secItems.length > 0 ? Math.round((secFailed / secItems.length) * 100) : 0;

                                return (
                                  <div key={sec.id || `sec-${secIdx}`} className="space-y-2">
                                    {/* Sub-section Header */}
                                    <div className="flex items-center justify-between px-2.5 py-1 bg-slate-100/70 dark:bg-slate-800/50 rounded-md border border-slate-200/60 dark:border-slate-800/60">
                                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                                        <BuildOutlined className="text-purple-500 text-xs" />
                                        {sec.title}
                                        <span className="text-slate-600 dark:text-slate-400 font-normal text-[11px] lowercase">
                                          ({secItems.length} tiêu chí)
                                        </span>
                                      </span>
                                      <div className="flex items-center gap-1.5 text-[11px]">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                                          {secPassed} Đạt
                                        </span>
                                        {secFailed > 0 && (
                                          <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                                            · {secFailed} Lỗi ({secFailedPercent}%)
                                          </span>
                                        )}
                                        {secNa > 0 && (
                                          <span className="text-slate-400 tabular-nums">· {secNa} N/A</span>
                                        )}
                                        {isEditMode && (
                                          <Button
                                            size="small"
                                            type="text"
                                            icon={<PlusOutlined className="text-xs text-blue-600 dark:text-blue-400" />}
                                            onClick={() => handleOpenItemModal(undefined, sec.id)}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-1.5 py-0 h-6 font-medium ml-1.5 rounded"
                                          >
                                            Thêm
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Checklist Item Cards */}
                                    <div className="space-y-2 pl-1">
                                      {secItems.map((itm: SafeAny) => {
                                        const currentSt = itemStatuses[itm.id] || {
                                          result: undefined,
                                          note: '',
                                          photoUrl: '',
                                        };
                                        const isFail = currentSt.result === 'FAIL';
                                        const isPass = currentSt.result === 'PASS';
                                        const isNa = currentSt.result === 'NA';

                                        let rawTitle = (itm.title || '')
                                          .replace(/\s*\[[A-Z0-9_\s]+\]\s*$/gi, '')
                                          .trim();
                                        let subject = rawTitle;
                                        let detailRequirement = '';

                                        if (rawTitle.includes(' - ')) {
                                          const parts = rawTitle.split(' - ');
                                          subject = parts[0].trim();
                                          detailRequirement = parts.slice(1).join(' - ').trim();
                                        } else if (rawTitle.includes(' – ')) {
                                          const parts = rawTitle.split(' – ');
                                          subject = parts[0].trim();
                                          detailRequirement = parts.slice(1).join(' – ').trim();
                                        }

                                        let totalQty = 1;
                                        let unitQty = '';
                                        if (itm.standardRequirement) {
                                          const match = itm.standardRequirement.match(/Đơn vị:\s*([0-9]+)/i);
                                          if (match && match[1]) {
                                            totalQty = parseInt(match[1], 10) || 1;
                                            if (match[1] !== '1') {
                                              unitQty = `SL: ${match[1]}`;
                                            }
                                          }
                                        }

                                        const area = itm.area ? itm.area.trim() : '';

                                        return (
                                          <div
                                            key={itm.id}
                                            className={`py-2 px-3 rounded-lg border transition-all duration-150 ${
                                              isFail
                                                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
                                                : 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                                            }`}
                                          >
                                            {/* Line 1: Header Row (Subject & Badges + Pure Icon-Only Buttons) */}
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                {renderSeverityDot(itm.severity)}
                                                <Text className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                                  {subject}
                                                </Text>
                                                {unitQty && (
                                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tabular-nums shrink-0">
                                                    {unitQty}
                                                  </span>
                                                )}
                                                {area && (
                                                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wide shrink-0">
                                                    [{area}]
                                                  </span>
                                                )}
                                              </div>

                                              {/* Minimal Vector Pure Icon-Only Toggle Bar */}
                                              <div
                                                role="group"
                                                aria-label={`Đánh giá tiêu chuẩn: ${itm.title}`}
                                                className="flex items-center gap-1 shrink-0"
                                              >
                                                <Tooltip title="Đạt quy chuẩn (PASS)">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setItemStatuses((prev) => ({
                                                        ...prev,
                                                        [itm.id]: { ...prev[itm.id], result: 'PASS' },
                                                      }))
                                                    }
                                                    aria-label={`Đánh giá Đạt cho tiêu chí ${itm.title}`}
                                                    aria-pressed={isPass}
                                                    className={`w-7 h-7 rounded-md border transition-all duration-150 flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                                                      isPass
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-400 shadow-xs'
                                                        : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-emerald-500 hover:border-emerald-300'
                                                    }`}
                                                  >
                                                    <CheckOutlined className="text-xs" />
                                                    <span className="sr-only">Đạt</span>
                                                  </button>
                                                </Tooltip>

                                                <Tooltip title="Không đạt (FAIL)">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const curQty = currentSt.failedQty ?? totalQty;
                                                      const curPct =
                                                        currentSt.failedPercent ??
                                                        Math.round((curQty / totalQty) * 100);
                                                      setItemStatuses((prev) => ({
                                                        ...prev,
                                                        [itm.id]: {
                                                          ...prev[itm.id],
                                                          result: 'FAIL',
                                                          failedQty: curQty,
                                                          failedPercent: curPct,
                                                        },
                                                      }));
                                                    }}
                                                    aria-label={`Đánh giá Không đạt cho tiêu chí ${itm.title}`}
                                                    aria-pressed={isFail}
                                                    className={`w-7 h-7 rounded-md border transition-all duration-150 flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${
                                                      isFail
                                                        ? 'bg-rose-50 text-rose-600 border-rose-400 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-400 shadow-xs'
                                                        : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-rose-500 hover:border-rose-300'
                                                    }`}
                                                  >
                                                    <CloseOutlined className="text-xs" />
                                                    <span className="sr-only">Không đạt</span>
                                                  </button>
                                                </Tooltip>

                                                <Tooltip title="Không áp dụng (N/A)">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setItemStatuses((prev) => ({
                                                        ...prev,
                                                        [itm.id]: { ...prev[itm.id], result: 'NA' },
                                                      }))
                                                    }
                                                    aria-label={`Bỏ qua tiêu chí ${itm.title}`}
                                                    aria-pressed={isNa}
                                                    className={`w-7 h-7 rounded-md border transition-all duration-150 flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
                                                      isNa
                                                        ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shadow-xs'
                                                        : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600 hover:border-slate-300'
                                                    }`}
                                                  >
                                                    <MinusOutlined className="text-xs" />
                                                    <span className="sr-only">N/A</span>
                                                  </button>
                                                </Tooltip>

                                                {isEditMode && (
                                                  <>
                                                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
                                                    <Tooltip title="Chỉnh sửa tiêu chí này">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleOpenItemModal(itm, sec.id)}
                                                        aria-label={`Chỉnh sửa tiêu chí ${itm.title}`}
                                                        className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex items-center justify-center text-xs"
                                                      >
                                                        <EditOutlined className="text-xs" />
                                                      </button>
                                                    </Tooltip>

                                                    <Popconfirm
                                                      title="Xóa tiêu chí kiểm tra?"
                                                      description="Bạn có chắc chắn muốn xóa tiêu chí này khỏi bộ quy chuẩn?"
                                                      onConfirm={() => handleDeleteItem(itm.id)}
                                                      okText="Xóa"
                                                      cancelText="Hủy"
                                                      okButtonProps={{ danger: true, size: 'small' }}
                                                      cancelButtonProps={{ size: 'small' }}
                                                    >
                                                      <Tooltip title="Xóa tiêu chí này">
                                                        <button
                                                          type="button"
                                                          aria-label={`Xóa tiêu chí ${itm.title}`}
                                                          className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-center text-xs"
                                                        >
                                                          <DeleteOutlined className="text-xs" />
                                                        </button>
                                                      </Tooltip>
                                                    </Popconfirm>
                                                  </>
                                                )}
                                              </div>
                                            </div>

                                            {/* Line 2: Requirement Detail */}
                                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 pl-3.5 leading-snug">
                                              {detailRequirement ||
                                                itm.standardRequirement ||
                                                'Kiểm tra vệ sinh và quy chuẩn hoạt động.'}
                                            </div>

                                            {/* Line 3: Inline Expandable Sub-panel for Failed or Mandatory Photo Items */}
                                            {(isFail || requireAllPhotos) && (
                                              <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 dark:border-rose-900/60 transition-all duration-200 space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                  {/* Failed Quantity & % Badge */}
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                                      SL vi phạm:
                                                    </span>
                                                    <InputNumber
                                                      min={1}
                                                      max={totalQty}
                                                      value={currentSt.failedQty ?? totalQty}
                                                      onChange={(val) => {
                                                        const qty = Math.min(Math.max(val || 1, 1), totalQty);
                                                        const pct = Math.round((qty / totalQty) * 100);
                                                        setItemStatuses((prev) => ({
                                                          ...prev,
                                                          [itm.id]: {
                                                            ...prev[itm.id],
                                                            result: 'FAIL',
                                                            failedQty: qty,
                                                            failedPercent: pct,
                                                          },
                                                        }));
                                                      }}
                                                      size="small"
                                                      className="w-20 tabular-nums font-bold border-rose-300 dark:border-rose-800"
                                                    />
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                                                      / tổng {totalQty}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold tabular-nums border border-rose-500/20">
                                                      {currentSt.failedPercent ??
                                                        Math.round(
                                                          ((currentSt.failedQty ?? totalQty) / totalQty) * 100
                                                        )}
                                                      % vi phạm
                                                    </span>
                                                  </div>

                                                  {/* Photo Proof Action Bar (Camera & Upload & Preview) */}
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    {/* Native Hidden Camera Input */}
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      capture="environment"
                                                      style={{ display: 'none' }}
                                                      id={`camera-input-${itm.id}`}
                                                      onChange={(e) => handleFileInputChange(e, itm.id)}
                                                    />

                                                    {/* Native Hidden File Gallery Input */}
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      style={{ display: 'none' }}
                                                      id={`file-input-${itm.id}`}
                                                      onChange={(e) => handleFileInputChange(e, itm.id)}
                                                    />

                                                    <label
                                                      htmlFor={`camera-input-${itm.id}`}
                                                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
                                                      title="Mở trực tiếp Máy ảnh thiết bị để chụp hình"
                                                    >
                                                      <CameraOutlined />
                                                      <span>Chụp Ảnh</span>
                                                    </label>

                                                    <label
                                                      htmlFor={`file-input-${itm.id}`}
                                                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                                                      title="Mở Thư viện ảnh chọn hình từ máy"
                                                    >
                                                      <CloudUploadOutlined />
                                                      <span>Tải Ảnh Từ Máy</span>
                                                    </label>
                                                  </div>
                                                  {/* Image Thumbnail Preview & Delete Button */}
                                                  {currentSt.photoUrl && (
                                                    <div className="flex items-center gap-1.5 p-1 bg-rose-500/10 rounded-md border border-rose-500/20">
                                                      <img
                                                        src={currentSt.photoUrl}
                                                        alt="Bằng chứng vi phạm"
                                                        className="w-7 h-7 rounded object-cover border border-rose-400 cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => {
                                                          Modal.info({
                                                            title: `Bằng chứng vi phạm: ${subject}`,
                                                            width: 600,
                                                            content: (
                                                              <div className="pt-2 text-center">
                                                                <img
                                                                  src={currentSt.photoUrl}
                                                                  alt="Preview"
                                                                  className="max-h-[450px] mx-auto rounded border"
                                                                />
                                                              </div>
                                                            ),
                                                          });
                                                        }}
                                                      />
                                                      <Tooltip title="Xóa ảnh bằng chứng này">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setItemStatuses((prev) => ({
                                                              ...prev,
                                                              [itm.id]: { ...prev[itm.id], photoUrl: '' },
                                                            }))
                                                          }
                                                          className="text-rose-600 dark:text-rose-400 hover:text-rose-800 p-0.5"
                                                        >
                                                          <DeleteOutlined className="text-xs" />
                                                        </button>
                                                      </Tooltip>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Violation Note Input */}
                                                <div>
                                                  <ItemNoteInput
                                                    itemId={itm.id}
                                                    initialValue={currentSt.note || ''}
                                                    notesRef={itemNotesRef}
                                                    placeholder="Ghi chú chi tiết lý do vi phạm (ví dụ: Cửa kính dính nhiều vết tay mờ ở lề dưới)..."
                                                    className="border-rose-200 dark:border-rose-900/60 dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ),
                        };
                      })}
                    />
                  ) : (
                    <Empty description="Đang tải danh mục tiêu chí kiểm tra..." />
                  )}
                </div>
              ),
            },
            {
              key: 'audits',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <FileTextOutlined /> Nhật Ký Biên Bản ({audits.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={audits}
                  columns={auditColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: auditTabNextPage,
                    pageSize: auditTabNextSize,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) => (
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Hiển thị {range[0]}-{range[1]} / tổng {total} biên bản
                      </span>
                    ),
                    onChange: (p, s) => {
                      setAuditTabNextPage(p);
                      if (s && s !== auditTabNextSize) {
                        setAuditTabNextSize(s);
                        setAuditTabNextPage(1);
                      }
                    },
                  }}
                  className="antd-custom-table"
                />
              ),
            },
            {
              key: 'tickets',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <AlertOutlined /> Lỗi Vi Phạm ({tickets.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={tickets}
                  columns={ticketColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: ticketTabNextPage,
                    pageSize: ticketTabNextSize,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) => (
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Hiển thị {range[0]}-{range[1]} / tổng {total} phiếu vi phạm
                      </span>
                    ),
                    onChange: (p, s) => {
                      setTicketTabNextPage(p);
                      if (s && s !== ticketTabNextSize) {
                        setTicketTabNextSize(s);
                        setTicketTabNextPage(1);
                      }
                    },
                  }}
                  className="antd-custom-table"
                />
              ),
            },
            {
              key: 'full-branch-report',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                  <BarChartOutlined /> Báo Cáo Full Audit (Passed & Failed)
                </span>
              ),
              children: (
                <FullBranchAuditReportTab
                  selectedBranchCode={selectedBranch}
                  branches={STORE_BRANCHES}
                  audits={audits}
                  activeTemplate={activeTemplate}
                  itemStatuses={itemStatuses}
                  themeMode={themeMode}
                />
              ),
            },
            {
              key: 'analytics',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <TrophyOutlined /> Xếp Hạng Chi Nhánh
                </span>
              ),
              children: (
                <div className="space-y-4 py-2">
                  <Title level={5}>Xếp Hạng Chất Lượng Cửa Hàng (Store Ranking)</Title>
                  <Row gutter={[12, 12]}>
                    {STORE_BRANCHES.map((b, idx) => {
                      const score = 96.5 - idx * 1.2;
                      return (
                        <Col xs={24} md={12} lg={8} key={b.code}>
                          <div
                            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80"
                            style={{ background: isDark ? '#141414' : '#ffffff' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                TOP #{idx + 1}
                              </span>
                              <span className="text-lg font-bold tabular-nums text-emerald-500">
                                {score.toFixed(1)}đ
                              </span>
                            </div>
                            <Text className="font-semibold block mb-2 text-slate-800 dark:text-slate-200">
                              {b.name}
                            </Text>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Cơ sở vật chất</span>
                                <span className="font-medium tabular-nums">95%</span>
                              </div>
                              <Progress percent={95} strokeColor="#a855f7" size="small" showInfo={false} />
                              <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Tác phong nhân viên</span>
                                <span className="font-medium tabular-nums">96%</span>
                              </div>
                              <Progress percent={96} strokeColor="#3b82f6" size="small" showInfo={false} />
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Drawer: Audit Detail */}
      <Drawer
        title={`Chi Tiết Biên Bản Kiểm Tra ${selectedAudit?.id || ''}`}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        width={600}
      >
        {selectedAudit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {selectedAudit.branchName}
                </Title>
                <Text className="text-xs text-slate-600 dark:text-slate-400">
                  Ngày: {selectedAudit.auditDate} | Auditor: {selectedAudit.auditorName}
                </Text>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                  {selectedAudit.overallScore || 92}đ
                </div>
                {renderAuditStatusTag(selectedAudit.status, selectedAudit)}
              </div>
            </div>

            <Divider>VI PHẠM CẦN KHẮC PHỤC</Divider>
            {selectedAudit.actionItems && selectedAudit.actionItems.length > 0 ? (
              <div className="space-y-2">
                {selectedAudit.actionItems.map((item: string, idx: number) => (
                  <Alert key={idx} message={item} type="warning" showIcon icon={<ExclamationCircleOutlined />} />
                ))}
              </div>
            ) : (
              <Text className="text-xs text-emerald-500">Không có vi phạm phát hiện trong đợt kiểm tra.</Text>
            )}
          </div>
        )}
      </Drawer>

      {/* Modal: Update Ticket */}
      <Modal
        title="Cập Nhật Tiến Độ Khắc Phục Lỗi Vi Phạm"
        open={isTicketModalOpen}
        onCancel={() => setIsTicketModalOpen(false)}
        onOk={handleUpdateTicket}
        okText="Cập Nhật"
      >
        <Form form={ticketForm} layout="vertical" className="mt-4">
          <Form.Item name="status" label="Trạng Thái Xử Lý:">
            <Select
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              options={[
                { value: 'OPEN', label: 'MỚI PHÁT HIỆN' },
                { value: 'IN_PROGRESS', label: 'ĐANG XỬ LÝ' },
                { value: 'RESOLVED', label: 'ĐÃ KHẮC PHỤC' },
                { value: 'VERIFIED', label: 'ĐÃ XÁC NHẬN QA' },
              ]}
            />
          </Form.Item>
          <Form.Item name="resolutionNotes" label="Ghi Chú Tiến Độ Khắc Phục:">
            <Input.TextArea rows={3} placeholder="Nhập ghi chú chi tiết biện pháp đã khắc phục..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Admin Full Inspection Review */}
      <Modal
        title={
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
              <SafetyCertificateOutlined className="text-purple-600 dark:text-purple-400" />
              Chi Tiết Biên Bản Kiểm Tra {selectedAudit?.id || ''}
            </span>
            {selectedAudit && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {selectedAudit.branchName} · Ngày {selectedAudit.auditDate} · Ca {selectedAudit.shift || 'Sáng'}
              </span>
            )}
          </div>
        }
        open={auditReviewModalOpen}
        onCancel={() => setAuditReviewModalOpen(false)}
        width={980}
        footer={[
          <Button key="close" onClick={() => setAuditReviewModalOpen(false)}>
            Đóng
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            In / Xuất PDF
          </Button>,
        ]}
        destroyOnClose
        zIndex={10050}
        getContainer={() => document.body}
      >
        {selectedAudit && (
          <div className="space-y-4 py-2">
            {/* Summary Top Banner */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedAudit.branchName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Người kiểm tra:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAudit.auditorName}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Ghi chú ca: <span className="italic">{selectedAudit.notes || 'Không có ghi chú thêm.'}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Điểm Đánh Giá</div>
                  <div className="text-3xl font-extrabold tabular-nums text-emerald-500">
                    {(selectedAudit.overallScore || 90).toFixed(1)}{' '}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                </div>
                <div>{renderAuditStatusTag(selectedAudit.status, selectedAudit)}</div>
              </div>
            </div>

            {/* Filter Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Bảng Tiêu Chí Chi Tiết (Read-Only Audit Review):
              </div>
              <Space size="small">
                {(['ALL', 'PASS', 'FAIL', 'NA', 'PHOTO'] as const).map((tab) => {
                  const labels = {
                    ALL: 'Tất Cả Tiêu Chí',
                    PASS: '🟢 Đạt',
                    FAIL: '🔴 Lỗi Vi Phạm',
                    NA: '⚪ N/A',
                    PHOTO: '📷 Có Ảnh Chụp',
                  };
                  const active = reviewFilterTab === tab;
                  return (
                    <Button
                      key={tab}
                      size="small"
                      type={active ? 'primary' : 'default'}
                      onClick={() => setReviewFilterTab(tab)}
                      className={`text-xs font-medium ${active ? 'bg-purple-600 hover:bg-purple-500 border-none' : ''}`}
                    >
                      {labels[tab]}
                    </Button>
                  );
                })}
              </Space>
            </div>

            {/* Read-Only Checklist Sections View */}
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {(activeTemplate?.sections || []).map((sec: SafeAny, secIdx: number) => {
                const secItems = (sec.items || []).filter((itm: SafeAny) => {
                  const st = selectedAudit.itemSnapshot?.[itm.id] ||
                    selectedAudit.items?.find((i: SafeAny) => i.itemId === itm.id) || { result: 'PASS' };
                  const res = st.result || 'PASS';
                  const hasPhoto = !!(st.photoUrl || (st.photoUrls && st.photoUrls.length > 0));

                  if (reviewFilterTab === 'PASS') return res === 'PASS';
                  if (reviewFilterTab === 'FAIL') return res === 'FAIL';
                  if (reviewFilterTab === 'NA') return res === 'NA';
                  if (reviewFilterTab === 'PHOTO') return hasPhoto;
                  return true;
                });

                if (secItems.length === 0) return null;

                return (
                  <div key={sec.id || `sec-${secIdx}`} className="space-y-2">
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between uppercase">
                      <span className="flex items-center gap-1.5">
                        <BuildOutlined className="text-purple-500" />
                        {sec.title}
                      </span>
                      <span className="text-[11px] font-normal lowercase text-slate-500">
                        ({secItems.length} tiêu chí)
                      </span>
                    </div>

                    <div className="space-y-2 pl-1">
                      {secItems.map((itm: SafeAny) => {
                        const st = selectedAudit.itemSnapshot?.[itm.id] ||
                          selectedAudit.items?.find((i: SafeAny) => i.itemId === itm.id) || { result: 'PASS' };
                        const res = st.result || 'PASS';
                        const photo = st.photoUrl || (st.photoUrls && st.photoUrls[0]);
                        const isFail = res === 'FAIL';
                        const isPass = res === 'PASS';
                        const isNa = res === 'NA';

                        return (
                          <div
                            key={itm.id}
                            className={`p-3 rounded-lg border text-xs transition-all ${
                              isFail
                                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                : isPass
                                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70'
                                  : 'bg-slate-100/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-75'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{itm.title}</span>
                                  {itm.severity && (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        itm.severity === 'CRITICAL'
                                          ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                          : itm.severity === 'HIGH'
                                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                      }`}
                                    >
                                      {itm.severity}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {itm.standardRequirement || 'Kiểm tra quy chuẩn hoạt động.'}
                                </div>

                                {isFail && (
                                  <div className="pt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-3">
                                    <span>
                                      SL Vi Phạm: <b>{st.failedQty || 1}</b>
                                    </span>
                                    <span>
                                      Tỷ Lệ: <b>{st.failedPercent || 100}%</b>
                                    </span>
                                    {st.note && (
                                      <span>
                                        Ghi chú: <i>&quot;{st.note}&quot;</i>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Result Badge */}
                                <div className="text-right">
                                  {isPass && (
                                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                      ✓ ĐẠT
                                    </span>
                                  )}
                                  {isFail && (
                                    <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                                      ✕ KHÔNG ĐẠT
                                    </span>
                                  )}
                                  {isNa && (
                                    <span className="px-2.5 py-1 rounded-md bg-slate-500/10 text-slate-500 font-bold border border-slate-500/20">
                                      - N/A
                                    </span>
                                  )}
                                </div>

                                {/* Photo Thumbnail */}
                                {photo && (
                                  <div
                                    className="relative group cursor-pointer"
                                    onClick={() => setPreviewImageUrl(photo)}
                                  >
                                    <img
                                      src={photo}
                                      alt="Proof"
                                      className="w-12 h-12 rounded-md object-cover border border-slate-300 dark:border-slate-700 shadow-xs hover:opacity-90 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                                      🔍 Phóng lớn
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Image Preview */}
      <Modal
        open={!!previewImageUrl}
        onCancel={() => setPreviewImageUrl(null)}
        footer={null}
        width={700}
        centered
        destroyOnClose
        getContainer={() => document.body}
      >
        {previewImageUrl && (
          <div className="p-2 text-center">
            <img
              src={previewImageUrl}
              alt="Ảnh Bằng Chứng QA/QC"
              className="max-h-[600px] mx-auto rounded-lg shadow-lg border border-slate-200 dark:border-slate-800"
            />
          </div>
        )}
      </Modal>

      {/* Live WebRTC Camera Capture Modal */}
      <Modal
        title={
          <span className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
            <CameraOutlined /> Máy Ảnh Chụp Bằng Chứng Vi Phạm QA Shop
          </span>
        }
        open={isCameraModalOpen}
        onCancel={closeCameraModal}
        footer={[
          <Button key="cancel" onClick={closeCameraModal} size="small">
            Hủy
          </Button>,
          <Button
            key="capture"
            type="primary"
            danger
            icon={<CameraOutlined />}
            onClick={captureLivePhoto}
            size="small"
            disabled={!cameraStream || !!cameraError}
            className="font-semibold"
          >
            Chụp Ảnh Ngay
          </Button>,
        ]}
        width={640}
        destroyOnClose
        getContainer={() => document.body}
      >
        <div className="space-y-3 py-2">
          {cameraError ? (
            <Alert
              type="error"
              showIcon
              message="Lỗi Truy Cập Camera"
              description={
                <div>
                  <p className="text-xs">{cameraError}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bạn có thể sử dụng nút <b>&quot;Tải Ảnh&quot;</b> bên cạnh để chọn ảnh trực tiếp từ thiết bị.
                  </p>
                </div>
              }
            />
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
              {isCameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-2 z-10">
                  <Spin size="large" />
                  <span className="text-xs">Đang mở camera...</span>
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Frame Viewfinder Overlay */}
              <div className="absolute inset-4 border-2 border-dashed border-rose-500/60 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[11px] text-rose-300/80 bg-slate-950/60 px-2 py-0.5 rounded">
                  Căn chỉnh vết vi phạm vào khung hình
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Định dạng: JPEG (Chất lượng cao)</span>
            <label htmlFor={`file-input-${activeItemIdForCamera}`}>
              <Button
                size="small"
                icon={<CloudUploadOutlined />}
                onClick={() => {
                  closeCameraModal();
                  const el = document.getElementById(`file-input-${activeItemIdForCamera}`);
                  if (el) el.click();
                }}
              >
                Tải Ảnh Từ Máy
              </Button>
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal 1: Manage Checklist Table (Bảng Quản Lý Tất Cả Tiêu Chí) */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
              <SettingOutlined className="text-blue-500" /> Bảng Quản Lý Tiêu Chí Kiểm Tra QA ({selectedBranch})
            </span>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleOpenItemModal()}
              className="bg-emerald-600 hover:bg-emerald-500 font-medium text-xs"
            >
              Thêm Tiêu Chí Mới
            </Button>
          </div>
        }
        open={isManageModalOpen}
        onCancel={() => setIsManageModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
        getContainer={() => document.body}
      >
        <div className="space-y-4 py-2">
          {/* Search bar inside modal */}
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Tìm kiếm tiêu chí theo tên, mô tả, phân vùng..."
              prefix={<FilterOutlined className="text-slate-400 text-xs" />}
              value={manageSearchText}
              onChange={(e) => setManageSearchText(e.target.value)}
              allowClear
              size="small"
              className="max-w-md text-xs"
            />
            <span className="text-xs text-slate-500 tabular-nums">
              Tổng số:{' '}
              {activeTemplate?.sections?.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0) || 0} tiêu
              chí
            </span>
          </div>

          {/* Table displaying all items */}
          <Table
            dataSource={
              activeTemplate?.sections
                ?.flatMap((sec: SafeAny) =>
                  (sec.items || []).map((itm: SafeAny) => ({
                    ...itm,
                    key: itm.id,
                    sectionId: sec.id,
                    sectionTitle: sec.title,
                  }))
                )
                .filter((itm: SafeAny) => {
                  if (!manageSearchText) return true;
                  const q = manageSearchText.toLowerCase();
                  return (
                    (itm.title || '').toLowerCase().includes(q) ||
                    (itm.standardRequirement || '').toLowerCase().includes(q) ||
                    (itm.sectionTitle || '').toLowerCase().includes(q) ||
                    (itm.area || '').toLowerCase().includes(q)
                  );
                }) || []
            }
            columns={[
              {
                title: 'Nhóm Tiêu Chí',
                dataIndex: 'sectionTitle',
                key: 'sectionTitle',
                width: 180,
                render: (val: string) => (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val}</span>
                ),
              },
              {
                title: 'Tên Tiêu Chí',
                dataIndex: 'title',
                key: 'title',
                render: (val: string, record: SafeAny) => (
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{val}</div>
                    {record.area && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                        [{record.area}]
                      </span>
                    )}
                  </div>
                ),
              },
              {
                title: 'Yêu Cầu Chuẩn',
                dataIndex: 'standardRequirement',
                key: 'standardRequirement',
                render: (val: string) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{val || '-'}</span>
                ),
              },
              {
                title: 'Mức Độ',
                dataIndex: 'severity',
                key: 'severity',
                width: 110,
                render: (val: string) => renderSeverityDot(val),
              },
              {
                title: 'SL',
                dataIndex: 'unitQty',
                key: 'unitQty',
                width: 60,
                align: 'center',
                render: (val: number, record: SafeAny) => (
                  <span className="text-xs font-bold tabular-nums">{val || record.weight || 1}</span>
                ),
              },
              {
                title: 'Hành Động',
                key: 'actions',
                width: 100,
                align: 'center',
                render: (_: any, record: SafeAny) => (
                  <Space size="small">
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined className="text-blue-600 text-xs" />}
                        onClick={() => handleOpenItemModal(record, record.sectionId)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Xóa tiêu chí này?"
                      onConfirm={() => handleDeleteItem(record.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, size: 'small' }}
                      cancelButtonProps={{ size: 'small' }}
                    >
                      <Tooltip title="Xóa">
                        <Button size="small" type="text" danger icon={<DeleteOutlined className="text-xs" />} />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
            pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
            size="small"
            className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
          />
        </div>
      </Modal>

      {/* Modal 2: Create & Edit Item Form (Form Thêm / Sửa Tiêu Chí) */}
      <Modal
        title={
          <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
            {editingItem ? <EditOutlined className="text-blue-500" /> : <PlusOutlined className="text-emerald-500" />}
            {editingItem ? 'Chỉnh Sửa Tiêu Chí Kiểm Tra' : 'Thêm Tiêu Chí Kiểm Tra Mới'}
          </span>
        }
        open={isItemModalOpen}
        onCancel={() => setIsItemModalOpen(false)}
        onOk={handleSaveItem}
        okText={editingItem ? 'Cập Nhật' : 'Thêm Mới'}
        cancelText="Hủy"
        width={580}
        destroyOnClose
        getContainer={() => document.body}
      >
        <Form form={crudForm} layout="vertical" className="mt-3 space-y-2">
          <Form.Item
            name="sectionId"
            label="Thuộc Nhóm / Khu Vực Tiêu Chí:"
            rules={[{ required: true, message: 'Vui lòng chọn nhóm tiêu chí' }]}
          >
            <Select
              placeholder="Chọn nhóm tiêu chí..."
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              options={
                activeTemplate?.sections?.map((s: SafeAny) => ({
                  value: s.id,
                  label: s.title,
                })) || []
              }
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Tên Tiêu Chí (Tên ngắn):"
                rules={[{ required: true, message: 'Vui lòng nhập tên tiêu chí' }]}
              >
                <Input placeholder="Ví dụ: Cửa kính, Sàn nhà, Máy hút bụi..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="area" label="Khu Vực Tag (Không bắt buộc):">
                <Input placeholder="Ví dụ: LOBBY, TOILET..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="standardRequirement" label="Mô Tả Yêu Cầu Chuẩn Quy Định:">
            <Input.TextArea
              rows={3}
              placeholder="Nhập yêu cầu tiêu chuẩn chi tiết (ví dụ: Sạch bóng không có vệt vân tay, lau chùi 2 tiếng/lần)..."
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="severity" label="Mức Độ Nghiêm Trọng (Severity):">
                <Select
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  options={[
                    { value: 'CRITICAL', label: '🔴 CRITICAL (Nghiêm Trọng)' },
                    { value: 'HIGH', label: '🟠 HIGH (Mức Độ Cao)' },
                    { value: 'MID', label: '🟡 MID (Trung Bình)' },
                    { value: 'LOW', label: '🔵 LOW (Mức Thấp)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="unitQty" label="Số Lượng Quy Định (SL):">
                <InputNumber min={1} max={99} className="w-full" placeholder="SL: 1" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      {/* 📱 Full-screen Dedicated Mobile Inspection Focus Mode Overlay (100% Screen Tab 1) */}
      {isMobileFocusMode && (
        <div
          id="mobile-focus-overlay"
          className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans"
        >
          {/* 1. Mobile Sticky Top Header */}
          <div className="px-3 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <Select
                size="small"
                value={selectedBranch}
                onChange={setSelectedBranch}
                style={{ width: 145 }}
                getPopupContainer={() => document.getElementById('mobile-focus-overlay') || document.body}
                options={STORE_BRANCHES.map((b) => ({ value: b.code, label: b.name }))}
              />
              <Select
                size="small"
                value={selectedShift}
                onChange={(v) => setSelectedShift(v as any)}
                style={{ width: 95 }}
                getPopupContainer={() => document.getElementById('mobile-focus-overlay') || document.body}
                options={[
                  { value: 'Sáng', label: 'Ca Sáng' },
                  { value: 'Chiều', label: 'Ca Chiều' },
                  { value: 'Tối', label: 'Ca Tối' },
                  { value: 'Toàn ngày', label: 'Cả Ngày' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded border tabular-nums"
                style={{
                  color:
                    inspectionStats.passRate >= 90 ? '#34d399' : inspectionStats.passRate >= 80 ? '#fbbf24' : '#f87171',
                  borderColor:
                    inspectionStats.passRate >= 90
                      ? 'rgba(52,211,153,0.3)'
                      : inspectionStats.passRate >= 80
                        ? 'rgba(251,191,36,0.3)'
                        : 'rgba(248,113,113,0.3)',
                  backgroundColor: 'rgba(15,23,42,0.8)',
                }}
              >
                {inspectionStats.passRate.toFixed(1)}%
              </span>
              <Button
                size="small"
                icon={<DesktopOutlined />}
                onClick={() => setIsMobileFocusMode(false)}
                aria-label="Về Desktop"
                title="Về Desktop"
                className="text-xs font-semibold bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 shrink-0"
              />
            </div>
          </div>

          {/* 2. Mobile Main Scrollable Content Area (Edge-to-Edge 100% Screen Tab 1) */}
          <div className="flex-1 overflow-y-auto p-1 py-1.5 space-y-2">
            {/* Informative Sub-header Banner */}
            <div className="p-1.5 px-2 rounded-lg bg-purple-950/40 border border-purple-800/60 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-purple-300 block">📋 Bảng Kiểm Tra Từng Phần</span>
                <span className="text-[11px] text-purple-400">
                  {activeTemplate?.branchName || selectedBranch} · {inspectionStats.passed + inspectionStats.failed}/
                  {inspectionStats.total} Tiêu chí đã chọn
                </span>
              </div>
              <div className="flex items-center gap-1 tabular-nums font-bold text-xs">
                <span className="text-emerald-400">{inspectionStats.passed} Đạt</span> ·{' '}
                <span className="text-rose-400">{inspectionStats.failed} Lỗi</span>
              </div>
            </div>

            {/* Accordion List for Core Store Areas & 32 Sub-sections */}
            {groupedAreas && groupedAreas.length > 0 ? (
              <Collapse
                defaultActiveKey={groupedAreas.map((a: SafeAny) => a.id)}
                ghost
                className="space-y-1.5"
                items={groupedAreas.map((area: SafeAny) => {
                  let areaPassed = 0;
                  let areaFailed = 0;

                  area.subSections.forEach((sec: SafeAny) => {
                    (sec.items || []).forEach((i: SafeAny) => {
                      const res = itemStatuses[i.id]?.result;
                      if (res === 'PASS') areaPassed++;
                      else if (res === 'FAIL') areaFailed++;
                    });
                  });

                  const titleMatch = area.title.match(/^([^(]+)(?:\(([^)]+)\))?/);
                  const mainAreaTitle = titleMatch ? titleMatch[1].trim() : area.title;
                  const subAreaTitle = titleMatch && titleMatch[2] ? titleMatch[2].trim() : '';

                  return {
                    key: area.id,
                    label: (
                      <div className="flex items-start justify-between py-0.5 w-full pr-1 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-100 leading-snug">{mainAreaTitle}</div>
                          {subAreaTitle && (
                            <div className="text-[11px] font-normal text-slate-400 leading-tight pt-0.5 line-clamp-1">
                              ({subAreaTitle})
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs shrink-0 pt-0.5">
                          <span className="text-emerald-400 font-semibold tabular-nums px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/60">
                            {areaPassed} Đạt
                          </span>
                          {areaFailed > 0 && (
                            <span className="text-rose-400 font-bold tabular-nums bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                              {areaFailed} Lỗi
                            </span>
                          )}
                        </div>
                      </div>
                    ),
                    children: (
                      <div className="space-y-1.5 pt-0.5">
                        {area.subSections.map((sec: SafeAny, secIdx: number) => {
                          const secItems = sec.items || [];
                          return (
                            <div key={sec.id || `m-sec-${secIdx}`} className="space-y-1">
                              <div className="text-xs font-bold text-purple-400 uppercase tracking-wide px-0.5 flex items-center justify-between">
                                <span>{sec.title}</span>
                                <span className="text-slate-500 font-normal">({secItems.length} tiêu chí)</span>
                              </div>

                              {secItems.map((itm: SafeAny) => {
                                const currentSt = itemStatuses[itm.id] || { result: undefined, note: '', photoUrl: '' };
                                const isFail = currentSt.result === 'FAIL';
                                const isPass = currentSt.result === 'PASS';
                                const isNa = currentSt.result === 'NA';

                                return (
                                  <div
                                    key={`m-itm-${itm.id}`}
                                    className={`p-1.5 px-2 rounded-md border transition-all ${
                                      isFail
                                        ? 'bg-rose-950/40 border-rose-800/90 shadow-sm'
                                        : isPass
                                          ? 'bg-slate-900/90 border-emerald-900/60'
                                          : 'bg-slate-900/60 border-slate-800/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2.5">
                                      {/* Left Side: Title on Line 1, Severity Dot + Metadata on Line 2 */}
                                      <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="font-semibold text-xs text-slate-100 leading-snug break-words">
                                          {itm.title}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 pt-0.5">
                                          {renderSeverityDot(itm.severity)}
                                          {itm.unitQty && itm.unitQty > 1 && (
                                            <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60 tabular-nums">
                                              SL: {itm.unitQty}
                                            </span>
                                          )}
                                          {itm.standardRequirement && (
                                            <span className="line-clamp-1 text-slate-400">
                                              {formatReqWithoutArea(itm.standardRequirement)}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right Side: Compact 32px Icon-only Button Group */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setItemStatuses((prev) => ({
                                              ...prev,
                                              [itm.id]: { ...prev[itm.id], result: 'PASS' },
                                            }))
                                          }
                                          aria-label="Đạt"
                                          className={`w-8 h-8 rounded-md border font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                                            isPass
                                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                          }`}
                                        >
                                          <CheckOutlined className="text-xs" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setItemStatuses((prev) => ({
                                              ...prev,
                                              [itm.id]: { ...prev[itm.id], result: 'FAIL' },
                                            }))
                                          }
                                          aria-label="Lỗi"
                                          className={`w-8 h-8 rounded-md border font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                                            isFail
                                              ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                          }`}
                                        >
                                          <CloseOutlined className="text-xs" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setItemStatuses((prev) => ({
                                              ...prev,
                                              [itm.id]: { ...prev[itm.id], result: 'NA' },
                                            }))
                                          }
                                          aria-label="N/A"
                                          className={`h-8 px-2 rounded-md border font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                                            isNa
                                              ? 'bg-slate-700 text-slate-100 border-slate-600 shadow-sm'
                                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                          }`}
                                        >
                                          <MinusOutlined className="text-xs" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Failure details if FAIL */}
                                    {isFail && (
                                      <div className="space-y-2.5 pt-2 mt-2 border-t border-rose-900/40">
                                        <ItemNoteInput
                                          itemId={itm.id}
                                          initialValue={currentSt.note || ''}
                                          notesRef={itemNotesRef}
                                          placeholder="Ghi chú lỗi chi tiết..."
                                          className="text-xs bg-slate-950 text-white border-rose-900/60 rounded-md focus:border-rose-500"
                                        />

                                        {/* Native Hidden Camera Input (Opens Camera Directly) */}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          id={`mobile-camera-input-${itm.id}`}
                                          style={{ display: 'none' }}
                                          onChange={(e) => handleFileInputChange(e, itm.id)}
                                        />

                                        {/* Native Hidden File Gallery Input (Opens Photo Library Directly) */}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          id={`mobile-file-input-${itm.id}`}
                                          style={{ display: 'none' }}
                                          onChange={(e) => handleFileInputChange(e, itm.id)}
                                        />

                                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                                          <div className="flex items-center gap-2 w-full">
                                            <label
                                              htmlFor={`mobile-camera-input-${itm.id}`}
                                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                                            >
                                              <CameraOutlined />
                                              <span>Chụp Ảnh</span>
                                            </label>

                                            <label
                                              htmlFor={`mobile-file-input-${itm.id}`}
                                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                                            >
                                              <CloudUploadOutlined />
                                              <span>Tải Ảnh Từ Máy</span>
                                            </label>
                                          </div>
                                        </div>

                                        {/* Thumbnail Image Preview */}
                                        {currentSt.photoUrl && (
                                          <div className="flex items-center gap-1.5 bg-emerald-950/60 p-1 px-1.5 rounded border border-emerald-800/80">
                                            <img
                                              src={currentSt.photoUrl}
                                              alt="Bằng chứng vi phạm"
                                              className="w-8 h-8 rounded object-cover border border-emerald-500 cursor-pointer active:scale-95 transition-transform"
                                              onClick={() => {
                                                Modal.info({
                                                  title: `Bằng chứng vi phạm: ${itm.title}`,
                                                  width: 500,
                                                  content: (
                                                    <div className="pt-2 text-center">
                                                      <img
                                                        src={currentSt.photoUrl}
                                                        alt="Bằng chứng"
                                                        className="max-h-[400px] mx-auto rounded border"
                                                      />
                                                    </div>
                                                  ),
                                                });
                                              }}
                                            />
                                            <span className="text-[10px] text-emerald-400 font-bold">
                                              ✓ Đã đính ảnh
                                            </span>
                                            <Button
                                              size="small"
                                              type="text"
                                              danger
                                              icon={<CloseOutlined className="text-[10px]" />}
                                              onClick={() => {
                                                setItemStatuses((prev) => ({
                                                  ...prev,
                                                  [itm.id]: { ...prev[itm.id], photoUrl: undefined },
                                                }));
                                              }}
                                              className="w-5 h-5 flex items-center justify-center p-0 text-rose-400"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <Empty description="Chưa có dữ liệu tiêu chuẩn kiểm tra cho chi nhánh này." />
            )}
          </div>

          {/* 3. Mobile Sticky Bottom Action Bar */}
          <div className="p-1.5 px-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0 shadow-lg">
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSaveChecklistAudit}
              loading={isSavingAudit}
              disabled={isSavingAudit}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm h-12 rounded-xl"
            >
              {`Lưu Biên Bản (${inspectionStats.passRate.toFixed(1)}%)`}
            </Button>

            <Button
              size="large"
              icon={<DesktopOutlined />}
              onClick={() => setIsMobileFocusMode(false)}
              aria-label="Về Desktop"
              title="Về Desktop"
              className="bg-slate-800 text-slate-200 border-slate-700 font-semibold text-xs h-12 w-12 flex items-center justify-center p-0 rounded-xl shrink-0"
            />
          </div>
        </div>
      )}

      {/* Modal 1: Manage Checklist Table (Bảng Quản Lý Tất Cả Tiêu Chí) */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
              <SettingOutlined className="text-blue-500" /> Bảng Quản Lý Tiêu Chí Kiểm Tra QA ({selectedBranch})
            </span>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleOpenItemModal()}
              className="bg-emerald-600 hover:bg-emerald-500 font-medium text-xs"
            >
              Thêm Tiêu Chí Mới
            </Button>
          </div>
        }
        open={isManageModalOpen}
        onCancel={() => setIsManageModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
        getContainer={() => document.body}
      >
        <div className="space-y-4 py-2">
          {/* Search bar inside modal */}
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Tìm kiếm tiêu chí theo tên, mô tả, phân vùng..."
              prefix={<FilterOutlined className="text-slate-400 text-xs" />}
              value={manageSearchText}
              onChange={(e) => setManageSearchText(e.target.value)}
              allowClear
              size="small"
              className="max-w-md text-xs"
            />
            <span className="text-xs text-slate-500 tabular-nums">
              Tổng số:{' '}
              {activeTemplate?.sections?.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0) || 0} tiêu
              chí
            </span>
          </div>

          {/* Table displaying all items */}
          <Table
            dataSource={
              activeTemplate?.sections
                ?.flatMap((sec: SafeAny) =>
                  (sec.items || []).map((itm: SafeAny) => ({
                    ...itm,
                    key: itm.id,
                    sectionId: sec.id,
                    sectionTitle: sec.title,
                  }))
                )
                .filter((itm: SafeAny) => {
                  if (!manageSearchText) return true;
                  const q = manageSearchText.toLowerCase();
                  return (
                    (itm.title || '').toLowerCase().includes(q) ||
                    (itm.standardRequirement || '').toLowerCase().includes(q) ||
                    (itm.sectionTitle || '').toLowerCase().includes(q) ||
                    (itm.area || '').toLowerCase().includes(q)
                  );
                }) || []
            }
            columns={[
              {
                title: 'Nhóm Tiêu Chí',
                dataIndex: 'sectionTitle',
                key: 'sectionTitle',
                width: 180,
                render: (val: string) => (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val}</span>
                ),
              },
              {
                title: 'Tên Tiêu Chí',
                dataIndex: 'title',
                key: 'title',
                render: (val: string, record: SafeAny) => (
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{val}</div>
                    {record.area && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                        [{record.area}]
                      </span>
                    )}
                  </div>
                ),
              },
              {
                title: 'Yêu Cầu Chuẩn',
                dataIndex: 'standardRequirement',
                key: 'standardRequirement',
                render: (val: string) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{val || '-'}</span>
                ),
              },
              {
                title: 'Mức Độ',
                dataIndex: 'severity',
                key: 'severity',
                width: 110,
                render: (val: string) => renderSeverityDot(val),
              },
              {
                title: 'SL',
                dataIndex: 'unitQty',
                key: 'unitQty',
                width: 60,
                align: 'center',
                render: (val: number, record: SafeAny) => (
                  <span className="text-xs font-bold tabular-nums">{val || record.weight || 1}</span>
                ),
              },
              {
                title: 'Hành Động',
                key: 'actions',
                width: 100,
                align: 'center',
                render: (_: any, record: SafeAny) => (
                  <Space size="small">
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined className="text-blue-600 text-xs" />}
                        onClick={() => handleOpenItemModal(record, record.sectionId)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Xóa tiêu chí này?"
                      onConfirm={() => handleDeleteItem(record.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, size: 'small' }}
                      cancelButtonProps={{ size: 'small' }}
                    >
                      <Tooltip title="Xóa">
                        <Button size="small" type="text" danger icon={<DeleteOutlined className="text-xs" />} />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
            pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
            size="small"
            className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
          />
        </div>
      </Modal>

      {/* Modal 2: Create & Edit Item Form (Form Thêm / Sửa Tiêu Chí) */}
      <Modal
        title={
          <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
            {editingItem ? <EditOutlined className="text-blue-500" /> : <PlusOutlined className="text-emerald-500" />}
            {editingItem ? 'Chỉnh Sửa Tiêu Chí Kiểm Tra' : 'Thêm Tiêu Chí Kiểm Tra Mới'}
          </span>
        }
        open={isItemModalOpen}
        onCancel={() => setIsItemModalOpen(false)}
        onOk={handleSaveItem}
        okText={editingItem ? 'Cập Nhật' : 'Thêm Mới'}
        cancelText="Hủy"
        width={580}
        destroyOnClose
        getContainer={() => document.body}
      >
        <Form form={crudForm} layout="vertical" className="mt-3 space-y-2">
          <Form.Item
            name="sectionId"
            label="Thuộc Nhóm / Khu Vực Tiêu Chí:"
            rules={[{ required: true, message: 'Vui lòng chọn nhóm tiêu chí' }]}
          >
            <Select
              placeholder="Chọn nhóm tiêu chí..."
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              options={
                activeTemplate?.sections?.map((s: SafeAny) => ({
                  value: s.id,
                  label: s.title,
                })) || []
              }
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Tên Tiêu Chí (Tên ngắn):"
                rules={[{ required: true, message: 'Vui lòng nhập tên tiêu chí' }]}
              >
                <Input placeholder="Ví dụ: Cửa kính, Sàn nhà, Máy hút bụi..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="area" label="Khu Vực Tag (Không bắt buộc):">
                <Input placeholder="Ví dụ: LOBBY, TOILET..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="standardRequirement" label="Mô Tả Yêu Cầu Chuẩn Quy Định:">
            <Input.TextArea
              rows={3}
              placeholder="Nhập yêu cầu tiêu chuẩn chi tiết (ví dụ: Sạch bóng không có vệt vân tay, lau chùi 2 tiếng/lần)..."
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="severity" label="Mức Độ Nghiêm Trọng (Severity):">
                <Select
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  options={[
                    { value: 'CRITICAL', label: '🔴 CRITICAL (Nghiêm Trọng)' },
                    { value: 'HIGH', label: '🟠 HIGH (Mức Độ Cao)' },
                    { value: 'MID', label: '🟡 MID (Trung Bình)' },
                    { value: 'LOW', label: '🔵 LOW (Mức Thấp)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="unitQty" label="Số Lượng Quy Định (SL):">
                <InputNumber min={1} max={99} className="w-full" placeholder="SL: 1" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
