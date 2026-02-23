import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSize } from "@/constants/theme";

const registerSchema = z
  .object({
    name: z.string().min(2, "Minimo 2 caracteres"),
    email: z.string().email("Email invalido"),
    password: z.string().min(6, "Minimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas nao conferem",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register(data.email, data.password, data.name);
      router.replace("/(tabs)/map");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Falha no cadastro";
      Alert.alert("Erro", msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Criar Conta</Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome"
                placeholder="Seu nome"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Senha"
                placeholder="Minimo 6 caracteres"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirmar Senha"
                placeholder="Repita a senha"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Text style={styles.termsText}>
            Ao cadastrar, voce concorda com nossa{" "}
            <Text style={styles.termsLink} onPress={() => router.push("/(tabs)/profile/privacy")}>
              Politica de Privacidade
            </Text>
          </Text>

          <Button
            title="Cadastrar"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Ja tem conta? Entre aqui</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  link: {
    marginTop: Spacing.lg,
    alignSelf: "center",
  },
  linkText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
  },
  termsText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  termsLink: {
    color: Colors.primary,
    textDecorationLine: "underline",
  },
});
