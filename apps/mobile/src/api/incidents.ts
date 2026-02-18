import { apiClient } from "./client";

export interface IncidentResponse {
  id: number;
  user_id: number;
  type: string;
  severity: string;
  status: string;
  description: string | null;
  photo_url: string | null;
  lat: number;
  lon: number;
  created_at: string;
  expires_at: string | null;
  confirmations: number;
  refutations: number;
  user_vote: string | null;
}

export interface IncidentListResponse {
  incidents: IncidentResponse[];
  total: number;
}

export interface CommentResponse {
  id: number;
  incident_id: number;
  user_id: number;
  user_name: string;
  text: string;
  created_at: string;
}

export interface CreateIncidentBody {
  type: string;
  severity: string;
  description?: string;
  photo_url?: string;
  lat: number;
  lon: number;
}

export const incidentsApi = {
  getIncidents: (lat: number, lon: number, radius_m: number) =>
    apiClient
      .get<IncidentListResponse>("/incidents", { params: { lat, lon, radius_m } })
      .then((r) => r.data),

  getIncident: (id: number) =>
    apiClient.get<IncidentResponse>(`/incidents/${id}`).then((r) => r.data),

  createIncident: (body: CreateIncidentBody) =>
    apiClient.post<IncidentResponse>("/incidents", body).then((r) => r.data),

  voteIncident: (id: number, vote: string) =>
    apiClient.post(`/incidents/${id}/vote`, { vote }).then((r) => r.data),

  getComments: (id: number) =>
    apiClient.get<CommentResponse[]>(`/incidents/${id}/comments`).then((r) => r.data),

  addComment: (id: number, text: string) =>
    apiClient.post<CommentResponse>(`/incidents/${id}/comments`, { text }).then((r) => r.data),
};
