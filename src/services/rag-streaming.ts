import { config } from '@/config';
import { WeaviateService, SearchResult } from '@/services/weaviate';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface RAGOptions {
  maxSearchResults?: number;
  similarityThreshold?: number;
}

interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  metadata: {
    fileName: string;
    chunkIndex: number;
    processedAt: string;
  };
}

/**
 * Generator function that reads a file and yields chunks in small batches
 * This prevents loading the entire file's chunks into memory at once
 */
async function* streamChunksFromFile(
  filePath: string,
  fileName: string,
  options: { chunkSize: number; batchSize: number }
): AsyncGenerator<DocumentChunk[]> {
  console.log(`   -> Streaming chunks from: ${fileName}`);

  const { chunkSize, batchSize } = options;

  try {
    // Read file content (for files up to ~100MB this is fine)
    const content = await fs.readFile(filePath, 'utf-8');
    const words = content.split(/\s+/); // Split by any whitespace

    let startIndex = 0;
    let batch: DocumentChunk[] = [];
    let chunkIndex = 0;

    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + chunkSize, words.length);
      const chunkContent = words.slice(startIndex, endIndex).join(' ').trim();

      if (chunkContent) {
        batch.push({
          id: uuidv4(),
          content: chunkContent,
          source: fileName,
          metadata: {
            fileName: fileName,
            chunkIndex: chunkIndex++,
            processedAt: new Date().toISOString(),
          },
        });
      }

      // When batch is full, yield it and clear it
      if (batch.length === batchSize) {
        yield batch;
        batch = []; // CRITICAL: Reset batch to free memory
      }

      startIndex += chunkSize;
    }

    // Yield any remaining chunks in the last batch
    if (batch.length > 0) {
      yield batch;
    }

    console.log(`   -> Finished streaming from: ${fileName}`);
  } catch (error) {
    console.error(`   ❌ Error streaming from ${fileName}:`, error);
    throw error;
  }
}

export class StreamingRAGService {
  private weaviateService: WeaviateService;

  constructor() {
    this.weaviateService = new WeaviateService();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Streaming RAG system...');
      await this.weaviateService.initialize();
      console.log('✅ Streaming RAG system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Streaming RAG system:', error);
      throw error;
    }
  }

  async processAndIndexDocuments(): Promise<void> {
    try {
      console.log('📚 Processing documents with TRUE memory-safe streaming...');

      const documentsPath = path.join(process.cwd(), 'data', 'documents');
      const files = await fs.readdir(documentsPath);
      const markdownFiles = files.filter(file => file.endsWith('.md') && file !== 'README.md');

      if (markdownFiles.length === 0) {
        console.log('⚠️ No markdown files found');
        return;
      }

      console.log(`📚 Processing ${markdownFiles.length} files with generator streaming...`);
      let totalChunks = 0;

      for (const fileName of markdownFiles) {
        try {
          console.log(`📄 Processing: ${fileName}`);

          const filePath = path.join(documentsPath, fileName);

          // Use generator to stream chunks in tiny batches
          const chunkStream = streamChunksFromFile(filePath, fileName, {
            chunkSize: config.rag.maxChunkTokens, // 30 words per chunk
            batchSize: 3, // Only 3 chunks at a time to minimize memory
          });

          let batchNumber = 0;
          let fileChunks = 0;

          // Process one tiny batch at a time - memory usage is minimal
          for await (const chunkBatch of chunkStream) {
            batchNumber++;
            try {
              // Send the small batch immediately to Weaviate
              await this.weaviateService.addChunks(chunkBatch);
              fileChunks += chunkBatch.length;
              totalChunks += chunkBatch.length;

              console.log(`   📦 Sent batch ${batchNumber} (${chunkBatch.length} chunks) to Weaviate`);

              // Clear memory after each batch
              if (global.gc) global.gc();
              await new Promise(resolve => setTimeout(resolve, 25)); // Small delay

            } catch (error) {
              console.error(`   ❌ Failed to send batch ${batchNumber}:`, error);
            }
          }

          console.log(`✅ Processed ${fileName} (${fileChunks} chunks in ${batchNumber} batches)`);

        } catch (error) {
          console.error(`❌ Failed to process ${fileName}:`, error);
        }
      }

      console.log(`✅ Successfully indexed ${totalChunks} total chunks`);
    } catch (error) {
      console.error('❌ Failed to process documents:', error);
      throw error;
    }
  }

    async search(query: string, options: RAGOptions = {}): Promise<SearchResult[]> {
    const {
      maxSearchResults = config.rag.maxSearchResults,
      similarityThreshold = 0.7,
    } = options;

    try {
      // Use nearText search since Weaviate has text2vec-transformers configured
      const results = await this.weaviateService.search(query, [], maxSearchResults);
      const filteredResults = results.filter((result: SearchResult) => result.score >= similarityThreshold);

      console.log(`🔍 Found ${filteredResults.length} relevant results for query: "${query}"`);
      return filteredResults;
    } catch (error) {
      console.error('❌ Failed to search documents:', error);
      return [];
    }
  }

  async getStats(): Promise<{ weaviate: any }> {
    try {
      const weaviateStats = await this.weaviateService.getStats();
      return { weaviate: weaviateStats };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { weaviate: { totalChunks: 0 } };
    }
  }

  async healthCheck(): Promise<{ weaviate: boolean }> {
    try {
      const weaviateHealth = await this.weaviateService.healthCheck();
      return { weaviate: weaviateHealth };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { weaviate: false };
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