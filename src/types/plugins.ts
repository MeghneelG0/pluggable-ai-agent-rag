// Base plugin interface
export interface Plugin {
  name: string;
  description: string;
  detectIntent(message: string): boolean;
  execute(input: string): Promise<PluginResult>;
}

// Plugin result
export interface PluginResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
}

// Plugin intent detection
export interface PluginIntent {
  pluginName: string;
  confidence: number;
  extractedInput: string;
  metadata?: Record<string, unknown>;
}

// Plugin router interface
export interface IPluginRouter {
  registerPlugin(plugin: Plugin): void;
  detectIntent(input: string): PluginIntent | null;
  executePlugin(pluginName: string, input: string): Promise<PluginResult>;
  getAvailablePlugins(): Plugin[];
}

// Weather plugin specific types
export interface WeatherData {
  temperature: string;
  condition: string;
  location: string;
  timestamp: string;
  humidity?: number;
  windSpeed?: string;
}

// Math plugin specific types
export interface MathResult {
  expression: string;
  result: number;
  steps?: string[];
}