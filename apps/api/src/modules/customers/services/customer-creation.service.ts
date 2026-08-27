import { FastifyInstance } from 'fastify';
import { CreateCustomerInput, SafeAny } from '@mos-lab/shared';
import { isForeignPhoneNumber } from './foreign-customer.service.js';

export class CustomerCreationError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'CustomerCreationError';
  }
}

type CustomerCreationActor = {
  id: number;
  displayName?: string | null;
};

const cleanOptionalValue = (value: unknown): string | null => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || null;
};

export const normalizeLegacyPhone = (value: unknown): string => {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw
    .replace(/[\s.()-]/g, '')
    .replace(/^\+84/, '0')
    .replace(/^84(?=\d{8,}$)/, '0');
};

const parseDateOfBirth = (value: unknown): Date | null => {
  const dateString = cleanOptionalValue(value);
  if (!dateString) return null;

  const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new CustomerCreationError('Ngày sinh không hợp lệ.');
  }
  return date;
};

export class CustomerCreationService {
  static async resolveLegacyStaffId(fastify: FastifyInstance, actor: CustomerCreationActor): Promise<number> {
    const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: actor.id },
      select: { legacyStaffId: true, displayName: true },
    });

    let legacyStaffId: number | null = crmStaff?.legacyStaffId || null;
    if (legacyStaffId) {
      const staffExists = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user WHERE id = ? LIMIT 1`,
        legacyStaffId
      );
      if (staffExists.length === 0) legacyStaffId = null;
    }

    const displayName = actor.displayName || crmStaff?.displayName;
    if (!legacyStaffId && displayName?.trim()) {
      const staffByName = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id FROM user_profile
         WHERE (full_name = ? OR full_name LIKE ?) AND provider = 'Staff' AND is_disabled = 0
         LIMIT 1`,
        displayName.trim(),
        `%${displayName.trim()}%`
      );
      if (staffByName[0]?.user_id) legacyStaffId = Number(staffByName[0].user_id);
    }

    // Matches the established booking flow fallback for legacy records that
    // pre-date a CRM staff link.
    return legacyStaffId || 1;
  }

  static async findCustomerIdByPhone(
    fastify: FastifyInstance,
    phone: string | null | undefined
  ): Promise<number | null> {
    const normalizedPhone = normalizeLegacyPhone(phone);
    if (!normalizedPhone) return null;

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id FROM user_contact WHERE phone_number = ? AND is_disabled = 0 LIMIT 1`,
      normalizedPhone
    );
    return rows[0]?.user_id ? Number(rows[0].user_id) : null;
  }

  static async resolveReferrerUserId(
    fastify: FastifyInstance,
    referralPhone: string | null | undefined
  ): Promise<number | null> {
    const normalizedPhone = normalizeLegacyPhone(referralPhone);
    if (!normalizedPhone) return null;

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id FROM user_contact WHERE phone_number = ? AND is_disabled = 0 LIMIT 1`,
      normalizedPhone
    );
    if (!rows[0]?.user_id) {
      throw new CustomerCreationError(
        `Không tìm thấy khách hàng giới thiệu với SĐT: ${normalizedPhone}. Vui lòng kiểm tra lại.`
      );
    }
    return Number(rows[0].user_id);
  }

  static async create(
    fastify: FastifyInstance,
    actor: CustomerCreationActor,
    input: CreateCustomerInput
  ): Promise<{ customer: { id: number; name: string; phone: string }; referrerUserId: number | null }> {
    const name = cleanOptionalValue(input.name);
    const phone = normalizeLegacyPhone(input.phone);
    if (!name) throw new CustomerCreationError('Vui lòng nhập tên khách hàng.');
    if (!phone) throw new CustomerCreationError('Vui lòng nhập số điện thoại khách hàng.');

    const phoneDigitCount = phone.replace(/\D/g, '').length;
    if (phoneDigitCount < 8 || phoneDigitCount > 15) {
      throw new CustomerCreationError('Số điện thoại phải từ 8 đến 15 chữ số.');
    }

    const existingCustomerId = await this.findCustomerIdByPhone(fastify, phone);
    if (existingCustomerId) {
      throw new CustomerCreationError('Số điện thoại này đã có trong hệ thống. Hãy chọn khách hàng hiện có.', 409);
    }

    const socialProfileLink = cleanOptionalValue(input.socialProfileLink);
    if (socialProfileLink) {
      const existingSocial = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id FROM user_social_account WHERE provider = 'Facebook' AND social_profile_link = ? LIMIT 1`,
        socialProfileLink
      );
      if (existingSocial[0]?.user_id) {
        throw new CustomerCreationError('Facebook này đã có trong hệ thống. Hãy chọn khách hàng hiện có.', 409);
      }
    }

    const legacyStaffId = await this.resolveLegacyStaffId(fastify, actor);
    const referrerUserId = await this.resolveReferrerUserId(fastify, input.referrerPhone);
    const genderAttributeId = Number(input.genderAttributeId || 0) || null;
    const gender = genderAttributeId === 202 ? 'Female' : genderAttributeId === 203 ? 'Male' : null;
    const dateOfBirth = parseDateOfBirth(input.dateOfBirth);
    const campaignId = Number(input.campaignId || 0) || null;
    const advertiseId = Number(input.advertiseId || 0) || null;

    if (campaignId) {
      const campaigns = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM campaign WHERE id = ? AND is_disabled = 0 LIMIT 1`,
        campaignId
      );
      if (campaigns.length === 0) throw new CustomerCreationError('Chiến dịch đã chọn không còn hoạt động.');
    }

    if (advertiseId) {
      const advertises = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM advertise WHERE id = ? AND is_disabled = 0${campaignId ? ' AND campaign_id = ?' : ''} LIMIT 1`,
        ...(campaignId ? [advertiseId, campaignId] : [advertiseId])
      );
      if (advertises.length === 0) throw new CustomerCreationError('Nguồn quảng cáo đã chọn không hợp lệ.');
    }

    const nameParts = name.split(/\s+/);
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';
    const now = new Date();
    const storeId = Number(input.storeId || 0) || 1;
    const languageId = Number(input.languageId || 0) || 1;
    const socialProfileName = cleanOptionalValue(input.socialProfileName);
    const socialMessageLink = cleanOptionalValue(input.socialMessageLink);
    const hasExplicitForeignStatus = typeof input.isForeign === 'boolean';
    const isForeign = hasExplicitForeignStatus ? Boolean(input.isForeign) : isForeignPhoneNumber(phone);

    const customer = await fastify.prisma.legacy.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          created_staff_id: legacyStaffId,
          attribute_gender_id: genderAttributeId,
          gender,
          date_of_birth: dateOfBirth,
          date_created: now,
        },
      });

      await tx.user_profile.create({
        data: {
          client_id: 11,
          client_business_id: 1,
          created_staff_id: legacyStaffId,
          user_id: createdUser.id,
          language_id: languageId,
          campaign_id: campaignId,
          advertise_id: advertiseId,
          referrer_user_id: referrerUserId,
          referrer_created_staff_id: referrerUserId ? legacyStaffId : null,
          referrer_date_created: referrerUserId ? now : null,
          client_store_id: storeId,
          user_group_id: 1,
          access_user_group_ids: '',
          passcode: Math.random().toString(36).slice(2, 10),
          provider: 'Client',
          first_name: firstName,
          last_name: lastName,
          full_name: name,
          is_academy: false,
          is_temporary: false,
          is_foreign: isForeign,
          is_foreign_overridden: hasExplicitForeignStatus,
          is_disabled: false,
          is_leaved: false,
          is_deleted: false,
          date_created: now,
        },
      });

      await tx.user_contact.create({
        data: {
          created_staff_id: legacyStaffId,
          user_id: createdUser.id,
          phone_number: phone,
          is_disabled: false,
          date_created: now,
        },
      });

      if (socialProfileLink) {
        await tx.$executeRawUnsafe(
          `INSERT INTO user_social_account (
            created_staff_id, user_id, provider, identity, social_profile_link,
            social_profile_name, social_message_link, date_created
          ) VALUES (?, ?, 'Facebook', ?, ?, ?, ?, NOW())`,
          legacyStaffId,
          createdUser.id,
          socialProfileLink.slice(0, 100),
          socialProfileLink,
          socialProfileName,
          socialMessageLink
        );
      }

      return { id: createdUser.id, name, phone };
    });

    return { customer, referrerUserId };
  }

  static async attachReferrerIfMissing(
    fastify: FastifyInstance,
    customerId: number,
    actor: CustomerCreationActor,
    referrerUserId: number | null
  ): Promise<void> {
    if (!referrerUserId) return;
    const legacyStaffId = await this.resolveLegacyStaffId(fastify, actor);
    await fastify.prisma.legacy.$executeRawUnsafe(
      `UPDATE user_profile
       SET referrer_user_id = ?, referrer_created_staff_id = ?, referrer_date_created = NOW()
       WHERE user_id = ? AND referrer_user_id IS NULL`,
      referrerUserId,
      legacyStaffId,
      customerId
    );
  }

  static async setForeignStatus(fastify: FastifyInstance, customerId: number, isForeign: boolean): Promise<void> {
    await fastify.prisma.legacy.$executeRawUnsafe(
      `UPDATE user_profile SET is_foreign = ?, is_foreign_overridden = 1 WHERE user_id = ?`,
      isForeign ? 1 : 0,
      customerId
    );
  }
}
