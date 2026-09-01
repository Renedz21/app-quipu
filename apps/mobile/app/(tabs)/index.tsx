import { ScrollView, Text, View } from "react-native";
import AppShell from "@/shared/components/app-shell";
import SignOutButton from "@/shared/components/auth/sign-out-button";

type Tone = "needs" | "wants" | "savings";

type Envelope = {
  label: string;
  spent: number;
  total: number;
  /** 0–100 */
  progress: number;
  tone: Tone;
  /** "de 1,750" o "apartado" para el sufijo del monto */
  suffix: string;
};

type Movement = {
  name: string;
  amount: number;
  tone: Tone;
};

// --- Datos ficticios -------------------------------------------------------
const cycleDay = 15;
const cycleTotal = 30;
const cycleLabel = "Ciclo agosto";

const envelopes: Envelope[] = [
  {
    label: "Necesidades",
    spent: 1138,
    total: 1750,
    progress: 65,
    tone: "needs",
    suffix: "de 1,750",
  },
  {
    label: "Gustos",
    spent: 819,
    total: 1050,
    progress: 78,
    tone: "wants",
    suffix: "de 1,050",
  },
  {
    label: "Ahorro",
    spent: 700,
    total: 700,
    progress: 100,
    tone: "savings",
    suffix: "apartado",
  },
];

const movements: Movement[] = [
  { name: "Menú del día", amount: 15, tone: "wants" },
  { name: "Metropolitano", amount: 5, tone: "needs" },
];

// Mapeo de tono → clases de color (literales para que Uniwind las detecte)
const TONE_DOT: Record<Tone, string> = {
  needs: "bg-needs",
  wants: "bg-wants",
  savings: "bg-savings",
};

const TONE_BAR: Record<Tone, string> = {
  needs: "bg-needs",
  wants: "bg-wants",
  savings: "bg-savings",
};

const TRACK = "bg-[#E8E6DF]";

// --- Helpers ---------------------------------------------------------------
function Money({
  value,
  size = "lg",
  className = "",
}: {
  value: number;
  size?: "lg" | "sm";
  className?: string;
}) {
  const [intPart, decPart] = value.toFixed(2).split(".");
  const isLg = size === "lg";
  return (
    <Text
      className={`font-newsreader ${isLg ? "text-[64px] leading-17" : "text-[16px] leading-5"} text-foreground ${className}`}
      selectable
    >
      S/{" "}
      <Text
        className={isLg ? "text-[64px] leading-17" : "text-[16px] leading-5"}
      >
        {intPart}
      </Text>
      <Text
        className={`${isLg ? "text-[28px] leading-8" : "text-[12px] leading-4"} text-foreground/45 font-newsreader`}
      >
        .{decPart}
      </Text>
    </Text>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
      {children}
    </Text>
  );
}

function Divider() {
  return <View className="h-px w-full bg-[#E8E6DF]" />;
}

// --- Pantalla --------------------------------------------------------------
export default function HomePage() {
  const remaining = envelopes.reduce(
    (acc, e) => acc + (e.tone === "savings" ? e.total : e.total - e.spent),
    0,
  );
  const cycleProgress = (cycleDay / cycleTotal) * 100;
  const daysLeft = cycleTotal - cycleDay;

  return (
    <AppShell>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="pb-12 gap-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera: CICLO AGOSTO · DÍA 15 / 30 + pill Estable */}
        <View className="flex-row items-center justify-between">
          <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase">
            {cycleLabel} · Día {cycleDay} / {cycleTotal}
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1.5 rounded-full bg-stable/15 px-2.5 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-stable" />
              <Text className="font-hanken-semibold text-[12px] text-stable">
                Estable
              </Text>
            </View>
            <SignOutButton />
          </View>
        </View>

        {/* PUEDES GASTAR HOY */}
        <View className="gap-3">
          <SectionLabel>Puedes gastar hoy</SectionLabel>

          {/* Cifra protagonista */}
          <View className="pt-1">
            <Money value={42.3} />
          </View>

          {/* Subtítulo */}
          <Text className="font-hanken text-[14px] text-foreground/55 -mt-1">
            Sin tocar tus compromisos ni tu ahorro.
          </Text>

          {/* Barra de progreso del ciclo */}
          <View className="pt-1 gap-1.5">
            <View
              className={`h-0.75 w-full rounded-full ${TRACK} overflow-hidden`}
            >
              <View
                className="h-full rounded-full bg-stable"
                style={{ width: `${cycleProgress}%` }}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text
                className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase"
                selectable
              >
                {daysLeft} días restantes
              </Text>
              <Text
                className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase"
                selectable
              >
                S/ {remaining.toLocaleString("es-PE")} en sobres
              </Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* TUS SOBRES */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <SectionLabel>Tus sobres</SectionLabel>
            <Text className="font-hanken-semibold text-[14px] text-stable">
              Ver todos
            </Text>
          </View>

          {envelopes.map((e) => (
            <View key={e.label} className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="font-hanken-semibold text-[15px] text-foreground">
                  {e.label}
                </Text>
                <View className="flex-row items-baseline gap-1">
                  <Text
                    className="font-newsreader text-[16px] text-foreground"
                    selectable
                  >
                    S/ {e.spent.toLocaleString("es-PE")}
                  </Text>
                  <Text className="font-hanken text-[13px] text-foreground/45">
                    {e.suffix}
                  </Text>
                </View>
              </View>
              <View
                className={`h-0.75 w-full rounded-full ${TRACK} overflow-hidden`}
              >
                <View
                  className={`h-full rounded-full ${TONE_BAR[e.tone]}`}
                  style={{ width: `${e.progress}%` }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Bloque coach */}
        <View className="flex-row gap-3 pt-1">
          <View className="w-0.5 rounded-full bg-stable" />
          <View className="flex-1 gap-3">
            <Text
              className="font-newsreader text-[20px] leading-6.5 text-foreground"
              selectable
            >
              Vas bien. Puedes gastar S/ 42 hoy sin tocar tu ahorro.
            </Text>
            <View className="flex-row items-center gap-5">
              <Text className="font-hanken-semibold text-[14px] text-stable">
                Ver detalle
              </Text>
              <Text className="font-hanken-semibold text-[14px] text-foreground/45">
                Entendido
              </Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* HOY — movimientos */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <SectionLabel>Hoy</SectionLabel>
            <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase">
              {movements.length} movimientos
            </Text>
          </View>
          {movements.map((m) => (
            <View key={m.name} className="flex-row items-center gap-3">
              <View
                className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[m.tone]}`}
              />
              <Text className="flex-1 font-hanken-semibold text-[15px] text-foreground">
                {m.name}
              </Text>
              <Text
                className="font-hanken-semibold text-[15px] text-foreground"
                selectable
              >
                – S/ {m.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppShell>
  );
}
