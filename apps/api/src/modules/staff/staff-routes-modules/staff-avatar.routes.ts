import { FastifyInstance } from 'fastify';
import { type AvatarUploadRequest, type AvatarUploadResponse, isHrOrAdminRole, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { AvatarStorageError, AvatarStorageService } from '../services/avatar-storage.service.js';

export function registerStaffAvatarRoutes(fastify: FastifyInstance) {
  // GET /api/staff/media/avatars/:filename - Public image serving for staff avatars
  fastify.get('/staff/media/avatars/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string };
      const { buffer, mimeType } = await AvatarStorageService.readAvatar(filename);
      return reply
        .type(mimeType)
        .header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
        .send(buffer);
    } catch {
      return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy hình ảnh đại diện' });
    }
  });

  // POST /api/staff/avatar/upload - Upload and save avatar for current user (or target staff by admin/hr)
  fastify.post('/staff/avatar/upload', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const currentUser = request.user;
      const body = request.body as AvatarUploadRequest;

      if (!body || !body.photoData) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Dữ liệu ảnh là bắt buộc' });
      }

      const targetId = body.targetStaffId ? Number(body.targetStaffId) : currentUser.id;
      if (isNaN(targetId) || targetId <= 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID nhân viên không hợp lệ' });
      }

      // Check permission if updating on behalf of another user
      if (targetId !== currentUser.id && !isHrOrAdminRole(currentUser.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có quyền cập nhật ảnh đại diện của chính mình',
        });
      }

      // Save file to storage
      const saved = await AvatarStorageService.saveAvatar(body.photoData, body.mimeType);

      // Update in crmStaff
      const updatedStaff = await fastify.prisma.crm.crmStaff.update({
        where: { id: targetId },
        data: { avatarUrl: saved.photoUrl },
        select: { id: true, displayName: true, avatarUrl: true },
      });

      const response: AvatarUploadResponse = {
        success: true,
        message: 'Cập nhật ảnh đại diện thành công',
        avatarUrl: updatedStaff.avatarUrl || saved.photoUrl,
        staffId: updatedStaff.id,
        displayName: updatedStaff.displayName,
      };

      return reply.send(response);
    } catch (error: SafeAny) {
      if (error instanceof AvatarStorageError) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      fastify.log.error(error as Error, 'Upload avatar error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lưu ảnh đại diện' });
    }
  });
}
