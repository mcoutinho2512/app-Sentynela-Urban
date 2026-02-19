import { apiClient } from "./client";

export interface ServiceResponse {
  id: number;
  user_id: number;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  lat: number;
  lon: number;
  images: string[];
  status: string;
  plan_level: string;
  created_at: string;
}

export interface ServiceListResponse {
  services: ServiceResponse[];
  total: number;
}

export interface ServiceLimits {
  role: string;
  max_services: number;
  current_count: number;
  can_create: boolean;
}

export interface CreateServiceBody {
  name: string;
  category: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  hours?: string;
  lat: number;
  lon: number;
  images?: string[];
}

export const servicesApi = {
  listServices: (lat: number, lon: number, radiusM: number = 2000, category?: string, search?: string) => {
    const params: Record<string, string | number> = { lat, lon, radius_m: radiusM };
    if (category) params.category = category;
    if (search) params.search = search;
    return apiClient.get<ServiceListResponse>("/services", { params }).then((r) => r.data);
  },

  getService: (id: number) =>
    apiClient.get<ServiceResponse>(`/services/${id}`).then((r) => r.data),

  getMyServices: () =>
    apiClient.get<ServiceResponse[]>("/services/mine").then((r) => r.data),

  getLimits: () =>
    apiClient.get<ServiceLimits>("/services/limits").then((r) => r.data),

  createService: (body: CreateServiceBody) =>
    apiClient.post<ServiceResponse>("/services", body).then((r) => r.data),

  updateService: (id: number, body: Partial<CreateServiceBody>) =>
    apiClient.put<ServiceResponse>(`/services/${id}`, body).then((r) => r.data),

  deleteService: (id: number) =>
    apiClient.delete(`/services/${id}`).then((r) => r.data),
};
