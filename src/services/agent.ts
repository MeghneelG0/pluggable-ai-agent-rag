import { config } from '@/config';
import { MemoryService } from './memory';
import { StreamingRAGService } from './rag-streaming';
import { GeminiService } from './gemini';
import { WeatherPlugin } from './plugins/weather';
import { MathPlugin } from './plugins/math';
import { AgentRequest, AgentResponse } from '@/types/agent';

export interface PluginResult {
  name: string;
  input: string;
  output: any;
  success: boolean;
}

export class AgentService {
  private memoryService: MemoryService;
  private ragService: StreamingRAGService;
  private geminiService: GeminiService;
  private weatherPlugin: WeatherPlugin;
  private mathPlugin: MathPlugin;

  constructor(
    memoryService: MemoryService,
    ragService: StreamingRAGService
  ) {
    this.memoryService = memoryService;
    this.ragService = ragService;
    this.geminiService = new GeminiService();
    this.weatherPlugin = new WeatherPlugin();
    this.mathPlugin = new MathPlugin();
  }

  async processMessage(sessionId: string, message: string): Promise<AgentResponse> {
    try {
      console.log(`🤖 Processing message for session ${sessionId}: "${message}"`);

      // 1. Add user message to memory
      await this.memoryService.addMessage(sessionId, 'user', message);

      // 2. Get memory summary
      const memorySummary = await this.memoryService.getFormattedSummary(sessionId);

      // 3. Detect and execute plugins
      const pluginResults = await this.executePlugins(message);

      // 4. Perform RAG search (with fallback)
      let ragResults: any[] = [];
      try {
        ragResults = await this.ragService.search(message, {
          maxSearchResults: config.rag.maxSearchResults,
          similarityThreshold: 0.7,
        });
      } catch (error) {
        console.warn('⚠️ RAG search failed, continuing without document context:', error);
        ragResults = [];
      }

      // 5. Build the prompt
      const prompt = this.buildPrompt(message, memorySummary, ragResults, pluginResults);

      // 6. Generate AI response
      const llmResponse = await this.geminiService.generateCompletion({
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        maxTokens: 1000,
      });
      const aiResponse = llmResponse.content;

      // 7. Add assistant response to memory
      await this.memoryService.addMessage(sessionId, 'assistant', aiResponse);

      // 8. Get final memory snapshot
      const memory = await this.memoryService.getMemory(sessionId);
      const memorySnapshot = memory?.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })) || [];

      // 9. Build response
      const response: AgentResponse = {
        reply: aiResponse,
        used_chunks: ragResults.map(result => ({
          content: result.content,
          source: result.source,
          score: result.score,
          metadata: result.metadata,
        })),
        plugins_used: pluginResults.map(result => ({
          name: result.name,
          input: result.input,
          output: result.output,
          success: result.success,
        })),
        memory_snapshot: memorySnapshot,
        session_id: sessionId,
      };

      console.log(`✅ Agent response generated with ${ragResults.length} chunks and ${pluginResults.length} plugins`);
      return response;

    } catch (error) {
      console.error('❌ Agent processing failed:', error);
      throw error;
    }
  }

  private async executePlugins(message: string): Promise<PluginResult[]> {
    const results: PluginResult[] = [];

    try {
      // Weather plugin detection
      const weatherMatch = message.match(/weather\s+(?:in\s+)?([a-zA-Z\s,]+)/i);
      if (weatherMatch) {
        const city = weatherMatch[1].trim();
        console.log(`🌤️ Weather plugin detected for: ${city}`);

        try {
          const weatherResult = await this.weatherPlugin.getWeather(city);
          results.push({
            name: 'weather',
            input: city,
            output: weatherResult,
            success: true,
          });
        } catch (error) {
          results.push({
            name: 'weather',
            input: city,
            output: { error: 'Failed to get weather data' },
            success: false,
          });
        }
      }

      // Math plugin detection
      const mathMatch = message.match(/(\d+(?:\s*[\+\-\*\/\^]\s*\d+)+)/);
      if (mathMatch) {
        const expression = mathMatch[1];
        console.log(`🧮 Math plugin detected for: ${expression}`);

        try {
          const mathResult = await this.mathPlugin.evaluate(expression);
          results.push({
            name: 'math',
            input: expression,
            output: mathResult,
            success: true,
          });
        } catch (error) {
          results.push({
            name: 'math',
            input: expression,
            output: { error: 'Failed to evaluate expression' },
            success: false,
          });
        }
      }

    } catch (error) {
      console.error('❌ Plugin execution failed:', error);
    }

    return results;
  }

  private buildPrompt(
    message: string,
    memorySummary: string,
    ragResults: any[],
    pluginResults: PluginResult[]
  ): string {
    let prompt = `You are a helpful AI assistant with access to conversation memory, document knowledge, and plugin capabilities.

## CONVERSATION MEMORY
${memorySummary}

## RELEVANT DOCUMENT CONTEXT
`;

    if (ragResults.length > 0) {
      prompt += ragResults.map((result, index) =>
        `${index + 1}. Source: ${result.source}\nContent: ${result.content}\n`
      ).join('\n');
    } else {
      prompt += "No relevant documents found.\n";
    }

    prompt += `\n## PLUGIN RESULTS\n`;

    if (pluginResults.length > 0) {
      prompt += pluginResults.map(result =>
        `${result.name.toUpperCase()}: ${JSON.stringify(result.output)}`
      ).join('\n');
    } else {
      prompt += "No plugins were used.\n";
    }

    prompt += `\n## USER MESSAGE
${message}

## INSTRUCTIONS
- Provide a helpful, accurate response based on the available context
- If you use information from documents, mention the source
- If plugins were used, incorporate their results naturally
- Keep responses concise but informative
- If you don't have relevant information, say so honestly

## RESPONSE
`;

    return prompt;
  }
}