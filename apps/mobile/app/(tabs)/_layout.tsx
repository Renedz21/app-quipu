import { Tabs } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Graph } from "reicon-react-native/icons/Graph";
import { Home } from "reicon-react-native/icons/Home";
import { ReceiptText } from "reicon-react-native/icons/ReceiptText";
import { Wallet } from "reicon-react-native/icons/Wallet";
import AuthGate from "@/shared/components/auth/auth-gate";
import RegistrarSheet from "@/shared/components/navigation/registrar-sheet";
import RegistrarTabButton from "@/shared/components/navigation/registrar-tab-button";

export default function TabLayout() {
  const [registrarOpen, setRegistrarOpen] = useState(false);

  return (
    <AuthGate>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#1A1A1A",
            tabBarInactiveTintColor: "#9A968C",
            tabBarLabelStyle: {
              fontSize: 11,
            },
            tabBarStyle: {
              backgroundColor: "#FBFAF7",
              borderTopWidth: 1,
              borderTopColor: "#E8E6DF",
              elevation: 0,
              shadowOpacity: 0,
              height: 68,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Inicio",
              tabBarLabel: "Inicio",
              tabBarIcon: ({ focused }) => (
                <Home size={20} color={focused ? "#1A1A1A" : "#9A968C"} />
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
                  size={20}
                  color={focused ? "#1A1A1A" : "#9A968C"}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="registrar"
            options={{
              title: "Registrar",
              tabBarButton: (props) => (
                <RegistrarTabButton
                  {...props}
                  onPress={() => setRegistrarOpen(true)}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="envelopes"
            options={{
              title: "Sobres",
              tabBarLabel: "Sobres",
              tabBarIcon: ({ focused }) => (
                <Graph size={20} color={focused ? "#1A1A1A" : "#9A968C"} />
              ),
            }}
          />
          <Tabs.Screen
            name="savings"
            options={{
              title: "Ahorro",
              tabBarLabel: "Ahorro",
              tabBarIcon: ({ focused }) => (
                <Wallet size={20} color={focused ? "#1A1A1A" : "#9A968C"} />
              ),
            }}
          />
        </Tabs>

        <RegistrarSheet
          isPresented={registrarOpen}
          onDismiss={() => setRegistrarOpen(false)}
        />
      </View>
    </AuthGate>
  );
}
