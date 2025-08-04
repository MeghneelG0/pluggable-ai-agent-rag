import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment schema validation
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Gemini API
  GEMINI_API_KEY: z.string().optional(),

  // Weather API
  OPENWEATHER_API_KEY: z.string().optional(),

  // Weaviate Vector Database
  WEAVIATE_URL: z.string().default('https://your-cluster.weaviate.network'),
  WEAVIATE_API_KEY: z.string().optional(),

  // Server config
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Memory config
  MAX_MEMORY_MESSAGES: z.string().transform(Number).default('10'),
  MEMORY_CLEANUP_INTERVAL: z.string().transform(Number).default('3600000'), // 1 hour

  // RAG config
  MAX_CHUNK_TOKENS: z.string().transform(Number).default('30'),
  CHUNK_OVERLAP: z.string().transform(Number).default('5'),
  MAX_SEARCH_RESULTS: z.string().transform(Number).default('3'),

  // LLM config
  LLM_TEMPERATURE: z.string().transform(Number).default('0.7'),
  LLM_MAX_TOKENS: z.string().transform(Number).default('1000'),
});

// Validate and export environment
const env = EnvironmentSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,

  gemini: {
    apiKey: env.GEMINI_API_KEY,
  },

  weather: {
    apiKey: env.OPENWEATHER_API_KEY,
  },

  weaviate: {
    url: env.WEAVIATE_URL,
    apiKey: env.WEAVIATE_API_KEY,
  },

  server: {
    corsOrigin: env.CORS_ORIGIN,
    logLevel: env.LOG_LEVEL,
  },

  memory: {
    maxMessages: env.MAX_MEMORY_MESSAGES,
    cleanupInterval: env.MEMORY_CLEANUP_INTERVAL,
  },

  rag: {
    maxChunkTokens: env.MAX_CHUNK_TOKENS,
    chunkOverlap: env.CHUNK_OVERLAP,
    maxSearchResults: env.MAX_SEARCH_RESULTS,
  },

  llm: {
    temperature: env.LLM_TEMPERATURE,
    maxTokens: env.LLM_MAX_TOKENS,
  },
} as const;

export type Config = typeof config;