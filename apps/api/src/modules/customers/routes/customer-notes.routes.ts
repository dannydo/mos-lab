import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { createRouteHelpers } from './helpers.js';

export async function registerCustomerNotesRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // POST /api/customers/:id/notes
  // Create a new note for a customer in user_note table
  fastify.post('/customers/:id/notes', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { note, noteFieldKey, isSticky } = request.body as {
      note: string;
      noteFieldKey: 'note' | 'order_note';
      isSticky?: boolean;
    };

    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    if (!note || !note.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Nội dung ghi chú là bắt buộc' });
    }

    try {
      const user = request.user as { id: number };

      // Get the legacyStaffId of the logged-in CRM staff
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true },
      });

      const staffId = crmStaff?.legacyStaffId || 0;
      const groupKey = Math.floor(Date.now() / 1000).toString();
      const isDisabled = noteFieldKey === 'order_note' ? 1 : 0;
      const deptOptionId = noteFieldKey === 'order_note' ? 120 : 119;

      await fastify.prisma.legacy.$transaction(async (tx) => {
        // Insert into user_note raw table with attribute_group_key and proper is_disabled flag
        await tx.$executeRawUnsafe(
          `INSERT INTO user_note (client_id, client_business_id, user_id, note, note_field_key, attribute_group_key, is_sticky, is_issue, created_staff_id, is_disabled, date_created)
           VALUES (11, 1, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
          customerId,
          note.trim(),
          noteFieldKey || 'note',
          groupKey,
          isSticky ? 1 : 0,
          staffId,
          isDisabled
        );

        const lastIdResult = await tx.$queryRawUnsafe<Array<{ id: number | bigint }>>('SELECT LAST_INSERT_ID() as id');
        const newNoteId = Number(lastIdResult[0]?.id);

        if (newNoteId) {
          // Insert matching legacy attribute values for Warning Type (Normal) and Department (Note/Booking)
          await tx.$executeRawUnsafe(
            `INSERT INTO item_attribute_value (client_id, client_business_id, type, item_id, attribute_id, attribute_option_id, attribute_option_value, group_key, date_created)
             VALUES 
             (11, 1, 'user-note-attribute', ?, 23, 116, '', ?, NOW()),
             (11, 1, 'user-note-attribute', ?, 24, ?, '', ?, NOW())`,
            newNoteId,
            groupKey,
            newNoteId,
            deptOptionId,
            groupKey
          );
        }
      });

      return reply.send({ success: true, message: 'Thêm ghi chú thành công' });
    } catch (err: SafeAny) {
      fastify.log.error(err, `Create customer note error for customer ${customerId}:`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể tạo ghi chú cho khách hàng.',
      });
    }
  });

  // POST /api/customers/:id/notes/:noteId/unpin
  // Unpin a customer note (admin/super_admin/manager)
  fastify.post('/customers/:id/notes/:noteId/unpin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, noteId } = request.params as { id: string; noteId: string };
    const user = request.user as { id: number; role: string };

    if (!isAdminOrSuperAdminRole(user.role) && user.role !== 'manager') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên hoặc quản lý mới được phép bỏ ghim ghi chú.' });
    }

    const customerId = parseInt(id, 10);
    const parsedNoteId = parseInt(noteId, 10);
    if (isNaN(customerId) || isNaN(parsedNoteId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Tham số không hợp lệ.' });
    }

    try {
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_note SET is_sticky = 0 WHERE id = ? AND user_id = ?`,
        parsedNoteId,
        customerId
      );

      return reply.send({ success: true, message: 'Bỏ ghim ghi chú thành công' });
    } catch (err: SafeAny) {
      fastify.log.error(err, `Unpin customer note error for customer ${customerId}, note ${parsedNoteId}:`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể bỏ ghim ghi chú.',
      });
    }
  });

  // POST /api/customers/:id/notes/:noteId/pin
  // Pin a customer note (admin/super_admin/manager)
  fastify.post('/customers/:id/notes/:noteId/pin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, noteId } = request.params as { id: string; noteId: string };
    const user = request.user as { id: number; role: string };

    if (!isAdminOrSuperAdminRole(user.role) && user.role !== 'manager') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên hoặc quản lý mới được phép ghim ghi chú.' });
    }

    const customerId = parseInt(id, 10);
    const parsedNoteId = parseInt(noteId, 10);
    if (isNaN(customerId) || isNaN(parsedNoteId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Tham số không hợp lệ.' });
    }

    try {
      await fastify.prisma.legacy.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE user_note SET is_sticky = 1 WHERE id = ? AND user_id = ?`,
          parsedNoteId,
          customerId
        );

        // Self-heal attribute_group_key and item_attribute_value if missing
        const noteRecords = await tx.$queryRawUnsafe<
          Array<{ attribute_group_key: string | null; note_field_key: string }>
        >(`SELECT attribute_group_key, note_field_key FROM user_note WHERE id = ? LIMIT 1`, parsedNoteId);

        if (noteRecords.length > 0) {
          let currentGroupKey = noteRecords[0]?.attribute_group_key;
          if (!currentGroupKey) {
            currentGroupKey = Math.floor(Date.now() / 1000).toString();
            await tx.$executeRawUnsafe(
              `UPDATE user_note SET attribute_group_key = ? WHERE id = ?`,
              currentGroupKey,
              parsedNoteId
            );
          }

          const existingAttrs = await tx.$queryRawUnsafe<Array<{ id: number }>>(
            `SELECT id FROM item_attribute_value WHERE item_id = ? AND type = 'user-note-attribute' LIMIT 1`,
            parsedNoteId
          );

          if (existingAttrs.length === 0) {
            const deptOptionId = noteRecords[0]?.note_field_key === 'order_note' ? 120 : 119;
            await tx.$executeRawUnsafe(
              `INSERT INTO item_attribute_value (client_id, client_business_id, type, item_id, attribute_id, attribute_option_id, attribute_option_value, group_key, date_created)
               VALUES 
               (11, 1, 'user-note-attribute', ?, 23, 116, '', ?, NOW()),
               (11, 1, 'user-note-attribute', ?, 24, ?, '', ?, NOW())`,
              parsedNoteId,
              currentGroupKey,
              parsedNoteId,
              deptOptionId,
              currentGroupKey
            );
          }
        }
      });

      return reply.send({ success: true, message: 'Ghim ghi chú thành công' });
    } catch (err: SafeAny) {
      fastify.log.error(err, `Pin customer note error for customer ${customerId}, note ${parsedNoteId}:`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể ghim ghi chú.',
      });
    }
  });

  // GET /api/customers/:id/notes
  // Paginated customer notes endpoint
  fastify.get('/customers/:id/notes', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const notesSql = `
        SELECT 
          un.id,
          un.note,
          un.note_field_key as noteFieldKey,
          un.is_sticky as isSticky,
          un.is_issue as isIssue,
          un.date_created as dateCreated,
          COALESCE(up.full_name, 'System') as staffName,
          up.avatar as staffAvatar
        FROM user_note un
        LEFT JOIN user_profile up ON un.created_staff_id = up.user_id
        WHERE un.user_id = ? AND (un.is_disabled = 0 OR un.note_field_key = 'order_note')
        ORDER BY un.date_created DESC
      `;

      const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(notesSql, customerId);

      const legacyItems = notesRaw.map((n) => {
        let safeIsoDate: string | null = null;
        if (n.dateCreated) {
          if (n.dateCreated instanceof Date) {
            safeIsoDate = isNaN(n.dateCreated.getTime()) ? null : n.dateCreated.toISOString();
          } else if (typeof n.dateCreated === 'string') {
            const parsed = new Date(n.dateCreated.replace(' ', 'T'));
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          } else {
            const parsed = new Date(n.dateCreated);
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          }
        }
        return {
          id: Number(n.id),
          note: n.note || '',
          noteFieldKey: n.noteFieldKey || 'note',
          isSticky: Boolean(n.isSticky),
          isIssue: Boolean(n.isIssue),
          dateCreated: safeIsoDate,
          staffName: n.staffName,
          staffAvatar: n.staffAvatar || null,
          source: 'user_note',
        };
      });

      // Query LoCa touchpoint notes
      let locaItems: SafeAny[] = [];
      try {
        const locaTouchpoints = await fastify.prisma.crm.crmLocaTouchpoint.findMany({
          where: {
            legacyUserId: customerId,
            note: { not: null },
          },
        });
        locaItems = locaTouchpoints
          .filter((tp) => tp.note && tp.note.trim() !== '')
          .map((loca) => {
            const safeDate = loca.checkedAt
              ? loca.checkedAt.toISOString()
              : loca.updatedAt
                ? loca.updatedAt.toISOString()
                : loca.createdAt.toISOString();

            let tpLabel = `LoCa ${loca.touchpointKey}`;
            switch (loca.touchpointKey) {
              case '24h':
                tpLabel = 'LoCa 24h';
                break;
              case '17':
                tpLabel = 'LoCa Dặm mi 17d';
                break;
              case '19':
                tpLabel = 'LoCa Dặm mi 19d';
                break;
              case '21':
                tpLabel = 'LoCa Dặm mi 21d';
                break;
              case '23':
                tpLabel = 'LoCa Dặm mi 23d';
                break;
              case '25':
                tpLabel = 'LoCa Dặm mi 25d';
                break;
              case '30':
                tpLabel = 'LoCa Dặm mi 30d';
                break;
              case '30plus':
                tpLabel = 'LoCa >30d';
                break;
            }

            return {
              id: 10000000 + Number(loca.id),
              note: loca.note || '',
              noteFieldKey: 'touchpoint_note',
              isSticky: false,
              isIssue: false,
              dateCreated: safeDate,
              staffName: loca.checkedByStaffName || 'Staff',
              staffAvatar: null,
              source: 'loca_touchpoint',
              touchpointKey: loca.touchpointKey,
              touchpointLabel: tpLabel,
              status: loca.status || (loca.isChecked ? 'SUCCESS' : null),
            };
          });
      } catch (locaErr) {
        fastify.log.warn(locaErr, 'Failed to fetch loca touchpoint notes for customer');
      }

      // Query Custom Campaign touchpoint notes
      let campaignItems: SafeAny[] = [];
      try {
        const campaignTouchpoints = await fastify.prisma.crm.crmCampaignTouchpointLog.findMany({
          where: {
            campaignCustomer: {
              legacyUserId: customerId,
            },
            note: { not: null },
          },
          include: {
            touchpoint: {
              include: {
                campaign: { select: { name: true } },
              },
            },
          },
        });
        campaignItems = campaignTouchpoints
          .filter((camp) => camp.note && camp.note.trim() !== '')
          .map((camp) => {
            const safeDate = camp.completedAt ? camp.completedAt.toISOString() : new Date().toISOString();
            const cName = camp.touchpoint?.campaign?.name || 'Chiến dịch';
            const tpLabel = camp.touchpoint?.label || camp.touchpoint?.key || 'Điểm chạm';

            return {
              id: 20000000 + Number(camp.id),
              note: camp.note || '',
              noteFieldKey: 'touchpoint_note',
              isSticky: false,
              isIssue: false,
              dateCreated: safeDate,
              staffName: camp.completedByStaffName || 'Staff',
              staffAvatar: null,
              source: 'campaign_touchpoint',
              touchpointKey: camp.touchpoint?.key || null,
              touchpointLabel: `${cName} - ${tpLabel}`,
              status: camp.status || (camp.isChecked ? 'SUCCESS' : null),
            };
          });
      } catch (campErr) {
        fastify.log.warn(campErr, 'Failed to fetch campaign touchpoint notes for customer');
      }

      const allItems = [...legacyItems, ...locaItems, ...campaignItems].sort((a, b) => {
        const timeA = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
        const timeB = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
        return timeB - timeA;
      });

      const totalCount = allItems.length;
      const items = allItems.slice(offset, offset + limitNum);

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer notes error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer notes',
      });
    }
  });
}
