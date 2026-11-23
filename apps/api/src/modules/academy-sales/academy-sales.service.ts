import {
  addAcademyLeadActivity,
  createAcademyLead,
  getAcademyLead,
  getAcademyLeadAccessWhere,
  getAccessibleAcademyLead,
  listAcademyCalendarEvents,
  listAcademyLeads,
  listAcademyStaffOptions,
  recordAcademyLeadNoShow,
  updateAcademyLead,
} from './sales/academy-leads.service.js';
import {
  createAcademyFollowUp,
  listAcademyCourses,
  listAcademyFollowUps,
  listAcademyPlaybooks,
  updateAcademyFollowUp,
  upsertAcademyCourse,
  upsertAcademyPlaybook,
} from './sales/academy-followups-and-catalog.service.js';

export {
  ACADEMY_DEPARTMENT_CODE,
  ACADEMY_TEAM_CODE,
  ACADEMY_TEAM_FALLBACK_CONFIG_KEY,
  AcademySalesError,
  buildAcademyLeadSearchText,
  canAccessAcademySales,
  canManageAcademyRestricted,
  canManageAcademySales,
  getAcademyIctDayBounds,
  getAcademyIctMonthBounds,
  getAcademyWorkspaceAccess,
  normalizeAcademyAvatarUrl,
  normalizeAcademyPhone,
  normalizeLegacyAcademyStatus,
  parseAcademyIctDate,
  resolveAcademyStatusForSchedule,
  sanitizeAcademyCourseRichText,
  type AcademyActor,
} from './sales/academy-sales-helpers.js';

export class AcademySalesService {
  static getLeadAccessWhere = getAcademyLeadAccessWhere;
  static getAccessibleLead = getAccessibleAcademyLead;
  static listStaffOptions = listAcademyStaffOptions;
  static listLeads = listAcademyLeads;
  static listCalendarEvents = listAcademyCalendarEvents;
  static getLead = getAcademyLead;
  static createLead = createAcademyLead;
  static updateLead = updateAcademyLead;
  static addActivity = addAcademyLeadActivity;
  static recordNoShow = recordAcademyLeadNoShow;
  static listFollowUps = listAcademyFollowUps;
  static createFollowUp = createAcademyFollowUp;
  static updateFollowUp = updateAcademyFollowUp;
  static listPlaybooks = listAcademyPlaybooks;
  static upsertPlaybook = upsertAcademyPlaybook;
  static listCourses = listAcademyCourses;
  static upsertCourse = upsertAcademyCourse;
}
