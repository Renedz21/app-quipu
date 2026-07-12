"use client";
import { useState } from "react";
import { authClient } from "@/auth/auth-client";

export function AddPasskeyButton({
  onSuccessAction,
  label = "Configurar passkey",
}: {
  onSuccessAction: () => void;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("pending");
    setMessage(null);
    const { error } = await authClient.passkey.addPasskey();
    if (error) {
      // El usuario puede cancelar el diálogo nativo (Face ID/Touch ID/etc.)
      // esto NO es un error de servidor, es un abandono legítimo.
      setStatus("error");
      setMessage("No se completó. Puedes intentarlo de nuevo cuando quieras.");
      return;
    }
    setStatus("idle");
    onSuccessAction();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "pending"}
      >
        {status === "pending" ? "Esperando confirmación..." : label}
      </button>
      {message && <p role="alert">{message}</p>}
    </div>
  );
}
