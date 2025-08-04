import weaviate, { WeaviateClient, ObjectsBatcher } from 'weaviate-ts-client';
import { config } from '@/config';

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

export class WeaviateService {
  private client: WeaviateClient;
  private className = 'DocumentChunk';

  constructor() {
    this.client = weaviate.client({
      scheme: 'https',
      host: config.weaviate.url.replace('https://', '').replace('http://', ''),
      apiKey: new weaviate.ApiKey(config.weaviate.apiKey || ''),
      headers: {
        'X-Weaviate-Cluster-Url': config.weaviate.url,
      },
    });
  }

  async initialize(): Promise<void> {
    try {
      // Check if class exists (but don't create it - user will create manually)
      const classExists = await this.client.schema.exists(this.className);

      if (!classExists) {
        console.log(`❌ Schema class '${this.className}' not found. Please create it manually in Weaviate console with vectorizer: 'text2vec-weaviate'`);
        throw new Error(`Schema class '${this.className}' not found. Create manually in Weaviate console.`);
      } else {
        console.log(`✅ Weaviate schema found for class: ${this.className}`);
      }
    } catch (error) {
      console.warn('⚠️ Weaviate not available (using mock mode):', error instanceof Error ? error.message : 'Unknown error');
      console.log('📝 To use real Weaviate, set up a local instance or configure WEAVIATE_URL');
      // Don't throw error - allow mock mode to work
    }
  }

  private async createSchema(): Promise<void> {
    const schema = {
      class: this.className,
      description: 'Document chunks for RAG system',
      vectorizer: 'text2vec-weaviate', // Use Weaviate's built-in vectorizer
      properties: [
        {
          name: 'content',
          dataType: ['text'],
          description: 'The text content of the chunk',
        },
        {
          name: 'source',
          dataType: ['text'],
          description: 'Source document filename',
        },
        {
          name: 'fileName',
          dataType: ['text'],
          description: 'Original filename',
        },
        {
          name: 'processedAt',
          dataType: ['text'],
          description: 'Timestamp when chunk was processed',
        },
      ],
    };

    await this.client.schema.classCreator().withClass(schema).do();
  }

          async addChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      console.log(`🔄 Starting to add ${chunks.length} chunks to Weaviate...`);
      
      const batcher: ObjectsBatcher = this.client.batch.objectsBatcher();

      for (const chunk of chunks) {
        const objectData = {
          class: this.className,
          properties: {
            content: chunk.content,
            source: chunk.source,
            fileName: chunk.metadata['fileName'] || chunk.source,
            processedAt: chunk.metadata['processedAt'] || new Date().toISOString(),
          },
          // No vector needed - Weaviate generates it automatically
        };
        
        console.log(`📝 Adding chunk: ${chunk.source} (${chunk.content.substring(0, 50)}...)`);
        batcher.withObject(objectData);
      }

      console.log(`🚀 Executing batch operation...`);
      const result = await batcher.do();
      console.log(`✅ Batch result:`, result);
      console.log(`✅ Successfully added ${chunks.length} chunks to Weaviate`);
    } catch (error) {
      console.error('❌ Failed to add chunks to Weaviate:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

          async search(query: string, embedding: number[], limit: number = 3): Promise<SearchResult[]> {
    try {
      // Use nearText since we have text2vec-transformers configured
      const response = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('content source fileName processedAt _additional { distance }')
        .withNearText({
          concepts: [query],
        })
        .withLimit(limit)
        .do();

      const results = response.data.Get[this.className] || [];

      return results.map((result: any) => ({
        id: result._additional?.id || '',
        content: result.content,
        source: result.source,
        score: result._additional?.distance ? 1 - (result._additional.distance || 0) : 0.8,
        metadata: {
          fileName: result.fileName,
          processedAt: result.processedAt,
        },
      }));
    } catch (error) {
      console.error('❌ Failed to search Weaviate:', error);
      throw error;
    }
  }

  async deleteAllChunks(): Promise<void> {
    try {
      await this.client.schema.classDeleter().withClassName(this.className).do();
      console.log(`✅ Deleted all chunks from class: ${this.className}`);
    } catch (error) {
      console.error('❌ Failed to delete chunks from Weaviate:', error);
      throw error;
    }
  }

  async getStats(): Promise<{ totalChunks: number }> {
    try {
      const response = await this.client.graphql
        .aggregate()
        .withClassName(this.className)
        .withFields('meta { count }')
        .do();

      const totalChunks = response.data.Aggregate[this.className]?.[0]?.meta?.count || 0;

      return { totalChunks };
    } catch (error) {
      console.error('❌ Failed to get Weaviate stats:', error);
      return { totalChunks: 0 };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.misc.metaGetter().do();
      return true;
    } catch (error) {
      console.error('❌ Weaviate health check failed:', error);
      return false;
    }
  }
}