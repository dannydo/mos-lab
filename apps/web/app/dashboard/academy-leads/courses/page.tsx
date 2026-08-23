'use client';

import React from 'react';
import { Button, Form, Input, InputNumber, Select, Space, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BookOpen, Pencil, Plus, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import { isAdminOrSuperAdminRole, removeVietnameseTones } from '@mos-lab/shared';
import type { AcademyCourse, SafeAny, UpsertAcademyCourseRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useAcademyAccess } from '../components/AcademyAccessGate';
import { formatVND } from '../../../../lib/format-utils';
import {
  AppIcon,
  DataSection,
  DataTable,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  FeaturePage,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
} from '../../../../components/ui';
import CourseRichTextEditor from './components/CourseRichTextEditor';

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
const PAGE_STORAGE_KEY = 'academy-course-manager:page';
const PAGE_SIZE_STORAGE_KEY = 'academy-course-manager:page-size';

type CourseFormValues = Omit<UpsertAcademyCourseRequest, 'syllabus'>;

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

function courseUpdatedLabel(updatedAt: string) {
  return dayjs(updatedAt).format('DD/MM/YYYY HH:mm');
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!
  );
}

function legacySyllabusToHtml(course: AcademyCourse) {
  return course.syllabus
    .map((lesson, index) => {
      const number = Number(lesson.num) || index + 1;
      const title = escapeHtml(lesson.title || `Buổi ${number}`);
      const description = lesson.description ? `<p>${escapeHtml(lesson.description)}</p>` : '';
      return `<h3>Buổi ${number}: ${title}</h3>${description}`;
    })
    .join('');
}

function courseMobileCard(course: AcademyCourse, onOpen: (course: AcademyCourse) => void) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-inherit p-3 text-left"
      onClick={() => onOpen(course)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <strong>{course.name}</strong>
          <div className="mt-1 text-xs opacity-70">{course.nameEn || course.code}</div>
        </div>
        <StatusTag status={course.isActive ? 'success' : 'default'} label={course.isActive ? 'Đang dùng' : 'Đã ẩn'} />
      </div>
      <div className="mt-2 text-xs opacity-70">
        {course.lessonCount} buổi · {course.lashModelCount} mẫu nối mi · Ưu đãi: {formatVND(course.promoPriceVnd)}
      </div>
    </button>
  );
}

