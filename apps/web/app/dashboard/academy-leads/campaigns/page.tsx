'use client';

import React from 'react';
import { Button, Dropdown, Select, Space, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Archive,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Copy,
  Ellipsis,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type AcademyCampaign,
  type AcademyCampaignStatus,
  type AcademyCourse,
  type AcademyStaffOption,
  type CreateAcademyCampaignRequest,
  type UpdateAcademyCampaignRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  DataTable,
  FeaturePage,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
} from '../../../../components/ui';
import AcademyCampaignFormDrawer, { type AcademyCampaignFormPayload } from './components/AcademyCampaignFormDrawer';
import { useAcademyAccess } from '../components/AcademyAccessGate';
import {
  ACADEMY_CAMPAIGN_STATUS_LABELS,
  ACADEMY_CAMPAIGN_STATUS_OPTIONS,
  ACADEMY_CAMPAIGN_STATUS_TONES,
  formatCampaignDateRange,
  readAcademyUserRole,
} from './components/academy-campaign-utils';

type CampaignListQuery = {
  page: number;
  pageSize: number;
  search: string;
  status: AcademyCampaignStatus | 'ALL';
};

const LIST_STORAGE_KEY = 'academy-sales-campaigns:list-query:v1';
const DEFAULT_QUERY: CampaignListQuery = { page: 1, pageSize: 20, search: '', status: 'ALL' };

function readListQuery(): CampaignListQuery {
  if (typeof window === 'undefined') return DEFAULT_QUERY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIST_STORAGE_KEY) || '{}') as Partial<CampaignListQuery>;
    return {
      page: Math.max(1, Number(parsed.page) || DEFAULT_QUERY.page),
      pageSize: [10, 20, 50, 100].includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : DEFAULT_QUERY.pageSize,
      search: typeof parsed.search === 'string' ? parsed.search : '',
      status:
        parsed.status && ['ALL', ...Object.keys(ACADEMY_CAMPAIGN_STATUS_LABELS)].includes(parsed.status)
          ? (parsed.status as CampaignListQuery['status'])
          : 'ALL',
    };
  } catch {
    return DEFAULT_QUERY;
  }
}

function campaignMobileCard(campaign: AcademyCampaign, onOpen: (campaign: AcademyCampaign) => void) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-inherit p-3 text-left"
      onClick={() => onOpen(campaign)}
    >
      <div className="flex items-start justify-between gap-2">
        <strong>{campaign.name}</strong>
        <StatusTag
          status={ACADEMY_CAMPAIGN_STATUS_TONES[campaign.status]}
          label={ACADEMY_CAMPAIGN_STATUS_LABELS[campaign.status]}
        />
      </div>
      <div className="mt-2 text-xs opacity-70">{formatCampaignDateRange(campaign.startDate, campaign.endDate)}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="tabular-nums">{(campaign._count?.leads || 0).toLocaleString('vi-VN')} lead</span>
        <span className="tabular-nums">{(campaign._count?.touchpoints || 0).toLocaleString('vi-VN')} điểm chạm</span>
      </div>
    </button>
  );
}

