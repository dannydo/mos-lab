import type {
  AcademyWorkshopAgendaTemplate,
  AcademyWorkshopClonePreview,
  AcademyWorkshopDesignItem,
  AcademyWorkshopDesignItemImage,
  AcademyWorkshopDesignTemplate,
  AcademyWorkshopDetail,
  AcademyWorkshopEquipmentPackage,
  AcademyWorkshopEquipmentPackageImage,
  AcademyWorkshopEquipmentTemplate,
  AcademyWorkshopMenuItem,
  AcademyWorkshopMenuTemplate,
  AcademyWorkshopPublicMediaUploadResult,
  AcademyWorkshopResourcesResponse,
  AcademyWorkshopZaloTemplate,
  CloneAcademyWorkshopRequest,
  CreateAcademyWorkshopAgendaTemplateRequest,
  CreateAcademyWorkshopDesignItemImageRequest,
  CreateAcademyWorkshopDesignItemRequest,
  CreateAcademyWorkshopEquipmentPackageImageRequest,
  CreateAcademyWorkshopEquipmentPackageRequest,
  CreateAcademyWorkshopMenuItemRequest,
  CreateAcademyWorkshopPublicMediaUploadRequest,
  CreateAcademyWorkshopRequest,
  ListAcademyWorkshopAgendaTemplatesParams,
  ListAcademyWorkshopAgendaTemplatesResponse,
  ListAcademyWorkshopDesignTemplatesParams,
  ListAcademyWorkshopDesignTemplatesResponse,
  ListAcademyWorkshopEquipmentTemplatesParams,
  ListAcademyWorkshopEquipmentTemplatesResponse,
  ListAcademyWorkshopMenuTemplatesParams,
  ListAcademyWorkshopMenuTemplatesResponse,
  ListAcademyWorkshopsParams,
  ListAcademyWorkshopsResponse,
  SaveAcademyWorkshopDesignTemplateRequest,
  SaveAcademyWorkshopEquipmentTemplateRequest,
  SaveAcademyWorkshopMenuTemplateRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  UpdateAcademyWorkshopAgendaTemplateRequest,
  UpdateAcademyWorkshopDesignItemImageRequest,
  UpdateAcademyWorkshopDesignItemRequest,
  UpdateAcademyWorkshopDesignTemplateRequest,
  UpdateAcademyWorkshopEquipmentPackageImageRequest,
  UpdateAcademyWorkshopEquipmentPackageRequest,
  UpdateAcademyWorkshopEquipmentTemplateRequest,
  UpdateAcademyWorkshopMenuItemRequest,
  UpdateAcademyWorkshopRequest,
} from '@mos-lab/shared';

import { api, dedupeApiGet, invalidateAcademySalesReadCache } from '../base';

