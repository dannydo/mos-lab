'use client';

import React from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Switch, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { CalendarDays, MapPin, Play, Plus, Presentation, RefreshCw, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AcademyWorkshopListItem, AcademyWorkshopStatus, CreateAcademyWorkshopRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useAcademyAccess } from '../components/AcademyAccessGate';
import {
  AppIcon,
  AdaptiveModal,
  DataSection,
  DataTable,
  FeaturePage,
  MetricGrid,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
} from '../../../../components/ui';

const STORAGE_KEY = 'academy-workshops:list:v1';
const STATUS_LABELS: Record<AcademyWorkshopStatus, string> = {
  DRAFT: 'Nháp',
  SCHEDULED: 'Đã lên lịch',
  CHECKIN_OPEN: 'Mở check-in',
  LIVE: 'Đang live',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  ARCHIVED: 'Lưu trữ',
};

type Query = { page: number; pageSize: number; search: string; status: AcademyWorkshopStatus | 'ALL' };
type WorkshopForm = Omit<CreateAcademyWorkshopRequest, 'startsAt' | 'endsAt' | 'feeDueAt'> & {
  schedule: [Dayjs, Dayjs];
  feeDueAt?: Dayjs | null;
};

function readQuery(): Query {
  if (typeof window === 'undefined') return { page: 1, pageSize: 20, search: '', status: 'ALL' };
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<Query>;
    return {
      page: Math.max(1, Number(value.page) || 1),
      pageSize: [10, 20, 50, 100].includes(Number(value.pageSize)) ? Number(value.pageSize) : 20,
      search: String(value.search || ''),
      status: value.status || 'ALL',
    };
  } catch {
    return { page: 1, pageSize: 20, search: '', status: 'ALL' };
  }
}

function statusTone(status: AcademyWorkshopStatus) {
  if (status === 'LIVE') return 'success';
  if (status === 'PAUSED' || status === 'CHECKIN_OPEN') return 'warning';
  if (status === 'COMPLETED') return 'processing';
  if (status === 'CANCELLED' || status === 'ARCHIVED') return 'default';
  return 'purple';
}

