import { config } from '@/config';
import { MemoryService } from './memory';
import { StreamingRAGService } from './rag-streaming';
import { GeminiService } from './gemini';

export interface SimpleAgentResponse {
  reply: string;
  used_chunks: any[];
  plugins_used: any[];
  memory_snapshot: any[];
  session_id: string;
}

export class SimpleAgentService {
  private memoryService: MemoryService;
  private ragService: StreamingRAGService;
  private geminiService: GeminiService;

  constructor(
    memoryService: MemoryService,
    ragService: StreamingRAGService
  ) {
    this.memoryService = memoryService;
    this.ragService = ragService;
    this.geminiService = new GeminiService();
  }

  async initialize(): Promise<void> {
    try {
      await this.geminiService.initialize();
    } catch (error) {
      console.warn('⚠️ Gemini service initialization failed:', error);
    }
  }

  async processMessage(sessionId: string, message: string): Promise<SimpleAgentResponse> {
    try {
      console.log(`🤖 Processing message for session ${sessionId}: "${message}"`);

      // 1. Add user message to memory
      await this.memoryService.addMessage(sessionId, 'user', message);

      // 2. Get memory summary
      const memorySummary = await this.memoryService.getFormattedSummary(sessionId);

             // 3. Perform RAG search (with fallback)
       let ragResults: any[] = [];
       try {
         // Improve search query for better results
         const searchQuery = this.enhanceSearchQuery(message);
         ragResults = await this.ragService.search(searchQuery, {
           maxSearchResults: config.rag.maxSearchResults,
           similarityThreshold: 0.5, // Lower threshold for better recall
         });
       } catch (error) {
         console.warn('⚠️ RAG search failed, continuing without document context:', error);
         ragResults = [];
       }

      // 4. Build the prompt
      const prompt = this.buildPrompt(message, memorySummary, ragResults);

      // 5. Generate AI response
      let aiResponse = 'I apologize, but I cannot generate a response at the moment.';
      try {
        const llmResponse = await this.geminiService.generateCompletion({
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          maxTokens: 1000,
        });
        aiResponse = llmResponse.content;
      } catch (error) {
        console.warn('⚠️ LLM generation failed, using fallback response:', error);
        aiResponse = `I understand you asked: "${message}". Based on the available context, I can provide some information, but I'm currently experiencing technical difficulties with my AI generation capabilities.`;
      }

      // 6. Add assistant response to memory
      await this.memoryService.addMessage(sessionId, 'assistant', aiResponse);

      // 7. Get final memory snapshot
      const memory = await this.memoryService.getMemory(sessionId);
      const memorySnapshot = memory?.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })) || [];

      // 8. Build response
      const response: SimpleAgentResponse = {
        reply: aiResponse,
        used_chunks: ragResults.map(result => ({
          content: result.content || '',
          source: result.source || '',
          score: result.score || 0,
          metadata: result.metadata || {},
        })),
        plugins_used: [], // Simplified - no plugins for now
        memory_snapshot: memorySnapshot,
        session_id: sessionId,
      };

      console.log(`✅ Agent response generated with ${ragResults.length} chunks`);
      return response;

    } catch (error) {
      console.error('❌ Agent processing failed:', error);
      throw error;
    }
  }

  private buildPrompt(
    message: string,
    memorySummary: string,
    ragResults: any[]
  ): string {
         let prompt = `You are a helpful AI assistant with access to conversation memory and document knowledge.

## CONVERSATION MEMORY
${memorySummary}

## RELEVANT DOCUMENT CONTEXT
`;

     if (ragResults.length > 0) {
       prompt += ragResults.map((result, index) =>
         `${index + 1}. Source: ${result.source || 'Unknown'}\nContent: ${result.content || 'No content'}\n`
       ).join('\n');
     } else {
       prompt += "No relevant documents found.\n";
     }

     prompt += `\n## USER MESSAGE
${message}

## INSTRUCTIONS
- You are a knowledgeable AI assistant with expertise in various topics
- Provide comprehensive, confident responses using your general knowledge
- When documents contain relevant information, use it to enhance your response with specific details and examples
- Always cite sources when using document information (e.g., "According to [filename]...")
- For basic questions like "What is X?", provide a clear definition even if documents don't contain it
- Only say "I don't have enough information" for very specific or technical questions you truly cannot answer
- Be helpful, informative, and confident in your responses

## RESPONSE
`;

         return prompt;
   }

       private enhanceSearchQuery(message: string): string {
      // Enhance search queries for better RAG results
      const lowerMessage = message.toLowerCase();

      // Add relevant keywords for common questions
      if (lowerMessage.includes('what is') || lowerMessage.includes('define') || lowerMessage.includes('explain')) {
        const topic = message.replace(/what is|define|explain/gi, '').trim();
        return `${topic} definition overview introduction basics`;
      }

      if (lowerMessage.includes('how to') || lowerMessage.includes('how do')) {
        return `${message} guide tutorial steps instructions`;
      }

      return message;
    }
 }