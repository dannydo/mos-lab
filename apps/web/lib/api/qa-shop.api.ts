import type {
  QaActionTicket,
  QaChecklistTemplate,
  QaComplianceStats,
  QaDailyAudit,
  QaImportSheetInput,
  QaSaveAuditInput,
  QaShopBranchCode,
} from '@mos-lab/shared';

import { api } from './base';

export const qaShopApi = {
  qaShop: {
    getTemplates: async (params?: { branchCode?: QaShopBranchCode }): Promise<QaChecklistTemplate[]> => {
      const response = await api.get('/qa-shop/templates', { params });
      return response.data;
    },
    getTemplateByIdOrCode: async (idOrCode: string): Promise<QaChecklistTemplate> => {
      const response = await api.get(`/qa-shop/templates/${idOrCode}`);
      return response.data;
    },
    importSheetTemplate: async (input: QaImportSheetInput): Promise<QaChecklistTemplate> => {
      const response = await api.post('/qa-shop/templates/import-sheet', input);
      return response.data;
    },
    updateTemplate: async (branchCode: string, sections: SafeAny[]): Promise<QaChecklistTemplate> => {
      const response = await api.put(`/qa-shop/templates/${branchCode}`, { sections });
      return response.data;
    },
    cloneTemplate: async (data: {
      sourceBranchCode: string;
      targetBranchCode: string;
      overwrite?: boolean;
    }): Promise<QaChecklistTemplate> => {
      const response = await api.post('/qa-shop/templates/clone', data);
      return response.data;
    },
    getAudits: async (params?: {
      branchCode?: string;
      dateFrom?: string;
      dateTo?: string;
      includeDeleted?: boolean;
      onlyDeleted?: boolean;
    }): Promise<QaDailyAudit[]> => {
      const response = await api.get('/qa-shop/audits', { params });
      return response.data;
    },
    getAuditById: async (id: string): Promise<QaDailyAudit> => {
      const response = await api.get(`/qa-shop/audits/${id}`);
      return response.data;
    },
    deleteAudit: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await api.delete(`/qa-shop/audits/${id}`);
      return response.data;
    },
    restoreAudit: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/qa-shop/audits/${id}/restore`);
      return response.data;
    },
    saveAudit: async (input: QaSaveAuditInput): Promise<QaDailyAudit> => {
      const response = await api.post('/qa-shop/audits', input);
      return response.data;
    },
    getTickets: async (params?: { branchCode?: string; status?: string }): Promise<QaActionTicket[]> => {
      const response = await api.get('/qa-shop/tickets', { params });
      return response.data;
    },
    updateTicket: async (
      ticketId: string,
      updates: {
        status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';
        resolutionNotes?: string;
        resolutionPhotoUrls?: string[];
        resolvedByStaffName?: string;
      }
    ): Promise<QaActionTicket> => {
      const response = await api.patch(`/qa-shop/tickets/${ticketId}`, updates);
      return response.data;
    },
    getAnalytics: async (): Promise<QaComplianceStats> => {
      const response = await api.get('/qa-shop/analytics');
      return response.data;
    },
  },
};
