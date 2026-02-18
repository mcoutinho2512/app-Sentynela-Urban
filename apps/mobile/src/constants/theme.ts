export const Colors = {
  // Primary accent - cyan eletrico
  primary: "#00d4ff",
  primaryDark: "#0099cc",
  primaryGlow: "rgba(0, 212, 255, 0.3)",

  // Secondary accent
  secondary: "#f72585",

  // Status
  success: "#00ff88",
  warning: "#ffbe0b",
  danger: "#ff3366",

  // Core dark backgrounds
  background: "#070b1a",
  backgroundSecondary: "#0d1229",
  surface: "#111833",
  surfaceLight: "#1a2342",

  // Text
  text: "#e8ecf4",
  textSecondary: "#6b7a99",
  textAccent: "#00d4ff",

  // Borders
  border: "#1e2a4a",
  borderLight: "#2a3660",

  // Glass/transparency
  glass: "rgba(17, 24, 51, 0.85)",
  glassLight: "rgba(26, 35, 66, 0.75)",
  glassBorder: "rgba(0, 212, 255, 0.15)",

  // Legacy compat
  darkBackground: "#070b1a",
  darkSurface: "#111833",
  darkText: "#e8ecf4",
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
  baixa: "#00ff88",
  media: "#ffbe0b",
  alta: "#ff3366",
};

export const SeverityGlowColors: Record<string, string> = {
  baixa: "rgba(0, 255, 136, 0.4)",
  media: "rgba(255, 190, 11, 0.4)",
  alta: "rgba(255, 51, 102, 0.5)",
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

export const Shadows = {
  glow: {
    shadowColor: "#00d4ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;
