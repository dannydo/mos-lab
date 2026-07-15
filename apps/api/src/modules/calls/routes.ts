import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';

export async function callRoutes(fastify: FastifyInstance) {

  // POST /api/calls
  // Log a new call and update plan/KPIs
  fastify.post('/calls', { preHandler: [requireAuth] }, async (request, reply) => {
    const { 
      planId, 
      legacyUserId, 
      callType = 'PHONE', 
      callResult, 
      note, 
      outcome, 
      callbackDate,
      omicallLogId,
      callUuid
    } = request.body as {
      planId?: number;
      legacyUserId: number;
      callType?: string;
      callResult?: string;
      note?: string;
      outcome?: string;
      callbackDate?: string;
      omicallLogId?: number;
      callUuid?: string;
    };

    const user = request.user as { id: number };

    if (!legacyUserId) {
      return reply.status(400).send({ 
        error: 'Bad Request', 
        message: 'legacyUserId is required' 
      });
    }

    try {
      // 1. Create the call log
      const parsedCallbackDate = callbackDate ? new Date(callbackDate) : null;
      
      const callLog = await fastify.prisma.crm.crmCallLog.create({
        data: {
          planId,
          legacyUserId,
          staffId: user.id,
          callType,
          callResult,
          note,
          outcome,
          callbackDate: parsedCallbackDate,
          callUuid
        }
      });

      // 2. Update the daily plan status if planId is provided
      if (planId) {
        let newStatus = 'CALLED';
        if (outcome === 'BOOKED' || outcome === 'RENEWED') {
          newStatus = 'CONFIRM'; // Mark as confirmed/booked
        }

        await fastify.prisma.crm.crmDailyPlan.update({
          where: { id: planId },
          data: { status: newStatus }
        });
      }

      // 3. Link with CrmOmicallLog if omicallLogId or callUuid is provided
      if (omicallLogId) {
        await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: omicallLogId },
          data: { callLogId: callLog.id }
        }).catch(err => {
          fastify.log.error(`Failed to link CrmOmicallLog ${omicallLogId} with CallLog ${callLog.id}:`, err);
        });
      } else if (callUuid) {
        // Asynchronous link if OmiCall log is already generated
        await fastify.prisma.crm.crmOmicallLog.update({
          where: { callUuid },
          data: { callLogId: callLog.id }
        }).catch(err => {
          fastify.log.warn(`OmiCall log not yet found for UUID ${callUuid}. It will be linked when webhook arrives.`);
        });
      }

      return callLog;
    } catch (error: any) {
      fastify.log.error('Create call log error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to record call log'
      });
    }
  });

  // GET /api/calls/:customerId
  // Fetch detailed call log history for a single customer
  fastify.get('/calls/:customerId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    
    const legacyUserId = parseInt(customerId, 10);
    if (isNaN(legacyUserId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid customer id'
      });
    }

    try {
      // Find all call logs for this customer, along with staff displayName
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch staff names to format
      const staffIds = Array.from(new Set(logs.map(l => l.staffId)));
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true }
      });

      const staffMap = new Map(staffList.map(s => [s.id, s.displayName]));

      const formattedLogs = logs.map(log => ({
        ...log,
        staffName: staffMap.get(log.staffId) || 'Unknown Staff'
      }));

      return formattedLogs;
    } catch (error: any) {
      fastify.log.error('Get call logs error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve call logs'
      });
    }
  });

}
