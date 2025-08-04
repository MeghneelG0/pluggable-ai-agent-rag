import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/config';

export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private embeddingModel: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey || '');
  }

  async initialize(): Promise<void> {
    try {
      if (!config.gemini.apiKey) {
        console.warn('⚠️  No Gemini API key provided - LLM features will be disabled');
        return;
      }

      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      this.embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });

      console.log('✅ Gemini service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini service:', error);
      throw error;
    }
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    try {
      if (!this.model) {
        throw new Error('Gemini model not initialized - API key required');
      }

      // Convert messages to Gemini format
      const prompt = this.convertMessagesToPrompt(request.messages);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Estimate token usage (rough approximation)
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(text);

      return {
        content: text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (error) {
      console.error('❌ Failed to generate completion:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.embeddingModel) {
        throw new Error('Gemini embedding model not initialized - API key required');
      }

      const result = await this.embeddingModel.embedContent(text);
      const embedding = await result.embedding;

      return embedding.values;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!this.embeddingModel) {
        throw new Error('Gemini embedding model not initialized - API key required');
      }

      const embeddings: number[][] = [];

      // Process in batches to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const batchPromises = batch.map(text => this.generateEmbedding(text));
        const batchEmbeddings = await Promise.all(batchPromises);

        embeddings.push(...batchEmbeddings);
      }

      return embeddings;
    } catch (error) {
      console.error('❌ Failed to generate embeddings:', error);
      throw error;
    }
  }

  private convertMessagesToPrompt(messages: LLMRequest['messages']): string {
    let prompt = '';

    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `System: ${message.content}\n\n`;
          break;
        case 'user':
          prompt += `User: ${message.content}\n\n`;
          break;
        case 'assistant':
          prompt += `Assistant: ${message.content}\n\n`;
          break;
      }
    }

    return prompt.trim();
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!config.gemini.apiKey) {
        return false;
      }

      // Try a simple completion to test the API
      const testRequest: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        maxTokens: 10,
      };

      await this.generateCompletion(testRequest);
      return true;
    } catch (error) {
      console.error('❌ Gemini health check failed:', error);
      return false;
    }
  }

  // Mock methods for when API key is not available
  async generateMockCompletion(request: LLMRequest): Promise<LLMResponse> {
    const mockResponse = `This is a mock response since no Gemini API key is configured.

Original request: ${request.messages.map(m => `${m.role}: ${m.content}`).join('\n')}

To enable real AI responses, please add your GEMINI_API_KEY to the .env file.`;

    return {
      content: mockResponse,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async generateMockEmbedding(_text: string): Promise<number[]> {
    // Generate a mock embedding (random vector)
    const mockEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5);
    return mockEmbedding;
  }

  async generateMockEmbeddings(texts: string[]): Promise<number[][]> {
    const mockEmbeddings = texts.map(() =>
      Array.from({ length: 768 }, () => Math.random() - 0.5)
    );
    return mockEmbeddings;
  }
}