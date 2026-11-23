import type { FastifyInstance } from 'fastify';
import type {
  CashAccount,
  CashAccountBalanceAdjustment,
  CashFlowEntry,
  CashFlowEntryListQuery,
  CashFlowForecastResponse,
} from '@mos-lab/shared';
import {
  batchUpdateCashAccountBalances,
  createCashFlowEntry,
  deleteCashFlowEntry,
  getCashAccounts,
  getCashFlowEntries,
  updateCashAccount,
  updateCashFlowEntry,
  type CreateCashFlowEntryInput,
  type UpdateCashFlowEntryInput,
} from './service/cash-flow-entries.service.js';
import { formatCashFlowForecastCsv, getCashFlowForecast } from './service/cash-flow-forecast.service.js';

export class CashFlowService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Lấy dữ liệu dự báo dòng tiền theo kỳ và chi nhánh
   */
  getForecast(params: {
    startDate?: string;
    endDate?: string;
    storeId?: number;
    accountId?: number;
  }): Promise<CashFlowForecastResponse> {
    return getCashFlowForecast(this.fastify, params);
  }

  /**
   * Lấy danh sách các khoản thu chi có phân trang và bộ lọc
   */
  getEntries(query: CashFlowEntryListQuery) {
    return getCashFlowEntries(this.fastify, query);
  }

  /**
   * Tạo khoản thu / chi mới (Có VAT & Mức độ ưu tiên)
   */
  createEntry(data: CreateCashFlowEntryInput, staff: { id: number; displayName: string }): Promise<CashFlowEntry> {
    return createCashFlowEntry(this.fastify, data, staff);
  }

  /**
   * Cập nhật khoản thu / chi
   */
  updateEntry(
    id: number,
    data: UpdateCashFlowEntryInput,
    staff: { id: number; displayName: string }
  ): Promise<CashFlowEntry> {
    return updateCashFlowEntry(this.fastify, id, data, staff);
  }

  /**
   * Xóa / Hủy khoản thu chi
   */
  deleteEntry(id: number, staff: { id: number; displayName: string }): Promise<void> {
    return deleteCashFlowEntry(this.fastify, id, staff);
  }

  /**
   * Lấy danh sách tài khoản tiền mặt / ngân hàng
   */
  getAccounts(): Promise<CashAccount[]> {
    return getCashAccounts(this.fastify);
  }

  /**
   * Cập nhật số dư hoặc ngưỡng an toàn tài khoản
   */
  updateAccount(
    id: number,
    data: {
      initialBalance?: number;
      currentBalance?: number;
      minSafetyThreshold?: number;
      notes?: string;
    }
  ): Promise<CashAccount> {
    return updateCashAccount(this.fastify, id, data);
  }

  /**
   * Cập nhật số dư hàng loạt cho nhiều tài khoản quỹ
   */
  batchUpdateBalances(items: CashAccountBalanceAdjustment[]): Promise<CashAccount[]> {
    return batchUpdateCashAccountBalances(this.fastify, items);
  }

  /**
   * Xuất báo cáo CSV dự báo dòng tiền
   */
  async exportCsv(params: { startDate?: string; endDate?: string; storeId?: number }): Promise<string> {
    const forecast = await this.getForecast(params);
    return formatCashFlowForecastCsv(forecast);
  }
}
