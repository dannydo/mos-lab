import {
  archiveAcademyCampaign,
  cloneAcademyCampaign,
  createAcademyCampaign,
  deleteAcademyCampaign,
  getAcademyCampaignById,
  getAcademyCampaignBySlug,
  listAcademyCampaigns,
  listSidebarAcademyCampaigns,
  restoreAcademyCampaign,
  setAcademyCampaignStatus,
  updateAcademyCampaign,
} from './campaigns/academy-campaign-crud.service.js';
import {
  addAcademyCampaignLeads,
  getAcademyCampaignStats,
  listAcademyCampaignLeads,
  removeAcademyCampaignLead,
  toggleAcademyCampaignTouchpointLog,
} from './campaigns/academy-campaign-leads.service.js';

export {
  DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS,
  isAcademyCampaignSidebarVisible,
  isAcademyCampaignTouchpointOutcome,
  isAcademyCampaignTouchpointWritable,
  isCampaignVisibleToStaff,
  normalizeAcademyCampaignSnapshotLeadIds,
  parseAcademyCampaignDate,
} from './campaigns/academy-campaign-helpers.js';

export class AcademyCampaignService {
  static listCampaigns = listAcademyCampaigns;
  static listSidebarCampaigns = listSidebarAcademyCampaigns;
  static getCampaignById = getAcademyCampaignById;
  static getCampaignBySlug = getAcademyCampaignBySlug;
  static createCampaign = createAcademyCampaign;
  static updateCampaign = updateAcademyCampaign;
  static setCampaignStatus = setAcademyCampaignStatus;
  static archiveCampaign = archiveAcademyCampaign;
  static deleteCampaign = deleteAcademyCampaign;
  static restoreCampaign = restoreAcademyCampaign;
  static cloneCampaign = cloneAcademyCampaign;
  static listCampaignLeads = listAcademyCampaignLeads;
  static addLeads = addAcademyCampaignLeads;
  static removeLead = removeAcademyCampaignLead;
  static toggleTouchpointLog = toggleAcademyCampaignTouchpointLog;
  static getStats = getAcademyCampaignStats;
}
