'use client';

import React from 'react';
import {
  Button,
  DatePicker,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Select,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EnvironmentOutlined,
  GiftOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AdaptiveModal, AdaptiveOverlayFooter } from '~/components/ui/AdaptiveOverlay';
import { ResponsiveFormGrid } from '~/components/ui/ResponsiveFormGrid';
import { GoogleSheetColorPicker } from '~/components/GoogleSheetColorPicker';
import { TouchpointIconPicker } from '~/components/campaign/TouchpointIconPicker';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { getFixedFinalPriceScopeSummary, splitFixedFinalPriceSelection } from '~/lib/campaign-fixed-price';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export interface CampaignEditModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  form: FormInstance;
  campaign: { name?: string; [key: string]: any } | null;
  submitting: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  staffList: Array<{ id: number; displayName?: string; username?: string }>;
  campaignFormOptionsLoading: boolean;
  campaignFormOptionsError: string | null;
  fixedFinalPriceCategories: any[];
  fixedFinalPriceServices: any[];
}

export const CampaignEditModal: React.FC<CampaignEditModalProps> = ({
  open,
  onCancel,
  onSubmit,
  form,
  campaign,
  submitting,
  activeTab,
  onTabChange,
  staffList,
  campaignFormOptionsLoading,
  campaignFormOptionsError,
  fixedFinalPriceCategories,
  fixedFinalPriceServices,
}) => {
  return (
    <AdaptiveModal
      intent="form"
      className="nyc-campaign-edit-overlay"
      title={
        <div className="nyc-campaign-edit-title">
          <span>Chỉnh sửa chiến dịch NYC:</span>
          <span className="nyc-campaign-edit-title-name">{campaign?.name}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        onFinishFailed={(errorInfo) => {
          console.error('Campaign form validation failed:', errorInfo);
          message.error('Vui lòng kiểm tra lại các thông tin bắt buộc (Tên chiến dịch, Điểm chạm, Ưu đãi)');
        }}
        className="mt-4 nyc-campaign-edit-form"
      >
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          className="campaign-minimal-tabs nyc-campaign-edit-tabs"
          items={[
            {
              key: 'info',
              label: (
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <SettingOutlined className="text-slate-500" /> Thông tin
                </span>
              ),
              children: (
                <div className="pt-2 nyc-campaign-edit-info">
                  <ResponsiveFormGrid columns={2}>
                    <Form.Item
                      name="name"
                      label="Tên chiến dịch"
                      rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
                    >
                      <Input placeholder="VD: Chiến dịch NYC Tri ân Tháng 8" />
                    </Form.Item>
                    <Form.Item
                      name="slug"
                      label="Slug (Đường dẫn)"
                      tooltip="Tùy chọn. Nếu để trống hệ thống sẽ tự sinh từ tên."
                    >
                      <Input placeholder="VD: tri-an-thang-8" />
                    </Form.Item>
                    <Form.Item name="dates" label="Thời gian diễn ra">
                      <RangePicker
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                      />
                    </Form.Item>
                    <Form.Item name="status" label="Trạng thái">
                      <Select
                        options={[
                          { value: 'ACTIVE', label: 'ACTIVE (Hoạt động)' },
                          { value: 'ENDED', label: 'ENDED (Đã kết thúc)' },
                          { value: 'ARCHIVED', label: 'ARCHIVED (Lưu trữ)' },
                        ]}
                      />
                    </Form.Item>
                    <div className="responsive-form-field-full">
                      <Form.Item name="description" label="Mô tả chiến dịch">
                        <Input.TextArea
                          rows={2}
                          placeholder="Mô tả ngắn gọn về mục tiêu và quy định của chiến dịch..."
                        />
                      </Form.Item>
                    </div>
                    <div className="responsive-form-field-full">
                      <Form.Item
                        name="assignedStaffIds"
                        label={
                          <span className="inline-flex items-center gap-1.5">
                            <TeamOutlined className="text-blue-500" />
                            <span>Thành viên được phép truy cập (Team Booker)</span>
                          </span>
                        }
                        tooltip="Chọn các nhân sự thuộc Team Booker được phép xem và thao tác trên chiến dịch này. Nếu để trống, tất cả nhân sự đều xem được."
                      >
                        <Select
                          mode="multiple"
                          allowClear
                          showSearch
                          loading={campaignFormOptionsLoading}
                          placeholder="Chừa trống = Công Khai (Tất cả nhân sự xem được)"
                          filterOption={vietnameseSearchFilter}
                          optionFilterProp="label"
                          notFoundContent={
                            campaignFormOptionsLoading
                              ? 'Đang tải thành viên...'
                              : campaignFormOptionsError || 'Không có nhân sự hoạt động'
                          }
                          style={{ width: '100%' }}
                          tagRender={(props) => {
                            const { label, closable, onClose } = props;
                            const cleanLabel = typeof label === 'string' ? label.split('(')[0].trim() : label;
                            return (
                              <Tag
                                color="blue"
                                closable={closable}
                                onClose={onClose}
                                style={{ marginRight: 4 }}
                                className="rounded-md font-medium text-xs py-0.5 px-2 inline-flex items-center gap-1"
                              >
                                <UserOutlined className="text-blue-500 text-xs" />
                                <span>{cleanLabel}</span>
                              </Tag>
                            );
                          }}
                          options={staffList.map((s) => ({
                            value: s.id,
                            label: `${s.displayName || s.username} (${s.username})`,
                          }))}
                        />
                      </Form.Item>
                    </div>
                  </ResponsiveFormGrid>
                </div>
              ),
            },
            {
              key: 'touchpoints',
              label: (
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <EnvironmentOutlined className="text-rose-500 text-base" /> Điểm chạm
                </span>
              ),
              children: (
                <div className="pt-2">
                  <Form.List name="touchpoints">
                    {(fields, { add, remove }) => (
                      <div>
                        {fields.length > 0 && (
                          <div className="campaign-edit-list-header campaign-edit-touchpoint-header flex items-center gap-2 px-1 py-1.5 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex-1 min-w-[120px]">Tên điểm chạm</div>
                            <div className="w-[140px] text-center">Biểu tượng (Icon)</div>
                            <div className="w-16 text-center">Từ ngày</div>
                            <div className="w-16 text-center">Đến ngày</div>
                            <div className="w-[95px] text-center">Màu sắc</div>
                            <div className="w-8 text-center">Xóa</div>
                          </div>
                        )}
                        <div className="space-y-2">
                          {fields.map(({ key, name, ...restField }) => (
                            <div
                              key={key}
                              className="campaign-edit-list-row campaign-edit-touchpoint-row flex items-center gap-2 py-0.5"
                            >
                              <Form.Item {...restField} name={[name, 'id']} hidden>
                                <Input />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'key']} hidden>
                                <Input />
                              </Form.Item>
                              <div className="campaign-edit-field campaign-edit-touchpoint-label flex-1 min-w-[120px]">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'label']}
                                  rules={[{ required: true, message: 'Nhập tên' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="Tên chạm (VD: Chạm D1)" />
                                </Form.Item>
                              </div>
                              <div className="campaign-edit-field campaign-edit-touchpoint-icon w-[140px]">
                                <Form.Item {...restField} name={[name, 'icon']} style={{ marginBottom: 0 }}>
                                  <TouchpointIconPicker size="small" />
                                </Form.Item>
                              </div>
                              <div className="campaign-edit-field campaign-edit-touchpoint-days-min w-16">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'daysMin']}
                                  rules={[{ required: true, message: 'Nhập ngày' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber min={0} placeholder="D+" style={{ width: '100%' }} />
                                </Form.Item>
                              </div>
                              <div className="campaign-edit-field campaign-edit-touchpoint-days-max w-16">
                                <Form.Item {...restField} name={[name, 'daysMax']} style={{ marginBottom: 0 }}>
                                  <InputNumber min={0} placeholder="D+" style={{ width: '100%' }} />
                                </Form.Item>
                              </div>
                              <div className="campaign-edit-field campaign-edit-touchpoint-color w-[95px] flex justify-center">
                                <Form.Item {...restField} name={[name, 'color']} style={{ marginBottom: 0 }}>
                                  <GoogleSheetColorPicker size="small" />
                                </Form.Item>
                              </div>
                              <div className="campaign-edit-field campaign-edit-touchpoint-delete w-8 flex justify-center">
                                <Button
                                  type="text"
                                  danger
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => remove(name)}
                                />
                              </div>
                            </div>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => {
                              const nextIdx = fields.length;
                              const defaultIcon =
                                nextIdx === 0
                                  ? 'Smile'
                                  : nextIdx === 1
                                    ? 'Handshake'
                                    : nextIdx === 2
                                      ? 'Kiss'
                                      : nextIdx === 3
                                        ? 'Heart'
                                        : nextIdx === 4
                                          ? 'BedDouble'
                                          : 'Sparkles';
                              const defaultLabel = `Chạm D${nextIdx === 0 ? 1 : nextIdx === 1 ? 3 : nextIdx === 2 ? 7 : nextIdx === 3 ? 14 : nextIdx === 4 ? 21 : (nextIdx + 1) * 5}`;
                              const defaultDays =
                                nextIdx === 0
                                  ? 1
                                  : nextIdx === 1
                                    ? 3
                                    : nextIdx === 2
                                      ? 7
                                      : nextIdx === 3
                                        ? 14
                                        : nextIdx === 4
                                          ? 21
                                          : (nextIdx + 1) * 5;
                              add({
                                label: defaultLabel,
                                color: '#3b82f6',
                                daysMin: defaultDays,
                                daysMax: defaultDays,
                                icon: defaultIcon,
                              });
                            }}
                            block
                            icon={<PlusOutlined />}
                            className="rounded-xl h-10 border-dashed mt-2"
                          >
                            Thêm điểm chạm mới
                          </Button>
                        </div>
                      </div>
                    )}
                  </Form.List>
                </div>
              ),
            },
            {
              key: 'promotions',
              label: (
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <GiftOutlined className="text-amber-500 text-base" /> Ưu đãi
                </span>
              ),
              children: (
                <div className="pt-2">
                  <Form.List name="promotions">
                    {(fields, { add, remove }) => (
                      <div>
                        {fields.length > 0 && (
                          <div className="campaign-edit-list-header campaign-edit-promotion-header flex items-center gap-2 px-1 py-1.5 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex-1">Tên ưu đãi</div>
                            <div className="w-36 text-left">Loại ưu đãi</div>
                            <div className="w-24 text-center">Giá trị</div>
                            <div className="w-28 text-left">Mã voucher</div>
                            <div className="w-8 text-center">Xóa</div>
                          </div>
                        )}
                        <div className="space-y-2">
                          {fields.map(({ key, name, ...restField }) => (
                            <React.Fragment key={key}>
                              <div className="campaign-edit-list-row campaign-edit-promotion-row flex items-center gap-2 py-0.5">
                                <div className="campaign-edit-field campaign-edit-promotion-name flex-1">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'name']}
                                    rules={[{ required: true, message: 'Nhập tên' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Tên ưu đãi (VD: Giảm 50%)" />
                                  </Form.Item>
                                </div>
                                <div className="campaign-edit-field campaign-edit-promotion-type w-36">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'type']}
                                    rules={[{ required: true, message: 'Chọn loại' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select
                                      options={[
                                        { value: 'PERCENT_DISCOUNT', label: 'Giảm %' },
                                        { value: 'FIXED_DISCOUNT', label: 'Giảm số tiền' },
                                        { value: 'FIXED_FINAL_PRICE', label: 'Giá đồng nhất' },
                                        { value: 'FREE_SERVICE', label: 'Tặng dịch vụ' },
                                        { value: 'FREE_PRODUCT', label: 'Tặng sản phẩm' },
                                      ]}
                                    />
                                  </Form.Item>
                                </div>
                                <div className="campaign-edit-field campaign-edit-promotion-value w-24">
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'value']}
                                    rules={[{ required: true, message: 'Nhập giá trị' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber min={0} placeholder="Giá trị" style={{ width: '100%' }} />
                                  </Form.Item>
                                </div>
                                <div className="campaign-edit-field campaign-edit-promotion-code w-28">
                                  <Form.Item {...restField} name={[name, 'code']} style={{ marginBottom: 0 }}>
                                    <Input placeholder="Mã Code" />
                                  </Form.Item>
                                </div>
                                <div className="campaign-edit-field campaign-edit-promotion-delete w-8 flex justify-center">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<MinusCircleOutlined />}
                                    onClick={() => remove(name)}
                                  />
                                </div>
                              </div>
                              <Form.Item
                                noStyle
                                shouldUpdate={(previous, current) =>
                                  previous.promotions?.[name]?.type !== current.promotions?.[name]?.type ||
                                  previous.promotions?.[name]?.eligibleServiceSelection !==
                                    current.promotions?.[name]?.eligibleServiceSelection ||
                                  previous.promotions?.[name]?.value !== current.promotions?.[name]?.value
                                }
                              >
                                {({ getFieldValue }) => {
                                  const selection = splitFixedFinalPriceSelection(
                                    getFieldValue(['promotions', name, 'eligibleServiceSelection'])
                                  );
                                  const scope = getFixedFinalPriceScopeSummary(
                                    selection.eligibleServiceIds,
                                    selection.eligibleServiceCategoryKeys,
                                    fixedFinalPriceServices,
                                    fixedFinalPriceCategories
                                  );
                                  return getFieldValue(['promotions', name, 'type']) === 'FIXED_FINAL_PRICE' ? (
                                    <div className="ml-1 mr-10 mb-2 rounded-lg border border-violet-200 bg-violet-50/70 p-2.5 dark:border-violet-500/30 dark:bg-violet-500/10">
                                      <Form.Item
                                        {...restField}
                                        name={[name, 'eligibleServiceSelection']}
                                        label="Dịch vụ / thể loại nối mi áp dụng"
                                        rules={[
                                          {
                                            required: true,
                                            type: 'array',
                                            min: 1,
                                            message: 'Chọn ít nhất một dịch vụ lẻ nối mi hoặc thể loại.',
                                          },
                                        ]}
                                        style={{ marginBottom: 0 }}
                                      >
                                        <Select
                                          mode="multiple"
                                          allowClear
                                          showSearch
                                          loading={campaignFormOptionsLoading}
                                          filterOption={vietnameseSearchFilter}
                                          optionFilterProp="label"
                                          placeholder="Chọn thể loại (VD: HyperLight) hoặc dịch vụ cụ thể"
                                          notFoundContent={
                                            campaignFormOptionsLoading
                                              ? 'Đang tải dịch vụ từ Bộ lọc nâng cao...'
                                              : campaignFormOptionsError ||
                                                'Không có dịch vụ lẻ nối mi hoặc thể loại hợp lệ'
                                          }
                                          options={[
                                            {
                                              label: 'Thể loại dịch vụ',
                                              options: fixedFinalPriceCategories.map((category) => ({
                                                value: `category:${category.key}`,
                                                label: `${category.label} — ${category.serviceIds.length} dịch vụ, giá từ ${category.minimumPrice.toLocaleString('vi-VN')}đ`,
                                              })),
                                            },
                                            {
                                              label: 'Dịch vụ cụ thể',
                                              options: fixedFinalPriceServices.map((service) => ({
                                                value: String(service.id),
                                                label: `${service.name} — ${service.price.toLocaleString('vi-VN')}đ`,
                                              })),
                                            },
                                          ]}
                                        />
                                      </Form.Item>
                                      <Text type="secondary" className="mt-1 block text-xs">
                                        Chọn HyperLight sẽ áp dụng toàn bộ biến thể nối mi Normal của HyperLight. Dùng
                                        cùng catalog với Bộ lọc nâng cao ở Tất cả KH; giá chốt không cộng dồn ưu đãi
                                        khác.
                                      </Text>
                                      {scope.minimumListedPrice !== null && (
                                        <Text className="mt-1 block text-xs text-violet-700 dark:text-violet-200">
                                          Phạm vi hiện tại: {scope.services.length} dịch vụ. Giá đồng nhất tối đa:{' '}
                                          {scope.minimumListedPrice.toLocaleString('vi-VN')}đ.
                                        </Text>
                                      )}
                                    </div>
                                  ) : null;
                                }}
                              </Form.Item>
                            </React.Fragment>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => add({ name: 'Ưu đãi mới', type: 'PERCENT_DISCOUNT', value: 50 })}
                            block
                            icon={<PlusOutlined />}
                            className="rounded-xl h-10 border-dashed mt-2"
                          >
                            Thêm ưu đãi mới
                          </Button>
                        </div>
                      </div>
                    )}
                  </Form.List>
                </div>
              ),
            },
          ]}
        />

        <AdaptiveOverlayFooter className="nyc-campaign-edit-actions">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Lưu thay đổi
          </Button>
        </AdaptiveOverlayFooter>
      </Form>
    </AdaptiveModal>
  );
};
