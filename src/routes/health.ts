import { FastifyInstance } from 'fastify';
import { HealthResponse } from '@/types/api';
import { MemoryService } from '@/services/memory';
import { sendHealthError } from '@/utils/error-handler';

export async function healthRoutes(fastify: FastifyInstance, opts: { memoryService: MemoryService }) {
  // Health check endpoint
  fastify.get<{ Reply: HealthResponse }>('/health', async (_request, reply) => {
    try {
      const memoryStats = opts.memoryService.getStats();
      const memoryStatus: 'ok' | 'error' = memoryStats.totalSessions >= 0 ? 'ok' : 'error';

      const response: HealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        services: {
          memory: memoryStatus,
          rag: 'ok',
          plugins: 'ok',
          llm: 'ok',
        },
      };

      reply.send(response);
    } catch (error) {
      fastify.log.error('Health check failed:', error);
      return sendHealthError(reply, 500);
    }
  });
}