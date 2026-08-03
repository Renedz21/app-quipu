"use client";

import { CheckoutLink } from "@convex-dev/polar/react";
import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { buttonVariants } from "@/shared/components/ui/button-variants";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_PLAN_ACTIVE_BADGE,
  SETTINGS_PLAN_BILLING_UNAVAILABLE,
  SETTINGS_PLAN_FREE_NAME,
  SETTINGS_PLAN_LABEL,
  SETTINGS_PLAN_MANAGE,
  SETTINGS_PLAN_PLUS_NAME,
  SETTINGS_PLAN_PLUS_PRICE,
  SETTINGS_PLAN_PREPARING,
  SETTINGS_PLAN_UPGRADE,
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
  const productId = subscription.premiumProductId;
  const canCheckout = subscription.checkoutAvailable && productId;

  const generatePortal = useAction(api.polar.generateCustomerPortalUrl);
  const [portalPending, setPortalPending] = useState(false);

  const upgradeButtonClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "border-qp-border text-qp-deep no-underline hover:bg-qp-soft",
  );

  const manageButtonClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "border-line text-ink-secondary no-underline",
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
        "scroll-mt-6 rounded-2xl border border-line bg-card px-5 py-5 md:px-6 md:py-5.5",
        className,
      )}
    >
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 font-mono text-[10px] uppercase tracking-widest text-faint">
          {SETTINGS_PLAN_LABEL}
        </span>
        {isPremium ? (
          <span className="shrink-0 rounded-full bg-qp-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-qp-deep">
            {SETTINGS_PLAN_ACTIVE_BADGE}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="min-w-0 wrap-break-word font-serif text-2xl text-ink">
          {isPremium ? SETTINGS_PLAN_PLUS_NAME : SETTINGS_PLAN_FREE_NAME}
        </span>
        {subscription.priceDisplay ? (
          <span className="shrink-0 text-sm text-mute">
            {subscription.priceDisplay}
          </span>
        ) : null}
      </div>
      {subscription.renewalSummary ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-mute-subtle">
          {subscription.renewalSummary}
        </p>
      ) : null}
      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
          {SETTINGS_PLAN_VALUE_HEADING}
        </p>
        <ul className="mt-2 space-y-1.5">
          {SETTINGS_PLAN_VALUE_BULLETS.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-[13px] leading-snug text-ink-secondary"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-qp"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
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
        ) : canCheckout ? (
          <span
            className="inline-flex"
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
              {SETTINGS_PLAN_UPGRADE} · {SETTINGS_PLAN_PLUS_PRICE}
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
