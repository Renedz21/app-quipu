"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { ENVELOPE_LABELS } from "@/modules/dashboard/constants";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  SETTINGS_ADD_COMMITMENT_TITLE,
  SETTINGS_COMMITMENT_AMOUNT_LABEL,
  SETTINGS_COMMITMENT_CREATED,
  SETTINGS_COMMITMENT_DUE_LABEL,
  SETTINGS_COMMITMENT_ENVELOPE_LABEL,
  SETTINGS_COMMITMENT_NAME_LABEL,
} from "../constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddCommitmentDialog({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const createCommitment = useMutation(api.fixedCommitments.createFixedCommitment);
  const [name, setName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [dueDayInput, setDueDayInput] = useState("");
  const [envelope, setEnvelope] = useState<"needs" | "wants">("needs");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number.parseFloat(amountInput.replace(",", "."));
    const dueDay = Number.parseInt(dueDayInput, 10);
    if (!name.trim() || Number.isNaN(amount) || amount <= 0) return;
    if (Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) return;

    setIsSubmitting(true);
    try {
      await createCommitment({
        name: name.trim(),
        amount: Math.round(amount * 100),
        envelope,
        dueDay,
      });
      toast.success(SETTINGS_COMMITMENT_CREATED);
      setName("");
      setAmountInput("");
      setDueDayInput("");
      setEnvelope("needs");
      onOpenChange(false);
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const form = (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="commitment-name">{SETTINGS_COMMITMENT_NAME_LABEL}</Label>
        <Input
          id="commitment-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="commitment-amount">{SETTINGS_COMMITMENT_AMOUNT_LABEL}</Label>
        <Input
          id="commitment-amount"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          inputMode="decimal"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="commitment-due">{SETTINGS_COMMITMENT_DUE_LABEL}</Label>
        <Input
          id="commitment-due"
          value={dueDayInput}
          onChange={(event) => setDueDayInput(event.target.value)}
          inputMode="numeric"
          placeholder="1–31"
        />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">{SETTINGS_COMMITMENT_ENVELOPE_LABEL}</span>
        <div className="flex gap-2">
          {(["needs", "wants"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setEnvelope(key)}
              className={
                envelope === key
                  ? "rounded-lg border border-qp-border bg-qp-soft px-3 py-1.5 text-sm font-semibold text-qp-deep"
                  : "rounded-lg border border-line px-3 py-1.5 text-sm text-mute"
              }
            >
              {ENVELOPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting || !name.trim()} className="w-full">
        {SETTINGS_ADD_COMMITMENT_TITLE}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] rounded-t-[24px] border-line bg-card px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
          <SheetTitle className="mb-4 text-[15px] font-semibold text-ink">
            {SETTINGS_ADD_COMMITMENT_TITLE}
          </SheetTitle>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-0 rounded-[22px] p-0">
        <DialogTitle className="px-5 pt-5 text-[15px] font-semibold text-ink">
          {SETTINGS_ADD_COMMITMENT_TITLE}
        </DialogTitle>
        <div className="px-5 pb-5 pt-4">{form}</div>
      </DialogContent>
    </Dialog>
  );
}
