export const Colors = {
  primary: "#4361ee",
  primaryDark: "#3a0ca3",
  secondary: "#f72585",
  success: "#06d6a0",
  warning: "#ffd166",
  danger: "#ef476f",
  background: "#f8f9fa",
  surface: "#ffffff",
  text: "#212529",
  textSecondary: "#6c757d",
  border: "#dee2e6",
  darkBackground: "#1a1a2e",
  darkSurface: "#16213e",
  darkText: "#e9ecef",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 34,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const SeverityColors: Record<string, string> = {
  baixa: "#06d6a0",
  media: "#ffd166",
  alta: "#ef476f",
};

export const IncidentTypeIcons: Record<string, string> = {
  alagamento: "water",
  tiroteio: "alert-circle",
  assalto: "shield-checkmark",
  acidente: "car-sport",
  incendio: "flame",
  queda_arvore: "leaf",
  buraco: "warning",
  deslizamento: "trending-down",
  outros: "help-circle",
};
