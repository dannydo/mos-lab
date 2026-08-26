'use client';

import React from 'react';
import { Button, Form, Input, InputNumber, Select, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Pencil, Plus, RefreshCw, UserRoundCog } from 'lucide-react';
import { isAdminOrSuperAdminRole, removeVietnameseTones } from '@mos-lab/shared';
import type {
  AcademyStaffOption,
  AcademyTalentInstructor,
  SafeAny,
  UpsertAcademyTalentInstructorRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  DataTable,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  FeaturePage,
  IconButton,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
} from '../../../../components/ui';

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
const PAGE_STORAGE_KEY = 'academy-instructor-config:page';
const PAGE_SIZE_STORAGE_KEY = 'academy-instructor-config:page-size';

type InstructorFormValues = UpsertAcademyTalentInstructorRequest;

function currentRole() {
  if (typeof window === 'undefined') return '';
  try {
    return String((JSON.parse(window.localStorage.getItem('mos_user') || '{}') as SafeAny).role || '');
  } catch {
    return '';
  }
}

function persistedNumber(key: string, fallback: number, accepted?: number[]) {
  if (typeof window === 'undefined') return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 && (!accepted || accepted.includes(value)) ? value : fallback;
}

function defaultCode(name: string) {
  return removeVietnameseTones(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 49);
}

function rateLabel(value: number) {
  return value > 0 ? `+${value}% học phí sau học bổng` : 'Miễn phí';
}