export default function AcademyCampaignsPage() {
  const { canAccess: academyAllowed, canManage } = useAcademyAccess();
  const router = useRouter();
  const [role, setRole] = React.useState('');
  const [hydrated, setHydrated] = React.useState(false);
  const [query, setQuery] = React.useState<CampaignListQuery>(DEFAULT_QUERY);
  const [campaigns, setCampaigns] = React.useState<AcademyCampaign[]>([]);
  const [total, setTotal] = React.useState(0);
  const [staff, setStaff] = React.useState<AcademyStaffOption[]>([]);
  const [courses, setCourses] = React.useState<AcademyCourse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formCampaign, setFormCampaign] = React.useState<AcademyCampaign | null | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);
  const requestVersionRef = React.useRef(0);
  const deferredSearch = React.useDeferredValue(query.search);

  React.useEffect(() => {
    setRole(readAcademyUserRole());
    setQuery(readListQuery());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(query));
  }, [hydrated, query]);

  const canConfigure = canManage;

  const loadCampaigns = React.useCallback(async () => {
    if (!hydrated || !academyAllowed) return;
    const version = ++requestVersionRef.current;
    setLoading(true);
    try {
      const response = await apiClient.academySales.campaigns.list({
        page: query.page,
        limit: query.pageSize,
        status: query.status,
        search: deferredSearch || undefined,
      });
      if (version !== requestVersionRef.current) return;
      setCampaigns(response.data);
      setTotal(response.total);
      setError(null);
    } catch (loadError: any) {
      if (version !== requestVersionRef.current) return;
      setError(loadError?.response?.data?.message || 'Không thể tải danh sách chiến dịch Academy.');
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, [academyAllowed, deferredSearch, hydrated, query.page, query.pageSize, query.status]);

  React.useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  React.useEffect(() => {
    if (!hydrated || !academyAllowed) return;
    void Promise.all([apiClient.academySales.listStaff(), apiClient.academySales.listCourses()])
      .then(([nextStaff, nextCourses]) => {
        setStaff(nextStaff);
        setCourses(nextCourses);
      })
      .catch(() => {
        setStaff([]);
        setCourses([]);
      });
  }, [academyAllowed, hydrated]);

  const patchQuery = React.useCallback((patch: Partial<CampaignListQuery>, resetPage = false) => {
    setQuery((previous) => ({ ...previous, ...patch, page: resetPage ? 1 : (patch.page ?? previous.page) }));
  }, []);

  const openCampaign = React.useCallback(
    (campaign: AcademyCampaign) => router.push(`/dashboard/academy-leads/campaigns/${campaign.slug}`),
    [router]
  );

  const updateLifecycle = React.useCallback(
    async (campaign: AcademyCampaign, status: AcademyCampaignStatus) => {
      try {
        const result = await apiClient.academySales.campaigns.setStatus(campaign.id, status);
        message.success(result.message || 'Đã cập nhật trạng thái chiến dịch.');
        await loadCampaigns();
      } catch (actionError: any) {
        message.error(actionError?.response?.data?.message || 'Không thể cập nhật trạng thái chiến dịch.');
      }
    },
    [loadCampaigns]
  );

  const archiveCampaign = React.useCallback(
    async (campaign: AcademyCampaign) => {
      try {
        const result = await apiClient.academySales.campaigns.archive(campaign.id);
        message.success(result.message || 'Đã lưu trữ chiến dịch.');
        await loadCampaigns();
      } catch (actionError: any) {
        message.error(actionError?.response?.data?.message || 'Không thể lưu trữ chiến dịch.');
      }
    },
    [loadCampaigns]
  );

  const cloneCampaign = React.useCallback(
    async (campaign: AcademyCampaign) => {
      try {
        const result = await apiClient.academySales.campaigns.clone(campaign.id);
        message.success(result.message || 'Đã tạo bản sao cấu hình chiến dịch.');
        if (result.data?.slug) router.push(`/dashboard/academy-leads/campaigns/${result.data.slug}`);
        else await loadCampaigns();
      } catch (actionError: any) {
        message.error(actionError?.response?.data?.message || 'Không thể nhân bản chiến dịch.');
      }
    },
    [loadCampaigns, router]
  );

  const submitForm = React.useCallback(
    async (payload: AcademyCampaignFormPayload) => {
      setSubmitting(true);
      try {
        if (formCampaign) {
          const result = await apiClient.academySales.campaigns.update(
            formCampaign.id,
            payload as UpdateAcademyCampaignRequest
          );
          message.success(result.message || 'Đã lưu cấu hình chiến dịch.');
          window.dispatchEvent(new Event('academy-campaign-sidebar-updated'));
          setFormCampaign(undefined);
          await loadCampaigns();
          if (result.data?.slug && result.data.slug !== formCampaign.slug) {
            router.replace(`/dashboard/academy-leads/campaigns/${result.data.slug}`);
          }
          return;
        }
        const result = await apiClient.academySales.campaigns.create(payload as CreateAcademyCampaignRequest);
        message.success(result.message || 'Đã tạo chiến dịch Academy.');
        window.dispatchEvent(new Event('academy-campaign-sidebar-updated'));
        setFormCampaign(undefined);
        if (result.data?.slug) router.push(`/dashboard/academy-leads/campaigns/${result.data.slug}`);
        else await loadCampaigns();
      } catch (submitError: any) {
        message.error(submitError?.response?.data?.message || 'Không thể lưu chiến dịch Academy.');
      } finally {
        setSubmitting(false);
      }
    },
    [formCampaign, loadCampaigns, router]
  );

  const columns = React.useMemo<ColumnsType<AcademyCampaign>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 52,
        align: 'center',
        render: (_value, _campaign, index) => (
          <span className="tabular-nums">{(query.page - 1) * query.pageSize + index + 1}</span>
        ),
      },
      {
        key: 'name',
        title: 'Chiến dịch',
        width: 280,
        render: (_value, campaign) => (
          <button type="button" className="text-left" onClick={() => openCampaign(campaign)}>
            <div className="font-semibold hover:underline">{campaign.name}</div>
            <div className="mt-1 text-xs opacity-70">/{campaign.slug}</div>
          </button>
        ),
      },
      {
        key: 'status',
        title: 'Trạng thái',
        width: 140,
        render: (_value, campaign) => (
          <StatusTag
            status={ACADEMY_CAMPAIGN_STATUS_TONES[campaign.status]}
            label={ACADEMY_CAMPAIGN_STATUS_LABELS[campaign.status]}
          />
        ),
      },
      {
        key: 'period',
        title: 'Thời gian chạy',
        width: 180,
        render: (_value, campaign) => formatCampaignDateRange(campaign.startDate, campaign.endDate),
      },
      {
        key: 'team',
        title: 'Đội phụ trách',
        width: 205,
        render: (_value, campaign) => {
          if (!campaign.assignedStaffIds.length) return 'Chỉ quản lý (chưa giao đội)';
          const names = campaign.assignedStaffIds
            .map((id) => staff.find((member) => member.id === id)?.displayName || `#${id}`)
            .join(', ');
          return names || 'Chưa giao';
        },
      },
      {
        key: 'snapshot',
        title: 'Tệp cố định',
        width: 145,
        render: (_value, campaign) => (
          <span className="tabular-nums">{(campaign._count?.leads || 0).toLocaleString('vi-VN')} lead</span>
        ),
      },
      {
        key: 'touchpoints',
        title: 'Nhịp chạm',
        width: 220,
        render: (_value, campaign) => campaign.touchpoints?.map((item) => item.label).join(' · ') || 'Chưa cấu hình',
      },
      {
        key: 'updatedAt',
        title: 'Cập nhật',
        width: 150,
        render: (_value, campaign) =>
          new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'Asia/Ho_Chi_Minh',
          }).format(new Date(campaign.updatedAt)),
      },
      {
        key: 'actions',
        title: 'Tác vụ',
        width: canConfigure ? 155 : 70,
        fixed: 'right',
        render: (_value, campaign) => (
          <Space size={2}>
            <Tooltip title="Mở vận hành chiến dịch">
              <Button
                aria-label={`Mở ${campaign.name}`}
                type="text"
                size="small"
                icon={<AppIcon icon={Eye} />}
                onClick={() => openCampaign(campaign)}
              />
            </Tooltip>
            {canConfigure && (
              <>
                <Tooltip title="Sửa cấu hình">
                  <Button
                    aria-label={`Sửa ${campaign.name}`}
                    type="text"
                    size="small"
                    icon={<AppIcon icon={Pencil} />}
                    onClick={() => setFormCampaign(campaign)}
                  />
                </Tooltip>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      ...(campaign.status !== 'ACTIVE'
                        ? [{ key: 'activate', icon: <AppIcon icon={CirclePlay} />, label: 'Kích hoạt' }]
                        : [{ key: 'pause', icon: <AppIcon icon={CirclePause} />, label: 'Tạm dừng' }]),
                      { key: 'complete', icon: <AppIcon icon={CircleCheck} />, label: 'Hoàn tất' },
                      { key: 'clone', icon: <AppIcon icon={Copy} />, label: 'Nhân bản cấu hình' },
                      { key: 'archive', icon: <AppIcon icon={Archive} />, label: 'Lưu trữ' },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'activate') void updateLifecycle(campaign, 'ACTIVE');
                      if (key === 'pause') void updateLifecycle(campaign, 'PAUSED');
                      if (key === 'complete') void updateLifecycle(campaign, 'COMPLETED');
                      if (key === 'clone') void cloneCampaign(campaign);
                      if (key === 'archive') void archiveCampaign(campaign);
                    },
                  }}
                >
                  <Button
                    aria-label={`Thao tác thêm cho ${campaign.name}`}
                    type="text"
                    size="small"
                    icon={<AppIcon icon={Ellipsis} />}
                  />
                </Dropdown>
              </>
            )}
          </Space>
        ),
      },
    ],
    [archiveCampaign, canConfigure, cloneCampaign, openCampaign, query.page, query.pageSize, staff, updateLifecycle]
  );

  if (!hydrated || !role) return <StatePanel kind="loading" title="Đang xác thực quyền chiến dịch Academy…" />;
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập chiến dịch Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của đội Academy."
      />
    );
  }

  const visibleStatusOptions = canConfigure
    ? [
        { value: 'ALL', label: 'Mọi trạng thái' },
        ...ACADEMY_CAMPAIGN_STATUS_OPTIONS,
        { value: 'DELETED', label: 'Đã xóa' },
      ]
    : [
        { value: 'ALL', label: 'Mọi trạng thái' },
        ...ACADEMY_CAMPAIGN_STATUS_OPTIONS.filter((option) => option.value !== 'ARCHIVED'),
      ];

  return (
    <>
      <FeaturePage
        title="Chiến dịch Academy"
        subtitle="Tạo tệp lead cố định, giao đội thực thi và theo dõi nhịp chạm riêng cho Academy."
        icon={<AppIcon icon={Rocket} />}
        tag={<StatusTag status="purple" label="Academy" />}
        headerActions={
          <Space>
            <Tooltip title="Làm mới danh sách">
              <Button
                aria-label="Làm mới chiến dịch Academy"
                icon={<AppIcon icon={RefreshCw} />}
                loading={loading}
                onClick={() => void loadCampaigns()}
              />
            </Tooltip>
            {canConfigure && (
              <PagePrimaryIconAction
                title="Tạo chiến dịch Academy"
                icon={<AppIcon icon={Plus} />}
                onClick={() => setFormCampaign(null)}
              />
            )}
          </Space>
        }
        toolbar={{
          primary: (
            <SearchField
              behavior="filter"
              value={query.search}
              onChange={(event) => patchQuery({ search: event.target.value }, true)}
              placeholder="Tìm tên, mã URL hoặc mô tả chiến dịch…"
              allowClear
            />
          ),
          filters: (
            <Select
              value={query.status}
              aria-label="Lọc trạng thái chiến dịch"
              style={{ minWidth: 168 }}
              options={visibleStatusOptions}
              onChange={(status) => patchQuery({ status }, true)}
            />
          ),
          filterTitle: 'Bộ lọc chiến dịch Academy',
          activeFilterCount: query.status === 'ALL' ? 0 : 1,
        }}
      >
        <DataSection
          title="Danh sách chiến dịch"
          extra={<span className="tabular-nums text-xs opacity-70">{total.toLocaleString('vi-VN')} chiến dịch</span>}
          bodyPadding={0}
          state={loading ? 'loading' : error ? 'error' : campaigns.length ? undefined : 'empty'}
          stateTitle={error ? 'Không tải được danh sách chiến dịch' : 'Chưa có chiến dịch Academy'}
          stateDescription={
            error ||
            (canConfigure
              ? 'Tạo chiến dịch đầu tiên để chốt tệp lead Academy và giao đội vận hành.'
              : 'Hiện chưa có chiến dịch được giao cho bạn.')
          }
          stateExtra={error ? <Button onClick={() => void loadCampaigns()}>Thử lại</Button> : undefined}
        >
          <DataTable<AcademyCampaign>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={campaigns}
            stickyPrimaryColumn
            columnPriority={{
              name: 'primary',
              status: 'primary',
              period: 'secondary',
              snapshot: 'secondary',
              team: 'tertiary',
              touchpoints: 'tertiary',
              updatedAt: 'tertiary',
              actions: 'primary',
            }}
            mobileRenderer={(campaign) => campaignMobileCard(campaign, openCampaign)}
            pagination={{
              current: query.page,
              pageSize: query.pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (count, range) =>
                `Hiển thị ${range[0]}-${range[1]} / ${count.toLocaleString('vi-VN')} chiến dịch`,
              onChange: (page, pageSize) => patchQuery({ page, pageSize }, pageSize !== query.pageSize),
            }}
          />
        </DataSection>
      </FeaturePage>

      {canConfigure && (
        <AcademyCampaignFormDrawer
          open={formCampaign !== undefined}
          campaign={formCampaign || null}
          staff={staff}
          courses={courses}
          submitting={submitting}
          onClose={() => setFormCampaign(undefined)}
          onSubmit={submitForm}
        />
      )}
    </>
  );
}
