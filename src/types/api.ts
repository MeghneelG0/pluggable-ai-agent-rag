// API response wrapper
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Health check response
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    memory: 'ok' | 'error';
    rag: 'ok' | 'error';
    plugins: 'ok' | 'error';
    llm: 'ok' | 'error';
  };
}

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT = 'RATE_LIMIT'
}

export interface APIError {
  type: ErrorType;
  message: string;
  details?: Record<string, unknown>;
  code?: number;
}

// Request context
export interface RequestContext {
  requestId: string;
  sessionId?: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}