export const academyWorkshopSetupApi = {
  listAgendaTemplates: async (
    params: ListAcademyWorkshopAgendaTemplatesParams = {}
  ): Promise<ListAcademyWorkshopAgendaTemplatesResponse> => {
    const response = await api.get<ListAcademyWorkshopAgendaTemplatesResponse>(
      '/academy-sales/workshop-agenda-templates',
      { params }
    );
    return response.data;
  },
  createAgendaTemplate: async (
    dto: CreateAcademyWorkshopAgendaTemplateRequest
  ): Promise<AcademyWorkshopAgendaTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopAgendaTemplate }>(
      '/academy-sales/workshop-agenda-templates',
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  updateAgendaTemplate: async (
    templateId: number,
    dto: UpdateAcademyWorkshopAgendaTemplateRequest
  ): Promise<AcademyWorkshopAgendaTemplate> => {
    const response = await api.put<{ data: AcademyWorkshopAgendaTemplate }>(
      `/academy-sales/workshop-agenda-templates/${templateId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteAgendaTemplate: async (templateId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshop-agenda-templates/${templateId}`);
    invalidateAcademySalesReadCache();
  },
  listMenuTemplates: async (
    params: ListAcademyWorkshopMenuTemplatesParams = {}
  ): Promise<ListAcademyWorkshopMenuTemplatesResponse> => {
    const response = await api.get<ListAcademyWorkshopMenuTemplatesResponse>('/academy-sales/workshop-menu-templates', {
      params,
    });
    return response.data;
  },
  deleteMenuTemplate: async (templateId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshop-menu-templates/${templateId}`);
    invalidateAcademySalesReadCache();
  },
  listEquipmentTemplates: async (
    params: ListAcademyWorkshopEquipmentTemplatesParams = {}
  ): Promise<ListAcademyWorkshopEquipmentTemplatesResponse> => {
    const response = await api.get<ListAcademyWorkshopEquipmentTemplatesResponse>(
      '/academy-sales/workshop-equipment-templates',
      { params }
    );
    return response.data;
  },
  updateEquipmentTemplate: async (
    templateId: number,
    dto: UpdateAcademyWorkshopEquipmentTemplateRequest
  ): Promise<AcademyWorkshopEquipmentTemplate> => {
    const response = await api.put<{ data: AcademyWorkshopEquipmentTemplate }>(
      `/academy-sales/workshop-equipment-templates/${templateId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteEquipmentTemplate: async (templateId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshop-equipment-templates/${templateId}`);
    invalidateAcademySalesReadCache();
  },
  listDesignTemplates: async (
    params: ListAcademyWorkshopDesignTemplatesParams = {}
  ): Promise<ListAcademyWorkshopDesignTemplatesResponse> => {
    const response = await api.get<ListAcademyWorkshopDesignTemplatesResponse>(
      '/academy-sales/workshop-design-templates',
      { params }
    );
    return response.data;
  },
  updateDesignTemplate: async (
    templateId: number,
    dto: UpdateAcademyWorkshopDesignTemplateRequest
  ): Promise<AcademyWorkshopDesignTemplate> => {
    const response = await api.put<{ data: AcademyWorkshopDesignTemplate }>(
      `/academy-sales/workshop-design-templates/${templateId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteDesignTemplate: async (templateId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshop-design-templates/${templateId}`);
    invalidateAcademySalesReadCache();
  },
  listZaloTemplates: async (): Promise<AcademyWorkshopZaloTemplate[]> => {
    const response = await api.get<AcademyWorkshopZaloTemplate[]>('/academy-sales/workshop-zalo-templates');
    return response.data;
  },
  saveZaloTemplates: async (templates: AcademyWorkshopZaloTemplate[]): Promise<AcademyWorkshopZaloTemplate[]> => {
    const response = await api.put<{ success: boolean; data: AcademyWorkshopZaloTemplate[] }>(
      '/academy-sales/workshop-zalo-templates',
      { templates }
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  list: async (params?: ListAcademyWorkshopsParams): Promise<ListAcademyWorkshopsResponse> => {
    return dedupeApiGet<ListAcademyWorkshopsResponse>(
      '/academy-sales/workshops',
      params as Record<string, unknown> | undefined,
      500
    );
  },
  getBySlug: async (slug: string): Promise<AcademyWorkshopDetail> => {
    const response = await api.get<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/slug/${encodeURIComponent(slug)}`
    );
    return response.data.data;
  },
  create: async (dto: CreateAcademyWorkshopRequest): Promise<AcademyWorkshopDetail> => {
    const response = await api.post<{ data: AcademyWorkshopDetail }>('/academy-sales/workshops', dto);
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  getClonePreview: async (workshopId: number): Promise<AcademyWorkshopClonePreview> => {
    const response = await api.get<{ data: AcademyWorkshopClonePreview }>(
      `/academy-sales/workshops/${workshopId}/clone-preview`
    );
    return response.data.data;
  },
  clone: async (workshopId: number, dto: CloneAcademyWorkshopRequest): Promise<AcademyWorkshopDetail> => {
    const response = await api.post<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/clone`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  update: async (workshopId: number, dto: UpdateAcademyWorkshopRequest): Promise<AcademyWorkshopDetail> => {
    const response = await api.put<{ data: AcademyWorkshopDetail }>(`/academy-sales/workshops/${workshopId}`, dto);
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  uploadHeroImage: async (
    workshopId: number,
    dto: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
    const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
      `/academy-sales/workshops/${workshopId}/hero-image/upload`,
      dto
    );
    return response.data.data;
  },
  uploadQuizImage: async (
    workshopId: number,
    dto: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
    const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
      `/academy-sales/workshops/${workshopId}/quiz-images/upload`,
      dto
    );
    return response.data.data;
  },
  createMenuItem: async (
    workshopId: number,
    dto: CreateAcademyWorkshopMenuItemRequest
  ): Promise<AcademyWorkshopMenuItem> => {
    const response = await api.post<{ data: AcademyWorkshopMenuItem }>(
      `/academy-sales/workshops/${workshopId}/menu-items`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  uploadMenuImage: async (
    workshopId: number,
    dto: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
    const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
      `/academy-sales/workshops/${workshopId}/menu-items/upload-image`,
      dto
    );
    return response.data.data;
  },
  setMenuAgendaItem: async (
    workshopId: number,
    dto: SetAcademyWorkshopAgendaResourceRequest
  ): Promise<AcademyWorkshopDetail> => {
    const response = await api.put<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/menu-service`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  setEquipmentAgendaItem: async (
    workshopId: number,
    dto: SetAcademyWorkshopAgendaResourceRequest
  ): Promise<AcademyWorkshopDetail> => {
    const response = await api.put<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/equipment-service`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  setDesignAgendaItem: async (
    workshopId: number,
    dto: SetAcademyWorkshopAgendaResourceRequest
  ): Promise<AcademyWorkshopDetail> => {
    const response = await api.put<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/design-service`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  updateMenuItem: async (
    workshopId: number,
    menuItemId: number,
    dto: UpdateAcademyWorkshopMenuItemRequest
  ): Promise<AcademyWorkshopMenuItem> => {
    const response = await api.put<{ data: AcademyWorkshopMenuItem }>(
      `/academy-sales/workshops/${workshopId}/menu-items/${menuItemId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteMenuItem: async (workshopId: number, menuItemId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshops/${workshopId}/menu-items/${menuItemId}`);
    invalidateAcademySalesReadCache();
  },
  saveMenuAsTemplate: async (
    workshopId: number,
    dto: SaveAcademyWorkshopMenuTemplateRequest
  ): Promise<AcademyWorkshopMenuTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopMenuTemplate }>(
      `/academy-sales/workshops/${workshopId}/menu-templates`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  refreshMenuTemplateFromWorkshop: async (
    workshopId: number,
    templateId: number
  ): Promise<AcademyWorkshopMenuTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopMenuTemplate }>(
      `/academy-sales/workshops/${workshopId}/menu-templates/${templateId}/refresh`
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  applyMenuTemplate: async (workshopId: number, templateId: number): Promise<AcademyWorkshopDetail> => {
    const response = await api.post<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/menu-templates/${templateId}/apply`
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  createEquipmentPackage: async (
    workshopId: number,
    dto: CreateAcademyWorkshopEquipmentPackageRequest
  ): Promise<AcademyWorkshopEquipmentPackage> => {
    const response = await api.post<{ data: AcademyWorkshopEquipmentPackage }>(
      `/academy-sales/workshops/${workshopId}/equipment-packages`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  uploadEquipmentImage: async (
    workshopId: number,
    dto: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
    const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
      `/academy-sales/workshops/${workshopId}/equipment-images/upload`,
      dto
    );
    return response.data.data;
  },
  updateEquipmentPackage: async (
    workshopId: number,
    equipmentPackageId: number,
    dto: UpdateAcademyWorkshopEquipmentPackageRequest
  ): Promise<AcademyWorkshopEquipmentPackage> => {
    const response = await api.put<{ data: AcademyWorkshopEquipmentPackage }>(
      `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteEquipmentPackage: async (workshopId: number, equipmentPackageId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}`);
    invalidateAcademySalesReadCache();
  },
  saveEquipmentAsTemplate: async (
    workshopId: number,
    dto: SaveAcademyWorkshopEquipmentTemplateRequest
  ): Promise<AcademyWorkshopEquipmentTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopEquipmentTemplate }>(
      `/academy-sales/workshops/${workshopId}/equipment-templates`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  refreshEquipmentTemplateFromWorkshop: async (
    workshopId: number,
    templateId: number
  ): Promise<AcademyWorkshopEquipmentTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopEquipmentTemplate }>(
      `/academy-sales/workshops/${workshopId}/equipment-templates/${templateId}/refresh`
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  applyEquipmentTemplate: async (workshopId: number, templateId: number): Promise<AcademyWorkshopDetail> => {
    const response = await api.post<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/equipment-templates/${templateId}/apply`
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  createEquipmentPackageImage: async (
    workshopId: number,
    equipmentPackageId: number,
    dto: CreateAcademyWorkshopEquipmentPackageImageRequest
  ): Promise<AcademyWorkshopEquipmentPackageImage> => {
    const response = await api.post<{ data: AcademyWorkshopEquipmentPackageImage }>(
      `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}/images`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  updateEquipmentPackageImage: async (
    workshopId: number,
    equipmentPackageId: number,
    imageId: number,
    dto: UpdateAcademyWorkshopEquipmentPackageImageRequest
  ): Promise<AcademyWorkshopEquipmentPackageImage> => {
    const response = await api.put<{ data: AcademyWorkshopEquipmentPackageImage }>(
      `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}/images/${imageId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteEquipmentPackageImage: async (
    workshopId: number,
    equipmentPackageId: number,
    imageId: number
  ): Promise<void> => {
    await api.delete(
      `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}/images/${imageId}`
    );
    invalidateAcademySalesReadCache();
  },
  createDesignItem: async (
    workshopId: number,
    dto: CreateAcademyWorkshopDesignItemRequest
  ): Promise<AcademyWorkshopDesignItem> => {
    const response = await api.post<{ data: AcademyWorkshopDesignItem }>(
      `/academy-sales/workshops/${workshopId}/designs`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  uploadDesignImage: async (
    workshopId: number,
    dto: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
    const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
      `/academy-sales/workshops/${workshopId}/design-images/upload`,
      dto
    );
    return response.data.data;
  },
  updateDesignItem: async (
    workshopId: number,
    designId: number,
    dto: UpdateAcademyWorkshopDesignItemRequest
  ): Promise<AcademyWorkshopDesignItem> => {
    const response = await api.put<{ data: AcademyWorkshopDesignItem }>(
      `/academy-sales/workshops/${workshopId}/designs/${designId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteDesignItem: async (workshopId: number, designId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshops/${workshopId}/designs/${designId}`);
    invalidateAcademySalesReadCache();
  },
  saveDesignAsTemplate: async (
    workshopId: number,
    dto: SaveAcademyWorkshopDesignTemplateRequest
  ): Promise<AcademyWorkshopDesignTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopDesignTemplate }>(
      `/academy-sales/workshops/${workshopId}/design-templates`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  refreshDesignTemplateFromWorkshop: async (
    workshopId: number,
    templateId: number
  ): Promise<AcademyWorkshopDesignTemplate> => {
    const response = await api.post<{ data: AcademyWorkshopDesignTemplate }>(
      `/academy-sales/workshops/${workshopId}/design-templates/${templateId}/refresh`
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  applyDesignTemplate: async (workshopId: number, templateId: number): Promise<AcademyWorkshopDetail> => {
    const response = await api.post<{ data: AcademyWorkshopDetail }>(
      `/academy-sales/workshops/${workshopId}/design-templates/${templateId}/apply`
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  createDesignItemImage: async (
    workshopId: number,
    designId: number,
    dto: CreateAcademyWorkshopDesignItemImageRequest
  ): Promise<AcademyWorkshopDesignItemImage> => {
    const response = await api.post<{ data: AcademyWorkshopDesignItemImage }>(
      `/academy-sales/workshops/${workshopId}/designs/${designId}/images`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  updateDesignItemImage: async (
    workshopId: number,
    designId: number,
    imageId: number,
    dto: UpdateAcademyWorkshopDesignItemImageRequest
  ): Promise<AcademyWorkshopDesignItemImage> => {
    const response = await api.put<{ data: AcademyWorkshopDesignItemImage }>(
      `/academy-sales/workshops/${workshopId}/designs/${designId}/images/${imageId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data.data;
  },
  deleteDesignItemImage: async (workshopId: number, designId: number, imageId: number): Promise<void> => {
    await api.delete(`/academy-sales/workshops/${workshopId}/designs/${designId}/images/${imageId}`);
    invalidateAcademySalesReadCache();
  },
  resources: async (): Promise<AcademyWorkshopResourcesResponse> => {
    const response = await api.get<{ data: AcademyWorkshopResourcesResponse }>('/academy-sales/workshops/resources');
    return response.data.data;
  },
};
