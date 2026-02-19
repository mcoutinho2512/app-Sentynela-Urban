import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { routesApi } from "@/api/routes";
import { locationsApi } from "@/api/locations";
import { getCurrentLocation } from "@/utils/permissions";
import { RouteOverlay } from "@/components/map/RouteOverlay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, FontSize, BorderRadius, SeverityColors } from "@/constants/theme";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER } from "@/constants/mapStyles";

const PROFILES = [
  { value: "driving-car", label: "Carro", icon: "car" as const },
  { value: "cycling-regular", label: "Bicicleta", icon: "bicycle" as const },
  { value: "foot-walking", label: "A pe", icon: "walk" as const },
];

interface RouteResult {
  geometry: any;
  duration_seconds: number;
  distance_meters: number;
  incidents_on_route: any[];
  risk_score: number;
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface UserCoords {
  lat: number;
  lon: number;
}

// Distance in km between two coordinates (Haversine)
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROXIMITY_THRESHOLD_KM = 0.5; // 500m

export default function RoutesScreen() {
  const [profile, setProfile] = useState("driving-car");
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // User location
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [nearbyLocation, setNearbyLocation] = useState<string | null>(null); // "home", "work", etc.
  const [detectingLocation, setDetectingLocation] = useState(true);

  // Custom route - address search
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<GeoResult[]>([]);
  const [destSearching, setDestSearching] = useState(false);
  const [selectedDest, setSelectedDest] = useState<GeoResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saved locations
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.getLocations,
  });

  // Detect current location and check proximity to saved locations
  const detectLocation = useCallback(async () => {
    setDetectingLocation(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) return;

      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setUserCoords(coords);

      if (locations && locations.length > 0) {
        let closestType: string | null = null;
        let closestDist = Infinity;

        for (const saved of locations) {
          const dist = distanceKm(coords.lat, coords.lon, saved.lat, saved.lon);
          if (dist < PROXIMITY_THRESHOLD_KM && dist < closestDist) {
            closestDist = dist;
            closestType = saved.type;
          }
        }
        setNearbyLocation(closestType);
      }
    } catch {
      // silently fail
    } finally {
      setDetectingLocation(false);
    }
  }, [locations]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await detectLocation();
    setRefreshing(false);
  }, [detectLocation]);

  // Smart commute - determine destination based on current location
  const getCommuteInfo = () => {
    if (nearbyLocation === "home") {
      const work = locations?.find((l: any) => l.type === "work");
      return { label: "Ir para Trabalho", icon: "briefcase" as const, dest: work };
    }
    if (nearbyLocation === "work") {
      const home = locations?.find((l: any) => l.type === "home");
      return { label: "Ir para Casa", icon: "home" as const, dest: home };
    }
    // Not near any saved location - show generic commute
    return { label: "Rota Casa ↔ Trabalho", icon: "swap-horizontal" as const, dest: null };
  };

  const commuteInfo = getCommuteInfo();

  const handleCommute = async () => {
    setLoading(true);
    try {
      if (nearbyLocation && userCoords && commuteInfo.dest) {
        // Smart commute: use current location as origin, saved location as dest
        const res = await routesApi.getCustomRoute({
          origin_lat: userCoords.lat,
          origin_lon: userCoords.lon,
          dest_lat: commuteInfo.dest.lat,
          dest_lon: commuteInfo.dest.lon,
          profile,
        });
        setRoutes(res.routes);
      } else {
        // Fallback: API commute endpoint (uses saved home → work)
        const res = await routesApi.getCommuteRoute(profile);
        setRoutes(res.routes);
      }
      setSelectedRoute(0);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Salve locais Casa e Trabalho no perfil primeiro.");
    } finally {
      setLoading(false);
    }
  };

  // --- Address search for custom destination ---
  const searchDestination = (query: string) => {
    setDestQuery(query);
    setSelectedDest(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 3) {
      setDestResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setDestSearching(true);
      try {
        let locationParams = "";
        if (userCoords) {
          const delta = 1.5;
          locationParams = `&viewbox=${userCoords.lon - delta},${userCoords.lat + delta},${userCoords.lon + delta},${userCoords.lat - delta}&bounded=0`;
        }
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br${locationParams}`,
          { headers: { "User-Agent": "SentynelaUrban/1.0" } }
        );
        const data: GeoResult[] = await res.json();
        setDestResults(data);
      } catch {
        setDestResults([]);
      } finally {
        setDestSearching(false);
      }
    }, 500);
  };

  const selectDest = (item: GeoResult) => {
    setSelectedDest(item);
    setDestQuery(item.display_name);
    setDestResults([]);
  };

  const handleCustomRoute = async () => {
    if (!userCoords) {
      Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
      return;
    }
    if (!selectedDest) {
      Alert.alert("Erro", "Busque e selecione um destino");
      return;
    }
    setLoading(true);
    try {
      const res = await routesApi.getCustomRoute({
        origin_lat: userCoords.lat,
        origin_lon: userCoords.lon,
        dest_lat: parseFloat(selectedDest.lat),
        dest_lon: parseFloat(selectedDest.lon),
        profile,
      });
      setRoutes(res.routes);
      setSelectedRoute(0);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao calcular rota");
    } finally {
      setLoading(false);
    }
  };

  // Quick route to a saved location
  const handleQuickRoute = async (loc: any) => {
    if (!userCoords) {
      Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
      return;
    }
    setLoading(true);
    try {
      const res = await routesApi.getCustomRoute({
        origin_lat: userCoords.lat,
        origin_lon: userCoords.lon,
        dest_lat: loc.lat,
        dest_lon: loc.lon,
        profile,
      });
      setRoutes(res.routes);
      setSelectedRoute(0);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao calcular rota");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 0.3) return SeverityColors.baixa;
    if (score < 0.7) return SeverityColors.media;
    return SeverityColors.alta;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const locationTypeLabel: Record<string, string> = {
    home: "Casa",
    work: "Trabalho",
    favorite: "Favorito",
  };

  const locationTypeIcon: Record<string, string> = {
    home: "home",
    work: "briefcase",
    favorite: "star",
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Current location status */}
      <View style={styles.locationStatus}>
        <Ionicons name="navigate" size={18} color={Colors.primary} />
        {detectingLocation ? (
          <Text style={styles.locationText}>Detectando sua localizacao...</Text>
        ) : nearbyLocation ? (
          <Text style={styles.locationText}>
            Voce esta em:{" "}
            <Text style={styles.locationHighlight}>
              {locationTypeLabel[nearbyLocation] || nearbyLocation}
            </Text>
          </Text>
        ) : userCoords ? (
          <Text style={styles.locationText}>Localizacao obtida</Text>
        ) : (
          <Text style={styles.locationTextError}>Localizacao indisponivel</Text>
        )}
      </View>

      {/* Transport profile */}
      <View style={styles.chips}>
        {PROFILES.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.profileChip, profile === p.value && styles.profileChipActive]}
            onPress={() => setProfile(p.value)}
          >
            <Ionicons
              name={p.icon}
              size={18}
              color={profile === p.value ? "#fff" : Colors.text}
            />
            <Text style={[styles.profileChipText, profile === p.value && styles.profileChipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Smart commute button */}
      {locations && locations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rota Rapida</Text>
          <TouchableOpacity
            style={styles.commuteButton}
            onPress={handleCommute}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name={commuteInfo.icon} size={24} color={Colors.primary} />
            <Text style={styles.commuteText}>{commuteInfo.label}</Text>
            {loading && <ActivityIndicator size="small" color={Colors.primary} />}
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Quick routes to other saved locations */}
          {locations.filter((l: any) => l.type !== nearbyLocation).length > 1 && (
            <View style={styles.quickRoutes}>
              {locations
                .filter((l: any) => l.type !== nearbyLocation)
                .map((loc: any) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={styles.quickRouteChip}
                    onPress={() => handleQuickRoute(loc)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={(locationTypeIcon[loc.type] || "location") as any}
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.quickRouteText} numberOfLines={1}>
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>
      )}

      {/* Custom route with address search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rota Personalizada</Text>

        <View style={styles.originCard}>
          <Ionicons name="radio-button-on" size={16} color={Colors.success} />
          <Text style={styles.originText}>
            {userCoords ? "Sua localizacao atual" : "Obtendo localizacao..."}
          </Text>
        </View>

        <View style={styles.destConnector}>
          <View style={styles.connectorLine} />
        </View>

        <Input
          label="Destino"
          placeholder="Buscar endereco de destino..."
          value={destQuery}
          onChangeText={searchDestination}
        />

        {destSearching && (
          <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: "center" }} />
        )}

        {destResults.length > 0 && (
          <View style={styles.searchResults}>
            {destResults.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.searchItem}
                onPress={() => selectDest(item)}
              >
                <Ionicons name="location" size={16} color={Colors.primary} />
                <Text style={styles.searchItemText} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedDest && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.selectedText} numberOfLines={1}>
              {selectedDest.display_name}
            </Text>
          </View>
        )}

        <Button title="Calcular Rota" onPress={handleCustomRoute} loading={loading} />
      </View>

      {/* Route results */}
      {routes.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Rotas Encontradas</Text>

          {/* Check if routes have actual data (API key configured) */}
          {routes.every((r) => r.duration_seconds === 0 && r.distance_meters === 0 && !r.geometry) ? (
            <View style={styles.noRouteData}>
              <Ionicons name="warning-outline" size={32} color={Colors.warning} />
              <Text style={styles.noRouteTitle}>Servico de rotas indisponivel</Text>
              <Text style={styles.noRouteHint}>
                O servico de calculo de rotas (OpenRouteService) nao esta configurado no servidor. Configure a API key para habilitar esta funcionalidade.
              </Text>
            </View>
          ) : (
            <>
              {routes[selectedRoute]?.geometry && (
                <View style={styles.mapContainer}>
                  <MapLibreGL.MapView style={styles.map} mapStyle={DEFAULT_MAP_STYLE.url}>
                    <MapLibreGL.Camera
                      bounds={{
                        ne: [
                          Math.max(userCoords?.lon ?? DEFAULT_CENTER.longitude, selectedDest ? parseFloat(selectedDest.lon) : commuteInfo.dest?.lon ?? DEFAULT_CENTER.longitude) + 0.02,
                          Math.max(userCoords?.lat ?? DEFAULT_CENTER.latitude, selectedDest ? parseFloat(selectedDest.lat) : commuteInfo.dest?.lat ?? DEFAULT_CENTER.latitude) + 0.02,
                        ],
                        sw: [
                          Math.min(userCoords?.lon ?? DEFAULT_CENTER.longitude, selectedDest ? parseFloat(selectedDest.lon) : commuteInfo.dest?.lon ?? DEFAULT_CENTER.longitude) - 0.02,
                          Math.min(userCoords?.lat ?? DEFAULT_CENTER.latitude, selectedDest ? parseFloat(selectedDest.lat) : commuteInfo.dest?.lat ?? DEFAULT_CENTER.latitude) - 0.02,
                        ],
                        paddingTop: 20,
                        paddingBottom: 20,
                        paddingLeft: 20,
                        paddingRight: 20,
                      }}
                      animationDuration={500}
                    />
                    {routes.map((route, i) =>
                      route.geometry ? (
                        <RouteOverlay key={i} geometry={route.geometry} riskScore={route.risk_score} id={`route-${i}`} />
                      ) : null
                    )}
                  </MapLibreGL.MapView>
                </View>
              )}

              {routes.map((route, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.routeCard, selectedRoute === i && styles.routeCardSelected]}
                  onPress={() => setSelectedRoute(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeLabel}>Rota {i + 1}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(route.risk_score) }]}>
                      <Text style={styles.riskText}>Risco: {Math.round(route.risk_score * 100)}%</Text>
                    </View>
                  </View>
                  <Text style={styles.routeInfo}>
                    {formatDuration(route.duration_seconds)} · {formatDistance(route.distance_meters)}
                  </Text>
                  {route.incidents_on_route.length > 0 && (
                    <Text style={styles.incidentsWarning}>
                      {route.incidents_on_route.length} incidente(s) no trajeto
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },

  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  locationHighlight: { color: Colors.primary, fontWeight: "600" },
  locationTextError: { fontSize: FontSize.sm, color: Colors.danger },

  chips: { flexDirection: "row", gap: Spacing.sm },
  profileChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  profileChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  profileChipText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "500" },
  profileChipTextActive: { color: "#fff" },

  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },

  commuteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  commuteText: { flex: 1, fontSize: FontSize.md, fontWeight: "600", color: Colors.text },

  quickRoutes: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  quickRouteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  quickRouteText: { fontSize: FontSize.xs, color: Colors.text },

  originCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  originText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  destConnector: { alignItems: "flex-start", paddingLeft: Spacing.lg },
  connectorLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
  },

  searchResults: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchItemText: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0, 255, 136, 0.1)",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.3)",
  },
  selectedText: { flex: 1, fontSize: FontSize.xs, color: Colors.success },

  results: { gap: Spacing.md },
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: { flex: 1 },
  routeCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeCardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  routeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeLabel: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  riskText: { color: "#fff", fontSize: FontSize.xs, fontWeight: "bold" },
  routeInfo: { fontSize: FontSize.sm, color: Colors.textSecondary },
  incidentsWarning: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: "500" },
  noRouteData: {
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noRouteTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.warning },
  noRouteHint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: "center" },
});
