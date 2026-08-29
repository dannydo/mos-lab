'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Select, Space, Typography, message, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  MARKETING_EXPERIENCE_MANIFESTS,
  SEASONAL_ACCENT_PRESETS,
  type CreateUiExperienceRequest,
  type UiExperienceActivation,
  type UiExperienceListResponse,
  type UiExperienceSurface,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { safeStorage } from '../../lib/safe-storage';
import {
  AdaptiveDrawer,
  AdaptiveModal,
  AdaptiveOverlayFooter,
  ContentSurface,
  DataTable,
  MetricGrid,
  SectionCard,
  StatePanel,
  StatusTag,
} from '../ui';

const { Text } = Typography;
const PAGE_STORAGE_KEY = 'mos_ui_experience_page';
const PAGE_SIZE_STORAGE_KEY = 'mos_ui_experience_page_size';

interface ActivationFormValues {
  surface: UiExperienceSurface;
  experienceKey?: string;
  accentPresetKey?: string;
  routeScope: string;
  startsAt?: string;
  endsAt?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  trackingKey?: string;
  lifecycle?: 'DRAFT' | 'PUBLISHED';
}

function getErrorMessage(error: unknown): string {
  const apiError = error as { response?: { data?: { message?: string } }; message?: string };
  return apiError.response?.data?.message || apiError.message || 'Không thể xử lý UI Experience.';
}

function lifecycleTone(state: UiExperienceActivation['runtimeState']) {
  if (state === 'ACTIVE') return 'success' as const;
  if (state === 'SCHEDULED') return 'processing' as const;
  if (state === 'DRAFT') return 'gold' as const;
  if (state === 'PAUSED') return 'warning' as const;
  if (state === 'ENDED' || state === 'ARCHIVED') return 'default' as const;
  return 'default' as const;
}

function formatIct(value: string | null): string {
  return value ? dayjs(value).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY · HH:mm') : 'Không giới hạn';
}

function toIctLocalInput(value: string | null): string | undefined {
  return value ? dayjs(value).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm') : undefined;
}

function fromIctLocalInput(value?: string): string | null {
  if (!value) return null;
  return new Date(`${value}:00+07:00`).toISOString();
}

