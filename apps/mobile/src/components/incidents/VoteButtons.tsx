import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

interface VoteButtonsProps {
  confirmations: number;
  refutations: number;
  userVote: string | null;
  onVote: (vote: string) => void;
  loading: boolean;
}

export function VoteButtons({
  confirmations,
  refutations,
  userVote,
  onVote,
  loading,
}: VoteButtonsProps) {
  const votes = [
    {
      type: "confirm",
      label: "Confirmar",
      icon: "checkmark-circle" as const,
      count: confirmations,
      color: Colors.success,
    },
    {
      type: "refute",
      label: "Refutar",
      icon: "close-circle" as const,
      count: refutations,
      color: Colors.danger,
    },
    {
      type: "resolved",
      label: "Resolvido",
      icon: "checkmark-done-circle" as const,
      count: 0,
      color: Colors.primary,
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {votes.map((v) => {
        const isActive = userVote === v.type;
        return (
          <TouchableOpacity
            key={v.type}
            style={[
              styles.button,
              isActive && { backgroundColor: v.color, borderColor: v.color },
            ]}
            onPress={() => onVote(v.type)}
            disabled={userVote !== null}
            activeOpacity={0.7}
          >
            <Ionicons
              name={v.icon}
              size={20}
              color={isActive ? "#fff" : v.color}
            />
            <Text style={[styles.label, isActive && { color: "#fff" }]}>
              {v.label}
            </Text>
            {v.count > 0 && (
              <Text style={[styles.count, isActive && { color: "#fff" }]}>
                {v.count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text,
  },
  count: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
