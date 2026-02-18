import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Perfil" }} />
      <Stack.Screen name="subscription" options={{ title: "Assinatura" }} />
    </Stack>
  );
}
