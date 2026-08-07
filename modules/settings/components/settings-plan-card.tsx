"use client";

import { CheckoutLink } from "@convex-dev/polar/react";
import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { buttonVariants } from "@/shared/components/ui/button-variants";
import {
  type BillingInterval,
  getPlusAnnualSavingsPercent,
  getPlusPriceQuote,
  PLUS_BILLING_INTERVAL_LABELS,
  PLUS_CHECKOUT_CTA,
} from "@/shared/constants/plan";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_PLAN_ACTIVE_BADGE,
  SETTINGS_PLAN_BILLING_UNAVAILABLE,
  SETTINGS_PLAN_FREE_NAME,
  SETTINGS_PLAN_LABEL,
  SETTINGS_PLAN_MANAGE,
  SETTINGS_PLAN_PLUS_NAME,
  SETTINGS_PLAN_PREPARING,
  SETTINGS_PLAN_TAX_INCLUDED,
  SETTINGS_PLAN_VALUE_BULLETS,
  SETTINGS_PLAN_VALUE_HEADING,
} from "../constants";
import type { SettingsSubscriptionOverview } from "../types";

type Props = {
  subscription: SettingsSubscriptionOverview;
  className?: string;
};

/** Polar lazy checkout uses `window.location.href` as successUrl at click time. */
function primeCheckoutSuccessReturnUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("checkout", "success");
  url.hash = "plan";
  window.history.replaceState({}, "", url.toString());
}

export function SettingsPlanCard({ subscription, className }: Props) {
  const isPremium = subscription.plan === "premium";
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const quote = getPlusPriceQuote(subscription.currencyCode, billingInterval);
  const savingsPct = getPlusAnnualSavingsPercent(subscription.currencyCode);

  const productId =
    billingInterval === "monthly"
      ? subscription.plusProductIds.monthly
      : subscription.plusProductIds.yearly;
  const canCheckout = subscription.checkoutAvailable && Boolean(productId);

  const generatePortal = useAction(api.polar.generateCustomerPortalUrl);
  const [portalPending, setPortalPending] = useState(false);

  const upgradeButtonClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "w-full justify-center border-qp-border text-qp-deep no-underline hover:bg-qp-soft sm:w-auto",
  );

  const manageButtonClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "w-full justify-center border-line text-ink-secondary no-underline sm:w-auto",
  );

  const onManage = () => {
    void (async () => {
      setPortalPending(true);
      try {
        const { url } = await generatePortal({
          returnUrl: `${window.location.origin}/settings#plan`,
        });
        window.open(url, "_blank", "noopener,noreferrer");
      } finally {
        setPortalPending(false);
      }
    })();
  };

  return (
    <section
      id="plan"
      className={cn(
        "scroll-mt-6 rounded-2xl border border-line bg-card px-5 py-5 md:px-6 md:py-6 lg:px-7",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <span className="min-w-0 font-mono text-[10px] uppercase tracking-widest text-faint">
          {SETTINGS_PLAN_LABEL}
        </span>
        {isPremium ? (
          <span className="w-fit shrink-0 rounded-full bg-qp-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-qp-deep">
            {SETTINGS_PLAN_ACTIVE_BADGE}
          </span>
        ) : (
          <fieldset className="m-0 flex w-full items-center gap-1 rounded-full border border-line bg-canvas p-0.5 sm:w-auto sm:inline-flex">
            <legend className="sr-only">Intervalo de facturación</legend>
            {(["monthly", "yearly"] as const).map((id) => {
              const selected = billingInterval === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setBillingInterval(id)}
                  className={cn(
                    "min-h-9 flex-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors sm:min-h-0 sm:flex-none sm:px-2.5 sm:py-1 sm:text-[11px]",
                    selected
                      ? "bg-ink text-canvas"
                      : "text-mute hover:text-ink",
                  )}
                >
                  {PLUS_BILLING_INTERVAL_LABELS[id]}
                  {id === "yearly" ? (
                    <span
                      className={cn(
                        "ml-1 text-[10px]",
                        selected ? "text-canvas/80" : "text-qp-deep",
                      )}
                    >
                      Ahorra {savingsPct}%
                    </span>
                  ) : null}
                </button>
              );
            })}
          </fieldset>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-1">
        <span className="min-w-0 wrap-break-word font-serif text-[22px] leading-tight text-ink md:text-2xl">
          {isPremium ? SETTINGS_PLAN_PLUS_NAME : SETTINGS_PLAN_FREE_NAME}
        </span>
        {!isPremium ? (
          <span className="shrink-0 font-serif text-[28px] leading-none tracking-tight text-ink md:text-[30px]">
            {quote.priceInline}
          </span>
        ) : null}
        {isPremium && subscription.priceDisplay ? (
          <span className="shrink-0 text-sm text-mute">
            {subscription.priceDisplay}
          </span>
        ) : null}
      </div>

      {!isPremium ? (
        <p className="mt-1.5 text-[12.5px] text-mute-subtle md:text-[13px]">
          {quote.priceLabel} · {quote.billingCadence}
        </p>
      ) : null}

      <p className="mt-1 text-[11.5px] leading-snug text-faint">
        {SETTINGS_PLAN_TAX_INCLUDED}
      </p>

      {subscription.renewalSummary ? (
        <p className="mt-1.5 max-w-prose text-[12.5px] leading-snug text-mute-subtle md:text-[13px]">
          {subscription.renewalSummary}
        </p>
      ) : null}

      <div className="mt-5 md:mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
          {SETTINGS_PLAN_VALUE_HEADING}
        </p>
        <ul className="mt-2.5 grid gap-2 sm:grid-cols-1 lg:mt-2 lg:gap-1.5">
          {SETTINGS_PLAN_VALUE_BULLETS.map((line) => (
            <li
              key={line}
              className="flex gap-2.5 text-[13px] leading-snug text-ink-secondary md:text-[13.5px]"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-qp"
              />
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4 md:mt-4">
        {isPremium ? (
          <button
            type="button"
            disabled={portalPending}
            onClick={onManage}
            className={manageButtonClass}
            aria-busy={portalPending}
          >
            {portalPending ? SETTINGS_PLAN_PREPARING : SETTINGS_PLAN_MANAGE}
          </button>
        ) : canCheckout && productId ? (
          <span
            className="inline-flex w-full sm:w-auto"
            onPointerDownCapture={primeCheckoutSuccessReturnUrl}
          >
            <CheckoutLink
              polarApi={{
                generateCheckoutLink: api.polar.generateCheckoutLink,
              }}
              productIds={[productId]}
              lazy
              embed={false}
              locale="es"
              className={upgradeButtonClass}
            >
              {PLUS_CHECKOUT_CTA} · {quote.priceLabel}
            </CheckoutLink>
          </span>
        ) : subscription.checkoutAvailable ? (
          <button type="button" disabled className={upgradeButtonClass}>
            {SETTINGS_PLAN_PREPARING}
          </button>
        ) : (
          <p className="text-[12.5px] text-mute-subtle">
            {SETTINGS_PLAN_BILLING_UNAVAILABLE}
          </p>
        )}
      </div>
    </section>
  );
}
