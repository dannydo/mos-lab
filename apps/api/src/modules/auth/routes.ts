import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole, LoginRequest, LoginResponse } from '@mos-lab/shared';
import { GoogleIdentityError, verifyGoogleCredential } from './google-identity.service.js';
import { evaluateImpersonationPolicy } from './impersonation-policy.js';

const IMPERSONATION_SESSION_MINUTES = 30;

export async function authRoutes(fastify: FastifyInstance) {
  // Helper to resolve auto init based on staff & role
  const resolveOmicallAutoInit = async (staffMember: SafeAny) => {
    if (staffMember.omicallAutoInit === true) return true;
    if (staffMember.omicallAutoInit === false) return false;

    // Inherit from role
    const roleRecord = await fastify.prisma.crm.crmRole.findUnique({
      where: { key: staffMember.role },
    });
    return !!roleRecord?.omicallAutoInit;
  };

  // POST /api/auth/login
  fastify.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User login with username and password',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body as LoginRequest;

      if (!username || !password) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Username and password are required',
        });
      }

      try {
        // Find staff in CRM DB
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { username },
        });

        if (!staff || !staff.isActive) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid username or password',
          });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
        if (!isPasswordValid) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid username or password',
          });
        }

        const payload: JwtUserPayload = {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role as SafeAny,
          email: staff.email || staff.username,
        };

        // Sign JWT
        const token = fastify.jwt.sign(payload, { expiresIn: '7d' });

        // Update lastLoginAt and lastActiveAt
        const now = new Date();
        const updatedStaff = await fastify.prisma.crm.crmStaff.update({
          where: { id: staff.id },
          data: { lastLoginAt: now, lastActiveAt: now },
        });

        const response: LoginResponse = {
          token,
          user: {
            id: updatedStaff.id,
            username: updatedStaff.username,
            displayName: updatedStaff.displayName,
            role: updatedStaff.role as SafeAny,
            isActive: updatedStaff.isActive,
            omicallAutoInit: updatedStaff.omicallAutoInit,
            createdAt: updatedStaff.createdAt.toISOString(),
            lastLoginAt: updatedStaff.lastLoginAt ? updatedStaff.lastLoginAt.toISOString() : null,
            lastActiveAt: updatedStaff.lastActiveAt ? updatedStaff.lastActiveAt.toISOString() : null,
          },
          resolvedOmicallAutoInit: await resolveOmicallAutoInit(updatedStaff),
        };

        return response;
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Login error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Something went wrong',
        });
      }
    }
  );

  // POST /api/auth/google
  fastify.post(
    '/auth/google',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Google OAuth login / Dev mock login',
        body: {
          type: 'object',
          properties: {
            credential: { type: 'string' },
            isMock: { type: 'boolean' },
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { credential, isMock, email: mockEmail, name: mockName } = request.body as SafeAny;

      if (!credential && !isMock) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Google credential is required',
        });
      }

      try {
        let email: string;
        let name: string;
        let picture: string | null = null;

        if (isMock && process.env.NODE_ENV !== 'production') {
          email = mockEmail || 'danhdo@gmail.com';
          name = mockName || 'Danh Do (Mock Google)';
          picture = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        } else {
          const identity = await verifyGoogleCredential(credential);
          email = identity.email;
          name = identity.name;
          picture = identity.avatarUrl;
        }

        // Find staff in CRM DB
        let staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { username: email },
        });

        if (!staff) {
          // Try to match email prefix (e.g., "bichphuong" from "bichphuong@gmail.com")
          const emailPrefix = email.split('@')[0];
          staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { username: emailPrefix },
          });
        }

        if (!staff) {
          // Try to match by the email field
          staff = await fastify.prisma.crm.crmStaff.findFirst({
            where: { email: email },
          });
        }

        if (!staff) {
          const isWingsLashes = email.endsWith('@wingslashes.com');
          const isDanny = isCanonicalSuperAdminIdentity({ username: email, email });

          // Auto-create for admin or @wingslashes.com domain
          if (email === 'danhdo@gmail.com' || isWingsLashes) {
            const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
            staff = await fastify.prisma.crm.crmStaff.create({
              data: {
                username: email,
                displayName: name,
                role: isDanny ? 'super_admin' : 'telesales',
                passwordHash,
                isActive: true,
                email: email,
                avatarUrl: picture,
              },
            });
          } else {
            return reply.status(403).send({
              error: 'Forbidden',
              message: `Email ${email} không có quyền truy cập Wings Lashes CRM. Vui lòng liên hệ Admin.`,
            });
          }
        } else {
          // Keep Danny Do's canonical account at the explicit Super Admin role.
          const shouldPromoteToSuperAdmin = isCanonicalSuperAdminIdentity({
            username: staff.username,
            email: staff.email || email,
          });
          if (
            (picture && staff.avatarUrl !== picture) ||
            (shouldPromoteToSuperAdmin && !isSuperAdminRole(staff.role))
          ) {
            staff = await fastify.prisma.crm.crmStaff.update({
              where: { id: staff.id },
              data: {
                ...(picture && staff.avatarUrl !== picture ? { avatarUrl: picture } : {}),
                ...(shouldPromoteToSuperAdmin && !isSuperAdminRole(staff.role) ? { role: 'super_admin' } : {}),
              },
            });
          }
        }

        if (!staff.isActive) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Tài khoản đã bị khóa',
          });
        }

        const payload: JwtUserPayload = {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role as SafeAny,
          email: staff.email || staff.username,
        };

        // Sign JWT
        const token = fastify.jwt.sign(payload, { expiresIn: '7d' });

        // Update lastLoginAt and lastActiveAt
        const now = new Date();
        const updatedStaff = await fastify.prisma.crm.crmStaff.update({
          where: { id: staff.id },
          data: { lastLoginAt: now, lastActiveAt: now },
        });

        const response: LoginResponse = {
          token,
          user: {
            id: updatedStaff.id,
            username: updatedStaff.username,
            displayName: updatedStaff.displayName,
            role: updatedStaff.role as SafeAny,
            isActive: updatedStaff.isActive,
            avatarUrl: updatedStaff.avatarUrl,
            omicallAutoInit: updatedStaff.omicallAutoInit,
            createdAt: updatedStaff.createdAt.toISOString(),
            lastLoginAt: updatedStaff.lastLoginAt ? updatedStaff.lastLoginAt.toISOString() : null,
            lastActiveAt: updatedStaff.lastActiveAt ? updatedStaff.lastActiveAt.toISOString() : null,
          },
          resolvedOmicallAutoInit: await resolveOmicallAutoInit(updatedStaff),
        };

        return response;
      } catch (error: SafeAny) {
        if (error instanceof GoogleIdentityError) {
          return reply.status(error.statusCode).send({
            error: error.name,
            message: error.message,
          });
        }
        fastify.log.error(error as Error, 'Google login error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Something went wrong',
        });
      }
    }
  );

  // GET /api/auth/me
  fastify.get(
    '/auth/me',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Auth'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;

      try {
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: user.id },
        });

        if (!staff || !staff.isActive) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'User not found or inactive',
          });
        }

        return {
          user: {
            id: staff.id,
            username: staff.username,
            displayName: staff.displayName,
            role: staff.role as SafeAny,
            isActive: staff.isActive,
            avatarUrl: staff.avatarUrl,
            omicallAutoInit: staff.omicallAutoInit,
            createdAt: staff.createdAt.toISOString(),
            lastLoginAt: staff.lastLoginAt ? staff.lastLoginAt.toISOString() : null,
            lastActiveAt: staff.lastActiveAt ? staff.lastActiveAt.toISOString() : null,
          },
          resolvedOmicallAutoInit: await resolveOmicallAutoInit(staff),
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Get profile error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve profile',
        });
      }
    }
  );

  // POST /api/auth/impersonate
  fastify.post(
    '/auth/impersonate',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Auth'],
        summary: 'Switch into an active staff account for support',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const currentUser = request.user as JwtUserPayload;
      const { userId } = request.body as { userId: number };

      if (!userId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Yêu cầu Target userId',
        });
      }

      try {
        // Re-read the actor from the database. This makes a newly promoted
        // Super Admin effective immediately even if their browser still has an
        // older Admin JWT.
        const [actorStaff, targetStaff] = await Promise.all([
          fastify.prisma.crm.crmStaff.findUnique({ where: { id: currentUser.id } }),
          fastify.prisma.crm.crmStaff.findUnique({ where: { id: userId } }),
        ]);

        const decision = evaluateImpersonationPolicy({
          actor: actorStaff,
          target: targetStaff,
          isAlreadyImpersonating: Boolean(currentUser.impersonatorId),
        });
        if (!decision.allowed) {
          const errorByStatus = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
          } as const;
          return reply.status(decision.statusCode).send({
            error: errorByStatus[decision.statusCode],
            message: decision.message,
          });
        }

        // The policy guarantees both records are present and active here.
        if (!actorStaff || !targetStaff) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tài khoản.' });
        }

        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + IMPERSONATION_SESSION_MINUTES * 60 * 1000);
        const audit = await fastify.prisma.crm.crmImpersonationAudit.create({
          data: {
            actorStaffId: actorStaff.id,
            targetStaffId: targetStaff.id,
            actorUsername: actorStaff.username,
            actorDisplayName: actorStaff.displayName,
            targetUsername: targetStaff.username,
            targetDisplayName: targetStaff.displayName,
            expiresAt,
          },
        });

        const payload: JwtUserPayload = {
          id: targetStaff.id,
          username: targetStaff.username,
          displayName: targetStaff.displayName,
          role: targetStaff.role as SafeAny,
          email: targetStaff.email || targetStaff.username,
          impersonatorId: actorStaff.id,
          impersonatorUsername: actorStaff.username,
          impersonationAuditId: audit.id,
        };

        const token = fastify.jwt.sign(payload, { expiresIn: `${IMPERSONATION_SESSION_MINUTES}m` });

        return {
          token,
          user: {
            id: targetStaff.id,
            username: targetStaff.username,
            displayName: targetStaff.displayName,
            role: targetStaff.role as SafeAny,
            isActive: targetStaff.isActive,
            avatarUrl: targetStaff.avatarUrl,
            omicallAutoInit: targetStaff.omicallAutoInit,
            createdAt: targetStaff.createdAt.toISOString(),
          },
          resolvedOmicallAutoInit: await resolveOmicallAutoInit(targetStaff),
          impersonation: {
            auditId: audit.id,
            expiresAt: expiresAt.toISOString(),
          },
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Impersonation error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Đăng nhập giả lập thất bại',
        });
      }
    }
  );

  // POST /api/auth/impersonate/exit
  fastify.post(
    '/auth/impersonate/exit',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Auth'],
        summary: 'Record a return from an account-switch session',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['auditId'],
          properties: {
            auditId: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const currentUser = request.user as JwtUserPayload;
      const { auditId } = request.body as { auditId: number };

      if (!auditId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Yêu cầu auditId.' });
      }

      try {
        const updated = await fastify.prisma.crm.crmImpersonationAudit.updateMany({
          where: {
            id: auditId,
            actorStaffId: currentUser.id,
            endedAt: null,
          },
          data: { endedAt: new Date() },
        });

        return { success: updated.count > 0 };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Impersonation exit audit error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể cập nhật lịch sử phiên giả lập.',
        });
      }
    }
  );
}
