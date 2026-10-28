'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Form, Input, Radio, Tabs, Tooltip, Typography, message } from 'antd';
import {
  FileText,
  GraduationCap,
  ListOrdered,
  Package,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  ClipboardCheck,
  Maximize2,
  Minimize2,
  Info,
  ClipboardList,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  CreatePilotSessionRequest,
  PilotMaterial,
  PilotMetricsSummary,
  PilotSession,
  UpdatePilotSessionRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AppIcon } from '../../../components/ui/AppIcon';
import { DataTable } from '../../../components/ui/DataTable';
import { PilotMetricsGrid } from './components/PilotMetricsGrid';
import { PilotSessionDrawer } from './components/PilotSessionDrawer';
import { PilotFollowUpDrawer } from './components/PilotFollowUpDrawer';
import { PilotMaterialModal } from './components/PilotMaterialModal';
import { PilotFlowDrawer } from './components/PilotFlowDrawer';
import { PilotSopModal } from './components/PilotSopModal';
import { PilotCriteriaModal } from './components/PilotCriteriaModal';
import { PilotMaterialSopModal } from './components/PilotMaterialSopModal';
import { SopTrainingPlaceholder } from './components/SopTrainingPlaceholder';
import { PilotSopDetailView } from './components/PilotSopDetailView';
import { SopPreparationTabContent } from './components/SopPreparationTabContent';
import { createPilotColumns } from './components/pilot-table-columns';

const { Title } = Typography;

