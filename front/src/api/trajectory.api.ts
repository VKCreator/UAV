import { request } from "./client";

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
};