import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { servicesApi, ServiceResponse } from "@/api/services";
import { getCurrentLocation } from "@/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadows,
} from "@/constants/theme";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER } from "@/constants/mapStyles";

MapLibreGL.setAccessToken(null);

const CATEGORIES = [
  { value: "", label: "Todos", icon: "apps" },
  { value: "seguranca", label: "Seguranca", icon: "shield-checkmark" },
  { value: "manutencao", label: "Manutencao", icon: "build" },
  { value: "eletrica", label: "Eletrica", icon: "flash" },
  { value: "hidraulica", label: "Hidraulica", icon: "water" },
  { value: "limpeza", label: "Limpeza", icon: "sparkles" },
  { value: "transporte", label: "Transporte", icon: "car" },
  { value: "saude", label: "Saude", icon: "medkit" },
  { value: "alimentacao", label: "Alimentacao", icon: "restaurant" },
  { value: "outros", label: "Outros", icon: "ellipsis-horizontal" },
];

export default function ServicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getCurrentLocation().then((loc) => {
      if (loc) {
        setUserCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
    });
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["services", userCoords?.lat, userCoords?.lon, category, search],
    queryFn: () =>
      userCoords
        ? servicesApi.listServices(
            userCoords.lat,
            userCoords.lon,
            5000,
            category || undefined,
            search || undefined,
          )
        : null,
    enabled: !!userCoords,
    staleTime: 30_000,
  });

  const { data: limits } = useQuery({
    queryKey: ["service-limits"],
    queryFn: servicesApi.getLimits,
  });

  const services = data?.services ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleRegister = () => {
    if (!user) return;
    if (user.role === "free") {
      Alert.alert(
        "Plano Necessario",
        "Voce precisa de um plano Pro ou Business para cadastrar servicos.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ver Planos", onPress: () => router.push("/(tabs)/profile/subscription") },
        ],
      );
      return;
    }
    if (limits && !limits.can_create) {
      Alert.alert(
        "Limite Atingido",
        `Seu plano permite ate ${limits.max_services} servico(s). Faca upgrade para adicionar mais.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/(tabs)/profile/subscription") },
        ],
      );
      return;
    }
    router.push("/(tabs)/services/register");
  };

  const openWhatsApp = (whatsapp: string) => {
    const url = `https://wa.me/${whatsapp.replace(/\D/g, "")}`;
    Linking.openURL(url);
  };

  const openPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderServiceCard = ({ item }: { item: ServiceResponse }) => {
    const isBusiness = item.plan_level === "business";
    return (
      <View style={[styles.serviceCard, isBusiness && styles.businessCard]}>
        {isBusiness && (
          <View style={styles.businessBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.businessBadgeText}>Destaque</Text>
          </View>
        )}
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.serviceCategory}>{item.category}</Text>
        </View>
        {item.description && (
          <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
        )}
        {item.hours && (
          <View style={styles.serviceInfoRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.serviceInfoText}>{item.hours}</Text>
          </View>
        )}
        <View style={styles.serviceActions}>
          {item.whatsapp && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.whatsappBtn]}
              onPress={() => openWhatsApp(item.whatsapp!)}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {item.phone && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.phoneBtn]}
              onPress={() => openPhone(item.phone!)}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Ligar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const mapCenter = userCoords
    ? [userCoords.lon, userCoords.lat]
    : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchText}
              placeholder="Buscar servicos..."
              placeholderTextColor={Colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Ionicons
              name={viewMode === "list" ? "map-outline" : "list-outline"}
              size={22}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <FlatList
          horizontal
          data={CATEGORIES}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          keyExtractor={(item) => item.value}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                category === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={category === cat.value ? "#fff" : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat.value && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Content */}
      {viewMode === "list" ? (
        <FlatList
          data={services}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyTitle}>Nenhum servico encontrado</Text>
                <Text style={styles.emptyDesc}>
                  Nao encontramos servicos nesta area. Seja o primeiro a se cadastrar!
                </Text>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.mapContainer}>
          <MapLibreGL.MapView
            style={styles.map}
            mapStyle={DEFAULT_MAP_STYLE.url}
            onPress={() => setSelectedService(null)}
          >
            <MapLibreGL.Camera
              centerCoordinate={mapCenter as [number, number]}
              zoomLevel={14}
            />
            <MapLibreGL.UserLocation visible />
            {services.map((svc) => {
              const isBusiness = svc.plan_level === "business";
              return (
                <MapLibreGL.MarkerView
                  key={svc.id}
                  coordinate={[svc.lon, svc.lat]}
                  anchor={{ x: 0.5, y: 1.0 }}
                >
                  <TouchableOpacity onPress={() => setSelectedService(svc)}>
                    <View style={[styles.mapPin, isBusiness && styles.mapPinBusiness]}>
                      <Ionicons
                        name={isBusiness ? "star" : "storefront"}
                        size={isBusiness ? 18 : 16}
                        color="#fff"
                      />
                    </View>
                  </TouchableOpacity>
                </MapLibreGL.MarkerView>
              );
            })}
          </MapLibreGL.MapView>

          {/* Selected service overlay */}
          {selectedService && (
            <View style={styles.mapOverlay}>
              {renderServiceCard({ item: selectedService })}
            </View>
          )}
        </View>
      )}

      {/* FAB - Register service */}
      <TouchableOpacity style={[styles.fab, Shadows.glow]} onPress={handleRegister} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  viewToggle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  categoryChipTextActive: { color: "#fff" },

  // List
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 100,
  },

  // Service card
  serviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  businessCard: {
    borderColor: Colors.warning,
    borderWidth: 1.5,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  businessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  businessBadgeText: { fontSize: FontSize.xs, fontWeight: "bold", color: "#fff" },
  serviceHeader: { gap: 2 },
  serviceName: { fontSize: FontSize.md, fontWeight: "bold", color: Colors.text },
  serviceCategory: { fontSize: FontSize.xs, color: Colors.textAccent, textTransform: "capitalize" },
  serviceDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  serviceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  serviceInfoText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  serviceActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  whatsappBtn: { backgroundColor: "#25D366" },
  phoneBtn: { backgroundColor: Colors.primary },
  actionBtnText: { fontSize: FontSize.xs, fontWeight: "600", color: "#fff" },

  // Map
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  mapPinBusiness: {
    backgroundColor: Colors.warning,
    width: 42,
    height: 42,
    borderRadius: 21,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.text,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
