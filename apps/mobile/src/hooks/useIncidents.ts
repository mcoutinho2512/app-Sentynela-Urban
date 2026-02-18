import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi, CreateIncidentBody } from "@/api/incidents";

export function useIncidentsNearby(lat: number, lon: number, radiusM: number) {
  return useQuery({
    queryKey: ["incidents", lat, lon, radiusM],
    queryFn: () => incidentsApi.getIncidents(lat, lon, radiusM),
    enabled: lat !== 0 && lon !== 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useIncident(id: number) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => incidentsApi.getIncident(id),
    enabled: id > 0,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIncidentBody) => incidentsApi.createIncident(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useVoteIncident(incidentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vote: string) => incidentsApi.voteIncident(incidentId, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
  });
}

export function useComments(incidentId: number) {
  return useQuery({
    queryKey: ["comments", incidentId],
    queryFn: () => incidentsApi.getComments(incidentId),
    enabled: incidentId > 0,
  });
}

export function useAddComment(incidentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => incidentsApi.addComment(incidentId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", incidentId] });
    },
  });
}
