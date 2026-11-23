import { FastifyInstance } from 'fastify';
import { registerAiVoiceChatRoutes } from './routes/voice-chat.routes.js';
import { registerAiChatSessionRoutes } from './routes/ai-chat-sessions.routes.js';
import { registerAgTaskBridgeRoutes } from './routes/ag-task-bridge.routes.js';
import { registerAvatarAiRoutes } from './routes/avatar-ai.routes.js';

export async function aiRoutes(fastify: FastifyInstance) {
  registerAiVoiceChatRoutes(fastify);
  registerAiChatSessionRoutes(fastify);
  registerAgTaskBridgeRoutes(fastify);
  registerAvatarAiRoutes(fastify);
}
