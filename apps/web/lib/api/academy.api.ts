import { academyCampaignsApi } from './academy/campaigns.api';
import { academySalesCoreApi } from './academy/sales-core.api';
import { academyWorkshopOperationsApi } from './academy/workshop-operations.api';
import { academyWorkshopSetupApi } from './academy/workshop-setup.api';
import { academyWorkshopsPublicApi } from './academy/workshops-public.api';

export const academyApi = {
  academySales: {
    ...academySalesCoreApi,
    workshops: {
      ...academyWorkshopSetupApi,
      ...academyWorkshopOperationsApi,
    },
    campaigns: academyCampaignsApi,
  },
  academyWorkshopsPublic: academyWorkshopsPublicApi,
};
