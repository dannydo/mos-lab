'use client';

import React from 'react';
import { Button, Form, Input, InputNumber, Select, Typography } from 'antd';
import { MinusCircle, Plus } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import {
  type FixedFinalPriceServiceCategory,
  type FixedFinalPriceServiceOption,
  getFixedFinalPriceScopeSummary,
  splitFixedFinalPriceSelection,
} from '~/lib/campaign-fixed-price';
import { CAMPAIGN_PROMOTION_TYPE_OPTIONS } from './campaignManagementTypes';

const { Text } = Typography;

export interface CampaignPromotionsTabProps {
  campaignFormOptionsLoading: boolean;
  campaignFormOptionsError: string | null;
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[];
  fixedFinalPriceServices: FixedFinalPriceServiceOption[];
}

export function CampaignPromotionsTab({
  campaignFormOptionsLoading,
  campaignFormOptionsError,
  fixedFinalPriceCategories,
  fixedFinalPriceServices,
}: CampaignPromotionsTabProps) {
  return (
    <div className="pt-2">
      <Form.List name="promotions">
        {(fields, { add, remove }) => (
          <div className="overflow-x-auto">
            <div className="min-w-[540px]">
              {fields.length > 0 && (
                <div className="mb-2 flex items-center gap-2 border-b border-slate-200 px-1 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
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
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="flex-1">
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true, message: 'Nhập tên' }]}
                          className="mb-0"
                        >
                          <Input placeholder="Tên ưu đãi (VD: Giảm 50%)" />
                        </Form.Item>
                      </div>
                      <div className="w-36">
                        <Form.Item
                          {...restField}
                          name={[name, 'type']}
                          rules={[{ required: true, message: 'Chọn loại' }]}
                          className="mb-0"
                        >
                          <Select options={[...CAMPAIGN_PROMOTION_TYPE_OPTIONS]} />
                        </Form.Item>
                      </div>
                      <div className="w-24">
                        <Form.Item
                          {...restField}
                          name={[name, 'value']}
                          rules={[{ required: true, message: 'Nhập giá trị' }]}
                          className="mb-0"
                        >
                          <InputNumber min={0} placeholder="Giá trị" className="w-full tabular-nums" />
                        </Form.Item>
                      </div>
                      <div className="w-28">
                        <Form.Item {...restField} name={[name, 'code']} className="mb-0">
                          <Input placeholder="Mã Code" />
                        </Form.Item>
                      </div>
                      <div className="flex w-8 justify-center">
                        <Button
                          type="text"
                          danger
                          aria-label={`Xóa ưu đãi #${name + 1}`}
                          icon={<AppIcon icon={MinusCircle} size={15} />}
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
                        if (getFieldValue(['promotions', name, 'type']) !== 'FIXED_FINAL_PRICE') {
                          return null;
                        }
                        const selection = splitFixedFinalPriceSelection(
                          getFieldValue(['promotions', name, 'eligibleServiceSelection'])
                        );
                        const scope = getFixedFinalPriceScopeSummary(
                          selection.eligibleServiceIds,
                          selection.eligibleServiceCategoryKeys,
                          fixedFinalPriceServices,
                          fixedFinalPriceCategories
                        );

                        return (
                          <div className="mr-10 mb-2 ml-1 rounded-lg border border-violet-200 bg-violet-50/70 p-2.5 dark:border-violet-500/30 dark:bg-violet-500/10">
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
                              className="mb-0"
                            >
                              <Select
                                mode="multiple"
                                allowClear
                                showSearch
                                loading={campaignFormOptionsLoading}
                                filterOption={vietnameseSearchFilter}
                                placeholder="Chọn thể loại (VD: HyperLight) hoặc dịch vụ cụ thể"
                                optionFilterProp="label"
                                notFoundContent={
                                  campaignFormOptionsLoading
                                    ? 'Đang tải dịch vụ từ Bộ lọc nâng cao...'
                                    : campaignFormOptionsError || 'Không có dịch vụ lẻ nối mi hoặc thể loại hợp lệ'
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
                              Chọn HyperLight sẽ áp dụng toàn bộ biến thể nối mi Normal của HyperLight. Dùng cùng
                              catalog với Bộ lọc nâng cao ở Tất cả KH; giá chốt không cộng dồn ưu đãi khác.
                            </Text>
                            {scope.minimumListedPrice !== null && (
                              <Text className="mt-1 block text-xs text-violet-700 tabular-nums dark:text-violet-200">
                                Phạm vi hiện tại: {scope.services.length} dịch vụ. Giá đồng nhất tối đa:{' '}
                                {scope.minimumListedPrice.toLocaleString('vi-VN')}đ.
                              </Text>
                            )}
                          </div>
                        );
                      }}
                    </Form.Item>
                  </React.Fragment>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add({ type: 'PERCENT_DISCOUNT', value: 50 })}
                  block
                  icon={<AppIcon icon={Plus} size={15} />}
                  className="mt-2 h-10 rounded-xl border-dashed"
                >
                  Thêm ưu đãi mới
                </Button>
              </div>
            </div>
          </div>
        )}
      </Form.List>
    </div>
  );
}
