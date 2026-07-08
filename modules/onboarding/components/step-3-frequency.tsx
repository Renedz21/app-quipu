/**
 * Paso 3: Frecuencia de ingreso.
 *
 * UI (spec §3 paso 3 + frame 3):
 * - Grid 2x2 con 4 cadencias: Mensual / Quincenal / Semanal / Variable.
 * - Quincenal es el default seleccionado al primer mount.
 * - Si la cadencia es quincenal, debajo aparece un campo con 2 inputs
 *   de día (Día 1 y Día 15). Defaults: 1 y 15.
 * - Si la cadencia es mensual, 1 input numérico "Día del mes".
 * - Si es semanal o variable, copy explicativo en su lugar.
 * - CTA "Continuar" deshabilitado si la validación Zod falla.
 *
 * Validación: usa `step3Schema` (ya testeado en `schemas.test.ts`).
 * Reglas:
 * - biweekly: paydays.length === 2, cada uno 1-31.
 * - monthly / weekly: paydays.length >= 1.
 * - variable: paydays puede ser [].
 */

"use client";

import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Sparkles,
} from "lucide-react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useOnboarding } from "./onboarding-provider";
import { IncomeModelCard } from "./income-model-card";
import { PAY_FREQUENCY_LABELS } from "../constants";
import { step3Schema } from "../schemas";
import type { PayFrequency } from "../types";

const ICONS: Record<PayFrequency, typeof CalendarDays> = {
  monthly: CalendarDays,
  biweekly: CalendarRange,
  weekly: CalendarCheck,
  variable: Sparkles,
};

const FREQUENCIES: PayFrequency[] = ["monthly", "biweekly", "weekly", "variable"];

interface Step3FrequencyProps {
  onAdvance: () => void;
}

export function Step3Frequency({ onAdvance }: Step3FrequencyProps) {
  const { state, update } = useOnboarding();
  const [touched, setTouched] = useState(false);

  const handleSelect = (value: PayFrequency) => {
    const defaults: Record<PayFrequency, number[]> = {
      monthly: state.paydays.length === 1 ? state.paydays : [1],
      biweekly: state.paydays.length === 2 ? state.paydays : [1, 15],
      weekly: state.paydays.length === 1 ? state.paydays : [15],
      variable: [],
    };
    update({ payFrequency: value, paydays: defaults[value] });
  };

  const handlePayday1 = (n: number) => {
    if (state.payFrequency === "biweekly") {
      update({ paydays: [n, state.paydays[1] ?? 15] });
    } else {
      update({ paydays: [n] });
    }
  };

  const handlePayday2 = (n: number) => {
    if (state.payFrequency === "biweekly") {
      update({ paydays: [state.paydays[0] ?? 1, n] });
    }
  };

  const validation = step3Schema.safeParse({
    payFrequency: state.payFrequency,
    paydays: state.paydays,
  });
  const error = !validation.success ? validation.error.issues[0]?.message : undefined;
  const showError = touched && error;
  const canContinue = validation.success;

  const handleAdvance = () => {
    setTouched(true);
    if (validation.success) onAdvance();
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        ¿Cada cuánto cobras?
      </h1>
      <p className="-mt-4 text-sm text-muted-foreground">
        Con solo definir cuándo empiezas y termina tu ciclo.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {FREQUENCIES.map((freq) => {
          const labels = PAY_FREQUENCY_LABELS[freq];
          const Icon = ICONS[freq];
          return (
            <IncomeModelCard
              key={freq}
              title={labels.title}
              subtitle={labels.subtitle}
              icon={Icon}
              selected={state.payFrequency === freq}
              onSelect={() => handleSelect(freq)}
              variant="compact"
            />
          );
        })}
      </div>

      {state.payFrequency === "biweekly" && state.paydays.length === 2 && (
        <BiweeklyPaydaysFields
          day1={state.paydays[0] ?? 1}
          day2={state.paydays[1] ?? 15}
          onChange1={handlePayday1}
          onChange2={handlePayday2}
        />
      )}

      {state.payFrequency === "monthly" && state.paydays.length >= 1 && (
        <MonthlyPaydayField
          day={state.paydays[0] ?? 1}
          onChange={handlePayday1}
        />
      )}

      {state.payFrequency === "weekly" && (
        <div className="rounded-xl bg-paper p-3 text-sm text-muted-foreground">
          Tu ciclo semanal empieza cuando registres tu primer ingreso.
        </div>
      )}

      {state.payFrequency === "variable" && (
        <div className="rounded-xl bg-paper p-3 text-sm text-muted-foreground">
          Cuando registres un ingreso, ese día será el inicio del nuevo ciclo.
        </div>
      )}

      {showError && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-auto pt-4">
        <Button
          type="button"
          size="lg"
          onClick={handleAdvance}
          disabled={!canContinue}
          className="h-12 w-full text-sm font-semibold"
        >
          Continuar
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function BiweeklyPaydaysFields({
  day1,
  day2,
  onChange1,
  onChange2,
}: {
  day1: number;
  day2: number;
  onChange1: (n: number) => void;
  onChange2: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-paper p-3">
      <p className="text-xs font-semibold text-foreground">
        Vista del ciclo quincenal
      </p>
      <div className="flex items-end gap-2">
        <DayField
          label="Día 1"
          caption="Entra tu pago"
          value={day1}
          onChange={onChange1}
        />
        <DayField
          label="Día 15"
          caption="Siguiente pago"
          value={day2}
          onChange={onChange2}
        />
      </div>
    </div>
  );
}

function MonthlyPaydayField({
  day,
  onChange,
}: {
  day: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-paper p-3">
      <Label htmlFor="monthly-day" className="text-xs font-semibold">
        Día del mes
      </Label>
      <Input
        id="monthly-day"
        type="number"
        min={1}
        max={31}
        value={day}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n) && n >= 1 && n <= 31) onChange(n);
        }}
        className="h-10"
      />
    </div>
  );
}

function DayField({
  label,
  caption,
  value,
  onChange,
}: {
  label: string;
  caption: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        min={1}
        max={31}
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n) && n >= 1 && n <= 31) onChange(n);
        }}
        className="h-10"
        aria-label={`${label} (${caption})`}
      />
      <span className="text-[10px] text-muted-foreground">{caption}</span>
    </div>
  );
}
