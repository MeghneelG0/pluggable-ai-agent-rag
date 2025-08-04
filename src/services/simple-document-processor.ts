import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SimpleChunk {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, any>;
}

export interface ProcessingOptions {
  maxChunkTokens?: number;
  chunkOverlap?: number;
}

export class SimpleDocumentProcessor {
  private documentsPath: string;

  constructor() {
    this.documentsPath = path.join(process.cwd(), 'data', 'documents');
  }

  async getMarkdownFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.documentsPath);
      return files
        .filter(file => file.endsWith('.md') && file !== 'README.md')
        .map(file => path.join(this.documentsPath, file));
    } catch (error) {
      console.error('❌ Failed to read documents directory:', error);
      return [];
    }
  }

  async processDocument(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<SimpleChunk[]> {
    const { maxChunkTokens = 50, chunkOverlap = 10 } = options;
    const fileName = path.basename(filePath);

    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Simple cleaning - just remove extra whitespace
      const cleanedContent = content.replace(/\s+/g, ' ').trim();

      // Split into chunks using simple word splitting
      const chunks = this.simpleSplitIntoChunks(cleanedContent, maxChunkTokens, chunkOverlap);

      // Convert to SimpleChunk objects
      const documentChunks: SimpleChunk[] = chunks.map((chunk, index) => ({
        id: uuidv4(),
        content: chunk.trim(),
        source: fileName,
        metadata: {
          chunkIndex: index,
          totalChunks: chunks.length,
          fileName,
          processedAt: new Date().toISOString(),
        },
      }));

      console.log(`📄 Processed ${fileName}: ${chunks.length} chunks`);
      return documentChunks;
    } catch (error) {
      console.error(`❌ Failed to process ${fileName}:`, error);
      return [];
    }
  }

  private simpleSplitIntoChunks(
    content: string,
    maxTokens: number,
    overlap: number
  ): string[] {
    // Simple word splitting - no complex tokenization
    const words = content.split(' ');
    const chunks: string[] = [];

    if (words.length <= maxTokens) {
      return [content];
    }

    let startIndex = 0;

    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + maxTokens, words.length);
      const chunk = words.slice(startIndex, endIndex).join(' ');
      chunks.push(chunk);

      // Move start index with overlap
      startIndex = endIndex - overlap;

      // Prevent infinite loop
      if (startIndex >= words.length) break;
    }

    return chunks;
  }

  async getDocumentStats(): Promise<{
    totalFiles: number;
    totalChunks: number;
    files: Array<{ name: string; size: number; chunks: number }>;
  }> {
    try {
      const files = await this.getMarkdownFiles();
      const stats = {
        totalFiles: files.length,
        totalChunks: 0,
        files: [] as Array<{ name: string; size: number; chunks: number }>,
      };

      for (const filePath of files) {
        const fileName = path.basename(filePath);
        const fileStats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const cleanedContent = content.replace(/\s+/g, ' ').trim();
        const chunks = this.simpleSplitIntoChunks(cleanedContent, 50, 10);

        stats.files.push({
          name: fileName,
          size: fileStats.size,
          chunks: chunks.length,
        });
        stats.totalChunks += chunks.length;
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get document stats:', error);
      return { totalFiles: 0, totalChunks: 0, files: [] };
    }
  }
}