export default function AcademyInstructorConfigurationPage() {
  const [role, setRole] = React.useState('');
  const [instructors, setInstructors] = React.useState<AcademyTalentInstructor[]>([]);
  const [staff, setStaff] = React.useState<AcademyStaffOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(() => persistedNumber(PAGE_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = React.useState(() => persistedNumber(PAGE_SIZE_STORAGE_KEY, 20, [10, 20, 50, 100]));
  const [editingInstructor, setEditingInstructor] = React.useState<AcademyTalentInstructor | null | undefined>(
    undefined
  );
  const [saving, setSaving] = React.useState(false);
  const [form] = Form.useForm<InstructorFormValues>();

  React.useEffect(() => setRole(currentRole()), []);
  const canManage = isAdminOrSuperAdminRole(role) || role === 'manager';

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [instructorResponse, staffOptions] = await Promise.all([
        apiClient.academySales.listTalentInstructorConfigurations(),
        apiClient.academySales.listStaff(),
      ]);
      setInstructors(instructorResponse.data);
      setStaff(staffOptions);
    } catch (nextError: any) {
      setError(nextError?.response?.data?.message || 'Không thể tải cấu hình giảng viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  React.useEffect(() => {
    window.localStorage.setItem(PAGE_STORAGE_KEY, String(page));
  }, [page]);
  React.useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);

  const staffById = React.useMemo(() => new Map(staff.map((option) => [option.id, option])), [staff]);
  const filteredInstructors = React.useMemo(() => {
    const query = removeVietnameseTones(search);
    return instructors.filter(
      (instructor) =>
        !query ||
        removeVietnameseTones(
          `${instructor.displayName} ${instructor.code} ${instructor.description || ''} ${staffById.get(instructor.staffId || -1)?.displayName || ''}`
        ).includes(query)
    );
  }, [instructors, search, staffById]);

  React.useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredInstructors.length / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [filteredInstructors.length, page, pageSize]);

  const pagedInstructors = React.useMemo(
    () => filteredInstructors.slice((page - 1) * pageSize, page * pageSize),
    [filteredInstructors, page, pageSize]
  );

  const openEditor = React.useCallback(
    (instructor?: AcademyTalentInstructor) => {
      setEditingInstructor(instructor || null);
      form.resetFields();
      form.setFieldsValue(
        instructor || {
          code: '',
          staffId: null,
          displayName: '',
          description: null,
          avatarUrl: null,
          surchargePercent: 0,
          isActive: true,
          sortOrder: instructors.length * 10,
        }
      );
    },
    [form, instructors.length]
  );

  const closeEditor = React.useCallback(() => {
    setEditingInstructor(undefined);
    form.resetFields();
  }, [form]);

  const save = React.useCallback(
    async (values: InstructorFormValues) => {
      const payload: UpsertAcademyTalentInstructorRequest = {
        code: defaultCode(values.code),
        staffId: values.staffId || null,
        displayName: values.displayName.trim(),
        description: values.description?.trim() || null,
        avatarUrl: values.avatarUrl?.trim() || null,
        surchargePercent: Math.round(Number(values.surchargePercent) || 0),
        isActive: Boolean(values.isActive),
        sortOrder: Math.max(0, Math.round(Number(values.sortOrder) || 0)),
      };
      setSaving(true);
      try {
        if (editingInstructor) await apiClient.academySales.updateTalentInstructor(editingInstructor.id, payload);
        else await apiClient.academySales.createTalentInstructor(payload);
        message.success(editingInstructor ? 'Đã cập nhật giảng viên.' : 'Đã thêm giảng viên.');
        closeEditor();
        await load();
      } catch (nextError: any) {
        message.error(nextError?.response?.data?.message || 'Không thể lưu cấu hình giảng viên.');
      } finally {
        setSaving(false);
      }
    },
    [closeEditor, editingInstructor, load]
  );

  const columns = React.useMemo<ColumnsType<AcademyTalentInstructor>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 52,
        align: 'center',
        render: (_value, _record, index) => (
          <span className="tabular-nums font-medium">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      {
        key: 'instructor',
        title: 'Giảng viên',
        width: 310,
        render: (_value, instructor) => (
          <div className="flex min-w-0 items-center gap-2">
            {instructor.avatarUrl ? (
              <img src={instructor.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                <AppIcon icon={UserRoundCog} size="disclosure" />
              </span>
            )}
            <div className="min-w-0">
              <strong>{instructor.displayName}</strong>
              <div className="text-xs opacity-60">{instructor.description || 'Chưa có mô tả'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'staff',
        title: 'Hồ sơ nhân sự',
        width: 190,
        render: (_value, instructor) => staffById.get(instructor.staffId || -1)?.displayName || 'Chưa liên kết',
      },
      {
        key: 'surcharge',
        title: 'Phụ phí',
        width: 210,
        render: (_value, instructor) => (
          <StatusTag
            status={instructor.surchargePercent > 0 ? 'warning' : 'success'}
            label={rateLabel(instructor.surchargePercent)}
          />
        ),
      },
      {
        key: 'status',
        title: 'Trạng thái',
        width: 120,
        render: (_value, instructor) => (
          <StatusTag
            status={instructor.isActive ? 'success' : 'default'}
            label={instructor.isActive ? 'Đang dùng' : 'Đã ẩn'}
          />
        ),
      },
      {
        key: 'sortOrder',
        title: 'Thứ tự',
        width: 96,
        align: 'center',
        render: (_value, instructor) => <span className="tabular-nums">{instructor.sortOrder}</span>,
      },
      {
        key: 'action',
        title: 'Thao tác',
        width: 105,
        render: (_value, instructor) => (
          <Button type="link" size="small" icon={<AppIcon icon={Pencil} />} onClick={() => openEditor(instructor)}>
            Sửa
          </Button>
        ),
      },
    ],
    [openEditor, page, pageSize, staffById]
  );

  if (!role) return <StatePanel kind="loading" title="Đang xác thực quyền cấu hình giảng viên…" />;
  if (!canManage) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền cấu hình giảng viên"
        description="Chỉ Admin hoặc Manager được thay đổi phụ phí Tố Chất."
      />
    );
  }

  return (
    <FeaturePage
      title="Giảng viên Academy"
      subtitle="Thiết lập phụ phí chỉ định giảng viên. Phụ phí chỉ áp dụng trên học phí sau học bổng; phiếu đã in giữ nguyên snapshot cũ."
      icon={<AppIcon icon={UserRoundCog} size="md" />}
      tag={<StatusTag status="purple" label="Academy" />}
      headerActions={
        <Space>
          <IconButton
            label="Làm mới cấu hình giảng viên"
            icon={RefreshCw}
            loading={loading}
            onClick={() => void load()}
          />
          <PagePrimaryIconAction title="Thêm giảng viên" icon={<AppIcon icon={Plus} />} onClick={() => openEditor()} />
        </Space>
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm giảng viên, mã hoặc nhân sự không dấu…"
            allowClear
          />
        ),
      }}
    >
      <DataSection
        title="Phụ phí giảng viên"
        extra={
          <span className="tabular-nums opacity-70">{filteredInstructors.length.toLocaleString('vi-VN')} hồ sơ</span>
        }
        state={loading ? 'loading' : error ? 'error' : filteredInstructors.length === 0 ? 'empty' : undefined}
        stateTitle={error || (search ? 'Không tìm thấy giảng viên phù hợp' : 'Chưa có giảng viên')}
        stateDescription={error ? 'Hãy thử làm mới dữ liệu.' : 'Thêm giảng viên để dùng khi chốt học phí Tố Chất.'}
        stateExtra={error ? <Button onClick={() => void load()}>Thử lại</Button> : undefined}
      >
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={pagedInstructors}
          loading={loading}
          scroll={{ x: 1080 }}
          stickyPrimaryColumn
          columnPriority={{
            stt: 'secondary',
            instructor: 'primary',
            staff: 'secondary',
            surcharge: 'primary',
            status: 'primary',
            sortOrder: 'tertiary',
            action: 'primary',
          }}
          mobileRenderer={(instructor) => (
            <button
              type="button"
              className="grid w-full min-w-0 gap-2 border-0 bg-transparent p-0 text-left"
              onClick={() => openEditor(instructor)}
            >
              <div className="flex items-start justify-between gap-2">
                <strong>{instructor.displayName}</strong>
                <StatusTag
                  status={instructor.surchargePercent > 0 ? 'warning' : 'success'}
                  label={rateLabel(instructor.surchargePercent)}
                />
              </div>
              <div className="text-xs opacity-70">
                {instructor.description || 'Chưa có mô tả'} · {instructor.isActive ? 'Đang dùng' : 'Đã ẩn'}
              </div>
            </button>
          )}
          pagination={{
            current: page,
            pageSize,
            total: filteredInstructors.length,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              if (nextPageSize !== pageSize) setPageSize(nextPageSize);
            },
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total.toLocaleString('vi-VN')}`,
          }}
        />
      </DataSection>

      <EntityFormDrawer
        open={editingInstructor !== undefined}
        onClose={closeEditor}
        title={`${editingInstructor ? 'Sửa' : 'Thêm'} giảng viên Academy`}
        width={640}
        footer={
          <Space>
            <Button onClick={closeEditor}>Hủy</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              Lưu cấu hình
            </Button>
          </Space>
        }
      >
        <EntityForm form={form} onFinish={save} columns={2}>
          <EntityFormField
            label="Tên hiển thị"
            name="displayName"
            rules={[{ required: true, message: 'Nhập tên giảng viên' }]}
          >
            <Input
              placeholder="Giảng viên Giang Trần"
              onBlur={(event) => {
                if (!form.getFieldValue('code')) form.setFieldValue('code', defaultCode(event.target.value));
              }}
            />
          </EntityFormField>
          <EntityFormField
            label="Mã cấu hình"
            name="code"
            rules={[{ required: true, message: 'Nhập mã cấu hình' }]}
            extra="Dùng chữ, số và dấu gạch dưới."
          >
            <Input disabled={editingInstructor?.code === 'auto'} placeholder="giang_tran" />
          </EntityFormField>
          <EntityFormField
            label="Phụ phí trên học phí sau học bổng"
            name="surchargePercent"
            rules={[{ required: true, message: 'Nhập phụ phí' }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              max={100}
              precision={0}
              addonAfter="%"
              disabled={editingInstructor?.code === 'auto'}
            />
          </EntityFormField>
          <EntityFormField label="Thứ tự hiển thị" name="sortOrder" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} precision={0} />
          </EntityFormField>
          <EntityFormField
            fullWidth
            label="Liên kết hồ sơ nhân sự"
            name="staffId"
            extra="Tùy chọn. Một nhân sự chỉ có một hồ sơ giảng viên Academy."
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
              }
              options={staff.map((option) => ({ value: option.id, label: option.displayName }))}
              placeholder="Chọn nhân sự nếu đã có hồ sơ trong mOS"
            />
          </EntityFormField>
          <EntityFormField fullWidth label="Mô tả" name="description">
            <Input.TextArea rows={2} placeholder="Ví dụ: Chỉ định giảng viên chính" />
          </EntityFormField>
          <EntityFormField
            fullWidth
            label="Link ảnh đại diện"
            name="avatarUrl"
            rules={[{ type: 'url', message: 'Link ảnh chưa hợp lệ' }]}
          >
            <Input placeholder="https://…" />
          </EntityFormField>
          <EntityFormField label="Trạng thái" name="isActive" rules={[{ required: true }]}>
            <Select
              disabled={editingInstructor?.code === 'auto'}
              options={[
                { value: true, label: 'Đang dùng' },
                { value: false, label: 'Đã ẩn' },
              ]}
            />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </FeaturePage>
  );
}
