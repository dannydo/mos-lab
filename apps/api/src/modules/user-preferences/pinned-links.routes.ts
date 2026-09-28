import { FastifyInstance } from 'fastify';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';
import { PinnedLinkItem, SafeAny } from '@mos-lab/shared';
import crypto from 'crypto';

const MAX_PINNED_LINKS = 12;

function getUserPinnedConfigKey(userId: number | string): string {
  return `pinned_links:user:${userId}`;
}

export async function pinnedLinksRoutes(fastify: FastifyInstance) {
  // GET /api/user-preferences/pinned-links - Get all pinned links for current user
  fastify.get(
    '/user-preferences/pinned-links',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['UserPreferences'],
        summary: 'Get pinned menu links for current user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;

      try {
        const configKey = getUserPinnedConfigKey(user.id);
        const record = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: configKey },
        });

        let items: PinnedLinkItem[] = [];
        if (record?.value) {
          try {
            const parsed = JSON.parse(record.value);
            if (Array.isArray(parsed)) {
              items = parsed;
            }
          } catch (e) {
            fastify.log.warn(`Failed to parse pinned links for user ${user.id}: ${e}`);
          }
        }

        // Sort by sortOrder ascending
        items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        return {
          success: true,
          data: items,
        };
      } catch (error: SafeAny) {
        fastify.log.error(`Fetch pinned links error for user ${user.id}:`, error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể lấy danh sách liên kết đã ghim',
        });
      }
    }
  );

  // PUT /api/user-preferences/pinned-links - Overwrite/Reorder all pinned links
  fastify.put(
    '/user-preferences/pinned-links',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['UserPreferences'],
        summary: 'Update entire list of pinned links (e.g. reorder)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'title', 'url'],
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  url: { type: 'string' },
                  icon: { type: 'string' },
                  isExternal: { type: 'boolean' },
                  sortOrder: { type: 'number' },
                  createdAt: { type: 'string' },
                  menuKey: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { items } = request.body as { items: PinnedLinkItem[] };

      if (!Array.isArray(items)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Danh sách liên kết (items) phải là một mảng',
        });
      }

      if (items.length > MAX_PINNED_LINKS) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Chỉ được ghim tối đa ${MAX_PINNED_LINKS} liên kết`,
        });
      }

      // Re-index sortOrder
      const sanitizedItems: PinnedLinkItem[] = items.map((item, index) => ({
        id: item.id || crypto.randomUUID(),
        title: String(item.title).trim(),
        url: String(item.url).trim(),
        icon: item.icon ? String(item.icon).trim() : undefined,
        isExternal: Boolean(item.isExternal),
        sortOrder: index,
        createdAt: item.createdAt || new Date().toISOString(),
        menuKey: item.menuKey ? String(item.menuKey).trim() : undefined,
      }));

      try {
        const configKey = getUserPinnedConfigKey(user.id);
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: configKey },
          update: {
            value: JSON.stringify(sanitizedItems),
            updatedAt: new Date(),
          },
          create: {
            key: configKey,
            value: JSON.stringify(sanitizedItems),
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: sanitizedItems,
        };
      } catch (error: SafeAny) {
        fastify.log.error(`Save pinned links error for user ${user.id}:`, error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể lưu danh sách liên kết đã ghim',
        });
      }
    }
  );

  // POST /api/user-preferences/pinned-links - Add or toggle pin single link
  fastify.post(
    '/user-preferences/pinned-links',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['UserPreferences'],
        summary: 'Pin a single link or menu item',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'url'],
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            icon: { type: 'string' },
            isExternal: { type: 'boolean' },
            menuKey: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { title, url, icon, isExternal, menuKey } = request.body as {
        title: string;
        url: string;
        icon?: string;
        isExternal?: boolean;
        menuKey?: string;
      };

      if (!title || !url) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Tiêu đề (title) và đường dẫn (url) là bắt buộc',
        });
      }

      try {
        const configKey = getUserPinnedConfigKey(user.id);
        const record = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: configKey },
        });

        let currentItems: PinnedLinkItem[] = [];
        if (record?.value) {
          try {
            const parsed = JSON.parse(record.value);
            if (Array.isArray(parsed)) currentItems = parsed;
          } catch (_) {}
        }

        // Check if already pinned by menuKey or URL
        const existingIndex = currentItems.findIndex(
          (item) => (menuKey && item.menuKey === menuKey) || item.url === url
        );

        if (existingIndex >= 0) {
          // Update existing
          currentItems[existingIndex] = {
            ...currentItems[existingIndex],
            title: title.trim(),
            icon: icon || currentItems[existingIndex].icon,
            isExternal: isExternal !== undefined ? isExternal : currentItems[existingIndex].isExternal,
            menuKey: menuKey || currentItems[existingIndex].menuKey,
          };
        } else {
          // Check limit
          if (currentItems.length >= MAX_PINNED_LINKS) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: `Đã đạt giới hạn tối đa ${MAX_PINNED_LINKS} liên kết ghim. Vui lòng bỏ ghim bớt link trước.`,
            });
          }

          const newItem: PinnedLinkItem = {
            id: crypto.randomUUID(),
            title: title.trim(),
            url: url.trim(),
            icon: icon?.trim(),
            isExternal: Boolean(isExternal),
            sortOrder: currentItems.length,
            createdAt: new Date().toISOString(),
            menuKey: menuKey?.trim(),
          };
          currentItems.push(newItem);
        }

        // Re-index sort order
        currentItems.forEach((item, idx) => {
          item.sortOrder = idx;
        });

        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: configKey },
          update: {
            value: JSON.stringify(currentItems),
            updatedAt: new Date(),
          },
          create: {
            key: configKey,
            value: JSON.stringify(currentItems),
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: currentItems,
        };
      } catch (error: SafeAny) {
        fastify.log.error(`Add pinned link error for user ${user.id}:`, error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể thêm liên kết đã ghim',
        });
      }
    }
  );

  // DELETE /api/user-preferences/pinned-links/:id - Remove a pinned link
  fastify.delete(
    '/user-preferences/pinned-links/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['UserPreferences'],
        summary: 'Unpin a link by id or menuKey',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };

      try {
        const configKey = getUserPinnedConfigKey(user.id);
        const record = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: configKey },
        });

        let currentItems: PinnedLinkItem[] = [];
        if (record?.value) {
          try {
            const parsed = JSON.parse(record.value);
            if (Array.isArray(parsed)) currentItems = parsed;
          } catch (_) {}
        }

        // Filter out item by ID or menuKey
        const updatedItems = currentItems.filter((item) => item.id !== id && item.menuKey !== id);

        // Re-index sort order
        updatedItems.forEach((item, idx) => {
          item.sortOrder = idx;
        });

        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: configKey },
          update: {
            value: JSON.stringify(updatedItems),
            updatedAt: new Date(),
          },
          create: {
            key: configKey,
            value: JSON.stringify(updatedItems),
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: updatedItems,
        };
      } catch (error: SafeAny) {
        fastify.log.error(`Delete pinned link error for user ${user.id}:`, error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể xóa liên kết đã ghim',
        });
      }
    }
  );
}
