import { payrollApi } from './payroll.api';
import { systemApi } from './system.api';
import { bugReportsApi } from './bug-reports.api';
import { catalogApi } from './catalog.api';
import { customersApi } from './customers.api';
import { kpiApi } from './kpi.api';
import { campaignsApi } from './campaigns.api';
import { staffApi } from './staff.api';
import { telecomApi } from './telecom.api';
import { academyApi } from './academy.api';
import { qaShopApi } from './qa-shop.api';

export * from './base';

export const apiClient = {
  ...payrollApi,
  ...systemApi,
  ...bugReportsApi,
  ...catalogApi,
  ...customersApi,
  ...kpiApi,
  ...campaignsApi,
  ...staffApi,
  ...telecomApi,
  ...academyApi,
  ...qaShopApi,
};

export default apiClient;
