import { View, Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Colors } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <OfflineBanner />
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: Platform.OS === "ios" ? 88 : 64,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 28 : 8,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.5,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          headerStyle: {
            backgroundColor: Colors.background,
            shadowColor: Colors.primary,
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: "bold",
            letterSpacing: 1,
          },
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: "Reportar",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="routes"
          options={{
            title: "Rotas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="navigate" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: "Alertas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: "Servicos",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="storefront" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Mapa",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
