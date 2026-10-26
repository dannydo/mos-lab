'use client';

import {
  AdaptiveModal,
  AdaptiveOverlayFooter,
  CollapsibleSearchField,
  CopyPhoneButton,
  ResponsiveFormGrid,
  TableIndexHeader,
} from '~/components/ui';

import '../../../../suppress-warnings';
import React, { useDeferredValue, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ColumnsType } from 'antd/es/table';
import {
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
  theme,
  Checkbox,
  Divider,
  Avatar,
  Tabs,
  Alert,
  Popconfirm,
} from 'antd';
import { GoogleSheetColorPicker } from '../../../../../components/GoogleSheetColorPicker';
import { TouchpointIconPicker, getIconComponent } from '../../../../../components/campaign/TouchpointIconPicker';
import { DataTable } from '../../../../../components/ui';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  PhoneOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  SettingOutlined,
  GiftOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  DollarOutlined,
  EditOutlined,
  MinusCircleOutlined,
  AimOutlined,
  WarningOutlined,
  FilterOutlined,
  LockOutlined,
  UnlockOutlined,
  HistoryOutlined,
  ForwardOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import { useTheme } from '../../../../../context/ThemeContext';
import { apiClient } from '../../../../../lib/api-client';
import {
  getFixedFinalPriceServiceCategories,
  getFixedFinalPriceServiceOptions,
  getFixedFinalPriceScopeSummary,
  splitFixedFinalPriceSelection,
  validateFixedFinalPricePromotion,
} from '../../../../../lib/campaign-fixed-price';
import { normalizeCampaignAccessStaff } from '../../../../../lib/campaign-form-options';
import { removeVietnameseTones } from '../../../../../lib/utils/search';
import { formatVND, formatDuration } from '../../../../../lib/format-utils';
import { useOmiCall } from '../../../../../context/OmiCallContext';
import { TouchpointStatus } from '@mos-lab/shared';
import CalendarPlusIcon from '../../../../../components/icons/CalendarPlusIcon';
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
import { SharedPoolOverviewBanner } from '../../../../../components/campaign/SharedPoolOverviewBanner';
import { SharedPoolAuditDrawer } from '../../../../../components/campaign/SharedPoolAuditDrawer';
import { SharedPoolHistoryRecoveryDrawer } from '../../../../../components/campaign/SharedPoolHistoryRecoveryDrawer';
import { SharedPoolExcludedDrawer } from '../../../../../components/campaign/SharedPoolExcludedDrawer';
import { CampaignKpiHeaderBar } from '../../../../../components/campaign/CampaignKpiHeaderBar';
import { CampaignClaimCountdown } from '../../../../../components/campaign/CampaignClaimCountdown';
import { CampaignEditModal } from '../../../../../components/campaign/CampaignEditModal';
import { BatchAllocationModal, RandomSelectModal } from '../../../../../components/campaign/modals/CampaignBatchModals';
import { useCampaignCustomerColumns } from '../../../../../components/campaign/CampaignCustomerTableColumns';

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
  CampaignBookingStatusFilter,
  CampaignTouchpoint,
  CampaignPromotion,
  CampaignPromotionType,
  CampaignStatsResponse,
  CustomerCampaignPromotionInfo,
  CustomerCampaignPromotionItem,
  CustomerServiceFilterCategory,
  CustomerServiceFilterOption,
  Staff,
  Customer,
  CALL_RESULT_LABELS,
  isAdminOrSuperAdminRole,
  vietnameseSearchFilter,
  SharedPoolOverviewStats,
  CampaignSharedPoolLog,
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

const toBookingPromotionItem = (promotion: CampaignPromotion): CustomerCampaignPromotionItem => {
  const value = Math.round(Number(promotion.value || 0));
  const label =
    promotion.type === 'PERCENT_DISCOUNT'
      ? `Giảm ${value}%`
      : promotion.type === 'FIXED_DISCOUNT'
        ? `Giảm ${value.toLocaleString('vi-VN')}đ`
        : promotion.type === 'FIXED_FINAL_PRICE'
          ? `Đồng giá ${value.toLocaleString('vi-VN')}đ`
          : promotion.name;

  return {
    id: promotion.id,
    campaignId: promotion.campaignId,
    name: promotion.name,
    code: promotion.code,
    type: promotion.type,
    value,
    eligibleServiceIds: promotion.eligibleServiceIds || [],
    eligibleServiceCategoryKeys: promotion.eligibleServiceCategoryKeys || [],
    description: promotion.description,
    isActive: promotion.isActive,
    label,
    legacyPromotionId: promotion.legacyPromotionId || null,
  };
};

