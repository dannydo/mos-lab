'use client';

import React from 'react';
import { Button, Form, Tabs, message, type FormInstance } from 'antd';
import { Gift, MapPin, Settings } from 'lucide-react';
import type { Campaign, Staff } from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon } from '~/components/ui';
import type { FixedFinalPriceServiceCategory, FixedFinalPriceServiceOption } from '~/lib/campaign-fixed-price';
import { CampaignInfoTab } from './CampaignInfoTab';
import { CampaignPromotionsTab } from './CampaignPromotionsTab';
import { CampaignTouchpointsTab } from './CampaignTouchpointsTab';
import type { CampaignFormValues } from './campaignManagementTypes';

export interface CampaignFormModalProps {
  open: boolean;
  editingCampaign: Campaign | null;
  submitting: boolean;
  form: FormInstance<CampaignFormValues>;
  staffList: Staff[];
  campaignFormOptionsLoading: boolean;
  campaignFormOptionsError: string | null;
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[];
  fixedFinalPriceServices: FixedFinalPriceServiceOption[];
  onClose: () => void;
  onSubmit: (values: CampaignFormValues) => void | Promise<void>;
}

export function CampaignFormModal({
  open,
  editingCampaign,
  submitting,
  form,
  staffList,
  campaignFormOptionsLoading,
  campaignFormOptionsError,
  fixedFinalPriceCategories,
  fixedFinalPriceServices,
  onClose,
  onSubmit,
}: CampaignFormModalProps) {
  return (
    <AdaptiveModal
      intent="form"
      title={
        <div className="text-lg font-bold">
          {editingCampaign ? 'Chỉnh sửa chiến dịch NYC' : 'Tạo chiến dịch NYC mới'}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Form<CampaignFormValues>
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        onFinishFailed={(errorInfo) => {
          console.error('Campaign form validation failed:', errorInfo);
          message.error('Vui lòng kiểm tra lại các thông tin bắt buộc (Tên chiến dịch, Điểm chạm, Ưu đãi)');
        }}
        className="mt-4"
      >
        <Tabs
          defaultActiveKey="info"
          className="campaign-minimal-tabs"
          items={[
            {
              key: 'info',
              label: (
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <AppIcon icon={Settings} size={15} className="text-slate-500" />
                  <span>Thông tin</span>
                </span>
              ),
              children: (
                <CampaignInfoTab
                  staffList={staffList}
                  campaignFormOptionsLoading={campaignFormOptionsLoading}
                  campaignFormOptionsError={campaignFormOptionsError}
                />
              ),
            },
            {
              key: 'touchpoints',
              label: (
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <AppIcon icon={MapPin} size={15} className="text-rose-500" />
                  <span>Điểm chạm</span>
                </span>
              ),
              children: <CampaignTouchpointsTab />,
            },
            {
              key: 'promotions',
              label: (
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <AppIcon icon={Gift} size={15} className="text-amber-500" />
                  <span>Ưu đãi</span>
                </span>
              ),
              children: (
                <CampaignPromotionsTab
                  campaignFormOptionsLoading={campaignFormOptionsLoading}
                  campaignFormOptionsError={campaignFormOptionsError}
                  fixedFinalPriceCategories={fixedFinalPriceCategories}
                  fixedFinalPriceServices={fixedFinalPriceServices}
                />
              ),
            },
          ]}
        />

        <AdaptiveOverlayFooter className="mt-6">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {editingCampaign ? 'Cập nhật chiến dịch' : 'Tạo chiến dịch'}
          </Button>
        </AdaptiveOverlayFooter>
      </Form>
    </AdaptiveModal>
  );
}
