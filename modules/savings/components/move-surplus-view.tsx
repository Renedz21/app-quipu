"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { fromConvexError } from "@/core/errors";
import { ExpenseKeypad } from "@/modules/expenses/components/expense-keypad";
import {
  formatKeypadDisplay,
  isKeypadAmountValid,
} from "@/modules/expenses/lib/keypad";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import { moveSurplusToSavings, useMoveSurplusToSavings } from "../actions";
import {
  MOVE_SURPLUS_AMOUNT_LABEL,
  MOVE_SURPLUS_BACK_CTA,
  MOVE_SURPLUS_CONFIRM_CTA,
  MOVE_SURPLUS_CONTINUE_CTA,
  MOVE_SURPLUS_CYCLE_COPY,
  MOVE_SURPLUS_DESTINATION_LABEL,
  MOVE_SURPLUS_NO_CYCLE_BODY,
  MOVE_SURPLUS_NO_SURPLUS,
  MOVE_SURPLUS_PAGE_BACK,
  MOVE_SURPLUS_PAGE_TITLE,
  MOVE_SURPLUS_RECOMMENDED_BADGE,
  MOVE_SURPLUS_REVIEW_TITLE,
  MOVE_SURPLUS_SOURCE_LABEL,
  MOVE_SURPLUS_SUCCESS_PREFIX,
} from "../constants";

type SurplusSource = "needs" | "wants";
type Step = "edit" | "confirm";

type Props = {
  initialFromEnvelope?: SurplusSource;
};

function pickDefaultSource(
  context: {
    sources: {
      needs: { availableCents: number };
      wants: { availableCents: number };
    };
  },
  preferred?: SurplusSource,
): SurplusSource | null {
  if (
    preferred &&
    context.sources[preferred].availableCents > 0
  ) {
    return preferred;
  }
  if (context.sources.wants.availableCents > 0) return "wants";
  if (context.sources.needs.availableCents > 0) return "needs";
  return null;
}

