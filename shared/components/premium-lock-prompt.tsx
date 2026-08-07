"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { plusPaywallCta } from "@/shared/constants/plan";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  currencyCode?: string;
  ctaLabel?: string;
  /** Destino del CTA (por defecto Ajustes → plan). */
  href?: string;
};

/**
 * Paywall de Plus: modal en desktop, bottom sheet en móvil.
 * Misma promesa que PremiumLockCard, sin ocupar el flujo en línea.
 */
export function PremiumLockPrompt({
  open,
  onOpenChange,
  title,
  body,
  currencyCode,
  ctaLabel,
  href = "/settings/account#plan",
}: Props) {
  const isMobile = useIsMobile();
  const resolvedCta = ctaLabel ?? plusPaywallCta(currencyCode);

  const bodyContent = (
    <div className="relative">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-qp-deep">
          Quipu Plus
        </span>
        {isMobile ? (
          <SheetTitle className="mt-3 font-serif text-[22px] font-medium leading-snug text-ink">
            {title}
          </SheetTitle>
        ) : (
          <DialogTitle className="mt-3 font-serif text-[22px] font-medium leading-snug text-ink">
            {title}
          </DialogTitle>
        )}
        {isMobile ? (
          <SheetDescription className="mt-2 text-[13.5px] leading-relaxed text-mute">
            {body}
          </SheetDescription>
        ) : (
          <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-mute">
            {body}
          </DialogDescription>
        )}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link
            href={href}
            onClick={() => onOpenChange(false)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-[11px] bg-ink px-4 py-2.5",
              "text-[13.5px] font-semibold text-canvas transition-colors hover:bg-ink/90",
            )}
          >
            {resolvedCta}
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-[11px] px-3 text-[13px] font-medium text-mute transition-colors hover:text-ink"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-[22px] border-line bg-card px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-[0_-12px_40px_rgba(35,32,28,0.08)]"
        >
          <div
            aria-hidden
            className="mx-auto mb-5 h-1 w-10 shrink-0 rounded-full bg-line"
          />
          {bodyContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-[420px] gap-0 overflow-hidden rounded-[20px] border border-line bg-card p-6 shadow-[0_24px_60px_rgba(35,32,28,0.12)] ring-0 sm:max-w-[420px]"
      >
        {bodyContent}
      </DialogContent>
    </Dialog>
  );
}
