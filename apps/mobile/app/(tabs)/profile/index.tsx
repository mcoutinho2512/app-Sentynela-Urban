import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/stores/authStore";
import { locationsApi } from "@/api/locations";
import { uploadsApi } from "@/api/uploads";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { API_URL } from "@/constants/env";

const LOCATION_TYPES = [
  { value: "home", label: "Casa", icon: "home" as const },
  { value: "work", label: "Trabalho", icon: "briefcase" as const },
  { value: "favorite", label: "Favorito", icon: "star" as const },
];

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("home");
  const [savingLocation, setSavingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Address search state
  const [addressQuery, setAddressQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<GeoResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // --- Photo upload ---
  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permissao necessaria", "Permita o acesso para selecionar uma foto.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadsApi.uploadFile(result.assets[0].uri);
      await updateUser({ avatar_url: url });
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert("Foto de Perfil", "Escolha uma opcao", [
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Galeria", onPress: () => pickImage(false) },
      ...(user?.avatar_url
        ? [
            {
              text: "Remover foto",
              style: "destructive" as const,
              onPress: async () => {
                try {
                  await updateUser({ avatar_url: "" });
                } catch {
                  Alert.alert("Erro", "Falha ao remover foto");
                }
              },
            },
          ]
        : []),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  // --- Address search (Nominatim) ---
  const searchAddress = async (query: string) => {
    setAddressQuery(query);
    setSelectedAddress(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br`,
          { headers: { "User-Agent": "SentynelaUrban/1.0" } }
        );
        const data: GeoResult[] = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectAddress = (item: GeoResult) => {
    setSelectedAddress(item);
    setAddressQuery(item.display_name);
    setSearchResults([]);
  };

  const handleSaveLocation = async () => {
    if (!newLabel.trim()) {
      Alert.alert("Erro", "Digite um nome para o local");
      return;
    }
    if (!selectedAddress) {
      Alert.alert("Erro", "Busque e selecione um endereco");
      return;
    }
    setSavingLocation(true);
    try {
      await locationsApi.createLocation({
        label: newLabel.trim(),
        type: newType,
        lat: parseFloat(selectedAddress.lat),
        lon: parseFloat(selectedAddress.lon),
      });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setNewLabel("");
      setAddressQuery("");
      setSelectedAddress(null);
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

  const avatarUri = user?.avatar_url
    ? user.avatar_url.startsWith("http")
      ? user.avatar_url
      : `${API_URL}${user.avatar_url}`
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.userCard}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <View style={styles.avatar}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={Colors.primary} />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
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

            <Input
              label="Endereco"
              placeholder="Buscar endereco..."
              value={addressQuery}
              onChangeText={searchAddress}
            />

            {searching && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: "center" }} />
            )}

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.searchItem}
                    onPress={() => selectAddress(item)}
                  >
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <Text style={styles.searchItemText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedAddress && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.selectedText} numberOfLines={1}>
                  {selectedAddress.display_name}
                </Text>
              </View>
            )}

            <Button
              title="Salvar Local"
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
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cameraIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
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
  searchResults: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchItemText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0, 255, 136, 0.1)",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.3)",
  },
  selectedText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.success,
  },
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
