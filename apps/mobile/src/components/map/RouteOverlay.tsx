import MapLibreGL from "@maplibre/maplibre-react-native";

// Colors for up to 3 routes: best (green), alternative 1 (cyan), alternative 2 (yellow)
const ROUTE_COLORS = ["#00ff88", "#00d4ff", "#ffbe0b"];

interface RouteOverlayProps {
  geometry: any;
  riskScore: number;
  id: string;
  routeIndex?: number;
  isSelected?: boolean;
}

// Decode Google Encoded Polyline (used by OpenRouteService)
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // GeoJSON uses [longitude, latitude]
    coords.push([lng / 1e5, lat / 1e5]);
  }

  return coords;
}

export function RouteOverlay({ geometry, id, routeIndex = 0, isSelected = true }: RouteOverlayProps) {
  if (!geometry) return null;

  const color = ROUTE_COLORS[routeIndex] ?? ROUTE_COLORS[ROUTE_COLORS.length - 1];

  let geoJSONGeometry: GeoJSON.Geometry;

  if (typeof geometry === "string") {
    const coordinates = decodePolyline(geometry);
    geoJSONGeometry = { type: "LineString", coordinates };
  } else {
    geoJSONGeometry = geometry;
  }

  const geoJSON: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry: geoJSONGeometry,
  };

  return (
    <MapLibreGL.ShapeSource id={`route-${id}`} shape={geoJSON}>
      <MapLibreGL.LineLayer
        id={`route-line-${id}`}
        style={{
          lineColor: color,
          lineWidth: isSelected ? 6 : 3,
          lineOpacity: isSelected ? 0.9 : 0.35,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
