import MapLibreGL from "@maplibre/maplibre-react-native";
import { View, Text, StyleSheet } from "react-native";
import { SeverityColors, Colors, FontSize, BorderRadius } from "@/constants/theme";
import { ClusterItem } from "@/utils/clustering";

interface ClusterMarkerProps {
  cluster: ClusterItem;
  onPress: () => void;
}

export function ClusterMarker({ cluster, onPress }: ClusterMarkerProps) {
  const color = SeverityColors[cluster.dominantSeverity] || Colors.textSecondary;
  const size = Math.min(28 + cluster.count * 4, 56);

  return (
    <MapLibreGL.MarkerView
      coordinate={[cluster.lon, cluster.lat]}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.wrapper} onTouchEnd={onPress}>
        <View
          style={[
            styles.cluster,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <Text style={[styles.count, { fontSize: size > 40 ? FontSize.md : FontSize.sm }]}>
            {cluster.count}
          </Text>
        </View>
        <View
          style={[
            styles.ring,
            {
              width: size + 10,
              height: size + 10,
              borderRadius: (size + 10) / 2,
              borderColor: color,
            },
          ]}
        />
      </View>
    </MapLibreGL.MarkerView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
  },
  cluster: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  count: {
    color: "#fff",
    fontWeight: "bold",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
    opacity: 0.3,
  },
});