const CAMPAIGN_BOOKING_STATUS_OPTIONS: Array<{
  value: CampaignBookingStatusFilter;
  label: string;
  icon: React.ReactNode;
  activeClassName: string;
}> = [
  {
    value: 'ALL',
    label: 'Tất cả',
    icon: <FilterOutlined />,
    activeClassName: 'bg-amber-500 text-white shadow-xs font-semibold',
  },
  {
    value: 'BOOKED',
    label: 'Booked',
    icon: <CalendarOutlined />,
    activeClassName: 'bg-sky-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'DONE',
    label: 'Done',
    icon: <CheckCircleOutlined />,
    activeClassName: 'bg-emerald-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'MISSED',
    label: 'Missed',
    icon: <WarningOutlined />,
    activeClassName: 'bg-rose-600 text-white shadow-xs font-semibold',
  },
];

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall, callState } = useOmiCall();
  const isInitializedRef = useRef(false);

  // Core state
  const [loading, setLoading] = useState<boolean>(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [touchpoints, setTouchpoints] = useState<CampaignTouchpoint[]>([]);
  const [promotions, setPromotions] = useState<CampaignPromotion[]>([]);
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);

  // Shared Pool state
  const [sharedPoolOverview, setSharedPoolOverview] = useState<SharedPoolOverviewStats | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<number | 'ALL'>('ALL');
  const [selectedPoolStatus, setSelectedPoolStatus] = useState<string>('ALL');
  const [sharedPoolLoading, setSharedPoolLoading] = useState<boolean>(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState<boolean>(false);
  const [auditCustomer, setAuditCustomer] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<CampaignSharedPoolLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [historyRecoveryOpen, setHistoryRecoveryOpen] = useState<boolean>(false);
  const [excludedDrawerOpen, setExcludedDrawerOpen] = useState<boolean>(false);
  const hasInitializedBatchRef = useRef(false);
  const selectedPoolStatusRef = useRef(selectedPoolStatus);
  selectedPoolStatusRef.current = selectedPoolStatus;
  const auditCustomerRef = useRef(auditCustomer);
  auditCustomerRef.current = auditCustomer;

  // Customer table state
  const [customersLoading, setCustomersLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [selectedTouchpointKey, setSelectedTouchpointKey] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookerId, setSelectedBookerId] = useState<string>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<CampaignBookingStatusFilter>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedCustomersByKey, setSelectedCustomersByKey] = useState<Map<React.Key, any>>(() => new Map());

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
  const deferredSearchQuery = useDeferredValue(searchQuery);

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
  }, [bookingStatusFilter, selectedTouchpointKey, searchQuery, selectedBookerId, slug]);

  // User & Staff state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceFilterOptions, setServiceFilterOptions] = useState<CustomerServiceFilterOption[]>([]);
  const [serviceFilterCategories, setServiceFilterCategories] = useState<CustomerServiceFilterCategory[]>([]);
  const [campaignFormOptionsLoading, setCampaignFormOptionsLoading] = useState(true);
  const [campaignFormOptionsError, setCampaignFormOptionsError] = useState<string | null>(null);
  const [initialCampaignPromotionContext, setInitialCampaignPromotionContext] = useState<
    CustomerCampaignPromotionInfo[]
  >([]);

  // A Fast Refresh can preserve the previous booker selection after a role
  // correction. Reset the campaign-wide default once the authenticated Admin
  // or Super Admin identity is known; they can still choose a specific Booker
  // afterwards from the selector.
  useEffect(() => {
    if (isAdminOrSuperAdminRole(currentUser?.role)) {
      setSelectedBookerId((current) => (current === 'ALL' ? current : 'ALL'));
    }
  }, [currentUser?.role]);

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

  // Modal confirm hook
  const [modal, modalContextHolder] = Modal.useModal();

  // Edit Campaign Modal state
  const [editCampaignModalVisible, setEditCampaignModalVisible] = useState<boolean>(false);
  const [editModalTab, setEditModalTab] = useState<string>('info');
  const [editForm] = Form.useForm();
  const [editingSubmitting, setEditingSubmitting] = useState<boolean>(false);

  const handleOpenEditModal = (targetTab: any = 'info') => {
    if (!campaign) return;
    setEditModalTab(typeof targetTab === 'string' ? targetTab : 'info');
    const dates = campaign.startDate && campaign.endDate ? [dayjs(campaign.startDate), dayjs(campaign.endDate)] : null;
    editForm.setFieldsValue({
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      description: campaign.description,
      dates,
      assignedStaffIds: campaign.assignedStaffIds || [],
      touchpoints: touchpoints.map((t, idx) => ({
        id: t.id,
        key: t.key,
        label: t.label,
        icon:
          t.icon ||
          (idx === 0 ? 'Smile' : idx === 1 ? 'Handshake' : idx === 2 ? 'Kiss' : idx === 3 ? 'Heart' : 'BedDouble'),
        daysMin: t.daysMin,
        daysMax: t.daysMax ?? undefined,
        color: t.color || '#3b82f6',
      })),
      promotions: promotions.map((p) => ({
        name: p.name,
        type: p.type,
        value: p.value,
        code: p.code || '',
        eligibleServiceSelection: [
          ...(p.eligibleServiceCategoryKeys || []).map((key) => `category:${key}`),
          ...(p.eligibleServiceIds || []).map(String),
        ],
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
        id: t.id,
        key: t.key ? t.key.trim() : t.id ? `tp_${t.id}` : `step_${index + 1}`,
        label: t.label ? t.label.trim() : `Chạm ${index + 1}`,
        icon:
          t.icon ||
          (index === 0
            ? 'Smile'
            : index === 1
              ? 'Handshake'
              : index === 2
                ? 'Kiss'
                : index === 3
                  ? 'Heart'
                  : 'BedDouble'),
        daysMin: typeof t.daysMin === 'number' ? t.daysMin : 0,
        daysMax: typeof t.daysMax === 'number' ? t.daysMax : undefined,
        color: t.color || '#3b82f6',
      }));

      const updatedPromotions = (values.promotions || []).map((p: any) => {
        const type = p.type as CampaignPromotionType;
        const value = Number(p.value);
        const { eligibleServiceIds, eligibleServiceCategoryKeys } = splitFixedFinalPriceSelection(
          p.eligibleServiceSelection
        );
        validateFixedFinalPricePromotion(
          type,
          value,
          eligibleServiceIds,
          eligibleServiceCategoryKeys,
          fixedFinalPriceServices,
          fixedFinalPriceCategories
        );
        return {
          name: p.name ? p.name.trim() : '',
          code: p.code ? p.code.trim() : undefined,
          type,
          value,
          eligibleServiceIds: type === 'FIXED_FINAL_PRICE' ? eligibleServiceIds : undefined,
          eligibleServiceCategoryKeys: type === 'FIXED_FINAL_PRICE' ? eligibleServiceCategoryKeys : undefined,
          description: p.description,
        };
      });

      const updateDto = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description,
        startDate,
        endDate,
        status: values.status,
        assignedStaffIds: values.assignedStaffIds || null,
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
        await fetchCampaignData();
        await fetchCampaignCustomers();
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
        // Super Admin has the same campaign-wide scope as Admin. Treating the
        // role as a regular booker here silently sent `assignedStaffId=<self>`
        // after any booking refresh, leaving only that booker's rows visible.
        if (!isAdminOrSuperAdminRole(u.role)) {
          setSelectedBookerId(String(u.id));
        } else {
          setSelectedBookerId('ALL');
        }
      } catch (_) {}
    }
    let cancelled = false;
    const loadCampaignFormOptions = async () => {
      setCampaignFormOptionsLoading(true);
      setCampaignFormOptionsError(null);
      try {
        const [bookerRows, serviceResponse] = await Promise.all([
          apiClient.customers.getStaff({ role: 'booker' }),
          apiClient.customers.getServiceFilterOptions(),
        ]);
        let availableStaff = normalizeCampaignAccessStaff(bookerRows);
        if (availableStaff.length === 0) {
          availableStaff = normalizeCampaignAccessStaff(await apiClient.customers.getStaff());
        }
        if (!cancelled) {
          setStaffList(availableStaff);
          setServiceFilterOptions(serviceResponse.services || []);
          setServiceFilterCategories(serviceResponse.categories || []);
        }
      } catch (error) {
        console.error('Failed to load campaign form options:', error);
        if (!cancelled) {
          setCampaignFormOptionsError('Không thể tải danh sách thành viên hoặc dịch vụ. Hãy thử tải lại trang.');
        }
      } finally {
        if (!cancelled) setCampaignFormOptionsLoading(false);
      }
    };
    void loadCampaignFormOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const fixedFinalPriceServices = getFixedFinalPriceServiceOptions(serviceFilterOptions);
  const fixedFinalPriceCategories = getFixedFinalPriceServiceCategories(
    serviceFilterCategories,
    fixedFinalPriceServices
  );

  const isAdmin =
    isAdminOrSuperAdminRole(currentUser?.role) ||
    currentUser?.role === 'manager' ||
    currentUser?.role === 'oc' ||
    currentUser?.role === 'ls' ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    currentUser?.username?.toLowerCase() === 'danhdo@gmail.com';

  useEffect(() => {
    if (!campaign) {
      setInitialCampaignPromotionContext([]);
      return;
    }

    const fixedPriceServices = getFixedFinalPriceServiceOptions(serviceFilterOptions);
    const fixedPriceCategories = getFixedFinalPriceServiceCategories(serviceFilterCategories, fixedPriceServices);
    const activePromotions = promotions
      .filter((promotion) => promotion.isActive !== false)
      .map((promotion) => {
        const item = toBookingPromotionItem(promotion);
        if (promotion.type !== 'FIXED_FINAL_PRICE') return item;

        const categoryKeys = item.eligibleServiceCategoryKeys || [];
        const categoryMatches = fixedPriceCategories.filter((category) => categoryKeys.includes(category.key));
        return {
          ...item,
          eligibleServiceIds: Array.from(
            new Set([...(item.eligibleServiceIds || []), ...categoryMatches.flatMap((category) => category.serviceIds)])
          ),
          eligibleServiceCategoryLabels: categoryMatches.map((category) => category.label),
        };
      });

    setInitialCampaignPromotionContext(
      activePromotions.length === 0
        ? []
        : [
            {
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignSlug: campaign.slug,
              promotions: activePromotions,
            },
          ]
    );
  }, [campaign, promotions, serviceFilterCategories, serviceFilterOptions]);

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

  // Fetch Shared Pool Overview
  const fetchSharedPoolOverview = useCallback(
    async (batchToFetch?: number | 'ALL', isBackground = false) => {
      const campId = campaign?.id;
      if (!campId || campaign?.operationMode !== 'SHARED_POOL') return;
      try {
        if (!isBackground) setSharedPoolLoading(true);
        const batchParam = batchToFetch !== undefined ? batchToFetch : selectedBatch;
        const res = await apiClient.campaigns.getSharedPoolOverview(campId, batchParam);
        setSharedPoolOverview(res);
        if (!hasInitializedBatchRef.current && res?.activeBatchNumber) {
          setSelectedBatch(res.activeBatchNumber);
          hasInitializedBatchRef.current = true;
        }
      } catch (err) {
        console.error('Fetch shared pool overview error:', err);
      } finally {
        if (!isBackground) setSharedPoolLoading(false);
      }
    },
    [campaign?.id, campaign?.operationMode, selectedBatch]
  );

  // Fetch Campaign Customers
  const fetchCampaignCustomers = useCallback(
    async (isBackground = false) => {
      const campId = campaign?.id;
      if (!campId) return;
      if (!isBackground) setCustomersLoading(true);
      try {
        const params: any = {
          page: currentPage,
          pageSize,
        };
        if (selectedBookerId !== 'ALL') {
          params.assignedStaffId = selectedBookerId;
        }
        if (deferredSearchQuery.trim()) {
          params.search = deferredSearchQuery.trim();
        }
        if (bookingStatusFilter !== 'ALL') {
          params.bookingStatus = bookingStatusFilter;
        }
        if (campaign?.operationMode === 'SHARED_POOL') {
          if (selectedBatch !== 'ALL') {
            params.batchNumber = selectedBatch;
          }
          if (selectedPoolStatus !== 'ALL') {
            params.poolStatus = selectedPoolStatus;
          }
        }
        const res: any = await apiClient.campaigns.getCustomers(campId, params);
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setCustomers(list);
        setCustomersTotal(Array.isArray(res) ? list.length : Number(res?.total ?? list.length));
      } catch (err) {
        console.error('Fetch campaign customers error:', err);
        message.error('Không thể tải danh sách khách hàng');
      } finally {
        if (!isBackground) setCustomersLoading(false);
      }
    },
    [
      bookingStatusFilter,
      campaign,
      currentPage,
      deferredSearchQuery,
      pageSize,
      selectedBatch,
      selectedBookerId,
      selectedPoolStatus,
    ]
  );

  // Local expiry handler when ClaimCountdown finishes
  const handleClaimExpiredLocally = useCallback((record: any) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === record.id || (record.legacyUserId && c.legacyUserId === record.legacyUserId)) {
          return {
            ...c,
            poolStatus: 'AVAILABLE',
            claimedByStaffId: null,
            claimedByStaffName: null,
            claimExpiresAt: null,
            canClaim: true,
            isClaimedByMe: false,
          };
        }
        return c;
      })
    );
  }, []);

  // Realtime WebSocket for Shared Pool events with fallback polling
  useEffect(() => {
    if (campaign?.operationMode !== 'SHARED_POOL' || !campaign?.id) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const configured = process.env.NEXT_PUBLIC_API_URL;
        let wsUrl = `${protocol}//${host}:4001/api/campaigns/${campaign.id}/shared-pool/stream`;
        if (configured && !configured.startsWith('/')) {
          try {
            const url = new URL(configured, window.location.origin);
            const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${wsProto}//${url.host}${url.pathname.replace(/\/$/, '')}/campaigns/${campaign.id}/shared-pool/stream`;
          } catch {
            // fallback
          }
        }

        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CUSTOMER_CLAIMED') {
              setCustomers((prev) =>
                prev.map((c) => {
                  if (c.id === data.customerId || (data.legacyUserId && c.legacyUserId === data.legacyUserId)) {
                    const isMe = currentUser?.id && data.claimedByStaffId === currentUser.id;
                    return {
                      ...c,
                      poolStatus: 'CLAIMED',
                      claimedByStaffId: data.claimedByStaffId,
                      claimedByStaffName: data.claimedByStaffName,
                      claimExpiresAt: data.claimExpiresAt,
                      canClaim: false,
                      isClaimedByMe: !!isMe,
                    };
                  }
                  return c;
                })
              );
            } else if (data.type === 'CUSTOMER_RELEASED') {
              setCustomers((prev) =>
                prev.map((c) => {
                  if (c.id === data.customerId || (data.legacyUserId && c.legacyUserId === data.legacyUserId)) {
                    return {
                      ...c,
                      poolStatus: 'AVAILABLE',
                      claimedByStaffId: null,
                      claimedByStaffName: null,
                      claimExpiresAt: null,
                      canClaim: true,
                      isClaimedByMe: false,
                    };
                  }
                  return c;
                })
              );
            } else if (data.type === 'CUSTOMERS_RELEASED') {
              const releasedIds: number[] = data.customerIds || [];
              setCustomers((prev) =>
                prev.map((c) => {
                  if (releasedIds.includes(c.id)) {
                    return {
                      ...c,
                      poolStatus: 'AVAILABLE',
                      claimedByStaffId: null,
                      claimedByStaffName: null,
                      claimExpiresAt: null,
                      canClaim: true,
                      isClaimedByMe: false,
                    };
                  }
                  return c;
                })
              );
            } else if (data.type === 'CUSTOMER_STATUS_UPDATED') {
              setCustomers((prev) => {
                const currentFilter = selectedPoolStatusRef.current;
                const updated = prev.map((c) => {
                  if (c.id === data.customerId || (data.legacyUserId && c.legacyUserId === data.legacyUserId)) {
                    return {
                      ...c,
                      poolStatus: data.poolStatus,
                      claimedByStaffId: null,
                      claimedByStaffName: null,
                      claimExpiresAt: null,
                      canClaim: false,
                      isClaimedByMe: false,
                    };
                  }
                  return c;
                });
                if (currentFilter && currentFilter !== 'ALL') {
                  return updated.filter((c) => c.poolStatus === currentFilter);
                }
                return updated;
              });
              fetchSharedPoolOverview(undefined, true);
              if (
                auditCustomerRef.current &&
                (auditCustomerRef.current.id === data.customerId ||
                  auditCustomerRef.current.legacyUserId === data.legacyUserId)
              ) {
                const targetId = auditCustomerRef.current.id || auditCustomerRef.current.legacyUserId;
                if (campaign?.id && targetId) {
                  apiClient.campaigns
                    .getSharedPoolLogs(campaign.id, targetId)
                    .then((logs) => {
                      setAuditLogs(logs);
                    })
                    .catch(() => {});
                }
              }
            } else if (['BATCH_ADVANCED', 'POOL_PAUSED', 'POOL_RESUMED', 'OVERVIEW_UPDATED'].includes(data.type)) {
              fetchSharedPoolOverview(undefined, true);
              fetchCampaignCustomers(true);
            }
          } catch (e) {
            console.error('Failed to parse shared pool ws message:', e);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        console.error('Failed to create shared pool ws:', err);
      }
    };

    connectWs();

    // Safety fallback polling (15s interval)
    const interval = setInterval(() => {
      fetchSharedPoolOverview(undefined, true);
      fetchCampaignCustomers(true);
    }, 15000);

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [campaign?.id, campaign?.operationMode, currentUser?.id, fetchCampaignCustomers, fetchSharedPoolOverview]);

  // Shared Pool Handlers
  const handleClaimCustomer = async (record: any) => {
    if (!campaign?.id) return;
    const targetId = record.id || record.legacyUserId;
    setActionLoadingId(targetId);
    try {
      const res = await apiClient.campaigns.claimSharedCustomer(campaign.id, { customerId: targetId });
      message.success(res.message || 'Đã nhận khách vào xử lý!');
      // Optimistically update local customer state so CLAIMED status and "Gọi khách" button immediately appear
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === targetId || (record.legacyUserId && c.legacyUserId === record.legacyUserId)) {
            return {
              ...c,
              poolStatus: 'CLAIMED',
              claimedByStaffId: currentUser?.id,
              claimedByStaffName: currentUser?.displayName || currentUser?.username,
              claimedAt: new Date().toISOString(),
              claimExpiresAt:
                (res as any)?.customer?.claimExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              isClaimedByMe: true,
              canClaim: false,
              canCall: true,
            };
          }
          return c;
        })
      );
      await Promise.all([fetchCampaignCustomers(true), fetchSharedPoolOverview(undefined, true)]);
    } catch (err: any) {
      console.error('Claim customer error:', err);
      message.error(err?.response?.data?.message || 'Không thể nhận khách hàng');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCallClaimedCustomer = (record: any) => {
    const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
    if (!phone) {
      message.warning('Khách hàng không có số điện thoại để gọi.');
      return;
    }
    const customerName = record.customerName || record.name || `Khách hàng #${record.legacyUserId}`;
    makeCall(phone, customerName, record.legacyUserId);
  };

  const handleReleaseCustomer = async (record: any) => {
    if (!campaign?.id) return;
    const targetId = record.id || record.legacyUserId;
    setActionLoadingId(targetId);
    try {
      const res = await apiClient.campaigns.releaseSharedCustomer(campaign.id, { customerId: targetId });
      message.success(res.message || 'Đã nhả khách về Shared Pool!');
      await Promise.all([fetchCampaignCustomers(), fetchSharedPoolOverview()]);
    } catch (err: any) {
      console.error('Release customer error:', err);
      message.error(err?.response?.data?.message || 'Không thể nhả khách hàng');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenAuditLogs = async (record: any) => {
    if (!campaign?.id) return;
    setAuditCustomer(record);
    setAuditDrawerOpen(true);
    setAuditLogsLoading(true);
    try {
      const targetId = record.id || record.legacyUserId;
      const logs = await apiClient.campaigns.getSharedPoolLogs(campaign.id, targetId);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
      message.error('Không thể tải lịch sử tương tác');
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const handleAdvanceBatch = async () => {
    if (!campaign?.id) return;
    try {
      const res = await apiClient.campaigns.advanceSharedPoolBatch(campaign.id);
      message.success(res.message || 'Đã mở Batch tiếp theo!');
      await Promise.all([fetchSharedPoolOverview(), fetchCampaignCustomers()]);
    } catch (err: any) {
      console.error('Advance batch error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển Batch');
    }
  };

  const handleTogglePause = async (isPaused: boolean) => {
    if (!campaign?.id) return;
    try {
      const res = await apiClient.campaigns.toggleSharedPoolPause(campaign.id, { isPaused });
      message.success(res.message || 'Đã cập nhật trạng thái Shared Pool!');
      await Promise.all([fetchSharedPoolOverview(), fetchCampaignCustomers()]);
    } catch (err: any) {
      console.error('Toggle pause error:', err);
      message.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleManagerCustomerAction = async (record: any, action: 'RELEASE_CLAIM' | 'RETURN_TO_POOL' | 'EXCLUDE') => {
    if (!campaign?.id) return;
    const targetId = record.id || record.legacyUserId;
    setActionLoadingId(targetId);
    try {
      const res = await apiClient.campaigns.managerSharedPoolAction(campaign.id, {
        customerId: targetId,
        action,
      });
      message.success(res.message || 'Thao tác quản lý thành công!');
      await Promise.all([fetchCampaignCustomers(), fetchSharedPoolOverview()]);
    } catch (err: any) {
      console.error('Manager pool action error:', err);
      message.error(err?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const init = async () => {
      try {
        setLoading(true);
        const campRes: any = await apiClient.campaigns.getBySlug(slug);
        if (cancelled) return;
        setCampaign(campRes);
        setTouchpoints(campRes.touchpoints || campRes.CampaignTouchpoint || []);
        setPromotions(campRes.promotions || campRes.CampaignPromotion || []);

        if (campRes.id) {
          const promises: Promise<any>[] = [
            apiClient.campaigns.getStats(campRes.id),
            apiClient.campaigns.getCustomers(campRes.id, {
              page: currentPage,
              pageSize,
              ...(deferredSearchQuery.trim() ? { search: deferredSearchQuery.trim() } : {}),
              ...(selectedBookerId !== 'ALL' ? { assignedStaffId: selectedBookerId } : {}),
              ...(bookingStatusFilter !== 'ALL' ? { bookingStatus: bookingStatusFilter } : {}),
            }),
          ];
          if (campRes.operationMode === 'SHARED_POOL') {
            promises.push(apiClient.campaigns.getSharedPoolOverview(campRes.id));
          }

          const settled = await Promise.allSettled(promises);
          if (cancelled) return;
          if (settled[0].status === 'fulfilled') setStats(settled[0].value as any);
          if (settled[1].status === 'fulfilled') {
            const list = Array.isArray(settled[1].value)
              ? settled[1].value
              : (settled[1].value as any)?.items || (settled[1].value as any)?.data || [];
            setCustomers(list);
            setCustomersTotal(
              Array.isArray(settled[1].value) ? list.length : Number((settled[1].value as any)?.total ?? list.length)
            );
          }
          if (campRes.operationMode === 'SHARED_POOL' && settled[2]?.status === 'fulfilled') {
            const overviewData = settled[2].value as SharedPoolOverviewStats;
            setSharedPoolOverview(overviewData);
            if (overviewData?.activeBatchNumber) {
              setSelectedBatch(overviewData.activeBatchNumber);
            }
          }
        }
        isInitializedRef.current = true;
      } catch (err) {
        console.error('Fetch campaign details error:', err);
        message.error('Không thể tải thông tin chiến dịch');
      } finally {
        setLoading(false);
        setCustomersLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!isInitializedRef.current || !campaign?.id) return;
    // Wait for the deferred query before fetching. This prevents a stale,
    // unfiltered request when the search input resets the current page.
    if (searchQuery !== deferredSearchQuery) return;
    fetchCampaignCustomers();
  }, [campaign?.id, deferredSearchQuery, fetchCampaignCustomers, searchQuery]);

  // Auto-refresh table & stats when call log, customer, booking, or call state updates
  useEffect(() => {
    const handleDataRefresh = async (e?: Event) => {
      if (!isInitializedRef.current) return;
      if (campaign?.id) {
        if (campaign.operationMode === 'SHARED_POOL') {
          const detail = (e as CustomEvent)?.detail;
          const customerId = detail?.customerId;
          if (customerId) {
            try {
              await apiClient.campaigns.syncSharedPoolCall(campaign.id, customerId);
            } catch {
              // Handled by backend calls.create or non-claimed
            }
          }
          fetchSharedPoolOverview(undefined, true);
        }
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
  }, [campaign?.id, campaign?.operationMode, fetchCampaignCustomers, fetchSharedPoolOverview]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if ((callState === 'idle' || callState === 'wrapup') && campaign?.id) {
      const timer = setTimeout(() => {
        fetchCampaignCustomers();
        if (campaign.operationMode === 'SHARED_POOL') {
          fetchSharedPoolOverview(undefined, true);
        }
        apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [callState, campaign?.id, campaign?.operationMode, fetchCampaignCustomers, fetchSharedPoolOverview]);

  // Search and Booker filtering are performed by the API before pagination so the
  // table only receives the records it can render. Keep selected rows locally so
  // the "selected only" view remains available across server-paginated pages.
  const tableCustomers = useMemo(
    () => (showSelectedOnly ? Array.from(selectedCustomersByKey.values()) : customers),
    [customers, selectedCustomersByKey, showSelectedOnly]
  );

  // Toggle Touchpoint Log
  const handleToggleTouchpoint = async (
    customerId: number,
    touchpointId: number,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    callbackDate?: string
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
          return { ...cust, callbackDate: callbackDate || cust.callbackDate, touchpointLogs: newLogs };
        }
        return cust;
      })
    );

    try {
      await apiClient.campaigns.toggleTouchpointLog(campaign.id, customerId, touchpointId, {
        isChecked,
        status,
        note,
        callbackDate,
      });
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
    modal.confirm({
      title: 'Xóa khỏi chiến dịch',
      content: `Bạn có chắc chắn muốn xóa khách hàng "${customerName}" khỏi chiến dịch này và trả về Pool NYC?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await apiClient.campaigns.removeCustomer(campaign.id, customerId);
          message.success('Đã xóa khách hàng khỏi chiến dịch');
          setCustomers((prev) =>
            prev.filter((c: any) => {
              const id = Number(c.legacyUserId || c.customerId || c.id);
              return id !== Number(customerId) && c.id !== Number(customerId);
            })
          );
          fetchCampaignCustomers();
          apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
        } catch (err: any) {
          console.error('Remove customer error:', err);
          message.error(err?.response?.data?.message || err?.message || 'Không thể xóa khách hàng');
        }
      },
    });
  };

  // Batch Remove Customers from Campaign
  const handleBatchRemoveCustomers = () => {
    if (!campaign?.id || selectedRowKeys.length === 0) return;
    const count = selectedRowKeys.length;
    modal.confirm({
      title: 'Xóa hàng loạt khỏi chiến dịch',
      content: `Bạn có chắc chắn muốn xóa ${count} khách hàng đã chọn khỏi chiến dịch này và thu hồi phân bổ Booker?`,
      okText: `Xóa ${count} khách hàng`,
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const customerIds = selectedRowKeys.map((key) => Number(key)).filter((id) => !isNaN(id));
          const res = await apiClient.campaigns.removeCustomersBatch(campaign.id, { customerIds });
          message.success(res.message || `Đã xóa ${count} khách hàng khỏi chiến dịch`);
          const targetSet = new Set(customerIds);
          setCustomers((prev) =>
            prev.filter((c: any) => {
              const cId = Number(c.legacyUserId || c.customerId || c.id);
              return !targetSet.has(cId) && !targetSet.has(Number(c.id));
            })
          );
          setSelectedRowKeys([]);
          setSelectedCustomersByKey(new Map());
          fetchCampaignCustomers();
          apiClient.campaigns.getStats(campaign.id).then(setStats).catch(console.error);
        } catch (err: any) {
          console.error('Batch remove customers error:', err);
          message.error(err?.response?.data?.message || err?.message || 'Không thể xóa hàng loạt khách hàng');
        }
      },
    });
  };

  // Handle Random Customer Selection
  const handleRandomSelect = async () => {
    setRandomLoading(true);
    const countNum = typeof randomCount === 'number' && randomCount > 0 ? randomCount : 20;

    try {
      if (!campaign?.id) return;

      // Load the filtered campaign pool only when the user explicitly requests
      // a random allocation. The normal table stays server-paginated.
      const poolRes: any = await apiClient.campaigns.getCustomers(campaign.id, {
        page: 1,
        pageSize: 1000,
        ...(selectedBookerId !== 'ALL' ? { assignedStaffId: selectedBookerId } : {}),
        ...(selectedTouchpointKey !== 'ALL' ? { touchpointKey: selectedTouchpointKey } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(bookingStatusFilter !== 'ALL' ? { bookingStatus: bookingStatusFilter } : {}),
      });
      const basePool = Array.isArray(poolRes) ? poolRes : poolRes?.items || poolRes?.data || [];

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
      setSelectedCustomersByKey(
        new Map(selectedItems.map((item: any) => [item.legacyUserId || item.customerId || item.id, item]))
      );
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
      const [res, campaignCustomersRes] = await Promise.all([
        apiClient.customers.list({ bucket: 'NOT_COMBO_LIVE', limit: 100 }),
        campaign?.id ? apiClient.campaigns.getCustomers(campaign.id, { page: 1, pageSize: 1000 }) : Promise.resolve([]),
      ]);
      const items = res?.data || [];
      // Filter out existing campaign customer legacyUserIds
      const campaignCustomers = Array.isArray(campaignCustomersRes)
        ? campaignCustomersRes
        : (campaignCustomersRes as any)?.items || (campaignCustomersRes as any)?.data || [];
      const existingIds = new Set(campaignCustomers.map((c: any) => c.legacyUserId || c.customerId || c.id));
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
      const selectedLegacyUserIds = Array.from(
        new Set(selectedRowKeys.map((key) => Number(key)).filter((id) => Number.isFinite(id) && id > 0))
      );

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
      setSelectedCustomersByKey(new Map());
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
    const assigned = campaign?.assignedStaffIds;
    const hasAssignedFilter = Array.isArray(assigned) && assigned.length > 0;
    const assignedSet = hasAssignedFilter ? new Set(assigned.map((id: any) => Number(id))) : null;

    const seenNames = new Set<string>();
    return staffList
      .filter((s: any) => {
        const role = (s.role || s.staff_role || '').toLowerCase();
        const isBooker = role === 'telesales' || role === 'booker';
        if (!isBooker) return false;
        if (assignedSet && !assignedSet.has(Number(s.id))) return false;
        return true;
      })
      .filter((s: any) => {
        const nameKey = (s.displayName || s.name || s.username || '').trim().toLowerCase();
        if (!nameKey || seenNames.has(nameKey)) return false;
        seenNames.add(nameKey);
        return true;
      });
  }, [staffList, campaign?.assignedStaffIds]);

  // Touchpoints to display in table for custom campaigns (5 static steps)
  const DEFAULT_CAMPAIGN_TOUCHPOINTS: CampaignTouchpointItem[] = [
    { id: 1, key: 'step_1', label: 'Chạm D1', icon: 'Smile', sortOrder: 1 },
    { id: 2, key: 'step_2', label: 'Chạm D3', icon: 'Handshake', sortOrder: 2 },
    { id: 3, key: 'step_3', label: 'Chạm D7', icon: 'Kiss', sortOrder: 3 },
    { id: 4, key: 'step_4', label: 'Chạm D14', icon: 'Heart', sortOrder: 4 },
    { id: 5, key: 'step_5', label: 'Chạm D21', icon: 'BedDouble', sortOrder: 5 },
  ];

  const displayTouchpoints = useMemo(() => {
    const filtered = touchpoints.filter((tp) => tp.key !== 'all');
    return filtered.map((tp, idx) => ({
      id: tp.id,
      key: tp.key,
      label: tp.label?.replace(/^Chạm\s*/i, '').replace(/^Chăm sóc\s*/i, '') || tp.key,
      icon:
        tp.icon ||
        (idx === 0 ? 'Smile' : idx === 1 ? 'Handshake' : idx === 2 ? 'Kiss' : idx === 3 ? 'Heart' : 'BedDouble'),
      daysMin: tp.daysMin,
      daysMax: tp.daysMax,
      color: tp.color,
    }));
  }, [touchpoints]);

  // Customer Table Columns (Using extracted modular hook)
  const columns = useCampaignCustomerColumns({
    currentPage,
    pageSize,
    themeMode,
    token,
    displayTouchpoints,
    campaign,
    isAdmin,
    actionLoadingId,
    onSelectCustomer: setSelectedCustomer,
    onOpenCustomerDetail: () => setDetailDrawerVisible(true),
    onMakeCall: makeCall,
    onToggleTouchpoint: handleToggleTouchpoint,
    onOpenBooking: (cust: any) => {
      setBookingInitialCustomer(cust);
      setBookingWizardVisible(true);
    },
    onOpenSMS: (cust: any) => {
      setSelectedCustomer(cust);
      setSmsModalVisible(true);
    },
    onClaimCustomer: handleClaimCustomer,
    onCallClaimedCustomer: handleCallClaimedCustomer,
    onReleaseCustomer: handleReleaseCustomer,
    onOpenAuditLogs: handleOpenAuditLogs,
    onManagerCustomerAction: handleManagerCustomerAction,
    onRemoveCustomer: handleRemoveCustomer,
    onClaimExpiredLocally: handleClaimExpiredLocally,
  });

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
    <div className="responsive-page responsive-workspace nyc-campaign-detail-page">
      {modalContextHolder}
      <CampaignKpiHeaderBar
        campaign={{
          name: campaign.name,
          slug: campaign.slug,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        }}
        stats={stats}
        customersCount={customers.length}
        promotions={promotions}
        themeMode={themeMode}
        isAdmin={isAdmin}
        onBack={() => router.push('/dashboard/nyc/campaigns')}
        onEdit={handleOpenEditModal}
      />

      {/* SHARED POOL OVERVIEW & CONTROL BANNER */}
      {campaign?.operationMode === 'SHARED_POOL' && (
        <SharedPoolOverviewBanner
          overview={sharedPoolOverview}
          loading={sharedPoolLoading}
          isAdmin={isAdmin}
          onAdvanceBatch={handleAdvanceBatch}
          onTogglePause={handleTogglePause}
          onAddCustomers={handleOpenAddCustomersDrawer}
          onOpenHistoryRecovery={() => setHistoryRecoveryOpen(true)}
          onOpenExcludedDrawer={() => setExcludedDrawerOpen(true)}
          selectedBatch={selectedBatch}
          onSelectBatch={(batch) => {
            setSelectedBatch(batch);
            setCurrentPage(1);
            fetchSharedPoolOverview(batch);
          }}
          selectedPoolStatus={selectedPoolStatus}
          onSelectPoolStatus={(status) => {
            setSelectedPoolStatus(status);
            setCurrentPage(1);
          }}
          selectedStaffId={selectedBookerId === 'ALL' ? null : selectedBookerId}
          onSelectStaff={(staffId) => {
            setSelectedBookerId((prev) => (prev === staffId ? 'ALL' : staffId));
            setCurrentPage(1);
          }}
        />
      )}

      {/* Zero Touchpoints Warning Alert */}
      {campaign && touchpoints.length === 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined className="text-amber-500 text-lg" />}
          message={
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  ⚠️ Chiến dịch này chưa được cấu hình mốc điểm chạm trong CSDL!
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 m-0">
                  Vui lòng bấm nút dưới đây để cấu hình các mốc điểm chạm cho Booker/CSKH ghi nhận tiến trình chăm sóc.
                </p>
              </div>
              <Button
                type="primary"
                size="small"
                onClick={() => handleOpenEditModal('touchpoints')}
                className="bg-amber-500 hover:bg-amber-600 border-none font-semibold text-xs rounded-lg"
              >
                Cấu hình điểm chạm ngay
              </Button>
            </div>
          }
          className="mb-4 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/40"
        />
      )}

      {/* UNIFIED MINIMALIST TOOLBAR (SEARCH, BOOKER FILTER & ACTIONS - 1 SINGLE LINE) */}
      <div
        className={`px-3 py-2 rounded-xl mb-4 border transition-all duration-300 ${
          themeMode === 'dark' ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="nyc-campaign-customer-toolbar flex items-center gap-2 sm:flex-nowrap">
          <div
            className="campaign-booking-status-filter flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
            aria-label="Lọc trạng thái lịch hẹn"
          >
            {CAMPAIGN_BOOKING_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={bookingStatusFilter === option.value}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  bookingStatusFilter === option.value
                    ? option.activeClassName
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => setBookingStatusFilter(option.value)}
              >
                <span aria-hidden="true">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          <CollapsibleSearchField
            behavior="filter"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
            expandedWidth={260}
            expandButtonLabel="Mở tìm kiếm khách hàng"
            className="campaign-customer-search"
            data-ui="campaign-customer-search"
          />

          {/* Booker Filter */}
          {isAdmin && (
            <Select
              value={selectedBookerId}
              onChange={(val) => setSelectedBookerId(val)}
              size="middle"
              className="campaign-customer-booker-filter"
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'All Bookers' },
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
                className="campaign-customer-random-action"
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
              onClick={() => {
                setShowSelectedOnly((prev) => !prev);
                setCurrentPage(1);
              }}
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

          {/* Batch Actions */}
          {isAdmin && selectedRowKeys.length > 0 && (
            <Space>
              <Button
                type="primary"
                size="middle"
                icon={<TeamOutlined />}
                onClick={() => setBatchAllocationModalVisible(true)}
                style={{ fontWeight: 'bold' }}
              >
                Phân bổ Booker ({selectedRowKeys.length})
              </Button>
              <Button
                danger
                type="primary"
                size="middle"
                icon={<DeleteOutlined />}
                onClick={handleBatchRemoveCustomers}
                style={{ fontWeight: 'bold' }}
              >
                Xóa khỏi chiến dịch ({selectedRowKeys.length})
              </Button>
            </Space>
          )}
        </div>
      </div>

      <DataTable
        size="small"
        tableLayout="fixed"
        rowSelection={
          isAdmin
            ? {
                preserveSelectedRowKeys: true,
                selectedRowKeys,
                onChange: (keys, rows) => {
                  const nextKeys = new Set(keys);
                  setSelectedRowKeys(keys);
                  setSelectedCustomersByKey((previous) => {
                    const next = new Map(Array.from(previous).filter(([key]) => nextKeys.has(key)));
                    rows.forEach((record: any) => {
                      const key = record.legacyUserId || record.customerId || record.id;
                      next.set(key, record);
                    });
                    return next;
                  });
                },
              }
            : undefined
        }
        columns={columns}
        dataSource={tableCustomers}
        rowKey={(record) => record.legacyUserId || record.customerId || record.id}
        loading={customersLoading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: showSelectedOnly ? selectedCustomersByKey.size : customersTotal,
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
        columnPriority={{ customer: 'primary', booker: 'secondary', lastCallResult: 'secondary', actions: 'primary' }}
        mobileRenderer={(record: any) => {
          const customerName = record.customerName || record.name || 'Khách hàng';
          const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
          const bookerName =
            record.assignedBookerName ||
            record.assignedBooker?.name ||
            record.assignedStaff?.displayName ||
            'Chưa phân bổ';
          const callResult = record.lastCallResult || record.lastCall?.callResult;
          const callResultLabel = callResult
            ? (CALL_RESULT_LABELS as Record<string, string>)[callResult] || callResult
            : null;

          return (
            <div className="space-y-2">
              <button
                type="button"
                className="block w-full text-left font-semibold text-slate-900 dark:text-slate-100"
                onClick={() => {
                  setSelectedCustomer(record);
                  setDetailDrawerVisible(true);
                }}
              >
                {customerName}
              </button>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {phone && (
                  <span className="inline-flex items-center gap-1">
                    <span className="tabular-nums">{phone}</span>
                    <CopyPhoneButton phone={phone} size="xs" />
                  </span>
                )}
                <Tag color="cyan" className="m-0 text-[11px]">
                  {bookerName}
                </Tag>
                {callResultLabel && (
                  <Tag color="default" className="m-0 text-[11px]">
                    {callResultLabel}
                  </Tag>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {phone && (
                  <Button size="small" icon={<PhoneOutlined />} onClick={() => makeCall(phone)}>
                    Gọi
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<CalendarPlusIcon fontSize={14} />}
                  onClick={() => {
                    setBookingInitialCustomer(record);
                    setBookingWizardVisible(true);
                  }}
                >
                  Đặt lịch
                </Button>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedCustomer(record);
                    setDetailDrawerVisible(true);
                  }}
                >
                  Chi tiết
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* Admin Batch Allocation Modal */}
      <BatchAllocationModal
        open={batchAllocationModalVisible}
        onCancel={() => setBatchAllocationModalVisible(false)}
        onOk={handleBatchAllocate}
        confirmLoading={allocating}
        selectedCount={selectedRowKeys.length}
        targetBookerId={targetBookerId}
        onTargetBookerChange={setTargetBookerId}
        bookerStaffList={bookerStaffList}
      />

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
        initialCampaignPromotions={initialCampaignPromotionContext}
        onSuccess={() => {
          setBookingWizardVisible(false);
          fetchCampaignCustomers();
        }}
      />

      {/* SMS Modal */}
      <SMSModal open={smsModalVisible} onClose={() => setSmsModalVisible(false)} customer={selectedCustomer} />

      {/* Edit Campaign Modal */}
      <CampaignEditModal
        open={editCampaignModalVisible}
        onCancel={() => setEditCampaignModalVisible(false)}
        onSubmit={handleEditSubmit}
        form={editForm}
        campaign={campaign}
        submitting={editingSubmitting}
        activeTab={editModalTab}
        onTabChange={setEditModalTab}
        staffList={staffList}
        campaignFormOptionsLoading={campaignFormOptionsLoading}
        campaignFormOptionsError={campaignFormOptionsError}
        fixedFinalPriceCategories={fixedFinalPriceCategories}
        fixedFinalPriceServices={fixedFinalPriceServices}
      />

      {/* RANDOM SELECTOR MODAL */}
      <RandomSelectModal
        open={randomModalVisible}
        onCancel={() => setRandomModalVisible(false)}
        onSubmit={handleRandomSelect}
        loading={randomLoading}
        randomCount={randomCount}
        onRandomCountChange={setRandomCount}
        excludeAssigned={excludeAssigned}
        onExcludeAssignedChange={setExcludeAssigned}
        excludeUnconfirmedAllocation={excludeUnconfirmedAllocation}
        onExcludeUnconfirmedAllocationChange={setExcludeUnconfirmedAllocation}
        excludeFutureBooking={excludeFutureBooking}
        onExcludeFutureBookingChange={setExcludeFutureBooking}
        themeMode={themeMode}
      />

      {/* Shared Pool Immutable Audit Logs Drawer */}
      <SharedPoolAuditDrawer
        open={auditDrawerOpen}
        onClose={() => {
          setAuditDrawerOpen(false);
          setAuditCustomer(null);
        }}
        customer={auditCustomer}
        logs={auditLogs}
        loading={auditLogsLoading}
        onRefresh={() => {
          if (auditCustomer) {
            handleOpenAuditLogs(auditCustomer);
          }
        }}
      />

      {/* Shared Pool History & Safe Recovery Drawer (MOS-FEAT-94) */}
      <SharedPoolHistoryRecoveryDrawer
        open={historyRecoveryOpen}
        onClose={() => setHistoryRecoveryOpen(false)}
        campaignId={campaign?.id || 0}
        isAdmin={isAdmin}
        onDataChanged={() => {
          fetchCampaignCustomers();
          fetchSharedPoolOverview();
        }}
      />

      {/* Shared Pool Excluded Customers Drawer (MOS-BUG-97) */}
      <SharedPoolExcludedDrawer
        open={excludedDrawerOpen}
        onClose={() => setExcludedDrawerOpen(false)}
        campaignId={campaign?.id || 0}
        totalBatches={sharedPoolOverview?.totalBatches}
        activeBatchNumber={sharedPoolOverview?.activeBatchNumber}
        isAdmin={isAdmin}
        onDataChanged={() => {
          fetchCampaignCustomers();
          fetchSharedPoolOverview();
        }}
      />
    </div>
  );
}
