import { v4 as uuidv4 } from 'uuid';
import {
  IMemoryService,
  SessionMemory,
  MemoryMessage,
  MemorySummary
} from '@/types/memory';
import { config } from '@/config';

export class MemoryService implements IMemoryService {
  private sessions = new Map<string, SessionMemory>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupOldSessions(),
      config.memory.cleanupInterval
    );
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const message: MemoryMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
    };

    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        sessionId,
        messages: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        maxMessages: config.memory.maxMessages,
      };
      this.sessions.set(sessionId, session);
    }

    session.messages.push(message);
    session.lastAccessed = new Date();

    // Keep only the last N messages
    if (session.messages.length > session.maxMessages) {
      session.messages = session.messages.slice(-session.maxMessages);
    }
  }

  async getMemory(sessionId: string): Promise<SessionMemory | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = new Date();
    }
    return session || null;
  }

  async getSummary(sessionId: string, messageCount = 2): Promise<MemorySummary> {
    const session = await this.getMemory(sessionId);

    if (!session) {
      return {
        lastMessages: [],
        totalMessages: 0,
        sessionAge: 0,
      };
    }

    const lastMessages = session.messages.slice(-messageCount);
    const sessionAge = Math.floor(
      (Date.now() - session.createdAt.getTime()) / (1000 * 60)
    );

    return {
      lastMessages,
      totalMessages: session.messages.length,
      sessionAge,
    };
  }

  async clearMemory(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanupOldSessions(maxAgeMinutes = 1440): Promise<void> { // 24 hours default
    const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000);
    const sessionsToDelete: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastAccessed.getTime() < cutoff) {
        sessionsToDelete.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDelete) {
      this.sessions.delete(sessionId);
    }

    if (sessionsToDelete.length > 0) {
      console.log(`Cleaned up ${sessionsToDelete.length} old sessions`);
    }
  }

  // Utility method to get memory summary as formatted string
  async getFormattedSummary(sessionId: string, messageCount = 2): Promise<string> {
    const summary = await this.getSummary(sessionId, messageCount);

    if (summary.lastMessages.length === 0) {
      return 'No previous conversation history.';
    }

    const formattedMessages = summary.lastMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Previous conversation (last ${summary.lastMessages.length} messages):\n${formattedMessages}`;
  }

  // Get statistics
  getStats(): { totalSessions: number; totalMessages: number } {
    let totalMessages = 0;
    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
    }

    return {
      totalSessions: this.sessions.size,
      totalMessages,
    };
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}