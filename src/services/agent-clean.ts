import { config } from '@/config';
import { MemoryService } from '@/services/memory';
import { StreamingRAGService } from '@/services/rag-streaming';
import { GeminiService } from '@/services/gemini';
import { PluginManager } from '@/services/plugin-manager';
import {
  AgentResponse,
  AgentServiceInterface,
  AgentError
} from '@/types/agent';
import { PluginResult } from '@/types/plugins';
import { RAGResult } from '@/types/rag';

export class AgentService implements AgentServiceInterface {
  private memoryService: MemoryService;
  private ragService: StreamingRAGService;
  private geminiService: GeminiService;
  private pluginManager: PluginManager;

  constructor(
    memoryService: MemoryService,
    ragService: StreamingRAGService
  ) {
    this.memoryService = memoryService;
    this.ragService = ragService;
    this.geminiService = new GeminiService();
    this.pluginManager = new PluginManager();
  }

  async initialize(): Promise<void> {
    try {
      await this.geminiService.initialize();
      console.log('✅ Agent service initialized');
    } catch (error) {
      console.warn('⚠️ Agent service initialization failed:', error);
    }
  }

  async processMessage(sessionId: string, message: string): Promise<AgentResponse> {
    try {
      console.log(`🤖 Processing message for session ${sessionId}: "${message}"`);

      // 1. Add user message to memory
      await this.memoryService.addMessage(sessionId, 'user', message);

      // 2. Get memory summary
      const memorySummary = await this.memoryService.getFormattedSummary(sessionId);

      // 3. Detect and execute plugins
      const pluginResults = await this.pluginManager.detectAndExecutePlugins(message);

      // 4. Perform RAG search
      const ragResults = await this.performRAGSearch(message);

      // 5. Build the prompt with all context
      const prompt = this.buildPrompt(message, memorySummary, ragResults, pluginResults);

      // 6. Generate AI response
      const aiResponse = await this.generateAIResponse(prompt, message);

      // 7. Add assistant response to memory
      await this.memoryService.addMessage(sessionId, 'assistant', aiResponse);

      // 8. Build final response
      const response = await this.buildResponse(sessionId, aiResponse, ragResults, pluginResults);

      console.log(`✅ Agent response generated for session ${sessionId}`);
      return response;

    } catch (error) {
      console.error('❌ Failed to process message:', error);
      throw this.createAgentError('PROCESSING_FAILED', 'Failed to process message', sessionId);
    }
  }

  private async performRAGSearch(message: string): Promise<RAGResult[]> {
    try {
      const searchQuery = this.enhanceSearchQuery(message);
      const results = await this.ragService.search(searchQuery, {
        maxSearchResults: config.rag.maxSearchResults,
        similarityThreshold: 0.5,
      });

      return results.map(result => ({
        content: result.content || '',
        source: result.source || '',
        score: result.score || 0,
        metadata: result.metadata || {},
      }));
    } catch (error) {
      console.warn('⚠️ RAG search failed, continuing without document context:', error);
      return [];
    }
  }

  private async generateAIResponse(prompt: string, originalMessage: string): Promise<string> {
    try {
      const llmResponse = await this.geminiService.generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 1000,
      });
      return llmResponse.content;
    } catch (error) {
      console.warn('⚠️ LLM generation failed, using fallback response:', error);
      return `I understand you asked: "${originalMessage}". Based on the available context, I can provide some information, but I'm currently experiencing technical difficulties with my AI generation capabilities.`;
    }
  }

  private async buildResponse(
    sessionId: string,
    aiResponse: string,
    ragResults: RAGResult[],
    pluginResults: PluginResult[]
  ): Promise<AgentResponse> {
    const memory = await this.memoryService.getMemory(sessionId);
    const memorySnapshot = memory?.messages?.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    })) || [];

    return {
      reply: aiResponse,
      used_chunks: ragResults.map(result => ({
        content: result.content,
        source: result.source,
        score: result.score,
        metadata: result.metadata,
      })),
      plugins_used: pluginResults.map(result => ({
        name: result.name,
        success: result.success,
        data: result.data,
        error: result.error,
      })),
      memory_snapshot: memorySnapshot,
      session_id: sessionId,
    };
  }

  private buildPrompt(
    message: string,
    memorySummary: string,
    ragResults: RAGResult[],
    pluginResults: PluginResult[]
  ): string {
    let prompt = `You are a helpful AI assistant with access to conversation memory, document knowledge, and plugin capabilities.

## CONVERSATION MEMORY
${memorySummary}

## DOCUMENT CONTEXT
`;

    if (ragResults.length > 0) {
      prompt += ragResults.map((result, index) =>
        `${index + 1}. Source: ${result.source}\nContent: ${result.content}\n`
      ).join('\n');
    } else {
      prompt += "No relevant documents found.\n";
    }

    // Add plugin results to prompt
    if (pluginResults.length > 0) {
      prompt += `\n## PLUGIN RESULTS\n`;
      pluginResults.forEach((result, index) => {
        if (result.success) {
          prompt += `${index + 1}. ${result.name.toUpperCase()} Plugin:\n`;
          if (result.name === 'weather') {
            const weather = result.data;
            prompt += `   Location: ${weather.location}\n   Temperature: ${weather.temperature}°C\n   Condition: ${weather.condition}\n   Humidity: ${weather.humidity}%\n   Wind Speed: ${weather.windSpeed} km/h\n`;
          } else if (result.name === 'math') {
            const math = result.data;
            prompt += `   Expression: ${math.expression}\n   Result: ${math.result}\n`;
          }
        } else {
          prompt += `${index + 1}. ${result.name.toUpperCase()} Plugin: Failed - ${result.error}\n`;
        }
      });
    }

    prompt += `\n## USER MESSAGE
${message}

## INSTRUCTIONS
- You are a knowledgeable AI assistant with expertise in various topics
- Provide comprehensive, confident responses using your general knowledge
- When documents contain relevant information, use it to enhance your response with specific details and examples
- Always cite sources when using document information (e.g., "According to [filename]...")
- When plugin results are available, incorporate them naturally into your response
- For weather queries, provide a friendly summary of the weather data
- For math queries, confirm the calculation and provide the result clearly
- Only say "I don't have enough information" for very specific or technical questions you truly cannot answer
- Be helpful, informative, and confident in your responses

## RESPONSE
`;

    return prompt;
  }

  private enhanceSearchQuery(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('what is') || lowerMessage.includes('define') || lowerMessage.includes('explain')) {
      const topic = message.replace(/what is|define|explain/gi, '').trim();
      return `${topic} definition overview introduction basics`;
    }

    if (lowerMessage.includes('how to') || lowerMessage.includes('how do')) {
      return `${message} guide tutorial steps instructions`;
    }

    return message;
  }

  private createAgentError(code: string, message: string, sessionId?: string): AgentError {
    return {
      code,
      message,
      sessionId: sessionId || '',
      timestamp: new Date().toISOString(),
    };
  }
}