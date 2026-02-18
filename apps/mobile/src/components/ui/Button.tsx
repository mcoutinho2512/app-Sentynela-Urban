import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger";
  compact?: boolean;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  compact = false,
}: ButtonProps) {
  const buttonStyles: ViewStyle[] = [styles.base];
  if (compact) buttonStyles.push(styles.compact);

  switch (variant) {
    case "outline":
      buttonStyles.push(styles.outline);
      break;
    case "danger":
      buttonStyles.push(styles.danger);
      break;
    default:
      buttonStyles.push(styles.primary);
  }

  if (disabled || loading) buttonStyles.push(styles.disabled);

  const textColor =
    variant === "outline" ? Colors.primary : "#fff";

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  compact: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
