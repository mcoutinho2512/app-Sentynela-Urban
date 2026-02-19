import MapLibreGL from "@maplibre/maplibre-react-native";

interface RouteOverlayProps {
  geometry: any;
  riskScore: number;
  id: string;
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

export function RouteOverlay({ geometry, riskScore, id }: RouteOverlayProps) {
  if (!geometry) return null;

  const color =
    riskScore < 0.3 ? "#06d6a0" : riskScore < 0.7 ? "#ffd166" : "#ef476f";

  let geoJSONGeometry: GeoJSON.Geometry;

  if (typeof geometry === "string") {
    // Encoded polyline from OpenRouteService
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
          lineWidth: 5,
          lineOpacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
