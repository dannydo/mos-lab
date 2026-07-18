import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, JwtUserPayload } from '../../middlewares/auth.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { triggerImmediateAnalysis } from './analyzer.js';

export async function omicallRoutes(fastify: FastifyInstance) {
  // POST /api/omicall/webhook
  // Webhook receiver for OmiCall hangup events
  fastify.post('/omicall/webhook', async (request, reply) => {
    // 1. Verify webhook secret
    const webhookSecret = process.env.OMICALL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const secretHeader = request.headers['x-webhook-secret'] || request.headers['X-Webhook-Secret'];
      if (secretHeader !== webhookSecret) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid webhook secret' });
      }
    }

    const body = request.body as SafeAny;
    if (!body) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Empty body' });
    }

    // 2. Parse payload
    const callUuid = body.call_uuid || body.callUuid;
    const direction = body.direction; // 'outbound' | 'inbound'
    const status = body.status; // 'ANSWER' | 'NOANSWER' | 'BUSY' | 'CANCEL'
    const sourceNumber = body.source_number || body.sourceNumber;
    const destinationNumber = body.destination_number || body.destinationNumber;
    const duration = body.duration !== undefined ? Number(body.duration) : 0;
    const billSec =
      body.bill_sec !== undefined ? Number(body.bill_sec) : body.billSec !== undefined ? Number(body.billSec) : 0;
    const recordingUrl = body.recording_url || body.recordingUrl || null;
    const timeStartCall =
      body.time_start_call || body.timeStartCall ? new Date(body.time_start_call || body.timeStartCall) : null;
    const timeEndCall =
      body.time_end_call || body.timeEndCall ? new Date(body.time_end_call || body.timeEndCall) : null;

    if (!callUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'callUuid/call_uuid is required' });
    }

    try {
      // 3. Match extension to staffId via CrmOmicallConfig
      let staffId: number | null = null;
      const extensionToMatch = direction === 'outbound' ? sourceNumber : destinationNumber;

      if (extensionToMatch) {
        const config = await fastify.prisma.crm.crmOmicallConfig.findFirst({
          where: { extension: String(extensionToMatch) },
        });
        if (config) {
          staffId = config.staffId;
        }
      }

      // 4. Match customer phone to legacyUserId (user_contact.phone_number)
      let legacyUserId: number | null = null;
      const customerPhone = direction === 'outbound' ? destinationNumber : sourceNumber;

      if (customerPhone) {
        const cleanPhone = String(customerPhone).replace(/\D/g, '');
        const suffix = cleanPhone.length > 9 ? cleanPhone.substring(cleanPhone.length - 9) : cleanPhone;

        const contact = await fastify.prisma.legacy.user_contact.findFirst({
          where: {
            phone_number: {
              endsWith: suffix,
            },
            is_disabled: false,
          },
          select: {
            user_id: true,
          },
        });
        if (contact) {
          legacyUserId = contact.user_id;
        }
      }

      // 5. Determine initial analysis status
      // If call was not answered, skip AI analysis
      // If answered and recording exists -> PENDING
      // If answered and no recording -> WAITING_RECORDING
      let analysisStatus = 'PENDING';
      if (status !== 'ANSWER') {
        analysisStatus = 'SKIPPED';
      } else if (!recordingUrl) {
        analysisStatus = 'WAITING_RECORDING';
      }

      // Check if call log was already created in parallel
      let callLogId: number | null = null;
      const existingCallLog = await fastify.prisma.crm.crmCallLog.findFirst({
        where: { callUuid },
      });
      if (existingCallLog) {
        callLogId = existingCallLog.id;
      } else if (legacyUserId && staffId) {
        // So khớp thông minh thời gian thực (Real-time Smart Match):
        // Tìm cuộc gọi Telesales gần nhất (tạo trong khoảng +/- 10 phút so với cuộc gọi OmiCall)
        // của khách hàng này và booker này mà chưa có durationSec
        const callTime = timeStartCall || new Date();
        const tenMinutesAgo = new Date(callTime.getTime() - 10 * 60 * 1000);
        const tenMinutesAfter = new Date(callTime.getTime() + 10 * 60 * 1000);

        const matchedCallLog = await fastify.prisma.crm.crmCallLog.findFirst({
          where: {
            legacyUserId,
            staffId,
            durationSec: null,
            createdAt: {
              gte: tenMinutesAgo,
              lte: tenMinutesAfter,
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (matchedCallLog) {
          callLogId = matchedCallLog.id;
        }
      }

      // 6. Save OmiCall Log
      const log = await fastify.prisma.crm.crmOmicallLog.upsert({
        where: { callUuid },
        update: {
          direction: direction || 'outbound',
          status: status || 'NOANSWER',
          sourceNumber: sourceNumber ? String(sourceNumber) : '',
          destinationNumber: destinationNumber ? String(destinationNumber) : '',
          duration,
          billSec,
          recordingUrl,
          timeStartCall,
          timeEndCall,
          staffId,
          legacyUserId,
          callLogId,
          // Do NOT overwrite analysisStatus on update.
          // If OmiCall re-sends webhook for an already-processed record,
          // we keep the existing state (PROCESSING/DONE/FAILED).
          // Only update recordingUrl if we got a new one and record is still waiting.
          ...(recordingUrl && {
            recordingUrl,
          }),
        },
        create: {
          callUuid,
          direction: direction || 'outbound',
          status: status || 'NOANSWER',
          sourceNumber: sourceNumber ? String(sourceNumber) : '',
          destinationNumber: destinationNumber ? String(destinationNumber) : '',
          duration,
          billSec,
          recordingUrl,
          timeStartCall,
          timeEndCall,
          staffId,
          legacyUserId,
          callLogId,
          analysisStatus,
        },
      });

      // Sync durationSec to crmCallLog if linked
      if (log.callLogId) {
        await fastify.prisma.crm.crmCallLog
          .update({
            where: { id: log.callLogId },
            data: {
              durationSec: duration,
              callUuid: callUuid,
            },
          })
          .catch((err) => {
            fastify.log.error(err, `Failed to update durationSec for CallLog ${log.callLogId}`);
          });
      }

      // Trigger immediate analysis if pending and answer
      if (log.analysisStatus === 'PENDING') {
        triggerImmediateAnalysis(fastify, log.id);
      }

      return { success: true, logId: log.id, analysisStatus: log.analysisStatus };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'OmiCall webhook error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

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
    } catch (error: SafeAny) {
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

      const updateData: SafeAny = { extension, phoneNumber: phoneNumber || null };
      if (encryptedPassword !== undefined) {
        updateData.sipPassword = encryptedPassword;
      }

      const createData: SafeAny = {
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
    } catch (error: SafeAny) {
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
      let decryptedPassword = '';
      if (config.sipPassword) {
        try {
          decryptedPassword = decrypt(config.sipPassword);
        } catch (err: any) {
          fastify.log.warn(
            err,
            `Failed to decrypt SIP password for staffId ${user.id}. Invalid key or corrupted data.`
          );
        }
      }

      return {
        sipRealm,
        sipUser: config.extension,
        sipPassword: decryptedPassword,
        phoneNumber: config.phoneNumber || '',
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get SIP config error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs/latest
  // Fallback endpoint to find the latest OmiCall log matching a phone number (requireAuth)
  fastify.get('/omicall/logs/latest', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const { phone, direction } = request.query as { phone?: string; direction?: string };

    if (!phone) {
      return reply.status(400).send({ error: 'Bad Request', message: 'phone number is required' });
    }

    try {
      // Clean phone number (keep only numbers)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const suffix = cleanPhone.length > 9 ? cleanPhone.slice(-9) : cleanPhone;

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const log = await fastify.prisma.crm.crmOmicallLog.findFirst({
        where: {
          staffId: user.id,
          createdAt: { gte: twoMinutesAgo },
          direction: direction || 'outbound',
          OR: [{ destinationNumber: { contains: suffix } }, { sourceNumber: { contains: suffix } }],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'No recent call log found' });
      }

      let customerName = null;
      if (log.legacyUserId) {
        const customer = await fastify.prisma.legacy.user_profile.findFirst({
          where: { user_id: log.legacyUserId },
          select: { full_name: true, first_name: true, last_name: true },
        });
        if (customer) {
          customerName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        }
      }

      return {
        id: log.id,
        callUuid: log.callUuid,
        duration: log.duration,
        happyCallStatus: log.happyCallStatus,
        analysisStatus: log.analysisStatus,
        laughCount: log.laughCount,
        laughCountAgent: log.laughCountAgent,
        laughCountCustomer: log.laughCountCustomer,
        laughTimestamps: log.laughTimestamps ? JSON.parse(log.laughTimestamps) : [],
        customerSatisfactionScore: log.customerSatisfactionScore,
        customerSentiment: log.customerSentiment,
        satisfactionAnalysis: log.satisfactionAnalysis,
        transcript: log.transcript,
        customerName,
        legacyUserId: log.legacyUserId,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get latest log error:');
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
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Delete OmiCall config error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );

  // GET /api/omicall/logs
  // Get all OmiCall logs with pagination, filtering (Staff/Manager/Admin)
  fastify.get('/omicall/logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      page = '1',
      limit = '10',
      staffId,
      status,
      happyCallStatus,
      startDate,
      endDate,
    } = request.query as {
      page?: string;
      limit?: string;
      staffId?: string;
      status?: string;
      happyCallStatus?: string;
      startDate?: string;
      endDate?: string;
    };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: SafeAny = {};
    if (staffId) where.staffId = parseInt(staffId, 10);
    if (status) where.status = status;
    if (happyCallStatus) where.happyCallStatus = happyCallStatus;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    try {
      const [logs, total] = await Promise.all([
        fastify.prisma.crm.crmOmicallLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        fastify.prisma.crm.crmOmicallLog.count({ where }),
      ]);

      const foundStaffIds = Array.from(new Set(logs.map((l) => l.staffId).filter((id): id is number => id !== null)));
      const foundUserIds = Array.from(
        new Set(logs.map((l) => l.legacyUserId).filter((id): id is number => id !== null))
      );

      const [staffList, customerList] = await Promise.all([
        fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: foundStaffIds } },
          select: { id: true, displayName: true },
        }),
        fastify.prisma.legacy.user_profile.findMany({
          where: { user_id: { in: foundUserIds } },
          select: { user_id: true, full_name: true, first_name: true, last_name: true },
        }),
      ]);

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const customerMap = new Map(
        customerList.map((c) => [
          c.user_id,
          c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Customer',
        ])
      );

      const formattedLogs = logs.map((log) => ({
        ...log,
        laughTimestamps: log.laughTimestamps ? JSON.parse(log.laughTimestamps) : [],
        staffName: log.staffId ? staffMap.get(log.staffId) : null,
        customerName: log.legacyUserId ? customerMap.get(log.legacyUserId) : null,
      }));

      return {
        logs: formattedLogs,
        total,
        page: parseInt(page, 10),
        limit: take,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get OmiCall logs error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs/:id/play
  // Get details of a single call for the audio player (requireAuth)
  fastify.get('/omicall/logs/:id/play', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const logId = parseInt(id, 10);

    if (isNaN(logId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
    }

    try {
      const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'Log not found' });
      }

      // Fetch staff and customer names
      let staffName = null;
      let customerName = null;

      if (log.staffId) {
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: log.staffId },
          select: { displayName: true },
        });
        if (staff) staffName = staff.displayName;
      }

      if (log.legacyUserId) {
        const customer = await fastify.prisma.legacy.user_profile.findFirst({
          where: { user_id: log.legacyUserId },
          select: { full_name: true, first_name: true, last_name: true },
        });
        if (customer) {
          customerName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        }
      }

      return {
        ...log,
        laughTimestamps: log.laughTimestamps ? JSON.parse(log.laughTimestamps) : [],
        qaLaughVerifications: log.qaLaughVerifications ? JSON.parse(log.qaLaughVerifications) : [],
        staffName,
        customerName,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Play call error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/logs/:id/verify
  // QA verification endpoint (Admin or Manager only)
  fastify.post(
    '/omicall/logs/:id/verify',
    { preHandler: [requireAuth, requireRole(['admin', 'manager'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { action, laughVerifications, notes } = request.body as {
        action: 'approve' | 'reject';
        laughVerifications?: SafeAny;
        notes?: string;
      };

      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
      }

      if (!action || !['approve', 'reject'].includes(action)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'action must be approve or reject' });
      }

      const user = request.user as { id: number };

      try {
        const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
          where: { id: logId },
        });

        if (!log) {
          return reply.status(404).send({ error: 'Not Found', message: 'Log not found' });
        }

        // Guard: only PENDING_APPROVAL logs can be approved/rejected
        if (log.happyCallStatus !== 'PENDING_APPROVAL') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Cannot verify: current status is '${log.happyCallStatus}', expected 'PENDING_APPROVAL'`,
          });
        }

        const qaLaughVerifications = laughVerifications
          ? typeof laughVerifications === 'string'
            ? laughVerifications
            : JSON.stringify(laughVerifications)
          : null;

        let happyCallStatus = log.happyCallStatus;
        let happyCallReason = log.happyCallReason;

        if (action === 'approve') {
          happyCallStatus = 'APPROVED';
          happyCallReason = 'manual_approved';
        } else if (action === 'reject') {
          happyCallStatus = 'REJECTED';
        }

        const updated = await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: logId },
          data: {
            happyCallStatus,
            happyCallReason,
            qaVerified: true,
            qaVerifiedBy: user.id,
            qaVerifiedAt: new Date(),
            qaLaughVerifications,
            qaNotes: notes || null,
          },
        });

        return {
          ...updated,
          laughTimestamps: updated.laughTimestamps ? JSON.parse(updated.laughTimestamps) : [],
          qaLaughVerifications: updated.qaLaughVerifications ? JSON.parse(updated.qaLaughVerifications) : [],
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Verify call log error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );
}
