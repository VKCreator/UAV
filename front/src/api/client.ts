// src/api/client.ts
import { jwtDecode } from "jwt-decode";

// const API_BASE_URL = "http://skypath.ddnsking.com:5000";
const API_BASE_URL = "http://skypath.ddnsking.com:5000";
const TOKEN = "3757f6dc6b074ddf85e66383af8e0cc8";

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
    const message = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(message) as any;
    err.status = response.status;
    throw err;
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

async function yandexWeatherRequest<T>(
  lat: number, 
  lon: number
): Promise<T> {
  const accessKey = 'b5982c1e-14f3-4c49-8879-e2a88b88879a';
  const url = `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}`;
  const headers = {
    'X-Yandex-Weather-Key': accessKey
  };
  
  return externalRequest<T>(url, headers);
}

async function externalRequest<T>(url: string, headers: HeadersInit = {} ): Promise<T> {
  const response = await fetch(url, { 
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

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
      }, 10000); // 10000 мс = 5 секунд

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        return data.username; // или data.first_name — что нужно
      } else {
        localStorage.removeItem("token");
        return;
      }
    },
    register: (data: {
      username: string;
      password: string;
      email: string;
      first_name: string;
      last_name: string;
      middle_name?: string;
    }) => request<any>(`/api/auth/register`, { method: "POST", body: JSON.stringify(data) }),
    },
  users: {
    getMe: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        return data;
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
    getAllFull: () => request<TrajectorySchema[]>("/api/schemas/full"),
    getAll: () => request<TrajectorySchema[]>("/api/schemas"),
    getById: (id: number) => request<any>(`/api/schemas/full/${id}`),
    create: (formData: FormData) =>
      requestFormData<any>("/api/schemas", {
        method: "POST",
        body: formData,
      }),
    createFull: (formData: FormData) =>
      requestFormData<any>("/api/schemas/full", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    delete: (id: number) =>
      request<void>(`/api/schemas/full/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
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
    getCurrentAlternative: (latitude: number, longitude: number) =>
      externalRequest<WeatherResponse>(
        `http://api.weatherbit.io/v2.0/current?lat=${latitude}&lon=${longitude}&key=${TOKEN}&lang=ru`
      ),
    getYandexWeather: (latitude: number, longitude: number) => 
      yandexWeatherRequest<YandexWeatherResponse>(latitude, longitude),
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
    calculateMethod1: (body: any) => request<any>("/api/trajectory/calculate/method1", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    calculateMethod2: (body: any) => request<any>("/api/trajectory/calculate/method2", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    calculateMethod3: (body: any) => request<any>("/api/trajectory/calculate/method3", {
      method: "POST",
      body: JSON.stringify(body),
    })
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
  image_name: string | null;
}

export interface CurrentWeather {
  temperature: number; // °C
  windspeed: number; // км/ч
  winddirection: number; // °
  weathercode: number;
  time: string;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  current_weather: CurrentWeather;
}

export interface YandexWeatherResponse {
  fact: {
    wind_speed: number;
    wind_dir: string;
  };
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
