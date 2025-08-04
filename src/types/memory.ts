// Memory message types
export interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id: string;
}

// Session memory interface
export interface SessionMemory {
  sessionId: string;
  messages: MemoryMessage[];
  createdAt: Date;
  lastAccessed: Date;
  maxMessages: number;
}

// Memory summary for prompts
export interface MemorySummary {
  lastMessages: MemoryMessage[];
  totalMessages: number;
  sessionAge: number; // in minutes
}

// Memory service interface
export interface IMemoryService {
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void>;
  getMemory(sessionId: string): Promise<SessionMemory | null>;
  getSummary(sessionId: string, messageCount?: number): Promise<MemorySummary>;
  clearMemory(sessionId: string): Promise<void>;
  cleanupOldSessions(maxAgeMinutes?: number): Promise<void>;
}