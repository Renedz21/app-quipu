"use client";

import { REGISTER_CTA } from "@/modules/dashboard/constants";
import { Button } from "@/shared/components/ui/button";

export function DashboardFab() {
  return (
    <Button
      type="button"
      size="icon-lg"
      disabled
      aria-label={REGISTER_CTA}
      title={`${REGISTER_CTA} · Próximamente`}
      className="size-[52px] rounded-full bg-ink text-canvas shadow-[0_10px_24px_-8px_color-mix(in_oklch,var(--qp-ink)_50%,transparent)] hover:bg-ink/90"
    >
      <span className="relative size-[18px]" aria-hidden>
        <span className="absolute top-2 left-0 h-0.5 w-[18px] rounded-sm bg-canvas" />
        <span className="absolute top-0 left-2 h-[18px] w-0.5 rounded-sm bg-canvas" />
      </span>
    </Button>
  );
}
