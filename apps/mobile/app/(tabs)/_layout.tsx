import { Tabs } from "expo-router";
import RegistrarTabButton from "@/shared/components/navigation/registrar-tab-button";
import { Home } from "reicon-react-native/icons/Home";
import { ReceiptText } from "reicon-react-native/icons/ReceiptText";
import { Wallet } from "reicon-react-native/icons/Wallet";
import { Graph } from "reicon-react-native/icons/Graph";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ focused }) => (
            <Home
              size={28}
              color={focused ? "text-primary" : "text-secondary"}
              weight={focused ? "Filled" : "Outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: "Movimientos",
          tabBarLabel: "Movimientos",
          tabBarIcon: ({ focused }) => (
            <ReceiptText
              size={28}
              color={focused ? "text-primary" : "text-secondary"}
              weight={focused ? "Filled" : "Outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="registrar"
        options={{
          title: "Registrar",
          tabBarButton: RegistrarTabButton,
        }}
      />
      <Tabs.Screen
        name="envelopes"
        options={{
          title: "Sobres",
          tabBarLabel: "Sobres",
          tabBarIcon: ({ focused }) => (
            <Graph
              size={28}
              color={focused ? "text-primary" : "text-secondary"}
              weight={focused ? "Filled" : "Outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: "Ahorro",
          tabBarLabel: "Ahorro",
          tabBarIcon: ({ focused }) => (
            <Wallet
              size={28}
              weight={focused ? "Filled" : "Outline"}
              color={focused ? "text-primary" : "text-secondary"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
