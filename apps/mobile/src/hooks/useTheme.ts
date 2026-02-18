import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    isDark,
    colors: {
      background: isDark ? Colors.darkBackground : Colors.background,
      surface: isDark ? Colors.darkSurface : Colors.surface,
      text: isDark ? Colors.darkText : Colors.text,
      textSecondary: isDark ? "#adb5bd" : Colors.textSecondary,
      border: isDark ? "#2a2a4a" : Colors.border,
      primary: Colors.primary,
      primaryDark: Colors.primaryDark,
      secondary: Colors.secondary,
      success: Colors.success,
      warning: Colors.warning,
      danger: Colors.danger,
    },
  };
}
