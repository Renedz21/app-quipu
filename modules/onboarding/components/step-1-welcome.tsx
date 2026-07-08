/**
 * Paso 1: Bienvenida del copiloto.
 *
 * UI (spec §3 paso 1):
 * - Card del copiloto (ícono compass + nombre + sub).
 * - Burbuja del copiloto (paper, sin borde): "Hola 👋 En unos minutos…".
 * - Burbuja del usuario (primary, texto claro): input con placeholder.
 * - Pill inferior: "Menos de 3 minutos" (success).
 * - CTA "Vamos →" deshabilitado si name vacío.
 *
 * Validación: name.trim().min(1).max(60). El botón se habilita solo si
 * hay un nombre válido. El step de "qué pasa si max 60" se valida inline
 * con un mensaje en rojo bajo el input.
 */

"use client";

import { ArrowRight, Clock, Compass } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useOnboarding } from "./onboarding-provider";
import { step1Schema } from "../schemas";

const MAX_LENGTH = 60;

interface Step1WelcomeProps {
  onAdvance: () => void;
}

export function Step1Welcome({ onAdvance }: Step1WelcomeProps) {
  const { state, update } = useOnboarding();
  const [touched, setTouched] = useState(false);

  // Validación inline. Si el usuario ya escribió y se pasa del max,
  // mostramos error. Si está vacío y tocó el input, mostramos error.
  const validation = step1Schema.safeParse({ name: state.name });
  const error = !validation.success ? validation.error.issues[0]?.message : undefined;
  const showError = touched && error;

  const handleAdvance = () => {
    setTouched(true);
    if (validation.success) {
      update({ name: validation.data.name });
      onAdvance();
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Card del copiloto */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Compass className="size-6" aria-hidden />
        </div>
        <div>
          <div className="font-heading text-base font-semibold">Tu copiloto</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            en línea, listo para ayudar
          </div>
        </div>
      </div>

      {/* Burbuja del copiloto (paper, sin borde, redondeada con esquina pequeña) */}
      <div
        className="rounded-2xl rounded-tl-sm bg-paper px-4 py-3 text-sm text-foreground"
        data-testid="copilot-bubble"
      >
        Hola 👋 En unos minutos dejamos tu dinero ordenado en tres sobres que
        trabajan por ti.
      </div>

      {/* Burbuja del usuario (primary) con el input */}
      <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3">
        <label htmlFor="welcome-name-input" className="sr-only">
          Tu nombre
        </label>
        <Input
          id="welcome-name-input"
          type="text"
          autoComplete="given-name"
          maxLength={MAX_LENGTH + 10 /* permitimos escribir de más para mostrar el error */}
          placeholder="Tu nombre"
          value={state.name}
          onChange={(e) => update({ name: e.target.value })}
          onBlur={() => setTouched(true)}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? "welcome-name-error" : undefined}
          className="h-9 w-full border-0 bg-transparent p-0 text-base text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {showError && (
          <p
            id="welcome-name-error"
            role="alert"
            className="mt-1 text-xs text-primary-foreground/90"
          >
            {error}
          </p>
        )}
      </div>

      {/* Pill inferior */}
      <div className="flex items-center gap-1.5 self-start rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
        <Clock className="size-3" aria-hidden />
        Menos de 3 minutos
      </div>

      {/* CTA */}
      <div className="mt-auto pt-4">
        <Button
          type="button"
          size="lg"
          onClick={handleAdvance}
          disabled={!validation.success}
          className="h-12 w-full text-sm font-semibold"
        >
          Vamos
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>

      {/* SR-only heading para a11y (foco al cambiar de step) */}
      <h1 className="sr-only" data-step-heading tabIndex={-1}>
        Bienvenida
      </h1>
    </div>
  );
}

// Constante exportada solo para tests, no se usa en runtime fuera de aquí.
export const STEP1_MAX_LENGTH = MAX_LENGTH;
