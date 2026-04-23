import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "./config";
import { request } from "./client";

export const authApi = {
  login: async (username: string, password: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) {
        const error = new Error(data.message || "Ошибка входа") as any;
        error.status = res.status;
        throw error;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userData", JSON.stringify(jwtDecode(data.token)));

      return { token: data.token, status: res.status };
    } catch (err: any) {
      if (err.name === "AbortError") {
        const error = new Error("Превышено время ожидания") as any;
        error.status = 408;
        throw error;
      }
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
  },

  register: (data: {
    username: string;
    password: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
  }) => request<any>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  getMe: async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      localStorage.removeItem("token");
      return null;
    }

    return res.json();
  },

  check: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      return data.username;
    } else {
      localStorage.removeItem("token");
      return;
    }
  },
};