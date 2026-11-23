'use client';

import { useCallback, useState } from 'react';
import { Form, message } from 'antd';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignPromotion, CampaignTouchpoint } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { FixedFinalPriceServiceCategory, FixedFinalPriceServiceOption } from '~/lib/campaign-fixed-price';
import type { CampaignEditFormValues } from './campaignDetailTypes';
import { buildCampaignEditFormInitialValues, buildCampaignEditUpdateDto } from './campaignDetailUtils';

export interface UseCampaignEditModalParams {
  slug: string;
  campaign: Campaign | null;
  touchpoints: CampaignTouchpoint[];
  promotions: CampaignPromotion[];
  fixedFinalPriceServices: FixedFinalPriceServiceOption[];
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[];
  fetchCampaignData: () => Promise<void>;
  fetchCampaignCustomers: (isBackground?: boolean) => Promise<void>;
}

export function useCampaignEditModal({
  slug,
  campaign,
  touchpoints,
  promotions,
  fixedFinalPriceServices,
  fixedFinalPriceCategories,
  fetchCampaignData,
  fetchCampaignCustomers,
}: UseCampaignEditModalParams) {
  const router = useRouter();
  const [editCampaignModalVisible, setEditCampaignModalVisible] = useState<boolean>(false);
  const [editModalTab, setEditModalTab] = useState<string>('info');
  const [editForm] = Form.useForm();
  const [editingSubmitting, setEditingSubmitting] = useState<boolean>(false);

  const handleOpenEditModal = useCallback(
    (targetTab: unknown = 'info') => {
      if (!campaign) return;
      setEditModalTab(typeof targetTab === 'string' ? targetTab : 'info');
      editForm.setFieldsValue(buildCampaignEditFormInitialValues(campaign, touchpoints, promotions));
      setEditCampaignModalVisible(true);
    },
    [campaign, editForm, promotions, touchpoints]
  );

  const handleEditSubmit = useCallback(
    async (values: CampaignEditFormValues) => {
      const campId = campaign?.id;
      if (!campId) return;
      setEditingSubmitting(true);
      try {
        const updateDto = buildCampaignEditUpdateDto(values, fixedFinalPriceServices, fixedFinalPriceCategories);
        const updatedCamp = (await apiClient.campaigns.update(campId, updateDto)) as { slug?: string } | null;
        message.success('Đã cập nhật chiến dịch thành công');
        setEditCampaignModalVisible(false);

        const targetSlug = updatedCamp?.slug || values.slug;
        if (targetSlug && targetSlug !== slug) {
          router.push(`/dashboard/nyc/campaigns/${targetSlug}`);
        } else {
          await fetchCampaignData();
          await fetchCampaignCustomers();
        }
      } catch (err: any) {
        console.error('Update campaign error:', err);
        const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật chiến dịch';
        message.error(msg);
      } finally {
        setEditingSubmitting(false);
      }
    },
    [
      campaign?.id,
      fetchCampaignCustomers,
      fetchCampaignData,
      fixedFinalPriceCategories,
      fixedFinalPriceServices,
      router,
      slug,
    ]
  );

  return {
    editCampaignModalVisible,
    setEditCampaignModalVisible,
    editModalTab,
    setEditModalTab,
    editForm,
    editingSubmitting,
    handleOpenEditModal,
    handleEditSubmit,
  };
}
