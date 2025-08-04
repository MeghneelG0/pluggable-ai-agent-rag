// Document chunk interface
export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  metadata: {
    title?: string;
    section?: string;
    page?: number;
    [key: string]: unknown;
  };
  embedding?: number[];
  tokenCount: number;
}

// Embedding interface
export interface Embedding {
  vector: number[];
  text: string;
  metadata?: Record<string, unknown>;
}

// Search result interface
export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  rank: number;
}

// RAG result for agent responses
export interface RAGResult {
  content: string;
  source: string;
  score: number;
  metadata: Record<string, any>;
}

// RAG options for search
export interface RAGOptions {
  maxSearchResults?: number;
  similarityThreshold?: number;
}

// RAG service interface
export interface IRAGService {
  addDocument(content: string, source: string, metadata?: Record<string, unknown>): Promise<void>;
  search(query: string, limit?: number): Promise<SearchResult[]>;
  getChunk(id: string): Promise<DocumentChunk | null>;
  getAllChunks(): Promise<DocumentChunk[]>;
  clearIndex(): Promise<void>;
}

// Chunking options
export interface ChunkingOptions {
  maxTokens: number;
  overlap: number;
  separator: string;
}

// Embedding service interface
export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}