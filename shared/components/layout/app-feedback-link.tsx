"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SETTINGS_FEEDBACK_HINT,
  SETTINGS_FEEDBACK_LABEL,
} from "@/modules/settings/constants";
import { cn } from "@/shared/lib/utils";

type Variant = "sidebar" | "mobile";

type Props = {
  variant: Variant;
  className?: string;
};

function isFeedbackRoute(pathname: string) {
  return pathname.startsWith("/settings/feedback");
}

/** Enlace sutil a feedback — siempre visible, fuera de Ajustes. */
export function AppFeedbackLink({ variant, className }: Props) {
  const pathname = usePathname();
  const active = isFeedbackRoute(pathname);

  if (active) {
    return null;
  }

  if (variant === "mobile") {
    return (
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-30 flex justify-center md:hidden",
          "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]",
          className,
        )}
      >
        <Link
          href="/settings/feedback"
          className={cn(
            "pointer-events-auto rounded-full border border-line/70 bg-[color-mix(in_oklch,var(--qp-canvas)_92%,transparent)] px-3 py-1",
            "font-mono text-[9px] uppercase tracking-[0.12em] text-faint backdrop-blur-sm",
            "transition-colors hover:border-line hover:text-mute",
          )}
        >
          {SETTINGS_FEEDBACK_LABEL}
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/settings/feedback"
      className={cn(
        "group mb-3 block rounded-[10px] px-2.5 py-2 transition-colors hover:bg-qp-soft/50",
        className,
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-faint transition-colors group-hover:text-mute">
        Ayuda
      </span>
      <span className="mt-0.5 block text-[12.5px] text-mute-subtle transition-colors group-hover:text-ink-secondary">
        {SETTINGS_FEEDBACK_LABEL}
      </span>
      <span className="mt-0.5 block text-[11px] leading-snug text-faint transition-colors group-hover:text-mute">
        {SETTINGS_FEEDBACK_HINT}
      </span>
    </Link>
  );
}
