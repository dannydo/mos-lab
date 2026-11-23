import {
  getWorkshopById,
  getWorkshopBySlug,
  getWorkshopParticipant,
  getWorkshopRowById,
  getWorkshopRowBySlug,
} from './service/workshop-core.service.js';
import {
  createWorkshop,
  getWorkshopZaloTemplates,
  listWorkshops,
  saveWorkshopZaloTemplates,
  updateWorkshop,
} from './service/workshop-crud.service.js';
import {
  cloneWorkshop,
  getWorkshopClonePreview,
  resolveUniqueWorkshopSeriesSlug,
  suggestNextWorkshopSeriesNameAndSlug,
} from './service/workshop-clone.service.js';
import {
  applyWorkshopMenuTemplate,
  createWorkshopAgendaItem,
  createWorkshopMenuItem,
  deleteWorkshopAgendaItem,
  deleteWorkshopMenuItem,
  refreshWorkshopMenuTemplateFromWorkshop,
  reorderWorkshopAgenda,
  saveWorkshopMenuAsTemplate,
  setWorkshopMenuAgendaItem,
  updateWorkshopAgendaItem,
  updateWorkshopMenuItem,
  uploadWorkshopHeroImage,
  uploadWorkshopMenuImage,
  uploadWorkshopQuizImage,
} from './service/workshop-agenda-and-menu.service.js';
import {
  applyWorkshopDesignTemplate,
  applyWorkshopEquipmentTemplate,
  createWorkshopDesignItem,
  createWorkshopDesignItemImage,
  createWorkshopEquipmentPackage,
  createWorkshopEquipmentPackageImage,
  deleteWorkshopDesignItem,
  deleteWorkshopDesignItemImage,
  deleteWorkshopEquipmentPackage,
  deleteWorkshopEquipmentPackageImage,
  refreshWorkshopDesignTemplateFromWorkshop,
  refreshWorkshopEquipmentTemplateFromWorkshop,
  saveWorkshopDesignAsTemplate,
  saveWorkshopEquipmentAsTemplate,
  setWorkshopDesignAgendaItem,
  setWorkshopEquipmentAgendaItem,
  updateWorkshopDesignItem,
  updateWorkshopDesignItemImage,
  updateWorkshopEquipmentPackage,
  updateWorkshopEquipmentPackageImage,
  uploadWorkshopDesignImage,
  uploadWorkshopEquipmentImage,
} from './service/workshop-equipment-and-designs.service.js';
import {
  addWorkshopParticipants,
  addWorkshopWalkIn,
  checkInWorkshopParticipant,
  checkInWorkshopParticipantByQr,
  listWorkshopParticipants,
  reissueWorkshopParticipantQr,
  setWorkshopParticipantConsent,
  updateWorkshopParticipantCare,
  updateWorkshopParticipantSelections,
} from './service/workshop-participants.service.js';
import {
  assignWorkshopInstructor,
  confirmWorkshopPhoto,
  createWorkshopPhotoUploadIntent,
  deleteWorkshopFeePayment,
  ensureWorkshopCompletionFollowUps,
  getWorkshopTalentLeaderboard,
  recordWorkshopFee,
  updateWorkshopParticipantPricing,
  waiveWorkshopFee,
} from './service/workshop-participant-ops.service.js';

export {
  ACADEMY_WORKSHOP_ZALO_TEMPLATES_KEY,
  DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES,
  calculateAcademyWorkshopEndsAtFromAgenda,
  hashQr as hashAcademyWorkshopQrToken,
  resolveAcademyWorkshopPublicOrigin,
} from './service/workshop-helpers.js';
export {
  academyWorkshopTalentSnapshotFromAssessment,
  toAcademyWorkshopAgendaItem,
  toAcademyWorkshopQuiz,
  toParticipant as toAcademyWorkshopParticipant,
} from './service/workshop-mappers.js';

export class AcademyWorkshopService {
  static rowById = getWorkshopRowById;
  static rowBySlug = getWorkshopRowBySlug;
  static getById = getWorkshopById;
  static getBySlug = getWorkshopBySlug;
  static list = listWorkshops;
  static create = createWorkshop;
  static suggestNextSeriesNameAndSlug = suggestNextWorkshopSeriesNameAndSlug;
  static resolveUniqueSeriesSlug = resolveUniqueWorkshopSeriesSlug;
  static getClonePreview = getWorkshopClonePreview;
  static clone = cloneWorkshop;
  static update = updateWorkshop;

