import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';
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

      // Insert into user_note raw table
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO user_note (client_id, client_business_id, user_id, note, note_field_key, is_sticky, is_issue, created_staff_id, is_disabled, date_created)
         VALUES (11, 1, ?, ?, ?, ?, 0, ?, 0, NOW())`,
        customerId,
        note.trim(),
        noteFieldKey || 'note',
        isSticky ? 1 : 0,
        staffId
      );

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
  // Unpin a customer note (admin only)
  fastify.post('/customers/:id/notes/:noteId/unpin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, noteId } = request.params as { id: string; noteId: string };
    const user = request.user as { id: number; role: string };

    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép bỏ ghim ghi chú.' });
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
  // Pin a customer note (admin only)
  fastify.post('/customers/:id/notes/:noteId/pin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, noteId } = request.params as { id: string; noteId: string };
    const user = request.user as { id: number; role: string };

    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép ghim ghi chú.' });
    }

    const customerId = parseInt(id, 10);
    const parsedNoteId = parseInt(noteId, 10);
    if (isNaN(customerId) || isNaN(parsedNoteId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Tham số không hợp lệ.' });
    }

    try {
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_note SET is_sticky = 1 WHERE id = ? AND user_id = ?`,
        parsedNoteId,
        customerId
      );

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
