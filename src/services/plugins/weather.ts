export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  timestamp: string;
  humidity?: number;
  windSpeed?: number;
}

import { Plugin, PluginResult } from '@/types/plugins';
import { config } from '@/config';

export class WeatherPlugin implements Plugin {
  public readonly name = 'weather';
  public readonly description = 'Get weather information for cities';
  private apiKey: string;

  constructor() {
    this.apiKey = config.weather.apiKey || '';
  }

  detectIntent(message: string): boolean {
    const weatherMatch = message.match(/weather\s+(?:in\s+)?([a-zA-Z\s]+)/i);
    return !!weatherMatch;
  }

  async execute(message: string): Promise<PluginResult> {
    const weatherMatch = message.match(/weather\s+(?:in\s+)?([a-zA-Z\s]+)/i);
    if (!weatherMatch) {
      return {
        name: this.name,
        success: false,
        error: 'No city found in message',
      };
    }

    const city = weatherMatch[1]?.trim() || '';
    console.log(`🌤️ Weather plugin detected for city: ${city}`);

    try {
      const weatherData = await this.getWeather(city);
      return {
        name: this.name,
        success: true,
        data: weatherData,
      };
    } catch (error) {
      return {
        name: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getWeather(city: string): Promise<WeatherData> {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        console.log(`🌤️ No OpenWeather API key found, using mock weather data for: ${city}`);
        return this.getMockWeather(city);
      }

      console.log(`🌤️ Fetching real weather data for: ${city} using OpenWeather API`);

      // Real API call
      const response = await (globalThis as any).fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Weather API error for ${city}: ${response.status} - ${errorText}`);
        throw new Error(`Weather API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Weather API response for ${city}:`, data);

      return {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        location: data.name,
        timestamp: new Date().toISOString(),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
      };

    } catch (error) {
      console.error(`❌ Weather API failed for ${city}:`, error);
      console.log(`🌤️ Falling back to mock weather data for: ${city}`);
      // Fallback to mock data
      return this.getMockWeather(city);
    }
  }

  private getMockWeather(city: string): WeatherData {
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const randomTemp = Math.floor(Math.random() * 30) + 10; // 10-40°C

    return {
      temperature: randomTemp,
      condition: randomCondition || 'Sunny',
      location: city,
      timestamp: new Date().toISOString(),
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
    };
  }
}