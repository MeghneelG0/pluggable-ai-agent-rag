// Base plugin interface
export interface IPlugin {
  name: string;
  description: string;
  execute(input: string): Promise<PluginResult>;
  canHandle(input: string): boolean;
}

// Plugin result
export interface PluginResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  metadata?: Record<string, unknown>;
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
  registerPlugin(plugin: IPlugin): void;
  detectIntent(input: string): PluginIntent | null;
  executePlugin(pluginName: string, input: string): Promise<PluginResult>;
  getAvailablePlugins(): IPlugin[];
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