export default function UiExperienceControlTower() {
  const { token } = theme.useToken();
  const [form] = Form.useForm<ActivationFormValues>();
  const surface = Form.useWatch('surface', form);
  const [response, setResponse] = useState<UiExperienceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UiExperienceActivation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [rollbackTarget, setRollbackTarget] = useState<UiExperienceActivation | null>(null);
  const [rollbackRevisionId, setRollbackRevisionId] = useState<number | null>(null);
  const [page, setPage] = useState(() => Math.max(1, Number(safeStorage.getItem(PAGE_STORAGE_KEY)) || 1));
  const [pageSize, setPageSize] = useState(() =>
    [10, 20, 50, 100].includes(Number(safeStorage.getItem(PAGE_SIZE_STORAGE_KEY)))
      ? Number(safeStorage.getItem(PAGE_SIZE_STORAGE_KEY))
      : 10
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResponse(await apiClient.uiExperiences.list());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revisionsBySeries = useMemo(() => {
    const grouped = new Map<string, UiExperienceActivation[]>();
    response?.data.forEach((activation) => {
      grouped.set(activation.seriesKey, [...(grouped.get(activation.seriesKey) || []), activation]);
    });
    grouped.forEach((revisions) => revisions.sort((a, b) => b.revision - a.revision));
    return grouped;
  }, [response]);

  const currentActivations = useMemo(
    () => [...revisionsBySeries.values()].map((revisions) => revisions[0]).filter(Boolean),
    [revisionsBySeries]
  );
  const pagedActivations = currentActivations.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const maximumPage = Math.max(1, Math.ceil(currentActivations.length / pageSize));
    if (page > maximumPage) setPage(maximumPage);
  }, [currentActivations.length, page, pageSize]);

  const openCreate = () => {
    const manifest = MARKETING_EXPERIENCE_MANIFESTS[0];
    setEditing(null);
    form.setFieldsValue({
      surface: 'PUBLIC_LANDING',
      experienceKey: manifest.key,
      routeScope: `/campaigns/${manifest.slug}`,
      lifecycle: 'DRAFT',
      ctaLabel: 'Đặt lịch tư vấn',
      trackingKey: 'independence-day-2026-primary',
    });
    setDrawerOpen(true);
  };

  const openEdit = (activation: UiExperienceActivation) => {
    setEditing(activation);
    form.setFieldsValue({
      surface: activation.surface,
      experienceKey: activation.experienceKey || undefined,
      accentPresetKey: activation.accentPresetKey || undefined,
      routeScope: activation.routeScope,
      startsAt: toIctLocalInput(activation.startsAt),
      endsAt: toIctLocalInput(activation.endsAt),
      ctaLabel: activation.ctaLabel || undefined,
      ctaUrl: activation.ctaUrl || undefined,
      trackingKey: activation.trackingKey || undefined,
      lifecycle: 'DRAFT',
    });
    setDrawerOpen(true);
  };

  const handleSurfaceChange = (nextSurface: UiExperienceSurface) => {
    if (nextSurface === 'PUBLIC_LANDING') {
      const manifest = MARKETING_EXPERIENCE_MANIFESTS[0];
      form.setFieldsValue({
        experienceKey: manifest.key,
        routeScope: `/campaigns/${manifest.slug}`,
        accentPresetKey: undefined,
      });
    } else {
      form.setFieldsValue({
        experienceKey: undefined,
        routeScope: '/dashboard',
        accentPresetKey: SEASONAL_ACCENT_PRESETS[0]?.key,
        ctaLabel: undefined,
        ctaUrl: undefined,
        trackingKey: undefined,
      });
    }
  };

  const handleManifestChange = (key: string) => {
    const manifest = MARKETING_EXPERIENCE_MANIFESTS.find((item) => item.key === key);
    if (manifest) form.setFieldValue('routeScope', `/campaigns/${manifest.slug}`);
  };

  const submit = async (values: ActivationFormValues) => {
    const manifest = MARKETING_EXPERIENCE_MANIFESTS.find((item) => item.key === values.experienceKey);
    const payload: CreateUiExperienceRequest = {
      surface: values.surface,
      routeScope: values.routeScope,
      experienceKey: values.surface === 'PUBLIC_LANDING' ? values.experienceKey : null,
      experienceVersion: values.surface === 'PUBLIC_LANDING' ? manifest?.version || null : null,
      accentPresetKey: values.accentPresetKey || null,
      startsAt: fromIctLocalInput(values.startsAt),
      endsAt: fromIctLocalInput(values.endsAt),
      ctaLabel: values.surface === 'PUBLIC_LANDING' ? values.ctaLabel || null : null,
      ctaUrl: values.surface === 'PUBLIC_LANDING' ? values.ctaUrl || null : null,
      trackingKey: values.surface === 'PUBLIC_LANDING' ? values.trackingKey || null : null,
      lifecycle: values.lifecycle || 'DRAFT',
    };
    setSaving(true);
    try {
      if (editing) {
        const { lifecycle: _lifecycle, ...revision } = payload;
        await apiClient.uiExperiences.revise(editing.id, revision);
        message.success('Đã tạo revision draft mới.');
      } else {
        await apiClient.uiExperiences.create(payload);
        message.success('Đã tạo UI Experience.');
      }
      setDrawerOpen(false);
      form.resetFields();
      await load();
    } catch (submitError) {
      message.error(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const setLifecycle = async (activation: UiExperienceActivation, lifecycle: UiExperienceActivation['lifecycle']) => {
    try {
      await apiClient.uiExperiences.setLifecycle(activation.id, { lifecycle });
      message.success(`Đã chuyển activation sang ${lifecycle}.`);
      await load();
    } catch (lifecycleError) {
      message.error(getErrorMessage(lifecycleError));
    }
  };

  const openPreview = async (activation: UiExperienceActivation) => {
    const manifest = MARKETING_EXPERIENCE_MANIFESTS.find(
      (item) => item.key === activation.experienceKey && item.version === activation.experienceVersion
    );
    if (!manifest) return;
    try {
      const previewToken = await apiClient.uiExperiences.createPreviewToken(activation.id);
      setPreview({
        label: manifest.label,
        url: `/campaigns/${manifest.slug}?preview=${encodeURIComponent(previewToken.token)}`,
      });
    } catch (previewError) {
      message.error(getErrorMessage(previewError));
    }
  };

  const performRollback = async () => {
    if (!rollbackTarget || !rollbackRevisionId) return;
    setSaving(true);
    try {
      await apiClient.uiExperiences.rollback(rollbackTarget.id, { revisionId: rollbackRevisionId });
      message.success('Đã rollback và publish revision mới.');
      setRollbackTarget(null);
      setRollbackRevisionId(null);
      await load();
    } catch (rollbackError) {
      message.error(getErrorMessage(rollbackError));
    } finally {
      setSaving(false);
    }
  };

  const renderActions = (activation: UiExperienceActivation) => {
    const hasHistory = (revisionsBySeries.get(activation.seriesKey)?.length || 0) > 1;
    return (
      <Space size={6} wrap>
        {activation.surface === 'PUBLIC_LANDING' && activation.lifecycle !== 'ARCHIVED' ? (
          <Button size="small" onClick={() => openPreview(activation)}>
            Preview
          </Button>
        ) : null}
        {activation.lifecycle !== 'ARCHIVED' ? (
          <Button size="small" onClick={() => openEdit(activation)}>
            Tạo revision
          </Button>
        ) : null}
        {activation.lifecycle === 'DRAFT' || activation.lifecycle === 'PAUSED' ? (
          <Button size="small" type="primary" onClick={() => setLifecycle(activation, 'PUBLISHED')}>
            Publish
          </Button>
        ) : null}
        {activation.lifecycle === 'PUBLISHED' ? (
          <Button size="small" onClick={() => setLifecycle(activation, 'PAUSED')}>
            Pause
          </Button>
        ) : null}
        {hasHistory ? (
          <Button
            size="small"
            onClick={() => {
              setRollbackTarget(activation);
              setRollbackRevisionId(null);
            }}
          >
            Rollback
          </Button>
        ) : null}
        {activation.lifecycle !== 'ARCHIVED' ? (
          <Button size="small" danger onClick={() => setLifecycle(activation, 'ARCHIVED')}>
            Archive
          </Button>
        ) : null}
      </Space>
    );
  };

  const columns: ColumnsType<UiExperienceActivation> = [
    {
      title: 'Experience',
      key: 'experience',
      width: 250,
      render: (_, activation) => (
        <div>
          <Text strong>{activation.experienceKey || activation.accentPresetKey || 'Seasonal Accent'}</Text>
          <div>
            <Text type="secondary" className="text-xs">
              {activation.surface} · revision {activation.revision}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'runtimeState',
      key: 'status',
      width: 130,
      render: (state: UiExperienceActivation['runtimeState']) => (
        <StatusTag status={lifecycleTone(state)} label={state} />
      ),
    },
    {
      title: 'Route & lịch ICT',
      key: 'schedule',
      width: 300,
      render: (_, activation) => (
        <div className="space-y-1">
          <Text code>{activation.routeScope}</Text>
          <div className="text-xs tabular-nums" style={{ color: token.colorTextSecondary }}>
            {formatIct(activation.startsAt)} → {formatIct(activation.endsAt)}
          </div>
        </div>
      ),
    },
    {
      title: 'Hiệu quả',
      key: 'metrics',
      width: 145,
      render: (_, activation) => (
        <div className="text-xs tabular-nums">
          <div>{activation.metrics?.views || 0} lượt xem</div>
          <div style={{ color: token.colorTextSecondary }}>{activation.metrics?.ctaClicks || 0} CTA click</div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 340,
      fixed: 'right',
      render: (_, activation) => renderActions(activation),
    },
  ];

  if (loading) return <StatePanel kind="loading" title="Đang tải UI Control Tower" />;
  if (error)
    return (
      <StatePanel
        kind="error"
        title="Không thể tải UI Control Tower"
        description={error}
        extra={<Button onClick={load}>Thử lại</Button>}
      />
    );

  const activeCount = currentActivations.filter((item) => item.runtimeState === 'ACTIVE').length;
  const scheduledCount = currentActivations.filter((item) => item.runtimeState === 'SCHEDULED').length;
  const draftCount = currentActivations.filter((item) => item.runtimeState === 'DRAFT').length;

  return (
    <div className="space-y-4 pt-2">
      <Alert
        type="info"
        showIcon
        message="Visual được deploy bằng code; Admin chỉ quản lý activation"
        description="Landing có art direction riêng nhưng CTA, preview, lifecycle, lịch ICT, audit và tracking luôn đi qua contract chung. Seasonal Accent chỉ tác động dashboard shell."
      />

      <MetricGrid
        items={[
          { key: 'active', title: 'Đang hoạt động', value: activeCount },
          { key: 'scheduled', title: 'Đã lên lịch', value: scheduledCount },
          { key: 'draft', title: 'Bản nháp', value: draftCount },
          { key: 'registry', title: 'Visual đã deploy', value: response?.manifests.length || 0 },
        ]}
      />

      <SectionCard
        title="Activations"
        extra={
          <Space>
            <Button onClick={load}>Làm mới</Button>
            <Button type="primary" onClick={openCreate}>
              Tạo activation
            </Button>
          </Space>
        }
      >
        <Text type="secondary" className="mb-3 block text-sm">
          Resolver tự suy ra Scheduled / Active / Ended theo giờ Asia/Ho_Chi_Minh.
        </Text>
        <DataTable<UiExperienceActivation>
          rowKey="id"
          columns={columns}
          dataSource={pagedActivations}
          scroll={{ x: 1180 }}
          pagination={{
            current: page,
            pageSize,
            total: currentActivations.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} activation`,
            onChange: (nextPage, nextPageSize) => {
              const sizeChanged = nextPageSize !== pageSize;
              setPage(sizeChanged ? 1 : nextPage);
              setPageSize(nextPageSize);
              safeStorage.setItem(PAGE_STORAGE_KEY, String(sizeChanged ? 1 : nextPage));
              safeStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(nextPageSize));
            },
          }}
          columnPriority={{
            experience: 'primary',
            status: 'primary',
            schedule: 'secondary',
            metrics: 'tertiary',
            actions: 'primary',
          }}
          mobileRecordKey={(activation) => activation.id}
          mobileRenderer={(activation) => (
            <ContentSurface className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Text strong>{activation.experienceKey || activation.accentPresetKey}</Text>
                  <div className="text-xs" style={{ color: token.colorTextSecondary }}>
                    revision {activation.revision} · {activation.routeScope}
                  </div>
                </div>
                <StatusTag status={lifecycleTone(activation.runtimeState)} label={activation.runtimeState} />
              </div>
              <div className="text-xs tabular-nums" style={{ color: token.colorTextSecondary }}>
                {formatIct(activation.startsAt)} → {formatIct(activation.endsAt)}
              </div>
              {renderActions(activation)}
            </ContentSurface>
          )}
        />
      </SectionCard>

      <SectionCard title="Audit gần đây">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {response?.audits.slice(0, 8).map((audit) => (
            <ContentSurface key={audit.id} className="flex items-center justify-between gap-3">
              <div>
                <Text strong>{audit.action}</Text>
                <div className="text-xs" style={{ color: token.colorTextSecondary }}>
                  Activation #{audit.activationId} · actor #{audit.actorStaffId || 'system'}
                </div>
              </div>
              <Text type="secondary" className="shrink-0 text-xs tabular-nums">
                {formatIct(audit.createdAt)}
              </Text>
            </ContentSurface>
          ))}
          {!response?.audits.length ? <StatePanel kind="empty" title="Chưa có thay đổi được ghi nhận" /> : null}
        </div>
      </SectionCard>

      <AdaptiveDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        intent="form"
        title={editing ? `Tạo revision từ #${editing.revision}` : 'Tạo UI Experience activation'}
        destroyOnHidden
        footer={
          <AdaptiveOverlayFooter>
            <Button onClick={() => setDrawerOpen(false)}>Hủy</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              {editing ? 'Lưu revision draft' : 'Tạo activation'}
            </Button>
          </AdaptiveOverlayFooter>
        }
      >
        <Form<ActivationFormValues> form={form} layout="vertical" onFinish={submit} requiredMark="optional">
          <Form.Item name="surface" label="Surface" rules={[{ required: true }]}>
            <Select
              onChange={handleSurfaceChange}
              options={[
                { value: 'PUBLIC_LANDING', label: 'Public Landing' },
                { value: 'DASHBOARD_ACCENT', label: 'Dashboard Seasonal Accent' },
              ]}
            />
          </Form.Item>

          {surface === 'PUBLIC_LANDING' ? (
            <Form.Item name="experienceKey" label="Landing đã deploy" rules={[{ required: true }]}>
              <Select
                onChange={handleManifestChange}
                options={MARKETING_EXPERIENCE_MANIFESTS.map((manifest) => ({
                  value: manifest.key,
                  label: `${manifest.label} · ${manifest.version}`,
                }))}
              />
            </Form.Item>
          ) : (
            <Form.Item name="accentPresetKey" label="Seasonal Accent preset" rules={[{ required: true }]}>
              <Select options={SEASONAL_ACCENT_PRESETS.map((preset) => ({ value: preset.key, label: preset.label }))} />
            </Form.Item>
          )}

          <Form.Item name="routeScope" label="Route scope" rules={[{ required: true }]}>
            <Input readOnly={surface === 'PUBLIC_LANDING'} />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="startsAt" label="Bắt đầu · ICT">
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="endsAt" label="Kết thúc · ICT">
              <Input type="datetime-local" />
            </Form.Item>
          </div>

          {surface === 'PUBLIC_LANDING' ? (
            <>
              <Form.Item name="ctaLabel" label="CTA label" rules={[{ required: true }]}>
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item
                name="ctaUrl"
                label="CTA URL"
                rules={[{ required: true }, { pattern: /^(https:|tel:)/, message: 'Chỉ chấp nhận https: hoặc tel:' }]}
              >
                <Input placeholder="https://… hoặc tel:+84…" />
              </Form.Item>
              <Form.Item
                name="trackingKey"
                label="Tracking key"
                rules={[{ required: true }, { pattern: /^[a-z0-9][a-z0-9._-]*$/i }]}
              >
                <Input />
              </Form.Item>
            </>
          ) : null}

          {!editing ? (
            <Form.Item name="lifecycle" label="Trạng thái sau khi tạo">
              <Select
                options={[
                  { value: 'DRAFT', label: 'Draft — preview trước' },
                  { value: 'PUBLISHED', label: 'Published — resolver theo lịch' },
                ]}
              />
            </Form.Item>
          ) : null}
        </Form>
      </AdaptiveDrawer>

      <AdaptiveModal
        open={Boolean(preview)}
        onCancel={() => setPreview(null)}
        title={preview ? `Preview · ${preview.label}` : 'Preview'}
        intent="data"
        width="min(96vw, 1500px)"
        footer={
          <AdaptiveOverlayFooter>
            <Select
              value={previewMode}
              onChange={setPreviewMode}
              options={[
                { value: 'mobile', label: 'Mobile · 390px' },
                { value: 'desktop', label: 'Desktop · 1440px' },
              ]}
            />
            {preview ? (
              <Button onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}>Mở tab riêng</Button>
            ) : null}
            <Button type="primary" onClick={() => setPreview(null)}>
              Đóng
            </Button>
          </AdaptiveOverlayFooter>
        }
      >
        {preview ? (
          <div className="flex justify-center overflow-auto rounded-xl p-3" style={{ background: token.colorBgLayout }}>
            <iframe
              src={preview.url}
              title={`Bản xem trước ${preview.label}`}
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 16,
                height: '72dvh',
                width: previewMode === 'mobile' ? 390 : '100%',
                maxWidth: '100%',
                background: token.colorBgContainer,
              }}
            />
          </div>
        ) : null}
      </AdaptiveModal>

      <AdaptiveModal
        open={Boolean(rollbackTarget)}
        onCancel={() => setRollbackTarget(null)}
        title="Rollback experience"
        intent="confirm"
        confirmLoading={saving}
        onOk={performRollback}
        okButtonProps={{ disabled: !rollbackRevisionId }}
        okText="Rollback và publish"
        cancelText="Hủy"
      >
        <Alert
          type="warning"
          showIcon
          message="Rollback tạo revision mới và kích hoạt ngay"
          description="Revision hiện tại được archive; lịch kết thúc tương lai được giữ lại nếu còn hiệu lực."
          className="mb-4"
        />
        <Select
          className="w-full"
          placeholder="Chọn revision nguồn"
          value={rollbackRevisionId}
          onChange={setRollbackRevisionId}
          options={(rollbackTarget ? revisionsBySeries.get(rollbackTarget.seriesKey) || [] : [])
            .filter((revision) => revision.id !== rollbackTarget?.id)
            .map((revision) => ({
              value: revision.id,
              label: `Revision ${revision.revision} · ${revision.experienceVersion || revision.accentPresetKey || ''}`,
            }))}
        />
      </AdaptiveModal>
    </div>
  );
}
