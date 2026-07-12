"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/auth/auth-client";
import { AddPasskeyButton } from "./add-passkey-button";

export function PasskeyReminderBanner() {
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data } = await authClient.passkey.listUserPasskeys();
      if (!cancelled) setHasPasskey(Boolean(data && data.length > 0));
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasPasskey !== false || dismissed) return null;

  return (
    <div role="status">
      <p>Aún no tienes un passkey configurado.</p>
      <AddPasskeyButton
        label="Configurar ahora"
        onSuccessAction={() => setHasPasskey(true)}
      />
      <button type="button" onClick={() => setDismissed(true)}>
        Más tarde
      </button>
    </div>
  );
}
