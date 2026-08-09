/**
 * Foreign Customer Detection & Helper Service
 */

/**
 * Checks if a given phone number is an international / foreign phone number.
 * Vietnam standard numbers start with +84 or 0 followed by 3, 5, 7, 8, 9 and 8 digits.
 */
export function isForeignPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[\s\-().]/g, '').trim();
  if (!cleanPhone) return false;

  // Standard Vietnam phone regex: (0 or +84/84) + [3|5|7|8|9] + 8 digits -> total 10 digits
  const isVietnamStandard = /^(0|\+?84)[35789]\d{8}$/.test(cleanPhone);
  return !isVietnamStandard;
}

/**
 * Evaluates foreign status combining database flag, override status, and phone number.
 */
export function resolveIsForeign(
  dbIsForeign?: boolean | number | null,
  dbIsForeignOverridden?: boolean | number | null,
  phone?: string | null
): boolean {
  const isOverridden = Boolean(dbIsForeignOverridden);
  if (isOverridden) {
    return Boolean(dbIsForeign);
  }
  return Boolean(dbIsForeign) || isForeignPhoneNumber(phone);
}

/**
 * Returns raw SQL snippet for filtering is_foreign in user_profile queries.
 */
export function getForeignSqlFilter(isForeignParam?: string | boolean): string | null {
  if (isForeignParam === undefined || isForeignParam === null || isForeignParam === '' || isForeignParam === 'all') {
    return null;
  }

  const isTrue = isForeignParam === 'foreign' || isForeignParam === 'true' || isForeignParam === true;

  if (isTrue) {
    return `(
      up.is_foreign = 1 OR (
        COALESCE(up.is_foreign_overridden, 0) = 0 AND EXISTS (
          SELECT 1 FROM user_contact uc 
          WHERE uc.user_id = u.id AND uc.is_disabled = 0 
          AND uc.phone_number NOT REGEXP '^(0|\\\\+?84)[35789][0-9]{8}$'
        )
      )
    )`;
  } else {
    return `(
      COALESCE(up.is_foreign, 0) = 0 AND (
        COALESCE(up.is_foreign_overridden, 0) = 1 OR NOT EXISTS (
          SELECT 1 FROM user_contact uc 
          WHERE uc.user_id = u.id AND uc.is_disabled = 0 
          AND uc.phone_number NOT REGEXP '^(0|\\\\+?84)[35789][0-9]{8}$'
        )
      )
    )`;
  }
}
