import type { WeatherResponse, YandexWeatherResponse } from "../features/weather/types/weather.types";
const TOKEN = "3757f6dc6b074ddf85e66383af8e0cc8";

async function externalRequest<T>(url: string, headers: HeadersInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!response.ok) throw new Error(`External API error: ${response.statusText}`);
  return response.json();
}

export const weatherApi = {
  getCurrent: (lat: number, lon: number) =>
    externalRequest<WeatherResponse>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
    ),
  getCurrentAlternative: (lat: number, lon: number) =>
      externalRequest<WeatherResponse>(
        `http://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${TOKEN}&lang=ru`
      ),
  getYandex: (lat: number, lon: number) =>
    externalRequest<YandexWeatherResponse>(
      `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}`,
      { "X-Yandex-Weather-Key": "b5982c1e-14f3-4c49-8879-e2a88b88879a" },
    ),
};