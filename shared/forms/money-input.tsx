"use client";

/**
 * Input de dinero (soles peruanos).
 *
 * - Muestra un prefijo con el símbolo de moneda.
 * - Acepta entrada libre: "1234.56", "1,234.56", "S/ 1234.56".
 * - Emite el valor parseado a céntimos enteros vía TanStack Form.
 *
 * Uso con TanStack Form:
 * ```tsx
 * <form.Field name="amount">
 *   {(field) => (
 *     <MoneyInput
 *       value={field.state.value}
 *       onChange={(cents) => field.handleChange(cents)}
 *       onBlur={field.handleBlur}
 *     />
 *   )}
 * </form.Field>
 * ```
 */

import { useState } from "react";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { Input } from "@/shared/components/ui/input";
import { formatCents, parseToCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";

export interface MoneyInputProps {
  /** Valor en céntimos enteros. */
  value: number;
  /** Callback con céntimos parseados del input. */
  onChange: (cents: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** Locale para el formateo en el placeholder/ejemplo. */
  locale?: string;
  id?: string;
  "aria-describedby"?: string;
}

export function MoneyInput({
  value,
  onChange,
  onBlur,
  placeholder = "0.00",
  disabled = false,
  invalid = false,
  className,
  locale = "es-PE",
  id,
  "aria-describedby": ariaDescribedBy,
}: MoneyInputProps) {
  // Estado interno: lo que el usuario ve (string libre).
  // Se sincroniza con `value` cuando cambia desde fuera.
  const [displayValue, setDisplayValue] = useState(() =>
    value > 0 ? formatCents(value, { locale, showSymbol: false }) : "",
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplayValue(raw);

    if (raw.trim() === "") {
      onChange(0);
      return;
    }

    const cents = parseToCents(raw);
    if (cents !== null) {
      onChange(cents);
    }
    // Si no parsea, no emitimos. El form verá el último valor válido.
  }

  function handleBlur() {
    // Al perder foco, re-formateamos el valor mostrado para consistencia visual.
    if (value > 0) {
      setDisplayValue(formatCents(value, { locale, showSymbol: false }));
    }
    onBlur?.();
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 text-sm text-muted-foreground"
      >
        {DEFAULT_CURRENCY.symbol}
      </span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        className={cn("pl-9", invalid && "border-destructive")}
      />
    </div>
  );
}
