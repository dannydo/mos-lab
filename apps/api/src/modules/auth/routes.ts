import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';
import { LoginRequest, LoginResponse } from '@mos-lab/shared';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body as LoginRequest;

    if (!username || !password) {
      return reply.status(400).send({ 
        error: 'Bad Request', 
        message: 'Username and password are required' 
      });
    }

    try {
      // Find staff in CRM DB
      const staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { username }
      });

      if (!staff || !staff.isActive) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'Invalid username or password' 
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
      if (!isPasswordValid) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'Invalid username or password' 
        });
      }

      const payload: JwtUserPayload = {
        id: staff.id,
        username: staff.username,
        displayName: staff.displayName,
        role: staff.role as any
      };

      // Sign JWT
      const token = fastify.jwt.sign(payload, { expiresIn: '7d' });

      const response: LoginResponse = {
        token,
        user: {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role as any,
          isActive: staff.isActive,
          createdAt: staff.createdAt.toISOString()
        }
      };

      return response;
    } catch (error: any) {
      fastify.log.error('Login error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Something went wrong' 
      });
    }
  });

  // POST /api/auth/google
  fastify.post('/auth/google', async (request, reply) => {
    const { credential, isMock, email: mockEmail, name: mockName } = request.body as any;

    if (!credential && !isMock) {
      return reply.status(400).send({ 
        error: 'Bad Request', 
        message: 'Google credential is required' 
      });
    }

    try {
      let email: string;
      let name: string;

      if (isMock && process.env.NODE_ENV !== 'production') {
        email = mockEmail || 'danhdo@gmail.com';
        name = mockName || 'Danh Do (Mock Google)';
      } else {
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!tokenRes.ok) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid Google credential'
          });
        }
        const tokenInfo = await tokenRes.json() as any;
        if (tokenInfo.email_verified !== 'true') {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Google email not verified'
          });
        }
        email = tokenInfo.email;
        name = tokenInfo.name || tokenInfo.given_name || 'Google User';
      }

      // Find staff in CRM DB
      let staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { username: email }
      });

      if (!staff) {
        // Try to match email prefix (e.g., "bichphuong" from "bichphuong@gmail.com")
        const emailPrefix = email.split('@')[0];
        staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { username: emailPrefix }
        });
      }

      if (!staff) {
        // Try to match by the email field
        staff = await fastify.prisma.crm.crmStaff.findFirst({
          where: { email: email }
        });
      }

      if (!staff) {
        const isWingsLashes = email.endsWith('@wingslashes.com');
        const isDanny = email === 'danny.do@wingslashes.com';

        // Auto-create for admin or @wingslashes.com domain
        if (email === 'danhdo@gmail.com' || isWingsLashes) {
          const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
          staff = await fastify.prisma.crm.crmStaff.create({
            data: {
              username: email,
              displayName: name,
              role: (email === 'danhdo@gmail.com' || isDanny) ? 'admin' : 'telesales',
              passwordHash,
              isActive: true,
              email: email
            }
          });
        } else {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Email ${email} không có quyền truy cập Wings Lashes CRM. Vui lòng liên hệ Admin.`
          });
        }
      }

      if (!staff.isActive) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Tài khoản đã bị khóa'
        });
      }

      const payload: JwtUserPayload = {
        id: staff.id,
        username: staff.username,
        displayName: staff.displayName,
        role: staff.role as any
      };

      // Sign JWT
      const token = fastify.jwt.sign(payload, { expiresIn: '7d' });

      const response: LoginResponse = {
        token,
        user: {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role as any,
          isActive: staff.isActive,
          createdAt: staff.createdAt.toISOString()
        }
      };

      return response;
    } catch (error: any) {
      fastify.log.error('Google login error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Something went wrong' 
      });
    }
  });

  // GET /api/auth/me
  fastify.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;

    try {
      const staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id }
      });

      if (!staff || !staff.isActive) {
        return reply.status(404).send({ 
          error: 'Not Found', 
          message: 'User not found or inactive' 
        });
      }

      return {
        user: {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role as any,
          isActive: staff.isActive,
          createdAt: staff.createdAt.toISOString()
        }
      };
    } catch (error: any) {
      fastify.log.error('Get profile error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve profile' 
      });
    }
  });
}
