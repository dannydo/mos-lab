import {
  invalidateCache,
  invalidateCampaignCache,
  registerCacheInvalidator,
} from './campaign-shared-pool-service/campaign-shared-pool-cache.js';
import { mapCallLogToSharedPool } from './campaign-shared-pool-service/campaign-shared-pool-helpers.js';
import {
  maintainSharedPool,
  maintainSharedPoolThrottled,
  startMaintenanceWorker,
} from './campaign-shared-pool-service/campaign-shared-pool-maintenance.service.js';
import { getCampaignStaffPerformance } from './campaign-shared-pool-service/campaign-shared-pool-performance.service.js';
import { getSharedPoolOverview } from './campaign-shared-pool-service/campaign-shared-pool-overview.service.js';
import { claimCustomer, releaseClaim } from './campaign-shared-pool-service/campaign-shared-pool-claim.service.js';
import {
  recordSharedPoolStatus,
  syncCustomerClaimAfterCall,
  syncSharedPoolFromLatestCall,
} from './campaign-shared-pool-service/campaign-shared-pool-call-sync.service.js';
import {
  advanceBatch,
  batchManagerPoolAction,
  managerPoolAction,
  togglePause,
} from './campaign-shared-pool-service/campaign-shared-pool-manager.service.js';
import {
  getCampaignSharedPoolHistory,
  getSharedPoolLogs,
} from './campaign-shared-pool-service/campaign-shared-pool-history.service.js';
import { recoverCustomerState } from './campaign-shared-pool-service/campaign-shared-pool-recovery.service.js';

export class CampaignSharedPoolService {
  static registerCacheInvalidator = registerCacheInvalidator;
  static invalidateCache = invalidateCache;
  static invalidateCampaignCache = invalidateCampaignCache;
  static maintainSharedPool = maintainSharedPool;
  static maintainSharedPoolThrottled = maintainSharedPoolThrottled;
  static getSharedPoolOverview = getSharedPoolOverview;
  static getCampaignStaffPerformance = getCampaignStaffPerformance;
  static claimCustomer = claimCustomer;
  static releaseClaim = releaseClaim;
  static mapCallLogToSharedPool = mapCallLogToSharedPool;
  static syncCustomerClaimAfterCall = syncCustomerClaimAfterCall;
  static syncSharedPoolFromLatestCall = syncSharedPoolFromLatestCall;
  static recordSharedPoolStatus = recordSharedPoolStatus;
  static advanceBatch = advanceBatch;
  static togglePause = togglePause;
  static managerPoolAction = managerPoolAction;
  static batchManagerPoolAction = batchManagerPoolAction;
  static getSharedPoolLogs = getSharedPoolLogs;
  static getCampaignSharedPoolHistory = getCampaignSharedPoolHistory;
  static recoverCustomerState = recoverCustomerState;
  static startMaintenanceWorker = startMaintenanceWorker;
}
