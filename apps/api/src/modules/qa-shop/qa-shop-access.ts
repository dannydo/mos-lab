import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { requireAuth } from '../../middlewares/auth.js';
import { TeamService } from '../teams/team.service.js';

export const QA_QC_SHOP_TEAM_CODE = 'QA_QC_SHOP';
export const QA_QC_SHOP_FALLBACK_CONFIG_KEY = 'ACTIVE_QA_QC_SHOP_STAFF_CONFIG';

/**
 * The shop-audit workspace is a quality function, not a general authenticated
 * staff page. Team membership remains the source of truth while the legacy
 * roster is being synchronized.
 */
export async function requireQaShopAccess(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (isAdminOrSuperAdminRole(request.user.role)) return;

  const isQaShopMember = await TeamService.isActiveCrmStaffMember(
    request.server as FastifyInstance,
    QA_QC_SHOP_TEAM_CODE,
    request.user.id,
    QA_QC_SHOP_FALLBACK_CONFIG_KEY
  );

  if (!isQaShopMember) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ Admin hoặc thành viên team QA/QC Shop được truy cập khu vực này.',
    });
  }
}
