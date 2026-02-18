import { apiClient } from "./client";

export interface RouteResponse {
  geometry: any;
  duration_seconds: number;
  distance_meters: number;
  incidents_on_route: any[];
  risk_score: number;
}

export interface RouteAlternative {
  routes: RouteResponse[];
}

export interface CustomRouteBody {
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  profile: string;
}

export const routesApi = {
  getCommuteRoute: (profile: string = "driving-car") =>
    apiClient.post<RouteAlternative>("/routes/commute", { profile }).then((r) => r.data),

  getCustomRoute: (body: CustomRouteBody) =>
    apiClient.post<RouteAlternative>("/routes/custom", body).then((r) => r.data),
};
