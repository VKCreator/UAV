// src/api/client.ts
import { jwtDecode } from "jwt-decode";

// const API_BASE_URL = "http://nmstuvtip.ddnsking.com:5000";
const API_BASE_URL = "http://nmstuvtip.ddnsking.com:5000";

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
  // Аутентификация
  auth: {
    login: async (username: string, password: string) => {
      // Создаем контроллер для прерывания запроса
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort(); // отменяем запрос через 5 секунд
      }, 5000); // 5000 мс = 5 секунд

      try {
        const res = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          signal: controller.signal, // привязываем контроллер к fetch
        });

        clearTimeout(timeout); // очищаем таймаут, если запрос завершился вовремя

        const data = await res.json();

        console.info(data);
        if (!res.ok) {
          const error = new Error(data.message || "Ошибка входа.");
          (error as any).status = res.status;
          throw error;
        }

        localStorage.setItem("token", data.token);

        const decodedToken = jwtDecode(data.token);

        localStorage.setItem("userData", JSON.stringify(decodedToken));

        return { token: data.token, status: res.status };
      } catch (err: any) {
        if (err.name === "AbortError") {
          // специальная обработка таймаута
          const timeoutError = new Error("Превышено время ожидания запроса.");
          (timeoutError as any).status = 408; // 408 Request Timeout
          throw timeoutError;
        }
        throw err;
      }
    },
    logout: () => {
      localStorage.removeItem("token"); // выход
    },
    getToken: () => localStorage.getItem("token"),
    check: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const res = await fetch(`${API_BASE_URL}/protected`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        return data.message;
      } else {
        localStorage.removeItem("token"); // некорректный или истёкший токен
        return;
      }
    },
  },
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
    getAllFull: () => request<TrajectorySchema[]>("/api/schemasFull"),
    getAll: () => request<TrajectorySchema[]>("/api/schemas"),
    getById: (id: number) => request<any>(`/api/schemasFull/${id}`),
    create: (formData: FormData) =>
      requestFormData<any>("/api/schemas", {
        method: "POST",
        body: formData,
      }),
    createFull: (formData: FormData) =>
      requestFormData<any>("/api/schemasFull", {
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
  // Траектория
  trajectory: {
    getFlightTime: (points: number[][], v: number, hoverTime: number) =>
      request<any>("/api/trajectory/flight-time", {
        method: "POST",
        body: JSON.stringify({
          points, // массив вида [[x, y], [x, y]]
          v,
          hover_time: hoverTime,
        }),
      }),
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
