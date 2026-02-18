import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { locationsApi } from "@/api/locations";
import { apiClient } from "@/api/client";
import { getCurrentLocation } from "@/utils/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

const LOCATION_TYPES = [
  { value: "home", label: "Casa", icon: "home" as const },
  { value: "work", label: "Trabalho", icon: "briefcase" as const },
  { value: "favorite", label: "Favorito", icon: "star" as const },
];

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("home");
  const [savingLocation, setSavingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: locations, refetch } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.getLocations,
  });

  const deleteLocation = useMutation({
    mutationFn: locationsApi.deleteLocation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSaveLocation = async () => {
    if (!newLabel.trim()) {
      Alert.alert("Erro", "Digite um nome para o local");
      return;
    }
    setSavingLocation(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
        return;
      }
      await locationsApi.createLocation({
        label: newLabel.trim(),
        type: newType,
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setNewLabel("");
      setShowAddForm(false);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao salvar local");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir Conta",
      "Tem certeza que deseja excluir sua conta? Esta acao e irreversivel e todos os seus dados serao apagados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete("/users/me");
              await logout();
              router.replace("/(auth)/login");
            } catch (err: any) {
              Alert.alert("Erro", err?.response?.data?.detail || "Falha ao excluir conta");
            }
          },
        },
      ]
    );
  };

  const roleLabel: Record<string, string> = {
    free: "Gratuito",
    pro: "Pro",
    business: "Business",
    admin: "Admin",
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={Colors.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{roleLabel[user?.role ?? "free"]}</Text>
            </View>
            <Text style={styles.reputation}>
              {user?.reputation ?? 0} pts reputacao
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Locais Salvos</Text>
          <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
            <Ionicons
              name={showAddForm ? "close" : "add-circle"}
              size={28}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.addForm}>
            <Input
              label="Nome do local"
              placeholder="Ex: Casa, Escritorio..."
              value={newLabel}
              onChangeText={setNewLabel}
            />
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.chips}>
              {LOCATION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, newType === t.value && styles.chipSelected]}
                  onPress={() => setNewType(t.value)}
                >
                  <Ionicons
                    name={t.icon}
                    size={16}
                    color={newType === t.value ? "#fff" : Colors.text}
                  />
                  <Text style={[styles.chipText, newType === t.value && styles.chipTextSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              title="Salvar com localizacao atual"
              onPress={handleSaveLocation}
              loading={savingLocation}
            />
          </View>
        )}

        {locations?.length === 0 && !showAddForm && (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={40} color={Colors.border} />
            <Text style={styles.empty}>Nenhum local salvo</Text>
            <Text style={styles.emptyHint}>Adicione Casa e Trabalho para usar rotas automaticas</Text>
          </View>
        )}
        {locations?.map((loc: any) => (
          <View key={loc.id} style={styles.locationCard}>
            <Ionicons
              name={loc.type === "home" ? "home" : loc.type === "work" ? "briefcase" : "star"}
              size={20}
              color={Colors.primary}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>{loc.label}</Text>
              <Text style={styles.locationCoords}>
                {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteLocation.mutate(loc.id)}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          title="Gerenciar Assinatura"
          onPress={() => router.push("/(tabs)/profile/subscription")}
          variant="outline"
        />
        <Button title="Sair" onPress={handleLogout} variant="danger" />
        <TouchableOpacity style={styles.deleteAccount} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>Excluir minha conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  userCard: {
    flexDirection: "row",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { flex: 1, gap: Spacing.xs },
  userName: { fontSize: FontSize.xl, fontWeight: "bold", color: Colors.text },
  userEmail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  badges: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.xs },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { color: "#fff", fontSize: FontSize.xs, fontWeight: "600" },
  reputation: { fontSize: FontSize.xs, color: Colors.textSecondary },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  addForm: {
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: FontSize.sm, fontWeight: "500", color: Colors.text },
  chips: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.text },
  chipTextSelected: { color: "#fff" },
  emptyState: { alignItems: "center", gap: Spacing.xs, paddingVertical: Spacing.lg },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: "center" },
  emptyHint: { fontSize: FontSize.sm, color: Colors.border, textAlign: "center" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: FontSize.md, fontWeight: "500", color: Colors.text },
  locationCoords: { fontSize: FontSize.xs, color: Colors.textSecondary },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  deleteAccount: { alignItems: "center", paddingVertical: Spacing.md },
  deleteAccountText: { fontSize: FontSize.sm, color: Colors.danger, textDecorationLine: "underline" },
});
