'use client';

import React from 'react';
import { Form, Select } from 'antd';
import { Phone, Rocket } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import FilterSectionHeader from '~/components/filters/FilterSectionHeader';
import RangeFilterField from '~/components/filters/RangeFilterField';
import { AppIcon } from '~/components/ui';
import {
  CALL_STATUS_OPTIONS,
  CAMPAIGN_FILTER_MODE_OPTIONS,
  getFilterCardClass,
  getFilterFieldLabelClass,
} from './constants';
import type { CustomerFiltersProps } from './types';

export type CustomerCallAndCampaignSectionsProps = Pick<
  CustomerFiltersProps,
  | 'themeMode'
  | 'callStatuses'
  | 'setCallStatuses'
  | 'lastCallDaysMin'
  | 'setLastCallDaysMin'
  | 'lastCallDaysMax'
  | 'setLastCallDaysMax'
  | 'campaignId'
  | 'setCampaignId'
  | 'campaignFilterMode'
  | 'setCampaignFilterMode'
  | 'campaignList'
  | 'setActiveFilterId'
>;

export const CustomerCallAndCampaignSections: React.FC<CustomerCallAndCampaignSectionsProps> = ({
  themeMode,
  callStatuses = [],
  setCallStatuses,
  lastCallDaysMin,
  setLastCallDaysMin,
  lastCallDaysMax,
  setLastCallDaysMax,
  campaignId,
  setCampaignId,
  campaignFilterMode = 'ALL',
  setCampaignFilterMode,
  campaignList = [],
  setActiveFilterId,
}) => {
  const cardClass = getFilterCardClass(themeMode);
  const labelClass = getFilterFieldLabelClass(themeMode);

  return (
    <>
      {/* CARD 6: LỊCH SỬ & TRẠNG THÁI CUỘC GỌI */}
      <div className={cardClass}>
        <FilterSectionHeader
          icon={<AppIcon icon={Phone} size={14} className="text-blue-500" />}
          title="Lịch sử & Trạng thái Cuộc gọi"
          themeMode={themeMode}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Form.Item
              label={<span className={labelClass}>Trạng thái Cuộc gọi gần nhất (Chọn nhiều)</span>}
              className="mb-0"
            >
              <Select
                aria-label="Lọc trạng thái cuộc gọi gần nhất"
                mode="multiple"
                allowClear
                placeholder="Chọn các trạng thái cuộc gọi..."
                value={callStatuses}
                className="w-full"
                onChange={(val) => {
                  setCallStatuses?.(val || []);
                  setActiveFilterId(null);
                }}
                maxTagCount="responsive"
                options={CALL_STATUS_OPTIONS}
              />
            </Form.Item>
          </div>

          <div>
            <RangeFilterField
              minLabel="Ngày gọi gần nhất (ít nhất)"
              maxLabel="Ngày gọi gần nhất (nhiều nhất)"
              minPlaceholder="VD: 1 ngày"
              maxPlaceholder="VD: 30 ngày"
              minValue={lastCallDaysMin}
              maxValue={lastCallDaysMax}
              onChangeMin={(val: number | undefined) => {
                setLastCallDaysMin?.(val);
                setActiveFilterId(null);
              }}
              onChangeMax={(val: number | undefined) => {
                setLastCallDaysMax?.(val);
                setActiveFilterId(null);
              }}
              themeMode={themeMode}
            />
          </div>
        </div>
      </div>

      {/* CARD 7: CHIẾN DỊCH (CAMPAIGN) */}
      <div className={cardClass}>
        <FilterSectionHeader
          icon={<AppIcon icon={Rocket} size={14} className="text-purple-500" />}
          title="Chiến dịch (Campaign)"
          themeMode={themeMode}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Form.Item label={<span className={labelClass}>Chọn Chiến dịch NYC</span>} className="mb-0">
              <Select
                aria-label="Lọc theo chiến dịch"
                showSearch
                allowClear
                filterOption={vietnameseSearchFilter}
                placeholder="Chọn chiến dịch cần lọc..."
                value={campaignId || undefined}
                onChange={(val) => {
                  const nextId = val ? Number(val) : undefined;
                  setCampaignId?.(nextId);
                  if (!nextId) {
                    setCampaignFilterMode?.('ALL');
                  } else if (!campaignFilterMode || campaignFilterMode === 'ALL') {
                    setCampaignFilterMode?.('IN');
                  }
                  setActiveFilterId(null);
                }}
                className="w-full"
                options={(campaignList || []).map((c: SafeAny) => ({
                  value: c.id,
                  label: `${c.name || `Chiến dịch #${c.id}`}${c._count?.customers ? ` (${c._count.customers} KH)` : ''}`,
                }))}
              />
            </Form.Item>
          </div>

          <div>
            <Form.Item label={<span className={labelClass}>Lịch sử tham gia Campaign</span>} className="mb-0">
              <Select
                aria-label="Lọc theo lịch sử tham gia chiến dịch"
                value={campaignFilterMode || 'ALL'}
                disabled={!campaignId}
                onChange={(val) => {
                  setCampaignFilterMode?.(val as 'ALL' | 'IN' | 'NOT_IN');
                  setActiveFilterId(null);
                }}
                className="w-full"
                options={CAMPAIGN_FILTER_MODE_OPTIONS}
              />
            </Form.Item>
          </div>
        </div>

        <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
          Chọn <strong>Chưa từng thuộc Campaign này</strong> để lọc tệp khách mới chưa từng được đưa vào chiến dịch đã
          chọn, tránh chia trùng dữ liệu.
        </div>
      </div>
    </>
  );
};
