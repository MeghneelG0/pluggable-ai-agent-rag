import { FastifyInstance } from 'fastify';
import { StreamingRAGService } from '@/services/rag-streaming';

export async function ragRoutes(fastify: FastifyInstance, opts: { ragService: StreamingRAGService }) {
  // Process and index documents
  fastify.post('/rag/process', async (_request, reply) => {
    try {
      await opts.ragService.processAndIndexDocuments();

      reply.send({
        success: true,
        message: 'Documents processed and indexed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to process documents:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to process documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Search documents
  fastify.post<{
    Body: {
      query: string;
      maxResults?: number;
      similarityThreshold?: number;
    };
  }>('/rag/search', async (request, reply) => {
    try {
      const { query, maxResults, similarityThreshold } = request.body;

      if (!query || typeof query !== 'string') {
        return reply.status(400).send({
          success: false,
          error: 'Query is required and must be a string',
        });
      }

      const results = await opts.ragService.search(query, {
        maxSearchResults: maxResults || 3,
        similarityThreshold: similarityThreshold || 0.7,
      });

      reply.send({
        success: true,
        query,
        results,
        count: results.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to search documents:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to search documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get RAG stats
  fastify.get('/rag/stats', async (_request, reply) => {
    try {
      const stats = await opts.ragService.getStats();

      reply.send({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to get RAG stats:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to get RAG stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Health check for RAG system
  fastify.get('/rag/health', async (_request, reply) => {
    try {
      const health = await opts.ragService.healthCheck();
      const overallHealth = health.weaviate;

      reply.send({
        success: true,
        healthy: overallHealth,
        services: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to check RAG health:', error);
      reply.status(500).send({
        success: false,
        healthy: false,
        error: 'Failed to check RAG health',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Clear index
  fastify.delete('/rag/clear', async (_request, reply) => {
    try {
      await opts.ragService.clearIndex();

      reply.send({
        success: true,
        message: 'Index cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to clear index:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to clear index',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}