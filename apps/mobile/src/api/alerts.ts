import { apiClient } from "./client";

export interface AlertPreference {
  id: number;
  user_id: number;
  mode: string;
  neighborhood_name: string | null;
  center_lat: number | null;
  center_lon: number | null;
  radius_km: number | null;
  types: string[] | null;
  min_severity: string;
  enabled: boolean;
}

export interface AlertFeedItem {
  incident_id: number;
  type: string;
  severity: string;
  description: string | null;
  lat: number;
  lon: number;
  distance_km: number;
  created_at: string;
}

export interface CreateAlertPreference {
  mode: string;
  neighborhood_name?: string;
  center_lat?: number;
  center_lon?: number;
  radius_km?: number;
  types?: string[];
  min_severity?: string;
  enabled?: boolean;
}

export const alertsApi = {
  getPreferences: () =>
    apiClient.get<AlertPreference[]>("/alerts/preferences").then((r) => r.data),

  createPreference: (body: CreateAlertPreference) =>
    apiClient.post<AlertPreference>("/alerts/preferences", body).then((r) => r.data),

  deletePreference: (id: number) =>
    apiClient.delete(`/alerts/preferences/${id}`).then((r) => r.data),

  getAlertFeed: () =>
    apiClient.get<AlertFeedItem[]>("/alerts/feed").then((r) => r.data),
};
