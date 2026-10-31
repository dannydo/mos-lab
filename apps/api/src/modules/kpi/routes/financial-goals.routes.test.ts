import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { registerFinancialGoalsRoutes } from './financial-goals.routes.js';

test('registerFinancialGoalsRoutes registers GET & POST routes', async () => {
  const routes: Record<string, string> = {};

  const mockFastify = {
    get: (path: string, _opts: unknown, _handler: unknown) => {
      routes[`GET ${path}`] = path;
    },
    post: (path: string, _opts: unknown, _handler: unknown) => {
      routes[`POST ${path}`] = path;
    },
  } as unknown as FastifyInstance;

  await registerFinancialGoalsRoutes(mockFastify);

  assert.ok(routes['GET /kpi/financial-goals']);
  assert.ok(routes['GET /kpi/financial-goals/months']);
  assert.ok(routes['GET /kpi/financial-goals/config']);
  assert.ok(routes['POST /kpi/financial-goals/config']);
});

test('CV role is blocked with 403 on financial goals route', async () => {
  let overviewHandler: SafeAny = null;

  const mockFastify = {
    get: (path: string, _opts: SafeAny, handler: SafeAny) => {
      if (path === '/kpi/financial-goals') overviewHandler = handler;
    },
    post: () => {},
  } as unknown as FastifyInstance;

  await registerFinancialGoalsRoutes(mockFastify);

  let statusSent = 0;
  let responseData: SafeAny = null;

  const mockRequest = {
    user: { role: 'technician', id: 99 },
    query: { month: '2026-11' },
  };
  const mockReply = {
    status: (code: number) => {
      statusSent = code;
      return {
        send: (payload: SafeAny) => {
          responseData = payload;
          return payload;
        },
      };
    },
  };

  await overviewHandler(mockRequest, mockReply);
  assert.equal(statusSent, 403);
  assert.equal(responseData.error, 'Forbidden');
});
