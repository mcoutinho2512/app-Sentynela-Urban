import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Slider from "@react-native-community/slider";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { alertsApi } from "@/api/alerts";
import { getCurrentLocation } from "@/utils/permissions";
import { Button } from "@/components/ui/Button";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  SeverityColors,
  SeverityGlowColors,
  INCIDENT_TYPES,
  Shadows,
} from "@/constants/theme";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER } from "@/constants/mapStyles";

MapLibreGL.setAccessToken(null);

const SEVERITIES = [
  { value: "baixa", label: "Baixa", color: SeverityColors.baixa },
  { value: "media", label: "Media", color: SeverityColors.media },
  { value: "alta", label: "Alta", color: SeverityColors.alta },
] as const;

const TIME_FILTERS = [
  { value: "2h", label: "2h", hours: 2 },
  { value: "24h", label: "24h", hours: 24 },
  { value: "7d", label: "7d", hours: 168 },
  { value: "all", label: "Todos", hours: Infinity },
] as const;

// Generate a GeoJSON circle polygon for MapLibreGL
function createCircleGeoJSON(
  lat: number,
  lon: number,
  radiusKm: number,
  steps: number = 64,
): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const radiusDeg = radiusKm / 111.32;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusDeg * Math.cos(angle) / Math.cos((lat * Math.PI) / 180);
    const dy = radiusDeg * Math.sin(angle);
    coords.push([lon + dx, lat + dy]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

export default function AlertsScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2);
  const [minSeverity, setMinSeverity] = useState("baixa");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Animated pulse for empty state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const { data: preferences, refetch: refetchPrefs } = useQuery({
    queryKey: ["alert-preferences"],
    queryFn: alertsApi.getPreferences,
  });

  const { data: feed, refetch: refetchFeed } = useQuery({
    queryKey: ["alert-feed"],
    queryFn: alertsApi.getAlertFeed,
  });

  // Preview incidents count (debounced via staleTime)
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ["incident-preview", userCoords?.lat, userCoords?.lon, radiusKm, selectedTypes, minSeverity],
    queryFn: () =>
      userCoords
        ? alertsApi.previewIncidents(
            userCoords.lat,
            userCoords.lon,
            radiusKm,
            selectedTypes.length > 0 ? selectedTypes : undefined,
            minSeverity,
          )
        : null,
    enabled: showForm && !!userCoords,
    staleTime: 3000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPrefs(), refetchFeed()]);
    setRefreshing(false);
  }, [refetchPrefs, refetchFeed]);

  const createPref = useMutation({
    mutationFn: alertsApi.createPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["alert-feed"] });
      setShowForm(false);
      setSelectedTypes([]);
    },
    onError: (err: any) => {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao criar alerta");
    },
  });

  const deletePref = useMutation({
    mutationFn: alertsApi.deletePreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["alert-feed"] });
    },
  });

  const handleOpenForm = async () => {
    setShowForm(true);
    if (!userCoords) {
      setLoadingLocation(true);
      const loc = await getCurrentLocation();
      if (loc) {
        setUserCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
      setLoadingLocation(false);
    }
  };

  const handleCreate = () => {
    if (!userCoords) {
      Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
      return;
    }
    createPref.mutate({
      mode: "radius",
      center_lat: userCoords.lat,
      center_lon: userCoords.lon,
      radius_km: radiusKm,
      min_severity: minSeverity,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      enabled: true,
    });
  };

  const toggleType = (value: string) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  };

  const filteredFeed = useMemo(() => {
    if (!feed) return [];
    const filterHours = TIME_FILTERS.find((f) => f.value === timeFilter)?.hours ?? Infinity;
    if (filterHours === Infinity) return feed;
    const cutoff = Date.now() - filterHours * 3600 * 1000;
    return feed.filter((item) => new Date(item.created_at).getTime() >= cutoff);
  }, [feed, timeFilter]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atras`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atras`;
    return `${Math.floor(hours / 24)}d atras`;
  };

  const severityLabel: Record<string, string> = { baixa: "Baixa", media: "Media", alta: "Alta" };

  // Map circle for current form
  const mapCenter = userCoords
    ? [userCoords.lon, userCoords.lat]
    : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];
  const circleGeoJSON = userCoords ? createCircleGeoJSON(userCoords.lat, userCoords.lon, radiusKm) : null;

  const typeLabel = (type: string) => {
    const found = INCIDENT_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };
  const typeIcon = (type: string) => {
    const found = INCIDENT_TYPES.find((t) => t.value === type);
    return (found?.icon || "help-circle") as any;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Preferences Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferencias de Alerta</Text>
          <TouchableOpacity onPress={showForm ? () => setShowForm(false) : handleOpenForm}>
            <Ionicons
              name={showForm ? "close" : "add-circle"}
              size={28}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {preferences?.map((pref: any) => (
          <View key={pref.id} style={styles.prefCard}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefMode}>
                Raio: {pref.radius_km}km
              </Text>
              <Text style={styles.prefDetail}>
                Severidade minima: {severityLabel[pref.min_severity] || pref.min_severity}
              </Text>
              {pref.types && pref.types.length > 0 && (
                <Text style={styles.prefTypes} numberOfLines={1}>
                  Tipos: {pref.types.map((t: string) => typeLabel(t)).join(", ")}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => deletePref.mutate(pref.id)}>
              <Ionicons name="trash" size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Create Alert Form */}
        {showForm && (
          <View style={styles.form}>
            {/* A1: Mini Map with radius circle */}
            <View style={styles.mapContainer}>
              {loadingLocation ? (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.mapLoadingText}>Obtendo localizacao...</Text>
                </View>
              ) : (
                <MapLibreGL.MapView
                  style={styles.map}
                  mapStyle={DEFAULT_MAP_STYLE.url}
                  scrollEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  zoomEnabled={false}
                >
                  <MapLibreGL.Camera
                    centerCoordinate={mapCenter as [number, number]}
                    zoomLevel={radiusKm <= 1 ? 14 : radiusKm <= 3 ? 12.5 : radiusKm <= 6 ? 11 : 10}
                    animationDuration={400}
                  />
                  <MapLibreGL.UserLocation visible />
                  {circleGeoJSON && (
                    <MapLibreGL.ShapeSource id="radius-circle" shape={circleGeoJSON}>
                      <MapLibreGL.FillLayer
                        id="radius-fill"
                        style={{
                          fillColor: Colors.primary,
                          fillOpacity: 0.12,
                        }}
                      />
                      <MapLibreGL.LineLayer
                        id="radius-border"
                        style={{
                          lineColor: Colors.primary,
                          lineWidth: 2,
                          lineOpacity: 0.6,
                        }}
                      />
                    </MapLibreGL.ShapeSource>
                  )}
                </MapLibreGL.MapView>
              )}
            </View>

            {/* A2: Radius Slider with glow */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={styles.label}>Raio de Monitoramento</Text>
                <View style={[styles.radiusBadge, Shadows.glow]}>
                  <Text style={styles.radiusBadgeText}>{radiusKm.toFixed(1)} km</Text>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={10}
                step={0.5}
                value={radiusKm}
                onValueChange={setRadiusKm}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0.5 km</Text>
                <Text style={styles.sliderLabel}>10 km</Text>
              </View>
            </View>

            {/* A3: Preview */}
            {preview && (
              <View style={styles.previewCard}>
                <Ionicons name="eye-outline" size={18} color={Colors.primary} />
                <Text style={styles.previewText}>
                  {preview.filtered} incidente{preview.filtered !== 1 ? "s" : ""} nesta area
                  {preview.total !== preview.filtered && (
                    <Text style={styles.previewSubtext}>{" "}({preview.total} total)</Text>
                  )}
                </Text>
                {previewLoading && <ActivityIndicator size="small" color={Colors.primary} />}
              </View>
            )}

            {/* Severity Chips */}
            <Text style={styles.label}>Severidade minima</Text>
            <View style={styles.chips}>
              {SEVERITIES.map((sev) => (
                <TouchableOpacity
                  key={sev.value}
                  style={[
                    styles.severityChip,
                    { borderColor: sev.color },
                    minSeverity === sev.value && {
                      backgroundColor: sev.color,
                      shadowColor: sev.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}
                  onPress={() => setMinSeverity(sev.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: sev.color },
                      minSeverity === sev.value && { color: "#fff" },
                    ]}
                  >
                    {sev.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* A4: Incident Type Chips */}
            <Text style={styles.label}>Tipos de Ocorrencia (opcional)</Text>
            <Text style={styles.formHint}>
              Selecione para filtrar, ou deixe vazio para todos
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeChipsScroll}
            >
              {INCIDENT_TYPES.map((type) => {
                const isSelected = selectedTypes.includes(type.value);
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeChip,
                      isSelected && styles.typeChipSelected,
                    ]}
                    onPress={() => toggleType(type.value)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={14}
                      color={isSelected ? "#fff" : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        isSelected && styles.typeChipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              title="Criar Alerta"
              onPress={handleCreate}
              loading={createPref.isPending}
            />
          </View>
        )}
      </View>

      {/* Feed Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feed de Alertas</Text>

        {/* A5: Time Filters */}
        <View style={styles.timeFilters}>
          {TIME_FILTERS.map((tf) => (
            <TouchableOpacity
              key={tf.value}
              style={[
                styles.timeChip,
                timeFilter === tf.value && styles.timeChipActive,
              ]}
              onPress={() => setTimeFilter(tf.value)}
            >
              <Text
                style={[
                  styles.timeChipText,
                  timeFilter === tf.value && styles.timeChipTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* A5: Improved Empty State */}
        {filteredFeed.length === 0 && (
          <View style={styles.emptyState}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-outline" size={48} color={Colors.primary} />
              </View>
            </Animated.View>
            <Text style={styles.emptyTitle}>Nenhum alerta por aqui</Text>
            <Text style={styles.emptyDesc}>
              {preferences && preferences.length > 0
                ? "Nenhum incidente recente corresponde aos seus alertas. Quando algo acontecer, voce vera aqui."
                : "Configure suas preferencias de alerta para receber notificacoes de incidentes proximos."}
            </Text>
            {(!preferences || preferences.length === 0) && (
              <Button
                title="Criar Primeiro Alerta"
                onPress={handleOpenForm}
                compact
              />
            )}
          </View>
        )}

        {filteredFeed.map((item) => (
          <View key={item.incident_id} style={styles.feedCard}>
            <View
              style={[
                styles.feedIconBg,
                {
                  backgroundColor:
                    SeverityGlowColors[item.severity as keyof typeof SeverityGlowColors] ||
                    Colors.surface,
                },
              ]}
            >
              <Ionicons
                name={typeIcon(item.type)}
                size={18}
                color={
                  SeverityColors[item.severity as keyof typeof SeverityColors] ||
                  Colors.textSecondary
                }
              />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedType}>{typeLabel(item.type)}</Text>
              <Text style={styles.feedMeta}>
                {item.distance_km.toFixed(1)}km · {timeAgo(item.created_at)}
              </Text>
              {item.description && (
                <Text style={styles.feedDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },

  // Preference cards
  prefCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prefInfo: { flex: 1, gap: 2 },
  prefMode: { fontSize: FontSize.md, fontWeight: "500", color: Colors.text },
  prefDetail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  prefTypes: { fontSize: FontSize.xs, color: Colors.textAccent },

  // Form
  form: {
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginTop: -Spacing.xs,
  },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.text },

  // Map
  mapContainer: {
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: { flex: 1 },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing.sm,
  },
  mapLoadingText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Slider
  sliderSection: { gap: Spacing.xs },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  radiusBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  radiusBadgeText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "bold",
  },
  slider: { width: "100%", height: 40 },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -Spacing.xs,
  },
  sliderLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Preview
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  previewText: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  previewSubtext: { color: Colors.textSecondary },

  // Severity chips
  chips: { flexDirection: "row", gap: Spacing.sm },
  severityChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: "600" },

  // Type chips (A4)
  typeChipsScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  typeChipTextSelected: { color: "#fff" },

  // Time filters (A5)
  timeFilters: { flexDirection: "row", gap: Spacing.sm },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.textSecondary },
  timeChipTextActive: { color: "#fff" },

  // Empty state (A5)
  emptyState: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },

  // Feed cards
  feedCard: {
    flexDirection: "row",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  feedContent: { flex: 1 },
  feedType: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  feedMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  feedDesc: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs },
});
