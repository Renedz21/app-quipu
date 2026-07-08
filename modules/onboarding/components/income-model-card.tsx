/**
 * Card seleccionable para los income models (pasos 2 y 3).
 *
 * Es un `<label>` envuelto: el input radio está visualmente oculto
 * pero es accesible. Click en cualquier parte de la card → toggle
 * del radio. La card muestra el estado `selected` con borde primario
 * y un check a la derecha.
 *
 * Server-friendly: no tiene estado propio. La selección la maneja
 * el padre (RadioGroup de Base UI o similar). El padre le pasa
 * `selected` y `onSelect`.
 *
 * Reusado en:
 * - step-2-income-model: 3 cards (Fijos / Variables / Mixtos).
 * - step-3-frequency: 4 cards (Mensual / Quincenal / Semanal / Variable).
 * - step-7-summary: 2 cards (Planilla / Independiente, mini variant).
 */

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface IncomeModelCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  variant?: "default" | "compact";
  /** aria-label cuando el title no es suficiente (ej: si la card es muy mini). */
  ariaLabel?: string;
}

export function IncomeModelCard({
  title,
  subtitle,
  icon: Icon,
  selected,
  onSelect,
  variant = "default",
  ariaLabel,
}: IncomeModelCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-card p-4 transition-colors",
        "hover:border-primary/50",
        selected
          ? "border-primary ring-2 ring-primary/10"
          : "border-border",
        variant === "compact" && "p-3",
      )}
      aria-label={ariaLabel ?? `${title} — ${subtitle}`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
        // No `name` acá: el padre (RadioGroup) se encarga del agrupamiento.
      />
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary",
          variant === "compact" ? "size-9" : "size-11",
        )}
        aria-hidden
      >
        <Icon className={variant === "compact" ? "size-4" : "size-5"} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      {selected && (
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <Check className="size-3.5" />
        </div>
      )}
    </label>
  );
}
