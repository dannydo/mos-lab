'use client';

import React from 'react';
import { Button, Tabs, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { AdaptiveDrawer, AppIcon, CopyPhoneButton } from '~/components/ui';
import type { PlansSuggestionsState, SuggestedCustomer } from './plansPageTypes';
import { SUGGESTION_TABS } from './plansPageUtils';

const { Text } = Typography;

export interface PlansSuggestionsDrawerProps {
  open: boolean;
  suggestsLoading: boolean;
  suggests: PlansSuggestionsState;
  onClose: () => void;
  onAddToPlan: (customerId: number) => void | Promise<void>;
}

interface SuggestListSectionProps {
  dataList: SuggestedCustomer[];
  touchpointName: string;
  tipMsg: string;
  onAddToPlan: (customerId: number) => void | Promise<void>;
}

function SuggestListSection({ dataList, touchpointName, tipMsg, onAddToPlan }: SuggestListSectionProps) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <Text strong className="text-[var(--color-primary)]">
          {touchpointName}
        </Text>
        <Text className="tabular-nums text-[11px] text-[var(--mos-text-secondary)]">{dataList.length} khách</Text>
      </div>
      <div className="mb-2 text-[11px] italic text-[var(--mos-text-secondary)]">{tipMsg}</div>
      <div className="divide-y divide-[var(--mos-border-secondary)] rounded-md border border-[var(--mos-border-secondary)] bg-[var(--mos-bg-layout)]">
        {dataList.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-[var(--mos-text-secondary)]">Không có gợi ý</div>
        ) : (
          dataList.map((cust) => (
            <div key={cust.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--mos-text)]">{cust.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-[var(--mos-text-secondary)] tabular-nums">
                  <span>SĐT: {cust.phone}</span>
                  {cust.phone && <CopyPhoneButton phone={cust.phone} size="xs" />}
                  <span>
                    | Trễ:{' '}
                    {cust.daysSinceLastVisit !== null && cust.daysSinceLastVisit !== undefined
                      ? `${cust.daysSinceLastVisit} ngày`
                      : 'Chưa ghé'}
                  </span>
                </div>
              </div>
              <Button
                type="text"
                size="small"
                aria-label={`Thêm ${cust.name} vào kế hoạch`}
                icon={<AppIcon icon={Plus} size={14} />}
                onClick={() => onAddToPlan(cust.id)}
                className="shrink-0 text-[var(--color-primary)]"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PlansSuggestionsDrawer({
  open,
  suggestsLoading,
  suggests,
  onClose,
  onAddToPlan,
}: PlansSuggestionsDrawerProps) {
  return (
    <AdaptiveDrawer
      title={<span className="text-base font-bold text-[var(--color-primary)]">Gợi Ý Khách Hàng Cần Gọi</span>}
      placement="right"
      onClose={onClose}
      open={open}
      width={400}
      intent="detail"
    >
      {suggestsLoading ? (
        <div className="py-8 text-center text-[var(--mos-text-secondary)]">Đang quét danh sách gợi ý...</div>
      ) : (
        <Tabs
          defaultActiveKey="1"
          type="card"
          items={SUGGESTION_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <div>
                {tab.groups.map((group) => (
                  <SuggestListSection
                    key={group.key}
                    dataList={suggests[group.key] ?? []}
                    touchpointName={group.title}
                    tipMsg={group.tip}
                    onAddToPlan={onAddToPlan}
                  />
                ))}
              </div>
            ),
          }))}
        />
      )}
    </AdaptiveDrawer>
  );
}
