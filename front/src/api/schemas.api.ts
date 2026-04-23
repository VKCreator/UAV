import { request, requestFormData } from "./client";
import type { TrajectorySchema } from "../features/flight/types/schema.types";

export const schemasApi = {
  getAllFull: () => 
    request<TrajectorySchema[]>("/api/schemas/full"),

  getById: (id: number) => 
    request<any>(`/api/schemas/full/${id}`),

  createFull: (formData: FormData) =>
    requestFormData<any>("/api/schemas/full", {
      method: "POST",
      body: formData,
    }),

  delete: (id: number) =>
    request<void>(`/api/schemas/full/${id}`, { method: "DELETE" }),
};