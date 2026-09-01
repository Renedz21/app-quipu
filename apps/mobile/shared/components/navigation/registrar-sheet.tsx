import {
  BottomSheet,
  Column as ColumnRN,
  Host,
  Text as TextRN,
} from "@expo/ui";
import { withUniwind } from "uniwind";

type Props = {
  isPresented: boolean;
  onDismiss: () => void;
};

const Text = withUniwind(TextRN);
const Column = withUniwind(ColumnRN);

/**
 * Bottom sheet "Registrar gasto" controlado desde el FAB del tab bar.
 * Por ahora placeholder — el contenido real lo definiremos cuando
 * definamos el flujo de captura.
 */
export default function RegistrarSheet({ isPresented, onDismiss }: Props) {
  return (
    <Host>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        snapPoints={["half", "full"]}
      >
        <Column className="gap-3 p-6">
          <Text className="text-[11px] uppercase tracking-[0.18em] accent-[#9A968C]">
            Quipu · Registrar
          </Text>
          <Text className="text-[26px] accent-foreground">
            Registrar gasto
          </Text>
          <Text className="text-[14px] leading-5 accent-foreground opacity-60">
            Aquí vivirá el formulario de captura. Por ahora solo confirmamos
            que el bottom sheet nativo abre y cierra.
          </Text>
        </Column>
      </BottomSheet>
    </Host>
  );
}
