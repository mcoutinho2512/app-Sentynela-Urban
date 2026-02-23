import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: "bold",
          letterSpacing: 1,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Perfil" }} />
      <Stack.Screen name="subscription" options={{ title: "Assinatura" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacidade" }} />
    </Stack>
  );
}
