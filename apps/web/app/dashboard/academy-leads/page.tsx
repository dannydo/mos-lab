'use client';

import React from 'react';
import { Button, Form, Input, InputNumber, List, Select, Space, Tabs, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FireOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  ACADEMY_LEAD_STATUSES,
  type AcademyCourse,
  type AcademyLead,
  type AcademyLeadStatus,
  type AcademyPlaybook,
  type SafeAny,
  type UpsertAcademyCourseRequest,
  type UpsertAcademyPlaybookRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { formatVND } from '../../../lib/format-utils';
import {
  CustomerIdentityCell,
  DataSection,
  DataTable,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  FeaturePage,
  MetricGrid,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
} from '../../../components/ui';
import AcademyLeadDrawer from './components/AcademyLeadDrawer';
import { type AcademyWorkspaceTab, useAcademySalesWorkspace } from './hooks/useAcademySalesWorkspace';

const { Text, Paragraph } = Typography;

const STATUS_LABELS: Record<AcademyLeadStatus, string> = {
  NEW: 'Mới',
  WARM: 'Đang tư vấn',
  SCHEDULED: 'Đã hẹn test',
  TESTED: 'Đã test',
  WON: 'Đã chốt',
  LOST: 'Không phù hợp',
};

const STATUS_TONES: Record<AcademyLeadStatus, React.ComponentProps<typeof StatusTag>['status']> = {
  NEW: 'default',
  WARM: 'warning',
  SCHEDULED: 'processing',
  TESTED: 'purple',
  WON: 'success',
  LOST: 'error',
};

type KnowledgeEditor =
  { kind: 'playbook'; record?: AcademyPlaybook } | { kind: 'course'; record?: AcademyCourse } | null;

function dateLabel(value: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

function hotLabel(lead: AcademyLead) {
  if (!lead.isHot || !lead.hotMarkedAt) return null;
  const age = dayjs().diff(dayjs(lead.hotMarkedAt), 'hour');
  if (age < 72) return 'Hot <72h';
  if (age < 168) return 'Warm 72–168h';
  return 'Hot quá hạn';
}

function userRole() {
  if (typeof window === 'undefined') return '';
  try {
    return String((JSON.parse(window.localStorage.getItem('mos_user') || '{}') as SafeAny).role || '');
  } catch {
    return '';
  }
}

function leadMobileCard(record: AcademyLead, onOpen: (lead: AcademyLead) => void) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-inherit p-3 text-left"
      onClick={() => onOpen(record)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <strong>{record.name}</strong>
          <div className="mt-1 text-xs opacity-70">
            {record.phone || 'Chưa có SĐT'} · {record.owner?.displayName || 'Chưa giao'}
          </div>
        </div>
        <StatusTag status={STATUS_TONES[record.status]} label={STATUS_LABELS[record.status]} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {record.course && <StatusTag status="purple" label={record.course} />}
        {hotLabel(record) && <StatusTag status="warning" label={hotLabel(record)!} />}
      </div>
    </button>
  );
}

export default function AcademyLeadsPage() {
  const workspace = useAcademySalesWorkspace();
  const [role, setRole] = React.useState('');
  const [selectedLeadId, setSelectedLeadId] = React.useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [knowledgeEditor, setKnowledgeEditor] = React.useState<KnowledgeEditor>(null);
  const [savingKnowledge, setSavingKnowledge] = React.useState(false);
  const [playbookForm] = Form.useForm<UpsertAcademyPlaybookRequest>();
  const [courseForm] = Form.useForm<UpsertAcademyCourseRequest & { syllabusText?: string }>();

  React.useEffect(() => setRole(userRole()), []);

  const isContentAdmin = role === 'admin' || role === 'manager';
  const academyAllowed = ['admin', 'manager', 'ls', 'telesales'].includes(role);
  const openLead = React.useCallback((lead?: AcademyLead) => {
    setSelectedLeadId(lead?.id || null);
    setDrawerOpen(true);
  }, []);
  const closeLead = React.useCallback(() => {
    setDrawerOpen(false);
    setSelectedLeadId(null);
  }, []);

  const leadColumns = React.useMemo<ColumnsType<AcademyLead>>(
    () => [
      {
        key: 'lead',
        title: 'Lead',
        width: 240,
        render: (_, lead) => (
          <CustomerIdentityCell
            name={lead.name}
            phone={lead.phone}
            avatar={lead.avatarUrl}
            onOpen={() => openLead(lead)}
          />
        ),
      },
      {
        key: 'status',
        title: 'Pipeline',
        width: 140,
        render: (_, lead) => <StatusTag status={STATUS_TONES[lead.status]} label={STATUS_LABELS[lead.status]} />,
      },
      {
        key: 'course',
        title: 'Khóa học / mục tiêu',
        width: 210,
        render: (_, lead) => (
          <div>
            <div>{lead.course || 'Chưa chọn khóa'}</div>
            {lead.goal && (
              <Text type="secondary" className="text-xs">
                {lead.goal}
              </Text>
            )}
          </div>
        ),
      },
      {
        key: 'owner',
        title: 'Phụ trách',
        width: 150,
        render: (_, lead) => lead.owner?.displayName || lead.legacyOwnerEmail || 'Chưa giao',
      },
      {
        key: 'schedule',
        title: 'Lịch test',
        width: 155,
        render: (_, lead) => dateLabel(lead.scheduledAt),
      },
      {
        key: 'hot',
        title: 'Ưu tiên',
        width: 135,
        render: (_, lead) =>
          hotLabel(lead) ? <StatusTag status="warning" icon={<FireOutlined />} label={hotLabel(lead)!} /> : '—',
      },
      {
        key: 'updatedAt',
        title: 'Cập nhật',
        width: 145,
        render: (_, lead) => dateLabel(lead.updatedAt),
      },
    ],
    [openLead]
  );

  const followUpColumns = React.useMemo<ColumnsType<(typeof workspace.followUps)[number]>>(
    () => [
      { key: 'lead', title: 'Lead', width: 180, render: (_, task) => task.leadName || `Lead #${task.leadId}` },
      {
        key: 'content',
        title: 'Việc cần làm',
        render: (_, task) => <Text delete={task.status === 'DONE'}>{task.content}</Text>,
      },
      { key: 'due', title: 'Hạn ICT', width: 155, render: (_, task) => dateLabel(task.dueAt) },
      {
        key: 'assignee',
        title: 'Phụ trách',
        width: 150,
        render: (_, task) => task.assignee?.displayName || 'Chưa giao',
      },
      {
        key: 'status',
        title: 'Trạng thái',
        width: 145,
        render: (_, task) => (
          <StatusTag
            status={task.status === 'DONE' ? 'success' : 'processing'}
            label={task.status === 'DONE' ? 'Hoàn thành' : 'Đang chờ'}
          />
        ),
      },
      {
        key: 'action',
        title: '',
        width: 115,
        render: (_, task) =>
          task.status === 'PENDING' ? (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={async () => {
                try {
                  await apiClient.academySales.updateFollowUp(task.id, { status: 'DONE' });
                  message.success('Đã hoàn thành follow-up.');
                  await workspace.refresh();
                } catch {
                  message.error('Không thể cập nhật follow-up.');
                }
              }}
            >
              Xong
            </Button>
          ) : null,
      },
    ],
    [workspace]
  );

  const filteredPlaybooks = React.useMemo(() => {
    const query = removeVietnameseTones(workspace.search);
    if (!query) return workspace.playbooks;
    return workspace.playbooks.filter((record) =>
      removeVietnameseTones(
        `${record.title} ${record.category} ${record.description || ''} ${record.content}`
      ).includes(query)
    );
  }, [workspace.playbooks, workspace.search]);
  const filteredCourses = React.useMemo(() => {
    const query = removeVietnameseTones(workspace.search);
    if (!query) return workspace.courses;
    return workspace.courses.filter((record) =>
      removeVietnameseTones(`${record.code} ${record.name} ${record.tag || ''} ${record.description || ''}`).includes(
        query
      )
    );
  }, [workspace.courses, workspace.search]);

  const openKnowledgeEditor = (next: KnowledgeEditor) => {
    setKnowledgeEditor(next);
    if (next?.kind === 'playbook') {
      playbookForm.setFieldsValue(
        next.record || { title: '', category: '', content: '', sortOrder: 0, isActive: true }
      );
    }
    if (next?.kind === 'course') {
      courseForm.setFieldsValue(
        next.record
          ? { ...next.record, syllabusText: JSON.stringify(next.record.syllabus, null, 2) }
          : { code: '', name: '', listPriceVnd: 0, promoPriceVnd: 0, sortOrder: 0, isActive: true, syllabusText: '[]' }
      );
    }
  };

  const savePlaybook = async (values: UpsertAcademyPlaybookRequest) => {
    if (!knowledgeEditor || knowledgeEditor.kind !== 'playbook') return;
    setSavingKnowledge(true);
    try {
      if (knowledgeEditor.record) await apiClient.academySales.updatePlaybook(knowledgeEditor.record.id, values);
      else await apiClient.academySales.createPlaybook(values);
      message.success('Đã lưu playbook.');
      setKnowledgeEditor(null);
      await workspace.refresh();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu playbook.');
    } finally {
      setSavingKnowledge(false);
    }
  };

  const saveCourse = async (values: UpsertAcademyCourseRequest & { syllabusText?: string }) => {
    if (!knowledgeEditor || knowledgeEditor.kind !== 'course') return;
    setSavingKnowledge(true);
    try {
      let syllabus: UpsertAcademyCourseRequest['syllabus'] = [];
      try {
        syllabus = values.syllabusText ? JSON.parse(values.syllabusText) : [];
        if (!Array.isArray(syllabus)) throw new Error('invalid');
      } catch {
        message.error('Giáo trình phải là JSON array hợp lệ.');
        return;
      }
      const payload: UpsertAcademyCourseRequest = {
        ...values,
        listPriceVnd: Math.round(Number(values.listPriceVnd) || 0),
        promoPriceVnd: Math.round(Number(values.promoPriceVnd) || 0),
        syllabus,
      };
      if (knowledgeEditor.record) await apiClient.academySales.updateCourse(knowledgeEditor.record.id, payload);
      else await apiClient.academySales.createCourse(payload);
      message.success('Đã lưu khóa học.');
      setKnowledgeEditor(null);
      await workspace.refresh();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu khóa học.');
    } finally {
      setSavingKnowledge(false);
    }
  };

  if (!role) return <StatePanel kind="loading" title="Đang xác thực quyền Sales Academy…" />;
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập Sales Academy"
        description="Chỉ Admin, Manager, Leader Sales và Telesales được cấp quyền."
      />
    );
  }

  const isFollowUps = workspace.activeTab === 'FOLLOW_UPS';
  const isKnowledge = workspace.activeTab === 'KNOWLEDGE';
  const tableRows = isFollowUps ? workspace.followUps : workspace.leads;
  const sectionState = workspace.loading
    ? 'loading'
    : workspace.error
      ? 'error'
      : tableRows.length === 0
        ? 'empty'
        : undefined;

  return (
    <FeaturePage
      title="Sales Academy"
      subtitle="Pipeline học viên, follow-up và tài liệu telesales · dữ liệu vận hành chuẩn nằm trong mOS."
      icon={<BookOutlined />}
      tag={<StatusTag status="purple" label="Academy" />}
      headerActions={
        <Space>
          {isContentAdmin && (
            <Tooltip title="Đồng bộ Pancake ngay">
              <Button
                aria-label="Đồng bộ Pancake Academy"
                icon={<SyncOutlined />}
                onClick={async () => {
                  try {
                    await apiClient.academySales.syncPancake();
                    message.success('Đã gửi yêu cầu đồng bộ Pancake.');
                    await workspace.refresh();
                  } catch (error: any) {
                    message.error(error?.response?.data?.message || 'Không thể đồng bộ Pancake.');
                  }
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Làm mới dữ liệu">
            <Button
              aria-label="Làm mới dữ liệu"
              icon={<ReloadOutlined />}
              loading={workspace.loading}
              onClick={() => void workspace.refresh()}
            />
          </Tooltip>
          {!isKnowledge && (
            <PagePrimaryIconAction title="Tạo lead Academy" icon={<PlusOutlined />} onClick={() => openLead()} />
          )}
        </Space>
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
            placeholder="Tìm lead, khóa học, playbook không dấu…"
            allowClear
          />
        ),
        filters: !isKnowledge ? (
          <Space wrap>
            {!isFollowUps && (
              <>
                <Select
                  value={workspace.status}
                  onChange={workspace.setStatus}
                  style={{ minWidth: 152 }}
                  options={[
                    { value: 'ALL', label: 'Mọi trạng thái' },
                    ...ACADEMY_LEAD_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
                  ]}
                />
                <Select
                  value={workspace.ownerStaffId}
                  onChange={workspace.setOwnerStaffId}
                  style={{ minWidth: 168 }}
                  options={[
                    { value: 'ALL', label: 'Mọi phụ trách' },
                    { value: 'UNASSIGNED', label: 'Chưa giao' },
                    ...workspace.staff.map((item) => ({ value: item.id, label: item.displayName })),
                  ]}
                />
              </>
            )}
            {workspace.activeTab === 'HOT' && (
              <Select
                value={workspace.hotView}
                onChange={workspace.setHotView}
                style={{ minWidth: 150 }}
                options={[
                  { value: 'PRIORITY', label: 'Tất cả ưu tiên' },
                  { value: 'HOT', label: 'Hot < 72 giờ' },
                  { value: 'WARM', label: 'Warm 72–168 giờ' },
                  { value: 'WON_TODAY', label: 'Chốt hôm nay' },
                ]}
              />
            )}
            {isFollowUps && (
              <Select
                value={workspace.followUpBucket}
                onChange={workspace.setFollowUpBucket}
                style={{ minWidth: 160 }}
                options={[
                  { value: 'ALL', label: 'Mọi follow-up' },
                  { value: 'OVERDUE', label: 'Quá hạn' },
                  { value: 'TODAY', label: 'Hôm nay' },
                  { value: 'UPCOMING', label: 'Sắp tới' },
                  { value: 'UNDATED', label: 'Chưa có hạn' },
                ]}
              />
            )}
          </Space>
        ) : undefined,
        filterTitle: 'Bộ lọc Sales Academy',
        activeFilterCount: workspace.activeFilterCount,
      }}
    >
      <MetricGrid
        columns={4}
        items={[
          { key: 'all', title: 'Tổng lead', value: workspace.summary.total, format: 'number', icon: <BookOutlined /> },
          {
            key: 'warm',
            title: 'Đang tư vấn',
            value: workspace.summary.warmCount,
            format: 'number',
            icon: <FireOutlined />,
          },
          {
            key: 'hot',
            title: 'Hot dưới 72h',
            value: workspace.summary.hotCount,
            format: 'number',
            icon: <FireOutlined />,
          },
          {
            key: 'tasks',
            title: 'Follow-up quá hạn',
            value: workspace.summary.overdueFollowUps,
            format: 'number',
            icon: <CheckCircleOutlined />,
          },
        ]}
      />

      <Tabs
        activeKey={workspace.activeTab}
        onChange={(key) => workspace.setActiveTab(key as AcademyWorkspaceTab)}
        items={[
          { key: 'PIPELINE', label: `Pipeline (${workspace.summary.total})` },
          { key: 'HOT', label: `Hot Leads (${workspace.summary.hotCount})` },
          { key: 'FOLLOW_UPS', label: `Follow-up (${workspace.summary.pendingFollowUps})` },
          { key: 'KNOWLEDGE', label: 'Playbook & Khóa học' },
        ]}
      />

      {!isKnowledge ? (
        <DataSection
          title={
            isFollowUps
              ? 'Hàng đợi follow-up'
              : workspace.activeTab === 'HOT'
                ? 'Danh sách ưu tiên'
                : 'Pipeline lead Academy'
          }
          extra={<Text type="secondary">{workspace.total.toLocaleString('vi-VN')} bản ghi</Text>}
          state={sectionState}
          stateTitle={workspace.error || (isFollowUps ? 'Chưa có follow-up theo bộ lọc' : 'Chưa có lead theo bộ lọc')}
          stateDescription={workspace.error ? 'Hãy thử làm mới dữ liệu.' : undefined}
          stateExtra={workspace.error ? <Button onClick={() => void workspace.refresh()}>Thử lại</Button> : undefined}
        >
          {isFollowUps ? (
            <DataTable
              rowKey="id"
              columns={followUpColumns}
              dataSource={workspace.followUps}
              loading={workspace.loading}
              scroll={{ x: 780 }}
              columnPriority={{
                lead: 'primary',
                content: 'primary',
                due: 'secondary',
                assignee: 'secondary',
                status: 'secondary',
                action: 'primary',
              }}
              mobileRenderer={(task) => (
                <button
                  type="button"
                  className="w-full rounded-xl border border-inherit p-3 text-left"
                  onClick={() => openLead({ id: task.leadId } as AcademyLead)}
                >
                  <div className="flex justify-between gap-2">
                    <strong>{task.leadName || `Lead #${task.leadId}`}</strong>
                    <StatusTag
                      status={task.status === 'DONE' ? 'success' : 'processing'}
                      label={task.status === 'DONE' ? 'Xong' : 'Chờ'}
                    />
                  </div>
                  <div className="mt-1 text-sm">{task.content}</div>
                  <div className="mt-1 text-xs opacity-70">
                    {dateLabel(task.dueAt)} · {task.assignee?.displayName || 'Chưa giao'}
                  </div>
                </button>
              )}
              pagination={{
                current: workspace.page,
                pageSize: workspace.pageSize,
                total: workspace.total,
                onChange: (page, pageSize) => {
                  workspace.setPage(page);
                  if (pageSize !== workspace.pageSize) workspace.setPageSize(pageSize);
                },
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total.toLocaleString('vi-VN')}`,
              }}
            />
          ) : (
            <DataTable
              rowKey="id"
              columns={leadColumns}
              dataSource={workspace.leads}
              loading={workspace.loading}
              scroll={{ x: 1080 }}
              stickyPrimaryColumn
              columnPriority={{
                lead: 'primary',
                status: 'primary',
                course: 'secondary',
                owner: 'secondary',
                schedule: 'tertiary',
                hot: 'secondary',
                updatedAt: 'tertiary',
              }}
              mobileRenderer={(lead) => leadMobileCard(lead, openLead)}
              pagination={{
                current: workspace.page,
                pageSize: workspace.pageSize,
                total: workspace.total,
                onChange: (page, pageSize) => {
                  workspace.setPage(page);
                  if (pageSize !== workspace.pageSize) workspace.setPageSize(pageSize);
                },
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total.toLocaleString('vi-VN')}`,
              }}
            />
          )}
        </DataSection>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DataSection
            title="Playbook tư vấn"
            extra={
              isContentAdmin ? (
                <Button type="link" icon={<PlusOutlined />} onClick={() => openKnowledgeEditor({ kind: 'playbook' })}>
                  Thêm
                </Button>
              ) : undefined
            }
            state={workspace.loading ? 'loading' : filteredPlaybooks.length === 0 ? 'empty' : undefined}
            stateTitle="Chưa có playbook phù hợp"
          >
            <List
              dataSource={filteredPlaybooks}
              renderItem={(item) => (
                <List.Item
                  actions={
                    isContentAdmin
                      ? [
                          <Button
                            key="edit"
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => openKnowledgeEditor({ kind: 'playbook', record: item })}
                          >
                            Sửa
                          </Button>,
                        ]
                      : []
                  }
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <strong>{item.title}</strong>
                        <StatusTag status="purple" label={item.category} />
                      </Space>
                    }
                    description={item.description || item.content}
                  />
                </List.Item>
              )}
            />
          </DataSection>
          <DataSection
            title="Khóa học"
            extra={
              isContentAdmin ? (
                <Button type="link" icon={<PlusOutlined />} onClick={() => openKnowledgeEditor({ kind: 'course' })}>
                  Thêm
                </Button>
              ) : undefined
            }
            state={workspace.loading ? 'loading' : filteredCourses.length === 0 ? 'empty' : undefined}
            stateTitle="Chưa có khóa học phù hợp"
          >
            <List
              dataSource={filteredCourses}
              renderItem={(item) => (
                <List.Item
                  actions={
                    isContentAdmin
                      ? [
                          <Button
                            key="edit"
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => openKnowledgeEditor({ kind: 'course', record: item })}
                          >
                            Sửa
                          </Button>,
                        ]
                      : []
                  }
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <strong>{item.name}</strong>
                        {item.tag && <StatusTag status="purple" label={item.tag} />}
                      </Space>
                    }
                    description={
                      <>
                        <div>{item.description || item.code}</div>
                        <Text type="secondary">
                          Niêm yết {formatVND(item.listPriceVnd)} · Ưu đãi {formatVND(item.promoPriceVnd)}
                        </Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </DataSection>
        </div>
      )}

      <AcademyLeadDrawer
        open={drawerOpen}
        leadId={selectedLeadId}
        staff={workspace.staff}
        onClose={closeLead}
        onSaved={workspace.refresh}
      />

      <EntityFormDrawer
        open={Boolean(knowledgeEditor)}
        onClose={() => setKnowledgeEditor(null)}
        title={
          knowledgeEditor?.kind === 'course'
            ? `${knowledgeEditor.record ? 'Sửa' : 'Thêm'} khóa học`
            : `${knowledgeEditor?.record ? 'Sửa' : 'Thêm'} playbook`
        }
        footer={
          <Space>
            <Button onClick={() => setKnowledgeEditor(null)}>Hủy</Button>
            <Button
              type="primary"
              loading={savingKnowledge}
              onClick={() => (knowledgeEditor?.kind === 'course' ? courseForm.submit() : playbookForm.submit())}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        {knowledgeEditor?.kind === 'playbook' ? (
          <EntityForm form={playbookForm} onFinish={savePlaybook} columns={1}>
            <EntityFormField label="Tiêu đề" name="title" rules={[{ required: true }]}>
              <Input />
            </EntityFormField>
            <EntityFormField label="Danh mục" name="category" rules={[{ required: true }]}>
              <Input placeholder="Mở đầu, xử lý từ chối…" />
            </EntityFormField>
            <EntityFormField label="Mô tả" name="description">
              <Input.TextArea rows={2} />
            </EntityFormField>
            <EntityFormField label="Nội dung" name="content" rules={[{ required: true }]}>
              <Input.TextArea rows={10} />
            </EntityFormField>
            <EntityFormField label="Thứ tự" name="sortOrder">
              <InputNumber min={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="Hiển thị" name="isActive">
              <Select
                options={[
                  { value: true, label: 'Đang dùng' },
                  { value: false, label: 'Ẩn' },
                ]}
              />
            </EntityFormField>
          </EntityForm>
        ) : knowledgeEditor?.kind === 'course' ? (
          <EntityForm form={courseForm} onFinish={saveCourse} columns={2}>
            <EntityFormField label="Mã khóa" name="code" rules={[{ required: true }]}>
              <Input />
            </EntityFormField>
            <EntityFormField label="Tên khóa" name="name" rules={[{ required: true }]}>
              <Input />
            </EntityFormField>
            <EntityFormField label="Tag" name="tag">
              <Input />
            </EntityFormField>
            <EntityFormField label="Kit" name="kitName">
              <Input />
            </EntityFormField>
            <EntityFormField label="Giá niêm yết (VNĐ)" name="listPriceVnd" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="Giá ưu đãi (VNĐ)" name="promoPriceVnd" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" />
            </EntityFormField>
            <EntityFormField fullWidth label="Mô tả" name="description">
              <Input.TextArea rows={2} />
            </EntityFormField>
            <EntityFormField fullWidth label="Link kit" name="kitUrl">
              <Input />
            </EntityFormField>
            <EntityFormField fullWidth label="Giáo trình (JSON array)" name="syllabusText">
              <Input.TextArea rows={8} spellCheck={false} />
            </EntityFormField>
            <EntityFormField label="Thứ tự" name="sortOrder">
              <InputNumber min={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="Hiển thị" name="isActive">
              <Select
                options={[
                  { value: true, label: 'Đang dùng' },
                  { value: false, label: 'Ẩn' },
                ]}
              />
            </EntityFormField>
          </EntityForm>
        ) : null}
      </EntityFormDrawer>
    </FeaturePage>
  );
}
