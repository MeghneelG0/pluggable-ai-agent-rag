import { z } from 'zod';

// Request/Response schemas
export const AgentRequestSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  message: z.string().min(1, 'Message is required'),
});

export const AgentResponseSchema = z.object({
  reply: z.string(),
  used_chunks: z.array(z.object({
    content: z.string(),
    source: z.string(),
    score: z.number(),
    metadata: z.record(z.any()),
  })),
  plugins_used: z.array(z.object({
    name: z.string(),
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
  })),
  memory_snapshot: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
  })),
  session_id: z.string(),
});

// Type exports
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Agent service interfaces
export interface AgentServiceInterface {
  initialize(): Promise<void>;
  processMessage(sessionId: string, message: string): Promise<AgentResponse>;
}

// Error types
export interface AgentError {
  code: string;
  message: string;
  sessionId?: string;
  timestamp: string;
}