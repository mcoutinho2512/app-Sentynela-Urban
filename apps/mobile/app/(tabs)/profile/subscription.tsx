import { View, Text, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: "R$ 9,90/mes",
    features: ["Alertas ilimitados", "Rotas sem anuncios", "Badge Pro"],
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 29,90/mes",
    features: [
      "Tudo do Pro",
      "Publicar servicos",
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
    <View style={styles.container}>
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
            <View key={plan.id} style={styles.planCard}>
              <Text style={styles.planCardName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
              {plan.features.map((f, i) => (
                <Text key={i} style={styles.feature}>
                  • {f}
                </Text>
              ))}
              <Button
                title={`Assinar ${plan.name}`}
                onPress={() => subscribeMutation.mutate(plan.id)}
                loading={subscribeMutation.isPending}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    gap: Spacing.lg,
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
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  planCardName: { fontSize: FontSize.xl, fontWeight: "bold", color: Colors.text },
  planPrice: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: "600" },
  feature: { fontSize: FontSize.sm, color: Colors.text },
});
