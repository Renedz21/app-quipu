import Link from "next/link";
import { getInitial } from "@/modules/dashboard/lib/dashboard-math";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_EDIT_PROFILE,
  SETTINGS_EDIT_PROFILE_HINT,
  SETTINGS_PROFILE_LABEL,
  SETTINGS_PROGRESS_LINK,
} from "../constants";
import type { SettingsProfileOverview } from "../types";

type Props = {
  profile: SettingsProfileOverview;
  className?: string;
};

export function SettingsProfileCard({ profile, className }: Props) {
  const subtitleParts = [
    profile.email,
    profile.country,
  ].filter(Boolean);

  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-card px-5 py-5 md:px-6 md:py-[22px]",
        className,
      )}
    >
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
        {SETTINGS_PROFILE_LABEL}
      </div>
      <div className="mb-4 flex items-center gap-4">
        <span
          className="flex size-[54px] shrink-0 items-center justify-center rounded-full bg-qp-tint font-serif text-2xl text-qp-deep"
          aria-hidden
        >
          {getInitial(profile.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold text-ink">
            {profile.name}
          </div>
          {subtitleParts.length > 0 ? (
            <div className="truncate text-[13px] text-mute-subtle">
              {subtitleParts.join(" · ")}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          disabled
          title={SETTINGS_EDIT_PROFILE_HINT}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden shrink-0 border-line text-ink-secondary md:inline-flex",
          )}
        >
          {SETTINGS_EDIT_PROFILE}
        </button>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {profile.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line-soft bg-surface-warm px-3.5 py-1.5 text-[12.5px] text-ink-secondary"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href="/progress"
        className="mt-4 inline-flex text-[13px] font-medium text-qp-deep underline-offset-4 hover:underline"
      >
        {SETTINGS_PROGRESS_LINK}
      </Link>
    </section>
  );
}
