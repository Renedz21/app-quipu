"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { fromConvexError } from "@/core/errors";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  CONTRIBUTE_NO_FUNDS,
  CONTRIBUTE_SUCCESS_PREFIX,
  EMERGENCY_FUND_CONTRIBUTE_CTA,
} from "../constants";
import { formatCents } from "@/shared/lib/money";

type Props = {
  subEnvelopeId: Id<"subEnvelopes">;
  availableToContributeCents: number;
  currencyCode: string;
  className?: string;
  fullWidth?: boolean;
};

export function SavingsContributeButton({
  subEnvelopeId,
  availableToContributeCents,
  currencyCode,
  className,
  fullWidth = true,
}: Props) {
  const contribute = useMutation(api.savings.contributeToSubEnvelope);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContribute() {
    if (availableToContributeCents <= 0) {
      toast.message(CONTRIBUTE_NO_FUNDS);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await contribute({ subEnvelopeId });
      toast.success(
        `${CONTRIBUTE_SUCCESS_PREFIX} Moviste ${formatCents(result.amount, {
          currency: currencyCode,
        })} a tu fondo.`,
      );
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      className={cn(fullWidth && "w-full", className)}
      disabled={isSubmitting || availableToContributeCents <= 0}
      onClick={handleContribute}
    >
      {EMERGENCY_FUND_CONTRIBUTE_CTA}
    </Button>
  );
}
