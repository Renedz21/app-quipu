"use client";

/**
 * Input de porcentaje (entero 0-100).
 *
 * Usado para las allocations 50/30/20 y para modificar la distribución
 * del presupuesto en `modules/profile`.
 *
 * Uso con TanStack Form:
 * ```tsx
 * <form.Field name="needs">
 *   {(field) => (
 *     <PercentInput
 *       value={field.state.value}
 *       onChange={(n) => field.handleChange(n)}
 *       onBlur={field.handleBlur}
 *     />
 *   )}
 * </form.Field>
 * ```
 */

import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export interface PercentInputProps {
  /** Valor entero 0-100. */
  value: number;
  onChange: (percent: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  min?: number;
  max?: number;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}

export function PercentInput({
  value,
  onChange,
  onBlur,
  placeholder = "0",
  disabled = false,
  invalid = false,
  min = 0,
  max = 100,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
}: PercentInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    Number.isInteger(value) && value > 0 ? String(value) : "",
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, ""); // solo dígitos
    setDisplayValue(raw);

    if (raw === "") {
      onChange(0);
      return;
    }

    const num = Number.parseInt(raw, 10);
    if (Number.isFinite(num) && num >= min && num <= max) {
      onChange(num);
    }
  }

  function handleBlur() {
    if (value >= min && value <= max) {
      setDisplayValue(value > 0 ? String(value) : "");
    }
    onBlur?.();
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        className={cn("pr-9", invalid && "border-destructive")}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 text-sm text-muted-foreground"
      >
        %
      </span>
    </div>
  );
}