export default function AcademyCoursesPage() {
  const { canAccess: academyAllowed } = useAcademyAccess();
  const [role, setRole] = React.useState('');
  const [courses, setCourses] = React.useState<AcademyCourse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(() => persistedNumber(PAGE_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = React.useState(() => persistedNumber(PAGE_SIZE_STORAGE_KEY, 20, [10, 20, 50, 100]));
  const [editingCourse, setEditingCourse] = React.useState<AcademyCourse | null | undefined>(undefined);
  const [saving, setSaving] = React.useState(false);
  const [form] = Form.useForm<CourseFormValues>();

  React.useEffect(() => setRole(currentRole()), []);

  const canManageCourses = isAdminOrSuperAdminRole(role) || role === 'manager';

  const loadCourses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses(await apiClient.academySales.listCourses());
    } catch (nextError: any) {
      setError(nextError?.response?.data?.message || 'Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (academyAllowed) void loadCourses();
  }, [academyAllowed, loadCourses]);

  React.useEffect(() => {
    window.localStorage.setItem(PAGE_STORAGE_KEY, String(page));
  }, [page]);
  React.useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);

  const filteredCourses = React.useMemo(() => {
    const query = removeVietnameseTones(search);
    return courses
      .filter((course) => {
        if (!query) return true;
        return removeVietnameseTones(
          `${course.code} ${course.name} ${course.nameEn || ''} ${course.tag || ''} ${course.description || ''} ${course.kitName || ''}`
        ).includes(query);
      })
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'vi'));
  }, [courses, search]);

  React.useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [filteredCourses.length, page, pageSize]);

  const pagedCourses = React.useMemo(
    () => filteredCourses.slice((page - 1) * pageSize, page * pageSize),
    [filteredCourses, page, pageSize]
  );

  const openEditor = React.useCallback(
    (course?: AcademyCourse) => {
      if (!canManageCourses) return;
      setEditingCourse(course || null);
      form.resetFields();
      form.setFieldsValue(
        course
          ? { ...course, syllabusHtml: course.syllabusHtml || legacySyllabusToHtml(course) }
          : {
              code: '',
              name: '',
              nameEn: '',
              market: 'DOMESTIC',
              listPriceVnd: 0,
              promoPriceVnd: 0,
              kitPriceVnd: 0,
              samplePriceVnd: 0,
              lessonCount: 1,
              lashModelCount: 0,
              sortOrder: courses.length,
              isActive: true,
              syllabusHtml: '',
            }
      );
    },
    [canManageCourses, courses.length, form]
  );

  const closeEditor = React.useCallback(() => {
    setEditingCourse(undefined);
    form.resetFields();
  }, [form]);

  const saveCourse = React.useCallback(
    async (values: CourseFormValues) => {
      if (!canManageCourses) return;

      const payload: UpsertAcademyCourseRequest = {
        code: values.code.trim(),
        name: values.name.trim(),
        nameEn: values.nameEn?.trim() || null,
        tag: values.tag?.trim() || null,
        description: values.description?.trim() || null,
        market: values.market || 'DOMESTIC',
        coverImageUrl: values.coverImageUrl?.trim() || null,
        listPriceVnd: Math.round(Number(values.listPriceVnd) || 0),
        promoPriceVnd: Math.round(Number(values.promoPriceVnd) || 0),
        kitName: values.kitName?.trim() || null,
        kitUrl: values.kitUrl?.trim() || null,
        kitPriceVnd: Math.round(Number(values.kitPriceVnd) || 0),
        samplePriceVnd: Math.round(Number(values.samplePriceVnd) || 0),
        lessonCount: Math.round(Number(values.lessonCount) || 0),
        lashModelCount: Math.round(Number(values.lashModelCount) || 0),
        syllabusHtml: values.syllabusHtml?.trim() || null,
        sortOrder: Math.max(0, Math.round(Number(values.sortOrder) || 0)),
        isActive: Boolean(values.isActive),
      };

      setSaving(true);
      try {
        if (editingCourse) await apiClient.academySales.updateCourse(editingCourse.id, payload);
        else await apiClient.academySales.createCourse(payload);
        message.success(editingCourse ? 'Đã cập nhật khóa học.' : 'Đã tạo khóa học.');
        closeEditor();
        await loadCourses();
      } catch (nextError: any) {
        message.error(nextError?.response?.data?.message || 'Không thể lưu khóa học.');
      } finally {
        setSaving(false);
      }
    },
    [canManageCourses, closeEditor, editingCourse, loadCourses]
  );

  const columns = React.useMemo<ColumnsType<AcademyCourse>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 52,
        align: 'center',
        render: (_value, _course, index) => (
          <span className="tabular-nums font-medium">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      {
        key: 'course',
        title: 'Khóa học',
        width: 290,
        render: (_value, course) => (
          <div>
            <Space size={6} wrap>
              <strong>{course.name}</strong>
              {course.tag && <StatusTag status="purple" label={course.tag} />}
            </Space>
            {course.nameEn && <div className="mt-1 text-xs opacity-70">{course.nameEn}</div>}
            <div className="text-xs opacity-60">
              {course.code}
              {course.description ? ` · ${course.description}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'market',
        title: 'Nhóm học viên',
        width: 145,
        render: (_value, course) => (
          <StatusTag
            status={course.market === 'OVERSEAS' ? 'purple' : 'processing'}
            label={course.market === 'OVERSEAS' ? 'Việt kiều & định cư' : 'Trong nước'}
          />
        ),
      },
      {
        key: 'tuition',
        title: 'Học phí',
        width: 180,
        render: (_value, course) => (
          <div className="tabular-nums">
            <div>{formatVND(course.promoPriceVnd)}</div>
            {course.listPriceVnd !== course.promoPriceVnd && (
              <div className="text-xs opacity-60 line-through">{formatVND(course.listPriceVnd)}</div>
            )}
          </div>
        ),
      },
      {
        key: 'kit',
        title: 'Kit',
        width: 180,
        render: (_value, course) => course.kitName || '—',
      },
      {
        key: 'delivery',
        title: 'Buổi / mẫu',
        width: 140,
        align: 'center',
        render: (_value, course) => (
          <div className="tabular-nums">
            <div>{course.lessonCount} buổi</div>
            <div className="text-xs opacity-60">{course.lashModelCount} mẫu nối mi</div>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng thái',
        width: 130,
        render: (_value, course) => (
          <StatusTag status={course.isActive ? 'success' : 'default'} label={course.isActive ? 'Đang dùng' : 'Đã ẩn'} />
        ),
      },
      {
        key: 'updatedAt',
        title: 'Cập nhật',
        width: 155,
        render: (_value, course) => <span className="tabular-nums">{courseUpdatedLabel(course.updatedAt)}</span>,
      },
      ...(canManageCourses
        ? [
            {
              key: 'action',
              title: 'Thao tác',
              width: 100,
              render: (_value: unknown, course: AcademyCourse) => (
                <Button type="link" size="small" icon={<AppIcon icon={Pencil} />} onClick={() => openEditor(course)}>
                  Sửa
                </Button>
              ),
            },
          ]
        : []),
    ],
    [canManageCourses, openEditor, page, pageSize]
  );

  if (!role) return <StatePanel kind="loading" title="Đang xác thực quyền Khóa học…" />;
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập Khóa học"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của đội Academy."
      />
    );
  }

  return (
    <FeaturePage
      title="Khóa học"
      subtitle="Danh mục khóa học Academy dùng thống nhất khi tư vấn và quản lý lead."
      icon={<AppIcon icon={BookOpen} />}
      tag={<StatusTag status="purple" label="Academy" />}
      headerActions={
        <Space>
          <Tooltip title="Làm mới danh mục">
            <Button
              aria-label="Làm mới danh mục khóa học"
              icon={<AppIcon icon={RefreshCw} />}
              loading={loading}
              onClick={() => void loadCourses()}
            />
          </Tooltip>
          {canManageCourses && (
            <PagePrimaryIconAction title="Thêm khóa học" icon={<AppIcon icon={Plus} />} onClick={() => openEditor()} />
          )}
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
            placeholder="Tìm khóa học, mã, kit không dấu…"
            allowClear
          />
        ),
      }}
    >
      <DataSection
        title="Danh mục khóa học"
        extra={
          <span className="tabular-nums opacity-70">{filteredCourses.length.toLocaleString('vi-VN')} khóa học</span>
        }
        state={loading ? 'loading' : error ? 'error' : filteredCourses.length === 0 ? 'empty' : undefined}
        stateTitle={error || (search ? 'Không tìm thấy khóa học phù hợp' : 'Chưa có khóa học')}
        stateDescription={error ? 'Hãy thử làm mới dữ liệu.' : undefined}
        stateExtra={error ? <Button onClick={() => void loadCourses()}>Thử lại</Button> : undefined}
      >
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={pagedCourses}
          loading={loading}
          scroll={{ x: 1180 }}
          stickyPrimaryColumn
          columnPriority={{
            stt: 'secondary',
            course: 'primary',
            tuition: 'primary',
            kit: 'secondary',
            market: 'secondary',
            delivery: 'secondary',
            status: 'primary',
            updatedAt: 'tertiary',
            action: 'primary',
          }}
          mobileRenderer={(course) => courseMobileCard(course, openEditor)}
          pagination={{
            current: page,
            pageSize,
            total: filteredCourses.length,
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
        open={editingCourse !== undefined}
        onClose={closeEditor}
        title={`${editingCourse ? 'Sửa' : 'Thêm'} khóa học Academy`}
        width={720}
        footer={
          <Space>
            <Button onClick={closeEditor}>Hủy</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              Lưu khóa học
            </Button>
          </Space>
        }
      >
        <EntityForm form={form} onFinish={saveCourse} columns={2}>
          <EntityFormField label="Mã khóa học" name="code" rules={[{ required: true, message: 'Nhập mã khóa học' }]}>
            <Input placeholder="WA-CO-BAN" />
          </EntityFormField>
          <EntityFormField label="Tên khóa học" name="name" rules={[{ required: true, message: 'Nhập tên khóa học' }]}>
            <Input placeholder="Khóa cơ bản" />
          </EntityFormField>
          <EntityFormField label="Tên tiếng Anh" name="nameEn">
            <Input placeholder="Foundation Lash Course" />
          </EntityFormField>
          <EntityFormField label="Nhãn" name="tag">
            <Input placeholder="Starter, Pro…" />
          </EntityFormField>
          <EntityFormField label="Nhóm học viên" name="market" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'DOMESTIC', label: 'Học viên trong nước' },
                { value: 'OVERSEAS', label: 'Việt kiều & định cư' },
              ]}
            />
          </EntityFormField>
          <EntityFormField label="Thứ tự hiển thị" name="sortOrder">
            <InputNumber min={0} className="w-full" />
          </EntityFormField>
          <EntityFormField
            label="Số buổi học"
            name="lessonCount"
            rules={[
              { required: true, message: 'Nhập số buổi học' },
              { type: 'number', min: 1, message: 'Tối thiểu 1 buổi' },
            ]}
          >
            <InputNumber min={1} step={1} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField
            label="Số mẫu nối mi cần"
            name="lashModelCount"
            extra="Dùng 0 nếu khóa không cần mẫu nối mi."
            rules={[
              { required: true, message: 'Nhập số mẫu nối mi' },
              { type: 'number', min: 0, message: 'Từ 0 trở lên' },
            ]}
          >
            <InputNumber min={0} step={1} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField label="Học phí niêm yết (VNĐ)" name="listPriceVnd" rules={[{ required: true }]}>
            <InputNumber
              min={0}
              step={100000}
              className="w-full"
              formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
            />
          </EntityFormField>
          <EntityFormField label="Học phí ưu đãi (VNĐ)" name="promoPriceVnd" rules={[{ required: true }]}>
            <InputNumber
              min={0}
              step={100000}
              className="w-full"
              formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
            />
          </EntityFormField>
          <EntityFormField label="Kit học viên" name="kitName">
            <Input placeholder="Bộ kit đi kèm" />
          </EntityFormField>
          <EntityFormField
            label="Giá đồ nghề (VNĐ)"
            name="kitPriceVnd"
            extra="Tùy chọn trong Tố Chất; máy chủ áp dụng ưu đãi khi được chọn."
          >
            <InputNumber
              min={0}
              step={100000}
              className="w-full"
              formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
            />
          </EntityFormField>
          <EntityFormField label="Link kit" name="kitUrl" rules={[{ type: 'url', message: 'Link kit chưa hợp lệ' }]}>
            <Input placeholder="https://…" />
          </EntityFormField>
          <EntityFormField
            label="Giá gói mẫu (VNĐ)"
            name="samplePriceVnd"
            extra="Tùy chọn trong Tố Chất; số mẫu thực tế lấy từ 'Số mẫu nối mi cần'."
          >
            <InputNumber
              min={0}
              step={50000}
              className="w-full"
              formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
            />
          </EntityFormField>
          <EntityFormField
            fullWidth
            label="Ảnh bìa khóa học"
            name="coverImageUrl"
            rules={[{ type: 'url', message: 'Link ảnh chưa hợp lệ' }]}
            extra="Để trống để dùng ảnh minh họa native của Academy."
          >
            <Input placeholder="https://…" />
          </EntityFormField>
          <EntityFormField fullWidth label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mục tiêu, đối tượng học viên…" />
          </EntityFormField>
          <EntityFormField fullWidth label="Giáo trình chi tiết" name="syllabusHtml">
            <CourseRichTextEditor />
          </EntityFormField>
          <EntityFormField label="Trạng thái" name="isActive" rules={[{ required: true }]}>
            <Select
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
