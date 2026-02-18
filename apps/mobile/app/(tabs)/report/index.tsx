import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useCreateIncident } from "@/hooks/useIncidents";
import { uploadsApi } from "@/api/uploads";
import { getCurrentLocation } from "@/utils/permissions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSize, BorderRadius, SeverityColors, INCIDENT_TYPES } from "@/constants/theme";

const SEVERITIES = [
  { value: "baixa", label: "Baixa", color: SeverityColors.baixa },
  { value: "media", label: "Media", color: SeverityColors.media },
  { value: "alta", label: "Alta", color: SeverityColors.alta },
];

const reportSchema = z.object({
  type: z.string().min(1, "Selecione o tipo"),
  severity: z.string().min(1, "Selecione a severidade"),
  description: z.string().optional(),
});

type ReportForm = z.infer<typeof reportSchema>;

export default function ReportScreen() {
  const router = useRouter();
  const createIncident = useCreateIncident();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: { type: "", severity: "", description: "" },
  });

  const selectedType = watch("type");
  const selectedSeverity = watch("severity");

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: ReportForm) => {
    try {
      setUploading(true);
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert("Erro", "Nao foi possivel obter sua localizacao");
        return;
      }

      let photoUrl: string | undefined;
      if (photoUri) {
        photoUrl = await uploadsApi.uploadFile(photoUri);
      }

      await createIncident.mutateAsync({
        type: data.type,
        severity: data.severity,
        description: data.description || undefined,
        photo_url: photoUrl,
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      });

      Alert.alert("Sucesso", "Incidente reportado!", [
        { text: "OK", onPress: () => router.replace("/(tabs)/map") },
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao reportar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Tipo do Incidente</Text>
      <View style={styles.chips}>
        {INCIDENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.chip,
              selectedType === type.value && styles.chipSelected,
            ]}
            onPress={() => setValue("type", type.value)}
          >
            <Ionicons
              name={type.icon as any}
              size={16}
              color={selectedType === type.value ? "#fff" : Colors.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                selectedType === type.value && styles.chipTextSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.type && <Text style={styles.error}>{errors.type.message}</Text>}

      <Text style={styles.sectionTitle}>Severidade</Text>
      <View style={styles.chips}>
        {SEVERITIES.map((sev) => (
          <TouchableOpacity
            key={sev.value}
            style={[
              styles.severityChip,
              { borderColor: sev.color },
              selectedSeverity === sev.value && { backgroundColor: sev.color },
            ]}
            onPress={() => setValue("severity", sev.value)}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedSeverity === sev.value ? "#fff" : sev.color },
              ]}
            >
              {sev.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.severity && (
        <Text style={styles.error}>{errors.severity.message}</Text>
      )}

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Descricao (opcional)"
            placeholder="Descreva o que esta acontecendo..."
            multiline
            numberOfLines={4}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.textArea}
          />
        )}
      />

      <Text style={styles.sectionTitle}>Foto (opcional)</Text>
      <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={32} color={Colors.textSecondary} />
            <Text style={styles.photoText}>Tirar Foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <Button
        title={uploading ? "Enviando foto..." : "Reportar Incidente"}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting || createIncident.isPending || uploading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text, marginTop: Spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.text },
  chipTextSelected: { color: "#fff" },
  severityChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 2 },
  error: { color: Colors.danger, fontSize: FontSize.xs },
  textArea: { height: 100, textAlignVertical: "top" },
  photoButton: { borderRadius: BorderRadius.md, overflow: "hidden", borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed" },
  photoPreview: { width: "100%", height: 200 },
  photoPlaceholder: { height: 120, justifyContent: "center", alignItems: "center", backgroundColor: Colors.surface, gap: Spacing.xs },
  photoText: { color: Colors.textSecondary, fontSize: FontSize.sm },
});
