import { BottomTabBarButtonProps } from "expo-router/tabs";
import { Pressable, Text } from "react-native";

/**
 * FAB central elevada. Ignora el `onPress` del slot (que navegaría
 * al tab "registrar") y dispara su propia acción — por ahora un log,
 * luego abrirá el bottom sheet de "Registrar gasto".
 *
 * Patrón: galaxies.dev/quickwin/expo-router-tabs-navigation#4
 */
export default function RegistrarTabButton(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Registrar"
      accessibilityState={props.accessibilityState}
      onPress={(e) => {
        // Evita la navegación al tab "registrar" del navigator.
        e.preventDefault?.();
        // TODO: abrir bottom sheet de "Registrar gasto".
        console.log("FAB: registrar");
      }}
      className="absolute -top-5 left-1/2 -ml-7 h-14 w-14 items-center justify-center rounded-full bg-foreground"
      style={{
        boxShadow: "0 6px 14px rgba(0, 0, 0, 0.18)",
      }}
    >
      <Text className="text-[28px] leading-[28px] font-light text-background">
        +
      </Text>
    </Pressable>
  );
}
