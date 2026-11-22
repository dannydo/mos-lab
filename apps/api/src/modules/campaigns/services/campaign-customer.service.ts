import { getCampaignCustomers } from './campaign-customer-service/campaign-customer-query.service.js';
import {
  addCustomersToCampaign,
  removeCustomerFromCampaign,
  removeCustomersFromCampaignBatch,
  transferCustomersToCampaign,
} from './campaign-customer-service/campaign-customer-membership.service.js';
import { toggleTouchpointLog } from './campaign-customer-service/campaign-customer-touchpoint.service.js';

export type {
  CampaignCustomerPageResult,
  CampaignCustomerQueryParams,
} from './campaign-customer-service/campaign-customer-helpers.js';

export class CampaignCustomerService {
  static getCampaignCustomers = getCampaignCustomers;
  static addCustomersToCampaign = addCustomersToCampaign;
  static transferCustomersToCampaign = transferCustomersToCampaign;
  static removeCustomerFromCampaign = removeCustomerFromCampaign;
  static removeCustomersFromCampaignBatch = removeCustomersFromCampaignBatch;
  static toggleTouchpointLog = toggleTouchpointLog;
}
