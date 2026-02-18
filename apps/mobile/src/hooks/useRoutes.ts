import { useMutation } from "@tanstack/react-query";
import { routesApi, CustomRouteBody } from "@/api/routes";

export function useCommuteRoute() {
  return useMutation({
    mutationFn: (profile: string) => routesApi.getCommuteRoute(profile),
  });
}

export function useCustomRoute() {
  return useMutation({
    mutationFn: (body: CustomRouteBody) => routesApi.getCustomRoute(body),
  });
}
