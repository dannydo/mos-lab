'use client';

import React from 'react';
import {
  Alert,
  Badge,
  Button,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Steps,
  Switch,
  Typography,
  message,
} from 'antd';
import { Bell, CalendarDays, Pencil, Plus, Trash2, UserRoundPlus, UsersRound } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  type AcademyCampaign,
  type AcademyCampaignAudienceFilter,
  type AcademyCampaignStatus,
  type AcademyCourse,
  type AcademyStaffOption,
  type CreateAcademyCampaignRequest,
  type CreateAcademyCampaignTouchpointRequest,
  type UpdateAcademyCampaignRequest,
  vietnameseSearchFilter,
} from '@mos-lab/shared';
import { TouchpointIconPicker } from '../../../../../components/campaign/TouchpointIconPicker';
import {
  AppIcon,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  ResponsiveFormGrid,
  StatusTag,
} from '../../../../../components/ui';
import AcademyCampaignLeadPicker from './AcademyCampaignLeadPicker';
import {
  ACADEMY_CAMPAIGN_STATUS_OPTIONS,
  DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS,
  formatCampaignDateRange,
} from './academy-campaign-utils';

type CampaignTouchpointFormValue = {
  key?: string;
  label?: string;
  icon?: string | null;
  daysMin?: number;
  daysMax?: number | null;
  color?: string | null;
};

type CampaignAudienceFormValue = {
  statuses?: string[];
  ownerStaffIds?: number[];
  courses?: string[];
  sources?: string[];
  isHot?: boolean | 'ALL';
};

type CampaignFormValues = {
  name: string;
  slug?: string;
  description?: string;
  dateRange?: [Dayjs | undefined, Dayjs | undefined];
  status: AcademyCampaignStatus;
  showInSidebar?: boolean;
  assignedStaffIds?: number[];
  audience?: CampaignAudienceFormValue;
  audienceSummary?: string;
  touchpoints: CampaignTouchpointFormValue[];
};

export type AcademyCampaignFormPayload = CreateAcademyCampaignRequest | UpdateAcademyCampaignRequest;

export interface AcademyCampaignFormDrawerProps {
  open: boolean;
  campaign?: AcademyCampaign | null;
  staff: AcademyStaffOption[];
  courses: AcademyCourse[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: AcademyCampaignFormPayload) => void | Promise<void>;
}

function toTouchpointValues(campaign?: AcademyCampaign | null): CampaignTouchpointFormValue[] {
  const items = campaign?.touchpoints?.length ? campaign.touchpoints : DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS;
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon || 'Smile',
    daysMin: item.daysMin,
    daysMax: item.daysMax,
    color: item.color || null,
  }));
}

function toAudienceFormValue(audience?: AcademyCampaignAudienceFilter | null): CampaignAudienceFormValue {
  return {
    statuses: audience?.statuses || [],
    ownerStaffIds: audience?.ownerStaffIds || [],
    courses: audience?.courses || [],
    sources: audience?.sources || [],
    isHot: audience?.isHot === undefined ? 'ALL' : audience.isHot,
  };
}

