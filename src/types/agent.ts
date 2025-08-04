import { z } from 'zod';

// Agent request schema
export const AgentRequestSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long')
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;

// Agent response schema
export const AgentResponseSchema = z.object({
  reply: z.string(),
  used_chunks: z.array(z.object({
    content: z.string(),
    source: z.string(),
    score: z.number().min(0).max(1),
    metadata: z.record(z.unknown()).optional()
  })),
  plugins_used: z.array(z.object({
    name: z.string(),
    input: z.string(),
    output: z.record(z.unknown()),
    success: z.boolean()
  })),
  memory_snapshot: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().optional()
  })),
  session_id: z.string()
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Agent context for processing
export interface AgentContext {
  sessionId: string;
  userMessage: string;
  memorySummary: string;
  retrievedChunks: any[]; // Will be properly typed in Phase 2
  pluginOutputs: any[]; // Will be properly typed in Phase 3
}