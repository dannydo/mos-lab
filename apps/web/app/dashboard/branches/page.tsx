'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button, Input, Row, Col, Form, Select, Space, Tooltip, Popconfirm, message, Segmented } from 'antd';
import {
  Building2,
  Store,
  GraduationCap,
  Briefcase,
  MapPin,
  Users,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Compass,
  Search,
  LayoutGrid,
  List,
  Plus,
  RotateCw,
  Edit,
  Eye,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { PageHeader, StatCard, StatusTag, AppIcon, DataTable, StatePanel, SectionCard } from '../../../components/ui';
import { BranchDetailDrawer } from './components/BranchDetailDrawer';
import { BranchFormDrawer } from './components/BranchFormDrawer';
import type { CrmBranch, CreateBranchDto, UpdateBranchDto, BranchStats, BranchType, SafeAny } from '@mos-lab/shared';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';

type ViewMode = 'grid' | 'table';
type StoreTypeFilter = 'ALL' | BranchType;
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function BranchesPage() {
  // Role check
  const [canManage, setCanManage] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mos_user');
        if (stored) {
          const user = JSON.parse(stored);
          const role = user?.role?.toLowerCase() || '';
          setCanManage(isAdminOrSuperAdminRole(role) || role === 'manager');
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_branches_view_mode') as ViewMode | null;
      if (saved === 'grid' || saved === 'table') return saved;
    }
    return 'grid';
  });

  const handleViewModeChange = (val: ViewMode) => {
    setViewMode(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_branches_view_mode', val);
    }
  };

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [branches, setBranches] = useState<CrmBranch[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [storeTypeFilter, setStoreTypeFilter] = useState<StoreTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);

  // Detail Drawer
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<CrmBranch | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'info' | 'staff'>('info');

  // Edit / Create Drawer
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [editDrawerMode, setEditDrawerMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.catalog.branches.getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch branch stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Branches
  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const isAllStatus = statusFilter === 'ALL';
      const isHiddenOnly = statusFilter === 'INACTIVE';
      const isActiveOnly = statusFilter === 'ACTIVE';

      const res = await apiClient.catalog.branches.list({
        page,
        pageSize,
        search: search.trim() || undefined,
        storeType: storeTypeFilter === 'ALL' ? undefined : storeTypeFilter,
        includeAll: isAllStatus ? true : undefined,
        onlyHidden: isHiddenOnly ? true : undefined,
        isActive: isActiveOnly ? true : undefined,
      });

      if (res.success) {
        setBranches(res.data);
        setTotal(res.meta.total);
      }
    } catch (err: SafeAny) {
      message.error(err.message || 'Lỗi tải danh sách chi nhánh');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, storeTypeFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Open Detail Drawer
  const handleOpenDetail = async (branch: CrmBranch) => {
    setSelectedBranch(branch);
    setActiveDrawerTab('info');
    setDetailVisible(true);
    setDetailLoading(true);

    try {
      const res = await apiClient.catalog.branches.get(branch.id);
      if (res.success && res.data) {
        setSelectedBranch(res.data);
      }
    } catch (err: SafeAny) {
      message.error(err.message || 'Lỗi tải chi tiết chi nhánh');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Create Drawer
  const handleOpenCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      storeType: 'SALON',
      isActive: true,
      sortOrder: (branches.length + 1) * 10,
    });
    setEditDrawerMode('create');
    setEditDrawerVisible(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (branch: CrmBranch) => {
    setSelectedBranch(branch);
    form.resetFields();
    form.setFieldsValue({
      code: branch.code,
      name: branch.name,
      nameEn: branch.nameEn,
      storeType: branch.storeType,
      addressWeb: branch.addressWeb,
      addressSms: branch.addressSms,
      addressMap: branch.addressMap,
      addressCity: branch.addressCity,
      sortOrder: branch.sortOrder,
      isActive: branch.isActive,
      notes: branch.notes,
    });
    setEditDrawerMode('edit');
    setEditDrawerVisible(true);
  };

  // Submit Create / Edit
  const handleSubmitForm = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editDrawerMode === 'create') {
        const payload: CreateBranchDto = {
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          nameEn: values.nameEn?.trim() || null,
          storeType: values.storeType,
          addressWeb: values.addressWeb?.trim() || null,
          addressSms: values.addressSms?.trim() || null,
          addressMap: values.addressMap?.trim() || null,
          addressCity: values.addressCity?.trim() || null,
          sortOrder: values.sortOrder || 0,
          isActive: values.isActive !== false,
          notes: values.notes?.trim() || null,
        };
        const res = await apiClient.catalog.branches.create(payload);
        message.success(res.message || 'Tạo chi nhánh thành công');
      } else if (selectedBranch) {
        const payload: UpdateBranchDto = {
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          nameEn: values.nameEn?.trim() || null,
          storeType: values.storeType,
          addressWeb: values.addressWeb?.trim() || null,
          addressSms: values.addressSms?.trim() || null,
          addressMap: values.addressMap?.trim() || null,
          addressCity: values.addressCity?.trim() || null,
          sortOrder: values.sortOrder || 0,
          isActive: values.isActive !== false,
          notes: values.notes?.trim() || null,
        };
        const res = await apiClient.catalog.branches.update(selectedBranch.id, payload);
        message.success(res.message || 'Cập nhật chi nhánh thành công');
      }

      setEditDrawerVisible(false);
      fetchBranches();
      fetchStats();
    } catch (err: SafeAny) {
      if (err?.errorFields) return;
      message.error(err.message || 'Lỗi khi lưu thông tin chi nhánh');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (branch: CrmBranch) => {
    try {
      const res = await apiClient.catalog.branches.toggleActive(branch.id);
      message.success(res.message || 'Cập nhật trạng thái thành công');
      fetchBranches();
      fetchStats();
    } catch (err: SafeAny) {
      message.error(err.message || 'Lỗi đổi trạng thái chi nhánh');
    }
  };

  // Type rendering helpers
  const renderStoreTypeBadge = (type: BranchType) => {
    switch (type) {
      case 'SALON':
        return <StatusTag status="cyan" label="Salon Làm Đẹp" icon={<AppIcon icon={Store} size="sm" />} />;
      case 'ACADEMY':
        return <StatusTag status="purple" label="Học Viện Đào Tạo" icon={<AppIcon icon={GraduationCap} size="sm" />} />;
      case 'OFFICE':
        return <StatusTag status="gold" label="Văn Phòng Vận Hành" icon={<AppIcon icon={Briefcase} size="sm" />} />;
      default:
        return <StatusTag status="default" label={type} />;
    }
  };

  // Filtered branches count
  const activeSalonsCount = useMemo(() => {
    if (stats?.totalSalons !== undefined) return stats.totalSalons;
    return branches.filter((b) => b.storeType === 'SALON' && b.isActive).length;
  }, [stats, branches]);

  const activeAcademiesCount = useMemo(() => {
    if (stats?.totalAcademies !== undefined) return stats.totalAcademies;
    return branches.filter((b) => b.storeType === 'ACADEMY' && b.isActive).length;
  }, [stats, branches]);

  const activeOfficesCount = useMemo(() => {
    if (stats?.totalOffices !== undefined) return stats.totalOffices;
    return branches.filter((b) => b.storeType === 'OFFICE' && b.isActive).length;
  }, [stats, branches]);

  // Table Columns
  const columns = [
    {
      title: 'Mã & Tên Chi Nhánh',
      key: 'name',
      render: (_: SafeAny, record: CrmBranch) => (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex flex-col items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
            <span className="text-xs uppercase leading-none">{record.code.slice(0, 4)}</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{record.name}</span>
              {!record.isActive && <StatusTag status="default" label="Tạm ẩn" />}
            </div>
            {record.nameEn && <div className="text-xs text-slate-500 dark:text-slate-400 italic">{record.nameEn}</div>}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              Code: <span className="font-semibold text-slate-600 dark:text-slate-300">{record.code}</span>
              {record.sortOrder !== undefined && ` · Thứ tự: ${record.sortOrder}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Loại hình',
      dataIndex: 'storeType',
      key: 'storeType',
      width: 170,
      render: (type: BranchType) => renderStoreTypeBadge(type),
    },
    {
      title: 'Địa chỉ & Vị trí',
      key: 'address',
      render: (_: SafeAny, record: CrmBranch) => {
        const displayAddr = record.addressWeb || record.addressSms || record.addressCity || 'Chưa có địa chỉ';
        return (
          <div className="max-w-md text-sm">
            <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
              <AppIcon icon={MapPin} size="sm" className="mt-1 text-slate-400 flex-shrink-0" />
              <span className="line-clamp-2">{displayAddr}</span>
            </div>
            {record.addressMap && (
              <a
                href={record.addressMap}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1"
              >
                <AppIcon icon={Compass} size="sm" /> Xem trên Google Maps
              </a>
            )}
          </div>
        );
      },
    },
    {
      title: 'Nhân sự',
      key: 'staffCount',
      width: 120,
      align: 'center' as const,
      render: (_: SafeAny, record: CrmBranch) => (
        <Tooltip title="Nhân sự làm việc tại chi nhánh này">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium tabular-nums">
            <AppIcon icon={Users} size="sm" className="text-slate-400" />
            <span>{record.staffCount ?? 0}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'completedOrdersCount',
      width: 120,
      align: 'center' as const,
      render: (_: SafeAny, record: CrmBranch) => (
        <Tooltip title="Tổng số đơn hàng đã hoàn tất tại chi nhánh">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium tabular-nums">
            <AppIcon icon={ShoppingBag} size="sm" className="text-slate-400" />
            <span>{(record.completedOrdersCount ?? 0).toLocaleString('vi-VN')}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 130,
      align: 'center' as const,
      render: (_: SafeAny, record: CrmBranch) =>
        record.isActive ? (
          <StatusTag status="success" label="Hoạt động" icon={<AppIcon icon={CheckCircle2} size="sm" />} />
        ) : (
          <StatusTag status="default" label="Tạm ngắt" icon={<AppIcon icon={XCircle} size="sm" />} />
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'right' as const,
      render: (_: SafeAny, record: CrmBranch) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết & nhân sự">
            <Button
              type="text"
              size="small"
              icon={<AppIcon icon={Eye} size="sm" />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>
          {canManage && (
            <>
              <Tooltip title="Chỉnh sửa chi nhánh">
                <Button
                  type="text"
                  size="small"
                  icon={<AppIcon icon={Edit} size="sm" />}
                  onClick={() => handleOpenEdit(record)}
                />
              </Tooltip>
              <Tooltip title={record.isActive ? 'Vô hiệu hóa chi nhánh' : 'Kích hoạt lại'}>
                <Popconfirm
                  title={record.isActive ? 'Vô hiệu hóa chi nhánh này?' : 'Kích hoạt lại chi nhánh này?'}
                  description={
                    record.isActive
                      ? 'Chi nhánh sẽ bị ẩn khỏi danh sách đặt lịch nhưng bảo lưu dữ liệu lịch sử.'
                      : 'Chi nhánh sẽ hiển thị trở lại trong danh sách hoạt động.'
                  }
                  onConfirm={() => handleToggleActive(record)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    type="text"
                    size="small"
                    danger={record.isActive}
                    icon={
                      record.isActive ? (
                        <AppIcon icon={XCircle} size="sm" />
                      ) : (
                        <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-500" />
                      )
                    }
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 min-h-screen space-y-6 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <PageHeader
        title="Danh Sách Chi Nhánh"
        subtitle="Hệ thống chi nhánh Salon làm đẹp, Học viện đào tạo và Trụ sở văn phòng Wings / mOS Lab"
        icon={<AppIcon icon={Building2} size="lg" className="text-emerald-500" />}
        extra={
          <div className="flex items-center gap-2">
            <Segmented
              value={viewMode}
              onChange={(val) => handleViewModeChange(val as ViewMode)}
              options={[
                {
                  value: 'grid',
                  icon: <AppIcon icon={LayoutGrid} size="sm" />,
                  label: 'Dạng Thẻ',
                },
                {
                  value: 'table',
                  icon: <AppIcon icon={List} size="sm" />,
                  label: 'Dạng Bảng',
                },
              ]}
            />
            <Button
              icon={<AppIcon icon={RotateCw} size="sm" />}
              onClick={() => {
                fetchBranches();
                fetchStats();
              }}
              loading={loading}
            >
              Làm mới
            </Button>
            {canManage && (
              <Button
                type="primary"
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={handleOpenCreate}
                className="bg-emerald-600 hover:bg-emerald-500 border-none text-white"
              >
                Thêm Chi Nhánh
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="TỔNG CHI NHÁNH"
            value={stats?.totalBranches ?? branches.length}
            loading={statsLoading}
            icon={<AppIcon icon={Building2} size="md" className="text-emerald-500" />}
          />
        </Col>
        <Col xs={12} sm={8} lg={5}>
          <StatCard
            title="SALON LÀM ĐẸP"
            value={activeSalonsCount}
            loading={statsLoading}
            icon={<AppIcon icon={Store} size="md" className="text-cyan-500" />}
          />
        </Col>
        <Col xs={12} sm={8} lg={5}>
          <StatCard
            title="HỌC VIỆN ĐÀO TẠO"
            value={activeAcademiesCount}
            loading={statsLoading}
            icon={<AppIcon icon={GraduationCap} size="md" className="text-purple-500" />}
          />
        </Col>
        <Col xs={12} sm={8} lg={5}>
          <StatCard
            title="TRỤ SỞ / VĂN PHÒNG"
            value={activeOfficesCount}
            loading={statsLoading}
            icon={<AppIcon icon={Briefcase} size="md" className="text-amber-500" />}
          />
        </Col>
        <Col xs={12} sm={8} lg={5}>
          <StatCard
            title="TỔNG NHÂN SỰ GẮN LIỀN"
            value={stats?.totalStaff ?? 0}
            loading={statsLoading}
            icon={<AppIcon icon={Users} size="md" className="text-blue-500" />}
          />
        </Col>
      </Row>

      {/* Toolbar: Search, Filters, Count */}
      <SectionCard className="p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <Input
              placeholder="Tìm kiếm theo mã chi nhánh, tên, địa chỉ, quận huyện..."
              prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
              allowClear
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full md:max-w-md"
            />

            <Select
              value={storeTypeFilter}
              onChange={(val) => {
                setStoreTypeFilter(val);
                setPage(1);
              }}
              className="w-44"
              options={[
                { value: 'ALL', label: 'Tất cả loại hình' },
                { value: 'SALON', label: 'Salon Làm Đẹp' },
                { value: 'ACADEMY', label: 'Học Viện Đào Tạo' },
                { value: 'OFFICE', label: 'Văn Phòng Vận Hành' },
              ]}
            />

            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              className="w-40"
              options={[
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'INACTIVE', label: 'Tạm ẩn / Đã tắt' },
              ]}
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums self-end md:self-center">
            Hiển thị <span className="font-semibold text-slate-800 dark:text-slate-200">{branches.length}</span> /{' '}
            {total} chi nhánh
          </div>
        </div>
      </SectionCard>

      {/* Content: Grid vs Table */}
      {viewMode === 'grid' ? (
        loading ? (
          <StatePanel kind="loading" title="Đang tải danh sách chi nhánh…" />
        ) : branches.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Không tìm thấy chi nhánh nào"
            description="Không có chi nhánh phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {branches.map((branch) => {
              const displayAddress =
                branch.addressWeb || branch.addressSms || branch.addressCity || 'Chưa cập nhật địa chỉ';
              return (
                <div
                  key={branch.id}
                  className={`group rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 ${
                    !branch.isActive ? 'opacity-70' : ''
                  }`}
                >
                  {/* Top Bar */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center font-bold text-base text-emerald-600 dark:text-emerald-400">
                          {branch.code}
                        </div>
                        <div>
                          <div className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {branch.name}
                          </div>
                          {branch.nameEn && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                              {branch.nameEn}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {branch.isActive ? (
                          <StatusTag
                            status="success"
                            label="Hoạt động"
                            icon={<AppIcon icon={CheckCircle2} size="sm" />}
                          />
                        ) : (
                          <StatusTag status="default" label="Tạm ẩn" icon={<AppIcon icon={XCircle} size="sm" />} />
                        )}
                      </div>
                    </div>

                    <div className="mb-3">{renderStoreTypeBadge(branch.storeType)}</div>

                    {/* Address & City */}
                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-start gap-2">
                        <AppIcon icon={MapPin} size="sm" className="mt-0.5 text-slate-400 flex-shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">{displayAddress}</span>
                      </div>

                      {branch.addressMap && (
                        <div className="pl-5">
                          <a
                            href={branch.addressMap}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <AppIcon icon={Compass} size="sm" /> Mở bản đồ Google Maps
                          </a>
                        </div>
                      )}

                      {branch.notes && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs italic line-clamp-2">
                          {branch.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <AppIcon icon={Users} size="sm" className="text-slate-400" />
                      <span>
                        Nhân sự:{' '}
                        <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                          {branch.staffCount ?? 0}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AppIcon icon={ShoppingBag} size="sm" className="text-slate-400" />
                      <span>
                        Đơn hoàn tất:{' '}
                        <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                          {(branch.completedOrdersCount ?? 0).toLocaleString('vi-VN')}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 px-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                    <Button
                      type="link"
                      size="small"
                      icon={<AppIcon icon={Eye} size="sm" />}
                      onClick={() => handleOpenDetail(branch)}
                      className="p-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium"
                    >
                      Chi tiết & Nhân sự
                    </Button>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="text"
                          size="small"
                          icon={<AppIcon icon={Edit} size="sm" />}
                          onClick={() => handleOpenEdit(branch)}
                        >
                          Sửa
                        </Button>
                        <Popconfirm
                          title={branch.isActive ? 'Vô hiệu hóa chi nhánh này?' : 'Kích hoạt lại chi nhánh này?'}
                          description={
                            branch.isActive
                              ? 'Chi nhánh sẽ bị ẩn khỏi các danh sách đặt lịch.'
                              : 'Chi nhánh sẽ hiển thị trở lại bình thường.'
                          }
                          onConfirm={() => handleToggleActive(branch)}
                          okText="Xác nhận"
                          cancelText="Hủy"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger={branch.isActive}
                            icon={
                              branch.isActive ? (
                                <AppIcon icon={XCircle} size="sm" />
                              ) : (
                                <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-500" />
                              )
                            }
                          >
                            {branch.isActive ? 'Tắt' : 'Bật'}
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <SectionCard className="p-0 overflow-hidden">
          <DataTable
            rowKey="id"
            columns={columns}
            dataSource={branches}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (totalCount) => `Tổng cộng ${totalCount} chi nhánh`,
            }}
          />
        </SectionCard>
      )}

      {/* Detail Drawer */}
      <BranchDetailDrawer
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        branch={selectedBranch}
        loading={detailLoading}
        activeTab={activeDrawerTab}
        onTabChange={setActiveDrawerTab}
        renderStoreTypeBadge={renderStoreTypeBadge}
      />

      {/* Create / Edit Drawer */}
      <BranchFormDrawer
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        mode={editDrawerMode}
        branch={selectedBranch}
        form={form}
        submitting={submitting}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