function toAudienceFilter(value?: CampaignAudienceFormValue): AcademyCampaignAudienceFilter | null {
  const statuses = (value?.statuses || []).filter(Boolean) as AcademyCampaignAudienceFilter['statuses'];
  const ownerStaffIds = (value?.ownerStaffIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const courses = (value?.courses || []).map((item) => item.trim()).filter(Boolean);
  const sources = (value?.sources || []).map((item) => item.trim()).filter(Boolean);
  const isHot = typeof value?.isHot === 'boolean' ? value.isHot : undefined;
  const next: AcademyCampaignAudienceFilter = {
    ...(statuses?.length ? { statuses } : {}),
    ...(ownerStaffIds.length ? { ownerStaffIds } : {}),
    ...(courses.length ? { courses } : {}),
    ...(sources.length ? { sources } : {}),
    ...(isHot !== undefined ? { isHot } : {}),
  };
  return Object.keys(next).length ? next : null;
}

function toTouchpointPayload(values: CampaignTouchpointFormValue[]): CreateAcademyCampaignTouchpointRequest[] {
  return values.map((item, index) => ({
    key: String(item.key || item.label || `touchpoint-${index + 1}`).trim(),
    label: String(item.label || '').trim(),
    icon: item.icon || null,
    daysMin: Math.max(0, Math.round(Number(item.daysMin) || 0)),
    daysMax: item.daysMax === null || item.daysMax === undefined ? null : Math.max(0, Math.round(Number(item.daysMax))),
    color: String(item.color || '').trim() || null,
    sortOrder: index + 1,
  }));
}

const CAMPAIGN_FORM_STEPS = [
  { title: 'Tổng quan', icon: <AppIcon icon={Pencil} />, description: 'Mục tiêu và đội thực thi' },
  { title: 'Tệp lead', icon: <AppIcon icon={UsersRound} />, description: 'Chốt snapshot khách hàng' },
  { title: 'Nhịp chạm', icon: <AppIcon icon={Bell} />, description: 'Thiết kế lịch chăm sóc' },
];

function touchpointDayLabel(index: number, item?: CampaignTouchpointFormValue) {
  const daysMin = Number(item?.daysMin);
  return Number.isFinite(daysMin) ? `D${daysMin}` : `#${index + 1}`;
}

/**
 * Campaign configuration is intentionally Academy-native.  It retains the
 * Wings Lashes team/cadence workflow while sending only CRM Academy DTOs.
 */
export function AcademyCampaignFormDrawer({
  open,
  campaign,
  staff,
  courses,
  submitting = false,
  onClose,
  onSubmit,
}: AcademyCampaignFormDrawerProps) {
  const [form] = Form.useForm<CampaignFormValues>();
  const [activeStep, setActiveStep] = React.useState(0);
  const watchedTouchpoints = Form.useWatch('touchpoints', form);
  const [leadPickerOpen, setLeadPickerOpen] = React.useState(false);
  const [snapshotLeadIds, setSnapshotLeadIds] = React.useState<number[]>([]);
  const isEditing = Boolean(campaign);

  React.useEffect(() => {
    if (!open) return;
    form.resetFields();
    const startDate = campaign?.startDate ? dayjs(campaign.startDate) : null;
    const endDate = campaign?.endDate ? dayjs(campaign.endDate) : null;
    form.setFieldsValue({
      name: campaign?.name || '',
      slug: campaign?.slug || '',
      description: campaign?.description || '',
      dateRange: startDate || endDate ? [startDate || undefined, endDate || undefined] : undefined,
      status: campaign?.status || 'DRAFT',
      showInSidebar: campaign?.showInSidebar || false,
      assignedStaffIds: campaign?.assignedStaffIds || [],
      audience: toAudienceFormValue(campaign?.audienceFilter),
      audienceSummary: campaign?.audienceSummary || '',
      touchpoints: toTouchpointValues(campaign),
    });
    setSnapshotLeadIds([]);
    setActiveStep(0);
  }, [campaign, form, open]);

  const submit = React.useCallback(
    async (values: CampaignFormValues) => {
      if (!String(values.name || '').trim()) {
        setActiveStep(0);
        form.setFields([{ name: 'name', errors: ['Nhập tên chiến dịch trước khi tạo.'] }]);
        message.error('Nhập tên chiến dịch trước khi tạo.');
        return;
      }
      if (!values.status) {
        setActiveStep(0);
        form.setFields([{ name: 'status', errors: ['Chọn trạng thái chiến dịch.'] }]);
        message.error('Chọn trạng thái chiến dịch.');
        return;
      }
      if (values.status === 'ACTIVE' && !values.assignedStaffIds?.length) {
        form.setFields([
          {
            name: 'assignedStaffIds',
            errors: ['Chọn đội phụ trách trước khi kích hoạt chiến dịch.'],
          },
        ]);
        return;
      }
      const invalidTouchpoint = (values.touchpoints || []).find(
        (item) =>
          !String(item.label || '').trim() ||
          !String(item.key || '').trim() ||
          !Number.isInteger(Number(item.daysMin)) ||
          Number(item.daysMin) < 0 ||
          (item.daysMax !== null && item.daysMax !== undefined && Number(item.daysMax) < Number(item.daysMin))
      );
      if (invalidTouchpoint) {
        setActiveStep(2);
        message.error('Kiểm tra lại tên, mốc ngày và mã của từng điểm chạm.');
        return;
      }
      const payload: CreateAcademyCampaignRequest = {
        name: String(values.name).trim(),
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || null,
        startDate: values.dateRange?.[0]?.format('YYYY-MM-DD') || null,
        endDate: values.dateRange?.[1]?.format('YYYY-MM-DD') || null,
        status: values.status,
        showInSidebar: Boolean(values.showInSidebar),
        assignedStaffIds: values.assignedStaffIds || [],
        audienceFilter: toAudienceFilter(values.audience),
        audienceSummary: values.audienceSummary?.trim() || null,
        touchpoints: toTouchpointPayload(values.touchpoints || []),
        ...(isEditing ? {} : { leadIds: snapshotLeadIds }),
      };
      await onSubmit(payload);
    },
    [form, isEditing, onSubmit, snapshotLeadIds]
  );

  // The action footer is intentionally rendered outside the Form by the shared
  // drawer primitive. Read the complete preserved form store rather than
  // relying on a native submit event, which only sees fields mounted in the
  // current wizard step.
  const submitFromDrawer = React.useCallback(async () => {
    const values = form.getFieldsValue(true) as CampaignFormValues;
    await submit(values);
  }, [form, submit]);

  const moveToStep = React.useCallback(
    async (nextStep: number) => {
      if (nextStep <= activeStep) {
        setActiveStep(nextStep);
        return;
      }
      try {
        if (activeStep === 0) {
          const values = await form.validateFields(['name', 'status', 'assignedStaffIds']);
          if (values.status === 'ACTIVE' && !values.assignedStaffIds?.length) {
            form.setFields([
              { name: 'assignedStaffIds', errors: ['Chọn đội phụ trách trước khi kích hoạt chiến dịch.'] },
            ]);
            return;
          }
        }
        setActiveStep(nextStep);
      } catch {
        // Ant Form focuses invalid required fields for the operator.
      }
    },
    [activeStep, form]
  );

  const courseOptions = React.useMemo(
    () =>
      courses.map((course) => ({
        value: course.name,
        label: [course.name, course.nameEn, course.code].filter(Boolean).join(' · '),
      })),
    [courses]
  );
  const staffOptions = React.useMemo(
    () =>
      staff.map((member) => ({
        value: member.id,
        label: `${member.displayName}${member.role ? ` · ${member.role}` : ''}`,
      })),
    [staff]
  );
  const campaignMemberCount = campaign?._count?.leads || 0;

  return (
    <>
      <EntityFormDrawer
        open={open}
        onClose={onClose}
        width="min(94vw, 860px)"
        className="academy-campaign-form-drawer"
        title={isEditing ? `Cấu hình ${campaign?.name}` : 'Tạo chiến dịch Academy'}
        footer={
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            {activeStep > 0 && <Button onClick={() => void moveToStep(activeStep - 1)}>Quay lại</Button>}
            {activeStep < CAMPAIGN_FORM_STEPS.length - 1 ? (
              <Button type="primary" onClick={() => void moveToStep(activeStep + 1)}>
                Tiếp tục
              </Button>
            ) : (
              <Button type="primary" loading={submitting} onClick={() => void submitFromDrawer()}>
                {isEditing ? 'Lưu cấu hình' : 'Tạo chiến dịch'}
              </Button>
            )}
          </Space>
        }
      >
        <EntityForm<CampaignFormValues>
          id="academy-campaign-form"
          form={form}
          columns={2}
          initialValues={{ status: 'DRAFT', touchpoints: DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS }}
          onFinish={() => void submitFromDrawer()}
        >
          <EntityFormField fullWidth noStyle>
            <Steps
              className="academy-campaign-form-steps"
              current={activeStep}
              size="small"
              responsive
              onChange={(step) => void moveToStep(step)}
              items={CAMPAIGN_FORM_STEPS}
            />
          </EntityFormField>

          {activeStep === 0 && (
            <>
              <EntityFormField fullWidth noStyle>
                <Alert
                  showIcon
                  type="info"
                  message="Thiết lập khung vận hành"
                  description="Xác định mục tiêu, thời gian và đội phụ trách trước khi chốt tệp lead."
                />
              </EntityFormField>
              <EntityFormField
                name="name"
                label="Tên chiến dịch"
                rules={[{ required: true, message: 'Nhập tên chiến dịch.' }]}
              >
                <Input maxLength={150} placeholder="Ví dụ: Khai giảng tháng 9" />
              </EntityFormField>
              <EntityFormField name="slug" label="Mã URL">
                <Input maxLength={150} placeholder="Tự tạo từ tên nếu để trống" />
              </EntityFormField>
              <EntityFormField name="dateRange" label="Thời gian chạy">
                <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
              </EntityFormField>
              <EntityFormField name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select options={ACADEMY_CAMPAIGN_STATUS_OPTIONS} />
              </EntityFormField>
              <EntityFormField name="assignedStaffIds" label="Đội phụ trách" fullWidth>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  filterOption={vietnameseSearchFilter}
                  options={staffOptions}
                  placeholder="Nháp có thể để trống; cần chọn đội trước khi kích hoạt"
                />
              </EntityFormField>
              <EntityFormField
                name="showInSidebar"
                label="Hiển thị ở sidebar"
                valuePropName="checked"
                fullWidth
                extra="Hiện dưới Academy. Admin luôn thấy; các vai trò khác chỉ thấy khi thuộc Đội phụ trách của chiến dịch này."
              >
                <Switch checkedChildren="Đang hiện" unCheckedChildren="Đang ẩn" />
              </EntityFormField>
              <EntityFormField name="description" label="Mô tả vận hành" fullWidth>
                <Input.TextArea
                  rows={4}
                  maxLength={5000}
                  placeholder="Mục tiêu, thông điệp và hướng dẫn ngắn cho đội thực thi…"
                />
              </EntityFormField>
              {campaign && (
                <EntityFormField fullWidth noStyle>
                  <div className="academy-campaign-edit-summary">
                    <AppIcon icon={CalendarDays} />
                    <Typography.Text>{formatCampaignDateRange(campaign.startDate, campaign.endDate)}</Typography.Text>
                    <span aria-hidden>·</span>
                    <Typography.Text className="tabular-nums">
                      {campaignMemberCount.toLocaleString('vi-VN')} lead snapshot
                    </Typography.Text>
                  </div>
                </EntityFormField>
              )}
            </>
          )}

          {activeStep === 1 && (
            <>
              <EntityFormField fullWidth noStyle>
                <Alert
                  showIcon
                  type="warning"
                  message="Tệp lead là snapshot cố định"
                  description="Chọn đúng khách hàng trước khi tạo. Lead mới thỏa điều kiện sau đó sẽ không tự động đi vào chiến dịch."
                />
              </EntityFormField>
              <EntityFormField label="Tệp lead Academy" fullWidth>
                {isEditing ? (
                  <div className="academy-campaign-snapshot-summary">
                    <Badge count={campaignMemberCount} showZero overflowCount={9999}>
                      <span className="academy-campaign-snapshot-status">
                        <AppIcon icon={UsersRound} />
                        Tệp hiện tại đã được chốt
                      </span>
                    </Badge>
                    <Typography.Text type="secondary">
                      Dùng nút “Thêm lead” tại trang vận hành để thay đổi membership có audit.
                    </Typography.Text>
                  </div>
                ) : (
                  <div className="academy-campaign-snapshot-summary">
                    <Badge count={snapshotLeadIds.length} showZero overflowCount={9999}>
                      <Button
                        type="dashed"
                        size="large"
                        icon={<AppIcon icon={UserRoundPlus} />}
                        onClick={() => setLeadPickerOpen(true)}
                      >
                        Chọn lead Academy
                      </Button>
                    </Badge>
                    <Typography.Text type="secondary">
                      {snapshotLeadIds.length
                        ? 'Tệp sẵn sàng để kiểm tra ở bước cuối.'
                        : 'Bạn có thể tạo nháp trước và bổ sung lead sau.'}
                    </Typography.Text>
                  </div>
                )}
              </EntityFormField>
              <EntityFormField name="audienceSummary" label="Ghi chú tệp snapshot" fullWidth>
                <Input.TextArea
                  rows={3}
                  maxLength={2000}
                  placeholder="Ví dụ: Lead từng quan tâm khóa Classic, đang ở pipeline Mới/Đang tư vấn ngày 19/08/2026."
                />
              </EntityFormField>
              <EntityFormField fullWidth noStyle>
                <Collapse
                  className="academy-campaign-audience-collapse"
                  items={[
                    {
                      key: 'audience-trace',
                      label: 'Lưu dấu vết tiêu chí đã dùng (tuỳ chọn)',
                      children: (
                        <ResponsiveFormGrid columns={2}>
                          <Form.Item name={['audience', 'statuses']} label="Pipeline tại thời điểm chốt tệp">
                            <Select
                              mode="multiple"
                              allowClear
                              options={[
                                { value: 'NEW', label: 'Mới' },
                                { value: 'WARM', label: 'Đang tư vấn' },
                                { value: 'SCHEDULED', label: 'Đã hẹn test' },
                                { value: 'TESTED', label: 'Đã test' },
                                { value: 'WON', label: 'Đã chốt' },
                                { value: 'LOST', label: 'Không phù hợp' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name={['audience', 'ownerStaffIds']} label="Phụ trách tại thời điểm chốt tệp">
                            <Select
                              mode="multiple"
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              filterOption={vietnameseSearchFilter}
                              options={staffOptions}
                            />
                          </Form.Item>
                          <Form.Item name={['audience', 'courses']} label="Khóa học tại thời điểm chốt tệp">
                            <Select
                              mode="tags"
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              filterOption={vietnameseSearchFilter}
                              options={courseOptions}
                            />
                          </Form.Item>
                          <Form.Item name={['audience', 'sources']} label="Nguồn lead tại thời điểm chốt tệp">
                            <Select mode="tags" allowClear placeholder="Facebook, TikTok, Pancake…" />
                          </Form.Item>
                          <Form.Item name={['audience', 'isHot']} label="Ưu tiên Hot tại thời điểm chốt tệp">
                            <Select
                              options={[
                                { value: 'ALL', label: 'Không lọc' },
                                { value: true, label: 'Chỉ lead Hot' },
                                { value: false, label: 'Không Hot' },
                              ]}
                            />
                          </Form.Item>
                        </ResponsiveFormGrid>
                      ),
                    },
                  ]}
                />
              </EntityFormField>
            </>
          )}

          {activeStep === 2 && (
            <>
              <EntityFormField fullWidth noStyle>
                <Alert
                  showIcon
                  type="success"
                  message="Nhịp chăm sóc có thể chỉnh riêng cho chiến dịch này"
                  description="D1/D3/D7/D14/D21 là cadence khởi đầu từ Wings Lashes; thay đổi ở đây không ảnh hưởng chiến dịch khác."
                />
              </EntityFormField>
              <EntityFormField fullWidth noStyle>
                <Form.List name="touchpoints">
                  {(fields, { add, remove }) => (
                    <div className="academy-campaign-cadence-editor">
                      <div className="academy-campaign-cadence-heading" aria-hidden>
                        <span>Nhịp</span>
                        <span>Nội dung chạm</span>
                        <span>Khoảng ngày</span>
                        <span>Biểu tượng</span>
                        <span />
                      </div>
                      {fields.map((field, index) => (
                        <div key={field.key} className="academy-campaign-cadence-row">
                          <div className="academy-campaign-cadence-index">
                            <StatusTag
                              status="processing"
                              className="tabular-nums"
                              label={touchpointDayLabel(index, watchedTouchpoints?.[index])}
                            />
                            <Form.Item name={[field.name, 'key']} noStyle>
                              <Input type="hidden" />
                            </Form.Item>
                          </div>
                          <Form.Item
                            name={[field.name, 'label']}
                            noStyle
                            rules={[{ required: true, message: 'Nhập nội dung điểm chạm.' }]}
                          >
                            <Input
                              aria-label={`Nội dung điểm chạm ${index + 1}`}
                              size="small"
                              maxLength={100}
                              placeholder="Chạm D1"
                            />
                          </Form.Item>
                          <div className="academy-campaign-cadence-range">
                            <Form.Item
                              name={[field.name, 'daysMin']}
                              noStyle
                              rules={[{ required: true, message: 'Nhập ngày bắt đầu.' }]}
                            >
                              <InputNumber
                                aria-label={`Ngày bắt đầu điểm chạm ${index + 1}`}
                                size="small"
                                min={0}
                                precision={0}
                                className="w-full"
                              />
                            </Form.Item>
                            <span aria-hidden>→</span>
                            <Form.Item name={[field.name, 'daysMax']} noStyle>
                              <InputNumber
                                aria-label={`Ngày kết thúc điểm chạm ${index + 1}`}
                                size="small"
                                min={0}
                                precision={0}
                                className="w-full"
                                placeholder="∞"
                              />
                            </Form.Item>
                          </div>
                          <div className="academy-campaign-cadence-icon">
                            <Form.Item name={[field.name, 'icon']} noStyle>
                              <TouchpointIconPicker aria-label={`Biểu tượng điểm chạm ${index + 1}`} size="small" />
                            </Form.Item>
                          </div>
                          <Button
                            aria-label={`Xóa điểm chạm ${index + 1}`}
                            danger
                            type="text"
                            size="small"
                            icon={<AppIcon icon={Trash2} />}
                            disabled={fields.length <= 1}
                            onClick={() => remove(field.name)}
                          />
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        icon={<AppIcon icon={Plus} />}
                        onClick={() =>
                          add({
                            key: `touchpoint-${fields.length + 1}`,
                            label: 'Điểm chạm mới',
                            icon: 'Calendar',
                            daysMin: 0,
                            daysMax: null,
                          })
                        }
                      >
                        Thêm điểm chạm
                      </Button>
                    </div>
                  )}
                </Form.List>
              </EntityFormField>
            </>
          )}
        </EntityForm>
      </EntityFormDrawer>

      <AcademyCampaignLeadPicker
        open={leadPickerOpen}
        staff={staff}
        initialSelectedLeadIds={snapshotLeadIds}
        onClose={() => setLeadPickerOpen(false)}
        onConfirm={(leadIds) => {
          setSnapshotLeadIds(leadIds);
          setLeadPickerOpen(false);
        }}
      />
    </>
  );
}

export default AcademyCampaignFormDrawer;
