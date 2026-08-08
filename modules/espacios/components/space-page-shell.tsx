import type { ReactNode } from "react";
import { BackLink } from "@/shared/components/ui/back-link";
import { cn } from "@/shared/lib/utils";

type Props = {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function SpacePageShell({
  backHref,
  backLabel = "Espacios",
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8",
        className,
      )}
    >
      {backHref ? <BackLink href={backHref}>{backLabel}</BackLink> : null}
      {eyebrow ? (
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.12em] text-faint",
            backHref ? "mt-4" : "",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h1
          className={cn(
            "font-serif text-[26px] font-medium tracking-tight text-ink",
            eyebrow || backHref ? "mt-1" : "",
          )}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-mute">
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
