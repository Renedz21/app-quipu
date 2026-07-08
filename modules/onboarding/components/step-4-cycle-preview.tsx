/**
 * Paso 4: Ciclo financiero (vista derivada, read-only).
 *
 * Muestra cómo se comporta el ciclo en base a las decisiones del paso 3:
 * - Timeline horizontal con 3 nodos: Día 1 (entra pago) / mitad / cierre.
 * - Banner con frecuencia y duración del ciclo, fecha de inicio (hoy, Lima).
 *
 * No muta state. Solo lee payFrequency y paydays.
 */

"use client";

import { ArrowRight, CalendarCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useOnboarding } from "./onboarding-provider";
import type { PayFrequency } from "../types";
import { formatLimaDate } from "@/shared/lib/date";

// Mirror de CYCLE_DAYS del backend. La alternativa "correcta" sería
// exportar el tipo desde un archivo compartido, pero por ahora duplicamos
// la constante (4 valores, simple de mantener). Si crece, lo movemos.
const CYCLE_DAYS_CLIENT: Record<PayFrequency, number> = {
  monthly: 30,
  biweekly: 15,
  weekly: 7,
  variable: 15,
};

interface Step4CyclePreviewProps {
  onAdvance: () => void;
}

const FREQ_LABEL: Record<PayFrequency, string> = {
  monthly: "mensual",
  biweekly: "quincenal",
  weekly: "semanal",
  variable: "variable",
};

export function Step4CyclePreview({ onAdvance }: Step4CyclePreviewProps) {
  const { state } = useOnboarding();
  const freq = state.payFrequency ?? "biweekly";
  const totalDays = CYCLE_DAYS_CLIENT[freq];
  const midDay = Math.floor(totalDays / 2);
  const today = formatLimaDate(Date.now());

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        Así se comporta tu ciclo
      </h1>
      <p className="-mt-4 text-sm text-muted-foreground">
        Reparte tu ingreso el día 1 y te acompañamos hasta el cierre.
      </p>

      {/* Timeline */}
      <div className="rounded-xl bg-paper p-6">
        <div className="relative flex items-center justify-between">
          {/* Track */}
          <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
          {/* Nodos */}
          <TimelineNode label="Día 1" caption="Entra tu pago" variant="primary" />
          <TimelineNode
            label={`Día ${midDay || 1}`}
            caption="Vas a mitad"
            variant="soft"
          />
          <TimelineNode
            label={`Día ${totalDays}`}
            caption="Siguiente pago"
            variant="primary"
          />
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
          <span>Día 1 · pago</span>
          <span>Día {totalDays} · cierre</span>
        </div>
      </div>

      {/* Banner */}
      <div className="flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-sm text-foreground">
        <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          Tu ciclo{" "}
          <strong className="font-semibold">{FREQ_LABEL[freq]}</strong> de {totalDays} días
          empieza hoy, {today}.
        </p>
      </div>

      <div className="mt-auto pt-4">
        <Button
          type="button"
          size="lg"
          onClick={onAdvance}
          className="h-12 w-full text-sm font-semibold"
        >
          Continuar
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function TimelineNode({
  label,
  caption,
  variant,
}: {
  label: string;
  caption: string;
  variant: "primary" | "soft";
}) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-1">
      <div
        className={
          variant === "primary"
            ? "flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            : "flex size-6 items-center justify-center rounded-full bg-primary-soft ring-2 ring-primary"
        }
      >
        <span className="sr-only">{caption}</span>
      </div>
      <div className="text-[10px] font-medium text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{caption}</div>
    </div>
  );
}