export default function AcademyWorkshopsPage() {
  const { canAccess } = useAcademyAccess();
  const router = useRouter();
  const [form] = Form.useForm<WorkshopForm>();
  const [hydrated, setHydrated] = React.useState(false);
  const [query, setQuery] = React.useState<Query>({ page: 1, pageSize: 20, search: '', status: 'ALL' });
  const [rows, setRows] = React.useState<AcademyWorkshopListItem[]>([]);
  const [summary, setSummary] = React.useState({ total: 0, confirmed: 0, checkedIn: 0, tuitionPaid: 0 });
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const deferredSearch = React.useDeferredValue(query.search);

  React.useEffect(() => {
    setQuery(readQuery());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(query));
  }, [hydrated, query]);

  const load = React.useCallback(async () => {
    if (!canAccess || !hydrated) return;
    setLoading(true);
    try {
      const response = await apiClient.academySales.workshops.list({
        page: query.page,
        limit: query.pageSize,
        search: deferredSearch || undefined,
        status: query.status,
      });
      setRows(response.data);
      setTotal(response.total);
      setSummary(response.summary || { total: 0, confirmed: 0, checkedIn: 0, tuitionPaid: 0 });
      setError(null);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'Không thể tải danh sách workshop.');
    } finally {
      setLoading(false);
    }
  }, [canAccess, deferredSearch, hydrated, query.page, query.pageSize, query.status]);

  React.useEffect(() => void load(), [load]);

  const createWorkshop = React.useCallback(
    async (values: WorkshopForm) => {
      setSaving(true);
      try {
        const workshop = await apiClient.academySales.workshops.create({
          name: values.name.trim(),
          slug: values.slug?.trim() || undefined,
          description: values.description?.trim() || null,
          startsAt: values.schedule[0].toISOString(),
          endsAt: values.schedule[1].toISOString(),
          location: values.location.trim(),
          capacity: values.capacity || 100,
          feeVnd: Math.round(Number(values.feeVnd) || 0),
          feeDueAt: values.feeDueAt?.toISOString() || null,
          showInSidebar: Boolean(values.showInSidebar),
          agenda: [
            { title: 'Đón khách & check-in', kind: 'OTHER', plannedDurationSeconds: 30 * 60, sortOrder: 1 },
            { title: 'Kiểm tra Tố Chất', kind: 'TALENT_TEST', plannedDurationSeconds: 45 * 60, sortOrder: 2 },
            { title: 'Nội dung workshop', kind: 'CONTENT', plannedDurationSeconds: 60 * 60, sortOrder: 3 },
            { title: 'Game tương tác', kind: 'GAME', plannedDurationSeconds: 20 * 60, sortOrder: 4 },
            { title: 'Tư vấn lộ trình & chốt khóa', kind: 'SALES', plannedDurationSeconds: 30 * 60, sortOrder: 5 },
          ],
        });
        message.success('Đã tạo workspace workshop.');
        setOpen(false);
        form.resetFields();
        router.push(`/dashboard/academy-leads/workshops/${workshop.slug}`);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể tạo workshop.');
      } finally {
        setSaving(false);
      }
    },
    [form, router]
  );

  const columns = React.useMemo<ColumnsType<AcademyWorkshopListItem>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 58,
        align: 'center',
        render: (_value, _row, index) => (
          <span className="tabular-nums">{(query.page - 1) * query.pageSize + index + 1}</span>
        ),
      },
      {
        key: 'name',
        title: 'Workshop',
        width: 300,
        render: (_value, row) => (
          <button
            type="button"
            className="text-left"
            onClick={() => router.push(`/dashboard/academy-leads/workshops/${row.slug}`)}
          >
            <div className="font-semibold hover:underline">{row.name}</div>
            <div className="mt-1 text-xs opacity-60">/{row.slug}</div>
          </button>
        ),
      },
      {
        key: 'schedule',
        title: 'Lịch workshop',
        width: 230,
        render: (_value, row) => (
          <div>
            <div className="flex items-center gap-1.5 tabular-nums">
              <AppIcon icon={CalendarDays} size="sm" /> {dayjs(row.startsAt).format('DD/MM/YYYY · HH:mm')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs opacity-65">
              <AppIcon icon={MapPin} size="sm" /> {row.location}
            </div>
          </div>
        ),
      },
      {
        key: 'readiness',
        title: 'Sẵn sàng',
        width: 170,
        render: (_value, row) => (
          <div className="tabular-nums">
            <strong>{row.checkedInCount}</strong> check-in / {row.participantCount} học viên
            <div className="mt-1 text-xs opacity-60">Sức chứa {row.capacity}</div>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng thái',
        width: 145,
        render: (_value, row) => <StatusTag status={statusTone(row.status)} label={STATUS_LABELS[row.status]} />,
      },
      {
        key: 'action',
        title: 'Vận hành',
        width: 140,
        render: (_value, row) => (
          <Button
            size="small"
            icon={<AppIcon icon={row.status === 'LIVE' ? Play : Presentation} />}
            onClick={() => router.push(`/dashboard/academy-leads/workshops/${row.slug}`)}
          >
            Mở workspace
          </Button>
        ),
      },
    ],
    [query.page, query.pageSize, router]
  );

  if (!canAccess) return <StatePanel kind="empty" title="Bạn chưa có quyền truy cập Academy Workshop." />;

  return (
    <FeaturePage
      title="Academy Workshop OS"
      subtitle="Vận hành trọn phễu từ lời mời đến học phí, thưởng giáo viên và follow-up sau workshop."
      icon={<AppIcon icon={Presentation} />}
      tag="V1 · 100 học viên"
      headerActions={
        <Space>
          <Button icon={<AppIcon icon={RefreshCw} />} onClick={() => void load()} loading={loading}>
            Làm mới
          </Button>
          <PagePrimaryIconAction title="Tạo workshop" icon={<AppIcon icon={Plus} />} onClick={() => setOpen(true)} />
        </Space>
      }
      toolbar={{
        primary: (
          <SearchField
            value={query.search}
            onChange={(event) => setQuery((previous) => ({ ...previous, search: event.target.value, page: 1 }))}
            placeholder="Tìm workshop, địa điểm…"
          />
        ),
        filters: (
          <Select
            value={query.status}
            className="min-w-40"
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(status) => setQuery((previous) => ({ ...previous, status, page: 1 }))}
          />
        ),
      }}
    >
      <MetricGrid
        items={[
          {
            key: 'invited',
            title: 'Học viên trong phễu',
            value: summary.total,
            format: 'number',
            icon: <AppIcon icon={Users} />,
          },
          { key: 'confirmed', title: 'Đã xác nhận', value: summary.confirmed, format: 'number' },
          { key: 'checkedin', title: 'Đã check-in', value: summary.checkedIn, format: 'number' },
          { key: 'paid', title: 'Đã đóng đủ học phí', value: summary.tuitionPaid, format: 'number' },
        ]}
      />
      <DataSection
        title="Danh sách workshop"
        state={error ? 'error' : !loading && !rows.length ? 'empty' : undefined}
        stateTitle={error || 'Chưa có workshop phù hợp'}
        stateExtra={error ? <Button onClick={() => void load()}>Thử lại</Button> : undefined}
      >
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 1050 }}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (count) => `${count.toLocaleString('vi-VN')} workshop`,
            onChange: (page, pageSize) => setQuery((previous) => ({ ...previous, page, pageSize })),
          }}
        />
      </DataSection>

      <AdaptiveModal
        open={open}
        title="Tạo Academy workshop"
        okText="Tạo workspace"
        cancelText="Hủy"
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={760}
        destroyOnHidden
      >
        <Form<WorkshopForm>
          form={form}
          layout="vertical"
          onFinish={createWorkshop}
          initialValues={{ capacity: 100, feeVnd: 0, showInSidebar: true }}
        >
          <div className="grid gap-x-4 md:grid-cols-2">
            <Form.Item name="name" label="Tên workshop" rules={[{ required: true, message: 'Nhập tên workshop' }]}>
              <Input placeholder="Workshop Tìm kiếm tài năng nối mi" />
            </Form.Item>
            <Form.Item name="slug" label="Slug (tùy chọn)">
              <Input placeholder="workshop-to-chat-thang-9" />
            </Form.Item>
            <Form.Item name="schedule" label="Thời gian" rules={[{ required: true, message: 'Chọn thời gian' }]}>
              <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
            </Form.Item>
            <Form.Item name="location" label="Địa điểm" rules={[{ required: true, message: 'Nhập địa điểm' }]}>
              <Input placeholder="Wings Academy · 123…" />
            </Form.Item>
            <Form.Item name="capacity" label="Sức chứa tối đa">
              <InputNumber min={1} max={100} precision={0} className="w-full" />
            </Form.Item>
            <Form.Item name="feeVnd" label="Phí tham dự">
              <InputNumber
                min={0}
                precision={0}
                step={100000}
                className="w-full"
                formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
              />
            </Form.Item>
            <Form.Item name="feeDueAt" label="Hạn đóng phí">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
            </Form.Item>
            <Form.Item name="showInSidebar" label="Ghim nhanh ở menu" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="description" label="Mô tả" className="md:col-span-2">
              <Input.TextArea rows={3} placeholder="Mục tiêu, đối tượng và thông tin vận hành…" />
            </Form.Item>
          </div>
        </Form>
      </AdaptiveModal>
    </FeaturePage>
  );
}
