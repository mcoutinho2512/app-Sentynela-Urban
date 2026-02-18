import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useIncidentsNearby } from "@/hooks/useIncidents";
import { useAuthStore } from "@/stores/authStore";
import { getCurrentLocation } from "@/utils/permissions";
import { IncidentMarker } from "@/components/map/IncidentMarker";
import { MAP_STYLES, DEFAULT_MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/constants/mapStyles";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

MapLibreGL.setAccessToken(null);

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStyleIndex, setMapStyleIndex] = useState(0);

  const currentStyle = MAP_STYLES[mapStyleIndex] ?? DEFAULT_MAP_STYLE;

  const cycleMapStyle = () => {
    setMapStyleIndex((i) => (i + 1) % MAP_STYLES.length);
  };

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        setLocation(DEFAULT_CENTER);
      }
      setLoading(false);
    })();
  }, []);

  const { data: incidents } = useIncidentsNearby(
    location?.latitude ?? 0,
    location?.longitude ?? 0,
    5000
  );

  const incidentCount = incidents?.incidents?.length ?? 0;

  if (loading || !location) {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingLogo}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Obtendo localizacao...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} mapStyle={currentStyle.url}>
        <MapLibreGL.Camera
          centerCoordinate={[location.longitude, location.latitude]}
          zoomLevel={DEFAULT_ZOOM}
        />
        <MapLibreGL.UserLocation visible />
        {incidents?.incidents?.map((incident) => (
          <IncidentMarker
            key={incident.id}
            incident={incident}
            onPress={() => router.push(`/(tabs)/map/${incident.id}`)}
          />
        ))}
      </MapLibreGL.MapView>

      {/* Header glassmorphism */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.appName}>SENTYNELA</Text>
              <Text style={styles.headerSubtitle}>
                {user?.name ? `Ola, ${user.name.split(" ")[0]}` : "Urban Safety"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {incidentCount > 0 && (
              <View style={styles.incidentBadge}>
                <Ionicons name="warning" size={14} color={Colors.warning} />
                <Text style={styles.incidentCount}>{incidentCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Map style switcher */}
      <TouchableOpacity
        style={[styles.mapStyleButton, { bottom: 20 }]}
        onPress={cycleMapStyle}
        activeOpacity={0.7}
      >
        <Ionicons name="layers" size={20} color={Colors.primary} />
        <Text style={styles.mapStyleLabel}>{currentStyle.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    flex: 1,
  },

  // Header
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: FontSize.md,
    fontWeight: "bold",
    color: Colors.text,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  incidentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 190, 11, 0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 190, 11, 0.3)",
  },
  incidentCount: {
    fontSize: FontSize.xs,
    fontWeight: "bold",
    color: Colors.warning,
  },

  // Map style switcher
  mapStyleButton: {
    position: "absolute",
    right: Spacing.md,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.glass,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  mapStyleLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text,
  },

  // Loading
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
