import type { Staff } from '@mos-lab/shared';

const CAMPAIGN_BOOKER_ROLES = new Set(['booker', 'telesales', 'cs', 'coca', 'loca', 'cskh', 'customer-support']);

/**
 * The campaign API asks for Booker staff first. If the Booker team mapping has
 * not been configured yet, preserve access management by falling back to all
 * active staff rather than leaving the form with an unusable empty selector.
 */
export const normalizeCampaignAccessStaff = (value: unknown): Staff[] => {
  const rows = Array.isArray(value) ? (value as Staff[]) : [];
  const deduplicated = Array.from(
    rows
      .reduce((staffByName, staff) => {
        const name = String(staff.displayName || staff.username || '').trim();
        if (!name) return staffByName;
        const key = name.toLocaleLowerCase('vi-VN');
        if (!staffByName.has(key)) staffByName.set(key, staff);
        return staffByName;
      }, new Map<string, Staff>())
      .values()
  );

  // `assignedStaffIds` is stored against CRM staff IDs. Prefer values that
  // carry the CRM-only legacyStaffId field so a legacy KTV-only record cannot
  // be rendered as a selectable campaign member and then be discarded on save.
  const crmStaff = deduplicated.filter((staff) => Object.hasOwn(staff, 'legacyStaffId'));
  const candidates = crmStaff.length > 0 ? crmStaff : deduplicated;
  const bookers = candidates.filter((staff) => CAMPAIGN_BOOKER_ROLES.has(String(staff.role || '').toLowerCase()));
  return bookers.length > 0 ? bookers : candidates;
};
