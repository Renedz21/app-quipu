import Link from "next/link";
import { redirect } from "next/navigation";
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import {
  SETTINGS_BACK_LINK,
  SETTINGS_CYCLE_STUB_BODY,
  SETTINGS_CYCLE_STUB_TITLE,
} from "@/modules/settings/constants";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export default async function SettingsCyclePage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      <Link href="/settings" className="text-[12.5px] text-mute hover:text-ink">
        {SETTINGS_BACK_LINK}
      </Link>
      <h1 className="mt-3 font-serif text-[23px] font-medium text-ink">
        {SETTINGS_CYCLE_STUB_TITLE}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-mute-subtle">
        {SETTINGS_CYCLE_STUB_BODY}
      </p>
      <Link
        href="/settings"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 border-line",
        )}
      >
        Volver a ajustes
      </Link>
    </div>
  );
}
