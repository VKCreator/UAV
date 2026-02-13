// src/api/client.ts
const API_BASE_URL = "http://nmstuvtip.ddns.net:5000";

// Универсальная функция для HTTP-запросов
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.error + "." ||
        `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return await response.json();
}

async function requestFormData<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.error + "." ||
        `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return await response.json();
}

async function externalRequest<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`External API error: ${response.statusText}`);
  }

  return await response.json();
}

// Типы для ответов (можно расширить)
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Сервисы для разных сущностей
export const api = {
  // Дроны
  drones: {
    getAll: () => request<Drone[]>("/api/drones"),
    create: (data: CreateDroneInput) =>
      request<Drone>("/api/drones", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    // ... update, delete
  },
  // Схемы
  schemas: {
    getAll: () => request<TrajectorySchema[]>("/api/schemas"),
    create: (formData: FormData) =>
      requestFormData<any>("/api/schemas", {
        method: "POST",
        body: formData,
      }),
  },
  // Погода
  weather: {
    getCurrent: (latitude: number, longitude: number) =>
      externalRequest<WeatherResponse>(
        `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}` +
          `&longitude=${longitude}` +
          `&current_weather=true`,
      ),
  },
};

// Экспортируем типы
export interface Drone {
  id: number;
  model: string;
  fov_vertical: number; // угол обзора (градусы)
  resolution_width: number;
  resolution_height: number;
  max_wind_resistance: number; // м/с
  max_speed: number; // м/с
  min_speed: number; // м/с
  battery_life: number; // минуты
}

export interface CurrentWeather {
  temperature: number; // °C
  windspeed: number; // м/с
  winddirection: number; // °
  weathercode: number;
  time: string;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  current_weather: CurrentWeather;
}

export interface TrajectorySchema {
  id: string;
  schemaName: string;
  schemaImage: string;
  pointCount: number;
  distanceToCamera: number;
  flightTime: number;
  methodType: string;
}

// Типы для создания
export interface CreateDroneInput {
  model: string;
  fov_vertical: number;
  resolution_width?: number;
  resolution_height?: number;
  max_wind_resistance?: number;
  max_speed?: number;
  min_speed?: number;
  battery_life?: number;
}
