export interface MapStyleOption {
  id: string;
  label: string;
  url: string;
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: "dark",
    label: "Dark",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "dark-nolabels",
    label: "Dark Clean",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  {
    id: "voyager",
    label: "Voyager",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  {
    id: "positron",
    label: "Light",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  {
    id: "liberty",
    label: "Liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
];

export const DEFAULT_MAP_STYLE = MAP_STYLES[0];

export const DEFAULT_CENTER = {
  latitude: -22.9068,
  longitude: -43.1729,
};

export const DEFAULT_ZOOM = 13;
