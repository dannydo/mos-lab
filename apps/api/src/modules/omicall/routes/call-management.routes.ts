import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, JwtUserPayload } from '../../../middlewares/auth.js';
import { encrypt, decrypt } from '../../../utils/crypto.js';

export async function registerCallManagementRoutes(fastify: FastifyInstance) {
  // GET /api/omicall/config
  // Get all OmiCall configs merged with active staff list (Admin only)
  fastify.get('/omicall/config', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    try {
      // 1. Get all active staff
      const staff = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: { id: true, displayName: true, username: true, role: true },
      });

      // 2. Get all configs
      const configs = await fastify.prisma.crm.crmOmicallConfig.findMany();
      const configMap = new Map(configs.map((c) => [c.staffId, c]));

      // 3. Merge them
      const merged = staff.map((s) => {
        const config = configMap.get(s.id);
        return {
          id: config?.id || null,
          staffId: s.id,
          displayName: s.displayName,
          username: s.username,
          role: s.role,
          extension: config?.extension || null,
          phoneNumber: config?.phoneNumber || null,
          hasSipPassword: !!config?.sipPassword,
        };
      });

      return merged;
    } catch (error) {
      fastify.log.error(error as Error, 'Get OmiCall configs error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/config
  // Add or update an OmiCall config (Admin only)
  fastify.post('/omicall/config', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { staffId, extension, phoneNumber, sipPassword } = request.body as {
      staffId: number;
      extension: string;
      phoneNumber?: string;
      sipPassword?: string;
    };

    if (!staffId || !extension) {
      return reply.status(400).send({ error: 'Bad Request', message: 'staffId and extension are required' });
    }

    try {
      const encryptedPassword = sipPassword ? encrypt(sipPassword) : undefined;

      const updateData: { extension: string; phoneNumber: string | null; sipPassword?: string } = {
        extension,
        phoneNumber: phoneNumber || null,
      };
      if (encryptedPassword !== undefined) {
        updateData.sipPassword = encryptedPassword;
      }

      const createData = {
        staffId,
        extension,
        phoneNumber: phoneNumber || null,
        sipPassword: encryptedPassword || null,
      };

      const config = await fastify.prisma.crm.crmOmicallConfig.upsert({
        where: { staffId },
        update: updateData,
        create: createData,
      });

      return {
        id: config.id,
        staffId: config.staffId,
        extension: config.extension,
        phoneNumber: config.phoneNumber,
        hasSipPassword: !!config.sipPassword,
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Upsert OmiCall config error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/sip-config
  // Get decrypted SIP configuration for the currently logged-in Telesales/Staff (requireAuth)
  fastify.get('/omicall/sip-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    try {
      const config = await fastify.prisma.crm.crmOmicallConfig.findUnique({
        where: { staffId: user.id },
      });

      if (!config) {
        return reply
          .status(404)
          .send({ error: 'Not Found', message: 'No OmiCall configuration found for your account' });
      }

      const sipRealm = process.env.OMICALL_SIP_DOMAIN || 'quangnguyen2';
      const decryptedPassword = config.sipPassword ? decrypt(config.sipPassword) : '';

      return {
        sipRealm,
        sipUser: config.extension,
        sipPassword: decryptedPassword,
        phoneNumber: config.phoneNumber || '',
      };
    } catch (error) {
      fastify.log.error(error as Error, 'Get SIP config error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // DELETE /api/omicall/config/:staffId
  // Delete an OmiCall config (Admin only)
  fastify.delete(
    '/omicall/config/:staffId',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      const { staffId } = request.params as { staffId: string };
      const parsedStaffId = parseInt(staffId, 10);

      if (isNaN(parsedStaffId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid staffId' });
      }

      try {
        await fastify.prisma.crm.crmOmicallConfig.delete({
          where: { staffId: parsedStaffId },
        });
        return { success: true };
      } catch (error) {
        fastify.log.error(error as Error, 'Delete OmiCall config error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );
}
