export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  timestamp: string;
  humidity?: number;
  windSpeed?: number;
}

export class WeatherPlugin {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
  }

  async getWeather(city: string): Promise<WeatherData> {
    try {
      // For demo purposes, return mock data if no API key
      if (!this.apiKey) {
        console.log(`🌤️ Using mock weather data for: ${city}`);
        return this.getMockWeather(city);
      }

      // Real API call would go here
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

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
      condition: randomCondition,
      location: city,
      timestamp: new Date().toISOString(),
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
    };
  }
}