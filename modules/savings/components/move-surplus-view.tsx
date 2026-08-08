"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, track } from "@/core/analytics";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { fromConvexError } from "@/core/errors";
import { BackLink } from "@/shared/components/ui/back-link";
import { buttonVariants } from "@/shared/components/ui/button-variants";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import { moveSurplusToSavings, useMoveSurplusToSavings } from "../actions";
import {
  MOVE_SURPLUS_NO_CYCLE_BODY,
  MOVE_SURPLUS_NO_SURPLUS,
  MOVE_SURPLUS_PAGE_BACK,
  MOVE_SURPLUS_PAGE_SUBTITLE,
  MOVE_SURPLUS_PAGE_TITLE,
} from "../constants";
import {
  moveSurplusFormToMutationArgs,
  type SurplusFromEnvelope,
} from "../schemas";
import { MoveSurplusForm } from "./move-surplus-form";
import { SavingsFormShell } from "./savings-form-shell";

type Props = {
  initialFromEnvelope?: SurplusFromEnvelope;
  initialAmountCents?: number;
  initialDestinationId?: Id<"subEnvelopes">;
};

function totalSurplusAvailable(context: {
  sources: {
    needs: { availableCents: number };
    wants: { availableCents: number };
    extraordinary: { availableCents: number };
  };
}): number {
  return (
    context.sources.needs.availableCents +
    context.sources.wants.availableCents +
    context.sources.extraordinary.availableCents
  );
}

export function MoveSurplusView({
  initialFromEnvelope,
  initialAmountCents,
  initialDestinationId,
}: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const context = useQuery(api.savings.getMoveSurplusContext, {});
  const moveMutation = useMoveSurplusToSavings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (context === undefined) {
    return <MoveSurplusSkeleton />;
  }

  if (context === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <BackLink
          href="/savings"
          className="text-[13px] font-medium text-mute hover:text-ink"
        >
          {MOVE_SURPLUS_PAGE_BACK}
        </BackLink>
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

  if (totalSurplusAvailable(context) <= 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <BackLink
          href="/savings"
          className="text-[13px] font-medium text-mute hover:text-ink"
        >
          {MOVE_SURPLUS_PAGE_BACK}
        </BackLink>
        <h1 className="mt-4 font-serif text-2xl text-ink">
          {MOVE_SURPLUS_PAGE_TITLE}
        </h1>
        <p className="mt-3 text-sm text-mute">{MOVE_SURPLUS_NO_SURPLUS}</p>
        <Link
          href="/savings"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 inline-flex",
          )}
        >
          {MOVE_SURPLUS_PAGE_BACK}
        </Link>
      </div>
    );
  }

  const form = (
    <MoveSurplusForm
      currencyCode={context.currencyCode ?? DEFAULT_CURRENCY.code}
      sources={context.sources}
      destinations={context.destinations}
      initialFrom={initialFromEnvelope}
      initialAmountCents={initialAmountCents}
      initialDestinationId={initialDestinationId}
      isSubmitting={isSubmitting}
      onCancel={() => router.push("/savings")}
      onSubmit={async (values) => {
        setIsSubmitting(true);
        try {
          const result = await moveSurplusToSavings(
            moveMutation,
            moveSurplusFormToMutationArgs(values),
          );
          track(AnalyticsEvents.ADDITIONAL_SAVINGS_ADDED, {
            amount: result.amount,
            source: values.fromSource,
          });
          const params = new URLSearchParams({
            moved: String(result.amount),
            objective: String(result.savingsObjectiveCents),
            additional: String(result.savingsAdditionalCents),
            total: String(result.savingsTotalCents),
            needs: String(result.allocationNeeds),
            wants: String(result.allocationWants),
            savings: String(result.allocationSavings),
          });
          router.push(`/savings/move/success?${params.toString()}`);
        } catch (error) {
          toast.error(fromConvexError(error).message);
        } finally {
          setIsSubmitting(false);
        }
      }}
    />
  );

  if (isMobile) {
    return (
      <SavingsFormShell
        open
        onOpenChange={(open) => {
          if (!open) router.push("/savings");
        }}
        title={MOVE_SURPLUS_PAGE_TITLE}
      >
        <p className="mb-4 text-[13px] text-mute">
          {MOVE_SURPLUS_PAGE_SUBTITLE}
        </p>
        {form}
      </SavingsFormShell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <BackLink
        href="/savings"
        className="text-[13px] font-medium text-mute hover:text-ink"
      >
        {MOVE_SURPLUS_PAGE_BACK}
      </BackLink>
      <h1 className="mt-4 font-serif text-[26px] font-medium text-ink">
        {MOVE_SURPLUS_PAGE_TITLE}
      </h1>
      <p className="mt-2 text-[13.5px] text-mute">
        {MOVE_SURPLUS_PAGE_SUBTITLE}
      </p>
      {form}
    </div>
  );
}

function MoveSurplusSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton variant="line" className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-56 rounded-lg" />
      <Skeleton className="mt-6 h-48 w-full rounded-xl [animation-delay:150ms]" />
    </div>
  );
}
