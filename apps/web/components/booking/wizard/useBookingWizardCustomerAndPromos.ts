'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomerCampaignPromotionInfo, CustomerCampaignPromotionItem } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { resolveDefaultCampaignPromotion, resolveEligibleCampaignPromotions } from '../bookingCampaignScope';
import { getFixedPriceScopeLabel } from './bookingWizardHelpers';

interface UseBookingWizardCustomerAndPromosParams {
  open: boolean;
  initialCampaignPromotions?: CustomerCampaignPromotionInfo[];
  selectedService: SafeAny;
}

export function useBookingWizardCustomerAndPromos({
  open,
  initialCampaignPromotions,
  selectedService,
}: UseBookingWizardCustomerAndPromosParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customerList, setCustomerList] = useState<SafeAny[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SafeAny>(null);

  const [promotions, setPromotions] = useState<SafeAny[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<SafeAny>(null);
  const [referralPhone, setReferralPhone] = useState('');

  const [customerCampaignPromotions, setCustomerCampaignPromotions] = useState<CustomerCampaignPromotionInfo[]>([]);
  const [selectedCampaignPromotion, setSelectedCampaignPromotion] = useState<CustomerCampaignPromotionItem | null>(
    null
  );

  const [isNewLead, setIsNewLead] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isForeignCustomer, setIsForeignCustomer] = useState(false);

  // Auto detect foreign customer status from phone or selectedCustomer
  useEffect(() => {
    if (isNewLead && leadPhone) {
      const clean = leadPhone.replace(/[\s\-\(\)\.]/g, '').trim();
      if (clean) {
        const isVn = /^(0|\+?84)[35789]\d{8}$/.test(clean);
        setIsForeignCustomer(!isVn);
      }
    } else if (!isNewLead && selectedCustomer) {
      if (selectedCustomer.isForeign !== undefined) {
        setIsForeignCustomer(Boolean(selectedCustomer.isForeign));
      } else if (selectedCustomer.phone) {
        const clean = String(selectedCustomer.phone)
          .replace(/[\s\-\(\)\.]/g, '')
          .trim();
        const isVn = /^(0|\+?84)[35789]\d{8}$/.test(clean);
        setIsForeignCustomer(!isVn);
      }
    }
  }, [isNewLead, leadPhone, selectedCustomer]);

  const fetchCustomerCampaignPromotions = useCallback(
    async (customerId: number) => {
      if (!customerId) {
        setCustomerCampaignPromotions([]);
        setSelectedCampaignPromotion(null);
        return;
      }

      try {
        const data = await apiClient.campaigns.getCustomerActivePromotions(customerId);
        const campPromos = resolveEligibleCampaignPromotions(initialCampaignPromotions, data);
        setCustomerCampaignPromotions(campPromos);

        const defaultPromotion = resolveDefaultCampaignPromotion(campPromos);
        if (defaultPromotion) {
          setSelectedCampaignPromotion(defaultPromotion);
          setSelectedPromotion(null);
        } else {
          setSelectedCampaignPromotion(null);
        }
      } catch (err) {
        console.error('[BookingWizard] Failed to fetch customer campaign promotions:', err);
        const campPromos = resolveEligibleCampaignPromotions(initialCampaignPromotions, null);
        setCustomerCampaignPromotions(campPromos);
        const defaultPromotion = resolveDefaultCampaignPromotion(campPromos);
        if (defaultPromotion) {
          setSelectedCampaignPromotion(defaultPromotion);
          setSelectedPromotion(null);
        } else {
          setSelectedCampaignPromotion(null);
        }
      }
    },
    [initialCampaignPromotions]
  );

  // Hydrate membership-scoped context when it arrives asynchronously after drawer open
  useEffect(() => {
    if (!open || isNewLead || !initialCampaignPromotions || initialCampaignPromotions.length === 0) return;
    setCustomerCampaignPromotions((current) => (current.length > 0 ? current : initialCampaignPromotions));
  }, [initialCampaignPromotions, isNewLead, open]);

  useEffect(() => {
    const targetCustId = selectedCustomer?.legacyUserId || selectedCustomer?.id;
    if (open && selectedCustomer && targetCustId && !isNewLead) {
      fetchCustomerCampaignPromotions(targetCustId);
    } else {
      setCustomerCampaignPromotions(initialCampaignPromotions || []);
      setSelectedCampaignPromotion(null);
    }
  }, [selectedCustomer, isNewLead, open, initialCampaignPromotions, fetchCustomerCampaignPromotions]);

  useEffect(() => {
    if (
      selectedCampaignPromotion?.type === 'FIXED_FINAL_PRICE' &&
      (!selectedService ||
        !(selectedCampaignPromotion.eligibleServiceIds || []).map(Number).includes(Number(selectedService.id)))
    ) {
      setSelectedCampaignPromotion(null);
    }
  }, [selectedCampaignPromotion, selectedService]);

  const fetchPromotions = useCallback(async () => {
    try {
      const data = await apiClient.customers.getPromotions();
      setPromotions(data || []);
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch promotions:', err);
    }
  }, []);

  const handleSearchCustomers = useCallback(async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setCustomerList([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const data = await apiClient.customers.list({ search: val, limit: 10 });
      setCustomerList(data.data || []);
    } catch (err) {
      console.error('Search customers failed:', err);
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  const visibleCustomerCampaignPromotions = useMemo(() => {
    return customerCampaignPromotions
      .map((campaign) => ({
        ...campaign,
        promotions: (campaign.promotions || []).filter(
          (promotion) =>
            promotion.type !== 'FIXED_FINAL_PRICE' ||
            Boolean(
              selectedService && (promotion.eligibleServiceIds || []).map(Number).includes(Number(selectedService.id))
            )
        ),
      }))
      .filter((campaign) => campaign.promotions.length > 0);
  }, [customerCampaignPromotions, selectedService]);

  const fixedPriceEligibilityNotices = useMemo(() => {
    const selectedServiceId = Number(selectedService?.id);
    if (!Number.isSafeInteger(selectedServiceId) || selectedServiceId <= 0) return [];

    return customerCampaignPromotions.flatMap((campaign) =>
      (campaign.promotions || [])
        .filter((promotion) => promotion.type === 'FIXED_FINAL_PRICE')
        .map((promotion) => ({
          id: promotion.id,
          isEligible: (promotion.eligibleServiceIds || []).map(Number).includes(selectedServiceId),
          price: Math.round(Number(promotion.value || 0)),
          scopeLabel: getFixedPriceScopeLabel(promotion),
        }))
    );
  }, [customerCampaignPromotions, selectedService]);

  return {
    searchQuery,
    customerList,
    setCustomerList,
    searchingCustomers,
    selectedCustomer,
    setSelectedCustomer,
    promotions,
    selectedPromotion,
    setSelectedPromotion,
    referralPhone,
    setReferralPhone,
    customerCampaignPromotions,
    setCustomerCampaignPromotions,
    selectedCampaignPromotion,
    setSelectedCampaignPromotion,
    isNewLead,
    setIsNewLead,
    leadName,
    setLeadName,
    leadPhone,
    setLeadPhone,
    isForeignCustomer,
    setIsForeignCustomer,
    fetchPromotions,
    handleSearchCustomers,
    visibleCustomerCampaignPromotions,
    fixedPriceEligibilityNotices,
  };
}
