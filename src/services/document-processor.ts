import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config';
import { DocumentChunk } from '@/services/weaviate';

export interface ProcessingOptions {
  maxChunkTokens?: number;
  chunkOverlap?: number;
  includeMetadata?: boolean;
}

export class DocumentProcessor {
  private documentsPath: string;

  constructor() {
    this.documentsPath = path.join(process.cwd(), 'data', 'documents');
  }

  async processAllDocuments(options: ProcessingOptions = {}): Promise<DocumentChunk[]> {
    const {
      maxChunkTokens = config.rag.maxChunkTokens,
      chunkOverlap = config.rag.chunkOverlap,
      includeMetadata = true,
    } = options;

    try {
      // Get all markdown files
      const files = await this.getMarkdownFiles();

      if (files.length === 0) {
        console.log('⚠️  No markdown files found in data/documents/');
        return [];
      }

      console.log(`📚 Processing ${files.length} markdown files...`);

      const allChunks: DocumentChunk[] = [];

      for (const file of files) {
        const chunks = await this.processDocument(file, {
          maxChunkTokens,
          chunkOverlap,
          includeMetadata,
        });
        allChunks.push(...chunks);
      }

      console.log(`✅ Processed ${allChunks.length} total chunks from ${files.length} files`);
      return allChunks;
    } catch (error) {
      console.error('❌ Failed to process documents:', error);
      throw error;
    }
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
    options: ProcessingOptions
  ): Promise<DocumentChunk[]> {
    const { maxChunkTokens, chunkOverlap, includeMetadata } = options;
    const fileName = path.basename(filePath);

    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Clean and normalize content
      const cleanedContent = this.cleanMarkdown(content);

      // Split into chunks
      const chunks = this.splitIntoChunks(cleanedContent, maxChunkTokens || 200, chunkOverlap || 50);

      // Convert to DocumentChunk objects
      const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
        id: uuidv4(),
        content: chunk.trim(),
        source: fileName,
        metadata: includeMetadata ? {
          chunkIndex: index,
          totalChunks: chunks.length,
          fileName,
          filePath,
          processedAt: new Date().toISOString(),
        } : {},
      }));

      console.log(`📄 Processed ${fileName}: ${chunks.length} chunks`);
      return documentChunks;
    } catch (error) {
      console.error(`❌ Failed to process ${fileName}:`, error);
      return [];
    }
  }

  private cleanMarkdown(content: string): string {
    return content
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove markdown links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove code block markers
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code markers
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove headers but keep text
      .replace(/^#{1,6}\s+/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^---$/gm, '')
      // Trim whitespace
      .trim();
  }

  private splitIntoChunks(
    content: string,
    maxTokens: number,
    overlap: number
  ): string[] {
    // Simple token estimation (words + punctuation)
    const tokens = content.split(/\s+/);
    const chunks: string[] = [];

    if (tokens.length <= maxTokens) {
      return [content];
    }

    let startIndex = 0;

    while (startIndex < tokens.length) {
      const endIndex = Math.min(startIndex + maxTokens, tokens.length);
      const chunk = tokens.slice(startIndex, endIndex).join(' ');
      chunks.push(chunk);

      // Move start index with overlap
      startIndex = endIndex - overlap;

      // Prevent infinite loop
      if (startIndex >= tokens.length) break;
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
        const cleanedContent = this.cleanMarkdown(content);
        const chunks = this.splitIntoChunks(
          cleanedContent,
          config.rag.maxChunkTokens || 200,
          config.rag.chunkOverlap || 50
        );

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