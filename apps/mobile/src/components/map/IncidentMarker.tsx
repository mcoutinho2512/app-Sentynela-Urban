import MapLibreGL from "@maplibre/maplibre-react-native";
import { View, Text, StyleSheet } from "react-native";
import { SeverityColors, Colors, FontSize, BorderRadius, Spacing } from "@/constants/theme";

interface Incident {
  id: number;
  type: string;
  severity: string;
  lat: number;
  lon: number;
  status: string;
}

interface IncidentMarkerProps {
  incident: Incident;
  onPress: () => void;
}

export function IncidentMarker({ incident, onPress }: IncidentMarkerProps) {
  const color =
    SeverityColors[incident.severity as keyof typeof SeverityColors] || Colors.textSecondary;

  return (
    <MapLibreGL.MarkerView
      coordinate={[incident.lon, incident.lat]}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={[styles.marker, { backgroundColor: color }]} onTouchEnd={onPress}>
        <Text style={styles.markerText}>{incident.type.charAt(0).toUpperCase()}</Text>
      </View>
    </MapLibreGL.MarkerView>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: FontSize.xs,
  },
});
