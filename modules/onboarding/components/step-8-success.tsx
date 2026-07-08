/**
 * Paso 8: ¡Quipu activado!
 *
 * Pantalla de éxito al terminar el onboarding. Muestra un resumen
 * visual y redirige al dashboard.
 *
 * El usuario puede llegar acá solo después de que la mutación
 * `createProfile` haya sido exitosa. Si refresca la página, el
 * server component de `/configurar/page.tsx` detecta que ya tiene
 * profile y redirige a `/dashboard` (defense in depth).
 */

"use client";

import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { useOnboarding } from "./onboarding-provider";

export function Step8Success() {
  const router = useRouter();
  const { state } = useOnboarding();

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-8">
      {/* Ícono de celebración */}
      <div className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
        <Compass className="size-10" aria-hidden />
      </div>

      <h1
        className="text-center font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        ¡Tu Quipu está listo!
      </h1>

      <p className="-mt-2 text-center text-sm text-muted-foreground">
        Hola,{" "}
        <span className="font-semibold text-foreground">{state.name}</span>. Ya
        tenemos tu dinero ordenado en tres sobres.{" "}
        <Sparkles
          className="inline size-3.5 align-text-top text-warning"
          aria-hidden
        />
      </p>

      {/* Mini resumen */}
      <div className="flex w-full flex-col gap-2 rounded-xl bg-card px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Ingresos</span>
          <span className="font-medium">
            {state.incomeModel === "fixed"
              ? "Fijos"
              : state.incomeModel === "variable"
                ? "Variables"
                : "Mixtos"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Reparto</span>
          <span className="font-medium">
            {state.allocationNeeds}/{state.allocationWants}/
            {state.allocationSavings}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Compromisos</span>
          <span className="font-medium">
            {state.commitments.length > 0
              ? `${state.commitments.length} registrado${state.commitments.length > 1 ? "s" : ""}`
              : "Ninguno"}
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Ahora puedes registrar tu primer ingreso real y ver cómo se distribuye
        en tus sobres.
      </p>

      {/* CTA */}
      <div className="mt-auto w-full pt-4">
        <Button
          type="button"
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="h-12 w-full text-sm font-semibold"
        >
          Ir a mi dashboard
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
