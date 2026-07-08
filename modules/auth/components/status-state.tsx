"use client";

import { useSearchParams } from "next/navigation";

/**
 * Hook que lee el query param `status` y devuelve la variante del card.
 * Usado por las páginas sign-up para mostrar "¡Listo, Lucía!" después del éxito.
 *
 * Variantes soportadas:
 * - ?status=success → "success"
 * - ?error=CODE → mapea desde el code de error (delegado al componente que renderiza)
 *
 * El componente que renderiza hace el switch sobre el valor.
 */
export function useStatusState(): {
  success: boolean;
  errorCode: string | null;
} {
  const searchParams = useSearchParams();
  return {
    success: searchParams.get("status") === "success",
    errorCode: searchParams.get("error"),
  };
}
