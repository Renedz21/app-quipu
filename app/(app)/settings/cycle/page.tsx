import Link from "next/link";
import { requireOnboardedProfile } from "@/auth/auth-server";
import {
  SETTINGS_BACK_LINK,
  SETTINGS_CYCLE_STUB_BODY,
  SETTINGS_CYCLE_STUB_TITLE,
} from "@/modules/settings/constants";
import { buttonVariants } from "@/shared/components/ui/button";
import { BackLink } from "@/shared/components/ui/back-link";
import { cn } from "@/shared/lib/utils";

export default async function SettingsCyclePage() {
  await requireOnboardedProfile();

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      <BackLink href="/settings" className="text-[12.5px] text-mute hover:text-ink">
        {SETTINGS_BACK_LINK}
      </BackLink>
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
