import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/api/alerts";
import { getCurrentLocation } from "@/utils/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, FontSize, BorderRadius, SeverityColors } from "@/constants/theme";

export default function AlertsScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [radiusKm, setRadiusKm] = useState("2");
  const [minSeverity, setMinSeverity] = useState("baixa");
  const [refreshing, setRefreshing] = useState(false);

  const { data: preferences, refetch: refetchPrefs } = useQuery({
    queryKey: ["alert-preferences"],
    queryFn: alertsApi.getPreferences,
  });

  const { data: feed, refetch: refetchFeed } = useQuery({
    queryKey: ["alert-feed"],
    queryFn: alertsApi.getAlertFeed,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPrefs(), refetchFeed()]);
    setRefreshing(false);
  }, [refetchPrefs, refetchFeed]);

  const createPref = useMutation({
    mutationFn: alertsApi.createPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-preferences"] });
      setShowForm(false);
    },
    onError: (err: any) => {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao criar alerta");
    },
  });

  const deletePref = useMutation({
    mutationFn: alertsApi.deletePreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-preferences"] });
    },
  });

  const handleCreate = async () => {
    const loc = await getCurrentLocation();
    if (!loc) {
      Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
      return;
    }
    createPref.mutate({
      mode: "radius",
      center_lat: loc.coords.latitude,
      center_lon: loc.coords.longitude,
      radius_km: parseFloat(radiusKm) || 2,
      min_severity: minSeverity,
      enabled: true,
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atras`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atras`;
    return `${Math.floor(hours / 24)}d atras`;
  };

  const severityLabel: Record<string, string> = {
    baixa: "Baixa",
    media: "Media",
    alta: "Alta",
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferencias de Alerta</Text>
          <TouchableOpacity onPress={() => setShowForm(!showForm)}>
            <Ionicons
              name={showForm ? "close" : "add-circle"}
              size={28}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {preferences?.map((pref: any) => (
          <View key={pref.id} style={styles.prefCard}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefMode}>
                Raio: {pref.radius_km}km
              </Text>
              <Text style={styles.prefDetail}>
                Severidade minima: {severityLabel[pref.min_severity] || pref.min_severity}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deletePref.mutate(pref.id)}>
              <Ionicons name="trash" size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formHint}>
              O alerta sera criado com base na sua localizacao atual
            </Text>

            <Input
              label="Raio (km)"
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
              placeholder="Ex: 2"
            />

            <Text style={styles.label}>Severidade minima</Text>
            <View style={styles.chips}>
              {(["baixa", "media", "alta"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    { borderColor: SeverityColors[s] },
                    minSeverity === s && {
                      backgroundColor: SeverityColors[s],
                    },
                  ]}
                  onPress={() => setMinSeverity(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: SeverityColors[s] },
                      minSeverity === s && { color: "#fff" },
                    ]}
                  >
                    {severityLabel[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Criar Alerta"
              onPress={handleCreate}
              loading={createPref.isPending}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feed de Alertas</Text>
        {(!feed || feed.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={40} color={Colors.border} />
            <Text style={styles.empty}>Nenhum alerta recente</Text>
            <Text style={styles.emptyHint}>Configure preferencias para receber alertas</Text>
          </View>
        )}
        {feed?.map((item: any) => (
          <View key={item.incident_id} style={styles.feedCard}>
            <View
              style={[
                styles.feedDot,
                {
                  backgroundColor:
                    SeverityColors[item.severity as keyof typeof SeverityColors] ||
                    Colors.textSecondary,
                },
              ]}
            />
            <View style={styles.feedContent}>
              <Text style={styles.feedType}>{item.type}</Text>
              <Text style={styles.feedMeta}>
                {item.distance_km.toFixed(1)}km · {timeAgo(item.created_at)}
              </Text>
              {item.description && (
                <Text style={styles.feedDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  prefCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prefInfo: { flex: 1 },
  prefMode: { fontSize: FontSize.md, fontWeight: "500", color: Colors.text },
  prefDetail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  form: {
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  label: { fontSize: FontSize.sm, fontWeight: "500", color: Colors.text },
  chips: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: "600" },
  emptyState: { alignItems: "center", gap: Spacing.xs, paddingVertical: Spacing.lg },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: "center" },
  emptyHint: { fontSize: FontSize.sm, color: Colors.border, textAlign: "center" },
  feedCard: {
    flexDirection: "row",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  feedContent: { flex: 1 },
  feedType: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text, textTransform: "capitalize" },
  feedMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  feedDesc: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs },
});
