"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, track } from "@/core/analytics";
import { PremiumLockCard } from "@/shared/components/premium-lock-card";
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
import {
  RESCUE_CONFIRM_APPLY_CTA,
  RESCUE_CONFIRM_DISMISS_CTA,
  RESCUE_CONFIRM_TITLE,
  RESCUE_PAYWALL_BODY,
  RESCUE_PAYWALL_CLOSE,
  RESCUE_PAYWALL_TITLE,
} from "../constants";
import { handleRescueApply } from "../lib/handle-rescue-apply";

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
  const [paywall, setPaywall] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const paywallOpen = paywall !== null;

  function handleOpenChange(next: boolean) {
    if (!next && paywallOpen) return;
    onOpenChange(next);
  }

  async function handleApply() {
    setIsSubmitting(true);
    const result = await handleRescueApply({
      applyRescue,
      interactionId,
    }).finally(() => {
      setIsSubmitting(false);
    });
    if (result.kind === "paywall_required") {
      setPaywall({
        title: RESCUE_PAYWALL_TITLE,
        body: RESCUE_PAYWALL_BODY,
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
  }

  async function handleDismiss() {
    setIsSubmitting(true);
    await dismissRescue({ interactionId })
      .then(() => {
        track(AnalyticsEvents.COACH_RECOMMENDATION_INTERACTED, {
          recommendation_type: "rescue_transfer",
          interaction: "dismissed",
          transfer_amount: suggestion.transfer,
        });
        onOpenChange(false);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        {paywall ? (
          <div className="mt-4">
            <PremiumLockCard
              title={paywall.title}
              body={paywall.body}
              currencyCode={currencyCode}
            />
          </div>
        ) : null}
        <DialogFooter className="mt-4 gap-2 sm:justify-stretch">
          {paywallOpen ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-[11px]"
              onClick={() => onOpenChange(false)}
            >
              {RESCUE_PAYWALL_CLOSE}
            </Button>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
