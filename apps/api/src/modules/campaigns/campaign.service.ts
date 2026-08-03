import { FastifyInstance } from 'fastify';
import {
  Campaign,
  CampaignCustomer,
  CampaignPromotion,
  CampaignPromotionType,
  CampaignStatsResponse,
  CampaignStatus,
  CampaignTouchpoint,
  CampaignTouchpointLog,
  CreateCampaignDto,
  CreateCampaignPromotionDto,
  CustomerCampaignPromotionInfo,
  ListCampaignsParams,
  ToggleCampaignTouchpointLogDto,
  UpdateCampaignDto,
} from '@mos-lab/shared';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export class CampaignService {
  /**
   * List custom campaigns with stats summary.
   */
  static async listCampaigns(
    fastify: FastifyInstance,
    params: ListCampaignsParams = {}
  ): Promise<{
    items: Campaign[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    const { status, search, page = 1, pageSize = 20 } = params;
    const pageNum = Number(page) || 1;
    const limitNum = Number(pageSize) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search && search.trim() !== '') {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { slug: { contains: trimmed } },
        { description: { contains: trimmed } },
      ];
    }

    const [total, campaigns] = await Promise.all([
      fastify.prisma.crm.crmCustomCampaign.count({ where }),
      fastify.prisma.crm.crmCustomCampaign.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
          touchpoints: { orderBy: { sortOrder: 'asc' } },
          promotions: true,
          _count: {
            select: {
              customers: { where: { removedAt: null } },
              touchpoints: true,
              promotions: true,
            },
          },
        },
      }),
    ]);

    const items: Campaign[] = campaigns.map((c) => {
      let assignedStaffIds: number[] = [];
      if ((c as any).assignedStaffIds) {
        try {
          assignedStaffIds = JSON.parse((c as any).assignedStaffIds);
        } catch {}
      }
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || null,
        startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
        endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
        status: c.status as CampaignStatus,
        createdBy: c.createdBy,
        assignedStaffIds,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        _count: {
          customers: c._count.customers,
          touchpoints: c._count.touchpoints,
          promotions: c._count.promotions,
        },
      };
    });

    return {
      items,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Get single campaign by ID.
   */
  static async getCampaignById(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    return this.mapCampaignToDto(campaign);
  }

  /**
   * Get single campaign by Slug.
   */
  static async getCampaignBySlug(fastify: FastifyInstance, slug: string): Promise<any> {
    const raw = (slug || '').trim();
    const clean = slugify(raw);
    const bare = raw.replace(/^-+|-+$/g, '');
    const numericId = !isNaN(Number(raw)) ? parseInt(raw, 10) : null;

    let campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
      where: {
        OR: [
          { slug: raw },
          { slug: clean },
          { slug: bare },
          { slug: `-${clean}` },
          { slug: `-${bare}` },
          ...(numericId !== null ? [{ id: numericId }] : []),
        ],
      },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    if (!campaign && clean) {
      campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
        where: {
          slug: { contains: clean },
        },
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
          touchpoints: { orderBy: { sortOrder: 'asc' } },
          promotions: true,
          _count: {
            select: {
              customers: { where: { removedAt: null } },
              touchpoints: true,
              promotions: true,
            },
          },
        },
      });
    }

    if (!campaign) {
      throw new Error(`Chiến dịch slug "${slug}" không tồn tại`);
    }

    return this.mapCampaignToDto(campaign);
  }

  /**
   * Create custom campaign.
   * If no touchpoints provided, creates default touchpoint pipeline ("Tất cả chạm", 24h, Dặm mi 17d, Dặm mi 25d).
   */
  static async createCampaign(fastify: FastifyInstance, dto: CreateCampaignDto, staffId: number): Promise<any> {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Tên chiến dịch không được để trống');
    }

    let slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    if (!slug) {
      slug = `campaign-${Date.now()}`;
    }

    // Check slug uniqueness
    const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { slug },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    // Touchpoints input from DTO (empty array if not provided)
    const touchpointsRaw = dto.touchpoints || [];

    // Deduplicate & sanitize touchpoint keys
    const usedKeys = new Set<string>();
    const touchpointsInput = touchpointsRaw.map((tp: any, idx: number) => {
      let rawKey = tp.key ? slugify(tp.key) : `tp_${idx + 1}`;
      if (!rawKey) rawKey = `tp_${idx + 1}`;

      let finalKey = rawKey;
      let counter = 1;
      while (usedKeys.has(finalKey)) {
        finalKey = `${rawKey}_${counter}`;
        counter++;
      }
      usedKeys.add(finalKey);

      return {
        ...tp,
        key: finalKey,
      };
    });

    let validStaffId: number | null = null;
    if (staffId) {
      const staffExists = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: staffId },
        select: { id: true },
      });
      if (staffExists) {
        validStaffId = staffId;
      }
    }

    const created = await fastify.prisma.crm.$transaction(async (tx) => {
      const campaign = await tx.crmCustomCampaign.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description || null,
          startDate,
          endDate,
          status: 'ACTIVE',
          createdBy: validStaffId,
          assignedStaffIds:
            dto.assignedStaffIds && Array.isArray(dto.assignedStaffIds) && dto.assignedStaffIds.length > 0
              ? JSON.stringify(dto.assignedStaffIds)
              : null,
        },
      });

      // Create touchpoints
      for (let i = 0; i < touchpointsInput.length; i++) {
        const tp = touchpointsInput[i];
        await tx.crmCampaignTouchpoint.create({
          data: {
            campaignId: campaign.id,
            key: tp.key,
            label: tp.label,
            icon: tp.icon || null,
            daysMin: tp.daysMin,
            daysMax: tp.daysMax ?? null,
            color: tp.color || 'blue',
            sortOrder: tp.sortOrder ?? i + 1,
          },
        });
      }

      // Create promotions if provided
      if (dto.promotions && dto.promotions.length > 0) {
        for (const p of dto.promotions) {
          await tx.crmCampaignPromotion.create({
            data: {
              campaignId: campaign.id,
              name: p.name,
              code: p.code || null,
              type: p.type,
              value: p.value,
              description: p.description || null,
              isActive: true,
            },
          });
        }
      }

      return tx.crmCustomCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
          touchpoints: { orderBy: { sortOrder: 'asc' } },
          promotions: true,
          _count: {
            select: {
              customers: { where: { removedAt: null } },
              touchpoints: true,
              promotions: true,
            },
          },
        },
      });
    });

    return this.mapCampaignToDto(created);
  }

  /**
   * Update campaign metadata, status, touchpoints, promotions.
   */
  static async updateCampaign(fastify: FastifyInstance, id: number, dto: UpdateCampaignDto): Promise<any> {
    const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.assignedStaffIds !== undefined) {
      updateData.assignedStaffIds =
        dto.assignedStaffIds && Array.isArray(dto.assignedStaffIds) && dto.assignedStaffIds.length > 0
          ? JSON.stringify(dto.assignedStaffIds)
          : null;
    }

    if (dto.slug !== undefined || dto.name !== undefined) {
      let targetSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name || existing.name);
      if (!targetSlug) targetSlug = `campaign-${id}`;

      let uniqueSlug = targetSlug;
      let counter = 1;
      while (true) {
        const conflict = await fastify.prisma.crm.crmCustomCampaign.findFirst({
          where: {
            slug: uniqueSlug,
            NOT: { id },
          },
        });
        if (!conflict) break;
        uniqueSlug = `${targetSlug}-${counter}`;
        counter++;
      }
      updateData.slug = uniqueSlug;
    }

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCustomCampaign.update({
        where: { id },
        data: updateData,
      });

      if (dto.touchpoints) {
        const keptIds: number[] = [];
        const keptKeys: string[] = [];

        for (let i = 0; i < dto.touchpoints.length; i++) {
          const tp = dto.touchpoints[i];
          const targetId = (tp as any).id;
          const rawKey = tp.key ? tp.key.trim() : targetId ? `tp_${targetId}` : `step_${i + 1}`;

          if (targetId) {
            const existingTp = await tx.crmCampaignTouchpoint.findUnique({ where: { id: targetId } });
            if (existingTp) {
              await tx.crmCampaignTouchpoint.update({
                where: { id: targetId },
                data: {
                  label: tp.label,
                  icon: tp.icon || null,
                  daysMin: tp.daysMin,
                  daysMax: tp.daysMax ?? null,
                  color: tp.color || 'blue',
                  sortOrder: tp.sortOrder ?? i + 1,
                },
              });
              keptIds.push(targetId);
              keptKeys.push(existingTp.key);
              continue;
            }
          }

          const upserted = await tx.crmCampaignTouchpoint.upsert({
            where: {
              campaignId_key: {
                campaignId: id,
                key: rawKey,
              },
            },
            update: {
              label: tp.label,
              icon: tp.icon || null,
              daysMin: tp.daysMin,
              daysMax: tp.daysMax ?? null,
              color: tp.color || 'blue',
              sortOrder: tp.sortOrder ?? i + 1,
            },
            create: {
              campaignId: id,
              key: rawKey,
              label: tp.label,
              icon: tp.icon || null,
              daysMin: tp.daysMin,
              daysMax: tp.daysMax ?? null,
              color: tp.color || 'blue',
              sortOrder: tp.sortOrder ?? i + 1,
            },
          });
          keptIds.push(upserted.id);
          keptKeys.push(upserted.key);
        }

        // Delete touchpoints for this campaign that were removed on the UI (only if no customer logs exist)
        const toDelete = await tx.crmCampaignTouchpoint.findMany({
          where: {
            campaignId: id,
            id: { notIn: keptIds },
          },
          include: {
            _count: { select: { logs: true } },
          },
        });

        for (const item of toDelete) {
          if (item._count.logs === 0) {
            await tx.crmCampaignTouchpoint.delete({ where: { id: item.id } });
          } else {
            console.warn(`Touchpoint ${item.id} (${item.label}) has ${item._count.logs} logs, skipping delete.`);
          }
        }
      }

      if (dto.promotions) {
        await tx.crmCampaignPromotion.deleteMany({
          where: { campaignId: id },
        });

        for (const p of dto.promotions) {
          await tx.crmCampaignPromotion.create({
            data: {
              campaignId: id,
              name: p.name,
              code: p.code || null,
              type: p.type,
              value: p.value,
              description: p.description || null,
              isActive: true,
            },
          });
        }
      }
    });

    const updated = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    return this.mapCampaignToDto(updated);
  }

  /**
   * Complete cleanup and deletion of custom campaign.
   */
  static async deleteCampaign(fastify: FastifyInstance, id: number): Promise<{ success: boolean; message: string }> {
    const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    const now = new Date();

    await fastify.prisma.crm.$transaction(async (tx) => {
      // 1. Find active allocation batches linked to campaign
      const activeBatches = await tx.crmAllocationBatch.findMany({
        where: {
          campaignId: id,
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        include: { items: true },
      });

      // 2. Find active campaign customers
      const campaignCustomers = await tx.crmCampaignCustomer.findMany({
        where: {
          campaignId: id,
          removedAt: null,
        },
      });

      // Collect customer IDs from campaign customers and active batch items
      const customerIdsSet = new Set<number>();
      for (const cc of campaignCustomers) {
        customerIdsSet.add(cc.legacyUserId);
      }
      for (const batch of activeBatches) {
        for (const item of batch.items) {
          customerIdsSet.add(item.customerId);
        }
      }
      const customerIds = Array.from(customerIdsSet);

      // 3. Find active customer assignments and log history expiration entries
      if (customerIds.length > 0) {
        const activeAssignments = await tx.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: customerIds } },
        });

        const customerBatchMap = new Map<number, { batchCode: string; assignerId: number }>();
        for (const batch of activeBatches) {
          for (const item of batch.items) {
            customerBatchMap.set(item.customerId, {
              batchCode: batch.batchCode,
              assignerId: batch.assignerId,
            });
          }
        }

        for (const assignment of activeAssignments) {
          const batchInfo = customerBatchMap.get(assignment.legacyUserId);
          const batchId = batchInfo?.batchCode || `campaign_${id}`;
          const assignedBy = assignment.assignedBy || batchInfo?.assignerId || existing.createdBy || 1;

          await tx.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: assignment.legacyUserId,
              prevStaffId: assignment.staffId,
              newStaffId: null,
              assignedBy,
              actionType: 'EXPIRED',
              reason: `Chiến dịch ${existing.name} đã kết thúc`,
            },
          });
        }

        // Delete active customer assignments
        if (activeAssignments.length > 0) {
          await tx.crmCustomerAssignment.deleteMany({
            where: { legacyUserId: { in: activeAssignments.map((a) => a.legacyUserId) } },
          });
        }
      }

      // 4. Expire active allocation batches and items
      for (const batch of activeBatches) {
        await tx.crmAllocationBatch.update({
          where: { id: batch.id },
          data: { status: 'EXPIRED' },
        });

        await tx.crmAllocationBatchItem.updateMany({
          where: { batchId: batch.id },
          data: { status: 'EXPIRED' },
        });
      }

      // 5. Mark removedAt on campaign customers
      await tx.crmCampaignCustomer.updateMany({
        where: {
          campaignId: id,
          removedAt: null,
        },
        data: {
          removedAt: now,
          removedReason: `Chiến dịch ${existing.name} đã kết thúc`,
        },
      });

      // 6. Delete campaign record
      await tx.crmCustomCampaign.delete({
        where: { id },
      });
    });

    return {
      success: true,
      message: 'Đã xóa chiến dịch thành công',
    };
  }

  /**
   * End campaign: mark status as 'ENDED', expire associated active batch allocation assignments,
   * release unbooked customers back to NYC main pool while preserving participation logs,
   * and log assignment history expiration entries.
   */
  static async endCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    const now = new Date();

    await fastify.prisma.crm.$transaction(async (tx) => {
      // 1. Find active allocation batches linked to campaign
      const activeBatches = await tx.crmAllocationBatch.findMany({
        where: {
          campaignId: id,
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        include: { items: true },
      });

      // 2. Find active campaign customers
      const campaignCustomers = await tx.crmCampaignCustomer.findMany({
        where: {
          campaignId: id,
          removedAt: null,
        },
      });

      // Collect customer IDs from campaign customers and active batch items
      const customerIdsSet = new Set<number>();
      for (const cc of campaignCustomers) {
        customerIdsSet.add(cc.legacyUserId);
      }
      for (const batch of activeBatches) {
        for (const item of batch.items) {
          customerIdsSet.add(item.customerId);
        }
      }
      const customerIds = Array.from(customerIdsSet);

      // 3. Find active customer assignments and log history expiration entries
      if (customerIds.length > 0) {
        const activeAssignments = await tx.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: customerIds } },
        });

        const customerBatchMap = new Map<number, { batchCode: string; assignerId: number }>();
        for (const batch of activeBatches) {
          for (const item of batch.items) {
            customerBatchMap.set(item.customerId, {
              batchCode: batch.batchCode,
              assignerId: batch.assignerId,
            });
          }
        }

        for (const assignment of activeAssignments) {
          const batchInfo = customerBatchMap.get(assignment.legacyUserId);
          const batchId = batchInfo?.batchCode || `campaign_${id}`;
          const assignedBy = assignment.assignedBy || batchInfo?.assignerId || campaign.createdBy || 1;

          await tx.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: assignment.legacyUserId,
              prevStaffId: assignment.staffId,
              newStaffId: null,
              assignedBy,
              actionType: 'EXPIRED',
              reason: `Chiến dịch ${campaign.name} đã kết thúc`,
            },
          });
        }

        // Delete active customer assignments
        if (activeAssignments.length > 0) {
          await tx.crmCustomerAssignment.deleteMany({
            where: { legacyUserId: { in: activeAssignments.map((a) => a.legacyUserId) } },
          });
        }
      }

      // 4. Expire active allocation batches and items
      for (const batch of activeBatches) {
        await tx.crmAllocationBatch.update({
          where: { id: batch.id },
          data: { status: 'EXPIRED' },
        });

        await tx.crmAllocationBatchItem.updateMany({
          where: { batchId: batch.id },
          data: { status: 'EXPIRED' },
        });
      }

      // 5. Release unbooked customers back to NYC pool by updating removedAt while preserving logs
      await tx.crmCampaignCustomer.updateMany({
        where: {
          campaignId: id,
          removedAt: null,
        },
        data: {
          removedAt: now,
          removedReason: `Chiến dịch ${campaign.name} đã kết thúc`,
        },
      });

      // 6. Mark campaign status as ENDED
      await tx.crmCustomCampaign.update({
        where: { id },
        data: { status: 'ENDED', endDate: campaign.endDate || now },
      });
    });

    const updated = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    return this.mapCampaignToDto(updated);
  }

  /**
   * Fetch campaign customers with Booker filtering, search, pagination,
   * and touchpoint classification based on DATEDIFF(NOW(), cc.added_at).
   */
  static async getCampaignCustomers(
    fastify: FastifyInstance,
    campaignId: number,
    params: {
      bookerId?: number;
      assignedStaffId?: number;
      search?: string;
      touchpointKey?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    const { bookerId, assignedStaffId, search, touchpointKey, page = 1, pageSize = 20 } = params;
    const pageNum = Number(page) || 1;
    const limitNum = Number(pageSize) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Verify campaign exists
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      include: { touchpoints: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    const where: any = {
      campaignId,
      removedAt: null,
    };

    const campaignCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where,
      include: {
        touchpointLogs: {
          include: { touchpoint: true },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    if (campaignCustomers.length === 0) {
      return { items: [], total: 0, page: pageNum, pageSize: limitNum, pages: 0 };
    }

    const legacyUserIds = Array.from(
      new Set(campaignCustomers.map((cc) => Number(cc.legacyUserId)).filter((id) => !isNaN(id) && id > 0))
    );

    if (legacyUserIds.length === 0) {
      return { items: [], total: 0, page: pageNum, pageSize: limitNum, pages: 0 };
    }

    const idListStr = legacyUserIds.join(',');

    // Fetch customer profiles, contacts, assignments, pending allocation batch items, recent call logs, order stats, and visit dates
    const [
      profiles,
      contacts,
      assignments,
      pendingBatchItems,
      callLogs,
      orderStatsRows,
      lastVisitRows,
      latestBookingRows,
    ] = await Promise.all([
      fastify.prisma.legacy.user_profile.findMany({
        where: { user_id: { in: legacyUserIds } },
        select: { user_id: true, full_name: true, avatar: true, last_order_booking: true },
      }),
      fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: { in: legacyUserIds }, is_disabled: false },
        select: { user_id: true, phone_number: true },
      }),
      fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: legacyUserIds } },
        include: { staff: { select: { id: true, displayName: true, username: true } } },
      }),
      fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          customerId: { in: legacyUserIds },
          status: 'PENDING_ACCEPT',
          batch: { status: 'PENDING_ACCEPT' },
        },
        include: {
          batch: {
            include: {
              booker: { select: { id: true, displayName: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId: { in: legacyUserIds } },
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          user_id as userId,
          COALESCE(SUM(total_price), 0) as totalSpent,
          COUNT(id) as totalVisits
        FROM \`order\`
        WHERE user_id IN (${idListStr}) AND order_state = 'Completed'
        GROUP BY user_id
      `),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          o.user_id as userId,
          COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start)) as lastVisitDate,
          DATEDIFF(NOW(), COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start))) as daysSinceLastVisit
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.user_id IN (${idListStr}) AND o.order_state = 'Completed'
        GROUP BY o.user_id
      `),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          o.user_id as userId,
          o.booking_date_start as lastBookingDate,
          o.order_state as lastBookingState
        FROM \`order\` o
        INNER JOIN (
          SELECT user_id, MAX(id) as max_id
          FROM \`order\`
          WHERE user_id IN (${idListStr})
          GROUP BY user_id
        ) latest ON o.id = latest.max_id
      `),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const phoneMap = new Map(contacts.map((c) => [c.user_id, c.phone_number]));
    const assignmentMap = new Map(assignments.map((a) => [a.legacyUserId, a]));
    const pendingBatchMap = new Map(pendingBatchItems.map((item) => [item.customerId, item]));

    const orderStatsMap = new Map(orderStatsRows.map((r) => [Number(r.userId), Number(r.totalSpent || 0)]));
    const lastVisitMap = new Map(
      lastVisitRows.map((r) => [
        Number(r.userId),
        {
          lastVisitDate: r.lastVisitDate ? new Date(r.lastVisitDate).toISOString() : null,
          daysSinceLastVisit:
            r.daysSinceLastVisit !== null && r.daysSinceLastVisit !== undefined ? Number(r.daysSinceLastVisit) : null,
        },
      ])
    );
    const latestBookingMap = new Map(
      latestBookingRows.map((r) => [
        Number(r.userId),
        {
          lastBookingDate: r.lastBookingDate ? new Date(r.lastBookingDate).toISOString().replace('Z', '+07:00') : null,
          lastBookingState: r.lastBookingState,
        },
      ])
    );

    const callLogMap = new Map<number, any>();
    for (const log of callLogs) {
      if (!callLogMap.has(log.legacyUserId)) {
        callLogMap.set(log.legacyUserId, log);
      }
    }

    const now = new Date();

    // Enrich and filter customers
    let enriched = campaignCustomers.map((cc) => {
      const prof = profileMap.get(cc.legacyUserId);
      const phone = phoneMap.get(cc.legacyUserId) || null;
      const assignment = assignmentMap.get(cc.legacyUserId) || null;
      const pendingItem = pendingBatchMap.get(cc.legacyUserId) || null;
      const lastCall = callLogMap.get(cc.legacyUserId) || null;

      const orderSpent = orderStatsMap.get(cc.legacyUserId) || 0;
      const visitData = lastVisitMap.get(cc.legacyUserId);
      const bookingData = latestBookingMap.get(cc.legacyUserId);

      let daysSinceLastVisit = visitData?.daysSinceLastVisit ?? null;
      let lastVisit = visitData?.lastVisitDate ?? null;
      if (daysSinceLastVisit === null && prof?.last_order_booking) {
        const lastB = new Date(prof.last_order_booking);
        const diffMs = now.getTime() - lastB.getTime();
        daysSinceLastVisit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        lastVisit = lastB.toISOString();
      }

      const callbackDate = (lastCall as any)?.callbackDate
        ? new Date((lastCall as any).callbackDate).toISOString()
        : null;

      const staff = assignment?.staff || pendingItem?.batch?.booker || null;
      const isPendingAccept = !assignment && !!pendingItem;

      const addedAt = new Date(cc.addedAt);
      const diffMs = now.getTime() - addedAt.getTime();
      const daysInCampaign = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // Active touchpoints matching daysInCampaign
      const matchedTouchpoint = campaign.touchpoints.find((tp) => {
        if (tp.daysMax !== null && tp.daysMax !== undefined) {
          return daysInCampaign >= tp.daysMin && daysInCampaign <= tp.daysMax;
        }
        return daysInCampaign >= tp.daysMin;
      });

      const assignedAtIso = assignment?.assignedAt
        ? new Date(assignment.assignedAt).toISOString()
        : pendingItem?.createdAt
          ? new Date(pendingItem.createdAt).toISOString()
          : null;
      const assignedBookerName = staff
        ? (staff.displayName || staff.username || null) + (isPendingAccept ? ' (Chờ 24h)' : '')
        : null;

      const lastCallAt = lastCall ? lastCall.createdAt.toISOString() : null;
      const lastCallDuration = lastCall ? lastCall.durationSec || (lastCall as any).duration_sec || 0 : null;
      const lastCallResult = lastCall
        ? lastCall.callResult || (lastCall as any).call_result || (lastCall as any).status || null
        : null;
      const lastCallNote = lastCall ? lastCall.note || (lastCall as any).description || '' : null;

      return {
        id: cc.id,
        campaignId: cc.campaignId,
        legacyUserId: cc.legacyUserId,
        customerName: prof?.full_name || `Khách hàng #${cc.legacyUserId}`,
        customerPhone: phone,
        avatar: prof?.avatar || null,
        totalSpent: orderSpent,
        daysSinceLastVisit,
        lastVisit,
        lastBookingDate: bookingData?.lastBookingDate || null,
        lastBookingState: bookingData?.lastBookingState || null,
        callbackDate,
        addedAt: cc.addedAt.toISOString(),
        addedBy: cc.addedBy,
        daysInCampaign,
        currentTouchpointKey: matchedTouchpoint ? matchedTouchpoint.key : 'all',
        assignedBooker: staff ? { id: staff.id, name: staff.displayName || staff.username } : null,
        assignedBookerName,
        assignedAt: assignedAtIso,
        isPendingAccept,
        assignedStaff: staff
          ? {
              id: staff.id,
              displayName: staff.displayName || staff.username,
              assignedAt: assignedAtIso,
            }
          : null,
        lastCallAt,
        lastCallDuration,
        lastCallResult,
        lastCallNote,
        lastCall: lastCall
          ? {
              createdAt: lastCallAt,
              durationSec: lastCallDuration,
              callResult: lastCallResult,
              note: lastCallNote,
            }
          : null,
        touchpointLogs: cc.touchpointLogs.map((log) => ({
          id: log.id,
          touchpointId: log.touchpointId,
          touchpointKey: log.touchpoint?.key,
          touchpointLabel: log.touchpoint?.label,
          isChecked: log.isChecked,
          status: (log as any).status || (log.isChecked ? 'SUCCESS' : null),
          completedAt: log.completedAt ? log.completedAt.toISOString() : null,
          completedByStaffId: log.completedByStaffId,
          completedByStaffName: log.completedByStaffName,
          note: log.note,
        })),
      };
    });

    // Apply Booker filtering (supports both bookerId and assignedStaffId)
    const filterBookerId = bookerId || assignedStaffId;
    if (filterBookerId && String(filterBookerId) !== 'ALL') {
      const bId = Number(filterBookerId);
      enriched = enriched.filter((c) => {
        const staffId = c.assignedStaff?.id || c.assignedBooker?.id;
        return staffId === bId;
      });
    }

    // Apply search filter (name or phone)
    if (search && search.trim() !== '') {
      const searchLower = search.trim().toLowerCase();
      enriched = enriched.filter(
        (c) =>
          (c.customerName && c.customerName.toLowerCase().includes(searchLower)) ||
          (c.customerPhone && c.customerPhone.includes(searchLower)) ||
          String(c.legacyUserId).includes(searchLower)
      );
    }

    // Apply touchpointKey filter
    if (touchpointKey && touchpointKey.toLowerCase() !== 'all') {
      enriched = enriched.filter(
        (c) => c.currentTouchpointKey && c.currentTouchpointKey.toLowerCase() === touchpointKey.toLowerCase()
      );
    }

    const total = enriched.length;
    const paginated = enriched.slice(skip, skip + limitNum);

    return {
      items: paginated,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Exclusively add customers from NYC pool to campaign
   * (verifying customer is not already in another active campaign).
   */
  static async addCustomersToCampaign(
    fastify: FastifyInstance,
    campaignId: number,
    customerIds: number[],
    staffId: number
  ): Promise<{ success: boolean; message: string; addedCount: number; skippedCount: number }> {
    if (!customerIds || customerIds.length === 0) {
      throw new Error('Danh sách ID khách hàng không được để trống');
    }

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.status !== 'ACTIVE') {
      throw new Error('Chiến dịch không tồn tại hoặc không ở trạng thái HOẠT ĐỘNG');
    }

    const uniqueCustomerIds = Array.from(new Set(customerIds));

    // Check which customers are already in ANY active campaign and create inside a transaction
    return await fastify.prisma.crm.$transaction(async (tx) => {
      const activeAssignments = await tx.crmCampaignCustomer.findMany({
        where: {
          legacyUserId: { in: uniqueCustomerIds },
          removedAt: null,
          campaign: { status: 'ACTIVE' },
        },
        select: { legacyUserId: true, campaignId: true },
      });

      const activeUserSet = new Set(activeAssignments.map((a) => a.legacyUserId));

      const validCustomerIds = uniqueCustomerIds.filter((id) => !activeUserSet.has(id));
      const skippedCount = uniqueCustomerIds.length - validCustomerIds.length;

      if (validCustomerIds.length === 0) {
        throw new Error(`Tất cả ${uniqueCustomerIds.length} khách hàng đã thuộc chiến dịch khác đang hoạt động`);
      }

      const now = new Date();
      await tx.crmCampaignCustomer.createMany({
        data: validCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        })),
      });

      return {
        success: true,
        message: `Đã thêm thành công ${validCustomerIds.length} khách hàng vào chiến dịch${
          skippedCount > 0 ? ` (đã bỏ qua ${skippedCount} KH đang ở chiến dịch khác)` : ''
        }`,
        addedCount: validCustomerIds.length,
        skippedCount,
      };
    });
  }

  /**
   * Remove customer from campaign (set removedAt = NOW(), returning customer to NYC main pool).
   */
  static async removeCustomerFromCampaign(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    reason: string | undefined,
    staffId: number
  ): Promise<{ success: boolean; message: string }> {
    const record = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ legacyUserId: customerId }, { id: customerId }],
        removedAt: null,
      },
    });

    if (!record) {
      throw new Error('Khách hàng không ở trong chiến dịch này hoặc đã bị gỡ');
    }

    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.update({
        where: { id: record.id },
        data: {
          removedAt: now,
          removedReason: reason || 'Quản lý gỡ khỏi chiến dịch',
          removedBy: staffId,
        },
      });

      // Clear Booker assignment so customer returns to unassigned NYC main pool
      await tx.crmCustomerAssignment.deleteMany({
        where: { legacyUserId: record.legacyUserId },
      });
    });

    return {
      success: true,
      message: 'Đã gỡ khách hàng khỏi chiến dịch và trả về pool NYC',
    };
  }

  /**
   * Batch remove customers from campaign (set removedAt = NOW() and unassign Booker).
   */
  static async removeCustomersFromCampaignBatch(
    fastify: FastifyInstance,
    campaignId: number,
    customerIds: number[],
    reason: string | undefined,
    staffId: number
  ): Promise<{ success: boolean; removedCount: number; message: string }> {
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      throw new Error('Danh sách ID khách hàng không được để trống');
    }

    const records = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        OR: [{ legacyUserId: { in: customerIds } }, { id: { in: customerIds } }],
        removedAt: null,
      },
    });

    if (records.length === 0) {
      return {
        success: true,
        removedCount: 0,
        message: 'Không tìm thấy khách hàng hợp lệ để gỡ khỏi chiến dịch',
      };
    }

    const recordIds = records.map((r) => r.id);
    const legacyUserIds = Array.from(new Set(records.map((r) => r.legacyUserId)));
    const now = new Date();

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.updateMany({
        where: { id: { in: recordIds } },
        data: {
          removedAt: now,
          removedReason: reason || 'Quản lý gỡ hàng loạt khỏi chiến dịch',
          removedBy: staffId,
        },
      });

      // Clear Booker assignments so customers return to unassigned NYC main pool
      if (legacyUserIds.length > 0) {
        await tx.crmCustomerAssignment.deleteMany({
          where: { legacyUserId: { in: legacyUserIds } },
        });
      }
    });

    return {
      success: true,
      removedCount: recordIds.length,
      message: `Đã gỡ ${recordIds.length} khách hàng khỏi chiến dịch và trả về pool NYC`,
    };
  }

  /**
   * Upsert CrmCampaignTouchpointLog when a Booker or Admin toggles a touchpoint check mark.
   */
  static async toggleTouchpointLog(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    touchpointId: number,
    dto: ToggleCampaignTouchpointLogDto,
    staffId: number,
    staffName: string
  ): Promise<CampaignTouchpointLog> {
    const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ legacyUserId: customerId }, { id: customerId }],
        removedAt: null,
      },
    });

    if (!campaignCustomer) {
      throw new Error('Khách hàng không ở trong chiến dịch này');
    }

    const now = new Date();

    const finalStatus =
      dto.status === null || (dto.status as any) === '' ? null : dto.status || (dto.isChecked ? 'SUCCESS' : null);
    const finalIsChecked = finalStatus !== null || dto.isChecked;

    const log = await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
      where: {
        campaignCustomerId_touchpointId: {
          campaignCustomerId: campaignCustomer.id,
          touchpointId,
        },
      },
      update: {
        isChecked: finalIsChecked,
        status: finalStatus,
        completedAt: now,
        completedByStaffId: staffId,
        completedByStaffName: staffName,
        note: dto.note || null,
      },
      create: {
        campaignCustomerId: campaignCustomer.id,
        touchpointId,
        isChecked: finalIsChecked,
        status: finalStatus,
        completedAt: now,
        completedByStaffId: staffId,
        completedByStaffName: staffName,
        note: dto.note || null,
      },
    });

    if (dto.callbackDate && !isNaN(new Date(dto.callbackDate).getTime())) {
      const cbDate = new Date(dto.callbackDate);
      try {
        await fastify.prisma.crm.crmDailyPlan.upsert({
          where: {
            legacyUserId_plannedDate: {
              legacyUserId: campaignCustomer.legacyUserId,
              plannedDate: cbDate,
            },
          },
          create: {
            legacyUserId: campaignCustomer.legacyUserId,
            staffId,
            plannedDate: cbDate,
            bucket: 'CAMPAIGN_CALLBACK',
            priority: 1,
            status: 'PLANNED',
          },
          update: {
            staffId,
            status: 'PLANNED',
          },
        });
      } catch (e) {
        fastify.log.error(e, 'Failed to upsert daily plan for campaign touchpoint callback');
      }
    }

    return {
      id: log.id,
      campaignCustomerId: log.campaignCustomerId,
      touchpointId: log.touchpointId,
      isChecked: log.isChecked,
      status: (log.status as any) || (log.isChecked ? 'SUCCESS' : null),
      completedAt: log.completedAt ? log.completedAt.toISOString() : null,
      completedByStaffId: log.completedByStaffId,
      completedByStaffName: log.completedByStaffName,
      note: log.note,
    };
  }

  /**
   * Fetch active promotions for campaign.
   */
  static async getCampaignPromotions(fastify: FastifyInstance, campaignId: number): Promise<CampaignPromotion[]> {
    const promotions = await fastify.prisma.crm.crmCampaignPromotion.findMany({
      where: {
        campaignId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => ({
      id: p.id,
      campaignId: p.campaignId,
      name: p.name,
      code: p.code,
      type: p.type as any,
      value: p.value,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /**
   * Create promotion for campaign.
   */
  static async createPromotion(
    fastify: FastifyInstance,
    campaignId: number,
    dto: CreateCampaignPromotionDto
  ): Promise<CampaignPromotion> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    const promotion = await fastify.prisma.crm.crmCampaignPromotion.create({
      data: {
        campaignId,
        name: dto.name.trim(),
        code: dto.code || null,
        type: dto.type,
        value: dto.value,
        description: dto.description || null,
        isActive: true,
      },
    });

    return {
      id: promotion.id,
      campaignId: promotion.campaignId,
      name: promotion.name,
      code: promotion.code,
      type: promotion.type as any,
      value: promotion.value,
      description: promotion.description,
      isActive: promotion.isActive,
      createdAt: promotion.createdAt.toISOString(),
    };
  }

  /**
   * Delete / deactivate promotion for campaign.
   */
  static async deletePromotion(
    fastify: FastifyInstance,
    campaignId: number,
    promotionId: number
  ): Promise<{ success: boolean; message: string }> {
    const promotion = await fastify.prisma.crm.crmCampaignPromotion.findFirst({
      where: { id: promotionId, campaignId },
    });

    if (!promotion) {
      throw new Error('Ưu đãi khuyến mãi không tồn tại trong chiến dịch này');
    }

    await fastify.prisma.crm.crmCampaignPromotion.delete({
      where: { id: promotionId },
    });

    return {
      success: true,
      message: 'Đã xóa ưu đãi khuyến mãi khỏi chiến dịch',
    };
  }

  /**
   * Header metrics for campaign (total customers, booked count, booked rate, touchpoint logs count, revenue).
   */
  static async getCampaignStats(fastify: FastifyInstance, campaignId: number): Promise<CampaignStatsResponse> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    // Active customers in campaign
    const customers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: { campaignId, removedAt: null },
      select: { id: true, legacyUserId: true, addedAt: true },
    });

    const totalCustomers = customers.length;
    if (totalCustomers === 0) {
      return {
        totalCustomers: 0,
        bookedCount: 0,
        bookedRate: 0,
        totalTouchpointLogs: 0,
        totalCallsToday: 0,
        campaignRevenue: 0,
      };
    }

    const customerIds = customers.map((c) => c.legacyUserId);
    const campaignCustomerIds = customers.map((c) => c.id);

    // Calculate completed bookings and revenue for campaign customers after addedAt
    const orders = await fastify.prisma.legacy.order.findMany({
      where: {
        user_id: { in: customerIds },
        order_state: 'Completed',
      },
      select: { user_id: true, total_price: true, date_created: true },
    });

    const customerAddedMap = new Map(customers.map((c) => [c.legacyUserId, c.addedAt]));

    const bookedUserSet = new Set<number>();
    let campaignRevenue = 0;

    for (const o of orders) {
      const addedAt = customerAddedMap.get(o.user_id);
      if (addedAt && o.date_created && new Date(o.date_created) >= addedAt) {
        bookedUserSet.add(o.user_id);
        campaignRevenue += o.total_price || 0;
      }
    }

    const bookedCount = bookedUserSet.size;
    const bookedRate = totalCustomers > 0 ? Number(((bookedCount / totalCustomers) * 100).toFixed(1)) : 0;

    // Total touchpoint logs count
    const totalTouchpointLogs = await fastify.prisma.crm.crmCampaignTouchpointLog.count({
      where: {
        campaignCustomerId: { in: campaignCustomerIds },
        isChecked: true,
      },
    });

    // Total calls today for campaign customers
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalCallsToday = await fastify.prisma.crm.crmCallLog.count({
      where: {
        legacyUserId: { in: customerIds },
        createdAt: { gte: todayStart },
      },
    });

    return {
      totalCustomers,
      bookedCount,
      bookedRate,
      totalTouchpointLogs,
      totalCallsToday,
      campaignRevenue: Math.round(campaignRevenue),
    };
  }

  private static mapCampaignToDto(c: any): any {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : null,
      endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : null,
      status: c.status as CampaignStatus,
      createdBy: c.createdBy,
      assignedStaffIds: c.assignedStaffIds
        ? typeof c.assignedStaffIds === 'string'
          ? JSON.parse(c.assignedStaffIds) || []
          : c.assignedStaffIds
        : [],
      creatorName: c.creator?.displayName || c.creator?.username || null,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
      touchpoints: (c.touchpoints || []).map((tp: any) => ({
        id: tp.id,
        campaignId: tp.campaignId,
        key: tp.key,
        label: tp.label,
        icon: tp.icon,
        daysMin: tp.daysMin,
        daysMax: tp.daysMax,
        color: tp.color,
        sortOrder: tp.sortOrder,
      })),
      promotions: (c.promotions || []).map((p: any) => ({
        id: p.id,
        campaignId: p.campaignId,
        name: p.name,
        code: p.code,
        type: p.type,
        value: p.value,
        description: p.description,
        isActive: p.isActive,
        createdAt: new Date(p.createdAt).toISOString(),
      })),
      _count: c._count
        ? {
            customers: c._count.customers,
            touchpoints: c._count.touchpoints,
            promotions: c._count.promotions,
          }
        : undefined,
    };
  }

  /**
   * Fetch active campaign promotion information for a customer.
   */
  static async getCustomerActivePromotions(
    fastify: FastifyInstance,
    legacyUserId: number
  ): Promise<CustomerCampaignPromotionInfo[]> {
    const memberships = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        legacyUserId,
        removedAt: null,
        campaign: {
          status: 'ACTIVE',
        },
      },
      include: {
        campaign: {
          include: {
            promotions: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return memberships
      .filter((m) => m.campaign && m.campaign.promotions && m.campaign.promotions.length > 0)
      .map((m) => ({
        campaignId: m.campaign.id,
        campaignName: m.campaign.name,
        campaignSlug: m.campaign.slug,
        promotions: m.campaign.promotions.map((p) => {
          let label = p.name;
          if (p.type === 'PERCENT_DISCOUNT') {
            label = p.value > 0 ? `Giảm ${p.value}%` : p.name;
          } else if (p.type === 'FIXED_DISCOUNT') {
            label = p.value > 0 ? `Giảm ${p.value.toLocaleString('vi-VN')}đ` : p.name;
          } else if (p.type === 'FREE_SERVICE') {
            label = p.description && p.description.trim() ? p.description : `Tặng dịch vụ ${p.name}`;
          } else if (p.type === 'FREE_PRODUCT') {
            label = p.description && p.description.trim() ? p.description : `Tặng sản phẩm ${p.name}`;
          }
          return {
            id: p.id,
            campaignId: p.campaignId,
            name: p.name,
            code: p.code,
            type: p.type as CampaignPromotionType,
            value: p.value,
            description: p.description,
            isActive: p.isActive,
            label,
          };
        }),
      }));
  }
}
