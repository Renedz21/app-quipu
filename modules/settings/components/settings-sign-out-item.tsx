"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/auth-client";
import { AnalyticsEvents, track } from "@/core/analytics";
import { SETTINGS_SIGN_OUT } from "../constants";
import { SettingsAccountActionButton } from "./settings-account-action-button";

type Props = {
  className?: string;
};

export function SettingsSignOutItem({ className }: Props) {
  const router = useRouter();

  return (
    <SettingsAccountActionButton
      tone="neutral"
      className={className}
      onClick={async () => {
        track(AnalyticsEvents.USER_LOGGED_OUT, {});
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      {SETTINGS_SIGN_OUT}
    </SettingsAccountActionButton>
  );
}
