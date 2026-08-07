import Link from "next/link";
import { plusMonthlyPriceLabel, plusPaywallCta } from "@/shared/constants/plan";
import { cn } from "@/shared/lib/utils";

type Props = {
  /** Qué obtiene el usuario al pasar a Plus (una sola promesa). */
  title: string;
  /** Por qué le ahorra trabajo o estrés (copy canon: acción + beneficio). */
  body: string;
  className?: string;
  ctaLabel?: string;
  currencyCode?: string;
};

/**
 * Paywall pattern (Fase 0 — entitlements): la UI premium bloqueada muestra
 * el valor y ofrece la salida (Ajustes → plan). Uso: cuando el backend
 * responde `PLAN_REQUIRED` o al renderizar una sección exclusiva de Plus
 * para usuarios free. Nunca esconde la salida ni bloquea funciones gratis.
 */
export function PremiumLockCard({
  title,
  body,
  className,
  currencyCode,
  ctaLabel,
}: Props) {
  const priceLabel = plusMonthlyPriceLabel(currencyCode);
  const resolvedCta = ctaLabel ?? plusPaywallCta(currencyCode);
  return (
    <section
      className={cn(
        "rounded-[14px] border border-qp-border/60 bg-card p-5 shadow-[inset_3px_0_0_0_var(--qp)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-qp-deep">
          Quipu Plus
        </span>
        <span className="font-mono text-[10px] tracking-wide text-faint">
          {priceLabel}
        </span>
      </div>
      <h3 className="mt-2 font-serif text-[19px] font-medium text-ink">
        {title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-snug text-mute">{body}</p>
      <Link
        href="/settings#plan"
        className="mt-4 inline-flex rounded-[11px] bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-canvas transition-colors hover:bg-ink/90"
      >
        {resolvedCta}
      </Link>
    </section>
  );
}
