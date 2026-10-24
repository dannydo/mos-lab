'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Progress,
  Switch,
  Alert,
  message,
} from 'antd';
import {
  Settings,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Send,
  Plus,
  Trash2,
  Copy,
  Layers,
  Target,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  TelesaleTier,
  TelesaleCompetencyConfigVersion,
  TelesaleConfigValidationResult,
  TelesaleConfigPreviewResult,
  DEFAULT_TELESALE_CONFIG_VERSION,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  DataTable,
  AdaptiveModal,
  StatusTag,
  StatusType,
} from '../../../../components/ui';

interface TelesaleConfigTabProps {
  currentMonth: string;
}

export function TelesaleConfigTab({ currentMonth }: TelesaleConfigTabProps) {
  const [versions, setVersions] = useState<TelesaleCompetencyConfigVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [currentConfig, setCurrentConfig] = useState<TelesaleCompetencyConfigVersion>(DEFAULT_TELESALE_CONFIG_VERSION);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);

  // Validation modal / alerts
  const [validationResult, setValidationResult] = useState<TelesaleConfigValidationResult | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);

  // Preview modal
  const [previewResult, setPreviewResult] = useState<TelesaleConfigPreviewResult | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Publish modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishEffectiveMonth, setPublishEffectiveMonth] = useState<string>(currentMonth);

  // Load version list
  const fetchVersions = useCallback(async (selectId?: string) => {
    setLoading(true);
    try {
      const list = await apiClient.telesaleCompetency.listConfigVersions();
      setVersions(list);
      if (list.length > 0) {
        const nextId = selectId || (selectedVersionId && list.some((v) => v.versionId === selectedVersionId) ? selectedVersionId : list[0].versionId);
        setSelectedVersionId(nextId);
        const active = list.find((v) => v.versionId === nextId) || list[0];
        setCurrentConfig(JSON.parse(JSON.stringify(active)));
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải danh sách phiên bản cấu hình');
    } finally {
      setLoading(false);
    }
  }, [selectedVersionId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Handle version select
  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    const found = versions.find((v) => v.versionId === versionId);
    if (found) {
      setCurrentConfig(JSON.parse(JSON.stringify(found)));
      setValidationResult(null);
    }
  };

  const isDraft = currentConfig.status === 'DRAFT';

  // Pillars sum
  const pillarsSum = useMemo(() => {
    const pw = currentConfig.pillarsWeight;
    return Number(pw.pillarAWeight || 0) + Number(pw.pillarBWeight || 0) + Number(pw.pillarCWeight || 0) + Number(pw.pillarDWeight || 0);
  }, [currentConfig.pillarsWeight]);

  // Handle create draft
  const handleCreateDraft = async (cloneCurrent = false) => {
    setSaving(true);
    try {
      const payload: Partial<TelesaleCompetencyConfigVersion> = cloneCurrent
        ? {
            ...currentConfig,
            name: `${currentConfig.name} (Bản nháp mới)`,
            effectiveDate: dayjs().add(1, 'month').format('YYYY-MM'),
          }
        : {
            name: `Khung Năng Lực Dự Thảo ${dayjs().format('MM/YYYY')}`,
            effectiveDate: dayjs().add(1, 'month').format('YYYY-MM'),
          };

      const newDraft = await apiClient.telesaleCompetency.createDraftVersion(payload);
      message.success(`Đã tạo bản nháp "${newDraft.name}" thành công!`);
      await fetchVersions(newDraft.versionId);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi tạo bản nháp');
    } finally {
      setSaving(false);
    }
  };

  // Handle save draft changes
  const handleSaveDraft = async () => {
    if (!isDraft) return;
    setSaving(true);
    try {
      const updated = await apiClient.telesaleCompetency.updateDraftVersion(currentConfig.versionId, currentConfig);
      message.success('Đã lưu các thay đổi của bản nháp thành công!');
      setCurrentConfig(JSON.parse(JSON.stringify(updated)));
      await fetchVersions(updated.versionId);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi lưu bản nháp');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete draft
  const handleDeleteDraftConfirm = async () => {
    if (!isDraft) return;
    try {
      await apiClient.telesaleCompetency.deleteDraftVersion(currentConfig.versionId);
      message.success('Đã xóa bản nháp thành công');
      setIsDeleteModalOpen(false);
      await fetchVersions();
    } catch (err: any) {
      message.error(err?.message || 'Lỗi xóa bản nháp');
    }
  };

  // Handle validate
  const handleValidate = async () => {
    try {
      const result = await apiClient.telesaleCompetency.validateConfigVersion(currentConfig.versionId);
      setValidationResult(result);
      setIsValidationModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi kiểm tra tính hợp lệ');
    }
  };

  // Handle preview
  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const result = await apiClient.telesaleCompetency.previewCalculation(currentConfig.versionId, currentMonth);
      setPreviewResult(result);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi xem trước kết quả tính điểm');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const published = await apiClient.telesaleCompetency.publishConfigVersion(
        currentConfig.versionId,
        publishEffectiveMonth
      );
      message.success(`Đã ban hành chính thức phiên bản "${published.name}" áp dụng từ kỳ ${published.effectiveDate}!`);
      setIsPublishModalOpen(false);
      await fetchVersions(published.versionId);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi ban hành cấu hình');
    } finally {
      setPublishing(false);
    }
  };

  const getTierStatus = (tier: TelesaleTier): StatusType => {
    if (tier === 'SENIOR') return 'purple';
    if (tier === 'MID_LEVEL') return 'gold';
    if (tier === 'JUNIOR') return 'cyan';
    return 'processing';
  };

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
              Phiên bản cấu hình:
            </span>
            <Select
              value={selectedVersionId}
              onChange={handleSelectVersion}
              loading={loading}
              className="w-72"
              options={versions.map((v) => ({
                value: v.versionId,
                label: (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{v.name}</span>
                    <span className="text-xs text-slate-500">
                      ({v.status === 'PUBLISHED' ? 'Đã ban hành' : v.status === 'DRAFT' ? 'Bản nháp' : 'Lưu trữ'})
                    </span>
                  </div>
                ),
              }))}
            />

            <StatusTag
              status={
                currentConfig.status === 'PUBLISHED'
                  ? 'success'
                  : currentConfig.status === 'DRAFT'
                  ? 'warning'
                  : 'default'
              }
              label={
                currentConfig.status === 'PUBLISHED'
                  ? `Hiệu lực từ ${currentConfig.effectiveDate}`
                  : currentConfig.status === 'DRAFT'
                  ? 'Đang biên soạn (Bản nháp)'
                  : 'Phiên bản lịch sử (Lưu trữ)'
              }
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleCreateDraft(false)}
              disabled={saving}
            >
              Tạo Bản Nháp Mới
            </Button>

            <Button
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={() => handleCreateDraft(true)}
              disabled={saving}
            >
              Sao Chép Từ Bản Này
            </Button>

            {isDraft && (
              <Button
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Xóa Bản Nháp
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Version Info & 4 Pillars Weight */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <Card
            title={
              <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Thông Tin Phiên Bản</span>
              </div>
            }
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                  Tên phiên bản cấu hình
                </label>
                <Input
                  value={currentConfig.name}
                  disabled={!isDraft}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nhập tên phiên bản..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                  Kỳ bắt đầu hiệu lực (YYYY-MM)
                </label>
                <DatePicker
                  picker="month"
                  value={dayjs(currentConfig.effectiveDate || '2026-11')}
                  disabled={!isDraft}
                  onChange={(d) =>
                    d &&
                    setCurrentConfig((prev) => ({
                      ...prev,
                      effectiveDate: d.format('YYYY-MM'),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                  Ghi chú thay đổi (Changelog)
                </label>
                <Input.TextArea
                  rows={3}
                  value={currentConfig.changelog || ''}
                  disabled={!isDraft}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({ ...prev, changelog: e.target.value }))
                  }
                  placeholder="Ghi chú nội dung cập nhật, lý do điều chỉnh..."
                />
              </div>

              <div className="pt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                <div>Người tạo: {currentConfig.authorName || 'Ban Quản Trị'}</div>
                {currentConfig.publishedAt && (
                  <div>
                    Ban hành: {dayjs(currentConfig.publishedAt).format('DD/MM/YYYY HH:mm')} bởi{' '}
                    {currentConfig.publishedByName || 'Admin'}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 4 Pillars Weight Card */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Trọng Số 4 Trụ Cột</span>
                </div>
                <StatusTag
                  status={pillarsSum === 100 ? 'success' : 'error'}
                  label={`Tổng: ${pillarsSum}%`}
                />
              </div>
            }
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
          >
            <div className="space-y-4">
              <Progress
                percent={pillarsSum}
                status={pillarsSum === 100 ? 'success' : 'exception'}
              />

              {pillarsSum !== 100 && (
                <Alert
                  type="error"
                  showIcon
                  message="Tổng trọng số phải bằng đúng 100% để có thể ban hành."
                  className="text-xs"
                />
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-zinc-200">
                      Trụ cột A (Hiệu suất)
                    </div>
                    <div className="text-xs text-slate-500">Tự động tính từ BK Leaderboard</div>
                  </div>
                  <InputNumber
                    min={10}
                    max={70}
                    value={currentConfig.pillarsWeight.pillarAWeight}
                    disabled={!isDraft}
                    addonAfter="%"
                    className="w-24"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarsWeight: { ...prev.pillarsWeight, pillarAWeight: Number(val) },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-zinc-200">
                      Trụ cột B (Kỹ năng)
                    </div>
                    <div className="text-xs text-slate-500">9 kỹ năng Quản lý chấm</div>
                  </div>
                  <InputNumber
                    min={10}
                    max={50}
                    value={currentConfig.pillarsWeight.pillarBWeight}
                    disabled={!isDraft}
                    addonAfter="%"
                    className="w-24"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarsWeight: { ...prev.pillarsWeight, pillarBWeight: Number(val) },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-zinc-200">
                      Trụ cột C (Chất lượng)
                    </div>
                    <div className="text-xs text-slate-500">Lỗi CRM + Cuộc gọi</div>
                  </div>
                  <InputNumber
                    min={5}
                    max={40}
                    value={currentConfig.pillarsWeight.pillarCWeight}
                    disabled={!isDraft}
                    addonAfter="%"
                    className="w-24"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarsWeight: { ...prev.pillarsWeight, pillarCWeight: Number(val) },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-zinc-200">
                      Trụ cột D (Kỷ luật & Thái độ)
                    </div>
                    <div className="text-xs text-slate-500">Minh chứng sự vụ</div>
                  </div>
                  <InputNumber
                    min={5}
                    max={30}
                    value={currentConfig.pillarsWeight.pillarDWeight}
                    disabled={!isDraft}
                    addonAfter="%"
                    className="w-24"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarsWeight: { ...prev.pillarsWeight, pillarDWeight: Number(val) },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Middle & Right Column: 5 KPIs & 9 Levels */}
        <div className="lg:col-span-2 space-y-6">
          {/* 5 KPIs of Pillar A */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span>5 Chỉ Số Trụ Cột A & Điểm Tối Đa</span>
                </div>
                <StatusTag
                  status="cyan"
                  label={`Trọng số Trụ cột A: ${currentConfig.pillarsWeight.pillarAWeight}đ`}
                />
              </div>
            }
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KPI Done */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    1. KPI Done (Mục tiêu hàng tháng)
                  </span>
                  <InputNumber
                    min={1}
                    max={25}
                    value={currentConfig.pillarAConfig.doneKpi.maxScore}
                    disabled={!isDraft}
                    addonAfter="đ"
                    className="w-20"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarAConfig: {
                          ...prev.pillarAConfig,
                          doneKpi: { ...prev.pillarAConfig.doneKpi, maxScore: Number(val) },
                        },
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Công thức: <code className="bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.5 rounded text-emerald-700 dark:text-emerald-300">MIN(Done thực tế / KPI Level, 1) × Điểm tối đa</code>
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">Thưởng vượt KPI (trần tối đa 120%)</span>
                  <Switch
                    checked={currentConfig.pillarAConfig.doneKpi.allowOverflowBonus}
                    disabled={!isDraft}
                    onChange={(checked) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarAConfig: {
                          ...prev.pillarAConfig,
                          doneKpi: { ...prev.pillarAConfig.doneKpi, allowOverflowBonus: checked },
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Done Khách Mới */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                    2. Done Khách Mới
                  </span>
                  <InputNumber
                    min={1}
                    max={20}
                    value={currentConfig.pillarAConfig.newCustomersKpi.maxScore}
                    disabled={!isDraft}
                    addonAfter="đ"
                    className="w-20"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarAConfig: {
                          ...prev.pillarAConfig,
                          newCustomersKpi: {
                            ...prev.pillarAConfig.newCustomersKpi,
                            maxScore: Number(val),
                          },
                        },
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Số lượng khách hàng mới hoàn thành dịch vụ trong tháng theo Level.
                </p>
              </div>

              {/* Doanh Thu */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                    3. Doanh Thu Thực Tế
                  </span>
                  <InputNumber
                    min={1}
                    max={20}
                    value={currentConfig.pillarAConfig.revenueKpi.maxScore}
                    disabled={!isDraft}
                    addonAfter="đ"
                    className="w-20"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarAConfig: {
                          ...prev.pillarAConfig,
                          revenueKpi: {
                            ...prev.pillarAConfig.revenueKpi,
                            maxScore: Number(val),
                          },
                        },
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Doanh số phát sinh từ các đơn hoàn tất của khách Book theo Level.
                </p>
              </div>

              {/* Tỷ Lệ Chuyển Đổi */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                    4. Tỷ Lệ Chuyển Đổi
                  </span>
                  <InputNumber
                    min={1}
                    max={15}
                    value={currentConfig.pillarAConfig.conversionKpi.maxScore}
                    disabled={!isDraft}
                    addonAfter="đ"
                    className="w-20"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarAConfig: {
                          ...prev.pillarAConfig,
                          conversionKpi: {
                            ...prev.pillarAConfig.conversionKpi,
                            maxScore: Number(val),
                          },
                        },
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Chuẩn: Done/Book $\ge$ 70%, Book/Connected Calls $\ge$ 15%.
                </p>
              </div>

              {/* Năng Suất Cuộc Gọi */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                    5. Năng Suất Cuộc Gọi
                  </span>
                  <InputNumber
                    min={1}
                    max={15}
                    value={currentConfig.pillarAConfig.callProductivityKpi.maxScore}
                    disabled={!isDraft}
                    addonAfter="đ"
                    className="w-20"
                    onChange={(val) =>
                      val &&
                      setCurrentConfig((prev) => ({
                        ...prev,
                        pillarAConfig: {
                          ...prev.pillarAConfig,
                          callProductivityKpi: {
                            ...prev.pillarAConfig.callProductivityKpi,
                            maxScore: Number(val),
                          },
                        },
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Đánh giá sản lượng cuộc gọi gọi ra và cuộc gọi kết nối thành công qua tổng đài OmiCall.
                </p>
              </div>
            </div>
          </Card>

          {/* Level 1-9 Targets Table */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <span>Mục Tiêu KPI Theo Level 1 – 9 (Mặc Định: 100, 150, ..., 500 Done)</span>
                </div>
                <span className="text-xs text-slate-500">Tự động đồng bộ với BK Leaderboard</span>
              </div>
            }
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
          >
            <DataTable
              dataSource={currentConfig.levelTargets}
              rowKey="level"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Level',
                  dataIndex: 'level',
                  key: 'level',
                  width: 75,
                  render: (level: number) => (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      L{level}
                    </span>
                  ),
                },
                {
                  title: 'Chức danh',
                  dataIndex: 'tier',
                  key: 'tier',
                  width: 120,
                  render: (tier: TelesaleTier) => (
                    <StatusTag status={getTierStatus(tier)} label={tier} />
                  ),
                },
                {
                  title: 'KPI Done (đơn)',
                  dataIndex: 'doneTarget',
                  key: 'doneTarget',
                  render: (val: number, _, idx) =>
                    isDraft ? (
                      <InputNumber
                        min={1}
                        value={val}
                        className="w-24 tabular-nums"
                        onChange={(v) => {
                          if (!v) return;
                          const next = [...currentConfig.levelTargets];
                          next[idx] = { ...next[idx], doneTarget: Number(v) };
                          setCurrentConfig((prev) => ({ ...prev, levelTargets: next }));
                        }}
                      />
                    ) : (
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                        {val.toLocaleString('vi-VN')}
                      </span>
                    ),
                },
                {
                  title: 'Khách mới',
                  dataIndex: 'newCustomersTarget',
                  key: 'newCustomersTarget',
                  render: (val: number, _, idx) =>
                    isDraft ? (
                      <InputNumber
                        min={0}
                        value={val}
                        className="w-20 tabular-nums"
                        onChange={(v) => {
                          if (!v) return;
                          const next = [...currentConfig.levelTargets];
                          next[idx] = { ...next[idx], newCustomersTarget: Number(v) };
                          setCurrentConfig((prev) => ({ ...prev, levelTargets: next }));
                        }}
                      />
                    ) : (
                      <span className="tabular-nums">{val}</span>
                    ),
                },
                {
                  title: 'Doanh thu (đ)',
                  dataIndex: 'revenueTarget',
                  key: 'revenueTarget',
                  render: (val: number, _, idx) =>
                    isDraft ? (
                      <InputNumber
                        min={0}
                        step={5000000}
                        value={val}
                        className="w-28 tabular-nums"
                        onChange={(v) => {
                          if (!v) return;
                          const next = [...currentConfig.levelTargets];
                          next[idx] = { ...next[idx], revenueTarget: Number(v) };
                          setCurrentConfig((prev) => ({ ...prev, levelTargets: next }));
                        }}
                      />
                    ) : (
                      <span className="tabular-nums">{(val / 1000000).toFixed(1)} tr</span>
                    ),
                },
                {
                  title: 'Cuộc gọi',
                  dataIndex: 'callsTarget',
                  key: 'callsTarget',
                  render: (val: number, _, idx) =>
                    isDraft ? (
                      <InputNumber
                        min={0}
                        value={val}
                        className="w-24 tabular-nums"
                        onChange={(v) => {
                          if (!v) return;
                          const next = [...currentConfig.levelTargets];
                          next[idx] = { ...next[idx], callsTarget: Number(v) };
                          setCurrentConfig((prev) => ({ ...prev, levelTargets: next }));
                        }}
                      />
                    ) : (
                      <span className="tabular-nums">{val}</span>
                    ),
                },
              ]}
            />
          </Card>

          {/* Tier Promotion Rules & Fresher Grace Period */}
          <Card
            title={
              <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Quy Chuẩn Thăng/Giáng Bậc & Quy Tắc Fresher</span>
              </div>
            }
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['FRESHER', 'JUNIOR', 'MID_LEVEL', 'SENIOR'] as TelesaleTier[]).map((tierKey) => {
                const rule = currentConfig.tierRules[tierKey];
                return (
                  <div
                    key={tierKey}
                    className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 bg-slate-50/50 dark:bg-zinc-800/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusTag
                          status={getTierStatus(tierKey)}
                          label={rule.label}
                        />
                        <span className="text-xs text-slate-500">
                          (L{rule.levelRange[0]} - L{rule.levelRange[1]})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Thâm niên tối thiểu:</span>
                        {isDraft ? (
                          <InputNumber
                            min={0}
                            value={rule.minTenureMonths}
                            addonAfter="tháng"
                            className="w-full mt-1"
                            onChange={(v) => {
                              if (v === null) return;
                              setCurrentConfig((prev) => ({
                                ...prev,
                                tierRules: {
                                  ...prev.tierRules,
                                  [tierKey]: { ...rule, minTenureMonths: Number(v) },
                                },
                              }));
                            }}
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {rule.minTenureMonths} tháng
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block">Điểm chuẩn (Passing):</span>
                        {isDraft ? (
                          <InputNumber
                            min={50}
                            max={100}
                            value={rule.passingScore}
                            addonAfter="đ"
                            className="w-full mt-1"
                            onChange={(v) => {
                              if (v === null) return;
                              setCurrentConfig((prev) => ({
                                ...prev,
                                tierRules: {
                                  ...prev.tierRules,
                                  [tierKey]: { ...rule, passingScore: Number(v) },
                                },
                              }));
                            }}
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {rule.passingScore} điểm
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block">Số tháng đạt để thăng:</span>
                        {isDraft ? (
                          <InputNumber
                            min={1}
                            max={12}
                            value={rule.consecutiveMonthsRequired}
                            addonAfter="tháng"
                            className="w-full mt-1"
                            onChange={(v) => {
                              if (v === null) return;
                              setCurrentConfig((prev) => ({
                                ...prev,
                                tierRules: {
                                  ...prev.tierRules,
                                  [tierKey]: { ...rule, consecutiveMonthsRequired: Number(v) },
                                },
                              }));
                            }}
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {rule.consecutiveMonthsRequired} tháng liên tiếp
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block">Số tháng trượt để giáng:</span>
                        {isDraft ? (
                          <InputNumber
                            min={1}
                            max={6}
                            value={rule.demotionConsecutiveFailMonths}
                            addonAfter="tháng"
                            className="w-full mt-1"
                            onChange={(v) => {
                              if (v === null) return;
                              setCurrentConfig((prev) => ({
                                ...prev,
                                tierRules: {
                                  ...prev.tierRules,
                                  [tierKey]: { ...rule, demotionConsecutiveFailMonths: Number(v) },
                                },
                              }));
                            }}
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {rule.demotionConsecutiveFailMonths} tháng liên tiếp
                          </span>
                        )}
                      </div>
                    </div>

                    {tierKey === 'FRESHER' && (
                      <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Quy tắc đặc xá Fresher (học việc không giáng bậc):
                          </span>
                          {isDraft ? (
                            <InputNumber
                              min={0}
                              max={6}
                              value={rule.fresherGracePeriodMonths || 2}
                              addonAfter="tháng"
                              className="w-28"
                              onChange={(v) => {
                                if (v === null) return;
                                setCurrentConfig((prev) => ({
                                  ...prev,
                                  tierRules: {
                                    ...prev.tierRules,
                                    FRESHER: { ...rule, fresherGracePeriodMonths: Number(v) },
                                  },
                                }));
                              }}
                            />
                          ) : (
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              {rule.fresherGracePeriodMonths || 2} tháng đầu
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Bottom Action Floating Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-md flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-10 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Button
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                onClick={handleValidate}
              >
                Kiểm Tra Tính Hợp Lệ
              </Button>

              <Button
                icon={<Play className="w-4 h-4 text-indigo-500" />}
                onClick={handlePreview}
                loading={previewLoading}
              >
                Xem Trước Điểm Kỳ Này
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isDraft && (
                <>
                  <Button
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSaveDraft}
                    loading={saving}
                  >
                    Lưu Bản Nháp
                  </Button>

                  <Button
                    type="primary"
                    icon={<Send className="w-4 h-4" />}
                    onClick={() => {
                      setPublishEffectiveMonth(currentConfig.effectiveDate || currentMonth);
                      setIsPublishModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Ban Hành Chính Thức
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Result Modal */}
      <AdaptiveModal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            {validationResult?.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            )}
            <span>Kết Quả Kiểm Tra Tính Hợp Lệ</span>
          </div>
        }
        open={isValidationModalOpen}
        onCancel={() => setIsValidationModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsValidationModalOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        {validationResult ? (
          <div className="space-y-4 py-2">
            {validationResult.valid ? (
              <Alert
                type="success"
                showIcon
                message="Cấu hình hợp lệ 100%"
                description="Toàn bộ trọng số các trụ cột, mục tiêu các Level và công thức điểm đều đạt tiêu chuẩn kỹ thuật của Wings Lashes. Bạn có thể tự tin ban hành chính thức."
              />
            ) : (
              <div className="space-y-2">
                <Alert
                  type="error"
                  showIcon
                  message="Phát hiện lỗi cần điều chỉnh trước khi ban hành:"
                  description={
                    <ul className="list-disc pl-5 text-xs space-y-1 mt-1">
                      {validationResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  }
                />
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Lưu ý:"
                description={
                  <ul className="list-disc pl-5 text-xs space-y-1 mt-1">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                }
              />
            )}
          </div>
        ) : null}
      </AdaptiveModal>

      {/* Delete Draft Modal */}
      <AdaptiveModal
        title="Xác nhận xóa bản nháp"
        open={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onOk={handleDeleteDraftConfirm}
        okText="Xóa bản nháp"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <p className="text-sm text-slate-600 dark:text-zinc-300 py-2">
          Bạn có chắc chắn muốn xóa bản nháp &quot;{currentConfig.name}&quot;? Thao tác này sẽ xóa vĩnh viễn và không thể khôi phục.
        </p>
      </AdaptiveModal>

      {/* Simulation / Preview Modal */}
      <AdaptiveModal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <Play className="w-5 h-5 text-indigo-500" />
            <span>Mô Phỏng Điểm Kỳ {currentMonth} (Bản Nháp vs Cấu Hình Đang Áp Dụng)</span>
          </div>
        }
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        {previewResult ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 text-xs">
              <div>
                Tổng số tư vấn viên: <b>{previewResult.staffCount}</b>
              </div>
              <div>
                Độ lệch điểm trung bình toàn đội:{' '}
                <span
                  className={`font-bold tabular-nums ${
                    previewResult.averageScoreDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {previewResult.averageScoreDiff > 0 ? '+' : ''}
                  {previewResult.averageScoreDiff} điểm
                </span>
              </div>
            </div>

            <DataTable
              dataSource={previewResult.rows}
              rowKey="staffId"
              pagination={{ pageSize: 8 }}
              size="small"
              columns={[
                {
                  title: 'Nhân sự',
                  dataIndex: 'staffName',
                  key: 'staffName',
                  render: (name: string, r) => (
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-zinc-100">
                        {name}
                      </div>
                      <StatusTag status={getTierStatus(r.currentTier)} label={r.currentTier} />
                    </div>
                  ),
                },
                {
                  title: 'Điểm hiện tại',
                  dataIndex: 'currentScore',
                  key: 'currentScore',
                  render: (val: number) => <span className="tabular-nums">{val}đ</span>,
                },
                {
                  title: 'Điểm mới',
                  dataIndex: 'previewScore',
                  key: 'previewScore',
                  render: (val: number) => (
                    <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {val}đ
                    </span>
                  ),
                },
                {
                  title: 'Chênh lệch',
                  dataIndex: 'scoreDiff',
                  key: 'scoreDiff',
                  render: (diff: number) => (
                    <span
                      className={`font-bold tabular-nums text-xs ${
                        diff > 0
                          ? 'text-emerald-600'
                          : diff < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  ),
                },
                {
                  title: 'Trạng thái dự kiến',
                  dataIndex: 'previewStatus',
                  key: 'previewStatus',
                  render: (status: string) => {
                    const statusType: StatusType =
                      status === 'PROMOTION_READY'
                        ? 'success'
                        : status === 'DEMOTION_FLAGGED'
                        ? 'error'
                        : status === 'WARNING_M1'
                        ? 'warning'
                        : 'default';
                    const label =
                      status === 'PROMOTION_READY'
                        ? 'Đủ điều kiện thăng'
                        : status === 'DEMOTION_FLAGGED'
                        ? 'Cảnh báo giáng'
                        : status === 'WARNING_M1'
                        ? 'Cảnh báo T1'
                        : 'Duy trì';
                    return <StatusTag status={statusType} label={label} />;
                  },
                },
              ]}
            />
          </div>
        ) : null}
      </AdaptiveModal>

      {/* Publish Confirmation Modal */}
      <AdaptiveModal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <Send className="w-5 h-5 text-emerald-500" />
            <span>Xác Nhận Ban Hành Cấu Hình Chính Thức</span>
          </div>
        }
        open={isPublishModalOpen}
        onCancel={() => setIsPublishModalOpen(false)}
        onOk={handlePublish}
        confirmLoading={publishing}
        okText="Ban Hành Ngay"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700' }}
        cancelText="Hủy"
      >
        <div className="space-y-4 py-2 text-sm text-slate-700 dark:text-zinc-300">
          <p>
            Bạn đang chuẩn bị ban hành phiên bản{' '}
            <b className="text-slate-900 dark:text-zinc-100">&quot;{currentConfig.name}&quot;</b> làm tiêu chuẩn
            chính thức của Wings Lashes.
          </p>

          <div>
            <label className="text-xs font-semibold block mb-1">
              Áp dụng hiệu lực từ kỳ tháng:
            </label>
            <DatePicker
              picker="month"
              value={dayjs(publishEffectiveMonth)}
              onChange={(d) => d && setPublishEffectiveMonth(d.format('YYYY-MM'))}
              className="w-full"
            />
          </div>

          <Alert
            type="info"
            showIcon
            message="Nguyên tắc không hồi tố (Non-retroactivity)"
            description="Các kỳ đánh giá trong quá khứ trước kỳ hiệu lực sẽ giữ nguyên cấu hình đã lưu, không bị ảnh hưởng hay thay đổi điểm số cũ."
            className="text-xs"
          />
        </div>
      </AdaptiveModal>
    </div>
  );
}
