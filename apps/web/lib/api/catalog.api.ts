import type {
  BranchFilterParams,
  BranchStats,
  CatalogDetailResponse,
  CatalogItemHistoryParams,
  CatalogItemHistoryResponse,
  CatalogListParams,
  CatalogListResponse,
  CatalogProduct,
  CatalogReportSummary,
  CatalogReportSummaryParams,
  CatalogService,
  CatalogServicePrice,
  ComboLiveParams,
  ComboLiveResponse,
  CreateBranchDto,
  CreateProductInput,
  CreateServiceInput,
  CreateServicePriceInput,
  CrmBranch,
  LashBenchmarkSeedResult,
  LashTypeBenchmark,
  ServiceLiveComboCheckResult,
  UpdateBranchDto,
  UpdateProductInput,
  UpdateServiceInput,
} from '@mos-lab/shared';

import { api } from './base';

export const catalogApi = {
  catalog: {
    listServices: async (params: CatalogListParams): Promise<CatalogListResponse<CatalogService>> => {
      const response = await api.get('/catalog/services', { params });
      return response.data;
    },
    getService: async (id: number): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.get(`/catalog/services/${id}`);
      return response.data;
    },
    createService: async (data: CreateServiceInput): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.post('/catalog/services', data);
      return response.data;
    },
    updateService: async (
      id: number,
      data: UpdateServiceInput & { confirm?: boolean }
    ): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.put(`/catalog/services/${id}`, data);
      return response.data;
    },
    deleteService: async (id: number, confirm?: boolean): Promise<{ success: boolean }> => {
      const response = await api.delete(`/catalog/services/${id}`, { data: { confirm } });
      return response.data;
    },
    restoreService: async (id: number): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.post(`/catalog/services/${id}/restore`);
      return response.data;
    },
    checkServiceLiveCombos: async (id: number): Promise<{ success: boolean; data: ServiceLiveComboCheckResult }> => {
      const response = await api.get(`/catalog/services/${id}/live-combo-check`);
      return response.data;
    },
    reorderServices: async (items: { id: number; position: number }[]): Promise<{ success: boolean }> => {
      const response = await api.post('/catalog/services/reorder', { items });
      return response.data;
    },
    bulkStatusServices: async (
      ids: number[],
      isDisabled: boolean,
      confirm?: boolean
    ): Promise<{ success: boolean }> => {
      const response = await api.post('/catalog/services/bulk-status', { ids, isDisabled, confirm });
      return response.data;
    },
    listCombos: async (params: CatalogListParams): Promise<CatalogListResponse<CatalogServicePrice>> => {
      const response = await api.get('/catalog/combos', { params });
      return response.data;
    },
    getCombo: async (id: number): Promise<CatalogDetailResponse<CatalogServicePrice>> => {
      const response = await api.get(`/catalog/combos/${id}`);
      return response.data;
    },
    createCombo: async (data: CreateServicePriceInput): Promise<CatalogDetailResponse<CatalogServicePrice>> => {
      const response = await api.post('/catalog/combos', data);
      return response.data;
    },
    updateCombo: async (
      id: number,
      data: Partial<CreateServicePriceInput>
    ): Promise<CatalogDetailResponse<CatalogServicePrice>> => {
      const response = await api.put(`/catalog/combos/${id}`, data);
      return response.data;
    },
    deleteCombo: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/catalog/combos/${id}`);
      return response.data;
    },
    listProducts: async (params: CatalogListParams): Promise<CatalogListResponse<CatalogProduct>> => {
      const response = await api.get('/catalog/products', { params });
      return response.data;
    },
    getProduct: async (id: number): Promise<CatalogDetailResponse<CatalogProduct>> => {
      const response = await api.get(`/catalog/products/${id}`);
      return response.data;
    },
    createProduct: async (data: CreateProductInput): Promise<CatalogDetailResponse<CatalogProduct>> => {
      const response = await api.post('/catalog/products', data);
      return response.data;
    },
    updateProduct: async (id: number, data: UpdateProductInput): Promise<CatalogDetailResponse<CatalogProduct>> => {
      const response = await api.put(`/catalog/products/${id}`, data);
      return response.data;
    },
    deleteProduct: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/catalog/products/${id}`);
      return response.data;
    },
    getGroups: async (): Promise<{ success: boolean; data: string[] }> => {
      const response = await api.get('/catalog/groups');
      return response.data;
    },
    getTypes: async (): Promise<{ success: boolean; data: string[] }> => {
      const response = await api.get('/catalog/types');
      return response.data;
    },
    statsSummary: async (
      params?: CatalogReportSummaryParams
    ): Promise<{ success: boolean; data: CatalogReportSummary }> => {
      const response = await api.get('/catalog/stats-summary', { params });
      return response.data;
    },
    itemHistory: async (params: CatalogItemHistoryParams): Promise<CatalogItemHistoryResponse> => {
      const response = await api.get('/catalog/item-history', { params });
      return response.data;
    },
    getComboLive: async (params?: ComboLiveParams): Promise<ComboLiveResponse> => {
      const response = await api.get('/catalog/combo-live', { params });
      return response.data;
    },
    lashBenchmarks: {
      list: async (): Promise<{ success: boolean; data: LashTypeBenchmark[] }> => {
        const response = await api.get('/catalog/lash-benchmarks');
        return response.data;
      },
      seed: async (): Promise<{ success: boolean; message: string; data: LashBenchmarkSeedResult }> => {
        const response = await api.post('/catalog/lash-benchmarks/seed');
        return response.data;
      },
      update: async (
        id: number,
        data: { benchmarkMinutes?: number; minMinutes?: number; maxMinutes?: number }
      ): Promise<{ success: boolean; data: LashTypeBenchmark }> => {
        const response = await api.put(`/catalog/lash-benchmarks/${id}`, data);
        return response.data;
      },
    },
    branches: {
      list: async (params?: BranchFilterParams): Promise<CatalogListResponse<CrmBranch>> => {
        const response = await api.get('/catalog/branches', { params });
        return response.data;
      },
      getStats: async (): Promise<{ success: boolean; data: BranchStats }> => {
        const response = await api.get('/catalog/branches/stats');
        return response.data;
      },
      get: async (id: number): Promise<{ success: boolean; data: CrmBranch }> => {
        const response = await api.get(`/catalog/branches/${id}`);
        return response.data;
      },
      create: async (data: CreateBranchDto): Promise<{ success: boolean; data: CrmBranch; message: string }> => {
        const response = await api.post('/catalog/branches', data);
        return response.data;
      },
      update: async (
        id: number,
        data: UpdateBranchDto
      ): Promise<{ success: boolean; data: CrmBranch; message: string }> => {
        const response = await api.put(`/catalog/branches/${id}`, data);
        return response.data;
      },
      toggleActive: async (id: number): Promise<{ success: boolean; data: CrmBranch; message: string }> => {
        const response = await api.patch(`/catalog/branches/${id}/toggle-active`);
        return response.data;
      },
    },
  },
};
