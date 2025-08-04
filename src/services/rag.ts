import { config } from '@/config';
import { WeaviateService, SearchResult } from './weaviate';
import { SimpleDocumentProcessor } from './simple-document-processor';
import { GeminiService } from './gemini';

export interface RAGOptions {
  maxSearchResults?: number;
  similarityThreshold?: number;
}

export class RAGService {
  private weaviateService: WeaviateService;
  private documentProcessor: SimpleDocumentProcessor;
  private geminiService: GeminiService;

  constructor() {
    this.weaviateService = new WeaviateService();
    this.documentProcessor = new SimpleDocumentProcessor();
    this.geminiService = new GeminiService();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing RAG system with Weaviate...');

      // Initialize Weaviate
      await this.weaviateService.initialize();

      // Initialize Gemini service
      await this.geminiService.initialize();

      console.log('✅ RAG system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RAG system:', error);
      throw error;
    }
  }

  async processAndIndexDocuments(): Promise<void> {
    try {
      console.log('📚 Processing and indexing documents...');

      // Process documents one by one to avoid memory accumulation
      const files = await this.documentProcessor.getMarkdownFiles();

      if (files.length === 0) {
        console.log('⚠️  No documents to process');
        return;
      }

      console.log(`📚 Processing ${files.length} markdown files one by one...`);

      let totalChunks = 0;

      for (const file of files) {
        console.log(`📄 Processing file: ${file}`);

                 // Process one file at a time
         const chunks = await this.documentProcessor.processDocument(file, {
           maxChunkTokens: config.rag.maxChunkTokens, // Use config values
           chunkOverlap: config.rag.chunkOverlap,     // Use config values
         });

        if (chunks.length > 0) {
          // Store chunks directly in Weaviate (no embeddings needed)
          await this.weaviateService.addChunks(chunks);
          totalChunks += chunks.length;

          console.log(`✅ Processed ${chunks.length} chunks from ${file}`);

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }

          // Small delay to allow memory cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Successfully indexed ${totalChunks} total chunks`);
    } catch (error) {
      console.error('❌ Failed to process and index documents:', error);
      throw error;
    }
  }

  async search(query: string, options: RAGOptions = {}): Promise<SearchResult[]> {
    const {
      maxSearchResults = config.rag.maxSearchResults,
      similarityThreshold = 0.7,
    } = options;

    try {
      // Search in Weaviate (no embedding needed - Weaviate handles it)
      const results = await this.weaviateService.search(query, [], maxSearchResults);

      // Filter by similarity threshold
      const filteredResults = results.filter((result: SearchResult) => result.score >= similarityThreshold);

      console.log(`🔍 Found ${filteredResults.length} relevant chunks for query: "${query}"`);

      return filteredResults;
    } catch (error) {
      console.error('❌ Failed to search documents:', error);
      return [];
    }
  }





  async getStats(): Promise<{
    documents: any;
    weaviate: any;
  }> {
    try {
      const [documentStats, weaviateStats] = await Promise.all([
        this.documentProcessor.getDocumentStats(),
        this.weaviateService.getStats(),
      ]);

      return {
        documents: documentStats,
        weaviate: weaviateStats,
      };
    } catch (error) {
      console.error('❌ Failed to get RAG stats:', error);
      return {
        documents: { totalFiles: 0, totalChunks: 0, files: [] },
        weaviate: { totalChunks: 0 },
      };
    }
  }

  async healthCheck(): Promise<{
    weaviate: boolean;
    gemini: boolean;
    documents: boolean;
  }> {
    try {
      // Check Weaviate health
      const weaviateHealth = await this.weaviateService.healthCheck();

      // Check Gemini health (don't fail if it's not available)
      let geminiHealth = false;
      try {
        geminiHealth = await this.geminiService.healthCheck();
      } catch (error) {
        console.warn('⚠️ Gemini health check failed (API key may be missing):', error instanceof Error ? error.message : 'Unknown error');
      }

      // Check if documents directory exists and has files
      const documentStats = await this.documentProcessor.getDocumentStats();
      const documentsHealth = documentStats.totalFiles > 0;

      return {
        weaviate: weaviateHealth,
        gemini: geminiHealth,
        documents: documentsHealth,
      };
    } catch (error) {
      console.error('❌ RAG health check failed:', error);
      return {
        weaviate: false,
        gemini: false,
        documents: false,
      };
    }
  }

  async clearIndex(): Promise<void> {
    try {
      await this.weaviateService.deleteAllChunks();
      console.log('✅ Cleared all indexed documents');
    } catch (error) {
      console.error('❌ Failed to clear index:', error);
      throw error;
    }
  }
}
