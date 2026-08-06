"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/auth-client";
import { AnalyticsEvents, track } from "@/core/analytics";
import { cn } from "@/shared/lib/utils";
import { SETTINGS_SIGN_OUT } from "../constants";

type Props = {
  className?: string;
};

export function SettingsSignOutItem({ className }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 w-full items-center py-2.5 text-left text-[13.5px] text-ink transition-colors hover:text-qp-deep",
        className,
      )}
      onClick={() => {
        void (async () => {
          track(AnalyticsEvents.USER_LOGGED_OUT, {});
          await authClient.signOut();
          router.push("/sign-in");
          router.refresh();
        })();
      }}
    >
      {SETTINGS_SIGN_OUT}
    </button>
  );
}
