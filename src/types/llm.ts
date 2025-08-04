// LLM types - no longer importing from agent

// LLM message interface
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// LLM request interface
export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

// LLM response interface
export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

// LLM service interface
export interface ILLMService {
  generateCompletion(request: LLMRequest): Promise<LLMResponse>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

// Prompt template interface
export interface PromptTemplate {
  system: string;
  user: string;
  variables: string[];
}

// Prompt builder interface
export interface IPromptBuilder {
  buildSystemPrompt(context: any): string;
  buildUserPrompt(context: any): string;
  buildFullPrompt(context: any): LLMRequest;
}