import { FastifyReply } from 'fastify';
import { AgentResponseSchema } from '@/types/agent';

// Standard error response for agent endpoints
export function sendAgentError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  sessionId: string = 'unknown'
) {
  const errorResponse: typeof AgentResponseSchema._type = {
    reply: message,
    used_chunks: [],
    plugins_used: [],
    memory_snapshot: [],
    session_id: sessionId,
  };

  return reply.status(statusCode).send(errorResponse);
}

// Standard error response for health endpoint
export function sendHealthError(reply: FastifyReply, statusCode: number = 500) {
  return reply.status(statusCode).send({
    status: 'error',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      memory: 'error',
      rag: 'error',
      plugins: 'error',
      llm: 'error',
    },
  });
}

// Validation error handler
export function handleValidationError(
  reply: FastifyReply,
  _validation: { success: false; error: any },
  sessionId?: string
) {
  return sendAgentError(
    reply,
    400,
    'Invalid request body',
    sessionId || 'unknown'
  );
}