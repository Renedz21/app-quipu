"use client";

/**
 * Wrapper genérico sobre el Field de shadcn/ui.
 *
 * Provee la API consistente de:
 *   - Label + control + mensaje de error + descripción opcional.
 *   - Asociación correcta de `aria-describedby` y `aria-invalid`.
 *
 * Diseñado para integrarse con TanStack Form o React Hook Form.
 * No es un `<Controller>` — solo presentación. El form pasa el control.
 */

import { useId } from "react";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

export interface FormFieldProps {
  label: string;
  /** El control a renderizar (input, textarea, select, custom). */
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
  }) => React.ReactNode;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function FormField({
  label,
  children,
  error,
  description,
  required = false,
  className,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const describedBy =
    [error ? errorId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
