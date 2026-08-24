import { useEffect, useState } from 'react';
import { CustomerServiceFilterCategory, CustomerServiceFilterOption } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

/** Loads the catalog choices used only by customer-segmentation filters. */
export function useCustomerServiceFilterOptions() {
  const [serviceFilterOptions, setServiceFilterOptions] = useState<CustomerServiceFilterOption[]>([]);
  const [serviceFilterCategories, setServiceFilterCategories] = useState<CustomerServiceFilterCategory[]>([]);
  const [serviceFilterOptionsLoading, setServiceFilterOptionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await apiClient.customers.getServiceFilterOptions();
        if (!cancelled) {
          setServiceFilterOptions(response.services);
          setServiceFilterCategories(response.categories);
        }
      } catch (error) {
        console.error('Failed to load customer service filter options:', error);
        if (!cancelled) {
          setServiceFilterOptions([]);
          setServiceFilterCategories([]);
        }
      } finally {
        if (!cancelled) setServiceFilterOptionsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { serviceFilterOptions, serviceFilterCategories, serviceFilterOptionsLoading };
}
