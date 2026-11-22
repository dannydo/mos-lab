import type { FastifyInstance } from 'fastify';
import type {
  BananaTransactionResponse,
  CareerPeriod,
  CareerProgressionConfig,
  CareerRole,
  CvPlusRewardSnapshot,
  CvPlusSimulationSummaryResponse,
  SafeAny,
  StaffCareerStatus,
} from '@mos-lab/shared';
import {
  activateCareerTrialGate,
  demoteCareerStaff,
  promoteCareerStaff,
  setCareerStaffRole,
  switchCareerToSpecialistPath,
} from './career-service/career-actions.service.js';
import { getStaffBananaTransactions } from './career-service/career-banana-transactions.service.js';
import {
  getCareerConfig,
  invalidateCareerConfigCache,
  updateCareerConfig,
} from './career-service/career-config.service.js';
import { calculateCvPlusRewardsForStaff } from './career-service/career-cvl-rewards.service.js';
import { getAllCvPlusSimulations } from './career-service/career-cvl-simulation.service.js';
import {
  buildCheckoutAttributionSqlCondition,
  type CvRewardCalculationMode,
  resolveBranchInfo,
  resolveCareerPeriodDates,
  resolveCvTipSplitFromRows,
} from './career-service/career-helpers.js';
import { getStaffProgression } from './career-service/career-progression.service.js';
import { listCareerStaff } from './career-service/career-staff-list.service.js';

export {
  buildCheckoutAttributionSqlCondition,
  type CvRewardCalculationMode,
  resolveBranchInfo,
  resolveCareerPeriodDates,
  resolveCvTipSplitFromRows,
};

export class CareerProgressionService {
  /**
   * Lấy cấu hình lộ trình thăng tiến hiện hành từ DB.
   * Có cơ chế In-memory cache 60s và tự động fallback về DEFAULT nếu DB chưa có bản ghi.
   */
  static getConfig(fastify: FastifyInstance): Promise<CareerProgressionConfig> {
    return getCareerConfig(fastify);
  }

  /**
   * Cập nhật cấu hình mới vào DB và xóa cache ngay lập tức.
   */
  static updateConfig(
    fastify: FastifyInstance,
    newConfig: Partial<CareerProgressionConfig>,
    updatedBy: string
  ): Promise<CareerProgressionConfig> {
    return updateCareerConfig(fastify, newConfig, updatedBy);
  }

  /**
   * Xóa bộ nhớ đệm để ép nạp mới dữ liệu từ Production
   */
  static invalidateCache(): void {
    invalidateCareerConfigCache();
  }

  /**
   * Danh sách toàn bộ nhân viên tham gia lộ trình kèm chỉ số thực tế từ DB
   */
  static listStaff(
    fastify: FastifyInstance,
    query?: { role?: string; search?: string; period?: CareerPeriod }
  ): Promise<SafeAny[]> {
    return listCareerStaff(fastify, query);
  }

  /**
   * Tính toán chỉ số thực tế và đánh giá tiến trình thăng cấp cho 1 nhân viên
   */
  static getStaffProgression(
    fastify: FastifyInstance,
    staffId: number,
    forceRefresh = false,
    requestedTargetRole?: CareerRole,
    period?: CareerPeriod
  ): Promise<StaffCareerStatus> {
    return getStaffProgression(fastify, staffId, forceRefresh, requestedTargetRole, period);
  }

  /**
   * Kích hoạt Ải Trùm Cuối (Bắt đầu 30 ngày thử thách tự tư vấn chốt combo)
   */
  static activateTrialGate(fastify: FastifyInstance, staffId: number, actorId: number): Promise<StaffCareerStatus> {
    return activateCareerTrialGate(fastify, staffId, actorId);
  }

  /**
   * Xác nhận thăng cấp chính thức
   */
  static promoteStaff(
    fastify: FastifyInstance,
    staffId: number,
    newRole: CareerRole,
    actorId: number,
    force = false
  ): Promise<StaffCareerStatus> {
    return promoteCareerStaff(fastify, staffId, newRole, actorId, force);
  }

  /**
   * Quản lý trực tiếp thiết lập chức danh cho nhân sự (Thăng cấp / Hạ cấp tùy ý)
   */
  static setStaffRole(
    fastify: FastifyInstance,
    staffId: number,
    newRole: CareerRole,
    actorId: number,
    reason?: string
  ): Promise<StaffCareerStatus> {
    return setCareerStaffRole(fastify, staffId, newRole, actorId, reason);
  }

  /**
   * Hạ cấp nhân sự
   */
  static demoteStaff(
    fastify: FastifyInstance,
    staffId: number,
    newRole: CareerRole,
    actorId: number,
    reason?: string
  ): Promise<StaffCareerStatus> {
    return demoteCareerStaff(fastify, staffId, newRole, actorId, reason);
  }

  /**
   * Chuyển sang nhánh Chuyên gia Kỹ thuật Bậc Cao (Master Technician)
   */
  static switchToSpecialistPath(
    fastify: FastifyInstance,
    staffId: number,
    actorId: number
  ): Promise<StaffCareerStatus> {
    return switchCareerToSpecialistPath(fastify, staffId, actorId);
  }

  /**
   * Lấy lịch sử biến động và sao kê chi tiết Chuối của nhân sự
   */
  static getBananaTransactions(
    fastify: FastifyInstance,
    staffId: number,
    query?: { category?: string; timeRange?: string; period?: CareerPeriod; search?: string; limit?: number }
  ): Promise<BananaTransactionResponse> {
    return getStaffBananaTransactions(fastify, staffId, query);
  }

  /**
   * Tính toán chi tiết quyền lợi CVL (lương giờ tăng, 90% tip, thưởng combo bậc thang)
   * và áp dụng chế tài ngưỡng 20% NOT COMBO LIVE theo Kinh Thánh mOS.
   */
  static calculateCvPlusRewardsForStaff(
    fastify: FastifyInstance,
    staffId: number,
    targetMonthOrRange?: string | { startStr: string; endStr: string },
    persist = false,
    options?: { mode?: CvRewardCalculationMode }
  ): Promise<CvPlusRewardSnapshot> {
    return calculateCvPlusRewardsForStaff(fastify, staffId, targetMonthOrRange, persist, options);
  }

  /**
   * Tổng hợp mô phỏng toàn salon cho tất cả Chuyên Viên trong tháng
   */
  static getAllCvPlusSimulations(fastify: FastifyInstance, month?: string): Promise<CvPlusSimulationSummaryResponse> {
    return getAllCvPlusSimulations(fastify, month);
  }
}
