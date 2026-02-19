import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: "R$ 9,90/mes",
    icon: "shield-checkmark" as const,
    color: Colors.primary,
    features: [
      "Alertas ilimitados",
      "Rotas sem anuncios",
      "Badge Pro no perfil",
      "1 servico no marketplace",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 29,90/mes",
    icon: "star" as const,
    color: Colors.warning,
    features: [
      "Tudo do Pro",
      "Ate 5 servicos no marketplace",
      "Destaque com pin dourado",
      "Ranking prioritario na busca",
      "Dashboard de analytics",
      "Suporte prioritario",
    ],
  },
];

export default function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const loadTokens = useAuthStore((s) => s.loadTokens);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: billingApi.getSubscription,
  });

  const subscribeMutation = useMutation({
    mutationFn: billingApi.subscribe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      loadTokens();
      Alert.alert("Sucesso", "Assinatura ativada!");
    },
    onError: (err: any) => {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha na assinatura");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      loadTokens();
      Alert.alert("Cancelado", "Sua assinatura foi cancelada");
    },
    onError: (err: any) => {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao cancelar");
    },
  });

  const handleCancel = () => {
    Alert.alert("Cancelar Assinatura", "Tem certeza? Voce perdera os beneficios.", [
      { text: "Nao", style: "cancel" },
      { text: "Cancelar", style: "destructive", onPress: () => cancelMutation.mutate() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.currentPlan}>
        <Text style={styles.label}>Plano Atual</Text>
        <Text style={styles.planName}>
          {user?.role === "free" ? "Gratuito" : user?.role?.toUpperCase()}
        </Text>
        {subscription && (
          <>
            <Text style={styles.planStatus}>Status: {subscription.status}</Text>
            {subscription.current_period_end && (
              <Text style={styles.planExpiry}>
                Expira em: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
              </Text>
            )}
            <Button
              title="Cancelar Assinatura"
              onPress={handleCancel}
              variant="danger"
              loading={cancelMutation.isPending}
            />
          </>
        )}
      </View>

      {(!subscription || subscription.status !== "active") && (
        <View style={styles.plans}>
          <Text style={styles.sectionTitle}>Escolha seu Plano</Text>
          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: plan.color },
                plan.id === "business" && {
                  shadowColor: plan.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 8,
                },
              ]}
            >
              <View style={styles.planHeaderRow}>
                <Ionicons name={plan.icon} size={24} color={plan.color} />
                <View>
                  <Text style={styles.planCardName}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                </View>
              </View>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.feature}>{f}</Text>
                </View>
              ))}
              <Button
                title={`Assinar ${plan.name}`}
                onPress={() => subscribeMutation.mutate(plan.id)}
                loading={subscribeMutation.isPending}
              />
            </View>
          ))}

          <View style={styles.marketplaceNote}>
            <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
            <Text style={styles.marketplaceNoteText}>
              Com o plano Pro ou Business, voce pode cadastrar seus servicos no marketplace e ser encontrado por usuarios na sua regiao.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  currentPlan: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary },
  planName: { fontSize: FontSize.xxl, fontWeight: "bold", color: Colors.primary },
  planStatus: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: "capitalize" },
  planExpiry: { fontSize: FontSize.sm, color: Colors.textSecondary },
  plans: { gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  planCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  planCardName: { fontSize: FontSize.xl, fontWeight: "bold", color: Colors.text },
  planPrice: { fontSize: FontSize.lg, fontWeight: "600" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feature: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  marketplaceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  marketplaceNoteText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