export default function PilotDarkLashesPage() {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<PilotSession[]>([]);
  const [metrics, setMetrics] = useState<PilotMetricsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'sop' | 'sop-preparation'>('sessions');
  const [activeSopSubView, setActiveSopSubView] = useState<'overview' | 'module-2-detail'>('overview');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'sop' || tabParam === 'sop-training') {
        setActiveTab('sop');
      } else if (tabParam === 'sop-preparation' || tabParam === 'sop-prep') {
        setActiveTab('sop-preparation');
      }
      if (tabParam === 'sop-detail' || params.get('subview') === 'module-2') {
        setActiveTab('sop');
        setActiveSopSubView('module-2-detail');
      }
    }
  }, []);

  const handleTabChange = (key: string) => {
    const nextTab =
      key === 'sop' ? 'sop' : key === 'sop-preparation' ? 'sop-preparation' : 'sessions';
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (nextTab === 'sop') {
        url.searchParams.set('tab', 'sop');
      } else if (nextTab === 'sop-preparation') {
        url.searchParams.set('tab', 'sop-preparation');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_24H' | 'PENDING_72H' | 'DONE'>('ALL');
  const [opStatusFilter, setOpStatusFilter] = useState<'ALL' | 'IN_SHOP' | 'INELIGIBLE' | 'CHECKED_OUT'>('ALL');

  // Drawers & Modals
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PilotSession | null>(null);
  const [followUpDrawerOpen, setFollowUpDrawerOpen] = useState(false);
  const [selectedFollowUpSession, setSelectedFollowUpSession] = useState<PilotSession | null>(null);
  const [materialsCatalog, setMaterialsCatalog] = useState<PilotMaterial[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [sopModalOpen, setSopModalOpen] = useState(false);
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [materialSopModalOpen, setMaterialSopModalOpen] = useState(false);
  const [flowDrawerOpen, setFlowDrawerOpen] = useState(false);
  const [selectedFlowSession, setSelectedFlowSession] = useState<PilotSession | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const [form] = Form.useForm();
  const [followUpForm] = Form.useForm();

  const fetchPilotData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.listSessions({ pilotCode: 'DARK_LASHES' });
      setSessions(res.sessions || []);
      setMetrics(res.metrics || null);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tải dữ liệu pilot Uốn Mi Bóng Tối.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const mats = await apiClient.pilot.listMaterials({ pilotCode: 'DARK_LASHES' });
      setMaterialsCatalog(mats || []);
    } catch (err: any) {
      console.error('Error fetching materials:', err);
    }
  }, []);

  useEffect(() => {
    fetchPilotData();
    fetchMaterials();
  }, [fetchPilotData, fetchMaterials]);

  // Open drawer for Create
  const handleOpenCreate = () => {
    setActiveTab('sessions');
    setEditingSession(null);
    form.resetFields();
    form.setFieldsValue({
      pilotCode: 'DARK_LASHES', branchCode: 'detham', sessionDate: dayjs().format('YYYY-MM-DD'),
      technicianName: 'Cô Đẫm', revenue: 990000, materialCost: 50000, technicianCost: 150000,
      commissionAmount: 50000, promoAmount: 0, refundAmount: 0,
      followUp24hStatus: 'PENDING', followUp72hStatus: 'PENDING', source: 'Facebook', materials: [],
    });
    setCreateDrawerOpen(true);
  };

  // Open drawer for Edit
  const handleOpenEdit = (session: PilotSession) => {
    setEditingSession(session);
    form.resetFields();
    form.setFieldsValue({
      customerName: session.customerName, customerPhone: session.customerPhone,
      sessionDate: session.sessionDate, technicianName: session.technicianName,
      revenue: session.revenue, materialCost: session.materialCost,
      technicianCost: session.technicianCost, commissionAmount: session.commissionAmount,
      promoAmount: session.promoAmount, refundAmount: session.refundAmount,
      followUp24hStatus: session.followUp24hStatus, followUp72hStatus: session.followUp72hStatus,
      csatScore: session.csatScore, issues: session.issues, notes: session.notes, source: session.source,
      materials: session.materials?.map((m) => ({ materialId: m.materialId, usageAmount: m.usageAmount })) || [],
    });
    setCreateDrawerOpen(true);
  };

  // Open Fast Follow-up Drawer
  const handleOpenFollowUp = (session: PilotSession) => {
    setSelectedFollowUpSession(session);
    followUpForm.resetFields();
    followUpForm.setFieldsValue({
      followUp24hStatus: session.followUp24hStatus,
      followUp72hStatus: session.followUp72hStatus,
      csatScore: session.csatScore ?? 5,
      issues: session.issues || '',
      notes: session.notes || '',
    });
    setFollowUpDrawerOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitSession = async () => {
    try {
      const values = await form.validateFields();
      if (editingSession) {
        await apiClient.pilot.updateSession(editingSession.id, values as UpdatePilotSessionRequest);
        message.success('Cập nhật ca dịch vụ pilot thành công!');
      } else {
        await apiClient.pilot.createSession(values as CreatePilotSessionRequest);
        message.success('Thêm mới ca dịch vụ pilot thành công!');
      }
      setCreateDrawerOpen(false);
      fetchPilotData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu ca dịch vụ pilot.');
    }
  };

  // Submit Fast Follow-up Form
  const handleSubmitFollowUp = async () => {
    if (!selectedFollowUpSession) return;
    try {
      const values = await followUpForm.validateFields();
      await apiClient.pilot.updateSession(selectedFollowUpSession.id, values);
      message.success('Cập nhật trạng thái chăm sóc & CSAT thành công!');
      setFollowUpDrawerOpen(false);
      fetchPilotData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi cập nhật follow-up.');
    }
  };

  // Delete session
  const handleDeleteSession = async (id: number) => {
    try {
      await apiClient.pilot.deleteSession(id);
      message.success('Đã xóa ca pilot.');
      fetchPilotData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa ca pilot.');
    }
  };

  const handleOpenFlow = (session: PilotSession) => {
    setSelectedFlowSession(session);
    setFlowDrawerOpen(true);
  };

  const handleOpenSessionFromSop = useCallback(
    async (sessionId: number) => {
      const found = sessions.find((s) => s.id === sessionId);
      if (found) {
        handleOpenFlow(found);
      } else {
        try {
          const res = await apiClient.pilot.listSessions({ pilotCode: 'DARK_LASHES' });
          const loaded = res.sessions?.find((s) => s.id === sessionId);
          if (loaded) {
            handleOpenFlow(loaded);
          } else {
            message.info(`Ca dịch vụ #${sessionId} nằm trong kho lưu trữ dữ liệu Pilot.`);
          }
        } catch {
          message.info(`Ca dịch vụ #${sessionId} nằm trong kho lưu trữ dữ liệu Pilot.`);
        }
      }
    },
    [sessions]
  );

  const handleFlowSessionUpdated = (updated: PilotSession) => {
    setSelectedFlowSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    fetchPilotData();
  };

  const handleSessionDrawerUpdated = (updated: PilotSession) => {
    setEditingSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    fetchPilotData();
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        !searchText.trim() ||
        s.customerName.toLowerCase().includes(searchText.trim().toLowerCase()) ||
        s.customerPhone.includes(searchText.trim()) ||
        (s.technicianName && s.technicianName.toLowerCase().includes(searchText.trim().toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'PENDING_24H') {
        matchStatus = s.followUp24hStatus === 'PENDING';
      } else if (statusFilter === 'PENDING_72H') {
        matchStatus = s.followUp72hStatus === 'PENDING';
      } else if (statusFilter === 'DONE') {
        matchStatus = s.followUp24hStatus === 'DONE' && s.followUp72hStatus === 'DONE';
      }

      let matchOp = true;
      const op = s.status || 'BOOKED';
      if (opStatusFilter === 'IN_SHOP') {
        matchOp = op !== 'BOOKED' && op !== 'CHECKED_OUT' && op !== 'INELIGIBLE';
      } else if (opStatusFilter === 'INELIGIBLE') {
        matchOp = op === 'INELIGIBLE' || s.assessmentStatus === 'FAIL';
      } else if (opStatusFilter === 'CHECKED_OUT') {
        matchOp = op === 'CHECKED_OUT';
      }

      return matchSearch && matchStatus && matchOp;
    });
  }, [sessions, searchText, statusFilter, opStatusFilter]);

  // Columns definition
  const columns = useMemo(
    () =>
      createPilotColumns({
        handleOpenFlow,
        handleOpenFollowUp,
        handleOpenEdit,
        handleDeleteSession,
      }),
    [handleOpenFlow, handleOpenFollowUp, handleOpenEdit, handleDeleteSession]
  );

  return (
    <div
      className={`w-full min-h-[calc(100vh-var(--mos-header-height))] ${
        isFullscreen ? 'p-2.5 sm:p-4' : 'p-3 sm:p-4.5 lg:p-5'
      } space-y-3 sm:space-y-3.5 antialiased`}
    >
      {/* Header Banner - Ultra Compact Single Row */}
      <div className="rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 relative border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent transition-all duration-300 shadow-sm w-full flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0 whitespace-nowrap">
            Pilot Uốn Mi Bóng Tối
          </h1>
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <AppIcon icon={Sparkles} size={13} className="mr-1" />
            Đề Thám
          </span>
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
            Pilot 30N (1 ca/ngày)
          </span>
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
            Đẫm Ti · Cô Đẫm
          </span>
          <Tooltip title="Công cụ đo lường Unit Economics và mức độ hài lòng khách hàng sau 30 ngày. Tự động tính Contribution Margin từng ca và điều phối follow-up 24h–72h.">
            <span
              className="cursor-pointer text-slate-400 hover:text-emerald-500 inline-flex items-center ml-0.5"
              title="Thông tin pilot"
            >
              <AppIcon icon={Info} size={13} />
            </span>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}>
            <Button
              size="small"
              icon={<AppIcon icon={isFullscreen ? Minimize2 : Maximize2} size={13} />}
              onClick={toggleFullscreen}
              className="rounded-lg font-medium text-xs h-7 px-2"
            />
          </Tooltip>
          <Tooltip title="Làm mới dữ liệu">
            <Button
              size="small"
              icon={<AppIcon icon={RotateCw} size={13} className={loading ? 'animate-spin' : ''} />}
              onClick={fetchPilotData}
              className="rounded-lg font-medium text-xs h-7 px-2"
            />
          </Tooltip>
          <Button
            size="small"
            icon={<AppIcon icon={ListOrdered} size={13} />}
            onClick={() => setSopModalOpen(true)}
            className="rounded-lg font-medium text-xs h-7 px-2 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            SOP 7 bước
          </Button>
          <Button
            size="small"
            icon={<AppIcon icon={ClipboardCheck} size={13} />}
            onClick={() => setCriteriaModalOpen(true)}
            className="rounded-lg font-medium text-xs h-7 px-2 border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
          >
            Tiêu chí mi
          </Button>
          <Button
            size="small"
            icon={<AppIcon icon={FileText} size={13} />}
            onClick={() => setMaterialSopModalOpen(true)}
            className="rounded-lg font-medium text-xs h-7 px-2 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          >
            Định mức vật tư
          </Button>
          <Button
            size="small"
            icon={<AppIcon icon={Package} size={13} />}
            onClick={() => setMaterialModalOpen(true)}
            className="rounded-lg font-medium text-xs h-7 px-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            Vật tư
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<AppIcon icon={Plus} size={13} />}
            onClick={handleOpenCreate}
            className="rounded-lg font-semibold text-xs h-7 px-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-none shadow-sm shadow-emerald-500/20 text-white"
          >
            Thêm ca mới
          </Button>
        </div>
      </div>

      {/* Navigation Tabs: Ca dịch vụ & Hiệu quả vs SOP & Đào tạo KTV */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="pilot-dark-lashes-tabs"
        items={[
          {
            key: 'sessions',
            label: (
              <span className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                <AppIcon icon={Sparkles} size={15} />
                <span>Ca dịch vụ &amp; Hiệu quả</span>
              </span>
            ),
            children: (
              <div className="space-y-3 sm:space-y-3.5 mt-1">
                {/* Top 5 Metrics Cards */}
                <PilotMetricsGrid metrics={metrics} />

                {/* Main Table Card */}
                <Card
                  variant="outlined"
                  className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 w-full"
                >
                  {/* Table Filters & Actions */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      <Input
                        placeholder="Tìm theo tên KH, SĐT, CV..."
                        prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-64 rounded-xl"
                        allowClear
                      />
                      <Radio.Group
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        buttonStyle="solid"
                        className="rounded-xl"
                      >
                        <Radio.Button value="ALL">Tất cả ({sessions.length})</Radio.Button>
                        <Radio.Button value="PENDING_24H">
                          Chờ 24h ({metrics?.pendingFollowUp24hCount ?? 0})
                        </Radio.Button>
                        <Radio.Button value="PENDING_72H">
                          Chờ 72h ({metrics?.pendingFollowUp72hCount ?? 0})
                        </Radio.Button>
                        <Radio.Button value="DONE">Hoàn tất chăm sóc</Radio.Button>
                      </Radio.Group>

                      <Radio.Group
                        value={opStatusFilter}
                        onChange={(e) => setOpStatusFilter(e.target.value)}
                        buttonStyle="solid"
                        className="rounded-xl"
                      >
                        <Radio.Button value="ALL">Mọi tiến trình</Radio.Button>
                        <Radio.Button value="IN_SHOP">Đang tại shop</Radio.Button>
                        <Radio.Button value="INELIGIBLE">Không đủ điều kiện</Radio.Button>
                        <Radio.Button value="CHECKED_OUT">Đã check-out</Radio.Button>
                      </Radio.Group>
                    </div>

                    <div className="text-xs text-slate-500 tabular-nums shrink-0">
                      Hiển thị <span className="font-semibold">{filteredSessions.length}</span> ca dịch vụ
                    </div>
                  </div>

                  {/* Data Table */}
                  <DataTable<PilotSession>
                    columns={columns}
                    dataSource={filteredSessions}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      pageSizeOptions: ['15', '30', '50'],
                      showTotal: (total) => `Tổng cộng ${total} ca`,
                    }}
                    scroll={{ x: 'max-content' }}
                    className="rounded-xl w-full"
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'sop',
            label: (
              <span
                className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                data-testid="sop-training-tab-header"
              >
                <AppIcon icon={GraduationCap} size={15} />
                <span>SOP &amp; Đào tạo KTV</span>
              </span>
            ),
            children: (
              <div className="mt-1">
                {activeSopSubView === 'module-2-detail' ? (
                  <PilotSopDetailView
                    onBack={() => setActiveSopSubView('overview')}
                    onOpenSopModal={() => setSopModalOpen(true)}
                    onViewSessionId={handleOpenSessionFromSop}
                  />
                ) : (
                  <SopTrainingPlaceholder
                    onOpenSopModal={() => setSopModalOpen(true)}
                    onOpenCriteriaModal={() => setCriteriaModalOpen(true)}
                    onOpenMaterialsSop={() => setMaterialSopModalOpen(true)}
                    sessions={sessions}
                    onOpenSessionFlow={handleOpenFlow}
                    onViewSopDetail={() => setActiveSopSubView('module-2-detail')}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'sop-preparation',
            label: (
              <span
                className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                data-testid="sop-preparation-tab-header"
              >
                <AppIcon icon={ClipboardList} size={15} />
                <span>SOP Preparation – Chuẩn bị SOP</span>
              </span>
            ),
            children: (
              <div className="mt-1">
                <SopPreparationTabContent />
              </div>
            ),
          },
        ]}
      />

      {/* Drawers & Modals */}
      <PilotSessionDrawer
        open={createDrawerOpen}
        session={editingSession}
        isEditing={Boolean(editingSession)}
        form={form}
        materialsCatalog={materialsCatalog}
        onRefreshMaterials={fetchMaterials}
        onClose={() => setCreateDrawerOpen(false)}
        onSubmit={handleSubmitSession}
        onSessionUpdated={handleSessionDrawerUpdated}
      />
      <PilotFollowUpDrawer
        open={followUpDrawerOpen}
        session={selectedFollowUpSession}
        form={followUpForm}
        onClose={() => setFollowUpDrawerOpen(false)}
        onSubmit={handleSubmitFollowUp}
      />
      <PilotMaterialModal
        open={materialModalOpen}
        materials={materialsCatalog}
        onClose={() => setMaterialModalOpen(false)}
        onRefresh={fetchMaterials}
      />
      <PilotSopModal open={sopModalOpen} onClose={() => setSopModalOpen(false)} onRefresh={fetchPilotData} />
      <PilotCriteriaModal open={criteriaModalOpen} onClose={() => setCriteriaModalOpen(false)} />
      <PilotMaterialSopModal
        open={materialSopModalOpen}
        onClose={() => setMaterialSopModalOpen(false)}
        materialsCatalog={materialsCatalog}
        onRefreshMaterials={fetchMaterials}
      />
      <PilotFlowDrawer
        open={flowDrawerOpen}
        session={selectedFlowSession}
        onClose={() => setFlowDrawerOpen(false)}
        onSessionUpdated={handleFlowSessionUpdated}
      />
    </div>
  );
}
