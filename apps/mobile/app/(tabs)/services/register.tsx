import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/api/services";
import { getCurrentLocation } from "@/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { DEFAULT_MAP_STYLE, DEFAULT_CENTER } from "@/constants/mapStyles";

MapLibreGL.setAccessToken(null);

const CATEGORIES = [
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

const serviceSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(200),
  category: z.string().min(1, "Selecione uma categoria"),
  description: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  hours: z.string().max(200).optional(),
});

type ServiceForm = z.infer<typeof serviceSchema>;

export default function RegisterServiceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const gpsCoords = useRef<{ lat: number; lon: number } | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", category: "", description: "", phone: "", whatsapp: "", hours: "" },
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    getCurrentLocation().then((loc) => {
      if (loc) {
        const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
        gpsCoords.current = coords;
        setPickedCoords(coords);
      }
      setLoadingLocation(false);
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: servicesApi.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service-limits"] });
      Alert.alert(
        "Sucesso",
        "Seu servico foi cadastrado e sera revisado antes de aparecer no marketplace.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
    onError: (err: any) => {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao cadastrar servico");
    },
  });

  const handleMapPress = (feature: any) => {
    const [lon, lat] = feature.geometry.coordinates;
    setPickedCoords({ lat, lon });
  };

  const onSubmit = (data: ServiceForm) => {
    if (!pickedCoords) {
      Alert.alert("Erro", "Selecione a localizacao no mapa");
      return;
    }
    createMutation.mutate({
      name: data.name,
      category: data.category,
      description: data.description || undefined,
      phone: data.phone || undefined,
      whatsapp: data.whatsapp || undefined,
      hours: data.hours || undefined,
      lat: pickedCoords.lat,
      lon: pickedCoords.lon,
    });
  };

  const centerCoord = pickedCoords
    ? [pickedCoords.lon, pickedCoords.lat]
    : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cadastrar Servico</Text>
        <View style={{ width: 24 }} />
      </View>

      {user && (
        <View style={styles.planInfo}>
          <Ionicons
            name={user.role === "business" ? "star" : "shield-checkmark"}
            size={16}
            color={user.role === "business" ? Colors.warning : Colors.primary}
          />
          <Text style={styles.planInfoText}>
            Plano {user.role === "business" ? "Business" : "Pro"} ·{" "}
            {user.role === "business" ? "Seu servico tera destaque" : "1 servico disponivel"}
          </Text>
        </View>
      )}

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Nome do Servico"
            placeholder="Ex: Eletricista Jose"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.name?.message}
          />
        )}
      />

      <Text style={styles.label}>Categoria</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              selectedCategory === cat.value && styles.categoryChipActive,
            ]}
            onPress={() => setValue("category", cat.value)}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={selectedCategory === cat.value ? "#fff" : Colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.value && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {errors.category && <Text style={styles.error}>{errors.category.message}</Text>}

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Descricao (opcional)"
            placeholder="Descreva seus servicos..."
            multiline
            numberOfLines={4}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.textArea}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Telefone (opcional)"
            placeholder="(21) 99999-9999"
            keyboardType="phone-pad"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="whatsapp"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="WhatsApp (opcional)"
            placeholder="5521999999999"
            keyboardType="phone-pad"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="hours"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Horario de Funcionamento (opcional)"
            placeholder="Seg-Sex 8h-18h"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

      <Text style={styles.label}>Localizacao</Text>
      <View style={styles.mapContainer}>
        {loadingLocation ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.mapLoadingText}>Obtendo localizacao...</Text>
          </View>
        ) : (
          <MapLibreGL.MapView
            style={styles.map}
            mapStyle={DEFAULT_MAP_STYLE.url}
            onPress={handleMapPress}
          >
            <MapLibreGL.Camera
              centerCoordinate={centerCoord as [number, number]}
              zoomLevel={15}
              animationDuration={300}
            />
            <MapLibreGL.UserLocation visible />
            {pickedCoords && (
              <MapLibreGL.MarkerView
                coordinate={[pickedCoords.lon, pickedCoords.lat]}
                anchor={{ x: 0.5, y: 1.0 }}
              >
                <View pointerEvents="none">
                  <Ionicons name="location" size={40} color={Colors.primary} />
                </View>
              </MapLibreGL.MarkerView>
            )}
          </MapLibreGL.MapView>
        )}
      </View>
      <Text style={styles.mapHint}>
        {pickedCoords
          ? `${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lon.toFixed(5)}`
          : "Toque no mapa para selecionar"}
      </Text>

      <Button
        title="Cadastrar Servico"
        onPress={handleSubmit(onSubmit)}
        loading={createMutation.isPending}
      />

      <Text style={styles.reviewNote}>
        Seu servico sera revisado antes de aparecer no marketplace.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.xl, fontWeight: "bold", color: Colors.text },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  planInfoText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.text },
  error: { color: Colors.danger, fontSize: FontSize.xs },
  categoryScroll: { gap: Spacing.sm, paddingVertical: Spacing.xs },
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
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  categoryChipTextActive: { color: "#fff" },
  textArea: { height: 100, textAlignVertical: "top" },

  // Map
  mapContainer: {
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: { flex: 1 },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  mapLoadingText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  mapHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  reviewNote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
});
