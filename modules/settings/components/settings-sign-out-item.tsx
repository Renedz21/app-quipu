"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/auth-client";
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
        "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-left text-[13.5px] font-medium text-danger-ink transition-colors hover:bg-danger-bg",
        className,
      )}
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      {SETTINGS_SIGN_OUT}
    </button>
  );
}
