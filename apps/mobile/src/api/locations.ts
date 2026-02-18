import { apiClient } from "./client";

export interface LocationResponse {
  id: number;
  label: string;
  type: string;
  lat: number;
  lon: number;
  is_private: boolean;
  created_at: string;
}

export interface CreateLocationBody {
  label: string;
  type: string;
  lat: number;
  lon: number;
}

export const locationsApi = {
  getLocations: () =>
    apiClient.get<LocationResponse[]>("/locations").then((r) => r.data),

  createLocation: (body: CreateLocationBody) =>
    apiClient.post<LocationResponse>("/locations", body).then((r) => r.data),

  updateLocation: (id: number, body: Partial<CreateLocationBody>) =>
    apiClient.patch<LocationResponse>(`/locations/${id}`, body).then((r) => r.data),

  deleteLocation: (id: number) =>
    apiClient.delete(`/locations/${id}`).then((r) => r.data),
};
