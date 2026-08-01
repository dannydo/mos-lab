'use client';

import '../../../../suppress-warnings';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Typography,
  Tooltip,
  message,
  Row,
  Col,
  theme,
  Checkbox,
  Drawer,
  Divider,
  Avatar,
} from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  PhoneOutlined,
  EyeOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  SettingOutlined,
  GiftOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  DollarOutlined,
  EditOutlined,
  MinusCircleOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import { useTheme } from '../../../../../context/ThemeContext';
import { apiClient } from '../../../../../lib/api-client';
import { removeVietnameseTones } from '../../../../../lib/utils/search';
import { formatVND, formatDuration } from '../../../../../lib/format-utils';
import { useOmiCall } from '../../../../../context/OmiCallContext';
import { TouchpointStatus } from '@mos-lab/shared';
import {
  Smile,
  Handshake,
  Sparkles,
  Heart,
  BedDouble,
  Calendar,
  Clock,
  Bell,
  UserPlus,
  MessageCircle,
} from 'lucide-react';
import {
  CampaignTouchpointCell,
  CampaignTouchpointItem,
} from '../../../../../components/campaign/CampaignTouchpointCell';

const KissIcon: React.FC<{ size?: number; style?: React.CSSProperties; className?: string }> = ({
  size = 16,
  style,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    className={className}
  >
    <path d="M4.5 12.5C6.5 9.5 9.5 8.5 12 11C14.5 8.5 17.5 9.5 19.5 12.5C16.5 16.5 13.5 17.5 12 14.5C10.5 17.5 7.5 16.5 4.5 12.5Z" />
    <path d="M7 11.5C9 10 11 10.5 12 11.5C13 10.5 15 10 17 11.5" />
  </svg>
);
import {
  Campaign,
  CampaignTouchpoint,
  CampaignPromotion,
  CampaignStatsResponse,
  Staff,
  Customer,
  CALL_RESULT_LABELS,
} from '@mos-lab/shared';

const getRowClassName = (record: any, themeMode: string) => {
  const hasCallback = record.callbackDate
    ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;
  if (hasCallback) {
    return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
  }

  const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
  if (isBookingInFuture) {
    const state = record.lastBookingState;
    const isBooked = state === 'New' || state === 'Confirmed';
    if (isBooked) {
      return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
    }
  }

  const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
  if (isBookingInPast) {
    const state = record.lastBookingState;
    const isMissed =
      state &&
      state !== 'Completed' &&
      state !== 'ServiceCompleted' &&
      state !== 'CheckIn' &&
      state !== 'CheckOut' &&
      state !== 'ServiceStart';
    if (isMissed) {
      return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
    }
  }

  return '';
};

const CustomerDetailDrawer = dynamic(() => import('../../../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../../../components/BookingWizardDrawer'), { ssr: false });
const SMSModal = dynamic(() => import('../../../../../components/sms/SMSModal').then((m) => m.SMSModal), {
  ssr: false,
});

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall, callState } = useOmiCall();

  // Core state
  const [loading, setLoading] = useState<boolean>(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [touchpoints, setTouchpoints] = useState<CampaignTouchpoint[]>([]);
  const [promotions, setPromotions] = useState<CampaignPromotion[]>([]);
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);

  // Customer table state
  const [customersLoading, setCustomersLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedTouchpointKey, setSelectedTouchpointKey] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookerId, setSelectedBookerId] = useState<string>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Random Selector Modal State
  const [randomModalVisible, setRandomModalVisible] = useState<boolean>(false);
  const [randomCount, setRandomCount] = useState<number | ''>(20);
  const [randomLoading, setRandomLoading] = useState<boolean>(false);
  const [excludeAssigned, setExcludeAssigned] = useState<boolean>(true);
  const [excludeUnconfirmedAllocation, setExcludeUnconfirmedAllocation] = useState<boolean>(true);
  const [excludeFutureBooking, setExcludeFutureBooking] = useState<boolean>(true);
  const [showSelectedOnly, setShowSelectedOnly] = useState<boolean>(false);

  // Controlled & Persistent Pagination State (AGENTS.md Rule 24)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_campaign_pageSize');
      if (saved) {
        const val = parseInt(saved, 10);
        if ([10, 20, 50, 100].includes(val)) return val;
      }
    }
    return 10;
  });

  // Restore saved page on slug change
  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      const savedPage = localStorage.getItem(`mos_campaign_page_${slug}`);
      if (savedPage) {
        const pVal = parseInt(savedPage, 10);
        if (!isNaN(pVal) && pVal > 0) {
          setCurrentPage(pVal);
        }
      }
    }
  }, [slug]);

  // Reset to page 1 on search/filter changes
  useEffect(() => {
    setCurrentPage(1);
    if (typeof window !== 'undefined' && slug) {
      localStorage.setItem(`mos_campaign_page_${slug}`, '1');
    }
  }, [selectedTouchpointKey, searchQuery, selectedBookerId, slug]);

  // User & Staff state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Drawers & Modals
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState<boolean>(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState<boolean>(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any | null>(null);
  const [smsModalVisible, setSmsModalVisible] = useState<boolean>(false);

  // Add Customers Drawer
  const [addCustomerDrawerVisible, setAddCustomerDrawerVisible] = useState<boolean>(false);
  const [nycCandidateCustomers, setNycCandidateCustomers] = useState<any[]>([]);
  const [nycCandidatesLoading, setNycCandidatesLoading] = useState<boolean>(false);
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<React.Key[]>([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState<string>('');

  // Batch Allocation Modal
  const [batchAllocationModalVisible, setBatchAllocationModalVisible] = useState<boolean>(false);
  const [targetBookerId, setTargetBookerId] = useState<number | undefined>(undefined);
  const [allocating, setAllocating] = useState<boolean>(false);

  // Edit Campaign Modal state
  const [editCampaignModalVisible, setEditCampaignModalVisible] = useState<boolean>(false);
  const [editForm] = Form.useForm();
  const [editingSubmitting, setEditingSubmitting] = useState<boolean>(false);

  const handleOpenEditModal = () => {
    if (!campaign) return;
    editForm.setFieldsValue({
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description || '',
      dates: campaign.startDate && campaign.endDate ? [dayjs(campaign.startDate), dayjs(campaign.endDate)] : null,
      status: campaign.status || 'ACTIVE',
      touchpoints: touchpoints.map((t) => ({
        label: t.label,
        key: t.key,
        daysMin: t.daysMin,
        daysMax: t.daysMax ?? undefined,
        color: t.color || '#3b82f6',
      })),
      promotions: promotions.map((p) => ({
        name: p.name,
        type: p.type,
        value: p.value,
        code: p.code || '',
      })),
    });
    setEditCampaignModalVisible(true);
  };

  const handleEditSubmit = async (values: any) => {
    if (!campaign?.id) return;
    setEditingSubmitting(true);
    try {
      const dates = values.dates;
      const startDate = dates?.[0] ? dates[0].format('YYYY-MM-DD') : undefined;
      const endDate = dates?.[1] ? dates[1].format('YYYY-MM-DD') : undefined;

      const updatedTouchpoints = (values.touchpoints || []).map((t: any, index: number) => ({
        key: t.key ? t.key.trim() : `tp_${index + 1}`,
        label: t.label ? t.label.trim() : `Chạm ${index + 1}`,
        daysMin: typeof t.daysMin === 'number' ? t.daysMin : 0,
        daysMax: typeof t.daysMax === 'number' ? t.daysMax : null,
        color: t.color || 'blue',
        sortOrder: index + 1,
      }));

      const updatedPromotions = (values.promotions || []).map((p: any) => ({
        name: p.name ? p.name.trim() : '',
        code: p.code ? p.code.trim() : undefined,
        type: p.type,
        value: typeof p.value === 'number' ? p.value : 0,
        description: p.description,
      }));

      const updateDto = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description,
        startDate,
        endDate,
        status: values.status,
        touchpoints: updatedTouchpoints,
        promotions: updatedPromotions,
      };

      const updatedCamp: any = await apiClient.campaigns.update(campaign.id, updateDto);
      message.success('Đã cập nhật chiến dịch thành công');
      setEditCampaignModalVisible(false);

      const targetSlug = updatedCamp?.slug || values.slug;
      if (targetSlug && targetSlug !== slug) {
        router.push(`/dashboard/nyc/campaigns/${targetSlug}`);
      } else {
        fetchCampaignData();
      }
    } catch (err: any) {
      console.error('Update campaign error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật chiến dịch';
      message.error(msg);
    } finally {
      setEditingSubmitting(false);
    }
  };

  // Load User & Staff
  useEffect(() => {
    const storedUser = localStorage.getItem('mos_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setCurrentUser(u);
        if (u.role !== 'admin') {
          setSelectedBookerId(String(u.id));
        }
      } catch (_) {}
    }
    apiClient.customers
      .getStaff({ role: 'telesales' })
      .then((res) => {
        setStaffList(Array.isArray(res) ? res : []);
      })
      .catch(console.error);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch Campaign Data
  const fetchCampaignData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const campRes: any = await apiClient.campaigns.getBySlug(slug);
      setCampaign(campRes);
      setTouchpoints(campRes.touchpoints || campRes.CampaignTouchpoint || []);
      setPromotions(campRes.promotions || campRes.CampaignPromotion || []);

      if (campRes.id) {
        const statsRes: any = await apiClient.campaigns.getStats(campRes.id);
        setStats(statsRes);
      }
    } catch (err) {
      console.error('Fetch campaign details error:', err);
      message.error('Không thể tải thông tin chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Fetch Campaign Customers
  const fetchCampaignCustomers = useCallback(async () => {
    if (!campaign?.id) return;
    setCustomersLoading(true);
    try {
      const params: any = { pageSize: 10000 };
      if (selectedBookerId !== 'ALL') {
        params.assignedStaffId = selectedBookerId;
      }
      const res: any = await apiClient.campaigns.getCustomers(campaign.id, params);
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      setCustomers(list);
    } catch (err) {
      console.error('Fetch campaign customers error:', err);
      message.error('Không thể tải danh sách khách hàng');
    } finally {
      setCustomersLoading(false);
    }
  }, [campaign, selectedBookerId]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  useEffect(() => {
    if (campaign?.id) {
      fetchCampaignCustomers();
    }
  }, [campaign?.id, fetchCampaignCustomers]);

  // Auto-refresh table & stats when call log, customer, booking, or call state updates
  useEffect(() => {
    const handleDataRefresh = () => {
      if (campaign?.id) {
        fetchCampaignCustomers();
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }
    };

    window.addEventListener('mos-call-log-saved', handleDataRefresh);
    window.addEventListener('mos-customer-updated', handleDataRefresh);
    window.addEventListener('mos-booking-updated', handleDataRefresh);
    window.addEventListener('mos-data-updated', handleDataRefresh);

    return () => {
      window.removeEventListener('mos-call-log-saved', handleDataRefresh);
      window.removeEventListener('mos-customer-updated', handleDataRefresh);
      window.removeEventListener('mos-booking-updated', handleDataRefresh);
      window.removeEventListener('mos-data-updated', handleDataRefresh);
    };
  }, [campaign?.id, fetchCampaignCustomers]);

  useEffect(() => {
    if ((callState === 'idle' || callState === 'wrapup') && campaign?.id) {
      const timer = setTimeout(() => {
        fetchCampaignCustomers();
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [callState, campaign?.id, fetchCampaignCustomers]);

  // Touchpoint Counts Breakdown
  const touchpointCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: customers.length };
    touchpoints.forEach((tp) => {
      counts[tp.key] = 0;
    });
    customers.forEach((c) => {
      const days = c.daysInCampaign ?? c.daysSinceAdded ?? 0;
      touchpoints.forEach((tp) => {
        const min = tp.daysMin;
        const isMatch =
          tp.daysMax !== null && tp.daysMax !== undefined ? days >= min && days <= tp.daysMax : days >= min;
        if (isMatch) {
          counts[tp.key] = (counts[tp.key] || 0) + 1;
        }
      });
    });
    return counts;
  }, [customers, touchpoints]);

  // Filter Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Show selected only filter
      if (showSelectedOnly && selectedRowKeys.length > 0) {
        const cId = c.legacyUserId || c.customerId || c.id;
        if (!selectedRowKeys.includes(cId)) return false;
      }
      // Booker filter
      if (selectedBookerId !== 'ALL') {
        const bId = Number(selectedBookerId);
        const staffId = c.assignedStaff?.id || c.assignedBooker?.id;
        if (staffId !== bId) return false;
      }
      // Touchpoint filter
      if (selectedTouchpointKey !== 'ALL') {
        const tp = touchpoints.find((t) => t.key === selectedTouchpointKey);
        if (tp) {
          const days = c.daysInCampaign ?? c.daysSinceAdded ?? 0;
          const min = tp.daysMin;
          const isMatch =
            tp.daysMax !== null && tp.daysMax !== undefined ? days >= min && days <= tp.daysMax : days >= min;
          if (!isMatch) return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const query = removeVietnameseTones(searchQuery.trim().toLowerCase());
        const nameMatch = removeVietnameseTones((c.customerName || c.name || '').toLowerCase()).includes(query);
        const phoneMatch = (c.customerPhone || c.phone || '').includes(query);
        return nameMatch || phoneMatch;
      }
      return true;
    });
  }, [customers, selectedBookerId, selectedTouchpointKey, touchpoints, searchQuery, showSelectedOnly, selectedRowKeys]);

  // Toggle Touchpoint Log
  const handleToggleTouchpoint = async (
    customerId: number,
    touchpointId: number,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null
  ) => {
    if (!campaign?.id) return;

    // Optimistically update customers state
    setCustomers((prevCustomers) =>
      prevCustomers.map((cust: any) => {
        const cId = cust.legacyUserId || cust.id;
        if (cId === customerId || cust.id === customerId) {
          const logs = cust.touchpointLogs || [];
          const existingIdx = logs.findIndex((l: any) => l.touchpointId === touchpointId);
          const staffName = currentUser?.displayName || currentUser?.username || 'Staff';
          let newLogs;
          if (existingIdx >= 0) {
            newLogs = [...logs];
            newLogs[existingIdx] = {
              ...newLogs[existingIdx],
              isChecked,
              status: status !== undefined ? status : isChecked ? 'SUCCESS' : null,
              completedAt: isChecked ? new Date().toISOString() : newLogs[existingIdx].completedAt,
              completedByStaffName: isChecked ? staffName : newLogs[existingIdx].completedByStaffName,
              note: note !== undefined ? note : newLogs[existingIdx].note,
            };
          } else {
            newLogs = [
              ...logs,
              {
                touchpointId,
                isChecked,
                status: status !== undefined ? status : isChecked ? 'SUCCESS' : null,
                completedAt: isChecked ? new Date().toISOString() : null,
                completedByStaffName: isChecked ? staffName : null,
                note: note || null,
              },
            ];
          }
          return { ...cust, touchpointLogs: newLogs };
        }
        return cust;
      })
    );

    try {
      await apiClient.campaigns.toggleTouchpointLog(campaign.id, customerId, touchpointId, { isChecked, status, note });
      message.success(isChecked ? 'Đã cập nhật trạng thái điểm chạm' : 'Đã bỏ chọn điểm chạm');
      if (campaign.id) {
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }
    } catch (err) {
      console.error('Toggle touchpoint log error:', err);
      message.error('Không thể cập nhật trạng thái điểm chạm');
      fetchCampaignCustomers();
    }
  };

  // Remove Customer from Campaign
  const handleRemoveCustomer = (customerId: number, customerName: string) => {
    if (!campaign?.id) return;
    Modal.confirm({
      title: 'Xóa khỏi chiến dịch',
      content: `Bạn có chắc chắn muốn xóa khách hàng "${customerName}" khỏi chiến dịch này?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await apiClient.campaigns.removeCustomer(campaign.id, customerId);
          message.success('Đã xóa khách hàng khỏi chiến dịch');
          fetchCampaignCustomers();
        } catch (err) {
          console.error('Remove customer error:', err);
          message.error('Không thể xóa khách hàng');
        }
      },
    });
  };

  // Handle Random Customer Selection
  const handleRandomSelect = () => {
    setRandomLoading(true);
    const countNum = typeof randomCount === 'number' && randomCount > 0 ? randomCount : 20;

    try {
      // Base pool matching current toolbar filters (booker, touchpoint, search)
      const basePool = customers.filter((c: any) => {
        if (selectedBookerId !== 'ALL') {
          const bId = Number(selectedBookerId);
          const staffId = c.assignedStaff?.id || c.assignedBooker?.id;
          if (staffId !== bId) return false;
        }
        if (selectedTouchpointKey !== 'ALL') {
          const tp = touchpoints.find((t) => t.key === selectedTouchpointKey);
          if (tp) {
            const days = c.daysInCampaign ?? c.daysSinceAdded ?? 0;
            const min = tp.daysMin;
            const isMatch =
              tp.daysMax !== null && tp.daysMax !== undefined ? days >= min && days <= tp.daysMax : days >= min;
            if (!isMatch) return false;
          }
        }
        if (searchQuery.trim()) {
          const query = removeVietnameseTones(searchQuery.trim().toLowerCase());
          const nameMatch = removeVietnameseTones((c.customerName || c.name || '').toLowerCase()).includes(query);
          const phoneMatch = (c.customerPhone || c.phone || '').includes(query);
          return nameMatch || phoneMatch;
        }
        return true;
      });

      // Filter candidates pool based on modal options
      const candidates = basePool.filter((record: any) => {
        // 1. Option: Exclude assigned bookers ("Chỉ chọn khách hàng chưa được phân bổ Booker")
        if (excludeAssigned) {
          const bookerName =
            record.assignedBookerName || record.assignedBooker?.name || record.assignedStaff?.displayName;
          if (bookerName) return false;
        }

        // 2. Option: Exclude unconfirmed allocation ("Bỏ khách hàng đã phân bổ, chưa xác nhận")
        if (excludeUnconfirmedAllocation) {
          if (record.isPendingAccept) return false;
        }

        // 3. Option: Exclude future bookings ("Bỏ khách hàng đã có lịch book tương lai")
        if (excludeFutureBooking) {
          const lastBookingDate = record.lastBookingDate || record.bookingDate;
          const lastBookingState = record.lastBookingState || record.bookingState;
          const isBookingInFuture = lastBookingDate ? new Date(lastBookingDate) > new Date() : false;
          if (isBookingInFuture) {
            const isBooked = lastBookingState === 'New' || lastBookingState === 'Confirmed';
            if (isBooked) return false;
          }
        }

        return true;
      });

      if (candidates.length === 0) {
        message.warning('Không tìm thấy khách hàng nào phù hợp với các điều kiện đã chọn.');
        setRandomLoading(false);
        return;
      }

      // Shuffle candidates (Fisher-Yates algorithm)
      const shuffled = [...candidates];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Take top countNum items
      const selectedItems = shuffled.slice(0, countNum);
      const selectedKeys = selectedItems.map((c: any) => c.legacyUserId || c.customerId || c.id);

      setSelectedRowKeys(selectedKeys);
      setShowSelectedOnly(true);
      setCurrentPage(1);
      setRandomModalVisible(false);
      message.success(`Đã chọn ngẫu nhiên ${selectedKeys.length} khách hàng (Đã bật hiển thị duy nhất KH được chọn)!`);
    } catch (err) {
      console.error('Random select error:', err);
      message.error('Có lỗi xảy ra khi chọn ngẫu nhiên.');
    } finally {
      setRandomLoading(false);
    }
  };

  // Fetch NYC Candidate Customers (Unassigned NYC customers)
  const fetchNycCandidates = async () => {
    setNycCandidatesLoading(true);
    try {
      const res = await apiClient.customers.list({ bucket: 'NOT_COMBO_LIVE', limit: 100 });
      const items = res?.data || [];
      // Filter out existing campaign customer legacyUserIds
      const existingIds = new Set(customers.map((c) => c.legacyUserId || c.customerId || c.id));
      const candidates = items.filter((item: any) => !existingIds.has(item.id));
      setNycCandidateCustomers(candidates);
    } catch (err) {
      console.error('Fetch NYC candidates error:', err);
      message.error('Không thể tải danh sách khách hàng NYC chưa tham gia');
    } finally {
      setNycCandidatesLoading(false);
    }
  };

  const handleOpenAddCustomersDrawer = () => {
    setSelectedCandidateKeys([]);
    setCandidateSearchQuery('');
    setAddCustomerDrawerVisible(true);
    fetchNycCandidates();
  };

  const handleAddSelectedCustomers = async () => {
    if (!campaign?.id || selectedCandidateKeys.length === 0) return;
    try {
      await apiClient.campaigns.addCustomers(campaign.id, {
        customerIds: selectedCandidateKeys.map((k) => Number(k)),
      });
      message.success(`Đã thêm ${selectedCandidateKeys.length} khách hàng vào chiến dịch thành công`);
      setAddCustomerDrawerVisible(false);
      setSelectedCandidateKeys([]);
      fetchCampaignCustomers();
      if (campaign.id) {
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }
    } catch (err) {
      console.error('Add customers to campaign error:', err);
      message.error('Không thể thêm khách hàng vào chiến dịch');
    }
  };

  // Batch Allocation Submit
  const handleBatchAllocate = async () => {
    if (!campaign?.id || !targetBookerId || selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn Booker và ít nhất 1 khách hàng');
      return;
    }
    setAllocating(true);
    try {
      const selectedLegacyUserIds = selectedRowKeys.map((key) => {
        const item = customers.find(
          (c) =>
            c.legacyUserId === key ||
            c.customerId === key ||
            c.id === key ||
            String(c.legacyUserId || c.customerId || c.id) === String(key)
        );
        return item ? Number(item.legacyUserId || item.customerId || item.id) : Number(key);
      });

      await apiClient.allocation.createBatch({
        bookerId: targetBookerId,
        customerIds: selectedLegacyUserIds,
        sourceType: 'MANUAL',
        sourceFilterSummary: `Chiến dịch ${campaign.name} (${selectedLegacyUserIds.length} KH)`,
        campaignId: campaign.id,
      });
      message.success(`Tạo đợt phân bổ ${selectedLegacyUserIds.length} KH thành công! Chờ Booker xác nhận 24h.`);
      setBatchAllocationModalVisible(false);
      setSelectedRowKeys([]);
      setTargetBookerId(undefined);
      fetchCampaignCustomers();
    } catch (err) {
      console.error('Batch allocate error:', err);
      message.error('Có lỗi xảy ra khi tạo đợt phân bổ');
    } finally {
      setAllocating(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!candidateSearchQuery.trim()) return nycCandidateCustomers;
    const q = removeVietnameseTones(candidateSearchQuery.trim().toLowerCase());
    return nycCandidateCustomers.filter((c) => {
      const nameMatch = removeVietnameseTones((c.name || '').toLowerCase()).includes(q);
      const phoneMatch = (c.phones?.[0]?.phone_number || c.phone || '').includes(q);
      return nameMatch || phoneMatch;
    });
  }, [nycCandidateCustomers, candidateSearchQuery]);

  const bookerStaffList = useMemo(() => {
    const seenNames = new Set<string>();
    return staffList
      .filter((s: any) => {
        const role = (s.role || s.staff_role || '').toLowerCase();
        return role === 'telesales' || role === 'booker';
      })
      .filter((s: any) => {
        const nameKey = (s.displayName || s.name || s.username || '').trim().toLowerCase();
        if (!nameKey || seenNames.has(nameKey)) return false;
        seenNames.add(nameKey);
        return true;
      });
  }, [staffList]);

  // Touchpoints to display in table (filter out 'all')
  const DEFAULT_CAMPAIGN_TOUCHPOINTS: CampaignTouchpointItem[] = [
    { id: 1, key: '24h', label: '24h', daysMin: 1, daysMax: 1 },
    { id: 2, key: '17', label: '17n', daysMin: 17, daysMax: 17 },
    { id: 3, key: '19', label: '19n', daysMin: 19, daysMax: 19 },
    { id: 4, key: '21', label: '21n', daysMin: 21, daysMax: 21 },
    { id: 5, key: '23', label: '23n', daysMin: 23, daysMax: 23 },
    { id: 6, key: '25', label: '25n', daysMin: 25, daysMax: 25 },
    { id: 7, key: '30', label: '30n', daysMin: 30, daysMax: 30 },
    { id: 8, key: '30plus', label: '30n+', daysMin: 31, daysMax: null },
  ];

  const displayTouchpoints = useMemo(() => {
    const filtered = touchpoints.filter((tp) => tp.key !== 'all');
    if (filtered.length > 0) {
      return filtered.map((tp) => ({
        id: tp.id,
        key: tp.key,
        label: tp.label?.replace(/^Chạm\s*/i, '').replace(/^Chăm sóc\s*/i, '') || tp.key,
        daysMin: tp.daysMin,
        daysMax: tp.daysMax,
      }));
    }
    return DEFAULT_CAMPAIGN_TOUCHPOINTS;
  }, [touchpoints]);

  // Customer Table Columns (Matching NYC Main Table)
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 45,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums font-mono text-[11px] text-gray-500 font-medium">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 160,
      render: (_: any, record: any) => {
        const name = record.customerName || record.name || 'Khách hàng';
        const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
        return (
          <Space
            size={6}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => {
              setSelectedCustomer(record);
              setDetailDrawerVisible(true);
            }}
          >
            <Avatar
              size={24}
              src={record.avatar || undefined}
              icon={<UserOutlined style={{ fontSize: '12px' }} />}
              style={{
                backgroundColor: '#1f1f1f',
                color: '#D4A84B',
                border: '1px solid #333',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: themeMode === 'dark' ? '#f3f4f6' : '#111827',
                  lineHeight: '1.2',
                }}
                className="hover:underline transition-all"
              >
                {name}
              </div>
              {phone && (
                <div
                  style={{ fontSize: '11px', color: '#D4A84B', fontWeight: '500', lineHeight: '1.2' }}
                  className="hover:underline cursor-pointer flex items-center gap-1 mt-0.5 tabular-nums font-mono"
                  onClick={(e) => {
                    e.stopPropagation();
                    makeCall(phone);
                  }}
                >
                  <PhoneOutlined style={{ fontSize: '9px' }} />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Chưa tới tiệm (Ngày)',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      width: 130,
      render: (_: any, record: any) => {
        const hasCallback = record.callbackDate
          ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
          : false;
        if (hasCallback) {
          const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
          return (
            <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#855b00', fontWeight: 'bold', fontSize: '11px' }}>
              🕒 Hẹn gọi: {callbackFormatted}
            </span>
          );
        }

        const lastBookingDate = record.lastBookingDate || record.bookingDate;
        const lastBookingState = record.lastBookingState || record.bookingState;

        const isBookingInFuture = lastBookingDate ? new Date(lastBookingDate) > new Date() : false;
        if (isBookingInFuture) {
          const isBooked = lastBookingState === 'New' || lastBookingState === 'Confirmed';
          if (isBooked) {
            const bookingFormatted = dayjs(lastBookingDate).format('DD/MM/YYYY');
            return (
              <span
                style={{ color: themeMode === 'dark' ? '#95de64' : '#237804', fontWeight: 'bold', fontSize: '11px' }}
              >
                📅 Booked: {bookingFormatted}
              </span>
            );
          }
        }

        const isBookingInPast = lastBookingDate ? new Date(lastBookingDate) < new Date() : false;
        if (isBookingInPast) {
          const isMissed =
            lastBookingState &&
            lastBookingState !== 'Completed' &&
            lastBookingState !== 'ServiceCompleted' &&
            lastBookingState !== 'CheckIn' &&
            lastBookingState !== 'CheckOut' &&
            lastBookingState !== 'ServiceStart';
          if (isMissed) {
            let missedDays = record.daysSinceLastVisit ?? record.daysInCampaign ?? 0;
            if (lastBookingDate) {
              const bookingDate = new Date(lastBookingDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              bookingDate.setHours(0, 0, 0, 0);
              const diffMs = today.getTime() - bookingDate.getTime();
              missedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            }
            return (
              <span
                style={{ color: themeMode === 'dark' ? '#ff7875' : '#cf1322', fontWeight: 'bold', fontSize: '11px' }}
              >
                ⚠️ Missed: {missedDays}n
              </span>
            );
          }
        }

        const days = record.daysSinceLastVisit ?? record.daysInCampaign ?? record.daysSinceAdded;
        return days !== null && days !== undefined ? (
          <span className="tabular-nums font-semibold text-xs">{days} ngày</span>
        ) : (
          <span className="text-gray-400 italic text-xs">Chưa tới</span>
        );
      },
    },
    {
      title: 'Tổng Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 110,
      render: (val: number, record: any) => {
        const spent = val ?? record.totalSpent ?? 0;
        return <span className="tabular-nums font-medium text-xs">{formatVND(spent)}</span>;
      },
    },
    {
      title: 'Booker phụ trách',
      key: 'booker',
      width: 120,
      render: (_: any, record: any) => {
        const bookerName =
          record.assignedBookerName || record.assignedBooker?.name || record.assignedStaff?.displayName;
        return bookerName ? (
          <Tag color="cyan" className="font-semibold text-[11px] px-1.5 py-0 m-0">
            {bookerName}
          </Tag>
        ) : (
          <span className="text-gray-400 italic text-xs">Chưa phân bổ</span>
        );
      },
    },
    {
      key: 'touchpointGroup',
      title: (
        <div
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
            color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
            fontSize: '12px',
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
            padding: '1px 6px',
            borderRadius: '4px',
          }}
        >
          ✨ Tiến Trình Chạm CSKH
        </div>
      ),
      children: displayTouchpoints.map((tp, tpIndex) => {
        const rawLabel = (tp.label || tp.key).replace(/^Chạm\s*/i, '').replace(/^Chăm sóc\s*/i, '');
        let displayLabel = rawLabel.replace(/n$/i, '');
        if (tp.key === '24h' || rawLabel === '24h') displayLabel = '24h';
        else if (tp.key === '30plus' || rawLabel === '30+' || rawLabel === '30n+') displayLabel = '30+';

        let fullTooltipText =
          tp.daysMin !== undefined
            ? `${tp.label} (Ngày ${tp.daysMin}${tp.daysMax ? `-${tp.daysMax}` : '+'})`
            : `Chạm ${displayLabel}`;
        if (tp.key === '24h' || displayLabel === '24h')
          fullTooltipText = 'Chạm 24h: Đảm bảo khách hài lòng với bộ mi (24 giờ sau làm)';
        else if (tp.key === '17' || displayLabel === '17')
          fullTooltipText = 'Chạm 17n: Nhắc lịch dặm mi (Ngày 17 sau khi làm mi)';
        else if (tp.key === '19' || displayLabel === '19')
          fullTooltipText = 'Chạm 19n: Nhắc dặm mi lần 2 (Ngày 19 sau khi làm mi)';
        else if (tp.key === '21' || displayLabel === '21')
          fullTooltipText = 'Chạm 21n: Hạn cuối chu kỳ dặm mi 21 ngày cho Khách Lẻ';
        else if (tp.key === '23' || displayLabel === '23')
          fullTooltipText = 'Chạm 23n: Nhắc lịch dặm mi cho Khách mua gói Combo (Ngày 23)';
        else if (tp.key === '25' || displayLabel === '25')
          fullTooltipText = 'Chạm 25n: Hạn dặm mi tối đa 25 ngày cho Khách mua gói Combo';
        else if (tp.key === '30' || displayLabel === '30')
          fullTooltipText = 'Chạm 30n: Nhắc lịch nối mi mới (Ngày 30 sau khi làm mi)';
        else if (tp.key === '30plus' || displayLabel === '30+')
          fullTooltipText = 'Chạm 30n+: Quá 30 ngày - Khách cần tư vấn làm bộ mi mới';

        // Select sleek Lucide icon for header
        let HeaderIcon: React.ComponentType<any> = Smile;
        const lowLabel = (tp.label || '').toLowerCase();
        if (lowLabel.includes('😂') || lowLabel.includes('cười')) HeaderIcon = Smile;
        else if (lowLabel.includes('🤝') || lowLabel.includes('nắm tay')) HeaderIcon = Handshake;
        else if (lowLabel.includes('😚') || lowLabel.includes('má')) HeaderIcon = KissIcon;
        else if (lowLabel.includes('😘') || lowLabel.includes('môi')) HeaderIcon = Heart;
        else if (lowLabel.includes('🛏️') || lowLabel.includes('giường')) HeaderIcon = BedDouble;
        else if (tp.key === '24h' || displayLabel === '24h') HeaderIcon = Sparkles;
        else if (tp.key === '17' || displayLabel === '17') HeaderIcon = Calendar;
        else if (tp.key === '19' || displayLabel === '19') HeaderIcon = Clock;
        else if (tp.key === '21' || displayLabel === '21') HeaderIcon = Bell;
        else if (tp.key === '23' || displayLabel === '23') HeaderIcon = Heart;
        else if (tp.key === '25' || displayLabel === '25') HeaderIcon = Heart;
        else if (tp.key === '30' || displayLabel === '30') HeaderIcon = Calendar;
        else if (tp.key === '30plus' || displayLabel === '30+') HeaderIcon = UserPlus;
        else {
          // Sequential fallback by touchpoint index for custom campaign touchpoints
          const rawSortOrder = (tp as any).sortOrder;
          const idx = typeof rawSortOrder === 'number' ? rawSortOrder - 1 : tpIndex;
          if (idx === 0) HeaderIcon = Smile;
          else if (idx === 1) HeaderIcon = Handshake;
          else if (idx === 2) HeaderIcon = KissIcon;
          else if (idx === 3) HeaderIcon = Heart;
          else HeaderIcon = BedDouble;
        }

        return {
          title: (
            <Tooltip title={fullTooltipText}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <HeaderIcon size={16} style={{ color: themeMode === 'dark' ? '#cbd5e1' : '#475569' }} />
              </div>
            </Tooltip>
          ),
          key: `tp_${tp.key || tp.id}`,
          width: 44,
          align: 'center' as const,
          render: (_: any, record: any) => (
            <CampaignTouchpointCell
              customer={record}
              touchpoint={tp}
              themeMode={themeMode}
              onToggle={handleToggleTouchpoint}
              onOpenBooking={(cust: any) => {
                setBookingInitialCustomer(cust);
                setBookingWizardVisible(true);
              }}
            />
          ),
        };
      }),
    },
    {
      title: 'Ngày gọi gần nhất',
      key: 'lastCallDate',
      width: 120,
      render: (_: any, record: any) => {
        const date = record.lastCallAt || record.lastCall?.createdAt;
        if (!date) return '-';
        return <span className="tabular-nums text-[11px]">{dayjs(date).format('DD/MM HH:mm')}</span>;
      },
    },
    {
      title: 'Thời lượng',
      key: 'lastCallDuration',
      width: 80,
      render: (_: any, record: any) => {
        const secs = record.lastCallDuration ?? record.lastCall?.durationSec;
        if (secs === undefined || secs === null) return '-';
        return <span className="tabular-nums text-[11px]">{formatDuration(secs)}</span>;
      },
    },
    {
      title: 'Trạng thái cuộc gọi',
      key: 'lastCallResult',
      width: 120,
      render: (_: any, record: any) => {
        const result = record.lastCallResult || record.lastCall?.callResult;
        if (!result) return '-';
        const label = (CALL_RESULT_LABELS as Record<string, string>)[result] || result;
        let color = 'default';
        if (result === 'ANSWERED' || result === 'Có bắt máy') color = 'success';
        else if (result === 'NO_ANSWER' || result === 'Không nghe máy') color = 'warning';
        else if (result === 'BUSY' || result === 'Bận') color = 'orange';
        else if (result === 'FAILED' || result === 'WRONG_NUMBER' || result === 'Sai số') color = 'error';
        return (
          <Tag color={color} className="text-[11px] px-1 m-0">
            {label}
          </Tag>
        );
      },
    },
    {
      title: 'Ghi chú cuộc gọi',
      key: 'lastCallNote',
      width: 130,
      render: (_: any, record: any) => {
        const note = record.lastCallNote || record.lastCall?.note;
        if (!note) return '-';
        const compactNote = note.length > 20 ? `${note.substring(0, 20)}...` : note;
        return (
          <Tooltip title={note}>
            <span className="cursor-pointer text-[11px] italic text-gray-300 line-clamp-1">{compactNote}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Đã phân bổ',
      key: 'allocatedDays',
      width: 100,
      render: (_: any, record: any) => {
        const assignedAt = record.assignedAt || record.assignedStaff?.assignedAt || record.lastAllocation?.assignedAt;
        if (!assignedAt) {
          return <span className="text-gray-400 italic text-[11px]">Chưa phân bổ</span>;
        }
        const assignedDate = dayjs(assignedAt);
        const today = dayjs();
        const diffDays = Math.max(0, today.diff(assignedDate, 'day'));
        const formattedDate = assignedDate.format('DD/MM/YYYY HH:mm');
        const staffName =
          record.assignedBookerName ||
          record.assignedBooker?.name ||
          record.assignedStaff?.displayName ||
          record.lastAllocation?.staffName;
        const tooltipTitle = `Phân bổ cho: ${staffName || 'Booker'} (từ ${formattedDate})`;
        return (
          <Tooltip title={tooltipTitle}>
            <span className="tabular-nums font-semibold text-[11px]">{diffDays} ngày</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
        return (
          <Space size="small">
            <Tooltip title="Gửi SMS">
              <Button
                size="small"
                icon={<MessageOutlined style={{ color: '#D4A84B' }} />}
                onClick={() => {
                  setSelectedCustomer(record);
                  setSmsModalVisible(true);
                }}
                style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
              />
            </Tooltip>
            <Tooltip title="Xem thông tin chi tiết">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedCustomer(record);
                  setDetailDrawerVisible(true);
                }}
              />
            </Tooltip>
            <Tooltip title="Đặt lịch hẹn">
              <Button
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => {
                  setBookingInitialCustomer(record);
                  setBookingWizardVisible(true);
                }}
              />
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Xóa khỏi chiến dịch">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    handleRemoveCustomer(
                      record.legacyUserId || record.customerId || record.id,
                      record.customerName || record.name
                    )
                  }
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-12 text-center">
        <ClockCircleOutlined className="text-3xl text-amber-500 animate-spin mb-3" />
        <div className="text-slate-400 font-medium">Đang tải chi tiết chiến dịch...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-12 text-center max-w-md mx-auto my-12 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl">
        <div className="text-4xl mb-3">🔍</div>
        <Title level={4} style={{ marginBottom: 8, color: '#f3f4f6' }}>
          Không tìm thấy chiến dịch
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Chiến dịch với đường dẫn &quot;<span className="font-mono text-amber-400">{slug}</span>&quot; không tồn tại
          hoặc đã bị xóa.
        </Text>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard/nyc/campaigns')}
          style={{
            backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
            borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
            fontWeight: 'bold',
          }}
        >
          Quay lại danh sách chiến dịch
        </Button>
      </div>
    );
  }

  const selectedCustomerId = selectedCustomer
    ? selectedCustomer.legacyUserId || selectedCustomer.customerId || selectedCustomer.id || null
    : null;

  return (
    <div>
      {/* UNIFIED MINIMALIST CAMPAIGN HEADER (1 SINGLE ROW WITH ICON+TOOLTIP KPIs) */}
      <div
        className={`p-3 rounded-2xl mb-3 flex flex-wrap items-center justify-between gap-3 border shadow-sm transition-all ${
          themeMode === 'dark'
            ? 'bg-gradient-to-r from-[#141a29]/90 via-[#111827]/95 to-[#192238]/90 border-amber-500/20 shadow-lg shadow-black/40'
            : 'bg-gradient-to-r from-white via-amber-50/30 to-slate-50 border-amber-200/60'
        }`}
      >
        {/* Left: Navigation & Campaign Title & Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/dashboard/nyc/campaigns')}
            className="text-xs font-medium opacity-80 hover:opacity-100"
          >
            Danh sách
          </Button>
          <Title level={4} style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>
            {campaign.name}
          </Title>
          <Tag color="gold" className="font-mono text-[11px] m-0">
            slug: {campaign.slug}
          </Tag>
          {campaign.status === 'ACTIVE' ? (
            <Tag color="success" className="font-bold m-0 text-[11px]">
              HOẠT ĐỘNG
            </Tag>
          ) : (
            <Tag color="default" className="m-0 text-[11px]">
              {campaign.status}
            </Tag>
          )}
        </div>

        {/* Center: Minimalist Icon + Tooltip 5 KPI Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* KPI 1: Total Customers */}
          <Tooltip title={`Tổng số: ${stats?.totalCustomers ?? customers.length} khách hàng`}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                themeMode === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-200'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <UserOutlined className="text-slate-400" />
              <span className="tabular-nums">{stats?.totalCustomers ?? customers.length}</span>
              <span className="text-[10px] text-slate-400 font-normal">KH</span>
            </div>
          </Tooltip>

          {/* KPI 2: Booked Rate */}
          <Tooltip title={`Tỷ lệ đặt lịch: ${stats?.bookedRate ?? 0}% (${stats?.bookedCount ?? 0} đơn)`}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                themeMode === 'dark'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <CheckCircleOutlined className="text-emerald-500" />
              <span className="tabular-nums">{stats?.bookedRate ?? 0}%</span>
            </div>
          </Tooltip>

          {/* KPI 3: Touchpoint Progress */}
          <Tooltip title={`Tiến độ điểm chạm: ${stats?.totalTouchpointLogs ?? 0} lượt hoàn thành`}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                themeMode === 'dark'
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <FieldTimeOutlined className="text-purple-400" />
              <span className="tabular-nums">{stats?.totalTouchpointLogs ?? 0}</span>
              <span className="text-[10px] text-slate-400 font-normal">lượt</span>
            </div>
          </Tooltip>

          {/* KPI 4: Calls Today */}
          <Tooltip title={`Cuộc gọi hôm nay: ${stats?.totalCallsToday ?? 0} cuộc`}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                themeMode === 'dark'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <PhoneOutlined className="text-blue-400" />
              <span className="tabular-nums">{stats?.totalCallsToday ?? 0}</span>
            </div>
          </Tooltip>

          {/* KPI 5: Campaign Revenue */}
          <Tooltip title={`Doanh thu chiến dịch: ${formatVND(stats?.campaignRevenue ?? 0)}`}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                themeMode === 'dark'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <DollarOutlined style={{ color: themeMode === 'dark' ? '#D4A84B' : '#87640a' }} />
              <span className="tabular-nums">{formatVND(stats?.campaignRevenue ?? 0)}</span>
            </div>
          </Tooltip>
        </div>

        {/* Right: Date Range, Promotions & Edit Button */}
        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          <Tooltip
            title={`Thời gian: ${campaign.startDate ? dayjs(campaign.startDate).format('DD/MM/YYYY') : 'Tùy chỉnh'} - ${campaign.endDate ? dayjs(campaign.endDate).format('DD/MM/YYYY') : 'Không giới hạn'}`}
          >
            <span className="tabular-nums text-slate-400 flex items-center gap-1 text-xs">
              <CalendarOutlined className="text-amber-500" />
              <span>
                {campaign.startDate ? dayjs(campaign.startDate).format('DD/MM') : ''}-
                {campaign.endDate ? dayjs(campaign.endDate).format('DD/MM/YYYY') : ''}
              </span>
            </span>
          </Tooltip>

          {promotions.length > 0 && (
            <Tooltip
              title={promotions
                .map((p) => `${p.name}: ${p.type === 'PERCENT_DISCOUNT' ? `${p.value}%` : formatVND(p.value)}`)
                .join(', ')}
            >
              <div className="flex items-center gap-1">
                <GiftOutlined className="text-purple-400" />
                {promotions.map((p) => (
                  <Tag key={p.id} color="purple" className="m-0 text-[10px] font-medium">
                    {p.name} ({p.type === 'PERCENT_DISCOUNT' ? `${p.value}%` : formatVND(p.value)})
                  </Tag>
                ))}
              </div>
            </Tooltip>
          )}

          {isAdmin && (
            <Tooltip title="Chỉnh sửa chiến dịch">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                  borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                }}
                onClick={handleOpenEditModal}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* UNIFIED MINIMALIST TOOLBAR (SEARCH, BOOKER FILTER & ACTIONS - 1 SINGLE LINE) */}
      <div
        className={`px-3 py-2 rounded-xl mb-4 border transition-all duration-300 ${
          themeMode === 'dark' ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <Input
            placeholder="Tìm theo tên hoặc SĐT..."
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
            style={{ width: 260 }}
          />

          {/* Booker Filter */}
          {isAdmin && (
            <Select
              value={selectedBookerId}
              onChange={(val) => setSelectedBookerId(val)}
              size="middle"
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả Booker' },
                ...bookerStaffList.map((s) => ({ value: String(s.id), label: s.displayName })),
              ]}
            />
          )}

          {/* Minimalist Random Select Button (Icon + Tooltip) */}
          {isAdmin && (
            <Tooltip title="Chọn ngẫu nhiên khách hàng theo bộ lọc">
              <Button
                size="middle"
                icon={<AimOutlined />}
                onClick={() => setRandomModalVisible(true)}
                style={{
                  borderColor: themeMode === 'dark' ? '#D4A84B' : '#d97706',
                  color: themeMode === 'dark' ? '#D4A84B' : '#d97706',
                }}
              />
            </Tooltip>
          )}

          {/* Show Selected Only Toggle Indicator */}
          {selectedRowKeys.length > 0 && (
            <Tag
              color={showSelectedOnly ? 'gold' : 'default'}
              style={{
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                margin: 0,
              }}
              onClick={() => setShowSelectedOnly((prev) => !prev)}
            >
              {showSelectedOnly ? (
                <>
                  <span>🎯 Chỉ hiện {selectedRowKeys.length} KH được chọn</span>
                  <span style={{ marginLeft: 4, opacity: 0.8 }} title="Bấm để xem tất cả">
                    (Xem tất cả)
                  </span>
                </>
              ) : (
                <>
                  <span>👁️ Xem riêng {selectedRowKeys.length} KH được chọn</span>
                </>
              )}
            </Tag>
          )}

          {/* Batch Allocation Action Button */}
          {isAdmin && selectedRowKeys.length > 0 && (
            <Button
              type="primary"
              size="middle"
              icon={<TeamOutlined />}
              onClick={() => setBatchAllocationModalVisible(true)}
              style={{ fontWeight: 'bold' }}
            >
              Phân bổ Booker ({selectedRowKeys.length})
            </Button>
          )}
        </div>
      </div>

      <Table
        size="small"
        tableLayout="fixed"
        rowSelection={
          isAdmin
            ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }
            : undefined
        }
        columns={columns}
        dataSource={filteredCustomers}
        rowKey={(record) => record.legacyUserId || record.customerId || record.id}
        loading={customersLoading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          onChange: (page, pSize) => {
            setCurrentPage(page);
            if (slug) {
              localStorage.setItem(`mos_campaign_page_${slug}`, page.toString());
            }
            if (pSize && pSize !== pageSize) {
              setPageSize(pSize);
              localStorage.setItem('mos_campaign_pageSize', pSize.toString());
            }
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Tổng số: ${total} khách hàng`,
        }}
        rowClassName={(record) => getRowClassName(record, themeMode)}
        className="antd-custom-table"
      />

      {/* Admin Batch Allocation Modal */}
      <Modal
        title="Tạo đợt phân bổ Booker cho khách hàng chiến dịch"
        open={batchAllocationModalVisible}
        onCancel={() => setBatchAllocationModalVisible(false)}
        onOk={handleBatchAllocate}
        confirmLoading={allocating}
        okText="Xác nhận Phân bổ"
        cancelText="Hủy"
      >
        <div className="my-4">
          <Text className="block mb-2 font-semibold">
            Chọn Booker nhận {selectedRowKeys.length} khách hàng đã chọn:
          </Text>
          <Select
            placeholder="Chọn Booker..."
            style={{ width: '100%' }}
            value={targetBookerId}
            onChange={(val) => setTargetBookerId(val)}
            options={bookerStaffList.map((s) => ({ value: s.id, label: s.displayName }))}
          />
        </div>
      </Modal>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        open={detailDrawerVisible}
        customerId={selectedCustomerId}
        onClose={() => setDetailDrawerVisible(false)}
      />

      {/* Booking Wizard Drawer */}
      <BookingWizardDrawer
        open={bookingWizardVisible}
        onClose={() => setBookingWizardVisible(false)}
        initialCustomer={bookingInitialCustomer}
        onSuccess={() => {
          setBookingWizardVisible(false);
          fetchCampaignCustomers();
        }}
      />

      {/* SMS Modal */}
      <SMSModal open={smsModalVisible} onClose={() => setSmsModalVisible(false)} customer={selectedCustomer} />

      {/* Edit Campaign Modal */}
      <Modal
        title={<div className="font-bold text-lg">Chỉnh sửa chiến dịch NYC: {campaign?.name}</div>}
        open={editCampaignModalVisible}
        onCancel={() => setEditCampaignModalVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          onFinishFailed={(errorInfo) => {
            console.error('Campaign form validation failed:', errorInfo);
            message.error('Vui lòng kiểm tra lại các thông tin bắt buộc (Tên chiến dịch, Điểm chạm, Ưu đãi)');
          }}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Tên chiến dịch"
                rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
              >
                <Input placeholder="VD: Chiến dịch NYC Tri ân Tháng 8" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="slug"
                label="Slug (Đường dẫn)"
                tooltip="Tùy chọn. Nếu để trống hệ thống sẽ tự sinh từ tên."
              >
                <Input placeholder="VD: tri-an-thang-8" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="dates" label="Thời gian diễn ra">
                <RangePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="status" label="Trạng thái">
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE (Hoạt động)' },
                    { value: 'ENDED', label: 'ENDED (Đã kết thúc)' },
                    { value: 'ARCHIVED', label: 'ARCHIVED (Lưu trữ)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả chiến dịch">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn gọn về mục tiêu và quy định của chiến dịch..." />
          </Form.Item>

          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
            <span className="text-sm font-semibold">📍 Cấu hình các điểm chạm (Touchpoints)</span>
          </Divider>

          <Form.List name="touchpoints">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={8} key={key} align="middle" className="mb-2">
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: 'Tên chạm' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Tên chạm (VD: Chạm D1)" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: 'Mã chạm' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Mã (VD: TP_D1)" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'daysMin']}
                        rules={[{ required: true, message: 'Số ngày' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} placeholder="Từ ngày" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item {...restField} name={[name, 'daysMax']} style={{ marginBottom: 0 }}>
                        <InputNumber min={0} placeholder="Đến ngày" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item {...restField} name={[name, 'color']} style={{ marginBottom: 0 }}>
                        <Input type="color" style={{ width: '100%', height: '32px', padding: 0 }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500 cursor-pointer" />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="mt-1 mb-4">
                  Thêm điểm chạm mới
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
            <span className="text-sm font-semibold">🎁 Cấu hình ưu đãi (Promotions)</span>
          </Divider>

          <Form.List name="promotions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={8} key={key} align="middle" className="mb-2">
                    <Col span={7}>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: 'Tên ưu đãi' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Tên ưu đãi" />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item
                        {...restField}
                        name={[name, 'type']}
                        rules={[{ required: true, message: 'Loại ưu đãi' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          options={[
                            { value: 'PERCENT_DISCOUNT', label: 'Giảm %' },
                            { value: 'FIXED_DISCOUNT', label: 'Giảm số tiền' },
                            { value: 'FREE_SERVICE', label: 'Tặng dịch vụ' },
                            { value: 'FREE_PRODUCT', label: 'Tặng sản phẩm' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: 'Giá trị' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} placeholder="Giá trị" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item {...restField} name={[name, 'code']} style={{ marginBottom: 0 }}>
                        <Input placeholder="Mã Code" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500 cursor-pointer" />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="mt-1 mb-4">
                  Thêm ưu đãi mới
                </Button>
              </>
            )}
          </Form.List>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <Button onClick={() => setEditCampaignModalVisible(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={editingSubmitting}>
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* RANDOM SELECTOR MODAL */}
      <Modal
        title={
          <span style={{ color: '#D4A84B', fontSize: '18px', fontWeight: 'bold' }}>Chọn Ngẫu Nhiên Khách Hàng</span>
        }
        open={randomModalVisible}
        onCancel={() => setRandomModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRandomModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={randomLoading}
            onClick={handleRandomSelect}
            style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: 'bold' }}
          >
            Chọn
          </Button>,
        ]}
      >
        <div style={{ margin: '16px 0' }}>
          <p style={{ color: token.colorTextDescription, marginBottom: '16px', fontSize: '13px' }}>
            Hệ thống sẽ tự động tìm kiếm và chọn ngẫu nhiên các khách hàng thỏa mãn bộ lọc hiện tại của anh/chị.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: token.colorText, fontWeight: 500 }}>Số lượng khách hàng:</span>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="Nhập số..."
                  value={randomCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setRandomCount('');
                    } else {
                      const num = parseInt(val, 10);
                      setRandomCount(isNaN(num) ? '' : num);
                    }
                  }}
                  style={{ width: '110px', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: token.colorTextDescription }}>Preset chọn nhanh:</span>
                {[10, 20, 50, 100, 200].map((preset) => (
                  <Tag.CheckableTag
                    key={preset}
                    checked={randomCount === preset}
                    onChange={() => setRandomCount(preset)}
                    style={{
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      border: `1px solid ${
                        randomCount === preset ? '#D4A84B' : themeMode === 'dark' ? '#434343' : '#d9d9d9'
                      }`,
                    }}
                  >
                    {preset} KH
                  </Tag.CheckableTag>
                ))}
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Checkbox checked={excludeAssigned} onChange={(e) => setExcludeAssigned(e.target.checked)}>
                Chỉ chọn khách hàng chưa được phân bổ Booker
              </Checkbox>
              <Checkbox
                checked={excludeUnconfirmedAllocation}
                onChange={(e) => setExcludeUnconfirmedAllocation(e.target.checked)}
              >
                Bỏ khách hàng đã phân bổ, chưa xác nhận
              </Checkbox>
              <Checkbox checked={excludeFutureBooking} onChange={(e) => setExcludeFutureBooking(e.target.checked)}>
                Bỏ khách hàng đã có lịch book tương lai
              </Checkbox>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
