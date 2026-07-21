"use client";

import { useState } from "react";
import { LockKeyholeOpen } from "reicon-react";
import { authClient } from "@/auth/auth-client";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_PASSKEY_ADD,
  SETTINGS_PASSKEY_EMPTY,
  SETTINGS_PASSKEY_ERROR,
  SETTINGS_PASSKEY_PENDING,
  SETTINGS_SECURITY_LABEL,
  SETTINGS_SESSIONS_LABEL,
  SETTINGS_SESSIONS_REVOKE_ALL,
  SETTINGS_SESSIONS_STUB,
} from "../constants";
import {
  formatPasskeyUsageSummary,
  passkeyDeviceLabel,
} from "../lib/passkeyDisplay";
import type { SettingsOverview } from "../types";

type Props = {
  sessionsApiReady: SettingsOverview["sessionsApiReady"];
  className?: string;
};

function PasskeyRowIcon({ deviceType }: { deviceType: string }) {
  const isMobile = deviceType === "singleDevice";
  return (
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface-warm">
      {isMobile ? (
        <span className="h-4 w-2.5 rounded-sm border-[1.7px] border-mute" />
      ) : (
        <span className="h-[11px] w-4 rounded-sm border-[1.7px] border-mute" />
      )}
    </span>
  );
}

export function SettingsSecurityCard({ sessionsApiReady, className }: Props) {
  const passkeysQuery = authClient.useListPasskeys();
  const passkeys = passkeysQuery.data ?? [];
  const passkeysLoading = passkeysQuery.isPending;

  const [addPending, setAddPending] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  async function handleAddPasskey() {
    setAddPending(true);
    setAddMessage(null);
    const { error } = await authClient.passkey.addPasskey();
    setAddPending(false);
    if (error) {
      setAddMessage(SETTINGS_PASSKEY_ERROR);
      return;
    }
    void passkeysQuery.refetch?.();
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-card px-5 py-5 md:self-start md:px-6 md:py-[22px]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
          {SETTINGS_SECURITY_LABEL}
        </span>
        <LockKeyholeOpen
          size={15}
          weight="Filled"
          className="text-qp"
          aria-hidden
        />
      </div>

      <div className="mb-3.5 flex flex-col gap-2">
        {passkeysLoading ? (
          <div className="h-[58px] animate-pulse rounded-xl border border-line-soft bg-surface" />
        ) : passkeys.length === 0 ? (
          <p className="rounded-xl border border-line-soft bg-surface px-3.5 py-3 text-[13px] text-mute">
            {SETTINGS_PASSKEY_EMPTY}
          </p>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface px-3.5 py-3"
            >
              <PasskeyRowIcon deviceType={passkey.deviceType} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-ink">
                  {passkeyDeviceLabel(passkey.name, passkey.deviceType)}
                </div>
                <div className="text-[11.5px] text-faint">
                  {formatPasskeyUsageSummary(new Date(passkey.createdAt))}
                </div>
              </div>
              <span
                className="size-1.5 shrink-0 rounded-full bg-qp"
                aria-hidden
              />
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleAddPasskey()}
        disabled={addPending}
        className="mb-3.5 w-full rounded-[11px] border border-dashed border-qp-border bg-card py-3 text-[13.5px] font-semibold text-qp-deep transition-colors hover:bg-qp-soft disabled:opacity-60"
      >
        {addPending ? SETTINGS_PASSKEY_PENDING : SETTINGS_PASSKEY_ADD}
      </button>
      {addMessage ? (
        <p role="alert" className="mb-3 text-[12.5px] text-danger-ink">
          {addMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
        <span className="text-[13px] text-ink-secondary">
          {SETTINGS_SESSIONS_LABEL}
        </span>
        {sessionsApiReady ? (
          <button
            type="button"
            disabled
            className="text-[12.5px] font-medium text-danger-ink opacity-50"
          >
            {SETTINGS_SESSIONS_REVOKE_ALL}
          </button>
        ) : (
          <span className="max-w-[11rem] text-right text-[11.5px] leading-snug text-faint">
            {SETTINGS_SESSIONS_STUB}
          </span>
        )}
      </div>
    </section>
  );
}
