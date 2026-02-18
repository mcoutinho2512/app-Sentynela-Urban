import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { routesApi } from "@/api/routes";
import { getCurrentLocation } from "@/utils/permissions";
import { RouteOverlay } from "@/components/map/RouteOverlay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, FontSize, BorderRadius, SeverityColors } from "@/constants/theme";
import { MAP_STYLE_URL, DEFAULT_CENTER } from "@/constants/mapStyles";

const PROFILES = [
  { value: "driving-car", label: "Carro" },
  { value: "cycling-regular", label: "Bicicleta" },
  { value: "foot-walking", label: "A pe" },
];

interface RouteResult {
  geometry: any;
  duration_seconds: number;
  distance_meters: number;
  incidents_on_route: any[];
  risk_score: number;
}

export default function RoutesScreen() {
  const [profile, setProfile] = useState("driving-car");
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destLat, setDestLat] = useState("");
  const [destLon, setDestLon] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(0);

  const handleCommute = async () => {
    setLoading(true);
    try {
      const res = await routesApi.getCommuteRoute(profile);
      setRoutes(res.routes);
      setSelectedRoute(0);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Salve locais Casa e Trabalho no perfil primeiro.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setOriginCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } else {
      Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
    }
  };

  const handleCustomRoute = async () => {
    if (!originCoords) {
      Alert.alert("Erro", "Defina o ponto de origem");
      return;
    }
    if (!destLat || !destLon) {
      Alert.alert("Erro", "Defina o destino");
      return;
    }
    setLoading(true);
    try {
      const res = await routesApi.getCustomRoute({
        origin_lat: originCoords.lat,
        origin_lon: originCoords.lon,
        dest_lat: parseFloat(destLat),
        dest_lon: parseFloat(destLon),
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Perfil</Text>
      <View style={styles.chips}>
        {PROFILES.map((p) => (
          <Button
            key={p.value}
            title={p.label}
            onPress={() => setProfile(p.value)}
            variant={profile === p.value ? "primary" : "outline"}
            compact
          />
        ))}
      </View>

      <Button
        title="Rota Casa → Trabalho"
        onPress={handleCommute}
        loading={loading}
        variant="outline"
      />

      <Text style={styles.sectionTitle}>Rota Customizada</Text>

      <View style={styles.originRow}>
        <View style={styles.originInfo}>
          <Text style={styles.label}>Origem</Text>
          {originCoords ? (
            <Text style={styles.coordsText}>
              {originCoords.lat.toFixed(4)}, {originCoords.lon.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.placeholderText}>Nao definida</Text>
          )}
        </View>
        <Button title="Minha Localizacao" onPress={useMyLocation} variant="outline" compact />
      </View>

      <View style={styles.row}>
        <Input label="Destino Lat" placeholder="-22.91" keyboardType="numeric" onChangeText={setDestLat} value={destLat} style={styles.halfInput} />
        <Input label="Destino Lon" placeholder="-43.18" keyboardType="numeric" onChangeText={setDestLon} value={destLon} style={styles.halfInput} />
      </View>

      <Button title="Calcular Rota" onPress={handleCustomRoute} loading={loading} />

      {routes.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Rotas Encontradas</Text>

          {routes[selectedRoute]?.geometry && (
            <View style={styles.mapContainer}>
              <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL}>
                <MapLibreGL.Camera
                  centerCoordinate={[
                    originCoords?.lon ?? DEFAULT_CENTER.longitude,
                    originCoords?.lat ?? DEFAULT_CENTER.latitude,
                  ]}
                  zoomLevel={12}
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
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  chips: { flexDirection: "row", gap: Spacing.sm },
  originRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  originInfo: { flex: 1 },
  label: { fontSize: FontSize.sm, fontWeight: "500", color: Colors.text },
  coordsText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  placeholderText: { fontSize: FontSize.xs, color: Colors.border },
  row: { flexDirection: "row", gap: Spacing.sm },
  halfInput: { flex: 1 },
  results: { gap: Spacing.md },
  mapContainer: { height: 250, borderRadius: BorderRadius.md, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  map: { flex: 1 },
  routeCard: {
    backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md,
    gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  routeCardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  routeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeLabel: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  riskBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  riskText: { color: "#fff", fontSize: FontSize.xs, fontWeight: "bold" },
  routeInfo: { fontSize: FontSize.sm, color: Colors.textSecondary },
  incidentsWarning: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: "500" },
});
