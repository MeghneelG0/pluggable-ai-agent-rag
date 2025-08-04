import { v4 as uuidv4 } from 'uuid';

export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, any>;
}

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  score: number;
  metadata: Record<string, any>;
}

export class MemoryVectorStore {
  private chunks: DocumentChunk[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      console.log('✅ Memory vector store initialized (mock mode)');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize memory vector store:', error);
      throw error;
    }
  }

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      // Add chunks to memory (limit to prevent memory issues)
      const maxChunks = 1000; // Safety limit
      if (this.chunks.length + chunks.length > maxChunks) {
        console.warn(`⚠️ Memory limit reached (${maxChunks} chunks), clearing old chunks`);
        this.chunks = this.chunks.slice(-maxChunks / 2); // Keep recent half
      }
      
      this.chunks.push(...chunks);
      console.log(`✅ Added ${chunks.length} chunks to memory store (total: ${this.chunks.length})`);
    } catch (error) {
      console.error('❌ Failed to add chunks to memory store:', error);
      throw error;
    }
  }

  async search(query: string, embedding: number[], limit: number = 3): Promise<SearchResult[]> {
    try {
      if (this.chunks.length === 0) {
        console.log('⚠️ No chunks in memory store');
        return [];
      }

      // Simple keyword-based search (no real vector similarity)
      const queryWords = query.toLowerCase().split(' ');
      const results: SearchResult[] = [];

      for (const chunk of this.chunks) {
        const chunkWords = chunk.content.toLowerCase().split(' ');
        let score = 0;
        
        // Count matching words
        for (const queryWord of queryWords) {
          if (chunkWords.includes(queryWord)) {
            score += 1;
          }
        }
        
        if (score > 0) {
          results.push({
            id: chunk.id,
            content: chunk.content,
            source: chunk.source,
            score: score / queryWords.length, // Normalize score
            metadata: chunk.metadata,
          });
        }
      }

      // Sort by score and return top results
      const sortedResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      console.log(`🔍 Found ${sortedResults.length} relevant chunks for query: "${query}"`);
      return sortedResults;
    } catch (error) {
      console.error('❌ Failed to search memory store:', error);
      return [];
    }
  }

  async deleteAllChunks(): Promise<void> {
    try {
      this.chunks = [];
      console.log('✅ Cleared all chunks from memory store');
    } catch (error) {
      console.error('❌ Failed to clear memory store:', error);
      throw error;
    }
  }

  async getStats(): Promise<{ totalChunks: number }> {
    try {
      return { totalChunks: this.chunks.length };
    } catch (error) {
      console.error('❌ Failed to get memory store stats:', error);
      return { totalChunks: 0 };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.isInitialized;
    } catch (error) {
      console.error('❌ Memory store health check failed:', error);
      return false;
    }
  }
}