import { useEffect, useRef } from "react";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SeverityColors,
  SeverityGlowColors,
  Colors,
  IncidentTypeIcons,
} from "@/constants/theme";

interface Incident {
  id: number;
  type: string;
  severity: string;
  lat: number;
  lon: number;
  status: string;
  created_at?: string;
}

interface IncidentMarkerProps {
  incident: Incident;
  onPress: () => void;
}

export function IncidentMarker({ incident, onPress }: IncidentMarkerProps) {
  const color =
    SeverityColors[incident.severity] || Colors.textSecondary;
  const glowColor =
    SeverityGlowColors[incident.severity] || "rgba(107, 122, 153, 0.3)";
  const iconName = (IncidentTypeIcons[incident.type] || "help-circle") as any;

  const isRecent = incident.created_at
    ? Date.now() - new Date(incident.created_at).getTime() < 30 * 60 * 1000
    : false;

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isRecent) return;
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isRecent]);

  return (
    <MapLibreGL.MarkerView
      coordinate={[incident.lon, incident.lat]}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.wrapper} onTouchEnd={onPress}>
        {isRecent && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                backgroundColor: glowColor,
                opacity: pulseAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
        )}
        <View style={[styles.marker, { backgroundColor: color }]}>
          <Ionicons name={iconName} size={20} color="#fff" />
        </View>
        <View style={[styles.pointer, { borderTopColor: color }]} />
      </View>
    </MapLibreGL.MarkerView>
  );
}

const MARKER_SIZE = 44;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: MARKER_SIZE + 24,
    height: MARKER_SIZE + 24,
  },
  pulseRing: {
    position: "absolute",
    width: MARKER_SIZE + 20,
    height: MARKER_SIZE + 20,
    borderRadius: (MARKER_SIZE + 20) / 2,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
});
