import MapLibreGL from "@maplibre/maplibre-react-native";

interface RouteOverlayProps {
  geometry: any;
  riskScore: number;
  id: string;
}

export function RouteOverlay({ geometry, riskScore, id }: RouteOverlayProps) {
  if (!geometry) return null;

  const color =
    riskScore < 0.3 ? "#06d6a0" : riskScore < 0.7 ? "#ffd166" : "#ef476f";

  const geoJSON: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry:
      typeof geometry === "string"
        ? { type: "LineString", coordinates: [] }
        : geometry,
  };

  return (
    <MapLibreGL.ShapeSource id={`route-${id}`} shape={geoJSON}>
      <MapLibreGL.LineLayer
        id={`route-line-${id}`}
        style={{
          lineColor: color,
          lineWidth: 5,
          lineOpacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
