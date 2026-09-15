import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { aiRoutes } from './routes.js';

test('AI Voice Chat route returns 400 when message is missing or empty', async () => {
  const app = Fastify();
  await app.register(aiRoutes);

  const res1 = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: {},
  });
  assert.equal(res1.statusCode, 400);

  const res2 = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: { message: '   ' },
  });
  assert.equal(res2.statusCode, 400);
});

test('AI Voice Chat route returns smart domain response when message is provided', async () => {
  const app = Fastify();
  await app.register(aiRoutes);

  // Test greeting
  const res = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: {
      message: 'Xin chào mOS',
      context: { pathname: '/dashboard/qa-shop', userName: 'Danny' },
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply);
  assert.ok(typeof data.reply === 'string');
  assert.ok(data.reply.length > 0);
});

test('AI Voice Chat route provides specific answer for touch-up question', async () => {
  const app = Fastify();
  await app.register(aiRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: {
      message: 'Thời hạn dặm mi quy định bao nhiêu ngày?',
      context: { pathname: '/dashboard/customers' },
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply.includes('21 ngày'));
  assert.ok(data.reply.includes('25 ngày'));
});
