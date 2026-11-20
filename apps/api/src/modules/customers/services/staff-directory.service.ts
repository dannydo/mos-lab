import { isCvRole } from '@mos-lab/shared';

/**
 * Staff directory merge for `GET /customers/staff`.
 *
 * The directory combines mOS (CRM) staff with active legacy technicians (KTV).
 * A person is identified by the legacy user id (`crm.legacyStaffId` === `ktv.id`),
 * never by display name: names such as "Ngọc Huyền" are shared by many different
 * people, and merging by name silently replaced a Telesales account's role with
 * `technician`.
 */
export interface DirectoryStaff {
  id: number;
  username?: string;
  displayName?: string | null;
  role?: string | null;
  legacyStaffId?: number | null;
  [key: string]: unknown;
}

function nameKey(name: string | null | undefined): string {
  return (name || '').trim().toLowerCase();
}

/**
 * - Same legacy id + CV/technician role in mOS: legacy KTV record wins (historical behaviour,
 *   booking flows address technicians by legacy user id).
 * - Same legacy id + any other mOS role (telesales, cc, admin...): the mOS record wins
 *   (id, username, role); KTV-only attributes (off days, avatar, store notes) are kept.
 * - No legacy id on the mOS record: only a CV/technician-role record may fall back to a
 *   same-name KTV. Any other role is never merged by name.
 * - Duplicate mOS accounts of one person are collapsed (first wins) only when name AND role match and
 *   the legacy ids are equal or one is missing. Same name with a different role or a different legacy id
 *   is a different person/account and is kept.
 * Output order: KTV slots first (merged or legacy-only), then remaining mOS-only staff.
 */
export function mergeStaffDirectory(crmStaff: DirectoryStaff[], ktvs: DirectoryStaff[]): DirectoryStaff[] {
  const ktvById = new Map<number, DirectoryStaff>();
  const ktvByName = new Map<string, DirectoryStaff>();
  ktvs.forEach((ktv) => {
    const id = Number(ktv.id);
    if (!ktvById.has(id)) ktvById.set(id, ktv);
    const key = nameKey(ktv.displayName);
    if (key && !ktvByName.has(key)) ktvByName.set(key, ktv);
  });

  const mergedByKtvId = new Map<number, DirectoryStaff>();
  const crmOnly: DirectoryStaff[] = [];

  const acceptedCrm: DirectoryStaff[] = [];
  crmStaff.forEach((staff) => {
    const key = nameKey(staff.displayName);
    const legacyId = staff.legacyStaffId == null ? null : Number(staff.legacyStaffId);
    const isDuplicateAccount =
      key !== '' &&
      acceptedCrm.some((other) => {
        if (nameKey(other.displayName) !== key) return false;
        if ((other.role || '') !== (staff.role || '')) return false;
        const otherLegacy = other.legacyStaffId == null ? null : Number(other.legacyStaffId);
        return legacyId == null || otherLegacy == null || legacyId === otherLegacy;
      });
    if (!isDuplicateAccount) acceptedCrm.push(staff);
  });

  acceptedCrm.forEach((staff) => {
    const legacyId = staff.legacyStaffId == null ? null : Number(staff.legacyStaffId);
    const cvRole = isCvRole(staff.role || '');
    let match = legacyId != null ? ktvById.get(legacyId) : undefined;
    if (!match && cvRole) {
      match = ktvByName.get(nameKey(staff.displayName));
    }
    if (!match || mergedByKtvId.has(Number(match.id))) {
      crmOnly.push(staff);
      return;
    }
    mergedByKtvId.set(Number(match.id), cvRole ? { ...staff, ...match } : { ...match, ...staff });
  });

  const seenKtv = new Set<number>();
  const ktvSlots: DirectoryStaff[] = [];
  ktvs.forEach((ktv) => {
    const id = Number(ktv.id);
    if (seenKtv.has(id)) return;
    seenKtv.add(id);
    ktvSlots.push(mergedByKtvId.get(id) || ktv);
  });

  return [...ktvSlots, ...crmOnly];
}
