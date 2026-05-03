import { request } from "./client";
import { API_BASE_URL } from "./config";

export const trajectoryApi = {
  getFlightTime: (points: number[][], v: number, hoverTime: number) =>
    request<any>("/api/trajectory/flight-time", {
      method: "POST",
      body: JSON.stringify({ points, v, hover_time: hoverTime }),
    }),

  calculateMethod1: (body: any) =>
    request<any>("/api/trajectory/calculate/method1", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  calculateMethod2: (body: any) =>
    request<any>("/api/trajectory/calculate/method2", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  calculateMethod3: (body: any) =>
    request<any>("/api/trajectory/calculate/method3", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    
  // Возвращает Blob (PNG), а не JSON — поэтому идём в обход request<T>
  getDensityHeatmap: async (body: {
    points: number[][];
    L: number;
    H: number; 
    n_cols: number;
    n_rows: number;
    density_k?: number;
    threshold_method?: "mean_std" | "median";
    dpi?: number;
  }): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/api/trajectory/density-heatmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `Heatmap request failed: ${response.status}`;
      try {
        const err = await response.json();
        if (err?.error) message = err.error;
      } catch {
        /* тело не JSON — оставляем дефолтное сообщение */
      }
      throw new Error(message);
    }

    return response.blob();
  },
};