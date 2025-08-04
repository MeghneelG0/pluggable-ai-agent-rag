import { FastifyInstance } from 'fastify';
import { AgentRequestSchema, AgentResponseSchema } from '@/types/agent';
import { MemoryService } from '@/services/memory';
import { StreamingRAGService } from '@/services/rag-streaming';
import { SimpleAgentService } from '@/services/agent-simple';
import { sendAgentError, handleValidationError } from '@/utils/error-handler';

export async function agentRoutes(fastify: FastifyInstance, opts: {
  memoryService: MemoryService;
  ragService: StreamingRAGService;
}) {
  // Agent message endpoint
  fastify.post<{
    Body: typeof AgentRequestSchema._type;
    Reply: typeof AgentResponseSchema._type;
  }>('/agent/message', async (request, reply) => {
    // Manual validation
    const validation = AgentRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return handleValidationError(reply, validation, request.body?.session_id);
    }

    const { session_id, message } = validation.data;

    try {
      // Create agent service with full capabilities
      const agentService = new SimpleAgentService(opts.memoryService, opts.ragService);

      // Initialize the agent service
      await agentService.initialize();

      // Process message with full agent functionality
      const response = await agentService.processMessage(session_id, message);

      reply.send(response);
    } catch (error) {
      fastify.log.error('Agent message processing failed:', error);
      return sendAgentError(reply, 500, 'Sorry, I encountered an error processing your message.', session_id);
    }
  });
}