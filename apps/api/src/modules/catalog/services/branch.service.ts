import type { FastifyInstance } from 'fastify';
import type {
  CrmBranch,
  CreateBranchDto,
  UpdateBranchDto,
  BranchFilterParams,
  BranchStats,
  BranchStaffInfo,
  CatalogListResponse,
  BranchType,
} from '@mos-lab/shared';

// Legacy DB raw SQL returns only selected scalar fields. The database schema is
// external to Prisma's CRM client, so these calls remain deliberately scoped to
// the exact fields read below.
/* eslint-disable @typescript-eslint/no-explicit-any */

export class BranchService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Seed crm_stores from client_store_language in legacy database if crm_stores is empty.
   */
  async seedFromLegacyIfNeeded(): Promise<void> {
    try {
      const existingCount = await this.fastify.prisma.crm.crmStore.count();
      if (existingCount > 0) return;

      this.fastify.log.info('Seeding crm_stores from legacy client_store_language...');
      const legacyStores = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT DISTINCT client_store_id FROM client_store_language WHERE client_store_id IS NOT NULL`
      );

      for (const row of legacyStores) {
        const storeId = Number(row.client_store_id);
        if (!storeId) continue;

        const [langRows, masterRows] = await Promise.all([
          this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT * FROM client_store_language WHERE client_store_id = ? ORDER BY language_id ASC`,
            storeId
          ),
          this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT is_disabled, is_academy, client_store_key FROM client_store WHERE id = ?`,
            storeId
          ),
        ]);

        const vi = langRows.find((r) => Number(r.language_id) === 1) || langRows[0] || {};
        const en = langRows.find((r) => Number(r.language_id) === 2) || {};
        const master = masterRows[0] || {};
        const isDisabled = Number(master.is_disabled) === 1;
        const isAcademy = Number(master.is_academy) === 1;
        const key = (master.client_store_key || '').toLowerCase();

        let storeType: BranchType = 'SALON';
        if (isAcademy || key.includes('academy') || key.includes('training')) {
          storeType = 'ACADEMY';
        } else if (['hq', 'hardware', 'ctv'].includes(key)) {
          storeType = 'OFFICE';
        }

        const name = vi.client_store_name || `Chi nhánh ${storeId}`;
        const nameEn = en.client_store_name || name;
        const code = this.slugifyCode(name, storeId);

        await this.fastify.prisma.crm.crmStore.create({
          data: {
            code,
            name,
            nameEn,
            storeType,
            addressMap: vi.client_store_address_map || null,
            addressSms: vi.client_store_address_sms || null,
            addressWeb: vi.client_store_address_web || null,
            addressCity: vi.client_store_address_city || null,
            sortOrder: storeId,
            isActive: !isDisabled,
            legacyClientStoreId: storeId,
          },
        });
      }

      this.fastify.log.info('Seeding crm_stores finished successfully.');
    } catch (err) {
      this.fastify.log.error(err, 'Failed to seed crm_stores from legacy DB');
    }
  }

  private slugifyCode(name: string, fallbackId: number): string {
    const clean = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    return clean || `STORE_${fallbackId}`;
  }

  /**
   * List all branches with search, filters, pagination, and staff counts.
   */
  async listBranches(params: BranchFilterParams): Promise<CatalogListResponse<CrmBranch>> {
    await this.seedFromLegacyIfNeeded();

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {};

    if (params.onlyHidden) {
      whereClause.isActive = false;
    } else if (params.isActive !== undefined) {
      whereClause.isActive = params.isActive;
    } else {
      whereClause.isActive = true;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      whereClause.OR = [
        { name: { contains: q } },
        { nameEn: { contains: q } },
        { code: { contains: q } },
        { addressCity: { contains: q } },
        { addressSms: { contains: q } },
      ];
    }

    const [total, records] = await Promise.all([
      this.fastify.prisma.crm.crmStore.count({ where: whereClause }),
      this.fastify.prisma.crm.crmStore.findMany({
        where: whereClause,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    // Fetch staff count and completed orders count for each store
    const legacyStoreIds = records.map((r) => r.legacyClientStoreId).filter(Boolean) as number[];

    // Run independent per-store aggregates together; each is scoped by the active page's store IDs.
    const staffCountMap = new Map<number, number>();
    const customerCountMap = new Map<number, number>();
    const completedOrdersMap = new Map<number, number>();

    if (legacyStoreIds.length > 0) {
      try {
        const [staffCounts, customerCounts, orderCounts] = await Promise.all([
          this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT client_store_id, COUNT(DISTINCT user_id) as cnt
             FROM user_profile
             WHERE user_group_id != 1 AND is_disabled = 0 AND is_deleted = 0 AND client_store_id IN (${legacyStoreIds.join(',')})
             GROUP BY client_store_id`
          ),
          this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT client_store_id, COUNT(DISTINCT user_id) as cnt
             FROM user_profile
             WHERE user_group_id = 1 AND is_disabled = 0 AND is_deleted = 0 AND client_store_id IN (${legacyStoreIds.join(',')})
             GROUP BY client_store_id`
          ),
          this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT client_store_id, COUNT(*) as cnt
             FROM \`order\`
             WHERE order_state = 'Completed' AND client_store_id IN (${legacyStoreIds.join(',')})
             GROUP BY client_store_id`
          ),
        ]);
        for (const row of staffCounts) {
          staffCountMap.set(Number(row.client_store_id), Number(row.cnt));
        }
        for (const row of customerCounts) {
          customerCountMap.set(Number(row.client_store_id), Number(row.cnt));
        }
        for (const row of orderCounts) {
          completedOrdersMap.set(Number(row.client_store_id), Number(row.cnt));
        }
      } catch (err) {
        this.fastify.log.error(err, 'Failed to fetch per-store aggregate counts');
      }
    }

    const data: CrmBranch[] = records.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      nameEn: r.nameEn,
      storeType: (r.storeType as BranchType) || 'SALON',
      addressMap: r.addressMap,
      addressSms: r.addressSms,
      addressWeb: r.addressWeb,
      addressCity: r.addressCity,
      sortOrder: r.sortOrder,
      isActive: Boolean(r.isActive),
      legacyClientStoreId: r.legacyClientStoreId,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      staffCount: r.legacyClientStoreId ? staffCountMap.get(r.legacyClientStoreId) || 0 : 0,
      customerCount: r.legacyClientStoreId ? customerCountMap.get(r.legacyClientStoreId) || 0 : 0,
      completedOrdersCount: r.legacyClientStoreId ? completedOrdersMap.get(r.legacyClientStoreId) || 0 : 0,
    }));

    return {
      success: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Get branch detail with staff list.
   */
  async getBranchById(id: number): Promise<CrmBranch | null> {
    await this.seedFromLegacyIfNeeded();

    const record = await this.fastify.prisma.crm.crmStore.findUnique({
      where: { id },
    });
    if (!record) return null;

    let staffList: BranchStaffInfo[] = [];
    let customerCount = 0;
    let completedOrdersCount = 0;

    if (record.legacyClientStoreId) {
      try {
        const staffRows = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT up.user_id, up.full_name, up.first_name, up.last_name, up.avatar, up.user_group_id, up.phone, up.is_disabled
           FROM user_profile up
           WHERE up.user_group_id != 1 AND up.is_deleted = 0 AND up.client_store_id = ?
           ORDER BY up.is_disabled ASC, up.full_name ASC`,
          record.legacyClientStoreId
        );

        staffList = staffRows.map((s) => ({
          id: Number(s.user_id),
          displayName: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Staff #${s.user_id}`,
          role: s.user_group_id === 4 ? 'Chuyên viên' : s.user_group_id === 3 ? 'Tư vấn viên' : 'Nhân sự',
          isActive: Number(s.is_disabled) === 0,
          avatarUrl: s.avatar ? `https://wingslashes.com/${s.avatar}` : null,
          phone: s.phone || null,
        }));
      } catch (err) {
        this.fastify.log.error(err, 'Failed to fetch branch staff list');
      }

      try {
        const custRes = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT COUNT(DISTINCT user_id) as cnt FROM user_profile WHERE user_group_id = 1 AND is_disabled = 0 AND is_deleted = 0 AND client_store_id = ?`,
          record.legacyClientStoreId
        );
        customerCount = Number(custRes[0]?.cnt || 0);

        const orderCnt = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT COUNT(*) as cnt FROM \`order\` WHERE order_state = 'Completed' AND client_store_id = ?`,
          record.legacyClientStoreId
        );
        completedOrdersCount = Number(orderCnt[0]?.cnt || 0);
      } catch (err) {
        this.fastify.log.error(err, 'Failed to fetch branch customer or completed orders');
      }
    }

    return {
      id: record.id,
      code: record.code,
      name: record.name,
      nameEn: record.nameEn,
      storeType: (record.storeType as BranchType) || 'SALON',
      addressMap: record.addressMap,
      addressSms: record.addressSms,
      addressWeb: record.addressWeb,
      addressCity: record.addressCity,
      sortOrder: record.sortOrder,
      isActive: Boolean(record.isActive),
      legacyClientStoreId: record.legacyClientStoreId,
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      staffCount: staffList.length,
      customerCount,
      completedOrdersCount,
      staffList,
    };
  }

  /**
   * Get branch overall statistics for KPI Cards.
   */
  async getBranchStats(): Promise<BranchStats> {
    await this.seedFromLegacyIfNeeded();

    const [totalBranches, activeBranches, inactiveBranches] = await Promise.all([
      this.fastify.prisma.crm.crmStore.count(),
      this.fastify.prisma.crm.crmStore.count({ where: { isActive: true } }),
      this.fastify.prisma.crm.crmStore.count({ where: { isActive: false } }),
    ]);

    let totalStaff = 0;
    let totalCustomers = 0;
    let totalCompletedOrders = 0;

    try {
      const staffRes = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT COUNT(DISTINCT user_id) as cnt FROM user_profile WHERE user_group_id != 1 AND is_disabled = 0 AND is_deleted = 0`
      );
      totalStaff = Number(staffRes[0]?.cnt || 0);

      const custRes = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT COUNT(DISTINCT user_id) as cnt FROM user_profile WHERE user_group_id = 1 AND is_disabled = 0 AND is_deleted = 0`
      );
      totalCustomers = Number(custRes[0]?.cnt || 0);
    } catch (err) {
      this.fastify.log.error(err, 'Failed to query total staff/customer stats');
    }

    try {
      const orderRes = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as cnt FROM \`order\` WHERE order_state = 'Completed'`
      );
      totalCompletedOrders = Number(orderRes[0]?.cnt || 0);
    } catch (err) {
      this.fastify.log.error(err, 'Failed to query total completed orders stats');
    }

    return {
      totalBranches,
      activeBranches,
      inactiveBranches,
      totalStaff,
      totalCustomers,
      totalCompletedOrders,
    };
  }

  /**
   * Create a new branch in CRM DB and sync to Legacy DB client_store_language.
   */

  async createBranch(dto: CreateBranchDto): Promise<CrmBranch> {
    const existingCode = await this.fastify.prisma.crm.crmStore.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new Error(`Mã chi nhánh '${dto.code}' đã tồn tại trong hệ thống.`);
    }

    // Determine new legacy_client_store_id
    let legacyStoreId: number | null = null;
    try {
      const maxStoreId = await this.fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT MAX(client_store_id) as max_id FROM client_store_language`
      );
      legacyStoreId = (Number(maxStoreId[0]?.max_id) || 0) + 1;
    } catch (err) {
      this.fastify.log.error(err, 'Failed to calculate new legacy client_store_id');
    }

    const created = await this.fastify.prisma.crm.crmStore.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        nameEn: dto.nameEn ? dto.nameEn.trim() : dto.name.trim(),
        storeType: dto.storeType || 'SALON',
        addressMap: dto.addressMap ? dto.addressMap.trim() : null,
        addressSms: dto.addressSms ? dto.addressSms.trim() : null,
        addressWeb: dto.addressWeb ? dto.addressWeb.trim() : null,
        addressCity: dto.addressCity ? dto.addressCity.trim() : null,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        legacyClientStoreId: legacyStoreId,
        notes: dto.notes ? dto.notes.trim() : null,
      },
    });

    // Sync to Legacy DB client_store_language for language_id = 1 (VI) and language_id = 2 (EN)
    if (legacyStoreId) {
      try {
        await this.fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO client_store_language (language_id, client_store_id, client_store_name, client_store_address_map, client_store_address_sms, client_store_address_web, client_store_address_city)
           VALUES 
           (1, ?, ?, ?, ?, ?, ?),
           (2, ?, ?, ?, ?, ?, ?)`,
          legacyStoreId,
          created.name,
          created.addressMap || '',
          created.addressSms || '',
          created.addressWeb || '',
          created.addressCity || '',
          legacyStoreId,
          created.nameEn || created.name,
          created.addressMap || '',
          created.addressSms || '',
          created.addressWeb || '',
          created.addressCity || ''
        );
      } catch (err) {
        this.fastify.log.error(err, 'Failed to sync created store to legacy client_store_language');
      }
    }

    return (
      (await this.getBranchById(created.id)) || {
        id: created.id,
        code: created.code,
        name: created.name,
        nameEn: created.nameEn,
        storeType: (created.storeType as BranchType) || 'SALON',
        addressMap: created.addressMap,
        addressSms: created.addressSms,
        addressWeb: created.addressWeb,
        addressCity: created.addressCity,
        sortOrder: created.sortOrder,
        isActive: Boolean(created.isActive),
        legacyClientStoreId: created.legacyClientStoreId,
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      }
    );
  }

  /**
   * Update an existing branch in CRM DB and sync to Legacy DB client_store_language.
   */
  async updateBranch(id: number, dto: UpdateBranchDto): Promise<CrmBranch> {
    const existing = await this.fastify.prisma.crm.crmStore.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Chi nhánh ID #${id} không tồn tại.`);
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await this.fastify.prisma.crm.crmStore.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (codeCheck && codeCheck.id !== id) {
        throw new Error(`Mã chi nhánh '${dto.code}' đã được sử dụng.`);
      }
    }

    const updated = await this.fastify.prisma.crm.crmStore.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn ? dto.nameEn.trim() : null } : {}),
        ...(dto.storeType ? { storeType: dto.storeType } : {}),
        ...(dto.addressMap !== undefined ? { addressMap: dto.addressMap ? dto.addressMap.trim() : null } : {}),
        ...(dto.addressSms !== undefined ? { addressSms: dto.addressSms ? dto.addressSms.trim() : null } : {}),
        ...(dto.addressWeb !== undefined ? { addressWeb: dto.addressWeb ? dto.addressWeb.trim() : null } : {}),
        ...(dto.addressCity !== undefined ? { addressCity: dto.addressCity ? dto.addressCity.trim() : null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ? dto.notes.trim() : null } : {}),
      },
    });

    // Sync updates to Legacy DB client_store_language
    if (updated.legacyClientStoreId) {
      try {
        await this.fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE client_store_language 
           SET client_store_name = ?, 
               client_store_address_map = ?, 
               client_store_address_sms = ?, 
               client_store_address_web = ?, 
               client_store_address_city = ?
           WHERE client_store_id = ? AND language_id = 1`,
          updated.name,
          updated.addressMap || '',
          updated.addressSms || '',
          updated.addressWeb || '',
          updated.addressCity || '',
          updated.legacyClientStoreId
        );

        await this.fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE client_store_language 
           SET client_store_name = ?, 
               client_store_address_map = ?, 
               client_store_address_sms = ?, 
               client_store_address_web = ?, 
               client_store_address_city = ?
           WHERE client_store_id = ? AND language_id = 2`,
          updated.nameEn || updated.name,
          updated.addressMap || '',
          updated.addressSms || '',
          updated.addressWeb || '',
          updated.addressCity || '',
          updated.legacyClientStoreId
        );

        // Also sync is_disabled status to legacy client_store master table
        await this.fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE client_store SET is_disabled = ? WHERE id = ?`,
          updated.isActive ? 0 : 1,
          updated.legacyClientStoreId
        );
      } catch (err) {
        this.fastify.log.error(err, 'Failed to sync updated store to legacy client_store_language');
      }
    }

    const detail = await this.getBranchById(updated.id);
    return (
      detail || {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        nameEn: updated.nameEn,
        storeType: (updated.storeType as BranchType) || 'SALON',
        addressMap: updated.addressMap,
        addressSms: updated.addressSms,
        addressWeb: updated.addressWeb,
        addressCity: updated.addressCity,
        sortOrder: updated.sortOrder,
        isActive: Boolean(updated.isActive),
        legacyClientStoreId: updated.legacyClientStoreId,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      }
    );
  }

  /**
   * Toggle branch active status (Soft-delete protection as per /grill-me agreement).
   */
  async toggleActiveBranch(id: number): Promise<CrmBranch> {
    const existing = await this.fastify.prisma.crm.crmStore.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Chi nhánh ID #${id} không tồn tại.`);
    }

    return this.updateBranch(id, { isActive: !existing.isActive });
  }
}
