// src/api/client.ts
const API_BASE_URL = "http://nmstuvtip.ddns.net:5000";

// Универсальная функция для HTTP-запросов
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
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
      errorData.error + "." || `HTTP ${response.status}: ${response.statusText}`
    );
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
};

// Экспортируем типы
export interface Drone {
  id: number;
  model: string;
  fov_vertical: number;        // угол обзора (градусы)
  resolution_width?: number;
  resolution_height?: number;
  max_wind_resistance?: number;  // м/с
  max_speed?: number;            // м/с
  min_speed?: number;            // м/с
  battery_life?: number;         // минуты
}

export interface TrajectorySchema {
  
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
