import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  SeverityColors,
  INCIDENT_TYPES,
  IncidentTypeIcons,
} from "@/constants/theme";

export interface MapFilters {
  severities: string[];
  types: string[];
}

interface MapFilterPanelProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  incidentCount: number;
}

const SEVERITY_OPTIONS = [
  { value: "baixa", label: "Baixa", color: SeverityColors.baixa },
  { value: "media", label: "Media", color: SeverityColors.media },
  { value: "alta", label: "Alta", color: SeverityColors.alta },
];

export function MapFilterButton({
  filters,
  onPress,
}: {
  filters: MapFilters;
  onPress: () => void;
}) {
  const activeCount =
    (filters.severities.length < 3 ? filters.severities.length : 0) +
    (filters.types.length > 0 ? filters.types.length : 0);

  return (
    <TouchableOpacity style={styles.filterButton} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="funnel" size={18} color={Colors.primary} />
      {activeCount > 0 && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MapFilterPanel({
  filters,
  onFiltersChange,
  incidentCount,
}: MapFilterPanelProps) {
  const toggleSeverity = (sev: string) => {
    const next = filters.severities.includes(sev)
      ? filters.severities.filter((s) => s !== sev)
      : [...filters.severities, sev];
    onFiltersChange({ ...filters, severities: next.length === 0 ? ["baixa", "media", "alta"] : next });
  };

  const toggleType = (type: string) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  };

  const clearAll = () => {
    onFiltersChange({ severities: ["baixa", "media", "alta"], types: [] });
  };

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Filtros</Text>
        <View style={styles.panelHeaderRight}>
          <Text style={styles.resultCount}>{incidentCount} ocorrencias</Text>
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Severity chips */}
      <Text style={styles.sectionTitle}>Gravidade</Text>
      <View style={styles.chipRow}>
        {SEVERITY_OPTIONS.map((sev) => {
          const active = filters.severities.includes(sev.value);
          return (
            <TouchableOpacity
              key={sev.value}
              style={[
                styles.chip,
                active && { backgroundColor: sev.color + "22", borderColor: sev.color },
              ]}
              onPress={() => toggleSeverity(sev.value)}
            >
              <View style={[styles.chipDot, { backgroundColor: sev.color }]} />
              <Text style={[styles.chipText, active && { color: sev.color }]}>
                {sev.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Type chips */}
      <Text style={styles.sectionTitle}>Tipo de Ocorrencia</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {INCIDENT_TYPES.map((t) => {
          const active = filters.types.includes(t.value);
          const iconName = (t.icon || "help-circle") as any;
          return (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.chip,
                active && { backgroundColor: Colors.primary + "22", borderColor: Colors.primary },
              ]}
              onPress={() => toggleType(t.value)}
            >
              <Ionicons
                name={iconName}
                size={14}
                color={active ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.chipText, active && { color: Colors.primary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Filter button (on map)
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },

  // Panel
  panel: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderTopWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  panelTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.text,
  },
  panelHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  resultCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  clearText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Sections
  sectionTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chipScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
