import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '@/config';
import { MemoryService } from '@/services/memory';
import { StreamingRAGService } from '@/services/rag-streaming';
import { healthRoutes } from '@/routes/health';
import { agentRoutes } from '@/routes/agent';
import { ragRoutes } from '@/routes/rag';

export class Server {
  private fastify: FastifyInstance;
  private memoryService: MemoryService;
  private ragService: StreamingRAGService;

  constructor() {
    this.memoryService = new MemoryService();
    this.ragService = new StreamingRAGService();

    this.fastify = Fastify({
      logger: {
        level: config.server.logLevel,
      },
    });
  }

  async setup() {
    try {
      // Initialize RAG service
      await this.ragService.initialize();

      // Register CORS
      await this.fastify.register(cors, {
        origin: config.server.corsOrigin,
        credentials: true,
      });

      // Register routes
      await this.fastify.register(healthRoutes, { memoryService: this.memoryService });
      await this.fastify.register(agentRoutes, {
        memoryService: this.memoryService,
        ragService: this.ragService
      });
      await this.fastify.register(ragRoutes, { ragService: this.ragService });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      return this.fastify;
    } catch (error) {
      this.fastify.log.error('Error setting up server:', error);
      throw error;
    }
  }

  private setupGracefulShutdown() {
    const gracefulShutdown = async (signal: string) => {
      this.fastify.log.info(`Received ${signal}, shutting down gracefully...`);
      this.memoryService.destroy();
      await this.fastify.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  async start() {
    try {
      await this.fastify.listen({
        port: config.port,
        host: '0.0.0.0'
      });

      this.fastify.log.info(`Server listening on port ${config.port}`);
      this.fastify.log.info(`Health check available at http://localhost:${config.port}/health`);
    } catch (error) {
      this.fastify.log.error('Error starting server:', error);
      throw error;
    }
  }
}