export function MoveSurplusView({ initialFromEnvelope }: Props) {
  const router = useRouter();
  const context = useQuery(api.savings.getMoveSurplusContext, {});
  const moveMutation = useMoveSurplusToSavings();

  const [step, setStep] = useState<Step>("edit");
  const [fromEnvelopeOverride, setFromEnvelopeOverride] =
    useState<SurplusSource | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [destinationOverride, setDestinationOverride] = useState<
    Id<"subEnvelopes"> | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencyCode = context?.currencyCode ?? DEFAULT_CURRENCY.code;
  const currencySymbol = DEFAULT_CURRENCY.symbol;

  const defaultFromEnvelope = context
    ? pickDefaultSource(context, initialFromEnvelope)
    : null;

  const resolvedFrom = fromEnvelopeOverride ?? defaultFromEnvelope;

  const availableCents =
    context && resolvedFrom
      ? context.sources[resolvedFrom].availableCents
      : 0;

  const defaultDestinationId =
    context?.destinations.find((d) => d.isSystemDefault)?.id ??
    context?.destinations[0]?.id ??
    null;

  const resolvedDestinationId = destinationOverride ?? defaultDestinationId;

  const destinationLabel = context?.destinations.find(
    (d) => d.id === resolvedDestinationId,
  )?.label;

  const canContinue =
    resolvedFrom != null &&
    resolvedDestinationId != null &&
    isKeypadAmountValid(amountCents) &&
    amountCents <= availableCents;

  if (context === undefined) {
    return <MoveSurplusSkeleton />;
  }

  if (context === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <BackLink />
        <p className="mt-6 text-sm text-mute">{MOVE_SURPLUS_NO_CYCLE_BODY}</p>
        <Link
          href="/income/register"
          className={cn(buttonVariants(), "mt-4 inline-flex")}
        >
          Registrar ingreso
        </Link>
      </div>
    );
  }

  const totalSurplus =
    context.sources.needs.availableCents + context.sources.wants.availableCents;

  if (totalSurplus <= 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <BackLink />
        <h1 className="mt-4 font-serif text-2xl text-ink">
          {MOVE_SURPLUS_PAGE_TITLE}
        </h1>
        <p className="mt-3 text-sm text-mute">{MOVE_SURPLUS_NO_SURPLUS}</p>
        <Link
          href="/savings"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}
        >
          {MOVE_SURPLUS_PAGE_BACK}
        </Link>
      </div>
    );
  }

  async function handleConfirm() {
    if (!resolvedFrom || !resolvedDestinationId || !canContinue) return;

    setIsSubmitting(true);
    try {
      const result = await moveSurplusToSavings(moveMutation, {
        fromEnvelope: resolvedFrom,
        amount: amountCents,
        toSubEnvelopeId: resolvedDestinationId,
      });
      toast.success(
        `${MOVE_SURPLUS_SUCCESS_PREFIX} Moviste ${formatCents(result.amount, {
          currency: currencyCode,
        })} de ${ENVELOPE_LABELS[result.fromEnvelope]} a ${result.subEnvelopeLabel}.`,
      );
      router.push("/savings");
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 md:py-8">
      <BackLink />

      <h1 className="mt-4 font-serif text-[26px] font-medium text-ink">
        {step === "confirm" ? MOVE_SURPLUS_REVIEW_TITLE : MOVE_SURPLUS_PAGE_TITLE}
      </h1>
      <p className="mt-2 text-[13.5px] text-mute">{MOVE_SURPLUS_CYCLE_COPY}</p>

      {step === "edit" ? (
        <div className="mt-6 space-y-6">
          <section>
            <p className="mb-2.5 text-[12.5px] font-medium text-ink-secondary">
              {MOVE_SURPLUS_SOURCE_LABEL}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["needs", "wants"] as const).map((type) => {
                const available = context.sources[type].availableCents;
                const selected = resolvedFrom === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={available <= 0}
                    onClick={() => {
                      setFromEnvelopeOverride(type);
                      if (amountCents > available) {
                        setAmountCents(0);
                      }
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-[13px] transition-colors",
                      selected
                        ? "border-ink bg-ink text-canvas"
                        : "border-line bg-card text-ink hover:bg-surface-soft",
                      available <= 0 && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {ENVELOPE_LABELS[type]} ·{" "}
                    {formatCents(available, { currency: currencyCode })}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[12.5px] font-medium text-ink-secondary">
              {MOVE_SURPLUS_AMOUNT_LABEL}
            </p>
            <p className="mb-3 font-serif text-[32px] text-ink">
              {formatKeypadDisplay(amountCents, currencySymbol)}
            </p>
            {amountCents > availableCents ? (
              <p className="mb-2 text-[12px] text-danger-text">
                Máximo disponible:{" "}
                {formatCents(availableCents, { currency: currencyCode })}
              </p>
            ) : null}
            <ExpenseKeypad amountCents={amountCents} onChange={setAmountCents} />
          </section>

          <section>
            <p className="mb-2.5 text-[12.5px] font-medium text-ink-secondary">
              {MOVE_SURPLUS_DESTINATION_LABEL}
            </p>
            <div className="space-y-2">
              {context.destinations.map((destination) => {
                const selected = resolvedDestinationId === destination.id;
                return (
                  <button
                    key={destination.id}
                    type="button"
                    onClick={() => setDestinationOverride(destination.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[12px] border px-3.5 py-3 text-left text-[13.5px] transition-colors",
                      selected
                        ? "border-ink bg-surface-warm"
                        : "border-line bg-card hover:bg-surface-soft",
                    )}
                  >
                    <span className="font-medium text-ink">{destination.label}</span>
                    {destination.isSystemDefault ? (
                      <span className="rounded-full bg-moss-soft px-2 py-0.5 text-[10.5px] font-medium text-moss-ink">
                        {MOVE_SURPLUS_RECOMMENDED_BADGE}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <Button
            type="button"
            className="h-11 w-full rounded-[12px]"
            disabled={!canContinue}
            onClick={() => setStep("confirm")}
          >
            {MOVE_SURPLUS_CONTINUE_CTA}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-[14px] border border-line bg-card p-4 text-[14px] text-ink-secondary">
            <p>
              Mover{" "}
              <span className="font-semibold text-ink">
                {formatCents(amountCents, { currency: currencyCode })}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-ink">
                {resolvedFrom ? ENVELOPE_LABELS[resolvedFrom] : ""}
              </span>{" "}
              a{" "}
              <span className="font-semibold text-ink">{destinationLabel}</span>.
            </p>
            <p className="mt-3 text-[12.5px] text-mute">{MOVE_SURPLUS_CYCLE_COPY}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full rounded-[12px]"
              disabled={isSubmitting}
              onClick={() => void handleConfirm()}
            >
              {MOVE_SURPLUS_CONFIRM_CTA}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-[12px]"
              disabled={isSubmitting}
              onClick={() => setStep("edit")}
            >
              {MOVE_SURPLUS_BACK_CTA}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/savings"
      className="text-[13px] font-medium text-qp-deep hover:underline"
    >
      ← {MOVE_SURPLUS_PAGE_BACK}
    </Link>
  );
}

function MoveSurplusSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-48" />
      <Skeleton className="mt-6 h-32 w-full rounded-[14px]" />
    </div>
  );
}
