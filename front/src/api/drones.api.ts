import { request } from "./client";
import type { Drone } from "../features/uav/types/uav.types";

export const dronesApi = {
  getAll: () => request<Drone[]>("/api/drones"),
};