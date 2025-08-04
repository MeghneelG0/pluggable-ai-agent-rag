import { Plugin, PluginResult } from '@/types/plugins';
import { WeatherPlugin } from '@/services/plugins/weather';
import { MathPlugin } from '@/services/plugins/math';

export class PluginManager {
  private plugins: Plugin[];

  constructor() {
    this.plugins = [
      new WeatherPlugin(),
      new MathPlugin(),
    ];
  }

  async detectAndExecutePlugins(message: string): Promise<PluginResult[]> {
    const results: PluginResult[] = [];

    for (const plugin of this.plugins) {
      if (plugin.detectIntent(message)) {
        try {
          const result = await plugin.execute(message);
          results.push(result);
        } catch (error) {
          results.push({
            name: plugin.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  getAvailablePlugins(): string[] {
    return this.plugins.map(plugin => plugin.name);
  }
}