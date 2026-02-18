import { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useIncidentsNearby } from "@/hooks/useIncidents";
import { getCurrentLocation } from "@/utils/permissions";
import { IncidentMarker } from "@/components/map/IncidentMarker";
import { MAP_STYLE_URL, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/constants/mapStyles";
import { Colors, Spacing, FontSize } from "@/constants/theme";

MapLibreGL.setAccessToken(null);

export default function MapScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Obtendo localizacao...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} mapStyle={MAP_STYLE_URL}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
