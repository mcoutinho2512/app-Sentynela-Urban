import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius, SeverityColors } from "@/constants/theme";

interface Incident {
  id: number;
  type: string;
  severity: string;
  status: string;
  description?: string | null;
  confirmations: number;
  refutations: number;
  created_at: string;
}

interface IncidentCardProps {
  incident: Incident;
  onPress: () => void;
}

export function IncidentCard({ incident, onPress }: IncidentCardProps) {
  const color =
    SeverityColors[incident.severity as keyof typeof SeverityColors] || Colors.textSecondary;

  const timeAgo = () => {
    const diff = Date.now() - new Date(incident.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.type}>{incident.type}</Text>
          <Text style={styles.time}>{timeAgo()}</Text>
        </View>
        {incident.description && (
          <Text style={styles.description} numberOfLines={2}>
            {incident.description}
          </Text>
        )}
        <View style={styles.footer}>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.statText}>{incident.confirmations}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="close-circle" size={14} color={Colors.danger} />
            <Text style={styles.statText}>{incident.refutations}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: color }]}>
            <Text style={[styles.statusText, { color }]}>{incident.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  indicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  type: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    textTransform: "capitalize",
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statusBadge: {
    marginLeft: "auto",
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    textTransform: "capitalize",
  },
});
