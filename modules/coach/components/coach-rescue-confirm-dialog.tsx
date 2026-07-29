"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, track } from "@/core/analytics";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { formatCents } from "@/shared/lib/money";
import { PremiumLockCard } from "@/shared/components/premium-lock-card";
import { handleRescueApply } from "../lib/handle-rescue-apply";
import {
  RESCUE_CONFIRM_APPLY_CTA,
  RESCUE_CONFIRM_DISMISS_CTA,
  RESCUE_CONFIRM_TITLE,
} from "../constants";

type RescueSuggestion = {
  transfer: number;
  projectedDeficit: number;
};

type Props = {
  interactionId: Id<"coachInteractions">;
  currencyCode: string;
  open: boolean;
  suggestion: RescueSuggestion;
  onOpenChange: (open: boolean) => void;
};

export function CoachRescueConfirmDialog({
  interactionId,
  currencyCode,
  open,
  suggestion,
  onOpenChange,
}: Props) {
  const applyRescue = useMutation(api.coachEngine.applyRescueTransfer);
  const dismissRescue = useMutation(api.coachEngine.dismissRescueSuggestion);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paywall, setPaywall] = useState<{ title: string; body: string } | null>(
    null,
  );

  async function handleApply() {
    setIsSubmitting(true);
    try {
      const result = await handleRescueApply({ applyRescue, interactionId });
      if (result.kind === "paywall_required") {
        setPaywall({
          title: "El rescate de sobres es parte de Quipu Plus",
          body: "Mueve dinero entre sobres sin tener que pensarlo tú. Y mucho más: predicciones por sobre, plan de crisis en un paso, avisos de compromisos e informe de cierre.",
        });
        return;
      }
      if (result.kind === "error") {
        return;
      }
      track(AnalyticsEvents.COACH_RECOMMENDATION_INTERACTED, {
        recommendation_type: "rescue_transfer",
        interaction: "selected",
        transfer_amount: result.transfer,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDismiss() {
    setIsSubmitting(true);
    try {
      await dismissRescue({ interactionId });
      track(AnalyticsEvents.COACH_RECOMMENDATION_INTERACTED, {
        recommendation_type: "rescue_transfer",
        interaction: "dismissed",
        transfer_amount: suggestion.transfer,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-ink">
            {RESCUE_CONFIRM_TITLE}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-ink-secondary">
            Transferir{" "}
            <strong className="font-semibold text-ink">
              {formatCents(suggestion.transfer, { currency: currencyCode })}
            </strong>{" "}
            de Ahorro a Gustos para cubrir{" "}
            <strong className="font-semibold text-ink">
              {formatCents(suggestion.projectedDeficit, {
                currency: currencyCode,
              })}
            </strong>{" "}
            de déficit. Esta acción mueve dinero entre sobres; no registra un
            gasto nuevo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="rounded-[11px]"
            disabled={isSubmitting}
            onClick={() => void handleDismiss()}
          >
            {RESCUE_CONFIRM_DISMISS_CTA}
          </Button>
          <Button
            type="button"
            className="rounded-[11px] bg-ink text-canvas hover:bg-ink/90"
            disabled={isSubmitting}
            onClick={() => void handleApply()}
          >
            {RESCUE_CONFIRM_APPLY_CTA}
          </Button>
        </DialogFooter>
        {paywall ? (
          <div className="mt-4">
            <PremiumLockCard title={paywall.title} body={paywall.body} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
