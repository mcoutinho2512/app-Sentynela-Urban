/**
 * Simple grid-based clustering for map incidents.
 * Groups nearby incidents into clusters based on zoom level.
 */

import { IncidentResponse } from "@/api/incidents";

export interface ClusterItem {
  type: "cluster";
  id: string;
  lat: number;
  lon: number;
  count: number;
  incidents: IncidentResponse[];
  dominantSeverity: string;
}

export interface SingleItem {
  type: "single";
  incident: IncidentResponse;
}

export type MapItem = ClusterItem | SingleItem;

/**
 * Cluster incidents based on zoom level.
 * At high zoom (>15), no clustering. At low zoom, aggressive clustering.
 */
export function clusterIncidents(
  incidents: IncidentResponse[],
  zoom: number
): MapItem[] {
  // No clustering at high zoom levels
  if (zoom >= 15 || incidents.length <= 3) {
    return incidents.map((incident) => ({ type: "single", incident }));
  }

  // Grid size in degrees - smaller grid = less clustering
  // At zoom 10: ~0.01 degrees (~1.1km), zoom 13: ~0.001 (~111m)
  const gridSize = 0.5 / Math.pow(2, zoom - 8);

  const grid = new Map<
    string,
    { incidents: IncidentResponse[]; latSum: number; lonSum: number }
  >();

  for (const incident of incidents) {
    const cellX = Math.floor(incident.lon / gridSize);
    const cellY = Math.floor(incident.lat / gridSize);
    const key = `${cellX}_${cellY}`;

    if (!grid.has(key)) {
      grid.set(key, { incidents: [], latSum: 0, lonSum: 0 });
    }
    const cell = grid.get(key)!;
    cell.incidents.push(incident);
    cell.latSum += incident.lat;
    cell.lonSum += incident.lon;
  }

  const result: MapItem[] = [];

  for (const [key, cell] of grid) {
    if (cell.incidents.length === 1) {
      result.push({ type: "single", incident: cell.incidents[0] });
    } else {
      // Determine dominant severity
      const sevCounts: Record<string, number> = {};
      for (const inc of cell.incidents) {
        sevCounts[inc.severity] = (sevCounts[inc.severity] || 0) + 1;
      }
      const sevOrder = { alta: 3, media: 2, baixa: 1 };
      let dominantSeverity = "baixa";
      let maxPriority = 0;
      for (const [sev, count] of Object.entries(sevCounts)) {
        const priority = (sevOrder[sev as keyof typeof sevOrder] || 0) * 100 + count;
        if (priority > maxPriority) {
          maxPriority = priority;
          dominantSeverity = sev;
        }
      }

      result.push({
        type: "cluster",
        id: `cluster_${key}`,
        lat: cell.latSum / cell.incidents.length,
        lon: cell.lonSum / cell.incidents.length,
        count: cell.incidents.length,
        incidents: cell.incidents,
        dominantSeverity,
      });
    }
  }

  return result;
}