  static createAgendaItem = createWorkshopAgendaItem;
  static updateAgendaItem = updateWorkshopAgendaItem;
  static deleteAgendaItem = deleteWorkshopAgendaItem;
  static reorderAgenda = reorderWorkshopAgenda;

  static uploadHeroImage = uploadWorkshopHeroImage;
  static uploadQuizImage = uploadWorkshopQuizImage;
  static uploadMenuImage = uploadWorkshopMenuImage;
  static setMenuAgendaItem = setWorkshopMenuAgendaItem;
  static createMenuItem = createWorkshopMenuItem;
  static updateMenuItem = updateWorkshopMenuItem;
  static deleteMenuItem = deleteWorkshopMenuItem;
  static saveMenuAsTemplate = saveWorkshopMenuAsTemplate;
  static refreshMenuTemplateFromWorkshop = refreshWorkshopMenuTemplateFromWorkshop;
  static applyMenuTemplate = applyWorkshopMenuTemplate;

  static uploadEquipmentImage = uploadWorkshopEquipmentImage;
  static setEquipmentAgendaItem = setWorkshopEquipmentAgendaItem;
  static createEquipmentPackage = createWorkshopEquipmentPackage;
  static updateEquipmentPackage = updateWorkshopEquipmentPackage;
  static deleteEquipmentPackage = deleteWorkshopEquipmentPackage;
  static saveEquipmentAsTemplate = saveWorkshopEquipmentAsTemplate;
  static refreshEquipmentTemplateFromWorkshop = refreshWorkshopEquipmentTemplateFromWorkshop;
  static applyEquipmentTemplate = applyWorkshopEquipmentTemplate;
  static createEquipmentPackageImage = createWorkshopEquipmentPackageImage;
  static updateEquipmentPackageImage = updateWorkshopEquipmentPackageImage;
  static deleteEquipmentPackageImage = deleteWorkshopEquipmentPackageImage;

  static uploadDesignImage = uploadWorkshopDesignImage;
  static setDesignAgendaItem = setWorkshopDesignAgendaItem;
  static createDesignItem = createWorkshopDesignItem;
  static updateDesignItem = updateWorkshopDesignItem;
  static deleteDesignItem = deleteWorkshopDesignItem;
  static saveDesignAsTemplate = saveWorkshopDesignAsTemplate;
  static refreshDesignTemplateFromWorkshop = refreshWorkshopDesignTemplateFromWorkshop;
  static applyDesignTemplate = applyWorkshopDesignTemplate;
  static createDesignItemImage = createWorkshopDesignItemImage;
  static updateDesignItemImage = updateWorkshopDesignItemImage;
  static deleteDesignItemImage = deleteWorkshopDesignItemImage;

  static addParticipants = addWorkshopParticipants;
  static addWalkIn = addWorkshopWalkIn;
  static getParticipant = getWorkshopParticipant;
  static listParticipants = listWorkshopParticipants;
  static updateCare = updateWorkshopParticipantCare;
  static updateParticipantSelections = updateWorkshopParticipantSelections;
  static checkIn = checkInWorkshopParticipant;
  static checkInByQr = checkInWorkshopParticipantByQr;
  static reissueQr = reissueWorkshopParticipantQr;
  static setConsent = setWorkshopParticipantConsent;
  static createPhotoUploadIntent = createWorkshopPhotoUploadIntent;
  static confirmPhoto = confirmWorkshopPhoto;
  static assignInstructor = assignWorkshopInstructor;
  static recordFee = recordWorkshopFee;
  static deleteFeePayment = deleteWorkshopFeePayment;
  static waiveFee = waiveWorkshopFee;
  static updateParticipantPricing = updateWorkshopParticipantPricing;
  static talentLeaderboard = getWorkshopTalentLeaderboard;
  static ensureCompletionFollowUps = ensureWorkshopCompletionFollowUps;
  static getZaloTemplates = getWorkshopZaloTemplates;
  static saveZaloTemplates = saveWorkshopZaloTemplates;
}
