'use client';

import '../../../suppress-warnings';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  theme,
  Divider,
  InputNumber,
  Switch,
  Tabs,
} from 'antd';
import { GoogleSheetColorPicker } from '../../../../components/GoogleSheetColorPicker';
import { TouchpointIconPicker } from '../../../../components/campaign/TouchpointIconPicker';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  MinusCircleOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  TeamOutlined,
  UserOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  FolderOutlined,
  CopyOutlined,
  UndoOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { DataTable } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import {
  getFixedFinalPriceServiceCategories,
  getFixedFinalPriceServiceOptions,
  getFixedFinalPriceScopeSummary,
  splitFixedFinalPriceSelection,
  validateFixedFinalPricePromotion,
} from '../../../../lib/campaign-fixed-price';
import { normalizeCampaignAccessStaff } from '../../../../lib/campaign-form-options';
import { removeVietnameseTones } from '../../../../lib/utils/search';
import {
  Campaign,
  CampaignStatus,
  CampaignPromotionType,
  CustomerServiceFilterCategory,
  CustomerServiceFilterOption,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateCampaignTouchpointDto,
  CreateCampaignPromotionDto,
  Staff,
  vietnameseSearchFilter,
} from '@mos-lab/shared';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CampaignManagementPage() {
  const router = useRouter();
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const [showInSidebar, setShowInSidebar] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [campaignVisibilityMap, setCampaignVisibilityMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_campaign_visibility');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {}
      }
    }
    return {};
  });

  const handleToggleSidebar = (checked: boolean) => {
    setShowInSidebar(checked);
    localStorage.setItem('mos_sidebar_show_custom_campaigns', String(checked));
    window.dispatchEvent(new Event('mos_sidebar_toggle'));
  };

  const handleToggleCampaignSidebar = (campaign: Campaign, checked: boolean) => {
    const updatedMap = {
      ...campaignVisibilityMap,
      [campaign.slug]: checked,
      [String(campaign.id)]: checked,
    };
    setCampaignVisibilityMap(updatedMap);
    localStorage.setItem('mos_sidebar_campaign_visibility', JSON.stringify(updatedMap));
    window.dispatchEvent(new Event('mos_sidebar_toggle'));
    message.success(`Đã ${checked ? 'hiển thị' : 'ẩn'} link chiến dịch "${campaign.name}" trên Sidebar`);
  };

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceFilterOptions, setServiceFilterOptions] = useState<CustomerServiceFilterOption[]>([]);
  const [serviceFilterCategories, setServiceFilterCategories] = useState<CustomerServiceFilterCategory[]>([]);
  const [campaignFormOptionsLoading, setCampaignFormOptionsLoading] = useState(true);
  const [campaignFormOptionsError, setCampaignFormOptionsError] = useState<string | null>(null);

  useEffect(() => {
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

  // Load User Role & Username
  useEffect(() => {
    const storedUser = localStorage.getItem('mos_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserRole(u.role || '');
        setUserName(u.username || u.email || '');
      } catch (_) {}
    }
  }, []);

  const isAdmin =
    ['admin', 'manager', 'oc', 'ls'].includes(userRole?.toLowerCase()) ||
    userName?.toLowerCase() === 'danhdo@gmail.com' ||
    userName?.toLowerCase() === 'admin';

  // Fetch Campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter as CampaignStatus } : undefined;
      const res: any = await apiClient.campaigns.list(params);
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      setCampaigns(list);
    } catch (err) {
      console.error('Fetch campaigns error:', err);
      message.error('Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filtered campaigns by tone-insensitive search
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const query = removeVietnameseTones(searchQuery.trim().toLowerCase());
    return campaigns.filter((c) => {
      const nameMatch = removeVietnameseTones((c.name || '').toLowerCase()).includes(query);
      const slugMatch = removeVietnameseTones((c.slug || '').toLowerCase()).includes(query);
      const descMatch = removeVietnameseTones((c.description || '').toLowerCase()).includes(query);
      return nameMatch || slugMatch || descMatch;
    });
  }, [campaigns, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        slug: '',
        description: '',
        dates: null,
        status: 'ACTIVE',
        showInSidebar: true,
        touchpoints: [
          { label: 'Chạm D1', key: 'TP_D1', icon: 'Smile', daysMin: 1, daysMax: 1, color: '#34ff1a', sortOrder: 1 },
          { label: 'Chạm D3', key: 'TP_D3', icon: 'Handshake', daysMin: 3, daysMax: 3, color: '#2e1ac7', sortOrder: 2 },
          { label: 'Chạm D7', key: 'TP_D7', icon: 'Kiss', daysMin: 7, daysMax: 7, color: '#d5fb13', sortOrder: 3 },
          { label: 'Chạm D14', key: 'TP_D14', icon: 'Heart', daysMin: 14, daysMax: 14, color: '#d17d2e', sortOrder: 4 },
          {
            label: 'Chạm D21',
            key: 'TP_D21',
            icon: 'BedDouble',
            daysMin: 21,
            daysMax: 21,
            color: '#ff4d4f',
            sortOrder: 5,
          },
        ],
        promotions: [
          { name: 'Giảm 20% Dịch vụ Nối mi', type: 'PERCENT_DISCOUNT', value: 20, description: 'Ưu đãi chiến dịch' },
        ],
      });
    }, 50);
  };

  // Open Edit Modal
  const handleOpenEdit = async (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
    try {
      const details: any = await apiClient.campaigns.getById(campaign.id);
      const dates =
        details.startDate && details.endDate
          ? [dayjs(details.startDate), dayjs(details.endDate)]
          : details.startDate
            ? [dayjs(details.startDate), null]
            : null;

      const isShown =
        campaignVisibilityMap[details.slug] !== false && campaignVisibilityMap[String(details.id)] !== false;

      setTimeout(() => {
        form.resetFields();
        form.setFieldsValue({
          name: details.name,
          slug: details.slug,
          description: details.description,
          dates: dates,
          status: details.status,
          showInSidebar: isShown,
          assignedStaffIds: details.assignedStaffIds || [],
          touchpoints: (details.touchpoints || details.CampaignTouchpoint || []).map((tp: any, idx: number) => ({
            label: tp.label,
            key: tp.key,
            icon:
              tp.icon ||
              (idx === 0 ? 'Smile' : idx === 1 ? 'Handshake' : idx === 2 ? 'Kiss' : idx === 3 ? 'Heart' : 'BedDouble'),
            daysMin: tp.daysMin,
            daysMax: tp.daysMax,
            color: tp.color || '#1890ff',
            sortOrder: tp.sortOrder,
          })),
          promotions: (details.promotions || details.CampaignPromotion || []).map((promotion: any) => ({
            ...promotion,
            eligibleServiceSelection: [
              ...(promotion.eligibleServiceCategoryKeys || []).map((key: string) => `category:${key}`),
              ...(promotion.eligibleServiceIds || []).map(String),
            ],
          })),
        });
      }, 50);
    } catch (err) {
      console.error('Fetch campaign details error:', err);
      message.error('Không thể tải chi tiết chiến dịch để chỉnh sửa');
    }
  };

  // End Campaign
  const handleEndCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.endCampaign(campaign.id);
      message.success('Đã kết thúc chiến dịch thành công');
      fetchCampaigns();
    } catch (err) {
      console.error('End campaign error:', err);
      message.error('Không thể kết thúc chiến dịch');
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.delete(campaign.id);
      message.success('Đã xóa chiến dịch thành công');
      fetchCampaigns();
    } catch (err) {
      console.error('Delete campaign error:', err);
      message.error('Không thể xóa chiến dịch');
    }
  };

  // Pause Campaign
  const handlePauseCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.pause(campaign.id);
      message.success(`Đã tạm dừng chiến dịch "${campaign.name}"`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Pause campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể tạm dừng chiến dịch');
    }
  };

  // Resume / Activate Campaign
  const handleResumeCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.resume(campaign.id);
      message.success(`Đã tiếp tục/kích hoạt chiến dịch "${campaign.name}"`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Resume campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể kích hoạt chiến dịch');
    }
  };

  // Complete / End Campaign
  const handleCompleteCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.complete(campaign.id);
      message.success(`Đã hoàn thành chốt sổ chiến dịch "${campaign.name}"`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Complete campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể chốt sổ chiến dịch');
    }
  };

  // Archive Campaign
  const handleArchiveCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.archive(campaign.id);
      message.success(`Đã lưu trữ chiến dịch "${campaign.name}"`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Archive campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể lưu trữ chiến dịch');
    }
  };

  // Unarchive Campaign
  const handleUnarchiveCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.unarchive(campaign.id);
      message.success(`Đã bỏ lưu trữ chiến dịch "${campaign.name}"`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Unarchive campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể bỏ lưu trữ chiến dịch');
    }
  };

  // Reopen Campaign
  const handleReopenCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.reopen(campaign.id);
      message.success(`Đã gia hạn & mở lại chiến dịch "${campaign.name}" 30 ngày`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Reopen campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể mở lại chiến dịch');
    }
  };

  // Clone Campaign
  const handleCloneCampaign = async (campaign: Campaign) => {
    try {
      const cloned: any = await apiClient.campaigns.clone(campaign.id);
      message.success(`Đã nhân bản chiến dịch thành "${cloned?.name || 'Bản sao'}" (Nháp)`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Clone campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể nhân bản chiến dịch');
    }
  };

  // Restore Campaign
  const handleRestoreCampaign = async (campaign: Campaign) => {
    try {
      await apiClient.campaigns.restore(campaign.id);
      message.success(`Đã khôi phục chiến dịch "${campaign.name}" về trạng thái Đang hoạt động`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Restore campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể khôi phục chiến dịch');
    }
  };

  // Form Submit (Create / Edit)
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const startDate = values.dates && values.dates[0] ? values.dates[0].format('YYYY-MM-DD') : undefined;
      const endDate = values.dates && values.dates[1] ? values.dates[1].format('YYYY-MM-DD') : undefined;

      const touchpoints: CreateCampaignTouchpointDto[] = (values.touchpoints || [])
        .filter((tp: any) => tp && (tp.label || tp.key))
        .map((tp: any, index: number) => ({
          key: tp.key || `TP_${index + 1}`,
          label: tp.label || `Chạm ${index + 1}`,
          icon:
            tp.icon ||
            (index === 0
              ? 'Smile'
              : index === 1
                ? 'Handshake'
                : index === 2
                  ? 'Kiss'
                  : index === 3
                    ? 'Heart'
                    : 'BedDouble'),
          daysMin: Number(tp.daysMin) || 0,
          daysMax:
            tp.daysMax !== undefined && tp.daysMax !== null && tp.daysMax !== ''
              ? Number(tp.daysMax)
              : Number(tp.daysMin) || 0,
          color: typeof tp.color === 'string' ? tp.color : '#1890ff',
          sortOrder: index + 1,
        }));

      const promotions: CreateCampaignPromotionDto[] = (values.promotions || [])
        .filter((p: any) => p && p.name && String(p.name).trim() !== '')
        .map((p: any) => {
          const type = (p.type || 'PERCENT_DISCOUNT') as CampaignPromotionType;
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
            name: String(p.name).trim(),
            code: p.code ? String(p.code).trim() : undefined,
            type,
            value,
            eligibleServiceIds: type === 'FIXED_FINAL_PRICE' ? eligibleServiceIds : undefined,
            eligibleServiceCategoryKeys: type === 'FIXED_FINAL_PRICE' ? eligibleServiceCategoryKeys : undefined,
            description: p.description ? String(p.description).trim() : undefined,
          };
        });

      if (editingCampaign) {
        const updateDto: UpdateCampaignDto = {
          name: values.name,
          description: values.description,
          startDate,
          endDate,
          status: values.status,
          assignedStaffIds: values.assignedStaffIds || null,
          touchpoints,
          promotions,
        };
        await apiClient.campaigns.update(editingCampaign.id, updateDto);
        message.success('Đã cập nhật chiến dịch thành công');
      } else {
        const createDto: CreateCampaignDto = {
          name: values.name,
          slug: values.slug || undefined,
          description: values.description,
          startDate,
          endDate,
          status: values.status || 'ACTIVE',
          assignedStaffIds: values.assignedStaffIds || null,
          touchpoints,
          promotions,
        };
        await apiClient.campaigns.create(createDto);
        message.success('Tạo chiến dịch mới thành công');
      }

      if (values.showInSidebar !== undefined) {
        const targetSlug = editingCampaign ? editingCampaign.slug : values.slug;
        if (targetSlug) {
          const updatedMap: Record<string, boolean> = {
            ...campaignVisibilityMap,
            [targetSlug]: values.showInSidebar,
          };
          if (editingCampaign) {
            updatedMap[String(editingCampaign.id)] = values.showInSidebar;
          }
          setCampaignVisibilityMap(updatedMap);
          localStorage.setItem('mos_sidebar_campaign_visibility', JSON.stringify(updatedMap));
          window.dispatchEvent(new Event('mos_sidebar_toggle'));
        }
      }

      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Submit campaign error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Thao tác thất bại';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusTag = (status: CampaignStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">📝 NHÁP</Tag>;
      case 'SCHEDULED':
        return <Tag color="processing">⏰ LÊN LỊCH</Tag>;
      case 'ACTIVE':
        return <Tag color="success">🟢 ĐANG CHẠY</Tag>;
      case 'PAUSED':
        return <Tag color="warning">⏸️ TẠM DỪNG</Tag>;
      case 'COMPLETED':
      case 'ENDED':
        return <Tag color="purple">🏁 HOÀN THÀNH</Tag>;
      case 'ARCHIVED':
        return <Tag color="magenta">📦 LƯU TRỮ</Tag>;
      case 'DELETED':
        return <Tag color="error">🗑️ ĐÃ XÓA</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Tên chiến dịch',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Campaign) => (
        <div>
          <div
            className="font-bold cursor-pointer hover:underline text-amber-600 dark:text-amber-400"
            onClick={() => router.push(`/dashboard/nyc/campaigns/${record.slug}`)}
          >
            {text}
          </div>
          <div className="text-xs text-gray-500 font-mono">slug: {record.slug}</div>
          {record.description && <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'dates',
      render: (_: any, record: Campaign) => {
        const start = record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : 'Tùy chỉnh';
        const end = record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Không giới hạn';
        return (
          <div className="text-xs tabular-nums">
            <div>
              <CalendarOutlined className="mr-1 text-gray-400" />
              {start} - {end}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: CampaignStatus) => renderStatusTag(status),
    },
    {
      title: 'Quyền truy cập',
      key: 'access',
      render: (_: any, record: Campaign) => {
        const count = record.assignedStaffIds?.length || 0;
        if (count === 0) {
          return <Tag color="blue">🌐 Công khai (Tất cả)</Tag>;
        }
        return (
          <Tooltip title={`Chỉ Admin và ${count} thành viên được gán mới có quyền xem`}>
            <Tag color="purple">🔒 Riêng tư ({count} thành viên)</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Hiện Sidebar',
      key: 'showInSidebar',
      align: 'center' as const,
      render: (_: any, record: Campaign) => {
        const isShown =
          campaignVisibilityMap[record.slug] !== false && campaignVisibilityMap[String(record.id)] !== false;
        return (
          <Tooltip
            title={isShown ? 'Đang hiện link ở Sidebar (Click để ẩn)' : 'Đang ẩn link ở Sidebar (Click để hiện)'}
          >
            <Switch
              size="small"
              checked={isShown}
              onChange={(checked) => handleToggleCampaignSidebar(record, checked)}
              style={{ backgroundColor: isShown ? '#10b981' : undefined }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng KH',
      key: 'totalCustomers',
      align: 'right' as const,
      render: (_: any, record: Campaign) => (
        <span className="tabular-nums font-semibold">{record._count?.customers ?? 0}</span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      width: 240,
      render: (_: any, record: Campaign) => (
        <Space size={4} align="center">
          <Tooltip title="Xem chi tiết chiến dịch">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/dashboard/nyc/campaigns/${record.slug}`)}
            />
          </Tooltip>
          {isAdmin && (
            <>
              {['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED'].includes(record.status) && (
                <Tooltip title="Chỉnh sửa chiến dịch">
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
                </Tooltip>
              )}
              {['DRAFT', 'SCHEDULED', 'PAUSED'].includes(record.status) && (
                <Tooltip title={record.status === 'PAUSED' ? 'Tiếp tục chiến dịch' : 'Kích hoạt ngay'}>
                  <Button
                    size="small"
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleResumeCampaign(record)}
                  />
                </Tooltip>
              )}
              {record.status === 'ACTIVE' && (
                <Tooltip title="Tạm dừng chiến dịch">
                  <Button
                    size="small"
                    className="bg-amber-500 text-white hover:bg-amber-400 font-bold"
                    icon={<PauseCircleOutlined />}
                    onClick={() => handlePauseCampaign(record)}
                  />
                </Tooltip>
              )}
              {['ACTIVE', 'PAUSED'].includes(record.status) && (
                <Popconfirm
                  title="Chốt / Hoàn thành chiến dịch?"
                  description="Khách hàng chưa booked sẽ được hoàn trả về NYC main pool."
                  onConfirm={() => handleCompleteCampaign(record)}
                  okText="Chốt sổ"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Chốt & Hoàn thành">
                    <Button size="small" danger icon={<CheckCircleOutlined />} />
                  </Tooltip>
                </Popconfirm>
              )}
              {['COMPLETED', 'ENDED'].includes(record.status) && (
                <Tooltip title="Lưu trữ chiến dịch">
                  <Button size="small" icon={<FolderOutlined />} onClick={() => handleArchiveCampaign(record)} />
                </Tooltip>
              )}
              {record.status === 'ARCHIVED' && (
                <Tooltip title="Bỏ lưu trữ">
                  <Button size="small" icon={<UndoOutlined />} onClick={() => handleUnarchiveCampaign(record)} />
                </Tooltip>
              )}
              {['COMPLETED', 'ENDED', 'ARCHIVED'].includes(record.status) && (
                <Tooltip title="Mở lại / Gia hạn">
                  <Button
                    size="small"
                    className="bg-blue-600 text-white hover:bg-blue-500"
                    icon={<ReloadOutlined />}
                    onClick={() => handleReopenCampaign(record)}
                  />
                </Tooltip>
              )}
              {(record.status as string) === 'DELETED' && (
                <Tooltip title="Khôi phục chiến dịch">
                  <Button
                    size="small"
                    className="bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
                    icon={<UndoOutlined />}
                    onClick={() => handleRestoreCampaign(record)}
                  />
                </Tooltip>
              )}
              <Tooltip title="Nhân bản chiến dịch">
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleCloneCampaign(record)} />
              </Tooltip>
              <Popconfirm
                title="Xóa chiến dịch?"
                description="Bạn có chắc chắn muốn xóa chiến dịch này không?"
                onConfirm={() => handleDeleteCampaign(record)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa chiến dịch">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="responsive-page responsive-workspace nyc-campaigns-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title
            level={2}
            style={{
              color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
              margin: 0,
              fontWeight: 'bold',
            }}
          >
            <ClockCircleOutlined /> Quản lý Chiến dịch NYC
          </Title>
          <Text type="secondary">Thiết lập và theo dõi các chiến dịch chăm sóc khách hàng NYC đặc biệt.</Text>
        </div>
        <Space wrap size="middle">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-semibold ${
              themeMode === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <span className={themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              Hiện link chiến dịch ở Sidebar:
            </span>
            <Switch
              checked={showInSidebar}
              onChange={handleToggleSidebar}
              size="small"
              style={{ backgroundColor: showInSidebar ? '#10b981' : undefined }}
            />
          </div>

          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              style={{
                backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                fontWeight: 'bold',
              }}
              onClick={handleOpenCreate}
            >
              Tạo chiến dịch mới
            </Button>
          )}
        </Space>
      </div>

      {/* Filter Bar */}
      <Card
        style={{
          background: themeMode === 'dark' ? '#111827' : '#ffffff',
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: '20px',
          borderRadius: '8px',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Tìm kiếm chiến dịch (Tên, Slug, Mô tả)..."
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: '100%' }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: '🟢 Đang hoạt động (ACTIVE)' },
                { value: 'PAUSED', label: '⏸️ Tạm dừng (PAUSED)' },
                { value: 'SCHEDULED', label: '⏰ Lên lịch (SCHEDULED)' },
                { value: 'DRAFT', label: '📝 Nháp (DRAFT)' },
                { value: 'COMPLETED', label: '🏁 Đã hoàn thành (COMPLETED)' },
                { value: 'ARCHIVED', label: '📦 Lưu trữ (ARCHIVED)' },
                { value: 'DELETED', label: '🗑️ Đã xóa (DELETED)' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={6} className="text-right">
            <Text type="secondary" className="tabular-nums">
              Hiển thị <strong>{filteredCampaigns.length}</strong> chiến dịch
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Campaign Cards / Table */}
      <DataTable
        columns={columns}
        dataSource={filteredCampaigns}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (t) => `Tổng số: ${t} chiến dịch`,
        }}
        className="antd-custom-table"
        stickyPrimaryColumn
      />

      {/* Create / Edit Campaign Modal */}
      <Modal
        title={
          <div className="font-bold text-lg">
            {editingCampaign ? 'Chỉnh sửa chiến dịch NYC' : 'Tạo chiến dịch NYC mới'}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={(errorInfo) => {
            console.error('Campaign form validation failed:', errorInfo);
            message.error('Vui lòng kiểm tra lại các thông tin bắt buộc (Tên chiến dịch, Điểm chạm, Ưu đãi)');
          }}
          className="mt-4"
        >
          <Tabs
            defaultActiveKey="info"
            className="campaign-minimal-tabs"
            items={[
              {
                key: 'info',
                label: (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <SettingOutlined className="text-slate-500" /> Thông tin
                  </span>
                ),
                children: (
                  <div className="pt-2 space-y-4">
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
                        <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
                          <Select
                            options={[
                              { value: 'DRAFT', label: '📝 DRAFT (Nháp)' },
                              { value: 'SCHEDULED', label: '⏰ SCHEDULED (Lên lịch)' },
                              { value: 'ACTIVE', label: '🟢 ACTIVE (Đang hoạt động)' },
                              { value: 'PAUSED', label: '⏸️ PAUSED (Tạm dừng)' },
                              { value: 'COMPLETED', label: '🏁 COMPLETED (Hoàn thành)' },
                              { value: 'ARCHIVED', label: '📦 ARCHIVED (Lưu trữ)' },
                              { value: 'DELETED', label: '🗑️ DELETED (Đã xóa)' },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả chiến dịch">
                      <Input.TextArea rows={2} placeholder="Mô tả ngắn gọn về mục tiêu và quy định của chiến dịch..." />
                    </Form.Item>

                    <Form.Item
                      name="showInSidebar"
                      label="Hiển thị link ở Sidebar menu"
                      valuePropName="checked"
                      tooltip="Bật switch này để hiển thị đường dẫn của chiến dịch ở menu bên trái."
                    >
                      <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" style={{ backgroundColor: '#10b981' }} />
                    </Form.Item>

                    <Form.Item
                      name="assignedStaffIds"
                      label={
                        <span className="inline-flex items-center gap-1.5">
                          <TeamOutlined className="text-blue-500" />
                          <span>Thành viên được phép truy cập (Team Booker)</span>
                        </span>
                      }
                      tooltip="Chọn các nhân sự thuộc Team Booker được phép xem và thao tác trên chiến dịch này. Nếu để trống, tất cả nhân sự đều xem được."
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        loading={campaignFormOptionsLoading}
                        placeholder="Chừa trống = Công Khai (Tất cả nhân sự xem được)"
                        filterOption={vietnameseSearchFilter}
                        optionFilterProp="label"
                        notFoundContent={
                          campaignFormOptionsLoading
                            ? 'Đang tải thành viên...'
                            : campaignFormOptionsError || 'Không có nhân sự hoạt động'
                        }
                        style={{ width: '100%' }}
                        tagRender={(props) => {
                          const { label, closable, onClose } = props;
                          const cleanLabel = typeof label === 'string' ? label.split('(')[0].trim() : label;
                          return (
                            <Tag
                              color="blue"
                              closable={closable}
                              onClose={onClose}
                              style={{ marginRight: 4 }}
                              className="rounded-md font-medium text-xs py-0.5 px-2 inline-flex items-center gap-1"
                            >
                              <UserOutlined className="text-blue-500 text-xs" />
                              <span>{cleanLabel}</span>
                            </Tag>
                          );
                        }}
                        options={staffList.map((s) => ({
                          value: s.id,
                          label: `${s.displayName || s.username} (${s.username})`,
                        }))}
                      />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: 'touchpoints',
                label: (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <EnvironmentOutlined className="text-rose-500 text-base" /> Điểm chạm
                  </span>
                ),
                children: (
                  <div className="pt-2">
                    <Form.List name="touchpoints">
                      {(fields, { add, remove }) => (
                        <div>
                          {fields.length > 0 && (
                            <div className="flex items-center gap-2 px-1 py-1.5 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex-1 min-w-[120px]">Tên điểm chạm</div>
                              <div className="w-[140px] text-center">Biểu tượng (Icon)</div>
                              <div className="w-16 text-center">Từ ngày</div>
                              <div className="w-16 text-center">Đến ngày</div>
                              <div className="w-[95px] text-center">Màu sắc</div>
                              <div className="w-8 text-center">Xóa</div>
                            </div>
                          )}
                          <div className="space-y-2">
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} className="flex items-center gap-2 py-0.5">
                                <div className="flex-1 min-w-[120px]">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'label']}
                                    rules={[{ required: true, message: 'Nhập tên' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Tên chạm (VD: Chạm D1)" />
                                  </Form.Item>
                                </div>
                                <div className="w-[140px]">
                                  <Form.Item {...restField} name={[name, 'icon']} style={{ marginBottom: 0 }}>
                                    <TouchpointIconPicker size="small" />
                                  </Form.Item>
                                </div>
                                <div className="w-16">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'daysMin']}
                                    rules={[{ required: true, message: 'Nhập ngày' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber min={0} placeholder="D+" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <div className="w-16">
                                  <Form.Item {...restField} name={[name, 'daysMax']} style={{ marginBottom: 0 }}>
                                    <InputNumber min={0} placeholder="D+" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <div className="w-[95px] flex justify-center">
                                  <Form.Item {...restField} name={[name, 'color']} style={{ marginBottom: 0 }}>
                                    <GoogleSheetColorPicker size="small" />
                                  </Form.Item>
                                </div>
                                <div className="w-8 flex justify-center">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<MinusCircleOutlined />}
                                    onClick={() => remove(name)}
                                  />
                                </div>
                              </div>
                            ))}
                            <Button
                              type="dashed"
                              onClick={() => {
                                const nextIdx = fields.length;
                                const defaultIcon =
                                  nextIdx === 0
                                    ? 'Smile'
                                    : nextIdx === 1
                                      ? 'Handshake'
                                      : nextIdx === 2
                                        ? 'Kiss'
                                        : nextIdx === 3
                                          ? 'Heart'
                                          : nextIdx === 4
                                            ? 'BedDouble'
                                            : 'Sparkles';
                                add({ color: '#3b82f6', daysMin: 1, icon: defaultIcon });
                              }}
                              block
                              icon={<PlusOutlined />}
                              className="rounded-xl h-10 border-dashed mt-2"
                            >
                              Thêm điểm chạm mới
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.List>
                  </div>
                ),
              },
              {
                key: 'promotions',
                label: (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <GiftOutlined className="text-amber-500 text-base" /> Ưu đãi
                  </span>
                ),
                children: (
                  <div className="pt-2">
                    <Form.List name="promotions">
                      {(fields, { add, remove }) => (
                        <div>
                          {fields.length > 0 && (
                            <div className="flex items-center gap-2 px-1 py-1.5 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex-1">Tên ưu đãi</div>
                              <div className="w-36 text-left">Loại ưu đãi</div>
                              <div className="w-24 text-center">Giá trị</div>
                              <div className="w-28 text-left">Mã voucher</div>
                              <div className="w-8 text-center">Xóa</div>
                            </div>
                          )}
                          <div className="space-y-2">
                            {fields.map(({ key, name, ...restField }) => (
                              <React.Fragment key={key}>
                                <div className="flex items-center gap-2 py-0.5">
                                  <div className="flex-1">
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'name']}
                                      rules={[{ required: true, message: 'Nhập tên' }]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="Tên ưu đãi (VD: Giảm 50%)" />
                                    </Form.Item>
                                  </div>
                                  <div className="w-36">
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'type']}
                                      rules={[{ required: true, message: 'Chọn loại' }]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Select
                                        options={[
                                          { value: 'PERCENT_DISCOUNT', label: 'Giảm %' },
                                          { value: 'FIXED_DISCOUNT', label: 'Giảm số tiền' },
                                          { value: 'FIXED_FINAL_PRICE', label: 'Giá đồng nhất' },
                                          { value: 'FREE_SERVICE', label: 'Tặng dịch vụ' },
                                          { value: 'FREE_PRODUCT', label: 'Tặng sản phẩm' },
                                        ]}
                                      />
                                    </Form.Item>
                                  </div>
                                  <div className="w-24">
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'value']}
                                      rules={[{ required: true, message: 'Nhập giá trị' }]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <InputNumber min={0} placeholder="Giá trị" style={{ width: '100%' }} />
                                    </Form.Item>
                                  </div>
                                  <div className="w-28">
                                    <Form.Item {...restField} name={[name, 'code']} style={{ marginBottom: 0 }}>
                                      <Input placeholder="Mã Code" />
                                    </Form.Item>
                                  </div>
                                  <div className="w-8 flex justify-center">
                                    <Button
                                      type="text"
                                      danger
                                      icon={<MinusCircleOutlined />}
                                      onClick={() => remove(name)}
                                    />
                                  </div>
                                </div>
                                <Form.Item
                                  noStyle
                                  shouldUpdate={(previous, current) =>
                                    previous.promotions?.[name]?.type !== current.promotions?.[name]?.type ||
                                    previous.promotions?.[name]?.eligibleServiceSelection !==
                                      current.promotions?.[name]?.eligibleServiceSelection ||
                                    previous.promotions?.[name]?.value !== current.promotions?.[name]?.value
                                  }
                                >
                                  {({ getFieldValue }) => {
                                    const selection = splitFixedFinalPriceSelection(
                                      getFieldValue(['promotions', name, 'eligibleServiceSelection'])
                                    );
                                    const scope = getFixedFinalPriceScopeSummary(
                                      selection.eligibleServiceIds,
                                      selection.eligibleServiceCategoryKeys,
                                      fixedFinalPriceServices,
                                      fixedFinalPriceCategories
                                    );
                                    return getFieldValue(['promotions', name, 'type']) === 'FIXED_FINAL_PRICE' ? (
                                      <div className="ml-1 mr-10 mb-2 rounded-lg border border-violet-200 bg-violet-50/70 p-2.5 dark:border-violet-500/30 dark:bg-violet-500/10">
                                        <Form.Item
                                          {...restField}
                                          name={[name, 'eligibleServiceSelection']}
                                          label="Dịch vụ / thể loại nối mi áp dụng"
                                          rules={[
                                            {
                                              required: true,
                                              type: 'array',
                                              min: 1,
                                              message: 'Chọn ít nhất một dịch vụ lẻ nối mi hoặc thể loại.',
                                            },
                                          ]}
                                          style={{ marginBottom: 0 }}
                                        >
                                          <Select
                                            mode="multiple"
                                            allowClear
                                            showSearch
                                            loading={campaignFormOptionsLoading}
                                            filterOption={vietnameseSearchFilter}
                                            placeholder="Chọn thể loại (VD: HyperLight) hoặc dịch vụ cụ thể"
                                            optionFilterProp="label"
                                            notFoundContent={
                                              campaignFormOptionsLoading
                                                ? 'Đang tải dịch vụ từ Bộ lọc nâng cao...'
                                                : campaignFormOptionsError ||
                                                  'Không có dịch vụ lẻ nối mi hoặc thể loại hợp lệ'
                                            }
                                            options={[
                                              {
                                                label: 'Thể loại dịch vụ',
                                                options: fixedFinalPriceCategories.map((category) => ({
                                                  value: `category:${category.key}`,
                                                  label: `${category.label} — ${category.serviceIds.length} dịch vụ, giá từ ${category.minimumPrice.toLocaleString('vi-VN')}đ`,
                                                })),
                                              },
                                              {
                                                label: 'Dịch vụ cụ thể',
                                                options: fixedFinalPriceServices.map((service) => ({
                                                  value: String(service.id),
                                                  label: `${service.name} — ${service.price.toLocaleString('vi-VN')}đ`,
                                                })),
                                              },
                                            ]}
                                          />
                                        </Form.Item>
                                        <Text type="secondary" className="mt-1 block text-xs">
                                          Chọn HyperLight sẽ áp dụng toàn bộ biến thể nối mi Normal của HyperLight. Dùng
                                          cùng catalog với Bộ lọc nâng cao ở Tất cả KH; giá chốt không cộng dồn ưu đãi
                                          khác.
                                        </Text>
                                        {scope.minimumListedPrice !== null && (
                                          <Text className="mt-1 block text-xs text-violet-700 dark:text-violet-200">
                                            Phạm vi hiện tại: {scope.services.length} dịch vụ. Giá đồng nhất tối đa:{' '}
                                            {scope.minimumListedPrice.toLocaleString('vi-VN')}đ.
                                          </Text>
                                        )}
                                      </div>
                                    ) : null;
                                  }}
                                </Form.Item>
                              </React.Fragment>
                            ))}
                            <Button
                              type="dashed"
                              onClick={() => add({ type: 'PERCENT_DISCOUNT', value: 50 })}
                              block
                              icon={<PlusOutlined />}
                              className="rounded-xl h-10 border-dashed mt-2"
                            >
                              Thêm ưu đãi mới
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.List>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" onClick={() => form.submit()} loading={submitting}>
              {editingCampaign ? 'Cập nhật chiến dịch' : 'Tạo chiến dịch'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
